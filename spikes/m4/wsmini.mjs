// A minimal WebSocket server on node:http, enough for the M4 spike (text frames, no
// fragmentation, no extensions). Throwaway: the product host will use a real library.
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function frame(text) {
  const p = Buffer.from(text);
  const n = p.length;
  const head =
    n < 126
      ? Buffer.from([0x81, n])
      : n < 65536
        ? Buffer.from([0x81, 126, n >> 8, n & 255])
        : (() => {
            const b = Buffer.alloc(10);
            b[0] = 0x81;
            b[1] = 127;
            b.writeBigUInt64BE(BigInt(n), 2);
            return b;
          })();
  return Buffer.concat([head, p]);
}

/** Calls onMessage(client, text) for each text frame; client.send(text) replies. */
export function listen(port, { onOpen, onMessage, onClose }) {
  const server = createServer((_, res) => res.end("m4 spike host"));
  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    const accept = createHash("sha1")
      .update(key + GUID)
      .digest("base64");
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    socket.setNoDelay(true);
    const client = {
      socket,
      bytesOut: 0,
      send(text) {
        const f = frame(text);
        this.bytesOut += f.length;
        socket.write(f);
      },
    };
    let buf = Buffer.alloc(0);
    socket.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length < 2) return;
        const op = buf[0] & 15;
        let len = buf[1] & 127;
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
        if (buf.length < off + 4 + len) return;
        const mask = buf.subarray(off, off + 4);
        const data = Buffer.from(buf.subarray(off + 4, off + 4 + len));
        for (let i = 0; i < len; i++) data[i] ^= mask[i & 3];
        buf = buf.subarray(off + 4 + len);
        if (op === 8) return socket.end();
        if (op === 1) onMessage(client, data.toString());
      }
    });
    socket.on("close", () => onClose?.(client));
    socket.on("error", () => {});
    onOpen?.(client);
  });
  return new Promise((r) => server.listen(port, "0.0.0.0", () => r(server)));
}
