import { describe, expect, it } from "vitest";
import { computeOdStatus } from "@/lib/attendance/od-approval";

describe("computeOdStatus", () => {
  it("is PENDING when neither has decided", () => {
    expect(computeOdStatus(null, null)).toBe("PENDING");
  });

  it("is PENDING when only one has approved", () => {
    expect(computeOdStatus("APPROVED", null)).toBe("PENDING");
    expect(computeOdStatus(null, "APPROVED")).toBe("PENDING");
  });

  it("is APPROVED only once both have approved", () => {
    expect(computeOdStatus("APPROVED", "APPROVED")).toBe("APPROVED");
  });

  it("is REJECTED the moment either rejects, regardless of order", () => {
    expect(computeOdStatus("REJECTED", null)).toBe("REJECTED");
    expect(computeOdStatus(null, "REJECTED")).toBe("REJECTED");
  });

  it("rejection wins even if the other already approved", () => {
    expect(computeOdStatus("APPROVED", "REJECTED")).toBe("REJECTED");
    expect(computeOdStatus("REJECTED", "APPROVED")).toBe("REJECTED");
  });
});
