import { describe, expect, it } from "vitest";
import { isUuid, nextAvailableSlug, slugify } from "./slug";

describe("slugify", () => {
  it("turns a title into a kebab slug", () => {
    expect(slugify("Nairobi Food Walk")).toBe("nairobi-food-walk");
  });

  it("turns a person name into a kebab slug", () => {
    expect(slugify("Munde Immaculate ")).toBe("munde-immaculate");
  });

  it("uses a fallback for reserved words", () => {
    expect(slugify("New", "experience")).toBe("experience");
  });
});

describe("isUuid", () => {
  it("detects experience ids", () => {
    expect(isUuid("ec5e1ad6-7636-4086-88f2-17bd7fa17bce")).toBe(true);
    expect(isUuid("nairobi-food-walk")).toBe(false);
  });
});

describe("nextAvailableSlug", () => {
  it("appends a suffix when the base slug is taken", async () => {
    const taken = new Set(["godrick-mwale"]);
    const slug = await nextAvailableSlug("Godrick Mwale", async (candidate) => taken.has(candidate), "guide");
    expect(slug).toBe("godrick-mwale-2");
  });
});
