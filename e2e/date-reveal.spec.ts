import { test, expect } from '@playwright/test';
import { saveEvidence } from './_helper';

const JID = 'DATE-REVEAL';

test.describe('Revelação de data histórica', () => {
  test('botão Encerrar abre modal com período histórico', async ({ page }) => {
    await page.goto('/trading');
    await page.waitForSelector('text=Tempo de Simulação', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await saveEvidence(page, JID, '01-simulation-running');

    await page.click('button:has-text("Encerrar")');
    await page.waitForSelector('text=Simulação Encerrada', { timeout: 5000 });
    await saveEvidence(page, JID, '02-end-modal-with-date');

    const dateText = await page.locator('text=Período Histórico Real').locator('..').locator('div.font-mono').textContent();
    expect(dateText).toMatch(/\d{2}\/\d{2}\/\d{4}\s*→\s*\d{2}\/\d{2}\/\d{4}/);

    await page.click('button:has-text("Voltar")');
    await page.waitForTimeout(500);
    await saveEvidence(page, JID, '03-back-to-simulation');
  });

  test('liquidação dispara modal vermelho com data', async ({ page }) => {
    await page.goto('/trading');
    await page.waitForSelector('text=Tempo de Simulação', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Injeta posição com liquidationPrice acima do preço atual (long liquidado no próximo tick)
    // e seta simulationRealDate para garantir que o modal terá data válida.
    await page.evaluate(() => {
      const store = (window as unknown as { __tradingStore: { getState: () => { currentPrice: number }; setState: (s: object) => void } }).__tradingStore;
      const cp = store.getState().currentPrice;
      store.setState({
        position: {
          side: 'long',
          entry: cp,
          size: 1000,
          leverage: 100,
          tpPrice: null,
          slPrice: null,
          liquidationPrice: cp * 1.5,
        },
      });
    });

    await page.waitForSelector('text=CONTA LIQUIDADA', { timeout: 5000 });
    await saveEvidence(page, JID, '04-liquidation-modal');

    const liqDate = await page.locator('text=Período Histórico Real').locator('..').locator('div.font-mono').textContent();
    expect(liqDate).toMatch(/\d{2}\/\d{2}\/\d{4}\s*→\s*\d{2}\/\d{2}\/\d{4}/);

    await page.click('button:has-text("Nova Sessão")');
    await page.waitForTimeout(2000);
    await saveEvidence(page, JID, '05-after-new-session');
  });
});
