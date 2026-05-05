import type { Page, ConsoleMessage } from '@playwright/test';
import fs from 'fs';

const EVIDENCE_DIR = './test-evidence';
let RUN_LABEL = '';

function formatRunLabel(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function getJourneyDir(journeyId: string): string {
  if (!RUN_LABEL) {
    RUN_LABEL = formatRunLabel(new Date());
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
  const dir = `${EVIDENCE_DIR}/${RUN_LABEL}__${journeyId}`;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function saveEvidence(page: Page, journeyId: string, label: string): Promise<void> {
  const dir = getJourneyDir(journeyId);
  const timestamp = Date.now();

  // Screenshot
  try {
    await page.screenshot({ path: `${dir}/${journeyId}-${label}-${timestamp}.png`, fullPage: true });
  } catch {
    // ignore
  }

  // HTML
  try {
    const html = await page.content();
    fs.writeFileSync(`${dir}/${journeyId}-${label}-${timestamp}.html`, html, 'utf-8');
  } catch {
    // ignore
  }
}

/**
 * Attach a console log listener to a page and return a function to save all captured logs.
 * Call startCapture() early in the test and saveLogs() at the end or on failure.
 */
export function captureConsoleLogs(page: Page, journeyId: string): {
  startCapture: () => void;
  saveLogs: (label?: string) => Promise<void>;
  getLogs: () => string[];
} {
  const logs: string[] = [];

  const startCapture = () => {
    page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();
      const text = msg.text();
      const line = `[${type.toUpperCase()}] ${text}`;
      logs.push(line);
      // Also echo to Node stdout so they appear in test output
      if (type === 'error') {
        console.error('🌐 PAGE ERROR:', text);
      } else if (type === 'warning') {
        console.warn('🌐 PAGE WARN:', text);
      }
    });

    page.on('pageerror', (err) => {
      const line = `[PAGEERROR] ${err.message}`;
      logs.push(line);
      console.error('🌐 PAGEERROR:', err.message);
    });
  };

  const saveLogs = async (label = 'console-logs') => {
    const dir = getJourneyDir(journeyId);
    const timestamp = Date.now();
    const content = logs.join('\n') || '(no console logs captured)';
    fs.writeFileSync(`${dir}/${journeyId}-${label}-${timestamp}.log`, content, 'utf-8');
  };

  const getLogs = () => [...logs];

  return { startCapture, saveLogs, getLogs };
}
