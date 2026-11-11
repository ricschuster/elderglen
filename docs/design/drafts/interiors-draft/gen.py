#!/usr/bin/env python3
"""Draft generator for the interior plans (note 86).

Run from this folder:  python3 gen.py [name ...]

A plan is built from floor rectangles (rooms and passages) and fixtures, in plan
coordinates with no walls. Walls are made from the floor shape: every void tile
next to a floor tile (8 ways) becomes wall, and a floor tile with void to the north
gets two wall rows. The generator writes `<name>.txt` (the plan), `<name>.tmj`
(Tiled, layers ground, fixtures, markers) and `<name>-preview.png`, and checks that
every floor tile and mark is reachable from the entry (gates shut, then open).

Plan characters: . floor, r rug, D door, G gated door (floor with a gate property),
C counter, S shelf, B bed, T table, K kitchen strip, X crate or bin, W workstation,
H hearth, Q seat, L display or tank, # wall, blank void.
"""
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).parent
TILE = {"wall": 2, "floor": 3, "rug": 4, "door": 5, "gate": 16}
FIX = {"C": 6, "S": 7, "B": 8, "T": 9, "K": 10, "X": 11, "W": 12, "H": 13, "Q": 14, "L": 15}
SWATCH = [(0, 0, 0, 0), (86, 64, 50), (214, 180, 126), (170, 110, 100), (60, 40, 30),
          (200, 205, 210), (110, 120, 160), (160, 60, 70), (150, 105, 70), (170, 196, 150),
          (210, 150, 60), (120, 100, 90), (190, 90, 40), (150, 110, 160), (70, 110, 170),
          (200, 120, 160)]
# gid (1 based) to swatch: gid n is swatches[n-1]; ground uses 2 wall, 3 floor, 4 rug, 5 door
GID_COLOUR = {i + 1: SWATCH[i] for i in range(16)}


