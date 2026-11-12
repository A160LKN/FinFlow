// Точка входа: состояние приложения, отрисовка и обработчики событий.
// Вся «математика» — в чистых модулях (money, dates, stats, csv), здесь только работа со страницей.

import { amountToInput, formatMoney, parseAmount } from './money.js';
import { dayTitle, monthName, monthOf, shiftMonth, toISODate } from './dates.js';
import { budgetStatus, expensesByCategory, expenseTrend, inMonth, monthlySeries, totals } from './stats.js';
import { fromCSV, toCSV } from './csv.js';
import { CATEGORIES, findCategory, translations } from './i18n.js';
import { storage, STORAGE_KEYS } from './storage.js';
import { DEMO_BUDGETS, demoTransactions } from './demo.js';
import { $, el, icon } from './ui/dom.js';
import { renderRing } from './ui/ring.js';
import { renderChart } from './ui/chart.js';

/* ---------- Состояние ---------- */

const todayISO = () => toISODate(new Date());
const currentMonth = () => monthOf(todayISO());
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

const state = {
  transactions: storage.get(STORAGE_KEYS.transactions, []),
  budgets: storage.get(STORAGE_KEYS.budgets, {}),
  month: currentMonth(),
  typeFilter: 'all',
  categoryFilter: null,
  search: '',
  theme: storage.get(STORAGE_KEYS.theme, prefersDark ? 'dark' : 'light'),
  lang: storage.get(STORAGE_KEYS.lang, 'ru'),
  editingId: null,
  editingBudgets: false,
  errorKey: null,
  highlightId: null,
  lastDeleted: null,
};

const t = () => translations[state.lang];
const money = (tiyn, opts) => formatMoney(tiyn, t().locale, opts);
const categoryName = (id) => findCategory(id)[state.lang];
const categoryColor = (id) => `var(--cat-${findCategory(id).color})`;
const createId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

const save = () => storage.set(STORAGE_KEYS.transactions, state.transactions);
const saveBudgets = () => storage.set(STORAGE_KEYS.budgets, state.budgets);

/* ---------- Элементы ---------- */

const els = {
  monthLabel: $('#month-label'), prevMonth: $('#prev-month'), nextMonth: $('#next-month'),
  langToggle: $('#lang-toggle'), themeToggle: $('#theme-toggle'), install: $('#install'),
  ring: { panel: $('.ring-panel'), ring: $('.ring'), svg: $('#ring-svg'), caption: $('#ring-caption'), value: $('#ring-value'), legend: $('#legend') },
  totalIncome: $('#total-income'), totalExpense: $('#total-expense'), totalBalance: $('#total-balance'), trend: $('#expense-trend'),
  formPanel: $('#form-panel'), formTitle: $('#form-title'), form: $('#tx-form'),
  amount: $('#amount'), category: $('#category'), date: $('#date'), note: $('#note'),
  formError: $('#form-error'), submit: $('#submit'), cancelEdit: $('#cancel-edit'),
  budgets: $('#budgets'), budgetForm: $('#budget-form'), budgetsToggle: $('#budgets-toggle'), budgetError: $('#budget-error'),
  chart: $('#chart'),
  typeFilter: $('#type-filter'), search: $('#search'), exportBtn: $('#export'), importInput: $('#import'),
  activeCategory: $('#active-category'), activeCategoryText: $('#active-category-text'), clearCategory: $('#clear-category'),
  list: $('#tx-list'), empty: $('#empty'), emptyText: $('#empty-text'), loadDemo: $('#load-demo'),
  toast: $('#toast'), toastText: $('#toast-text'), toastUndo: $('#toast-undo'),
};

/* ---------- Отрисовка ---------- */

function renderHeader() {
  els.monthLabel.textContent = monthName(state.month, t().locale);
  els.nextMonth.disabled = state.month >= currentMonth();
}

function renderTotals(list) {
  const { income, expense, balance } = totals(list);
  els.totalIncome.textContent = money(income);
  els.totalExpense.textContent = money(expense);
  els.totalBalance.textContent = money(balance);
  els.totalBalance.classList.toggle('total__value--expense', balance < 0);

  const trend = expenseTrend(state.transactions, state.month, todayISO());
  els.trend.textContent = trend
    ? t().trendText(trend.pct, trend.direction, monthName(trend.prevMonth, t().locale, 'in'), trend.partial)
    : '';
}

