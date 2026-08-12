import { describe, expect, it } from "vitest";
import { buildDiamondAuthToast } from "./AuthPage";

describe("buildDiamondAuthToast", () => {
  it("celebrates the migrated balance on signup", () => {
    const result = buildDiamondAuthToast("signup", 87, 87);
    expect(result?.title).toBe("💎 87 diamonds secured");
  });

  it("stays silent on signup when there was nothing to migrate", () => {
    expect(buildDiamondAuthToast("signup", 0, 0)).toBeNull();
  });

  it("explains the balance change on login instead of looking like a bug", () => {
    const result = buildDiamondAuthToast("login", 42, 310);
    expect(result?.title).toBe("💎 Account balance restored: 310");
  });

  it("stays silent on login when local and server already agree", () => {
    expect(buildDiamondAuthToast("login", 310, 310)).toBeNull();
  });
});
