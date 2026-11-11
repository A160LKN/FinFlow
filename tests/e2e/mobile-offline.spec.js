import { expect, test } from '@playwright/test';
import { FinFlowPage } from './finflow-page.js';

test('на телефоне нет горизонтальной прокрутки и можно добавить операцию @mobile', async ({ page }) => {
  const app = new FinFlowPage(page);
  await app.open();
  await app.loadDemo();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);

  await app.addTransaction({ amount: '1500', note: 'С телефона' });
  await expect(app.item().getByTestId('tx-note')).toHaveText('С телефона');
});

test('после первого открытия приложение работает без интернета', async ({ page, context }) => {
  const app = new FinFlowPage(page);
  await app.open();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();   // теперь страницей управляет service worker
  await app.addTransaction({ amount: '900', note: 'До отключения сети' });

  await context.setOffline(true);
  await page.reload();

  await expect(app.amount).toBeVisible();
  await expect(app.item().getByTestId('tx-note')).toHaveText('До отключения сети');
  await context.setOffline(false);
});
