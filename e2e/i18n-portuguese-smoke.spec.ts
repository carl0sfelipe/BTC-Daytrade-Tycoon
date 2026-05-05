import { test, expect } from "@playwright/test";

const PAGES = ["/", "/trading", "/achievements", "/leaderboard", "/auth/login", "/auth/signup"];

/**
 * Regex patterns that strongly indicate Portuguese text.
 * These characters are extremely rare in English and basically
 * guarantee Portuguese (or other Romance languages) in our context.
 */
const PORTUGUESE_CHAR_PATTERNS = [
  /ç/,      // c-cedilla — almost exclusively Portuguese/Spanish/French
  /ã/,      // a-tilde — very common in Portuguese
  /õ/,      // o-tilde — very common in Portuguese
  /[áéíóúâêîôûàèìòù][a-z]{2,}/i,  // accented vowel followed by word chars
];

/**
 * Specific Portuguese words that must never appear in the UI.
 * These were previously found in the codebase and translated.
 */
const PORTUGUESE_WORDS = [
  "mercado",
  "vazio",
  "acima",
  "abaixo",
  "invalido",
  "invalida",
  "coloque",
  "preco",
  "ordem",
  "conquistas",
  "posicao",
  "carteira",
  "saldo",
  "alavancagem",
  "compra",
  "venda",
  "fechar posicao",
  "abrir posicao",
  "cancelar",
  "confirmar",
  "lucro",
  "perda",
  "realizada",
  "nao",
  "voce",
  "seu",
  "sua",
  "entrada",
  "saida",
  "liquidez",
  "liquidacao",
  "ganhos",
  "perdas",
  "disponivel",
];

/**
 * Helper: collect all visible text from the page, excluding
 * script/style/noscript tags and hidden elements.
 */
async function getVisibleText(page: any): Promise<string> {
  return page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (["script", "style", "noscript"].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          const style = window.getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden") {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    const texts: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      texts.push(node.textContent || "");
    }
    return texts.join(" ");
  });
}

for (const path of PAGES) {
  test(`page ${path} has no visible Portuguese text`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const visibleText = await getVisibleText(page);
    const lowerText = visibleText.toLowerCase();

    // Check character patterns
    for (const pattern of PORTUGUESE_CHAR_PATTERNS) {
      const match = lowerText.match(pattern);
      if (match) {
        const snippet = visibleText.substring(
          Math.max(0, match.index! - 20),
          Math.min(visibleText.length, match.index! + match[0].length + 20)
        );
        throw new Error(
          `Found Portuguese character pattern "${match[0]}" on ${path}\n` +
          `Snippet: "...${snippet}..."`
        );
      }
    }

    // Check specific words (word-boundary aware to avoid substring matches)
    for (const word of PORTUGUESE_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      const match = lowerText.match(regex);
      if (match) {
        const idx = lowerText.indexOf(match[0]);
        const snippet = visibleText.substring(
          Math.max(0, idx - 20),
          Math.min(visibleText.length, idx + match[0].length + 20)
        );
        throw new Error(
          `Found Portuguese word "${match[0]}" on ${path}\n` +
          `Snippet: "...${snippet}..."`
        );
      }
    }
  });
}
