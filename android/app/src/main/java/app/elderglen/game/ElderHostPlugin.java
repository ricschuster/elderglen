package app.elderglen.game;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.content.Context;
import android.net.wifi.WifiManager;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetSocketAddress;
import java.net.InterfaceAddress;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The tablet host's socket pipe (ADR 0015): a WebSocket server and nothing else. The Room
 * and the world stay in the page; this class only listens, moves text frames and reports
 * open, message and close events. A hand written RFC 6455 subset (text frames, ping, close,
 * no extensions, no fragmentation), the same as src/net/wsserver.ts.
 */
@CapacitorPlugin(name = "ElderHost")
public class ElderHostPlugin extends Plugin {
  private static final String GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  /** Largest frame accepted from a guest, bytes (matches wsserver.ts). */
  private static final int MAX_MESSAGE = 1 << 20;

  private ServerSocket server;
  private final Map<Integer, Conn> conns = new ConcurrentHashMap<>();
  private int nextId = 1;

  // Game list discovery (UDP broadcast, ADR 0015). One announcer thread and one listener thread.
  private static final int ANNOUNCE_MS = 2000;
  private Thread announcer;
  private volatile String announceText;
  private volatile int announcePort;
  private DatagramSocket listener;
  private WifiManager.MulticastLock multicast;

  private final class Conn {
    final int id;
    final Socket socket;
    final OutputStream out;
    volatile boolean open = true;

    Conn(int id, Socket socket) throws IOException {
      this.id = id;
      this.socket = socket;
      this.out = socket.getOutputStream();
    }

    synchronized void write(byte[] frame) {
      if (!open) return;
      try {
        out.write(frame);
        out.flush();
      } catch (IOException e) {
        shut();
      }
    }

    void shut() {
      open = false;
      try {
        socket.close();
      } catch (IOException ignored) {
      }
    }
  }

  @PluginMethod
  public synchronized void listen(PluginCall call) {
    if (server != null) {
      call.reject("already listening");
      return;
    }
    int port = call.getInt("port", 0);
    try {
      server = new ServerSocket(port);
    } catch (IOException e) {
      call.reject("cannot listen: " + e.getMessage());
      return;
    }
    final ServerSocket s = server;
    Thread acceptor =
        new Thread(
            () -> {
              while (!s.isClosed()) {
                try {
                  Socket sock = s.accept();
                  sock.setTcpNoDelay(true);
                  Thread t = new Thread(() -> serve(sock), "elderhost-conn");
                  t.setDaemon(true);
                  t.start();
                } catch (IOException e) {
                  return;
                }
              }
            },
            "elderhost-accept");
    acceptor.setDaemon(true);
    acceptor.start();
    JSObject ret = new JSObject();
    ret.put("port", s.getLocalPort());
    String addr = lanAddress();
    if (addr != null) ret.put("address", addr);
    call.resolve(ret);
  }

  @PluginMethod
  public void send(PluginCall call) {
    Conn c = conns.get(call.getInt("conn", -1));
    String text = call.getString("text");
    if (c != null && text != null) c.write(frame(1, text.getBytes(StandardCharsets.UTF_8)));
    call.resolve();
  }

  @PluginMethod
  public void close(PluginCall call) {
    Conn c = conns.get(call.getInt("conn", -1));
    if (c != null) {
      c.write(frame(8, new byte[0]));
      c.shut();
    }
    call.resolve();
  }

  @PluginMethod
  public synchronized void stop(PluginCall call) {
    stopServer();
    stopAnnouncer();
    stopListener();
    call.resolve();
  }

