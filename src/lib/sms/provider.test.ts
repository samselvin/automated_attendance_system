import { describe, expect, it } from "vitest";
import { toE164India } from "@/lib/sms/provider";

describe("toE164India", () => {
  it("prefixes a bare 10-digit Indian number with +91", () => {
    expect(toE164India("9876543210")).toBe("+919876543210");
  });

  it("strips spaces/dashes before prefixing", () => {
    expect(toE164India("98765 43210")).toBe("+919876543210");
    expect(toE164India("98765-43210")).toBe("+919876543210");
  });

  it("leaves a number that already has a + untouched", () => {
    expect(toE164India("+919876543210")).toBe("+919876543210");
    expect(toE164India("+15551234567")).toBe("+15551234567");
  });
});
