// Деньги. Суммы хранятся в тиынах — целым числом: 12 500,50 ₸ → 1 250 050.
// Так не накапливаются ошибки дробей: в JavaScript 0.1 + 0.2 !== 0.3.

export const MAX_AMOUNT_TIYN = 1_000_000_000 * 100;

/**
 * Разбирает сумму, введённую пользователем: «12 500», «4500,50», «4500.5».
 * @returns {{ tiyn: number } | { errorKey: string }}
 */
export function parseAmount(raw) {
  const text = String(raw ?? '').replace(/[\s\u00a0]/g, '').replace(',', '.');
  if (text === '') return { errorKey: 'errorAmountEmpty' };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { errorKey: 'errorAmountFormat' };

  const tiyn = Math.round(Number(text) * 100);
  if (tiyn === 0) return { errorKey: 'errorAmountZero' };
  if (tiyn > MAX_AMOUNT_TIYN) return { errorKey: 'errorAmountTooBig' };
  return { tiyn };
}

/**
 * Форматирует сумму в тенге. Целые суммы — без дробной части,
 * с тиынами — всегда две цифры: «12 500 ₸», «12 500,50 ₸».
 * sign: true — добавить «+» или «−» (типографский минус).
 */
export function formatMoney(tiyn, locale, { sign = false } = {}) {
  const digits = tiyn % 100 === 0 ? 0 : 2;
  const text = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'KZT',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(tiyn) / 100);

  if (tiyn < 0 && !sign) return `−${text}`;
  if (!sign || tiyn === 0) return text;
  return (tiyn > 0 ? '+' : '−') + text;
}

/** Сумма для поля ввода при редактировании: 1250050 → «12500,50» */
export function amountToInput(tiyn, decimalSeparator = ',') {
  const whole = Math.floor(tiyn / 100);
  const rest = tiyn % 100;
  return rest === 0 ? String(whole) : `${whole}${decimalSeparator}${String(rest).padStart(2, '0')}`;
}
