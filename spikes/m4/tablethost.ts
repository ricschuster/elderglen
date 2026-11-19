// Tablet host load, compute side: the real Room + GameRoomWorld on a late-game farm, with N synthetic
// guests, ticking in the page of the running app (devhost.mjs injects this bundle). No socket: each
// tick does what NodeHost does around the Room (decode the guests' pos messages, tick, encode the
// drained messages), so the number is the host's own CPU cost per tick on the tablet.
import { Room } from "../../src/core/room";
import { GameRoomWorld } from "../../src/core/roomworld";
import { buildStage } from "../../src/core/stages";
import { decodeClient, encode, type ClientMsg } from "../../src/core/protocol";
import { sleep } from "../../src/core/sleep";
import { serialize, deserialize } from "../../src/core/save";
import { mapFiles } from "../../src/content/maps";

export function run(guests: number, ticks: number, stage = "late-game-100") {
  const t0 = performance.now();
  const r = buildStage(stage)!;
  const buildMs = performance.now() - t0;
  const room = new Room(new GameRoomWorld(r.state), "Host", guests + 2);
  const ids: string[] = [];
  const joinT = performance.now();
  for (let i = 0; i < guests; i++) {
    const id = room.join(`g${i}`);
    if (id) ids.push(id);
  }
  const joinMs = performance.now() - joinT;
  const per: number[] = [];
  let bytes = 0;
  for (let n = 0; n < ticks; n++) {
    const t = performance.now();
    for (let i = 0; i < ids.length; i++) {
      const wire = encode({
        t: "pos",
        x: 40 + ((n + i) % 30),
        y: 30 + (i % 8),
        map: "farm",
        dir: n % 4,
        pass: [],
        ts: n,
      } as ClientMsg);
      const m = decodeClient(wire);
      if (m) room.receive(ids[i]!, m);
    }
    room.tick(100);
    for (const id of ids)
      for (const msg of room.drain(id)) bytes += encode(msg).length;
    per.push(performance.now() - t);
  }
  // Nightly cost: sleep() runs the rules for the whole world; serialize is the save and the join snapshot.
  const nights: number[] = [];
  const ser: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = performance.now();
    sleep(r.state, [], Math.random);
    nights.push(performance.now() - a);
    const b = performance.now();
    const txt = serialize(r.state);
    ser.push(performance.now() - b);
    if (i === 0) deserialize(txt);
  }
  nights.sort((a, b) => a - b);
  ser.sort((a, b) => a - b);
  per.sort((a, b) => a - b);
  const q = (p: number) => +per[Math.floor((per.length - 1) * p)]!.toFixed(3);
  return {
    guests: ids.length,
    ticks,
    mapsLoaded: Object.keys(mapFiles).length,
    buildStageMs: Math.round(buildMs),
    joinMs: +joinMs.toFixed(1),
    tickMs: { p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) },
    sleepMs: { p50: +nights[5]!.toFixed(1), max: +nights[9]!.toFixed(1) },
    serializeMs: { p50: +ser[5]!.toFixed(1), max: +ser[9]!.toFixed(1) },
    outKBperSec: Math.round(bytes / 1024 / (ticks / 10)),
  };
}

/** Soak: tick a host with N guests at 10 Hz in the page until stopSoak(); read the numbers with soakStats(). */
let soak:
  | { timer: ReturnType<typeof setInterval>; per: number[]; late: number }
  | undefined;
export function startSoak(guests: number, stage = "late-game-100") {
  const r = buildStage(stage)!;
  const room = new Room(new GameRoomWorld(r.state), "Host", guests + 2);
  const ids: string[] = [];
  for (let i = 0; i < guests; i++) {
    const id = room.join(`g${i}`);
    if (id) ids.push(id);
  }
  let n = 0;
  let last = performance.now();
  const s = {
    per: [] as number[],
    late: 0,
    timer: undefined as unknown as ReturnType<typeof setInterval>,
  };
  s.timer = setInterval(() => {
    const t = performance.now();
    if (t - last > 250) s.late++;
    last = t;
    n++;
    for (let i = 0; i < ids.length; i++)
      room.receive(
        ids[i]!,
        decodeClient(
          encode({
            t: "pos",
            x: 40 + ((n + i) % 30),
            y: 30,
            map: "farm",
            dir: n % 4,
            pass: [],
            ts: n,
          } as ClientMsg),
        )!,
      );
    room.tick(100);
    for (const id of ids) for (const msg of room.drain(id)) encode(msg);
    s.per.push(performance.now() - t);
    if (s.per.length > 6000) s.per.shift();
  }, 100);
  soak = s;
  return ids.length;
}
export function soakStats() {
  const per = [...(soak?.per ?? [])].sort((a, b) => a - b);
  return {
    ticks: per.length,
    p50: per[Math.floor(per.length / 2)],
    max: per[per.length - 1],
    lateTicks: soak?.late,
  };
}
export function stopSoak() {
  if (soak) clearInterval(soak.timer);
}
