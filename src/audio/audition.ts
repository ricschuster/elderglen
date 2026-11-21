/**
 * Dev only: the audition page (`/audio.html`). Lists every effect, ambient loop and music slot with
 * play buttons, so the owner can listen and decide what to swap. Not part of the game bundle.
 */
import { AMBIENT, DEFAULT_AUDIO, MUSIC, SFX } from "../core/audio";
import { audio } from "./engine";

const app = document.getElementById("app")!;
const now = document.getElementById("now")!;
audio.attach();
audio.applySettings({ ...DEFAULT_AUDIO });

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.textContent = text;
  parent?.appendChild(e);
  return e;
}

const status = (): void => {
  now.textContent = `context: ${audio.state}   music: ${audio.currentMusic ?? "none"}   ambient: ${audio.currentAmbient.join(", ") || "none"}   decoded: ${audio.loaded}   errors: ${audio.errors.length}`;
};
setInterval(status, 400);

// Volumes
const vol = el("div", "", app);
vol.className = "row";
for (const [label, key] of [
  ["Music", "musicVolume"],
  ["Effects", "sfxVolume"],
  ["Ambient", "ambientVolume"],
] as const) {
  const l = el("label", `${label} `, vol);
  const r = el("input", "", l);
  r.type = "range";
  r.min = "0";
  r.max = "100";
  r.step = "10";
  r.value = String(audio.settings[key]);
  r.oninput = () =>
    audio.applySettings({ ...audio.settings, [key]: Number(r.value) });
}
const mute = el("button", "Mute", vol);
mute.onclick = () => {
  const muted = !audio.settings.muted;
  audio.applySettings({ ...audio.settings, muted });
  mute.classList.toggle("on", muted);
};
const stop = el("button", "Stop music and ambient", vol);
stop.onclick = () => {
  audio.stopAll();
  for (const b of document.querySelectorAll("button.on"))
    b.classList.remove("on");
};

// Music
el("h2", `Music (${Object.keys(MUSIC).length})`, app);
const music = el("div", "", app);
music.className = "row";
for (const [id, def] of Object.entries(MUSIC)) {
  const b = el("button", `${id} (${def.source})`, music);
  b.onclick = () => {
    audio.unlock();
    audio.setMusic(id, !def.loop);
    for (const o of music.querySelectorAll("button.on"))
      o.classList.remove("on");
    b.classList.add("on");
  };
}

// Ambient
el("h2", `Ambient loops (${Object.keys(AMBIENT).length})`, app);
const amb = el("div", "", app);
amb.className = "row";
const active = new Set<string>();
for (const id of Object.keys(AMBIENT)) {
  const b = el("button", id, amb);
  b.onclick = () => {
    audio.unlock();
    if (active.has(id)) active.delete(id);
    else active.add(id);
    b.classList.toggle("on", active.has(id));
    audio.setAmbient([...active].map((a) => ({ id: a, level: 1 })));
  };
}

// Effects, grouped by the part of the id before the dot
const groups = new Map<string, string[]>();
for (const id of Object.keys(SFX)) {
  const g = id.split(".")[0]!;
  groups.set(g, [...(groups.get(g) ?? []), id]);
}
el("h2", `Effects (${Object.keys(SFX).length} ids)`, app);
for (const [g, ids] of groups) {
  const h = el("div", g, app);
  h.className = "note";
  const row = el("div", "", app);
  row.className = "row";
  for (const id of ids) {
    const n = SFX[id]!.files.length;
    const b = el("button", n > 1 ? `${id} x${n}` : id, row);
    b.onclick = () => {
      audio.unlock();
      audio.sfx(id);
    };
  }
}
