import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password-hash";

describe("hashPassword", () => {
  it("produces the self-contained scrypt format", async () => {
    const stored = await hashPassword("hunter22!");
    const [prefix, salt, key] = stored.split(":");
    expect(prefix).toBe("scrypt");
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(key).toMatch(/^[0-9a-f]{128}$/);
  });

  it("never stores the plaintext password", async () => {
    const stored = await hashPassword("hunter22!");
    expect(stored).not.toContain("hunter22!");
  });

  it("salts each hash so equal passwords produce different hashes", async () => {
    const first = await hashPassword("same-password");
    const second = await hashPassword("same-password");
    expect(first).not.toBe(second);
  });
});

describe("verifyPassword", () => {
  it("accepts the original password", async () => {
    const stored = await hashPassword("correct horse battery");
    await expect(verifyPassword("correct horse battery", stored)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse battery");
    await expect(verifyPassword("wrong horse", stored)).resolves.toBe(false);
  });

  it("fails closed on malformed stored hashes", async () => {
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
    await expect(verifyPassword("anything", "nonsense")).resolves.toBe(false);
    await expect(verifyPassword("anything", "scrypt:onlysalt")).resolves.toBe(false);
    await expect(verifyPassword("anything", "bcrypt:aa:bb")).resolves.toBe(false);
  });
});
