// Экспорт и импорт CSV. Формат рассчитан на Excel:
// разделитель «;», BOM в начале файла (иначе кириллица превращается в «кракозябры»),
// значения с «;», кавычками или переносом строки берутся в кавычки.

import { isValidISODate } from './dates.js';
import { parseAmount } from './money.js';
import { categoryByName, findCategory, TYPE_NAMES, typeByName } from './i18n.js';

export const BOM = '﻿';
const SEPARATOR = ';';

function escapeCell(value) {
  const text = String(value ?? '');
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Операции → текст CSV (с BOM) */
export function toCSV(transactions, lang, header) {
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((tx) => [
      tx.date,
      TYPE_NAMES[tx.type][lang],
      findCategory(tx.category)[lang],
      ((tx.type === 'income' ? 1 : -1) * tx.amount / 100).toFixed(2),
      tx.note,
    ]);
  return BOM + [header, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR)).join('\r\n');
}

/** Разбирает текст CSV на строки и ячейки с учётом кавычек */
export function parseCSVRows(text) {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === SEPARATOR) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Ключ для поиска дублей: операции с одинаковыми датой, типом, категорией, суммой и комментарием */
// noteId приводит комментарий к общему виду — например, комментарий примера на любом языке
export const transactionKey = (tx, noteId = (note) => note) =>
  [tx.date, tx.type, tx.category, tx.amount, noteId(tx.note)].join('|');

/**
 * Текст CSV → операции. Строки с ошибками пропускаются, их номера возвращаются в skipped.
 * Понимает файлы, выгруженные из FinFlow на любом из двух языков.
 *
 * Дубли (BUG-05): операции, которые уже есть в existing, не добавляются повторно.
 * Считается количество: если в приложении 2 одинаковые операции, а в файле 3 — добавится одна.
 * Поэтому повторный импорт того же файла ничего не добавляет, а законные повторы
 * (два кофе по одной цене в один день) при первом импорте сохраняются.
 *
 * @returns {{ transactions: Array<object>, skipped: number[], duplicates: number }}
 */
export function fromCSV(text, { today, createId, existing = [], noteId, now = Date.now() }) {
  const rows = parseCSVRows(text);
  const transactions = [];
  const skipped = [];
  let duplicates = 0;

  // Сколько раз каждая операция уже встречается в приложении
  const alreadyHave = new Map();
  for (const tx of existing) {
    const key = transactionKey(tx, noteId);
    alreadyHave.set(key, (alreadyHave.get(key) || 0) + 1);
  }

  rows.forEach((cells, index) => {
    const line = index + 1;
    if (index === 0 && !isValidISODate(cells[0]?.trim() ?? '')) return;   // заголовок

    const [date = '', typeName = '', categoryName = '', amountText = '', note = ''] = cells.map((c) => c.trim());
    const type = typeByName(typeName);
    const category = type && categoryByName(type, categoryName);
    const parsed = parseAmount(amountText.replace(/^-/, ''));

    const valid = isValidISODate(date) && date <= today && type && category && !parsed.errorKey;
    if (!valid) { skipped.push(line); return; }

    const tx = { type, category: category.id, amount: parsed.tiyn, date, note: note.slice(0, 80) };
    const key = transactionKey(tx, noteId);
    if (alreadyHave.get(key) > 0) {
      alreadyHave.set(key, alreadyHave.get(key) - 1);
      duplicates++;
      return;
    }

    transactions.push({ id: createId(), ...tx, createdAt: now + index });
  });

  return { transactions, skipped, duplicates };
}