function renderBudgets(list) {
  if (state.editingBudgets) return;   // пока открыта форма — не перерисовываем
  const rows = budgetStatus(list, state.budgets);
  if (rows.length === 0) {
    els.budgets.replaceChildren(el('p', { className: 'budgets-empty', text: t().budgetsEmpty }));
    return;
  }
  els.budgets.replaceChildren(...rows.map((b) => {
    const left = b.limit - b.spent;
    return el('div', { className: `budget budget--${b.status}`, dataset: { testid: 'budget', category: b.category, status: b.status } },
      el('div', { className: 'budget__row' },
        el('span', { className: 'budget__name', text: categoryName(b.category) }),
        el('span', { className: 'budget__numbers', text: `${money(b.spent)} / ${money(b.limit)}` })),
      el('div', { className: 'budget__bar', attrs: { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(Math.min(b.ratio, 1) * 100) } },
        el('div', { className: 'budget__fill', style: { width: `${Math.min(b.ratio, 1) * 100}%` } })),
      el('div', { className: 'budget__note', dataset: { testid: 'budget-note' }, text: left >= 0 ? t().budgetLeft(money(left)) : t().budgetOver(money(-left)) }));
  }));
}

function openBudgetForm() {
  state.editingBudgets = true;
  els.budgetsToggle.textContent = t().budgetsDone;
  els.budgets.hidden = true;
  els.budgetForm.hidden = false;
  els.budgetForm.replaceChildren(...CATEGORIES.expense.map((c) => el('label', { className: 'budget-form__row' },
    el('span', { text: c[state.lang] }),
    el('input', {
      className: 'field__input', type: 'text', inputMode: 'numeric', name: c.id,
      placeholder: '—', value: state.budgets[c.id] ? String(state.budgets[c.id] / 100) : '',
      dataset: { testid: `budget-input-${c.id}` }, attrs: { 'aria-label': `${c[state.lang]}, ${t().budgetLimit}` },
    }))));
  els.budgetForm.querySelector('input').focus();
}

function closeBudgetForm() {
  const next = {};
  for (const input of els.budgetForm.querySelectorAll('input')) {
    const text = input.value.replace(/[\s\u00a0]/g, '');
    if (text === '') continue;
    if (!/^\d{1,10}$/.test(text)) {
      els.budgetError.textContent = t().budgetError;
      input.classList.add('is-invalid');
      input.focus();
      return;
    }
    if (Number(text) > 0) next[input.name] = Number(text) * 100;
  }
  state.budgets = next;
  saveBudgets();
  state.editingBudgets = false;
  els.budgetError.textContent = '';
  els.budgetsToggle.textContent = t().budgetsEdit;
  els.budgetForm.hidden = true;
  els.budgets.hidden = false;
  render();
}