class Plan:
    def __init__(self, name, title):
        self.name, self.title = name, title
        self.cells = {}   # (x, y) -> plan char
        self.marks = []   # (name, x, y)

    def floor(self, x0, y0, x1, y1, ch="."):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.cells[(x, y)] = ch

    def put(self, ch, x0, y0, x1=None, y1=None):
        x1 = x0 if x1 is None else x1
        y1 = y0 if y1 is None else y1
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                assert (x, y) in self.cells, f"{self.name}: {ch} at {x},{y} is on void"
                self.cells[(x, y)] = ch

    def mark(self, name, x, y):
        self.marks.append((name, x, y))

    def door(self, x, y, entry_y):
        """A 2 wide door notch: floor at entry_y and the D row, marks on both."""
        for dx in (0, 1):
            self.cells[(x + dx, entry_y)] = "."
            self.cells[(x + dx, y)] = "D"
            self.mark(f"entry-{dx + 1}", x + dx, entry_y)
            self.mark(f"door-{dx + 1}", x + dx, y)

    def gate(self, name, x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.cells[(x, y)] = "G"
        n = 0
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                n += 1
                self.mark(f"door-gated-{name}-{n}", x, y)

    # ----- build the grid with walls -----
    def build(self):
        xs = [p[0] for p in self.cells]
        ys = [p[1] for p in self.cells]
        ox, oy = min(xs) - 1, min(ys) - 2
        w, h = max(xs) - ox + 2, max(ys) - oy + 2
        grid = [[" "] * w for _ in range(h)]
        for (x, y), ch in self.cells.items():
            grid[y - oy][x - ox] = ch
        walls = set()
        for (x, y) in self.cells:
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    p = (x + dx, y + dy)
                    if p not in self.cells:
                        walls.add(p)
            if (x, y - 1) not in self.cells:
                walls.add((x, y - 2))
        for (x, y) in walls:
            if (x, y) not in self.cells:
                grid[y - oy][x - ox] = "#"
        self.grid, self.w, self.h, self.ox, self.oy = grid, w, h, ox, oy
        return grid

    def tile_marks(self):
        return [(n, x - self.ox, y - self.oy) for n, x, y in self.marks]

    # ----- checks -----
    def walkable(self, ch, gates_open):
        if ch in " #" or ch in FIX:
            return False
        if ch == "G":
            return gates_open
        return True

    def reach(self, gates_open):
        entries = [(x, y) for n, x, y in self.tile_marks() if n.startswith("entry-")]
        seen, q = set(entries), deque(entries)
        while q:
            x, y = q.popleft()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if (nx, ny) in seen or not (0 <= nx < self.w and 0 <= ny < self.h):
                    continue
                if self.walkable(self.grid[ny][nx], gates_open):
                    seen.add((nx, ny))
                    q.append((nx, ny))
        return seen

    def check(self):
        report = []
        allfloor = {(x, y) for y in range(self.h) for x in range(self.w)
                    if self.walkable(self.grid[y][x], True)}
        shut = self.reach(False)
        opened = self.reach(True)
        if allfloor - opened:
            report.append(f"UNREACHABLE even with gates open: {sorted(allfloor - opened)[:12]}")
        closed_missing = allfloor - shut
        report.append(f"gates shut: {len(closed_missing)} floor tiles behind gates, "
                      f"{len(shut)} reachable of {len(allfloor)}")
        for n, x, y in self.tile_marks():
            if (x, y) not in opened:
                report.append(f"MARK NOT REACHABLE: {n} at {x},{y}")
            if self.grid[y][x] in FIX:
                report.append(f"MARK ON FIXTURE: {n} at {x},{y}")
        # counters: player tiles in front (any side) that are walkable
        seen = set()
        for y in range(self.h):
            for x in range(self.w):
                if self.grid[y][x] == "C" and (x, y) not in seen:
                    grp, q = [], [(x, y)]
                    seen.add((x, y))
                    while q:
                        cx, cy = q.pop()
                        grp.append((cx, cy))
                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            p = (cx + dx, cy + dy)
                            if p not in seen and self.grid[p[1]][p[0]] == "C":
                                seen.add(p)
                                q.append(p)
                    front = {(cx, cy + 1) for cx, cy in grp} & shut
                    back = {(cx, cy - 1) for cx, cy in grp} & shut
                    report.append(f"counter at {min(grp)}, {len(grp)} wide: "
                                  f"{len(front)} player tiles, {len(back)} keeper tiles")
        # narrow cells: walkable tiles not in any 2 by 2 block of walkable tiles
        narrow = []
        for (x, y) in sorted(allfloor):
            ok = False
            for ax in (x - 1, x):
                for ay in (y - 1, y):
                    if all((ax + i, ay + j) in allfloor for i in (0, 1) for j in (0, 1)):
                        ok = True
            if not ok:
                narrow.append((x, y))
        report.append(f"tiles in no 2 by 2 free block: {len(narrow)} {narrow[:30]}")
        return report

    # ----- output -----
    def write(self):
        txt = "\n".join("".join(r).rstrip() for r in self.grid) + "\n"
        (HERE / f"{self.name}.txt").write_text(txt)
        W, H = self.w, self.h
        ground, fix = [], []
        for row in self.grid:
            for ch in row:
                if ch == "#":
                    ground.append(TILE["wall"]); fix.append(0)
                elif ch == " ":
                    ground.append(0); fix.append(0)
                elif ch == "D":
                    ground.append(TILE["door"]); fix.append(0)
                elif ch == "G":
                    ground.append(TILE["gate"]); fix.append(0)
                elif ch == "r":
                    ground.append(TILE["rug"]); fix.append(0)
                elif ch in FIX:
                    ground.append(TILE["floor"]); fix.append(FIX[ch])
                else:
                    ground.append(TILE["floor"]); fix.append(0)
        tmpl = json.loads((HERE / "general-store.tmj").read_text())
        tmpl["width"], tmpl["height"] = W, H
        for p in tmpl["properties"]:
            if p["name"] == "draft":
                p["value"] = f"{self.title}, note 86"
            if p["name"] == "sizeNote":
                p["value"] = f"{W} by {H} tiles including walls and the door notch"
        for layer in tmpl["layers"]:
            if layer["name"] == "ground":
                layer["data"], layer["width"], layer["height"] = ground, W, H
            elif layer["name"] == "fixtures":
                layer["data"], layer["width"], layer["height"] = fix, W, H
            else:
                objs = []
                for i, (n, x, y) in enumerate(self.tile_marks(), 1):
                    objs.append({"id": i, "name": n, "type": "", "x": x * 16 + 8, "y": y * 16 + 8,
                                 "width": 0, "height": 0, "point": True, "visible": True,
                                 "rotation": 0, "properties": []})
                layer["objects"] = objs
                tmpl["nextobjectid"] = len(objs) + 1
        (HERE / f"{self.name}.tmj").write_text(json.dumps(tmpl, indent=1) + "\n")
        s = 12
        im = Image.new("RGB", (W * s, H * s), (245, 245, 245))
        d = ImageDraw.Draw(im)
        for y in range(H):
            for x in range(W):
                g, f = ground[y * W + x], fix[y * W + x]
                gid = f if f else g
                if f:
                    base = GID_COLOUR[TILE["floor"]]
                    d.rectangle([x * s, y * s, x * s + s - 1, y * s + s - 1], fill=base[:3])
                if gid:
                    d.rectangle([x * s, y * s, x * s + s - 1, y * s + s - 1],
                                fill=GID_COLOUR[gid][:3])
        for k in range(0, max(W, H) + 1, 5):
            d.line([(k * s, 0), (k * s, H * s)], fill=(190, 190, 230))
            d.line([(0, k * s), (W * s, k * s)], fill=(190, 190, 230))
        for n, x, y in self.tile_marks():
            d.ellipse([x * s + 3, y * s + 3, x * s + s - 4, y * s + s - 4], fill=(255, 230, 0))
        im.save(HERE / f"{self.name}-preview.png")


def main():
    import plans
    wanted = sys.argv[1:]
    for p in plans.ALL:
        if wanted and p.name not in wanted:
            continue
        p.build()
        print(f"== {p.name}: {p.w} by {p.h} ({p.title})")
        for line in p.check():
            print("  ", line)
        p.write()


if __name__ == "__main__":
    main()
