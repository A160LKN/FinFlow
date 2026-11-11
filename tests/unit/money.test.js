import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { amountToInput, formatMoney, parseAmount } from '../../js/money.js';

// Intl ставит неразрывные пробелы; для сравнения приводим их к обычным
const plain = (text) => text.replace(/[\u00a0\u202f]/g, ' ');

describe('parseAmount — разбор введённой суммы', () => {
  const valid = [
    ['4500', 450000],
    ['12 500', 1250000],
    ['4500,50', 450050],
    ['4500.5', 450050],
    ['0,01', 1],
    ['1000000000', 100000000000],
  ];
  for (const [input, tiyn] of valid) {
    it(`«${input}» → ${tiyn} тиынов`, () => {
      assert.deepEqual(parseAmount(input), { tiyn });
    });
  }

  const invalid = [
    ['', 'errorAmountEmpty'],
    ['   ', 'errorAmountEmpty'],
    ['abc', 'errorAmountFormat'],
    ['-100', 'errorAmountFormat'],
    ['10,555', 'errorAmountFormat'],
    ['1e5', 'errorAmountFormat'],
    ['0', 'errorAmountZero'],
    ['0,00', 'errorAmountZero'],
    ['1000000000,01', 'errorAmountTooBig'],
  ];
  for (const [input, errorKey] of invalid) {
    it(`«${input}» → ошибка ${errorKey}`, () => {
      assert.deepEqual(parseAmount(input), { errorKey });
    });
  }

  it('не теряет тиыны на дробях (0.1 + 0.2)', () => {
    assert.equal(parseAmount('0,1').tiyn + parseAmount('0,2').tiyn, parseAmount('0,3').tiyn);
  });
});

describe('formatMoney — отображение суммы', () => {
  it('целая сумма по-русски без дробной части', () => {
    assert.equal(plain(formatMoney(1250000, 'ru-RU')), '12 500 ₸');
  });

  it('сумма с тиынами — всегда две цифры', () => {
    assert.equal(plain(formatMoney(1250050, 'ru-RU')), '12 500,50 ₸');
    assert.equal(plain(formatMoney(1250005, 'ru-RU')), '12 500,05 ₸');
  });

  it('английский формат', () => {
    assert.equal(formatMoney(1250000, 'en-US'), '₸12,500');
  });

  it('знак для доходов и расходов — типографский минус', () => {
    assert.equal(plain(formatMoney(50000, 'ru-RU', { sign: true })), '+500 ₸');
    assert.equal(plain(formatMoney(-50000, 'ru-RU', { sign: true })), '−500 ₸');
  });

  it('отрицательный остаток показывается с минусом и без sign', () => {
    assert.equal(plain(formatMoney(-50000, 'ru-RU')), '−500 ₸');
  });

  it('ноль — без знака', () => {
    assert.equal(plain(formatMoney(0, 'ru-RU', { sign: true })), '0 ₸');
  });
});

describe('amountToInput — сумма для поля редактирования', () => {
  it('целая сумма', () => assert.equal(amountToInput(450000), '4500'));
  it('с тиынами', () => assert.equal(amountToInput(450005), '4500,05'));
  it('с точкой для английского', () => assert.equal(amountToInput(450050, '.'), '4500.50'));
  it('после разбора возвращается та же сумма', () => {
    assert.equal(parseAmount(amountToInput(1234567)).tiyn, 1234567);
  });
});
