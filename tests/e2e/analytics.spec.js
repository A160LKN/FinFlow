import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { FinFlowPage } from './finflow-page.js';

const plain = FinFlowPage.plain;
let app;

test.beforeEach(async ({ page }) => {
  app = new FinFlowPage(page);
  await app.open();
  await app.loadDemo();
});

test.describe('Диаграмма, бюджеты и график', () => {
  test('пример данных: итоги и сравнение с теми же днями прошлого месяца', async ({ page }) => {
    expect(plain(await app.totalIncome.textContent())).toBe('420 000 ₸');
    expect(plain(await app.totalExpense.textContent())).toBe('134 950 ₸');
    await expect(page.getByTestId('expense-trend')).toHaveText('на 13% меньше, чем за те же дни в октябре');
  });

  test('клик по категории в легенде фильтрует список', async ({ page }) => {
    await page.getByTestId('legend-item').filter({ hasText: 'Продукты' }).click();

    await expect(page.getByTestId('ring-caption')).toHaveText('Продукты');
    await expect(page.getByTestId('active-category')).toContainText('«Продукты»');
    const categories = await app.items.getByTestId('tx-category').allTextContents();
    expect(new Set(categories)).toEqual(new Set(['Продукты']));

    await page.getByTestId('clear-category').click();
    await expect(page.getByTestId('ring-caption')).toHaveText('Расходы');
  });

  test('клик по сектору кольца выбирает категорию', async ({ page }) => {
    const segment = page.getByTestId('ring-segment').first();
    const category = await segment.getAttribute('data-category');
    await segment.dispatchEvent('click');
    await expect(page.locator(`[data-testid="legend-item"][data-category="${category}"]`))
      .toHaveAttribute('aria-pressed', 'true');
  });

  test('бюджеты показывают статус и перерасход', async ({ page }) => {
    const cafe = page.locator('[data-testid="budget"][data-category="cafe"]');
    await expect(cafe).toHaveAttribute('data-status', 'ok');   // 6 500 ₸ из 10 000 ₸ — 65 %

    await page.getByTestId('budgets-toggle').click();
    await page.getByTestId('budget-input-cafe').fill('5000');
    await page.getByTestId('budgets-toggle').click();

    await expect(cafe).toHaveAttribute('data-status', 'over');
    expect(plain(await cafe.getByTestId('budget-note').textContent())).toBe('перерасход 1 500 ₸');
  });

  test('неверный лимит бюджета не сохраняется', async ({ page }) => {
    await page.getByTestId('budgets-toggle').click();
    await page.getByTestId('budget-input-food').fill('сто');
    await page.getByTestId('budgets-toggle').click();
    await expect(page.getByTestId('budget-error')).toHaveText('Лимит — это целое число тенге или пустое поле');
    await expect(page.getByTestId('budget-form')).toBeVisible();
  });

  test('график: клик по месяцу открывает его', async ({ page }) => {
    const months = page.getByTestId('chart-month');
    await expect(months).toHaveCount(6);
    await months.nth(2).click();
    await expect(app.monthLabel).toHaveText('Август 2026');
  });

  test('экспорт и импорт CSV возвращают те же операции', async ({ page }) => {
    const countBefore = await app.items.count();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);
    expect(download.suggestedFilename()).toBe('finflow-2026-11.csv');

    const csv = await readFile(await download.path(), 'utf8');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Дата;Тип;Категория;Сумма;Комментарий');

    // Очищаем данные и загружаем файл обратно
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId('import-csv').setInputFiles(await download.path());

    await expect(app.toast).toContainText(`Загружено операций: ${countBefore}`);
    await expect(app.items).toHaveCount(countBefore);
    expect(plain(await app.totalExpense.textContent())).toBe('134 950 ₸');
  });

  test('импорт пропускает строки с ошибками', async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId('import-csv').setInputFiles({
      name: 'broken.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Дата;Тип;Категория;Сумма;Комментарий\n2026-11-01;Расход;Продукты;-1000.00;ок\n2026-13-01;Расход;Продукты;-1;плохая дата\n'),
    });
    await expect(app.toast).toContainText('Загружено операций: 1, пропущено строк с ошибками: 1');
  });

  // BUG-05: повторный импорт того же файла дублировал операции и удваивал итоги
  test('повторный импорт того же файла не создаёт дублей', async ({ page }) => {
    const countBefore = await app.items.count();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);

    await page.getByTestId('import-csv').setInputFiles(await download.path());

    await expect(app.toast).toContainText('Все операции из файла уже есть');
    await expect(app.items).toHaveCount(countBefore);
    expect(plain(await app.totalExpense.textContent())).toBe('134 950 ₸');
  });
});

test.describe('Настройки', () => {
  test('тема и язык сохраняются после перезагрузки', async ({ page }) => {
    const initial = await page.locator('html').getAttribute('data-theme');
    await page.getByTestId('theme-toggle').click();
    await page.getByTestId('lang-toggle').click();

    await expect(app.monthLabel).toHaveText('November 2026');
    expect(await app.totalExpense.textContent()).toBe('₸134,950');

    await page.reload();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', initial);
    await expect(page.getByTestId('submit')).toHaveText('Add');
  });

  // BUG-06: комментарии примера оставались на русском после переключения на английский
  test('комментарии примера переводятся вместе с интерфейсом', async ({ page }) => {
    const notes = page.getByTestId('tx-note');
    await page.getByTestId('lang-toggle').click();
    await expect(notes.filter({ hasText: 'Lunch with colleagues' })).toHaveCount(1);
    for (const note of await notes.allTextContents()) expect(note).not.toMatch(/[а-яё]/i);

    await page.getByTestId('lang-toggle').click();
    await expect(notes.filter({ hasText: 'Обед с коллегами' })).toHaveCount(1);
  });

  test('изменённый комментарий примера больше не переводится', async ({ page }) => {
    const item = app.items.filter({ hasText: 'Обед с коллегами' });
    await item.hover();
    await item.getByTestId('tx-edit').click();
    await app.note.fill('Обед с мамой');
    await app.submit.click();

    await page.getByTestId('lang-toggle').click();
    await expect(page.getByTestId('tx-note').filter({ hasText: 'Обед с мамой' })).toHaveCount(1);
  });
});
