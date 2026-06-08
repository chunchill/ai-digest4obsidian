import { dateFolderFromIso, parseFeedDate, safeFileName, truncateText } from "../src/slug";

describe("safeFileName", () => {
  it("lowercases text and removes unsafe path characters", () => {
    expect(safeFileName("Hello / AI: Builders? * Now!")).toBe("hello-ai-builders-now");
  });

  it("falls back when input has no usable characters", () => {
    expect(safeFileName("///")).toBe("untitled");
  });

  it("limits long slugs", () => {
    expect(safeFileName("a".repeat(120), 20)).toBe("aaaaaaaaaaaaaaaaaaaa");
  });
});

describe("dateFolderFromIso", () => {
  it("uses the UTC date portion of an ISO timestamp", () => {
    expect(dateFolderFromIso("2026-05-24T02:51:49.000Z")).toBe("2026-05-24");
  });

  it("parses human-readable feed dates", () => {
    expect(dateFolderFromIso(parseFeedDate("May 19, 2026"))).toBe("2026-05-19");
  });

  it("falls back to today's date for invalid timestamps", () => {
    expect(dateFolderFromIso("not-a-date", new Date("2026-05-25T10:00:00.000Z"))).toBe("2026-05-25");
  });
});

describe("parseFeedDate", () => {
  it("normalizes ISO and human-readable dates to ISO strings", () => {
    expect(parseFeedDate("2026-05-22T09:00:00.000Z")).toBe("2026-05-22T09:00:00.000Z");
    expect(parseFeedDate("May 19, 2026")).toBe("2026-05-19T12:00:00.000Z");
  });

  it("uses the fallback for invalid values", () => {
    expect(parseFeedDate("not-a-date", new Date("2026-06-05T07:42:12.776Z"))).toBe(
      "2026-06-05T07:42:12.776Z"
    );
  });
});

describe("truncateText", () => {
  it("trims text at the requested length", () => {
    expect(truncateText("hello world", 5)).toBe("hello");
  });
});