function visibleTransactions(list) {
  const query = state.search.trim().toLowerCase();
  return list
    .filter((tx) => state.typeFilter === 'all' || tx.type === state.typeFilter)
    .filter((tx) => !state.categoryFilter || tx.category === state.categoryFilter)
    .filter((tx) => tx.note.toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function transactionRow(tx) {
  const signed = tx.type === 'income' ? tx.amount : -tx.amount;
  const classes = ['tx'];
  if (tx.id === state.highlightId) classes.push('is-new');
  if (tx.id === state.editingId) classes.push('is-editing');

  return el('div', { className: classes.join(' '), dataset: { id: tx.id, testid: 'tx-item' }, style: { '--cat-color': categoryColor(tx.category) } },
    el('span', { className: 'tx__icon', text: categoryName(tx.category).charAt(0), attrs: { 'aria-hidden': 'true' } }),
    el('div', { className: 'tx__main' },
      el('div', { className: 'tx__category', text: categoryName(tx.category), dataset: { testid: 'tx-category' } }),
      tx.note && el('div', { className: 'tx__note', text: tx.note, dataset: { testid: 'tx-note' } })),
    el('span', { className: `tx__amount tx__amount--${tx.type}`, text: money(signed, { sign: true }), dataset: { testid: 'tx-amount' } }),
    el('button', { type: 'button', className: 'tx__action', dataset: { action: 'edit', testid: 'tx-edit' }, attrs: { 'aria-label': t().edit } }, icon('edit')),
    el('button', { type: 'button', className: 'tx__action tx__action--delete', dataset: { action: 'delete', testid: 'tx-delete' }, attrs: { 'aria-label': t().delete } }, icon('close')));
}

function renderList(monthList) {
  const visible = visibleTransactions(monthList);
  const days = Map.groupBy ? Map.groupBy(visible, (tx) => tx.date) : visible.reduce((m, tx) => m.set(tx.date, [...(m.get(tx.date) || []), tx]), new Map());

  els.list.replaceChildren(...[...days].map(([date, items]) => {
    const net = items.reduce((s, tx) => s + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
    return el('section', { className: 'day', dataset: { testid: 'day-group' } },
      el('div', { className: 'day__head' },
        el('span', { className: 'day__title', text: dayTitle(date, t().locale) }),
        el('span', { className: 'day__sum', text: money(net, { sign: true }) })),
      ...items.map(transactionRow));
  }));
  state.highlightId = null;

  const isEmpty = visible.length === 0;
  els.empty.classList.toggle('is-visible', isEmpty);
  els.loadDemo.hidden = state.transactions.length > 0;
  els.emptyText.textContent = state.transactions.length === 0 ? t().emptyFirst
    : monthList.length === 0 ? t().emptyMonth : t().emptyFiltered;

  els.activeCategory.hidden = !state.categoryFilter;
  if (state.categoryFilter) els.activeCategoryText.textContent = t().categoryFilter(categoryName(state.categoryFilter));
  els.exportBtn.disabled = monthList.length === 0;
}

function render() {
  const monthList = inMonth(state.transactions, state.month);
  const slices = expensesByCategory(monthList);
  if (state.categoryFilter && !slices.some((s) => s.category === state.categoryFilter)) state.categoryFilter = null;

  renderHeader();
  renderTotals(monthList);
  renderRing(els.ring, { slices, selected: state.categoryFilter, name: categoryName, color: categoryColor, money, totalLabel: t().ringTotal });
  renderBudgets(monthList);
  renderChart(els.chart, {
    series: monthlySeries(state.transactions, maxMonth(state.month), 6),
    current: state.month,
    label: (m) => monthName(m, t().locale, 'short'),
    money,
    axis: (tenge) => new Intl.NumberFormat(t().locale, { notation: 'compact', maximumFractionDigits: 1 }).format(tenge),
  });
  renderList(monthList);
}

// График всегда заканчивается текущим месяцем, если выбранный входит в последние полгода
function maxMonth(month) {
  const now = currentMonth();
  return month >= shiftMonth(now, -5) ? now : month;
}

/* ---------- Форма: добавление и редактирование ---------- */

const selectedType = () => els.form.elements.type.value;

function fillCategories() {
  const current = els.category.value;
  els.category.replaceChildren(...CATEGORIES[selectedType()].map((c) => el('option', { value: c.id, text: c[state.lang] })));
  if ([...els.category.options].some((o) => o.value === current)) els.category.value = current;
}

function setFormMode() {
  const editing = Boolean(state.editingId);
  els.formPanel.classList.toggle('is-editing', editing);
  els.formTitle.textContent = editing ? t().formTitleEdit : t().formTitle;
  els.submit.textContent = editing ? t().save : t().add;
  els.cancelEdit.hidden = !editing;
}

function showError(errorKey, field) {
  state.errorKey = errorKey;
  els.formError.textContent = t()[errorKey];
  field.classList.add('is-invalid');
  field.focus();
}

function clearError() {
  state.errorKey = null;
  els.formError.textContent = '';
  els.amount.classList.remove('is-invalid');
  els.date.classList.remove('is-invalid');
}

function resetForm() {
  els.amount.value = '';
  els.note.value = '';
  els.date.value = todayISO();
  clearError();
}

function startEdit(id) {
  const tx = state.transactions.find((x) => x.id === id);
  if (!tx) return;
  state.editingId = id;
  els.form.elements.type.value = tx.type;
  fillCategories();
  els.category.value = tx.category;
  els.amount.value = amountToInput(tx.amount, state.lang === 'ru' ? ',' : '.');
  els.date.value = tx.date;
  els.note.value = tx.note;
  clearError();
  setFormMode();
  render();
  els.formPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  els.amount.focus();
}

function cancelEdit() {
  state.editingId = null;
  resetForm();
  setFormMode();
  render();
}

function submitForm(event) {
  event.preventDefault();
  clearError();

  const amount = parseAmount(els.amount.value);
  if (amount.errorKey) return showError(amount.errorKey, els.amount);
  if (!els.date.value) return showError('errorDateEmpty', els.date);
  if (els.date.value > todayISO()) return showError('errorDateFuture', els.date);

  const data = {
    type: selectedType(),
    amount: amount.tiyn,
    category: els.category.value,
    date: els.date.value,
    note: els.note.value.trim(),
  };

  if (state.editingId) {
    const tx = state.transactions.find((x) => x.id === state.editingId);
    Object.assign(tx, data);
    state.highlightId = tx.id;
    state.editingId = null;
    showToast(t().saved);
  } else {
    const tx = { id: createId(), ...data, createdAt: Date.now() };
    state.transactions.push(tx);
    state.highlightId = tx.id;
  }
  save();

  // Показываем месяц операции и снимаем фильтры, которые её спрятали бы
  state.month = monthOf(data.date);
  if (state.typeFilter !== 'all' && state.typeFilter !== data.type) setTypeFilter('all', false);
  if (state.categoryFilter && state.categoryFilter !== data.category) state.categoryFilter = null;

  resetForm();
  setFormMode();
  render();
  els.amount.focus();
}

/* ---------- Действия ---------- */

function setTypeFilter(type, rerender = true) {
  state.typeFilter = type;
  els.typeFilter.querySelectorAll('[data-type]').forEach((chip) => chip.classList.toggle('is-active', chip.dataset.type === type));
  if (rerender) render();
}

function toggleCategory(id) {
  state.categoryFilter = state.categoryFilter === id ? null : id;
  render();
}

function goToMonth(month) {
  if (month > currentMonth()) return;
  state.month = month;
  state.categoryFilter = null;
  render();
}

function deleteTransaction(id, row) {
  if (state.editingId === id) cancelEdit();
  row.classList.add('is-leaving');
  setTimeout(() => {
    const index = state.transactions.findIndex((tx) => tx.id === id);
    if (index === -1) return;
    [state.lastDeleted] = state.transactions.splice(index, 1);
    save();
    render();
    showToast(t().deleted, { undo: true });
  }, 200);
}

function undoDelete() {
  if (!state.lastDeleted) return;
  state.transactions.push(state.lastDeleted);
  state.highlightId = state.lastDeleted.id;
  state.lastDeleted = null;
  save();
  render();
  hideToast();
}

let toastTimer = null;
function showToast(text, { undo = false } = {}) {
  els.toastText.textContent = text;
  els.toastUndo.hidden = !undo;
  els.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undo ? 5000 : 3000);
}
function hideToast() {
  els.toast.classList.remove('is-visible');
  clearTimeout(toastTimer);
}

function exportCSV() {
  const csv = toCSV(inMonth(state.transactions, state.month), state.lang, t().csvHeader);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = el('a', { href: url, download: `finflow-${state.month}.csv` });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importCSV(file) {
  const { transactions, skipped, duplicates } = fromCSV(await file.text(), {
    today: todayISO(),
    createId,
    existing: state.transactions,   // BUG-05: не добавлять операции, которые уже есть
  });
  els.importInput.value = '';
  if (transactions.length === 0) {
    return showToast(duplicates ? t().importAllDuplicates(duplicates) : t().importEmpty);
  }

  state.transactions.push(...transactions);
  save();
  state.month = monthOf(transactions.at(-1).date);
  render();
  showToast(t().importDone(transactions.length, skipped.length, duplicates));
}

function loadDemo() {
  state.transactions = demoTransactions({ today: todayISO(), notes: t().demoNotes, createId });
  state.budgets = { ...DEMO_BUDGETS };
  state.month = currentMonth();
  save();
  saveBudgets();
  render();
}

/* ---------- Тема и язык ---------- */

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  storage.set(STORAGE_KEYS.theme, state.theme);
}

function applyLanguage() {
  const tr = t();
  document.documentElement.lang = state.lang;
  document.title = tr.pageTitle;
  document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = tr[node.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => { node.placeholder = tr[node.dataset.i18nPlaceholder]; });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => node.setAttribute('aria-label', tr[node.dataset.i18nAria]));
  els.langToggle.textContent = state.lang === 'ru' ? 'EN' : 'RU';
  if (state.errorKey) els.formError.textContent = tr[state.errorKey];
  if (state.editingBudgets) els.budgetsToggle.textContent = tr.budgetsDone;
  storage.set(STORAGE_KEYS.lang, state.lang);
  fillCategories();
  setFormMode();
  render();
}

/* ---------- События ---------- */

els.form.addEventListener('submit', submitForm);
els.form.addEventListener('change', (e) => { if (e.target.name === 'type') fillCategories(); });
[els.amount, els.date].forEach((f) => f.addEventListener('input', () => { if (state.errorKey) clearError(); }));
els.cancelEdit.addEventListener('click', cancelEdit);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.editingId) cancelEdit(); });

