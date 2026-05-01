import type { Page } from '@playwright/test';
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
