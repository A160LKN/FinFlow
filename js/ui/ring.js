// Кольцевая диаграмма расходов. Каждый сектор — окружность,
// у которой видна только дуга нужной длины (stroke-dasharray) со сдвигом (stroke-dashoffset).

import { el, svgEl } from './dom.js';

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2;
const WIDTH = 22;

/**
 * @param {object} p
 * @param {Array<{category, sum, share}>} p.slices — из expensesByCategory()
 * @param {string|null} p.selected — выбранная категория
 * @param {(id) => string} p.name — название категории
 * @param {(id) => string} p.color — цвет категории
 * @param {(tiyn) => string} p.money — форматирование суммы
 */
export function renderRing(els, { slices, selected, name, color, money, totalLabel }) {
  const total = slices.reduce((s, x) => s + x.sum, 0);
  els.panel.classList.toggle('is-empty', total === 0);
  els.ring.classList.toggle('has-selection', Boolean(selected));

  const circle = (extra) => svgEl('circle', { cx: 100, cy: 100, r: RADIUS, 'stroke-width': WIDTH, ...extra });

  let offset = 0;
  const segments = slices.map((slice) => {
    const length = slice.share * CIRCUMFERENCE;
    const visible = slices.length > 1 ? Math.max(length - GAP, 0.5) : length;
    const node = circle({
      className: `ring__segment${slice.category === selected ? ' is-selected' : ''}`,
      'stroke-dasharray': `${visible} ${CIRCUMFERENCE - visible}`,
      'stroke-dashoffset': -offset,
      style: { stroke: color(slice.category) },
      dataset: { category: slice.category, testid: 'ring-segment' },
    }, svgEl('title', {}, `${name(slice.category)}: ${money(slice.sum)}`));
    offset += length;
    return node;
  });
  els.svg.replaceChildren(circle({ className: 'ring__track' }), ...segments);

  const current = slices.find((s) => s.category === selected);
  els.caption.textContent = current ? name(current.category) : totalLabel;
  els.value.textContent = money(current ? current.sum : total);

  // Легенда дублирует кольцо кнопками — так диаграммой можно пользоваться с клавиатуры
  els.legend.replaceChildren(...slices.map((slice) => el('li', {},
    el('button', {
      type: 'button',
      className: `legend__item${slice.category === selected ? ' is-selected' : ''}`,
      dataset: { category: slice.category, testid: 'legend-item' },
      attrs: { 'aria-pressed': String(slice.category === selected) },
    },
    el('span', { className: 'legend__dot', style: { background: color(slice.category) } }),
    el('span', { text: name(slice.category) }),
    el('span', { className: 'legend__share', text: `${Math.round(slice.share * 100)}%` }),
    el('span', { className: 'legend__sum', text: money(slice.sum) })),
  )));
}
