import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { demoNoteId, demoTransactions, localizeDemoNotes } from '../../js/demo.js';
import { fromCSV, toCSV } from '../../js/csv.js';
import { translations } from '../../js/i18n.js';

let n = 0;
const createId = () => `id-${++n}`;
const today = '2026-11-11';
const demo = (lang = 'ru') => demoTransactions({ today, notes: translations[lang].demoNotes, createId, now: 1000 });
const hasCyrillic = (text) => /[а-яё]/i.test(text);

// BUG-06: комментарии примера оставались на русском после переключения на английский
describe('комментарии примера (BUG-06)', () => {
  it('у операций примера сохраняется ключ комментария', () => {
    assert.ok(demo().every((tx) => typeof tx.noteKey === 'string' && tx.noteKey in translations.ru.demoNotes));
  });

  it('при смене языка комментарии примера переводятся', () => {
    const english = localizeDemoNotes(demo('ru'), translations.en.demoNotes);
    assert.ok(english.length > 0);
    assert.ok(english.every((tx) => !hasCyrillic(tx.note)), 'остались русские комментарии');
    assert.ok(english.some((tx) => tx.note === 'Lunch with colleagues'));
  });

  it('туда и обратно — исходные комментарии', () => {
    const original = demo('ru');
    const back = localizeDemoNotes(localizeDemoNotes(original, translations.en.demoNotes), translations.ru.demoNotes);
    assert.deepEqual(back.map((tx) => tx.note), original.map((tx) => tx.note));
  });

  it('комментарии пользователя не переводятся', () => {
    const own = { id: 'x', type: 'expense', category: 'cafe', amount: 100, date: today, note: 'Кофе', createdAt: 1 };
    const [result] = localizeDemoNotes([own], translations.en.demoNotes);
    assert.equal(result.note, 'Кофе');
  });

  it('один и тот же комментарий примера на двух языках узнаётся как один', () => {
    assert.equal(demoNoteId('Обед с коллегами'), demoNoteId('Lunch with colleagues'));
    assert.equal(demoNoteId('Мой комментарий'), 'Мой комментарий');
  });

  it('файл, выгруженный на английском, не дублирует пример на русском', () => {
    const russian = demo('ru');
    const csv = toCSV(localizeDemoNotes(russian, translations.en.demoNotes), 'en', translations.en.csvHeader);
    const result = fromCSV(csv, { today, createId, existing: russian, noteId: demoNoteId });
    assert.equal(result.transactions.length, 0);
    assert.equal(result.duplicates, russian.length);
  });
});
