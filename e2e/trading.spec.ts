import { test, expect } from '@playwright/test';
import { saveEvidence } from './_helper';

const JID = 'TRADING-01';

test.describe('Trading Simulator Smoke', () => {
  test('full simulation journey', async ({ page }) => {
    // 1. Entra na página
    await page.goto('/trading');
    await expect(page.locator('body')).toBeVisible();
    await saveEvidence(page, JID, '01-page-loaded');

    // 2. Loader visível
    await page.waitForSelector('text=Iniciando TimeWarp', { timeout: 5000 });
    await saveEvidence(page, JID, '02-loader-visible');

    // 3. Simulação iniciada (clock aparece)
    await page.waitForSelector('text=Tempo de Simulação', { timeout: 30000 });
    await page.waitForTimeout(1500);
    await saveEvidence(page, JID, '03-simulation-started');

    // 4. Gráfico com primeiros candles (3s)
    await page.waitForTimeout(3000);
    await saveEvidence(page, JID, '04-chart-3s');

    // 5. Gráfico avançando (10s)
    await page.waitForTimeout(7000);
    await saveEvidence(page, JID, '05-chart-10s');

    // 6. Gráfico avançando mais (20s)
    await page.waitForTimeout(10000);
    await saveEvidence(page, JID, '06-chart-20s');

    // 7. Pausa
    await page.click('text=Pausar');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '07-paused');

    // 8. Nova sessão
    await page.click('text=Nova');
    await page.waitForSelector('text=Iniciando TimeWarp', { timeout: 5000 });
    await saveEvidence(page, JID, '08-new-session-loader');

    await page.waitForSelector('text=Tempo de Simulação', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await saveEvidence(page, JID, '09-new-session-running');
  });
});