  /** Broadcast `text` to `port` every 2 seconds; an empty text stops. Replacing the text sends at once. */
  @PluginMethod
  public synchronized void announce(PluginCall call) {
    String text = call.getString("text");
    if (text == null || text.isEmpty()) {
      stopAnnouncer();
      call.resolve();
      return;
    }
    announceText = text;
    announcePort = call.getInt("port", 24650);
    if (announcer == null) {
      announcer =
          new Thread(
              () -> {
                try (DatagramSocket sock = new DatagramSocket()) {
                  sock.setBroadcast(true);
                  while (!Thread.currentThread().isInterrupted()) {
                    broadcast(sock, announceText, announcePort);
                    Thread.sleep(ANNOUNCE_MS);
                  }
                } catch (InterruptedException | IOException ignored) {
                }
              },
              "elderhost-announce");
      announcer.setDaemon(true);
      announcer.start();
    } else {
      announcer.interrupt(); // wakes the sleep: the thread ends, so start a fresh one
      announcer = null;
      announce(call);
      return;
    }
    call.resolve();
  }

  /** Listen for announcements on `port`; each arrives as a "game" event (text, from). */
  @PluginMethod
  public synchronized void discoverStart(PluginCall call) {
    if (listener != null) {
      call.resolve();
      return;
    }
    int port = call.getInt("port", 24650);
    try {
      WifiManager wm =
          (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
      if (wm != null) {
        // Some devices drop broadcast datagrams unless a multicast lock is held.
        multicast = wm.createMulticastLock("elderglen-discovery");
        multicast.setReferenceCounted(false);
        multicast.acquire();
      }
      DatagramSocket sock = new DatagramSocket(null);
      sock.setReuseAddress(true);
      sock.bind(new InetSocketAddress(port));
      listener = sock;
    } catch (IOException e) {
      call.reject("cannot listen for games: " + e.getMessage());
      return;
    }
    final DatagramSocket sock = listener;
    Thread t =
        new Thread(
            () -> {
              byte[] buf = new byte[1024];
              while (!sock.isClosed()) {
                try {
                  DatagramPacket p = new DatagramPacket(buf, buf.length);
                  sock.receive(p);
                  JSObject o = new JSObject();
                  o.put("text", new String(p.getData(), 0, p.getLength(), StandardCharsets.UTF_8));
                  o.put("from", p.getAddress().getHostAddress());
                  notifyListeners("game", o);
                } catch (IOException e) {
                  return;
                }
              }
            },
            "elderhost-discover");
    t.setDaemon(true);
    t.start();
    call.resolve();
  }

  @PluginMethod
  public synchronized void discoverStop(PluginCall call) {
    stopListener();
    call.resolve();
  }

  private synchronized void stopAnnouncer() {
    if (announcer != null) announcer.interrupt();
    announcer = null;
  }

  private synchronized void stopListener() {
    if (listener != null) listener.close();
    listener = null;
    if (multicast != null && multicast.isHeld()) multicast.release();
    multicast = null;
  }

  /** To 255.255.255.255 and to each interface's own broadcast address (some routers need the latter). */
  private static void broadcast(DatagramSocket sock, String text, int port) {
    byte[] data = text.getBytes(StandardCharsets.UTF_8);
    List<InetAddress> targets = new ArrayList<>();
    try {
      targets.add(InetAddress.getByName("255.255.255.255"));
      for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
        if (!ni.isUp() || ni.isLoopback()) continue;
        for (InterfaceAddress ia : ni.getInterfaceAddresses())
          if (ia.getBroadcast() != null) targets.add(ia.getBroadcast());
      }
    } catch (IOException ignored) {
    }
    for (InetAddress a : targets) {
      try {
        sock.send(new DatagramPacket(data, data.length, a, port));
      } catch (IOException ignored) {
      }
    }
  }

  @Override
  protected void handleOnDestroy() {
    stopServer();
    stopAnnouncer();
    stopListener();
  }

  private synchronized void stopServer() {
    if (server != null) {
      try {
        server.close();
      } catch (IOException ignored) {
      }
      server = null;
    }
    for (Conn c : conns.values()) c.shut();
  }

