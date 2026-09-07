import { describe, expect, it } from "vitest";
import { canPublish, missingPublishPieces, nextGapHint } from "./experiencePublish";

const ready = {
  title: "Oloiden hike",
  priceUsdc: 100,
  durationMinutes: 240,
  meetingLat: -0.78,
  meetingLng: 36.28,
  futureSlotCount: 2,
};

describe("missingPublishPieces", () => {
  it("lists every gap for an empty draft", () => {
    expect(
      missingPublishPieces({
        title: "  ",
        priceUsdc: 0,
        durationMinutes: 0,
        meetingLat: null,
        meetingLng: null,
        futureSlotCount: 0,
      })
    ).toEqual(["title", "price", "duration", "meeting point", "a future time slot"]);
  });

  it("allows publish when title, price, duration, pin, and a future slot exist", () => {
    expect(missingPublishPieces(ready)).toEqual([]);
    expect(canPublish(ready)).toBe(true);
  });

  it("does not require photos or itinerary", () => {
    expect(canPublish(ready)).toBe(true);
  });

  it("names the next gap for Continue setup copy", () => {
    expect(nextGapHint({ ...ready, meetingLat: null, meetingLng: null })).toBe("Add meeting point");
    expect(nextGapHint({ ...ready, futureSlotCount: 0 })).toBe("Add a future time slot");
  });
});
