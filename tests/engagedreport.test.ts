import { describe, expect, it } from "vitest";
import { engagedReportLine } from "../src/core/courtship";

const engaged = {
  stage: "engaged",
  spouse: "bramwell",
  weddingDay: 10,
} as const;

describe("engagedReportLine", () => {
  it("says the wedding is tomorrow one day out", () => {
    expect(engagedReportLine(engaged, 9)).toMatch(
      /engaged to .*wedding is tomorrow\.$/,
    );
  });
  it("counts days two and three out", () => {
    expect(engagedReportLine(engaged, 8)).toMatch(
      /The wedding is in 2 days\.$/,
    );
    expect(engagedReportLine(engaged, 7)).toMatch(
      /The wedding is in 3 days\.$/,
    );
  });
  it("is silent on the wedding day, where the scene follows", () => {
    expect(engagedReportLine(engaged, 10)).toBeUndefined();
    expect(engagedReportLine(engaged, 11)).toBeUndefined();
  });
  it("is silent when not engaged", () => {
    for (const stage of ["none", "courting", "married"] as const)
      expect(engagedReportLine({ ...engaged, stage }, 8)).toBeUndefined();
  });
  it("is not doubled when the two-player notice shows", () => {
    expect(engagedReportLine(engaged, 8, true)).toBeUndefined();
  });
});
