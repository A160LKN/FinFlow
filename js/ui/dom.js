// Маленькие помощники для работы с DOM.

export const $ = (selector, root = document) => root.querySelector(selector);

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Создаёт элемент: el('span', { className: 'x', text: 'Привет', dataset: { testid: 'y' } }, ...children)
 * Текст всегда вставляется через textContent — защита от XSS.
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  applyProps(node, props);
  node.append(...children.filter(Boolean));
  return node;
}

export function svgEl(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  const { className, dataset, style, ...rest } = attrs;
  if (className) node.setAttribute('class', className);
  Object.entries(rest).forEach(([key, value]) => node.setAttribute(key, value));
  Object.assign(node.dataset, dataset);
  applyStyle(node, style);
  node.append(...children.filter(Boolean));
  return node;
}

// Object.assign(node.style, …) молча игнорирует CSS-переменные (--name),
// их можно задать только через setProperty
function applyStyle(node, style = {}) {
  Object.entries(style).forEach(([key, value]) => {
    if (key.startsWith('--')) node.style.setProperty(key, value);
    else node.style[key] = value;
  });
}

function applyProps(node, { text, className, dataset, style, attrs, ...rest }) {
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  Object.assign(node.dataset, dataset);
  applyStyle(node, style);
  Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, value));
  Object.assign(node, rest);
}

/** SVG-иконка из встроенного набора (без внешних файлов, чтобы работало офлайн) */
const ICONS = {
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  close: 'M6 6l12 12M18 6L6 18',
};

export function icon(name) {
  return svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svgEl('path', { d: ICONS[name] }));
}
