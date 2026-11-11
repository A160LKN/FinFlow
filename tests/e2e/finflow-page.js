// Page Object для FinFlow: локаторы и действия в одном месте, тесты описывают только сценарии.
import { expect } from '@playwright/test';

export const TODAY = '2026-11-11';

export class FinFlowPage {
  constructor(page) {
    this.page = page;
    this.amount = page.getByTestId('amount');
    this.category = page.getByTestId('category');
    this.date = page.getByTestId('date');
    this.note = page.getByTestId('note');
    this.submit = page.getByTestId('submit');
    this.formError = page.getByTestId('form-error');
    this.formTitle = page.getByTestId('form-title');
    this.items = page.getByTestId('tx-item');
    this.monthLabel = page.getByTestId('month-label');
    this.totalIncome = page.getByTestId('total-income');
    this.totalExpense = page.getByTestId('total-expense');
    this.totalBalance = page.getByTestId('total-balance');
    this.toast = page.getByTestId('toast');
  }

  /** Открывает приложение с зафиксированной датой — тесты не зависят от реального «сегодня» */
  async open() {
    await this.page.clock.setFixedTime(new Date(`${TODAY}T12:00:00+05:00`));
    await this.page.goto('/');
    await expect(this.amount).toBeVisible();
  }

  async loadDemo() {
    await this.page.getByTestId('load-demo').click();
    await expect(this.items.first()).toBeVisible();
  }

  async chooseType(type) {
    // Сам radio скрыт, пользователь нажимает на подпись
    await this.page.getByTestId(`type-${type}`).click();
  }

  async addTransaction({ type = 'expense', amount, category, date, note } = {}) {
    await this.chooseType(type);
    await this.amount.fill(String(amount ?? ''));
    if (category) await this.category.selectOption(category);
    if (date) await this.date.fill(date);
    if (note !== undefined) await this.note.fill(note);
    await this.submit.click();
  }

  item(index = 0) {
    return this.items.nth(index);
  }

  async edit(index = 0) {
    await this.item(index).hover();
    await this.item(index).getByTestId('tx-edit').click();
  }

  async remove(index = 0) {
    await this.item(index).hover();
    await this.item(index).getByTestId('tx-delete').click();
  }

  /** Текст без неразрывных пробелов — Intl ставит их в суммах */
  static plain(text) {
    return text.replace(/[\u00a0\u202f]/g, ' ');
  }
}
