import { describe, expect, it } from "vitest";
import { suggestedDocxFileName } from "./save-docx-workflow";

describe("suggestedDocxFileName", () => {
  it("adds .docx and strips illegal characters", () => {
    expect(suggestedDocxFileName('Глава 1: начало')).toBe("Глава 1 начало.docx");
    expect(suggestedDocxFileName('bad\\/:*?"<>|')).toBe("bad.docx");
  });

  it("does not double extension", () => {
    expect(suggestedDocxFileName("Report.DOCX")).toBe("Report.DOCX");
  });

  it("uses fallback for empty title", () => {
    expect(suggestedDocxFileName("   ")).toBe("Документ.docx");
  });
});
