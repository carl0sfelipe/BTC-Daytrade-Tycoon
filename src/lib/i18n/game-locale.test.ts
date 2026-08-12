import { describe, expect, it } from "vitest";
import { enGameMessages } from "./messages/en";
import { ptBrGameMessages } from "./messages/pt-br";
import { GAME_LOCALES, nextGameLocale, resolveGameMessages } from "./game-locale";

type MessageLeafKind = "string" | "function";
type MessageCatalogNode = Record<string, unknown>;
type LooseMessageFn = (...args: unknown[]) => unknown;

/** Flattens a catalog into "path → leaf kind" entries so shapes can be diffed. */
function collectMessageShape(
  node: MessageCatalogNode,
  prefix: string,
  out: Map<string, MessageLeafKind>
): void {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, "string");
    else if (typeof value === "function") out.set(path, "function");
    else collectMessageShape(value as MessageCatalogNode, path, out);
  }
}

function messageShapeOf(catalog: MessageCatalogNode): Record<string, MessageLeafKind> {
  const shape = new Map<string, MessageLeafKind>();
  collectMessageShape(catalog, "", shape);
  return Object.fromEntries(shape);
}

interface MessageFunctionPair {
  path: string;
  enFn: LooseMessageFn;
  ptFn: LooseMessageFn;
}

/** Pairs up every parameterized message across the two catalogs, by path. */
function collectFunctionPairs(
  enNode: MessageCatalogNode,
  ptNode: MessageCatalogNode,
  prefix: string
): MessageFunctionPair[] {
  const pairs: MessageFunctionPair[] = [];
  for (const [key, enValue] of Object.entries(enNode)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const ptValue = ptNode[key];
    if (typeof enValue === "function") {
      pairs.push({ path, enFn: enValue as LooseMessageFn, ptFn: ptValue as LooseMessageFn });
    } else if (typeof enValue === "object" && enValue !== null) {
      pairs.push(
        ...collectFunctionPairs(enValue as MessageCatalogNode, ptValue as MessageCatalogNode, path)
      );
    }
  }
  return pairs;
}

describe("resolveGameMessages", () => {
  it("resolves the English catalog for en", () => {
    expect(resolveGameMessages("en")).toBe(enGameMessages);
  });

  it("resolves the Portuguese catalog for pt-BR", () => {
    expect(resolveGameMessages("pt-BR")).toBe(ptBrGameMessages);
  });
});

describe("nextGameLocale", () => {
  it("cycles en → pt-BR → en", () => {
    expect(nextGameLocale("en")).toBe("pt-BR");
    expect(nextGameLocale("pt-BR")).toBe("en");
  });

  it("stays inside the supported locale list from every starting point", () => {
    for (const locale of GAME_LOCALES) {
      expect(GAME_LOCALES).toContain(nextGameLocale(locale));
    }
  });
});

describe("catalog shape parity (en vs pt-BR)", () => {
  it("pt-BR has exactly the same keys and leaf kinds as en, recursively", () => {
    expect(messageShapeOf(ptBrGameMessages)).toEqual(messageShapeOf(enGameMessages));
  });

  // Unique sentinels catch a translation that silently drops a parameter —
  // "returns some text" alone would miss it.
  const SENTINEL_ARGS = [987654, 456789];

  it("every parameterized message pair keeps the arity and interpolates each argument", () => {
    const pairs = collectFunctionPairs(enGameMessages, ptBrGameMessages, "");
    expect(pairs.length).toBeGreaterThan(0);
    for (const { path, enFn, ptFn } of pairs) {
      expect(ptFn.length, path).toBe(enFn.length);
      const usedArgs = SENTINEL_ARGS.slice(0, enFn.length);
      for (const messageFn of [enFn, ptFn]) {
        const text = messageFn(...usedArgs);
        expect(typeof text, path).toBe("string");
        for (const sentinel of usedArgs) {
          expect(text, path).toContain(String(sentinel));
        }
      }
    }
  });
});
