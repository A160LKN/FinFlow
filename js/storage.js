// Обёртка над localStorage. В приватном режиме или при отключённых cookies
// хранилище может бросать исключения — приложение должно продолжать работать.

export const STORAGE_KEYS = {
  transactions: 'finflow.transactions',
  budgets: 'finflow.budgets',
  theme: 'finflow.theme',
  lang: 'finflow.lang',
};

export const storage = {
  get(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // хранилище недоступно — работаем без сохранения
    }
  },
};