els.prevMonth.addEventListener('click', () => goToMonth(shiftMonth(state.month, -1)));
els.nextMonth.addEventListener('click', () => goToMonth(shiftMonth(state.month, 1)));

// Делегирование событий: один обработчик на контейнер вместо обработчика на каждый элемент
els.ring.svg.addEventListener('click', (e) => {
  const seg = e.target.closest('.ring__segment');
  if (seg) toggleCategory(seg.dataset.category);
});
els.ring.legend.addEventListener('click', (e) => {
  const item = e.target.closest('.legend__item');
  if (item) toggleCategory(item.dataset.category);
});
els.chart.addEventListener('click', (e) => {
  const group = e.target.closest('.month-group');
  if (group) goToMonth(group.dataset.month);
});
els.chart.addEventListener('keydown', (e) => {
  const group = e.target.closest('.month-group');
  if (group && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goToMonth(group.dataset.month); }
});
els.list.addEventListener('click', (e) => {
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const row = button.closest('.tx');
  if (button.dataset.action === 'edit') startEdit(row.dataset.id);
  else deleteTransaction(row.dataset.id, row);
});

els.typeFilter.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-type]');
  if (chip) setTypeFilter(chip.dataset.type);
});
els.search.addEventListener('input', () => { state.search = els.search.value; render(); });
els.clearCategory.addEventListener('click', () => toggleCategory(state.categoryFilter));
els.exportBtn.addEventListener('click', exportCSV);
els.importInput.addEventListener('change', () => { if (els.importInput.files[0]) importCSV(els.importInput.files[0]); });
els.loadDemo.addEventListener('click', loadDemo);
els.toastUndo.addEventListener('click', undoDelete);
els.budgetsToggle.addEventListener('click', () => (state.editingBudgets ? closeBudgetForm() : openBudgetForm()));
els.budgetForm.addEventListener('submit', (e) => { e.preventDefault(); closeBudgetForm(); });
els.budgetForm.addEventListener('input', (e) => { e.target.classList.remove('is-invalid'); els.budgetError.textContent = ''; });

els.themeToggle.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); });
els.langToggle.addEventListener('click', () => { state.lang = state.lang === 'ru' ? 'en' : 'ru'; applyLanguage(); });

// График рисуется под ширину контейнера — перерисовываем при изменении размера окна
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);
});

// Синхронизация между вкладками: изменения в одной вкладке сразу видны в другой
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEYS.transactions || e.key === STORAGE_KEYS.budgets) {
    state.transactions = storage.get(STORAGE_KEYS.transactions, []);
    state.budgets = storage.get(STORAGE_KEYS.budgets, {});
    render();
  }
});

/* ---------- PWA: установка и офлайн ---------- */

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  els.install.hidden = false;
});
els.install.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  els.install.hidden = true;
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* офлайн-режим просто не включится */ });
  });
}

/* ---------- Запуск ---------- */

els.date.value = todayISO();
els.date.max = todayISO();
applyTheme();
applyLanguage();
