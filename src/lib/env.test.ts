import { describe, expect, it, beforeEach } from "vitest";
import { isAllowedDomain, isBootstrapAdminEmail } from "@/lib/env";

describe("isAllowedDomain", () => {
  beforeEach(() => {
    process.env.ALLOWED_EMAIL_DOMAINS = "psncet.ac.in";
  });

  it("allows an email on a configured domain", () => {
    expect(isAllowedDomain("anitha@psncet.ac.in")).toBe(true);
  });

  it("is case-insensitive on the domain", () => {
    expect(isAllowedDomain("anitha@PSNCET.AC.IN")).toBe(true);
  });

  it("rejects an email on an unconfigured domain", () => {
    expect(isAllowedDomain("someone@gmail.com")).toBe(false);
  });

  it("rejects a malformed email with no domain", () => {
    expect(isAllowedDomain("not-an-email")).toBe(false);
  });

  it("supports multiple configured domains", () => {
    process.env.ALLOWED_EMAIL_DOMAINS = "psncet.ac.in,students.psncet.ac.in";
    expect(isAllowedDomain("student@students.psncet.ac.in")).toBe(true);
  });
});

describe("isBootstrapAdminEmail", () => {
  beforeEach(() => {
    process.env.INITIAL_ADMIN_EMAILS = "hodaids@psncet.ac.in,samselvinnd11@gmail.com";
  });

  it("recognizes a configured bootstrap admin email", () => {
    expect(isBootstrapAdminEmail("samselvinnd11@gmail.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isBootstrapAdminEmail("SamSelvinnd11@Gmail.com")).toBe(true);
  });

  it("rejects an email not on the bootstrap list", () => {
    expect(isBootstrapAdminEmail("random@gmail.com")).toBe(false);
  });
});
