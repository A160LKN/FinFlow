// Расчёты по операциям. Чистые функции: на входе массив, на выходе числа —
// поэтому их легко проверять юнит-тестами без браузера.

import { monthOf, monthRange, shiftMonth } from './dates.js';

/** @typedef {{ id: string, type: 'income'|'expense', amount: number, category: string, date: string, note: string, createdAt: number }} Transaction */

export const inMonth = (transactions, month) => transactions.filter((tx) => monthOf(tx.date) === month);

export function sumBy(transactions, type) {
  return transactions.filter((tx) => tx.type === type).reduce((sum, tx) => sum + tx.amount, 0);
}

export function totals(transactions) {
  const income = sumBy(transactions, 'income');
  const expense = sumBy(transactions, 'expense');
  return { income, expense, balance: income - expense };
}

/** Расходы по категориям, от больших к меньшим: [{ category, sum, share }] */
export function expensesByCategory(transactions) {
  const map = new Map();
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([category, sum]) => ({ category, sum, share: total ? sum / total : 0 }))
    .sort((a, b) => b.sum - a.sum);
}

/**
 * Сравнение расходов месяца с прошлым месяцем.
 * Если месяц ещё идёт (today попадает в него), сравниваем с теми же днями
 * прошлого месяца: 1–11 ноября против 1–11 октября, а не против всего октября.
 * @returns {{ pct: number, direction: 'less'|'more'|'same', partial: boolean, prevMonth: string } | null}
 */
export function expenseTrend(transactions, month, todayISO) {
  const prevMonth = shiftMonth(month, -1);
  const partial = monthOf(todayISO) === month;
  const day = todayISO.slice(8);

  const current = sumBy(inMonth(transactions, month), 'expense');
  const previous = sumBy(
    inMonth(transactions, prevMonth).filter((tx) => !partial || tx.date.slice(8) <= day),
    'expense',
  );
  if (current === 0 || previous === 0) return null;

  const pct = Math.round((Math.abs(current - previous) / previous) * 100);
  const direction = pct === 0 ? 'same' : current < previous ? 'less' : 'more';
  return { pct, direction, partial, prevMonth };
}

/** Доходы и расходы по месяцам для графика: [{ month, income, expense }] */
export function monthlySeries(transactions, lastMonth, count = 6) {
  return monthRange(lastMonth, count).map((month) => {
    const list = inMonth(transactions, month);
    return { month, income: sumBy(list, 'income'), expense: sumBy(list, 'expense') };
  });
}

/**
 * Состояние бюджетов: [{ category, limit, spent, ratio, status }]
 * status: 'ok' — до 80 %, 'warning' — от 80 % до 100 %, 'over' — больше лимита.
 */
export function budgetStatus(transactions, budgets) {
  const spentBy = new Map(expensesByCategory(transactions).map((x) => [x.category, x.sum]));
  return Object.entries(budgets)
    .filter(([, limit]) => limit > 0)
    .map(([category, limit]) => {
      const spent = spentBy.get(category) || 0;
      const ratio = spent / limit;
      const status = ratio > 1 ? 'over' : ratio >= 0.8 ? 'warning' : 'ok';
      return { category, limit, spent, ratio, status };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
