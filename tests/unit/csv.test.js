import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BOM, fromCSV, parseCSVRows, toCSV } from '../../js/csv.js';
import { translations } from '../../js/i18n.js';

let n = 0;
const createId = () => `id-${++n}`;
const options = { today: '2026-11-11', createId, now: 1000 };

const sample = [
  { id: 'a', date: '2026-11-04', type: 'expense', category: 'cafe', amount: 650050, note: 'Обед; с "коллегами"', createdAt: 2 },
  { id: 'b', date: '2026-11-03', type: 'income', category: 'salary', amount: 42000000, note: 'Основная работа', createdAt: 1 },
];

describe('toCSV', () => {
  const csv = toCSV(sample, 'ru', translations.ru.csvHeader);

  it('начинается с BOM и заголовка через «;»', () => {
    assert.ok(csv.startsWith(`${BOM}Дата;Тип;Категория;Сумма;Комментарий\r\n`));
  });
  it('сортирует по дате, расходы с минусом', () => {
    const lines = csv.slice(1).split('\r\n');
    assert.equal(lines[1], '2026-11-03;Доход;Зарплата;420000.00;Основная работа');
    assert.ok(lines[2].startsWith('2026-11-04;Расход;Кафе и рестораны;-6500.50;'));
  });
  it('экранирует «;» и кавычки', () => {
    assert.ok(csv.includes('"Обед; с ""коллегами"""'));
  });
});

describe('parseCSVRows', () => {
  it('понимает кавычки, переносы строк внутри ячейки и CRLF', () => {
    assert.deepEqual(parseCSVRows('a;"b;c";"d""e"\r\n"многострочный\nтекст";x\n'),
      [['a', 'b;c', 'd"e'], ['многострочный\nтекст', 'x']]);
  });
  it('пропускает пустые строки', () => {
    assert.deepEqual(parseCSVRows('a;b\n\n\nc;d'), [['a', 'b'], ['c', 'd']]);
  });
});

describe('fromCSV', () => {
  it('экспорт → импорт возвращает те же данные (русский файл)', () => {
    const { transactions, skipped } = fromCSV(toCSV(sample, 'ru', translations.ru.csvHeader), options);
    assert.deepEqual(skipped, []);
    const strip = ({ date, type, category, amount, note }) => ({ date, type, category, amount, note });
    assert.deepEqual(transactions.map(strip), [...sample].reverse().map(strip));
  });

  it('понимает файл, выгруженный на английском', () => {
    const { transactions } = fromCSV(toCSV(sample, 'en', translations.en.csvHeader), options);
    assert.deepEqual(transactions.map((t) => t.category), ['salary', 'cafe']);
  });

  it('пропускает строки с ошибками и сообщает их номера', () => {
    const text = [
      'Дата;Тип;Категория;Сумма;Комментарий',
      '2026-11-01;Расход;Продукты;-1000.00;ок',
      '2026-02-30;Расход;Продукты;-1000.00;несуществующая дата',
      '2026-11-01;Перевод;Продукты;-1000.00;неизвестный тип',
      '2026-11-01;Расход;Зарплата;-1000.00;категория не того типа',
      '2026-11-01;Расход;Продукты;сто;не число',
      '2099-01-01;Расход;Продукты;-1000.00;дата в будущем',
    ].join('\n');
    const { transactions, skipped } = fromCSV(text, options);
    assert.equal(transactions.length, 1);
    assert.deepEqual(skipped, [3, 4, 5, 6, 7]);
  });

  it('файл без операций — пустой результат', () => {
    assert.deepEqual(fromCSV('просто текст', options).transactions, []);
  });
});

// BUG-05: повторный импорт того же файла дублировал операции
describe('fromCSV — дубли (BUG-05)', () => {
  const csv = toCSV(sample, 'ru', translations.ru.csvHeader);

  it('повторный импорт того же файла ничего не добавляет', () => {
    const first = fromCSV(csv, options).transactions;
    const second = fromCSV(csv, { ...options, existing: first });
    assert.equal(second.transactions.length, 0);
    assert.equal(second.duplicates, 2);
  });

  it('добавляет только новые операции из файла', () => {
    const existing = fromCSV(csv, options).transactions.slice(0, 1);   // в приложении одна из двух
    const result = fromCSV(csv, { ...options, existing });
    assert.equal(result.transactions.length, 1);
    assert.equal(result.duplicates, 1);
  });

  it('одинаковые строки в одном файле — это разные покупки, а не дубли', () => {
    const text = [
      'Дата;Тип;Категория;Сумма;Комментарий',
      '2026-11-05;Расход;Кафе и рестораны;-1800.00;Кофе',
      '2026-11-05;Расход;Кафе и рестораны;-1800.00;Кофе',
    ].join('\n');
    const result = fromCSV(text, options);
    assert.equal(result.transactions.length, 2);
    assert.equal(result.duplicates, 0);
  });

  it('учитывает количество: две одинаковые в приложении, три в файле — добавляется одна', () => {
    const row = '2026-11-05;Расход;Кафе и рестораны;-1800.00;Кофе';
    const header = 'Дата;Тип;Категория;Сумма;Комментарий';
    const existing = fromCSV([header, row, row].join('\n'), options).transactions;
    const result = fromCSV([header, row, row, row].join('\n'), { ...options, existing });
    assert.equal(result.transactions.length, 1);
    assert.equal(result.duplicates, 2);
  });

  it('операции с разной суммой или комментарием — не дубли', () => {
    const header = 'Дата;Тип;Категория;Сумма;Комментарий';
    const existing = fromCSV(`${header}\n2026-11-05;Расход;Продукты;-1000.00;Magnum`, options).transactions;
    const result = fromCSV(
      `${header}\n2026-11-05;Расход;Продукты;-1000.50;Magnum\n2026-11-05;Расход;Продукты;-1000.00;Рынок`,
      { ...options, existing },
    );
    assert.equal(result.transactions.length, 2);
    assert.equal(result.duplicates, 0);
  });
});
