import { describe, it, expect } from "vitest";
import { validateLoginInput, validateSignupInput } from "./auth-validation";

const validSignup = {
  username: "satoshi_21",
  email: "satoshi@example.com",
  password: "hunter22!",
};

describe("validateSignupInput", () => {
  it("returns null for a valid payload", () => {
    expect(validateSignupInput(validSignup)).toBeNull();
  });

  it("rejects a username shorter than 3 characters", () => {
    expect(validateSignupInput({ ...validSignup, username: "ab" })).toMatch(/at least 3/);
  });

  it("rejects a username with invalid characters", () => {
    expect(validateSignupInput({ ...validSignup, username: "sat oshi!" })).toMatch(
      /letters, numbers/
    );
  });

  it("rejects an invalid email", () => {
    expect(validateSignupInput({ ...validSignup, email: "not-an-email" })).toMatch(/valid email/);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(validateSignupInput({ ...validSignup, password: "short" })).toMatch(/at least 8/);
  });

  it("rejects non-object payloads", () => {
    expect(validateSignupInput(null)).not.toBeNull();
    expect(validateSignupInput("string")).not.toBeNull();
  });
});

describe("validateLoginInput", () => {
  it("returns null for a valid payload", () => {
    expect(validateLoginInput({ email: "satoshi@example.com", password: "x" })).toBeNull();
  });

  it("rejects an invalid email", () => {
    expect(validateLoginInput({ email: "nope", password: "x" })).toMatch(/valid email/);
  });

  it("rejects an empty password", () => {
    expect(validateLoginInput({ email: "satoshi@example.com", password: "" })).toMatch(/required/);
  });
});
