import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidISODate, monthName, monthRange, shiftMonth, toISODate } from '../../js/dates.js';

describe('toISODate', () => {
  it('добавляет ведущие нули', () => {
    assert.equal(toISODate(new Date(2026, 0, 5)), '2026-01-05');
  });
});

describe('isValidISODate', () => {
  it('принимает существующую дату', () => assert.ok(isValidISODate('2024-02-29')));
  it('отклоняет 29 февраля в невисокосном году', () => assert.ok(!isValidISODate('2026-02-29')));
  it('отклоняет 31 апреля', () => assert.ok(!isValidISODate('2026-04-31')));
  it('отклоняет другой формат', () => {
    assert.ok(!isValidISODate('11.11.2026'));
    assert.ok(!isValidISODate('2026-1-5'));
    assert.ok(!isValidISODate(''));
  });
});

describe('shiftMonth', () => {
  it('назад через границу года', () => assert.equal(shiftMonth('2026-01', -1), '2025-12'));
  it('вперёд через границу года', () => assert.equal(shiftMonth('2025-12', 1), '2026-01'));
  it('на несколько месяцев', () => assert.equal(shiftMonth('2026-11', -5), '2026-06'));
});

describe('monthRange', () => {
  it('шесть месяцев, заканчивая указанным', () => {
    assert.deepEqual(monthRange('2026-02', 6), ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('monthName', () => {
  it('заголовок с заглавной буквы', () => assert.equal(monthName('2026-11', 'ru-RU'), 'Ноябрь 2026'));
  it('предложный падеж для «чем в октябре»', () => assert.equal(monthName('2026-10', 'ru-RU', 'in'), 'октябре'));
  it('английский', () => assert.equal(monthName('2026-11', 'en-US'), 'November 2026'));
});
