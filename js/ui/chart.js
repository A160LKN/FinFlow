// Столбчатый график доходов и расходов за несколько месяцев. Рисуется на SVG вручную.

import { svgEl } from './dom.js';

const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 52 };

/** «Красивый» шаг сетки: 1, 2 или 5 × 10ⁿ */
export function niceStep(max, lines = 4) {
  if (max <= 0) return 1;
  const raw = max / lines;
  const power = 10 ** Math.floor(Math.log10(raw));
  const factor = [1, 2, 5, 10].find((f) => f * power >= raw);
  return factor * power;
}

/**
 * @param {SVGElement} svg
 * @param {object} p
 * @param {Array<{month, income, expense}>} p.series
 * @param {string} p.current — выбранный месяц, подсвечивается
 * @param {(month) => string} p.label — короткое название месяца
 * @param {(tiyn) => string} p.money
 * @param {(tenge) => string} p.axis — подпись оси: «400 тыс.»
 */
export function renderChart(svg, { series, current, label, money, axis }) {
  // Рисуем под реальную ширину: иначе на телефоне весь график, включая текст, сжимается
  const W = Math.max(Math.round(svg.getBoundingClientRect().width) || 600, 300);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const max = Math.max(...series.flatMap((s) => [s.income, s.expense]), 0);
  const step = niceStep(max);
  const top = Math.max(step * Math.ceil(max / step), step);
  const y = (value) => PAD.top + plotH - (value / top) * plotH;

  const grid = [];
  for (let v = 0; v <= top + 1; v += step) {
    grid.push(
      svgEl('line', { className: 'grid-line', x1: PAD.left, x2: W - PAD.right, y1: y(v), y2: y(v) }),
      svgEl('text', { x: PAD.left - 8, y: y(v) + 4, 'text-anchor': 'end' }, axis(v / 100)),
    );
  }

  const slot = plotW / series.length;
  const barW = Math.min(22, slot / 3.2);

  const groups = series.map((s, i) => {
    const cx = PAD.left + slot * i + slot / 2;
    const bar = (value, kind, dx) => svgEl('rect', {
      className: `bar bar--${kind}`,
      x: cx + dx,
      y: y(value),
      width: barW,
      height: Math.max(PAD.top + plotH - y(value), value > 0 ? 1 : 0),
      rx: 3,
    });
    return svgEl('g', {
      className: `month-group${s.month === current ? ' is-current' : ''}`,
      tabindex: 0,
      role: 'button',
      'aria-label': `${label(s.month)}: +${money(s.income)}, −${money(s.expense)}`,
      dataset: { month: s.month, testid: 'chart-month' },
    },
    svgEl('rect', { className: 'month-hit', x: cx - slot / 2 + 2, y: PAD.top, width: slot - 4, height: plotH + PAD.bottom, rx: 8 }),
    bar(s.income, 'income', -barW - 2),
    bar(s.expense, 'expense', 2),
    svgEl('text', { x: cx, y: H - 8, 'text-anchor': 'middle' }, label(s.month)),
    svgEl('title', {}, `${label(s.month)}\n+${money(s.income)}\n−${money(s.expense)}`));
  });

  svg.replaceChildren(...grid, ...groups);
}
