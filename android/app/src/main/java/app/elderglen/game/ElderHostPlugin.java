package app.elderglen.game;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Collections;
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
    call.resolve();
  }

  @Override
  protected void handleOnDestroy() {
    stopServer();
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
