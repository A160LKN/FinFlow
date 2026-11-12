// Пример данных: прошлый месяц целиком и текущий — только дни, которые уже наступили.

import { monthOf, shiftMonth } from './dates.js';
import { translations } from './i18n.js';

const PLAN = [
  // [день, тип, категория, сумма в тенге, ключ комментария]
  [3, 'income', 'salary', 420000, 'salary'],
  [4, 'expense', 'home', 95000, 'home'],
  [5, 'expense', 'food', 18400, 'food'],
  [6, 'expense', 'transport', 2300, 'transport'],
  [8, 'expense', 'cafe', 6500, 'cafe'],
  [10, 'expense', 'food', 12750, 'foodMarket'],
  [12, 'expense', 'health', 8900, 'health'],
  [14, 'income', 'freelance', 60000, 'freelance'],
  [15, 'expense', 'fun', 5000, 'fun'],
  [17, 'expense', 'cafe', 1800, 'cafeCoffee'],
  [19, 'expense', 'shopping', 54990, 'shopping'],
  [21, 'expense', 'transport', 3100, 'transport'],
  [23, 'expense', 'food', 21300, 'food'],
];

export const DEMO_BUDGETS = {
  food: 60000 * 100,
  cafe: 10000 * 100,
  transport: 8000 * 100,
  fun: 15000 * 100,
};

export function demoTransactions({ today, notes, createId, now = Date.now() }) {
  const thisMonth = monthOf(today);
  const todayDay = Number(today.slice(8));
  const result = [];
  let k = 0;

  const make = (month, day, type, category, tenge, noteKey) => ({
    id: createId(),
    type,
    category,
    amount: tenge * 100,
    date: `${month}-${String(day).padStart(2, '0')}`,
    note: notes[noteKey],
    noteKey,   // BUG-06: по ключу комментарий переводится при смене языка
    createdAt: now + k++,
  });

  // пять полных прошлых месяцев — для графика; расходы немного «гуляют»
  for (let back = 5; back >= 1; back--) {
    const month = shiftMonth(thisMonth, -back);
    const factor = [1.08, 0.94, 1.12, 0.98, 1.15][5 - back];
    for (const [day, type, category, tenge, noteKey] of PLAN) {
      const amount = type === 'expense' ? Math.round(tenge * factor) : tenge;
      result.push(make(month, day, type, category, amount, noteKey));
    }
  }

  // текущий месяц — только наступившие дни
  for (const [day, type, category, tenge, noteKey] of PLAN) {
    if (day <= todayDay) result.push(make(thisMonth, day, type, category, tenge, noteKey));
  }
  if (todayDay < 3) {
    result.push(make(thisMonth, todayDay, 'income', 'salary', 420000, 'salary'));
    result.push(make(thisMonth, todayDay, 'expense', 'food', 9800, 'food'));
  }
  return result;
}

/**
 * Переводит комментарии операций примера на язык notes (BUG-06).
 * Комментарии пользователя не трогаются: у них нет noteKey,
 * а при редактировании операции примера ключ снимается.
 */
export function localizeDemoNotes(transactions, notes) {
  return transactions.map((tx) => (tx.noteKey && notes[tx.noteKey] ? { ...tx, note: notes[tx.noteKey] } : tx));
}

// Комментарий примера на любом языке → один идентификатор: «Кофе» и «Coffee» — одно и то же
const DEMO_NOTE_IDS = new Map(Object.values(translations)
  .flatMap(({ demoNotes }) => Object.entries(demoNotes).map(([key, text]) => [text, `demo:${key}`])));

/** Для поиска дублей при импорте: файл примера, выгруженный на другом языке, — не новые операции */
export const demoNoteId = (note) => DEMO_NOTE_IDS.get(note) ?? note;