  private void serve(Socket sock) {
    Conn conn = null;
    try {
      InputStream in = sock.getInputStream();
      String key = handshake(in);
      if (key == null) {
        sock.close();
        return;
      }
      String accept =
          Base64.getEncoder()
              .encodeToString(
                  MessageDigest.getInstance("SHA-1")
                      .digest((key + GUID).getBytes(StandardCharsets.UTF_8)));
      sock.getOutputStream()
          .write(
              ("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n"
                      + "Connection: Upgrade\r\nSec-WebSocket-Accept: "
                      + accept
                      + "\r\n\r\n")
                  .getBytes(StandardCharsets.US_ASCII));
      int id;
      synchronized (this) {
        id = nextId++;
      }
      conn = new Conn(id, sock);
      conns.put(id, conn);
      emit("open", id, null);
      readFrames(conn, in);
    } catch (Exception ignored) {
    } finally {
      if (conn != null) {
        conn.shut();
        conns.remove(conn.id);
        emit("close", conn.id, null);
      } else {
        try {
          sock.close();
        } catch (IOException ignored) {
        }
      }
    }
  }

  /** Read the HTTP upgrade request; return the Sec-WebSocket-Key or null. */
  private static String handshake(InputStream in) throws IOException {
    ByteArrayOutputStream head = new ByteArrayOutputStream();
    boolean done = false;
    while (head.size() < 8192) {
      int b = in.read();
      if (b < 0) return null;
      head.write(b);
      int n = head.size();
      if (n >= 4) {
        byte[] h = head.toByteArray();
        if (h[n - 4] == '\r' && h[n - 3] == '\n' && h[n - 2] == '\r' && h[n - 1] == '\n') {
          done = true;
          break;
        }
      }
    }
    if (!done) return null;
    for (String line : head.toString("US-ASCII").split("\r\n")) {
      int i = line.indexOf(':');
      if (i > 0 && line.substring(0, i).trim().equalsIgnoreCase("sec-websocket-key"))
        return line.substring(i + 1).trim();
    }
    return null;
  }

  private void readFrames(Conn conn, InputStream in) throws IOException {
    while (conn.open) {
      int b0 = in.read();
      int b1 = in.read();
      if (b0 < 0 || b1 < 0) return;
      int op = b0 & 15;
      long len = b1 & 127;
      if (len == 126) len = (in.read() << 8) | in.read();
      else if (len == 127) {
        len = 0;
        for (int i = 0; i < 8; i++) len = (len << 8) | in.read();
      }
      if (len > MAX_MESSAGE || len < 0) return;
      byte[] mask = new byte[4];
      readFully(in, mask);
      byte[] data = new byte[(int) len];
      readFully(in, data);
      for (int i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
      if (op == 8) {
        conn.write(frame(8, new byte[0]));
        return;
      }
      if (op == 9) conn.write(frame(10, data));
      if (op == 1) emit("message", conn.id, new String(data, StandardCharsets.UTF_8));
    }
  }

  private static void readFully(InputStream in, byte[] buf) throws IOException {
    int off = 0;
    while (off < buf.length) {
      int n = in.read(buf, off, buf.length - off);
      if (n < 0) throw new IOException("closed");
      off += n;
    }
  }

  private static byte[] frame(int op, byte[] payload) {
    int n = payload.length;
    ByteArrayOutputStream o = new ByteArrayOutputStream(n + 10);
    o.write(0x80 | op);
    if (n < 126) o.write(n);
    else if (n < 65536) {
      o.write(126);
      o.write(n >> 8);
      o.write(n & 255);
    } else {
      o.write(127);
      for (int i = 7; i >= 0; i--) o.write(i >= 4 ? 0 : (n >> (8 * i)) & 255);
    }
    o.write(payload, 0, n);
    return o.toByteArray();
  }

  private void emit(String event, int id, String text) {
    JSObject o = new JSObject();
    o.put("conn", id);
    if (text != null) o.put("text", text);
    notifyListeners(event, o);
  }

  /** The first site-local IPv4 address, preferring wlan interfaces. */
  private static String lanAddress() {
    String fallback = null;
    try {
      for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
        if (!ni.isUp() || ni.isLoopback()) continue;
        for (InetAddress a : Collections.list(ni.getInetAddresses())) {
          if (a instanceof Inet4Address && a.isSiteLocalAddress()) {
            if (ni.getName().startsWith("wlan")) return a.getHostAddress();
            if (fallback == null) fallback = a.getHostAddress();
          }
        }
      }
    } catch (IOException ignored) {
    }
    return fallback;
  }
}
