// Категории и тексты интерфейса на двух языках.

// color — номер цвета из CSS-переменных --cat-1 … --cat-8
export const CATEGORIES = {
  expense: [
    { id: 'food',      color: 2, ru: 'Продукты',          en: 'Groceries' },
    { id: 'cafe',      color: 3, ru: 'Кафе и рестораны',  en: 'Eating out' },
    { id: 'transport', color: 6, ru: 'Транспорт',         en: 'Transport' },
    { id: 'home',      color: 1, ru: 'Жильё и связь',     en: 'Home & bills' },
    { id: 'health',    color: 4, ru: 'Здоровье',          en: 'Health' },
    { id: 'fun',       color: 5, ru: 'Развлечения',       en: 'Entertainment' },
    { id: 'shopping',  color: 7, ru: 'Покупки',           en: 'Shopping' },
    { id: 'other',     color: 8, ru: 'Другое',            en: 'Other' },
  ],
  income: [
    { id: 'salary',       color: 2, ru: 'Зарплата',   en: 'Salary' },
    { id: 'freelance',    color: 1, ru: 'Подработка', en: 'Side job' },
    { id: 'gift',         color: 5, ru: 'Подарок',    en: 'Gift' },
    { id: 'income_other', color: 8, ru: 'Другое',     en: 'Other' },
  ],
};

export const ALL_CATEGORIES = [...CATEGORIES.expense, ...CATEGORIES.income];

export function findCategory(id) {
  return ALL_CATEGORIES.find((c) => c.id === id) || CATEGORIES.expense.at(-1);
}

/** Ищет категорию по названию на любом языке — нужно для импорта CSV */
export function categoryByName(type, name) {
  const needle = String(name).trim().toLowerCase();
  return (CATEGORIES[type] || []).find((c) => c.ru.toLowerCase() === needle || c.en.toLowerCase() === needle) || null;
}

export const TYPE_NAMES = {
  income: { ru: 'Доход', en: 'Income' },
  expense: { ru: 'Расход', en: 'Expense' },
};

export function typeByName(name) {
  const needle = String(name).trim().toLowerCase();
  return Object.keys(TYPE_NAMES).find((type) =>
    Object.values(TYPE_NAMES[type]).some((n) => n.toLowerCase() === needle)) || null;
}

const partialRu = (partial, month) => (partial ? `за те же дни в ${month}` : `в ${month}`);
const partialEn = (partial, month) => (partial ? `the same days of ${month}` : `in ${month}`);

