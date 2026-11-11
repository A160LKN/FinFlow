import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { budgetStatus, expensesByCategory, expenseTrend, monthlySeries, totals } from '../../js/stats.js';
import { niceStep } from '../../js/ui/chart.js';

let seq = 0;
const tx = (date, type, category, tenge) => ({ id: String(++seq), date, type, category, amount: tenge * 100, note: '', createdAt: seq });

const data = [
  tx('2026-10-03', 'income', 'salary', 400000),
  tx('2026-10-05', 'expense', 'food', 20000),
  tx('2026-10-20', 'expense', 'food', 30000),
  tx('2026-11-03', 'income', 'salary', 400000),
  tx('2026-11-04', 'expense', 'food', 15000),
  tx('2026-11-08', 'expense', 'cafe', 5000),
];
const november = data.filter((x) => x.date.startsWith('2026-11'));

describe('totals', () => {
  it('считает доходы, расходы и остаток', () => {
    assert.deepEqual(totals(november), { income: 40000000, expense: 2000000, balance: 38000000 });
  });
  it('пустой список — нули', () => {
    assert.deepEqual(totals([]), { income: 0, expense: 0, balance: 0 });
  });
});

describe('expensesByCategory', () => {
  it('группирует, сортирует от большего и считает долю', () => {
    assert.deepEqual(expensesByCategory(november), [
      { category: 'food', sum: 1500000, share: 0.75 },
      { category: 'cafe', sum: 500000, share: 0.25 },
    ]);
  });
  it('доходы не попадают в диаграмму расходов', () => {
    assert.ok(expensesByCategory(november).every((s) => s.category !== 'salary'));
  });
});

describe('expenseTrend', () => {
  it('месяц идёт — сравнивает с теми же днями прошлого месяца', () => {
    // 1–11 ноября: 20 000; 1–11 октября: 20 000 (покупка 20 октября не учитывается)
    assert.deepEqual(expenseTrend(data, '2026-11', '2026-11-11'),
      { pct: 0, direction: 'same', partial: true, prevMonth: '2026-10' });
  });
  it('прошедший месяц — сравнивает целиком', () => {
    // ноябрь целиком 20 000 против октября целиком 50 000 → на 60 % меньше
    assert.deepEqual(expenseTrend(data, '2026-11', '2026-12-15'),
      { pct: 60, direction: 'less', partial: false, prevMonth: '2026-10' });
  });
  it('нет данных за прошлый месяц — null', () => {
    assert.equal(expenseTrend(data, '2026-10', '2026-11-11'), null);
  });
});

describe('monthlySeries', () => {
  it('возвращает все месяцы, даже пустые', () => {
    const series = monthlySeries(data, '2026-11', 3);
    assert.deepEqual(series.map((s) => s.month), ['2026-09', '2026-10', '2026-11']);
    assert.deepEqual(series[0], { month: '2026-09', income: 0, expense: 0 });
    assert.equal(series[1].expense, 5000000);
  });
});

describe('budgetStatus', () => {
  it('статусы ok, warning и over, сортировка по заполнению', () => {
    const result = budgetStatus(november, { food: 1000000, cafe: 600000, fun: 1000000 });
    assert.deepEqual(result.map((b) => [b.category, b.status]), [['food', 'over'], ['cafe', 'warning'], ['fun', 'ok']]);
  });
  it('ровно 80 % — уже предупреждение', () => {
    assert.equal(budgetStatus(november, { cafe: 625000 })[0].status, 'warning');
  });
  it('нулевые и пустые лимиты не показываются', () => {
    assert.deepEqual(budgetStatus(november, { food: 0 }), []);
  });
});

describe('niceStep — шаг сетки графика', () => {
  it('округляет до 1, 2 или 5 × 10ⁿ', () => {
    assert.equal(niceStep(420000), 200000);
    assert.equal(niceStep(95000), 50000);
    assert.equal(niceStep(7), 2);
  });
  it('без данных — 1', () => assert.equal(niceStep(0), 1));
});
