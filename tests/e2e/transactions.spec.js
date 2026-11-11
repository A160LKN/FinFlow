import { expect, test } from '@playwright/test';
import { FinFlowPage, TODAY } from './finflow-page.js';

const plain = FinFlowPage.plain;
let app;

test.beforeEach(async ({ page }) => {
  app = new FinFlowPage(page);
  await app.open();
});

test.describe('Операции', () => {
  test('при первом запуске показан пустой экран с примером', async ({ page }) => {
    await expect(page.getByTestId('empty-state')).toContainText('Здесь появятся ваши доходы и расходы');
    await expect(page.getByTestId('load-demo')).toBeVisible();
    await expect(page.getByTestId('export-csv')).toBeDisabled();
  });

  test('расход добавляется в список и в итоги месяца', async () => {
    await app.addTransaction({ amount: '12 500,50', category: 'cafe', note: 'Обед с коллегами' });

    await expect(app.items).toHaveCount(1);
    expect(plain(await app.item().getByTestId('tx-amount').textContent())).toBe('−12 500,50 ₸');
    await expect(app.item().getByTestId('tx-category')).toHaveText('Кафе и рестораны');
    // цвет категории передаётся через CSS-переменную — проверяем, что она задана
    await expect(app.item()).toHaveAttribute('style', /--cat-color:\s*var\(--cat-3\)/);
    expect(plain(await app.totalExpense.textContent())).toBe('12 500,50 ₸');
    expect(plain(await app.totalBalance.textContent())).toBe('−12 500,50 ₸');
  });

  test('доход меняет список категорий и увеличивает остаток', async () => {
    await app.chooseType('income');
    await expect(app.category.locator('option')).toHaveText(['Зарплата', 'Подработка', 'Подарок', 'Другое']);

    await app.addTransaction({ type: 'income', amount: '420000', category: 'salary' });
    expect(plain(await app.totalIncome.textContent())).toBe('420 000 ₸');
    expect(plain(await app.item().getByTestId('tx-amount').textContent())).toBe('+420 000 ₸');
  });

  const invalid = [
    { name: 'пустая сумма', amount: '', error: 'Введите сумму' },
    { name: 'не число', amount: 'сто', error: 'Сумма — это число, например 4500 или 4500,50' },
    { name: 'три знака после запятой', amount: '10,555', error: 'Сумма — это число, например 4500 или 4500,50' },
    { name: 'ноль', amount: '0', error: 'Сумма должна быть больше нуля' },
    { name: 'больше миллиарда', amount: '1000000001', error: 'Сумма не может быть больше 1 000 000 000 ₸' },
  ];
  for (const { name, amount, error } of invalid) {
    test(`ошибка ввода: ${name}`, async () => {
      await app.addTransaction({ amount });
      expect(plain(await app.formError.textContent())).toBe(error);
      await expect(app.amount).toHaveClass(/is-invalid/);
      await expect(app.items).toHaveCount(0);
    });
  }

  test('дата в будущем не принимается', async ({ page }) => {
    await page.evaluate(() => document.getElementById('date').removeAttribute('max'));
    await app.addTransaction({ amount: '100', date: '2026-11-12' });
    await expect(app.formError).toHaveText('Дата не может быть в будущем');
  });

  test('ошибка исчезает, когда пользователь исправляет сумму', async () => {
    await app.addTransaction({ amount: '' });
    await app.amount.fill('5');
    await expect(app.formError).toBeEmpty();
  });

  test('текст с HTML показывается как есть (защита от XSS)', async ({ page }) => {
    await app.addTransaction({ amount: '100', note: '<img src=x onerror="window.hacked=1">' });
    await expect(app.item().getByTestId('tx-note')).toHaveText('<img src=x onerror="window.hacked=1">');
    expect(await page.evaluate(() => window.hacked)).toBeUndefined();
  });

  test('операция редактируется, итоги пересчитываются', async () => {
    await app.addTransaction({ amount: '1000', category: 'food', note: 'Магазин' });
    await app.edit(0);

    await expect(app.formTitle).toHaveText('Изменить операцию');
    await expect(app.amount).toHaveValue('1000');
    await expect(app.item()).toHaveClass(/is-editing/);

    await app.amount.fill('2500');
    await app.note.fill('Магазин у дома');
    await app.submit.click();

    await expect(app.formTitle).toHaveText('Новая операция');
    await expect(app.items).toHaveCount(1);
    await expect(app.item().getByTestId('tx-note')).toHaveText('Магазин у дома');
    expect(plain(await app.totalExpense.textContent())).toBe('2 500 ₸');
    await expect(app.toast).toContainText('Изменения сохранены');
  });

  test('Escape отменяет редактирование без изменений', async ({ page }) => {
    await app.addTransaction({ amount: '1000' });
    await app.edit(0);
    await app.amount.fill('9999');
    await page.keyboard.press('Escape');

    await expect(app.formTitle).toHaveText('Новая операция');
    await expect(app.amount).toHaveValue('');
    expect(plain(await app.totalExpense.textContent())).toBe('1 000 ₸');
  });

  test('удалённую операцию можно вернуть', async () => {
    await app.addTransaction({ amount: '700', note: 'Кофе' });
    await app.remove(0);

    await expect(app.items).toHaveCount(0);
    await expect(app.toast).toContainText('Операция удалена');
    await app.page.getByTestId('toast-undo').click();

    await expect(app.items).toHaveCount(1);
    await expect(app.item().getByTestId('tx-note')).toHaveText('Кофе');
  });

  test('операции сохраняются после перезагрузки', async ({ page }) => {
    await app.addTransaction({ amount: '333', note: 'Не потеряться' });
    await page.reload();
    await expect(app.items).toHaveCount(1);
    await expect(app.item().getByTestId('tx-note')).toHaveText('Не потеряться');
  });

  test('операция за прошлый месяц открывает этот месяц', async () => {
    await app.addTransaction({ amount: '500', date: '2026-10-15' });
    await expect(app.monthLabel).toHaveText('Октябрь 2026');
    await expect(app.items).toHaveCount(1);
    await expect(app.page.getByTestId('next-month')).toBeEnabled();
  });

  test('нельзя перейти в будущий месяц', async ({ page }) => {
    await expect(app.monthLabel).toHaveText('Ноябрь 2026');
    await expect(page.getByTestId('next-month')).toBeDisabled();
  });

  test('сегодняшняя дата подставляется в форму', async () => {
    await expect(app.date).toHaveValue(TODAY);
  });
});
