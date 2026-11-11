// Даты храним строкой ГГГГ-ММ-ДД в местном времени.
// Так операция не «переезжает» на соседний день из-за часовых поясов,
// а строки можно сравнивать обычным < и >.

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Проверяет, что строка — существующая дата в формате ГГГГ-ММ-ДД (без 2026-02-30) */
export function isValidISODate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return toISODate(parseISODate(iso)) === iso;
}

export const monthOf = (iso) => iso.slice(0, 7);

/** Сдвиг месяца: shiftMonth('2026-01', -1) → '2025-12' */
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  return toISODate(new Date(y, m - 1 + delta, 1)).slice(0, 7);
}

/** Список из count месяцев, заканчивающийся lastMonth: ['2026-06', …, '2026-11'] */
export function monthRange(lastMonth, count) {
  return Array.from({ length: count }, (_, i) => shiftMonth(lastMonth, i - count + 1));
}

const RU_MONTHS_IN = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

/**
 * Название месяца:
 *   form 'title' — «Ноябрь 2026» / «November 2026»
 *   form 'in'    — «октябре» (для «чем в октябре») / «October»
 *   form 'short' — «нояб.» / «Nov»
 */
export function monthName(month, locale, form = 'title') {
  const date = parseISODate(`${month}-01`);
  const lang = locale.slice(0, 2);

  if (form === 'in') {
    // Intl не умеет предложный падеж, поэтому для русского — свой список
    return lang === 'ru' ? RU_MONTHS_IN[date.getMonth()]
      : new Intl.DateTimeFormat(locale, { month: 'long' }).format(date);
  }
  if (form === 'short') {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace('.', '');
  }
  const parts = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).formatToParts(date);
  const name = parts.find((p) => p.type === 'month').value;
  const year = parts.find((p) => p.type === 'year').value;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function dayTitle(iso, locale) {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    .format(parseISODate(iso));
}
