import { describe, expect, it } from "vitest";
import {
  MAX_UPCOMING_SLOTS,
  canAddAnotherSlot,
  eatWallClockToIso,
  formatSlotTimeRange,
  isoToEatWallClock,
  slotEndsAtIso,
} from "./slots";

describe("EAT wall clock", () => {
  it("treats datetime-local as Africa/Nairobi, not the browser zone", () => {
    const iso = eatWallClockToIso("2026-09-12T11:30");
    expect(iso).toBe("2026-09-12T08:30:00.000Z");
  });

  it("round-trips ISO back to an EAT datetime-local value", () => {
    expect(isoToEatWallClock("2026-09-12T08:30:00.000Z")).toBe("2026-09-12T11:30");
  });
});

describe("duration-derived end", () => {
  it("adds 4 hours: 11:30 to 15:30 EAT", () => {
    const start = eatWallClockToIso("2026-09-12T11:30");
    const end = slotEndsAtIso(start, 240);
    expect(end).toBe("2026-09-12T12:30:00.000Z");
    expect(formatSlotTimeRange(start, end)).toBe("11:30 AM – 3:30 PM EAT");
  });
});

describe("slot cap", () => {
  it("allows 100 upcoming slots and blocks 101", () => {
    expect(MAX_UPCOMING_SLOTS).toBe(100);
    expect(canAddAnotherSlot(99)).toBe(true);
    expect(canAddAnotherSlot(100)).toBe(false);
  });
});
