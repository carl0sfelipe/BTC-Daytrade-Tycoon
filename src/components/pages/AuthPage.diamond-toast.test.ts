import { describe, expect, it } from "vitest";
import { enGameMessages } from "@/lib/i18n/messages/en";
import { ptBrGameMessages } from "@/lib/i18n/messages/pt-br";
import { buildDiamondAuthToast } from "./AuthPage";

describe("buildDiamondAuthToast", () => {
  it("celebrates the migrated balance on signup", () => {
    const result = buildDiamondAuthToast("signup", 87, 87, enGameMessages);
    expect(result?.title).toBe("💎 87 diamonds secured");
  });

  it("stays silent on signup when there was nothing to migrate", () => {
    expect(buildDiamondAuthToast("signup", 0, 0, enGameMessages)).toBeNull();
  });

  it("explains the balance change on login instead of looking like a bug", () => {
    const result = buildDiamondAuthToast("login", 42, 310, enGameMessages);
    expect(result?.title).toBe("💎 Account balance restored: 310");
  });

  it("stays silent on login when local and server already agree", () => {
    expect(buildDiamondAuthToast("login", 310, 310, enGameMessages)).toBeNull();
  });

  it("localizes the signup celebration in pt-BR", () => {
    const result = buildDiamondAuthToast("signup", 87, 87, ptBrGameMessages);
    expect(result?.title).toBe("💎 87 diamantes garantidos");
  });
});
