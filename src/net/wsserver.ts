// A small WebSocket server on node:http for the host (text frames, no fragmentation, no
// extensions), ported from the M4 spike. Node only: never import this from a scene.
import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";
import type { Socket } from "node:net";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
/** Largest message accepted from a guest, bytes. Guests send small messages. */
const MAX_MESSAGE = 1 << 20;

export interface WsClient {
  send(text: string): void;
  close(): void;
  readonly open: boolean;
}

interface WsHandlers {
  onOpen?(c: WsClient): void;
  onMessage(c: WsClient, text: string): void;
  onClose?(c: WsClient): void;
}

export interface WsServer {
  readonly port: number;
  /** Close every socket and the listener. */
  close(): Promise<void>;
}

function frame(op: number, payload: Buffer): Buffer {
  const n = payload.length;
  let head: Buffer;
  if (n < 126) head = Buffer.from([0x80 | op, n]);
  else if (n < 65536) head = Buffer.from([0x80 | op, 126, n >> 8, n & 255]);
  else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | op;
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(n), 2);
  }
  return Buffer.concat([head, payload]);
}

/** Listen on `port` (0 picks a free one). */
export function listen(
  port: number,
  handlers: WsHandlers,
  host = "0.0.0.0",
): Promise<WsServer> {
  const server: Server = createServer((_, res) => res.end("elderglen host"));
  const sockets = new Set<Socket>();
  server.on("upgrade", (req, socket: Socket) => {
    const key = req.headers["sec-websocket-key"];
    if (typeof key !== "string") return socket.destroy();
    const accept = createHash("sha1")
      .update(key + GUID)
      .digest("base64");
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    socket.setNoDelay(true);
    sockets.add(socket);
    let open = true;
    const client: WsClient = {
      get open() {
        return open;
      },
      send(text) {
        if (open && !socket.destroyed)
          socket.write(frame(1, Buffer.from(text)));
      },
      close() {
        if (open && !socket.destroyed) socket.end(frame(8, Buffer.alloc(0)));
        open = false;
      },
    };
    let buf = Buffer.alloc(0);
    socket.on("data", (d: Buffer) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length < 2) return;
        const op = buf[0]! & 15;
        let len = buf[1]! & 127;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          off = 10;
        }
        if (len > MAX_MESSAGE) return socket.destroy();
        if (buf.length < off + 4 + len) return;
        const mask = buf.subarray(off, off + 4);
        const data = Buffer.from(buf.subarray(off + 4, off + 4 + len));
        for (let i = 0; i < len; i++) data[i] = data[i]! ^ mask[i & 3]!;
        buf = buf.subarray(off + 4 + len);
        if (op === 8) {
          client.close();
          return;
        }
        if (op === 9 && !socket.destroyed) socket.write(frame(10, data));
        if (op === 1) handlers.onMessage(client, data.toString());
      }
    });
    socket.on("close", () => {
      open = false;
      sockets.delete(socket);
      handlers.onClose?.(client);
    });
    socket.on("error", () => {});
    handlers.onOpen?.(client);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      resolve({
        port: typeof addr === "object" && addr ? addr.port : port,
        close: () =>
          new Promise<void>((done) => {
            for (const s of sockets) s.destroy();
            server.close(() => done());
          }),
      });
    });
  });
}