export const translations = {
  ru: {
    locale: 'ru-RU',
    pageTitle: 'FinFlow — учёт личных финансов',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    toggleTheme: 'Сменить тему',
    install: 'Установить',
    spendingTitle: 'Куда ушли деньги',
    ringLabel: 'Расходы по категориям',
    ringEmpty: 'В этом месяце расходов пока нет',
    ringTotal: 'Расходы',
    income: 'Доходы',
    expenses: 'Расходы',
    balance: 'Остаток',
    trend: { less: 'меньше', more: 'больше' },
    trendText: (pct, dir, month, partial) => (dir === 'same'
      ? `столько же, сколько ${partialRu(partial, month)}`
      : `на ${pct}% ${dir === 'less' ? 'меньше' : 'больше'}, чем ${partialRu(partial, month)}`),
    formTitle: 'Новая операция',
    formTitleEdit: 'Изменить операцию',
    typeLabel: 'Тип операции',
    expense: 'Расход',
    incomeOne: 'Доход',
    amount: 'Сумма, ₸',
    category: 'Категория',
    date: 'Дата',
    note: 'Комментарий',
    notePlaceholder: 'Например, обед с коллегами',
    add: 'Добавить',
    save: 'Сохранить',
    cancel: 'Отмена',
    saved: 'Изменения сохранены',
    chartTitle: 'Последние 6 месяцев',
    chartLabel: 'Доходы и расходы по месяцам',
    chartHint: 'Нажмите на месяц, чтобы открыть его',
    budgetsTitle: 'Бюджеты на месяц',
    budgetsEdit: 'Настроить',
    budgetsDone: 'Готово',
    budgetsEmpty: 'Задайте лимиты расходов по категориям — и FinFlow подскажет, когда вы к ним приближаетесь.',
    budgetLimit: 'Лимит, ₸',
    budgetLeft: (sum) => `осталось ${sum}`,
    budgetOver: (sum) => `перерасход ${sum}`,
    budgetError: 'Лимит — это целое число тенге или пустое поле',
    listTitle: 'Операции',
    filterLabel: 'Тип операций',
    all: 'Все',
    expensesShort: 'Расходы',
    incomeShort: 'Доходы',
    search: 'Поиск по комментарию',
    export: 'Скачать CSV',
    import: 'Загрузить CSV',
    showAll: 'Показать все',
    categoryFilter: (name) => `Показаны только расходы «${name}».`,
    loadDemo: 'Заполнить примером',
    deleted: 'Операция удалена',
    undo: 'Вернуть',
    edit: 'Изменить операцию',
    delete: 'Удалить операцию',
    editing: 'Редактируется',
    emptyFirst: 'Здесь появятся ваши доходы и расходы. Добавьте первую операцию — или посмотрите, как всё работает, на примере.',
    emptyMonth: 'В этом месяце операций нет.',
    emptyFiltered: 'Ничего не найдено. Измените фильтр или поиск.',
    errorAmountEmpty: 'Введите сумму',
    errorAmountFormat: 'Сумма — это число, например 4500 или 4500,50',
    errorAmountZero: 'Сумма должна быть больше нуля',
    errorAmountTooBig: 'Сумма не может быть больше 1 000 000 000 ₸',
    errorDateEmpty: 'Укажите дату',
    errorDateFuture: 'Дата не может быть в будущем',
    importDone: (added, skipped) => `Загружено операций: ${added}${skipped ? `, пропущено строк с ошибками: ${skipped}` : ''}`,
    importEmpty: 'В файле не нашлось ни одной операции. Нужен CSV, выгруженный из FinFlow.',
    offlineReady: 'FinFlow работает и без интернета',
    csvHeader: ['Дата', 'Тип', 'Категория', 'Сумма', 'Комментарий'],
    demoNotes: {
      salary: 'Основная работа', food: 'Magnum', cafe: 'Обед с коллегами', transport: 'Яндекс Go',
      home: 'Интернет и мобильная связь', health: 'Аптека', fun: 'Кино', shopping: 'Kaspi: наушники',
      freelance: 'Тестирование сайта', foodMarket: 'Рынок', cafeCoffee: 'Кофе',
    },
  },
  en: {
    locale: 'en-US',
    pageTitle: 'FinFlow — personal finance tracker',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    toggleTheme: 'Toggle theme',
    install: 'Install',
    spendingTitle: 'Where the money went',
    ringLabel: 'Spending by category',
    ringEmpty: 'No spending this month yet',
    ringTotal: 'Spent',
    income: 'Income',
    expenses: 'Spent',
    balance: 'Left',
    trendText: (pct, dir, month, partial) => (dir === 'same'
      ? `same as ${partialEn(partial, month)}`
      : `${pct}% ${dir === 'less' ? 'less' : 'more'} than ${partialEn(partial, month)}`),
    formTitle: 'New transaction',
    formTitleEdit: 'Edit transaction',
    typeLabel: 'Transaction type',
    expense: 'Expense',
    incomeOne: 'Income',
    amount: 'Amount, ₸',
    category: 'Category',
    date: 'Date',
    note: 'Note',
    notePlaceholder: 'e.g. lunch with colleagues',
    add: 'Add',
    save: 'Save',
    cancel: 'Cancel',
    saved: 'Changes saved',
    chartTitle: 'Last 6 months',
    chartLabel: 'Income and spending by month',
    chartHint: 'Click a month to open it',
    budgetsTitle: 'Monthly budgets',
    budgetsEdit: 'Set up',
    budgetsDone: 'Done',
    budgetsEmpty: 'Set spending limits by category — FinFlow will tell you when you get close.',
    budgetLimit: 'Limit, ₸',
    budgetLeft: (sum) => `${sum} left`,
    budgetOver: (sum) => `${sum} over`,
    budgetError: 'A limit is a whole number of tenge or an empty field',
    listTitle: 'Transactions',
    filterLabel: 'Transaction type',
    all: 'All',
    expensesShort: 'Expenses',
    incomeShort: 'Income',
    search: 'Search notes',
    export: 'Download CSV',
    import: 'Upload CSV',
    showAll: 'Show all',
    categoryFilter: (name) => `Showing only “${name}” expenses.`,
    loadDemo: 'Fill with sample data',
    deleted: 'Transaction deleted',
    undo: 'Undo',
    edit: 'Edit transaction',
    delete: 'Delete transaction',
    editing: 'Editing',
    emptyFirst: 'Your income and expenses will appear here. Add your first transaction — or see how it works with sample data.',
    emptyMonth: 'No transactions this month.',
    emptyFiltered: 'Nothing found. Change the filter or search.',
    errorAmountEmpty: 'Enter an amount',
    errorAmountFormat: 'Amount must be a number, e.g. 4500 or 4500.50',
    errorAmountZero: 'Amount must be greater than zero',
    errorAmountTooBig: 'Amount cannot exceed ₸1,000,000,000',
    errorDateEmpty: 'Choose a date',
    errorDateFuture: 'Date cannot be in the future',
    importDone: (added, skipped) => `Transactions loaded: ${added}${skipped ? `, rows skipped due to errors: ${skipped}` : ''}`,
    importEmpty: 'No transactions found in the file. Use a CSV exported from FinFlow.',
    offlineReady: 'FinFlow now works offline',
    csvHeader: ['Date', 'Type', 'Category', 'Amount', 'Note'],
    demoNotes: {
      salary: 'Main job', food: 'Magnum', cafe: 'Lunch with colleagues', transport: 'Yandex Go',
      home: 'Internet and mobile', health: 'Pharmacy', fun: 'Cinema', shopping: 'Kaspi: headphones',
      freelance: 'Website testing', foodMarket: 'Farmers market', cafeCoffee: 'Coffee',
    },
  },
};
