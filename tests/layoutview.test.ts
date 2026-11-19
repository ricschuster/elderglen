import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mapFiles, maps } from "../src/content/maps";
import {
  groupProblems,
  mapKind,
  placedObjects,
  problemMapId,
  problemPlace,
  registryProblems,
  viewBoxAt,
} from "../src/core/layoutview";

describe("layout page helpers", () => {
  it("the problem list is the real registry list", () => {
    expect(registryProblems(mapFiles)).toEqual(maps.problems());
  });

  it("every committed map opens: objects, kind, view box", () => {
    for (const [id, json] of Object.entries(mapFiles)) {
      expect(["outdoor", "interior", "festival"]).toContain(mapKind(id, json));
      expect(placedObjects(json, 0).length).toBeGreaterThan(0);
      const b = viewBoxAt(json, 0, 0);
      expect(b.x).toBe(0);
      expect(b.w).toBe(30);
    }
  });

  it("groups problems by map id", () => {
    const g = groupProblems([
      "farm: needs at least one entry",
      "house tier 1 (all conditions true): x",
    ]);
    expect(g.get("farm")?.length).toBe(1);
    expect(g.get("house")?.length).toBe(1);
    expect(problemMapId("forest: y")).toBe("forest");
  });

  it("finds the place of a problem", () => {
    const j = mapFiles["farm"]!;
    expect(problemPlace(j, "forage spot 3,4 cannot be reached")).toEqual({
      x: 3,
      y: 4,
    });
    const exit = placedObjects(j, 0).find((o) => o.cls === "exit")!;
    expect(
      problemPlace(j, `exit "${exit.name}" cannot be reached`),
    ).toBeDefined();
  });

  it("reports an unreadable map as a problem, not a throw", () => {
    const bad = { ...mapFiles["farm"]!, layers: [] };
    expect(registryProblems({ farm: bad }).length).toBeGreaterThan(0);
  });
});

describe("the page stays out of the production build", () => {
  it("dist holds neither the page nor its code", () => {
    const out = mkdtempSync(join(tmpdir(), "layout-build-"));
    try {
      execFileSync(
        "npx",
        [
          "vite",
          "build",
          "--outDir",
          out,
          "--emptyOutDir",
          "--logLevel",
          "silent",
        ],
        { stdio: "pipe" },
      );
      expect(existsSync(join(out, "layout.html"))).toBe(false);
      const all = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? all(join(dir, e.name)) : [join(dir, e.name)],
        );
      for (const f of all(out).filter((p) => /\.(js|html)$/.test(p))) {
        const text = readFileSync(f, "utf8");
        expect(text).not.toContain("layout page (dev only)");
        expect(text).not.toContain("__layout");
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 240_000);
});
