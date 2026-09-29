/* Crisger · Manual de marca interactivo
   Aplicación estática: lee data.json, renderiza la landing y ofrece un editor local (localStorage). */
'use strict';

const STORAGE_KEY = 'crisger-manual-v7';
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clone = x => JSON.parse(JSON.stringify(x));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Utilidad para crear nodos ---------- */
function h(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'style' && typeof value === 'object') { for (const [k, v] of Object.entries(value)) k.startsWith('--') ? node.style.setProperty(k, v) : (node.style[k] = v); }
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key in node && !key.includes('-') && key !== 'list') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
const icon = path => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path);
  svg.append(p);
  return svg;
};
const ICONS = {
  prev: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7', copy: 'M9 9h10v10H9zM5 15V5h10',
  expand: 'M4 10V4h6M20 14v6h-6M4 4l6 6M20 20l-6-6', down: 'M12 5v14M5 12l7 7 7-7',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14', upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8', check: 'M5 12.5l4.5 4.5L19 7.5'
};

/* ---------- Estado ---------- */
let original = null;
let data = null;
const ui = {
  logoVariant: 'principal', logoBg: 'claro', logoScale: 70,
  clearVariant: 'principal', toneIndex: 0, toneAmount: 35,
  contrastMode: 'dark', filter: 'Todas', patternIndex: 0, revealAll: false
};
const editorState = { tab: 'general', si: 0, mi: 0 };
let galleryEntries = [];
let lightboxList = [];
let lightboxIndex = 0;
let lightboxOpener = null;
let revealObserver = null;
let liveObserver = null;

const LOGO_VARIANTS = [['principal', 'Principal'], ['vertical', 'Vertical'], ['compacto', 'Compacta'], ['logotipo', 'Logotipo'], ['isotipo', 'Isotipo']];
const LOGO_BGS = [['claro', 'Claro'], ['oscuro', 'Oscuro'], ['naranja', 'Naranja']];
const DEFAULT_LOGO = 'media/logo-crisger.svg';
const KINDS = [
  ['standard', 'Texto e imagen'], ['essence', 'Historia y conceptos'], ['feature', 'Maqueta destacada'],
  ['showcase', 'Aplicación de galería'], ['logo', 'Sistema de logos'], ['clearspace', 'Espacio de protección'],
  ['incorrect', 'Usos incorrectos'], ['patterns', 'Carrusel de patrones'], ['palette', 'Paleta'],
  ['tints', 'Tonos y matices'], ['contrast', 'Contraste y jerarquía'], ['type-logo', 'Tipografía del logo'],
  ['type-display', 'Muestra Bai Jamjuree'], ['type-body', 'Muestra Inter'], ['type-scale', 'Jerarquía tipográfica'],
  ['dos', 'Así sí / Así no'], ['icons', 'Set de íconos']
];
const GENERATED = new Set(['logo', 'clearspace', 'incorrect', 'patterns', 'palette', 'tints', 'contrast', 'type-logo', 'type-display', 'type-scale', 'icons']);
const WIDE = new Set(['incorrect', 'patterns', 'palette', 'tints', 'contrast', 'type-display', 'type-scale', 'icons']);
const ITEMS_INTERNAL = new Set(['incorrect', 'patterns', 'contrast', 'type-scale', 'essence', 'dos', 'icons']);
const THEMES = [['light', 'Blanco cálido'], ['white', 'Blanco'], ['dark', 'Negro']];

const safeId = id => String(id || '').trim().replace(/[^a-z0-9-]/gi, '-').toLowerCase() || 'seccion';
const logoAsset = (variant, bg) => data.logos?.[variant]?.[bg] || data.logos?.principal?.[bg] || DEFAULT_LOGO;
const pad2 = n => String(n).padStart(2, '0');

/* ---------- Titulares animados palabra por palabra ---------- */
function splitWords(node, text, { emLast = false, offset = 0 } = {}) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  node.setAttribute('aria-label', words.join(' '));
  words.forEach((word, i) => {
    const inner = emLast && i === words.length - 1 ? h('span', {}, h('em', { text: word })) : h('span', { text: word });
    node.append(h('span', { class: 'w', 'aria-hidden': 'true', style: { '--i': i + offset } }, inner));
    if (i < words.length - 1) node.append(' ');
  });
  return node;
}

/* ---------- Nombre de marca: siempre «Crisger» en negrita, nunca en mayúsculas sostenidas ---------- */
const BRAND_RE = /crisger/gi;
function brandify(root) {
  if (!root) return;
  const word = data?.brand && !/^[A-ZÁÉÍÓÚÑ]+$/.test(data.brand) ? data.brand : 'Crisger';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (/crisger/i.test(n.nodeValue) && !n.parentElement.closest('script, style, textarea, code, .brand-word')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    // En titulares y textos ya destacados solo se corrige la escritura.
    if (parent.closest('h1, h2, h3, strong, b, .w, .tag, button, a, label, option')) { node.nodeValue = node.nodeValue.replace(BRAND_RE, word); continue; }
    const frag = document.createDocumentFragment();
    node.nodeValue.split(/(crisger)/i).forEach(part => {
      if (!part) return;
      frag.append(/^crisger$/i.test(part) ? h('strong', { class: 'brand-word', text: word }) : document.createTextNode(part));
    });
    node.replaceWith(frag);
  }
}

/* ---------- Color ---------- */
const isHex = v => /^#[0-9a-f]{6}$/i.test(String(v || ''));
function hexToRgb(hex) { const v = hex.replace('#', ''); return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16)); }
function luminance(hex) {
  return hexToRgb(hex).map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrastRatio(a, b) { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
const inkFor = hex => (isHex(hex) && contrastRatio(hex, '#000000') >= contrastRatio(hex, '#FFFFFF') ? '#000000' : '#FFFFFF');
function mixHex(hex, target, amount) {
  if (!isHex(hex)) return hex;
  const a = hexToRgb(hex), t = hexToRgb(target);
  return '#' + a.map((v, i) => Math.round(v * (1 - amount) + t[i] * amount).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function brandColor(matchHex, fallbackIndex) {
  const found = data.palette.find(c => String(c.hex).toUpperCase() === matchHex);
  return found?.hex || data.palette[fallbackIndex]?.hex || matchHex;
}

/* ---------- Mensajes y portapapeles ---------- */
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
}
async function copyText(value, label = value, origin = null) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else {
      const area = h('textarea', { value, style: { position: 'fixed', opacity: '0' } });
      document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
    }
    toast(`${label} copiado`);
    if (origin) { origin.querySelector('.copied-flag')?.remove(); const flag = h('span', { class: 'copied-flag', 'aria-hidden': 'true', text: '✓ Copiado' }); origin.append(flag); setTimeout(() => flag.remove(), 1400); }
  } catch { toast(`Copiá manualmente: ${value}`); }
}

/* ---------- Persistencia ---------- */
function fingerprint(obj) {
  const str = JSON.stringify(obj);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36) + str.length.toString(36);
}
function save() {
  try {
    // Se guarda junto con la huella de la versión publicada sobre la que se editó.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ base: fingerprint(original), savedAt: Date.now(), data }));
    hideLocalNotice();
  } catch {
    toast('Sin espacio en el navegador. Usá imágenes más livianas y exportá el JSON.');
  }
  updateEditBadge();
}
function hasLocalChanges() {
  try { return !!localStorage.getItem(STORAGE_KEY) && JSON.stringify(data) !== JSON.stringify(original); } catch { return false; }
}
function updateEditBadge() { const b = $('#editBadge'); if (b) b.hidden = !hasLocalChanges(); }

/* Aviso cuando se muestran cambios guardados en este navegador en lugar de la versión publicada. */
function hideLocalNotice() { $('#localNotice')?.remove(); }
function usePublished() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin acceso */ }
  data = clone(original);
  hideLocalNotice(); render(); updateEditBadge();
  toast('Mostrando la versión publicada');
}
function showLocalNotice(outdated) {
  hideLocalNotice();
  try { if (!outdated && sessionStorage.getItem('crisger-notice-hidden')) return; } catch { /* sin acceso */ }
  const box = h('div', { class: `local-notice${outdated ? ' is-outdated' : ''}`, id: 'localNotice', role: 'status' }, [
    h('p', {}, [
      h('strong', { text: outdated ? 'Hay una versión publicada más nueva.' : 'Estás viendo cambios guardados en este navegador.' }),
      h('span', { text: outdated
        ? ' Este navegador todavía muestra cambios hechos con el editor sobre una versión anterior.'
        : ' Otras personas ven la versión publicada.' })
    ]),
    h('div', { class: 'local-notice-actions' }, [
      h('button', { type: 'button', class: 'btn btn-small btn-primary', text: 'Ver versión publicada', onclick: usePublished }),
      h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: outdated ? 'Mantener mis cambios' : 'Ocultar', onclick: () => {
        if (outdated) save();
        else { try { sessionStorage.setItem('crisger-notice-hidden', '1'); } catch { /* sin acceso */ } }
        hideLocalNotice();
      } })
    ])
  ]);
  document.body.append(box);
}

function validate(x) {
  return x && typeof x === 'object' && typeof x.heroTitle === 'string' && Array.isArray(x.palette) &&
    x.logos && typeof x.logos === 'object' && Array.isArray(x.sections) &&
    x.sections.every(s => s && typeof s.title === 'string' && Array.isArray(s.modules) &&
      s.modules.every(m => m && typeof m.title === 'string'));
}
function normalize(x) {
  const d = clone(x);
  for (const key of ['brand', 'descriptor', 'version', 'heroTitle', 'heroText', 'heroLabel', 'heroCta', 'location', 'footerText']) d[key] = d[key] ?? '';
  d.brand ||= 'Crisger';
  d.heroLabel ||= 'Manual de marca';
  d.heroCta ||= 'Explorar el manual';
  d.kit = { kicker: 'Descargas', title: 'Kit de marca', lead: '', zip: '', note: '', letterheadDocx: '', letterheadPdf: '', manualPdf: '', ...(d.kit || {}) };
  d.drive = { folder: '', apiKey: '', ...(d.drive || {}) };
  d.logos ||= {};
  for (const [v] of LOGO_VARIANTS) { d.logos[v] ||= {}; for (const [b] of LOGO_BGS) d.logos[v][b] ||= ''; }
  d.palette = d.palette.filter(c => c && typeof c === 'object').map(c => ({ name: c.name || 'Color', hex: isHex(c.hex) ? c.hex.toUpperCase() : '#888888', rgb: c.rgb || '', cmyk: c.cmyk || '' }));
  d.sections.forEach((s, i) => {
    s.id = safeId(s.id || `seccion-${i + 1}`);
    s.kicker ??= ''; s.lead ??= ''; s.note ??= ''; s.navLabel ||= s.title;
    s.checklist = Array.isArray(s.checklist) ? s.checklist.map(String).filter(Boolean) : [];
    s.theme = THEMES.some(([t]) => t === s.theme) ? s.theme : ['light', 'white', 'dark'][i % 3];
    s.modules.forEach((m, j) => {
      m.id ||= `${s.id}-${j + 1}`; m.body ??= ''; m.media ??= ''; m.note ??= '';
      m.items = Array.isArray(m.items) ? m.items.map(String) : [];
      m.kind = KINDS.some(([k]) => k === m.kind) ? m.kind : 'standard';
    });
  });
  // Evita ids repetidos, necesarios para anclas únicas.
  const seen = new Set();
  d.sections.forEach(s => { let id = s.id, n = 2; while (seen.has(id)) id = `${s.id}-${n++}`; s.id = id; seen.add(id); });
  return d;
}

/* ---------- Render principal ---------- */
function render() {
  const scrollY = window.scrollY;
  const orange = isHex(data.palette[0]?.hex) ? data.palette[0].hex : '#FE5000';
  document.documentElement.style.setProperty('--orange', orange);
  document.title = `${data.brand} · ${data.heroLabel}`;
  for (const id of ['#navLogo', '#footerLogo', '#lightboxLogo']) { $(id).src = logoAsset('principal', 'oscuro'); $(id).alt = data.brand; }
  $('#navLabel').textContent = data.heroLabel;
  $('#navVersion').textContent = data.version;
  const footerText = $('#footerText'); footerText.replaceChildren(); splitWords(footerText, data.footerText);
  $('#footerVersion').textContent = `${data.heroLabel} · ${data.version}`;
  $('#footerLocation').textContent = [data.descriptor, data.location].filter(Boolean).join(' · ');

  const list = $('#navList');
  list.replaceChildren(...navTargets().map(([id, label]) => h('li', {}, h('a', { href: `#${id}`, text: label }))), h('li', { class: 'nav-indicator', 'aria-hidden': 'true' }));
  activeId = null;

  const main = $('#main');
  main.replaceChildren(renderHero(), ...data.sections.map((s, i) => renderSection(s, i)), renderKit());
  brandify(main); brandify($('#footer'));
  prepareReveals(main);
  measureHeader();
  updateActiveNav();
  if (ui.revealAll) window.scrollTo(0, scrollY);
  updateEditBadge();
}
let renderTimer = null;
function scheduleRender(delay = 220) { clearTimeout(renderTimer); renderTimer = setTimeout(render, delay); }

function renderHero() {
  const words = String(data.heroTitle || '').trim().split(/\s+/);
  const last = words.pop() || '';
  const firstSection = data.sections[0]?.id || 'main';
  return h('section', { class: 'hero', id: 'inicio', 'aria-labelledby': 'heroTitle' }, [
    h('div', { class: 'hero-inner' }, [
      h('p', { class: 'hero-label' }, [h('span', { text: data.heroLabel }), h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { text: `Versión ${data.version}` })]),
      splitWords(h('h1', { id: 'heroTitle' }), [...words, last].join(' '), { emLast: true }),
      h('p', { class: 'hero-text', text: data.heroText })
    ]),
    h('div', { class: 'hero-bottom' }, [
      h('span', { class: 'hero-location' }, [h('b', { text: data.descriptor }), h('span', { text: data.location })]),
      h('div', { class: 'hero-actions' }, [
        h('a', { class: 'hero-cta', href: `#${firstSection}` }, [h('span', { text: data.heroCta }), h('b', { class: 'cta-icon' }, icon(ICONS.down))]),
        h('a', { class: 'hero-cta is-secondary', href: '#generador' }, [h('span', { text: 'Crear una pieza' }), h('b', { class: 'cta-icon' }, icon('M12 5v14M5 12h14'))])
      ])
    ])
  ]);
}

function renderSection(s, index) {
  const headId = `${s.id}-title`;
  const sec = h('section', { class: `chapter theme-${s.theme}`, id: s.id, 'aria-labelledby': headId, tabindex: '-1' });
  const head = h('header', { class: 'chapter-head reveal' }, [
    h('div', {}, [h('span', { class: 'kicker', text: s.kicker }), splitWords(h('h2', { id: headId }), s.title)]),
    h('div', { class: 'chapter-lead' }, [h('p', { text: s.lead }), s.note ? h('p', { class: 'chapter-note', text: s.note }) : null])
  ]);
  sec.append(head);
  const showcases = s.modules.filter(m => m.kind === 'showcase');
  const others = s.modules.filter(m => m.kind !== 'showcase');
  const body = h('div', { class: 'chapter-body' });
  others.forEach((m, i) => body.append(renderModule(s, m, i)));
  if (showcases.length) body.append(renderGallery(showcases));
  if (s.checklist.length) body.append(renderChecklist(s));
  sec.append(body);
  return sec;
}

function moduleNumber(s, i) {
  const base = String(s.kicker || '').split('·')[0].trim();
  return `${/^\d+$/.test(base) ? base : pad2(data.sections.indexOf(s) + 1)}.${pad2(i + 1)}`;
}

function renderModule(s, m, i) {
  if (m.kind === 'feature') return renderFeature(m);
  const wide = WIDE.has(m.kind) || (['standard', 'dos'].includes(m.kind) && !m.media);
  const anchor = blockAnchor(m);
  const article = h('article', { class: `module kind-${m.kind} ${wide ? 'is-wide' : 'is-split'} reveal`, id: anchor });
  const copy = h('div', { class: 'module-copy' }, [
    h('span', { class: 'module-number', text: moduleNumber(s, i) }),
    h('h3', {}, [m.title, anchorButton(anchor, m.title)]),
    m.body ? h('p', { class: 'module-body', text: m.body }) : null
  ]);
  if (m.items.length && !ITEMS_INTERNAL.has(m.kind)) copy.append(h('ul', { class: 'module-list stagger' }, m.items.map(x => h('li', { text: x }))));
  if (m.note) copy.append(h('p', { class: 'module-note', text: m.note }));
  const visual = h('div', { class: 'module-visual' });
  const renderers = {
    logo: renderLogoDemo, clearspace: renderClearspace, incorrect: renderIncorrect, patterns: renderPatterns,
    palette: renderPalette, tints: renderToneLab, contrast: renderContrast, 'type-logo': renderTypeLogo,
    'type-display': renderTypeDisplay, 'type-body': renderTypeBody, 'type-scale': renderTypeScale, essence: renderImage,
    icons: renderIcons
  };
  (renderers[m.kind] || renderImage)(visual, m);
  if (!visual.childNodes.length) visual.classList.add('is-empty');
  if (i % 2 === 1 && !wide) article.classList.add('reverse');
  article.append(copy, visual);
  if (m.kind === 'essence' && m.items.length) {
    article.append(h('ol', { class: 'concepts stagger' }, m.items.map((item, n) =>
      h('li', { class: 'concept' }, [h('span', { text: pad2(n + 1) }), h('strong', { text: item })]))));
  }
  if (m.kind === 'dos' && m.items.length) article.append(renderDos(m));
  return article;
}

/* ---------- Enlaces directos a cada bloque ---------- */
const blockAnchor = m => `bloque-${safeId(m.id).replace(/^bloque-/, '')}`;
const pageURL = hash => `${location.origin}${location.pathname}#${hash}`;
function anchorButton(id, title) {
  return h('button', { type: 'button', class: 'anchor-btn', 'aria-label': `Copiar enlace a «${title}»`, title: 'Copiar enlace a este bloque',
    onclick: e => { history.replaceState(null, '', `#${id}`); copyText(pageURL(id), 'Enlace', null); e.currentTarget.classList.add('is-done'); } }, icon(ICONS.link));
}

/* ---------- Así sí / Así no ---------- */
function renderDos(m) {
  const yes = [], no = [];
  for (const line of m.items) {
    const match = line.match(/^\s*(sí|si|no)\s*[:·—-]\s*(.+)$/i);
    if (!match) yes.push(line.trim()); else (match[1].toLowerCase() === 'no' ? no : yes).push(match[2].trim());
  }
  const col = (kind, title, list) => list.length ? h('div', { class: `dos-col dos-${kind}` }, [
    h('p', { class: 'dos-title' }, [h('span', { class: `mark ${kind === 'yes' ? 'ok' : 'no'}`, 'aria-hidden': 'true', text: kind === 'yes' ? '✓' : '×' }), h('strong', { text: title })]),
    h('ul', { class: 'stagger' }, list.map(x => h('li', { text: x })))
  ]) : null;
  return h('div', { class: 'dos-grid' }, [col('yes', 'Así sí', yes), col('no', 'Así no', no)]);
}

/* ---------- Iconografía ---------- */
const ICON_SET = {
  'Casco': 'M2.5 17.5h19M4.5 17.5V16a7.5 7.5 0 0 1 15 0v1.5M10 8.8V13M14 8.8V13',
  'Guantes': 'M8 21v-3.5l-3.3-4.1a1.6 1.6 0 0 1 2.5-2L9 13.5V5.5a1.5 1.5 0 0 1 3 0V11V4.5a1.5 1.5 0 0 1 3 0V11V6a1.5 1.5 0 0 1 3 0v9a6 6 0 0 1-6 6z',
  'Calzado': 'M5 3h7v8l5.5 2.2A4 4 0 0 1 20 17v2H5zM5 15h15M12 7h-3',
  'Chaleco': 'M8.5 3L5 6.5V21h5.5v-6h3v6H19V6.5L15.5 3 12 8zM5 12.5h5.5M13.5 12.5H19',
  'Protección ocular': 'M3 9.5h18v3.5a3 3 0 0 1-3 3h-2.5l-2-2.5h-3l-2 2.5H6a3 3 0 0 1-3-3z',
  'Protección auditiva': 'M5 14a7 7 0 0 1 14 0M3.5 13.5h3.5v6.5H3.5zM17 13.5h3.5v6.5H17z',
  'Protección': 'M12 3L4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6zM8.8 12l2.3 2.3 4.2-4.6',
  'Envío': 'M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5v3h-7M5 17.5a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0M15.6 17.5a1.7 1.7 0 1 0 3.4 0 1.7 1.7 0 1 0-3.4 0',
  'Stock': 'M3.5 7.5L12 3.2l8.5 4.3v9L12 20.8l-8.5-4.3zM3.5 7.5L12 11.8l8.5-4.3M12 11.8v9',
  'Asesoramiento': 'M4 4.5h16v11H9.5L4 19.5zM8 8.5h8M8 11.5h5',
  'Teléfono': 'M5.5 4h3.3l1.7 4.4-2.2 1.4a11 11 0 0 0 5.9 5.9l1.4-2.2 4.4 1.7v3.3a1.5 1.5 0 0 1-1.5 1.5A15.5 15.5 0 0 1 4 5.5 1.5 1.5 0 0 1 5.5 4z',
  'Ubicación': 'M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5',
  'Reloj': 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2',
  'Atención': 'M12 3.5L2.8 19.5h18.4zM12 9.5v4.5M12 16.8v.2'
};
const iconSVG = (path, color = 'currentColor') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
function renderIcons(host, m) {
  const names = (m.items.length ? m.items : Object.keys(ICON_SET)).filter(n => ICON_SET[n]);
  const grid = h('ul', { class: 'icon-grid stagger' });
  let bg = ui.iconBg || 'claro';
  const colorFor = () => (bg === 'oscuro' ? '#FFFFFF' : brandColor('#000000', 1));
  names.forEach((name, i) => grid.append(h('li', {}, h('button', { type: 'button', class: `icon-tile${i === 0 ? ' is-accent' : ''}`, 'aria-label': `Copiar SVG del ícono ${name}`,
    onclick: e => copyText(iconSVG(ICON_SET[name], e.currentTarget.classList.contains('is-accent') && bg !== 'naranja' ? brandColor('#FE5000', 0) : colorFor()), `Ícono ${name}`, e.currentTarget) }, [
    icon(ICON_SET[name]), h('span', { text: name })
  ]))));
  const stage = h('div', { class: `icon-stage bg-${bg}` }, grid);
  const tabs = segmented('Fondo', LOGO_BGS, bg, v => { bg = ui.iconBg = v; stage.className = `icon-stage bg-${v}`; });
  host.append(h('div', { class: 'icon-demo' }, [
    h('div', { class: 'icon-toolbar' }, [tabs,
      h('p', { class: 'icon-hint', text: 'Tocá un ícono para copiar su SVG. El primero muestra el acento naranja.' })]),
    stage
  ]));
}

/* ---------- Checklist para proveedores ---------- */
function checklistText(s) { return `${data.brand} · ${s.navLabel || s.title}\n` + s.checklist.map(x => `[ ] ${x}`).join('\n'); }
function renderChecklist(s) {
  const id = `checklist-${s.id}`;
  const count = h('span', { class: 'checklist-count', 'aria-live': 'polite' });
  const boxes = [];
  const update = () => { const n = boxes.filter(b => b.checked).length; count.textContent = `${n} / ${boxes.length}`; wrap.classList.toggle('is-complete', n === boxes.length); };
  const list = h('ul', { class: 'checklist-list' }, s.checklist.map((item, i) => {
    const box = h('input', { type: 'checkbox', id: `${id}-${i}`, onchange: update });
    boxes.push(box);
    return h('li', {}, [box, h('label', { for: `${id}-${i}` }, [h('span', { class: 'checklist-box', 'aria-hidden': 'true' }, icon(ICONS.check)), h('span', { text: item })])]);
  }));
  const wrap = h('aside', { class: 'checklist reveal', id, 'aria-labelledby': `${id}-title` }, [
    h('div', { class: 'checklist-head' }, [
      h('div', {}, [h('span', { class: 'module-number', text: 'Antes de producir' }), h('h3', { id: `${id}-title` }, ['Checklist para proveedores', anchorButton(id, `Checklist · ${s.navLabel || s.title}`)])]),
      count
    ]),
    list,
    h('div', { class: 'kit-actions' }, [
      h('button', { type: 'button', class: 'btn btn-small btn-outline', onclick: () => copyText(checklistText(s), 'Checklist') }, [icon(ICONS.copy), 'Copiar lista']),
      h('button', { type: 'button', class: 'btn btn-small btn-ghost', onclick: () => { boxes.forEach(b => { b.checked = false; }); update(); } }, 'Reiniciar')
    ])
  ]);
  update();
  return wrap;
}

function renderImage(host, m) {
  if (!m.media) return;
  const isMockup = /mockup-/.test(m.media) || m.kind === 'essence';
  const btn = h('button', { class: 'media-button', type: 'button', 'aria-label': `Ampliar imagen: ${m.title}`, onclick: e => openLightbox([m], 0, e.currentTarget) }, [
    h('img', { src: m.media, alt: isMockup ? `Maqueta conceptual: ${m.title}` : `Ejemplo visual: ${m.title}`, loading: 'lazy', decoding: 'async' }),
    h('span', { class: 'media-zoom' }, icon(ICONS.expand))
  ]);
  host.append(h('figure', { class: 'media-figure' }, [btn, h('figcaption', { text: isMockup ? 'Maqueta conceptual · ampliar' : `Ejemplo de uso · ${m.title}` })]));
}

function renderFeature(m) {
  const figure = h('figure', { class: 'feature reveal', id: `bloque-${safeId(m.id)}` });
  const button = h('button', { class: 'feature-media', type: 'button', 'aria-label': `Ampliar maqueta: ${m.title}`, onclick: e => openLightbox([m], 0, e.currentTarget) }, [
    m.media ? h('img', { src: m.media, alt: `Maqueta conceptual: ${m.title}`, loading: 'lazy', decoding: 'async' }) : null
  ]);
  figure.append(button, h('figcaption', {}, [
    h('span', { class: 'tag', text: m.note || 'Maqueta conceptual' }),
    h('strong', { text: m.title }),
    m.body ? h('p', { text: m.body }) : null
  ]));
  return figure;
}

/* ---------- Logo ---------- */
function segmented(label, options, current, onPick) {
  const group = h('div', { class: 'segmented', role: 'group', 'aria-label': label });
  for (const [value, text] of options) {
    group.append(h('button', { type: 'button', text, 'aria-pressed': String(value === current), onclick: e => {
      $$('button', group).forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      onPick(value);
    } }));
  }
  return h('div', { class: 'control' }, [h('span', { class: 'control-label', text: label }), group]);
}
function renderLogoDemo(host) {
  const panel = h('div', { class: 'logo-demo' });
  const stage = h('div', { class: 'logo-stage' });
  const file = h('code', { class: 'logo-file' });
  const download = h('a', { class: 'btn btn-small btn-outline', href: '#kit' }, [icon(ICONS.download), 'Ir al kit de descargas']);
  const range = h('input', { type: 'range', min: 25, max: 100, value: ui.logoScale, id: 'logoScale' });
  const out = h('output', { for: 'logoScale', text: `${ui.logoScale}%` });
  function draw() {
    const src = logoAsset(ui.logoVariant, ui.logoBg);
    stage.className = `logo-stage bg-${ui.logoBg} v-${ui.logoVariant}`;
    stage.style.setProperty('--scale', ui.logoScale / 100);
    const label = LOGO_VARIANTS.find(v => v[0] === ui.logoVariant)?.[1] || '';
    const bgLabel = LOGO_BGS.find(v => v[0] === ui.logoBg)?.[1] || '';
    stage.replaceChildren(h('img', { src, alt: `Logo Crisger, versión ${label.toLowerCase()} sobre fondo ${bgLabel.toLowerCase()}` }),
      h('span', { class: 'stage-tag', text: `${label} · fondo ${bgLabel.toLowerCase()}` }));
    file.textContent = src.startsWith('data:') ? 'Imagen cargada desde el editor' : src;
  }
  range.addEventListener('input', () => { ui.logoScale = Number(range.value); out.textContent = `${range.value}%`; stage.style.setProperty('--scale', ui.logoScale / 100); });
  const controls = h('div', { class: 'logo-controls' }, [
    segmented('Versión', LOGO_VARIANTS, ui.logoVariant, v => { ui.logoVariant = v; draw(); }),
    segmented('Fondo', LOGO_BGS, ui.logoBg, v => { ui.logoBg = v; draw(); }),
    h('div', { class: 'control' }, [h('label', { class: 'control-label', for: 'logoScale', text: 'Escala' }), h('div', { class: 'range-row' }, [range, out])]),
    h('div', { class: 'logo-file-row' }, [file, download])
  ]);
  panel.append(stage, controls);
  host.append(panel);
  draw();
}

function renderClearspace(host, m) {
  const panel = h('div', { class: 'clearspace' });
  const stage = h('div', { class: 'clearspace-stage' });
  function draw() {
    stage.replaceChildren(h('div', { class: `cs-box v-${ui.clearVariant}` }, [
      ...['tl', 'tr', 'bl', 'br'].map(pos => h('span', { class: `cs-x ${pos}`, 'aria-hidden': 'true', text: 'x' })),
      h('img', { src: logoAsset(ui.clearVariant, 'claro'), alt: `Espacio de protección alrededor del logo Crisger, versión ${ui.clearVariant}` })
    ]));
  }
  panel.append(segmented('Versión', LOGO_VARIANTS, ui.clearVariant, v => { ui.clearVariant = v; draw(); }), stage);
  const legend = h('div', { class: 'cs-legend' }, [
    h('span', {}, [h('i', { class: 'swatch-zone', 'aria-hidden': 'true' }), 'Zona libre (x)']),
    h('span', {}, [h('i', { class: 'swatch-logo', 'aria-hidden': 'true' }), 'Área del logo'])
  ]);
  panel.append(legend);
  if (m.media) {
    panel.append(h('button', { class: 'btn btn-small btn-outline', type: 'button', onclick: e => openLightbox([{ ...m, title: `${m.title} · referencia del manual`, category: 'Manual original' }], 0, e.currentTarget) },
      [icon(ICONS.expand), 'Ver referencia del manual']));
  }
  host.append(panel);
  draw();
}

const ERROR_RULES = [
  [/color/i, 'color'], [/contorno|borde|outline/i, 'outline'], [/forma/i, 'shape'], [/volumen|3d/i, 'volume'],
  [/sombra/i, 'shadow'], [/reflej|espejo/i, 'reflect'], [/compri/i, 'compress'], [/expan|estir/i, 'expand'], [/rot|gir/i, 'rotate']
];
function renderIncorrect(host, m) {
  const fallback = ERROR_RULES.map(r => r[1]);
  const logo = logoAsset('principal', 'claro');
  const grid = h('div', { class: 'incorrect-grid stagger' });
  host.append(h('p', { class: 'incorrect-hint', text: 'Pasá el cursor o tocá un ejemplo para compararlo con el logo correcto.' }));
  grid.append(h('div', { class: 'incorrect-card is-correct' }, [
    h('div', { class: 'incorrect-stage' }, h('img', { src: logo, alt: 'Logo original sin alteraciones' })),
    h('p', { class: 'incorrect-caption' }, [h('span', { class: 'mark ok', 'aria-hidden': 'true', text: '✓' }), h('strong', { text: 'Uso correcto' })])
  ]));
  m.items.forEach((label, i) => {
    const style = ERROR_RULES.find(([re]) => re.test(label))?.[1] || fallback[i % fallback.length];
    const stage = h('div', { class: 'incorrect-stage' }, [
      h('div', { class: `error-logo error-${style}` }, h('img', { src: logo, alt: `Ejemplo incorrecto: ${label}` }))
    ]);
    const toggle = card => { const on = card.classList.toggle('show-correct'); card.setAttribute('aria-pressed', String(on)); };
    grid.append(h('div', { class: 'incorrect-card', role: 'button', tabindex: '0', 'aria-pressed': 'false', 'aria-label': `${label}. Activá para ver el logo correcto.`, style: { '--i': i },
      onclick: e => toggle(e.currentTarget), onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e.currentTarget); } } }, [stage,
      h('p', { class: 'incorrect-caption' }, [h('span', { class: 'mark no', 'aria-hidden': 'true', text: '×' }), h('strong', { text: label })])]));
  });
  host.append(grid);
}

/* ---------- Recursos: patrones ---------- */
function buildPattern(i) {
  const iso = logoAsset('isotipo', 'naranja');
  const stage = h('div', { class: `pattern-stage pattern-${i}`, 'aria-hidden': 'true' });
  if (i === 0) {
    for (let n = 0; n < 12 * 10; n++) stage.append(h('img', { src: iso, alt: '', style: { '--d': `${(((n % 12) + Math.floor(n / 12)) * 0.16).toFixed(2)}s` } }));
  } else {
    for (let r = 0; r < 10; r++) {
      const row = h('div', { class: 'pattern-row' });
      for (let c = 0; c < 20; c++) row.append(h('img', { src: iso, alt: '', class: (r + c) % 2 ? 'soft' : '' }));
      stage.append(row);
    }
  }
  return stage;
}
function renderPatterns(host, m) {
  const labels = m.items.length ? m.items : ['Trama técnica', 'Ritmo alternado'];
  const total = labels.length;
  const track = h('div', { class: 'pattern-track', tabindex: '0', role: 'region', 'aria-roledescription': 'carrusel', 'aria-label': 'Patrones con el isotipo. Usá las flechas para recorrerlos.' });
  const cards = labels.map((label, i) => h('figure', { class: 'pattern-card', 'aria-roledescription': 'diapositiva', 'aria-label': `${i + 1} de ${total}: ${label}` }, [
    buildPattern(i % 2),
    h('figcaption', {}, [h('strong', { text: label }), h('span', { text: `${pad2(i + 1)} / ${pad2(total)}` })])
  ]));
  track.append(...cards);
  const count = h('span', { class: 'carousel-count', 'aria-live': 'polite' });
  const dots = h('div', { class: 'carousel-dots' }, labels.map((label, i) => h('button', { type: 'button', 'aria-label': `Ir a ${label}`, onclick: () => go(i) })));
  const prev = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Patrón anterior', onclick: () => go(current() - 1) }, icon(ICONS.prev));
  const next = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Patrón siguiente', onclick: () => go(current() + 1) }, icon(ICONS.next));
  function current() {
    const left = track.scrollLeft;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - track.offsetLeft - left); if (d < dist) { dist = d; best = i; } });
    return best;
  }
  function go(i) {
    const n = Math.max(0, Math.min(total - 1, i));
    track.scrollTo({ left: cards[n].offsetLeft - track.offsetLeft, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }
  function update() {
    const n = current(); ui.patternIndex = n;
    count.textContent = `${pad2(n + 1)} / ${pad2(total)} · ${labels[n]}`;
    prev.disabled = n === 0; next.disabled = n === total - 1;
    $$('button', dots).forEach((d, i) => d.setAttribute('aria-current', String(i === n)));
  }
  let raf = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(current() - 1); }
  });
  host.append(h('div', { class: 'carousel' }, [track, h('div', { class: 'carousel-footer' }, [count, dots, h('div', { class: 'carousel-arrows' }, [prev, next])])]));
  requestAnimationFrame(() => { if (ui.patternIndex) track.scrollLeft = cards[Math.min(ui.patternIndex, total - 1)].offsetLeft - track.offsetLeft; update(); });
}

/* ---------- Color ---------- */
function renderPalette(host) {
  const grid = h('div', { class: 'palette-bento stagger' });
  data.palette.forEach((c, i) => {
    const ink = inkFor(c.hex);
    grid.append(h('button', { type: 'button', class: `palette-tile tile-${i}${i === 0 ? ' is-main' : ''}`, style: { background: c.hex, color: ink },
      'aria-label': `Copiar HEX ${c.hex} de ${c.name}`, onclick: e => copyText(c.hex, c.hex, e.currentTarget) }, [
      h('span', { class: 'tile-top' }, [h('strong', { text: c.name }), h('span', { class: 'tile-copy' }, [icon(ICONS.copy), 'Copiar'])]),
      h('span', { class: 'tile-codes' }, [
        h('b', { class: 'tile-hex', text: c.hex }),
        c.rgb ? h('span', { text: `RGB ${c.rgb}` }) : null,
        c.cmyk ? h('span', { text: `CMYK ${c.cmyk}` }) : null
      ])
    ]));
  });
  const orange = brandColor('#FE5000', 0), black = brandColor('#000000', 1);
  [['Degradado cálido', `linear-gradient(135deg, ${orange} 0%, ${black} 100%)`, `${orange} → ${black}`],
   ['Degradado profundo', `linear-gradient(90deg, ${black} 0%, ${black} 20%, ${orange} 100%)`, `${black} → ${orange}`]].forEach(([name, bg, codes], i) => {
    grid.append(h('button', { type: 'button', class: `palette-tile gradient-tile g-${i}`, style: { background: bg, color: '#FFFFFF' },
      'aria-label': `Copiar CSS del ${name.toLowerCase()}`, onclick: e => copyText(bg, 'Degradado', e.currentTarget) }, [
      h('span', { class: 'tile-top' }, [h('strong', { text: name }), h('span', { class: 'tile-copy' }, [icon(ICONS.copy), 'Copiar CSS'])]),
      h('span', { class: 'tile-codes' }, [h('b', { class: 'tile-hex', text: 'Naranja → negro' }), h('span', { text: codes })])
    ]));
  });
  host.append(grid);
}

function renderToneLab(host) {
  const choices = data.palette.filter(c => !['#FFFFFF', '#F2F2F2'].includes(c.hex.toUpperCase()));
  const base = choices.length ? choices : data.palette;
  if (ui.toneIndex >= base.length) ui.toneIndex = 0;
  const lab = h('div', { class: 'tone-lab' });
  const picker = h('div', { class: 'tone-picker', role: 'group', 'aria-label': 'Color base' });
  const result = h('div', { class: 'tone-result' });
  const range = h('input', { type: 'range', min: 10, max: 80, step: 5, value: ui.toneAmount, id: 'toneAmount' });
  const out = h('output', { for: 'toneAmount', text: `${ui.toneAmount}%` });
  base.forEach((c, i) => picker.append(h('button', { type: 'button', class: 'tone-pick', 'aria-pressed': String(i === ui.toneIndex), onclick: e => {
    ui.toneIndex = i; $$('button', picker).forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); draw();
  } }, [h('i', { style: { background: c.hex }, 'aria-hidden': 'true' }), h('span', { text: c.name })])));
  range.addEventListener('input', () => { ui.toneAmount = Number(range.value); out.textContent = `${range.value}%`; draw(); });
  lab.append(h('div', { class: 'tone-toolbar' }, [
    h('div', { class: 'control' }, [h('span', { class: 'control-label', text: 'Color base' }), picker]),
    h('div', { class: 'control' }, [h('label', { class: 'control-label', for: 'toneAmount', text: 'Intensidad de la mezcla' }), h('div', { class: 'range-row' }, [range, out])])
  ]), result);
  function draw() {
    const color = base[ui.toneIndex]?.hex || '#FE5000';
    const amount = ui.toneAmount / 100;
    // El negro no admite tonos (mezclado con negro sigue siendo negro): solo se muestran sus matices, que forman la escala de grises.
    const isBlack = luminance(color) < 0.005;
    const modes = isBlack ? [['Matices', '#FFFFFF', 'Negro mezclado con blanco: escala de grises']] : [['Matices', '#FFFFFF', 'Base mezclada con blanco'], ['Tonos', '#000000', 'Base mezclada con negro']];
    result.classList.toggle('is-single', isBlack);
    result.replaceChildren(...modes.map(([name, target, desc]) => {
      const steps = [0, 0.2, 0.4, 0.6, 0.8].map(t => mixHex(color, target, t));
      const current = mixHex(color, target, amount);
      return h('div', { class: 'tone-panel' }, [
        h('div', { class: 'tone-head' }, [h('strong', { text: name }), h('span', { text: desc })]),
        h('div', { class: 'tone-ramp' }, steps.map((hex, n) => h('button', { type: 'button', class: 'tone-swatch', style: { background: hex, color: inkFor(hex), '--i': n },
          'aria-label': `Copiar ${hex}`, title: `Copiar ${hex}`, onclick: e => copyText(hex, hex, e.currentTarget) }, h('span', { text: n ? `${n * 20}%` : 'Base' })))),
        h('button', { type: 'button', class: 'tone-current', style: { background: current, color: inkFor(current) }, onclick: e => copyText(current, current, e.currentTarget) }, [
          h('span', { text: `${ui.toneAmount}% · ${name === 'Matices' ? 'matiz' : 'tono'}` }), h('b', { text: current }), h('small', {}, [icon(ICONS.copy), 'Copiar'])
        ])
      ]);
    }));
  }
  host.append(lab);
  draw();
}

function renderContrast(host, m) {
  const [kicker = 'Seguridad industrial', title = 'La seguridad se hace visible.', body = 'Una identidad que ordena la información.', accent = 'Protección en cada decisión'] = m.items;
  const P = { orange: brandColor('#FE5000', 0), black: brandColor('#000000', 1), graphite: brandColor('#44464B', 2), gray: brandColor('#CCCCCC', 3), warm: brandColor('#F2F2F2', 4), white: brandColor('#FFFFFF', 5) };
  const modes = {
    light: { label: 'Claro', bg: P.warm, title: P.black, text: P.graphite, accent: P.orange, accentInk: P.black, ref: P.warm },
    dark: { label: 'Oscuro', bg: P.black, title: P.white, text: P.gray, accent: P.orange, accentInk: P.black, ref: P.black },
    orange: { label: 'Naranja', bg: P.orange, title: P.white, text: P.black, accent: P.black, accentInk: P.white, ref: P.orange },
    gradient: { label: 'Degradado', bg: `linear-gradient(100deg, ${P.black} 0%, ${P.black} 34%, ${P.orange} 100%)`, title: P.white, text: P.warm, accent: P.orange, accentInk: P.black, ref: P.black }
  };
  const tabs = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Fondo de la aplicación' });
  const stage = h('div', { class: 'contrast-stage' });
  const legend = h('ul', { class: 'contrast-legend' });
  const rating = r => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA grande' : 'Insuficiente');
  function draw(key) {
    ui.contrastMode = key;
    const mode = modes[key];
    $$('button', tabs).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === key)));
    stage.className = `contrast-stage mode-${key}`;
    stage.style.background = mode.bg;
    stage.style.setProperty('--c-title', mode.title);
    stage.style.setProperty('--c-text', mode.text);
    stage.style.setProperty('--c-accent', mode.accent);
    stage.style.setProperty('--c-accent-ink', mode.accentInk);
    stage.replaceChildren(
      h('span', { class: 'c-kicker', text: kicker }),
      h('strong', { class: 'c-title', text: title }),
      h('p', { class: 'c-body', text: body }),
      h('div', { class: 'c-accent' }, [h('b', { text: '01' }), h('span', { text: accent })])
    );
    const rows = [
      ['Titular', 'Bai Jamjuree Bold', mode.title],
      ['Texto', 'Inter Regular', mode.text],
      ['Acento', 'Bai Jamjuree SemiBold', mode.accent]
    ];
    legend.replaceChildren(...rows.map(([role, font, color]) => {
      const r = contrastRatio(color, mode.ref);
      return h('li', {}, [
        h('i', { style: { background: color }, 'aria-hidden': 'true' }),
        h('span', {}, [h('strong', { text: role }), h('small', { text: `${font} · ${color}` })]),
        h('b', { text: `${r.toFixed(1)}:1`, title: rating(r) }), h('em', { text: rating(r) })
      ]);
    }), ...(key === 'gradient' ? [h('li', { class: 'legend-note', text: 'En el degradado, el contraste se mide sobre el tramo negro, donde se ubica el texto.' })] : []));
  }
  Object.entries(modes).forEach(([key, mode]) => tabs.append(h('button', { type: 'button', text: mode.label, 'data-mode': key, onclick: () => draw(key) })));
  host.append(h('div', { class: 'contrast-demo' }, [h('div', { class: 'control' }, [h('span', { class: 'control-label', text: 'Fondo' }), tabs]), h('div', { class: 'contrast-layout' }, [stage, legend])]));
  draw(ui.contrastMode);
}

/* ---------- Tipografía ---------- */
function renderTypeLogo(host) {
  host.append(h('div', { class: 'type-card type-logo' }, [
    h('span', { class: 'type-eyebrow', text: 'Archivo original del logotipo' }),
    h('div', { class: 'type-logo-stage' }, h('img', { src: logoAsset('logotipo', 'claro'), alt: 'Logotipo Crisger, archivo original' })),
    h('div', { class: 'type-logo-dark' }, h('img', { src: logoAsset('logotipo', 'oscuro'), alt: '' })),
    h('p', { class: 'type-caption', text: 'El lettering se aplica siempre desde el archivo del logo. No se escribe con una fuente.' })
  ]));
}
function renderTypeDisplay(host) {
  const weights = [[400, 'Regular', 'Textos breves de interfaz'], [600, 'SemiBold', 'Subtítulos y niveles secundarios'], [700, 'Bold', 'Titulares principales']];
  host.append(h('div', { class: 'type-weights font-bai stagger' }, weights.map(([w, name, use]) => h('div', { class: 'weight-card', style: { fontWeight: w } }, [
    h('div', { class: 'weight-head' }, [h('span', { text: `Bai Jamjuree ${name}` }), h('span', { text: String(w) })]),
    h('div', { class: 'weight-aa', text: 'Aa' }),
    h('div', { class: 'weight-alpha' }, ['ABCDEFGHIJKLMN', h('br'), 'ÑOPQRSTUVWXYZ']),
    h('div', { class: 'weight-alpha lower' }, ['abcdefghijklmn', h('br'), 'ñopqrstuvwxyz']),
    h('div', { class: 'weight-num', text: '0123456789 ¿?¡!&@%' }),
    h('p', { class: 'weight-use', text: use })
  ]))));
}
function renderTypeBody(host) {
  host.append(h('div', { class: 'type-card type-inter' }, [
    h('div', { class: 'inter-top' }, [h('span', { class: 'inter-aa', text: 'Aa' }), h('div', {}, [h('span', { class: 'type-eyebrow', text: 'Inter · Regular 400' }), h('div', { class: 'inter-alpha', text: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Ññ Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz' }), h('div', { class: 'inter-num', text: '0 1 2 3 4 5 6 7 8 9' })])]),
    h('div', { class: 'inter-samples' }, [
      h('div', {}, [h('small', { text: 'Párrafo · 17 / 28 px' }), h('p', { class: 'inter-lg', text: data.heroText })]),
      h('div', {}, [h('small', { text: 'Texto de apoyo · 14 / 22 px' }), h('p', { class: 'inter-sm', text: data.sections[0]?.lead || data.heroText })])
    ])
  ]));
}
function renderTypeScale(host, m) {
  const classes = ['scale-h1', 'scale-h2', 'scale-h3', 'scale-lead', 'scale-body'];
  const rows = (m.items.length ? m.items : ['H1 — Protección industrial']).map((line, i) => {
    const [meta, sample] = line.includes(' — ') ? line.split(' — ') : [line, line];
    const cls = classes[Math.min(i, classes.length - 1)];
    const tag = cls === 'scale-body' ? 'p' : 'span';
    return h('div', { class: 'scale-row' }, [h('span', { class: 'scale-meta', text: meta.trim() }), h(tag, { class: `scale-sample ${cls}`, text: sample.trim() })]);
  });
  host.append(h('div', { class: 'type-scale stagger' }, rows));
}

/* ---------- Galería ---------- */
function renderGallery(items) {
  const wrap = h('div', { class: 'gallery reveal' });
  const categories = ['Todas', ...new Set(items.map(m => m.category || 'Otras'))];
  if (!categories.includes(ui.filter)) ui.filter = 'Todas';
  const filters = h('div', { class: 'gallery-filters', role: 'group', 'aria-label': 'Filtrar aplicaciones por categoría' });
  const grid = h('ul', { class: 'gallery-grid stagger' });
  const status = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const cards = items.map(m => {
    const btn = h('button', { type: 'button', class: 'gallery-card', 'aria-label': `Ampliar ${m.title}` , onclick: e => openLightbox(galleryEntries, galleryEntries.indexOf(m), e.currentTarget) }, [
      h('span', { class: 'gallery-media' }, [
        m.media ? h('img', { src: m.media, alt: `Maqueta conceptual: ${m.title}`, loading: 'lazy', decoding: 'async' }) : null,
        h('span', { class: 'media-zoom' }, icon(ICONS.expand))
      ]),
      h('span', { class: 'gallery-caption' }, [h('span', { class: 'tag', text: m.category || 'Otras' }), h('strong', { text: m.title }), m.body ? h('span', { class: 'gallery-text', text: m.body }) : null])
    ]);
    return { li: h('li', {}, btn), m };
  });
  function apply(category, announce) {
    ui.filter = category;
    galleryEntries = category === 'Todas' ? items : items.filter(m => (m.category || 'Otras') === category);
    $$('button', filters).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === category)));
    const visible = cards.filter(c => galleryEntries.includes(c.m)).map(c => c.li);
    visible.forEach((li, i) => li.style.setProperty('--i', i));
    wrap.classList.toggle('is-filtering', !!announce);
    grid.replaceChildren(...visible);
    if (announce) status.textContent = `${galleryEntries.length} ${galleryEntries.length === 1 ? 'aplicación' : 'aplicaciones'} en ${category.toLowerCase()}`;
  }
  categories.forEach(cat => {
    const n = cat === 'Todas' ? items.length : items.filter(m => (m.category || 'Otras') === cat).length;
    filters.append(h('button', { type: 'button', 'data-cat': cat, onclick: () => apply(cat, true) }, [cat, h('span', { class: 'count', text: n })]));
  });
  wrap.append(filters, grid, status);
  apply(ui.filter, false);
  return wrap;
}

/* ---------- Kit de marca (descargas) ---------- */
const fileName = src => String(src || '').split('/').pop();
function pngFor(src) {
  // Las exportaciones PNG en alta resolución viven en media/descargas/png con el mismo nombre que el SVG.
  return /^media\/[^/]+\.svg$/.test(src) ? `media/descargas/png/${fileName(src).replace('.svg', '.png')}` : '';
}
function downloadBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function paletteCSS() {
  const slug = n => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const vars = data.palette.map(c => `  --crisger-${slug(c.name)}: ${c.hex}; /* RGB ${c.rgb} · CMYK ${c.cmyk} */`).join('\n');
  const o = brandColor('#FE5000', 0), k = brandColor('#000000', 1);
  return `/* ${data.brand} · Paleta de marca · ${data.version} */\n:root {\n${vars}\n  --crisger-degradado: linear-gradient(135deg, ${o} 0%, ${k} 100%);\n}\n`;
}
function paletteTXT() {
  return `${data.brand} · Paleta de marca · ${data.version}\n\n` + data.palette.map(c => `${c.name}\n  HEX  ${c.hex}\n  RGB  ${c.rgb}\n  CMYK ${c.cmyk}\n`).join('\n');
}
function renderKit() {
  const k = data.kit;
  const sec = h('section', { class: 'chapter theme-light kit', id: 'kit', 'aria-labelledby': 'kit-title', tabindex: '-1' });
  sec.append(h('header', { class: 'chapter-head reveal' }, [
    h('div', {}, [h('span', { class: 'kicker', text: k.kicker }), splitWords(h('h2', { id: 'kit-title' }), k.title)]),
    h('div', { class: 'chapter-lead' }, [h('p', { text: k.lead }), k.note ? h('p', { class: 'chapter-note', text: k.note }) : null])
  ]));
  const body = h('div', { class: 'chapter-body kit-body' });
  // Paquete completo
  if (k.zip) body.append(h('div', { class: 'kit-hero reveal' }, [
    h('div', {}, [h('strong', { text: 'Paquete de logos' }), h('p', { text: '5 versiones × 3 fondos, en SVG y PNG de alta resolución con fondo transparente.' })]),
    h('a', { class: 'btn btn-primary', href: k.zip, download: fileName(k.zip) }, [icon(ICONS.download), 'Descargar ZIP'])
  ]));
  // Logos
  const grid = h('div', { class: 'kit-logos stagger' });
  LOGO_VARIANTS.forEach(([v, label]) => {
    grid.append(h('article', { class: 'kit-card' }, [
      h('h3', { text: label }),
      h('div', { class: 'kit-variants' }, LOGO_BGS.map(([bg, bgLabel]) => {
        const src = logoAsset(v, bg); const png = pngFor(src);
        const svgName = src.startsWith('data:') ? `crisger-${v}-${bg}.svg` : fileName(src);
        return h('div', { class: `kit-variant bg-${bg}` }, [
          h('img', { src, alt: `${label} para fondo ${bgLabel.toLowerCase()}`, loading: 'lazy' }),
          h('div', { class: 'kit-links' }, [
            h('span', { text: `Fondo ${bgLabel.toLowerCase()}` }),
            h('a', { href: src, download: svgName, 'aria-label': `Descargar SVG de ${label}, fondo ${bgLabel.toLowerCase()}`, text: 'SVG' }),
            png ? h('a', { href: png, download: fileName(png), 'aria-label': `Descargar PNG de ${label}, fondo ${bgLabel.toLowerCase()}`, text: 'PNG' }) : null
          ])
        ]);
      }))
    ]));
  });
  body.append(h('div', { class: 'reveal', id: 'kit-logos' }, [h('h3', { class: 'kit-subtitle', text: 'Logos' }), grid]));
  // Colores y tipografías
  const fonts = [['Bai Jamjuree Regular', 'fonts/bai-regular.ttf', 400], ['Bai Jamjuree SemiBold', 'fonts/bai-semibold.ttf', 600], ['Bai Jamjuree Bold', 'fonts/bai-bold.ttf', 700], ['Inter (variable)', 'fonts/inter-variable.ttf', 400]];
  body.append(h('div', { class: 'kit-row reveal', id: 'kit-paleta' }, [
    h('article', { class: 'kit-card kit-colors' }, [
      h('h3', { text: 'Paleta' }),
      h('div', { class: 'kit-swatches' }, data.palette.map(c => h('i', { style: { background: c.hex }, title: `${c.name} ${c.hex}` }))),
      h('p', { text: 'Códigos HEX, RGB y CMYK listos para diseño, web e imprenta.' }),
      h('div', { class: 'kit-actions' }, [
        h('button', { type: 'button', class: 'btn btn-small btn-outline', onclick: () => { downloadBlob(paletteCSS(), 'crisger-paleta.css', 'text/css'); toast('Paleta descargada'); } }, [icon(ICONS.download), 'CSS para web']),
        h('button', { type: 'button', class: 'btn btn-small btn-outline', onclick: () => { downloadBlob(paletteTXT(), 'crisger-paleta.txt', 'text/plain'); toast('Paleta descargada'); } }, [icon(ICONS.download), 'Texto para imprenta'])
      ])
    ]),
    h('article', { class: 'kit-card kit-fonts' }, [
      h('h3', { text: 'Tipografías' }),
      h('ul', {}, fonts.map(([name, file, w]) => h('li', {}, [
        h('span', { class: name.startsWith('Inter') ? 'font-inter-sample' : '', style: { fontWeight: w }, text: name }),
        h('a', { href: file, download: fileName(file), 'aria-label': `Descargar ${name}` }, [icon(ICONS.download), 'TTF'])
      ]))),
      h('p', { text: 'Bai Jamjuree e Inter se distribuyen con licencia SIL Open Font License. El lettering del logo no se entrega como fuente: se usa siempre el archivo del logo.' })
    ])
  ]));
  body.append(renderTemplates());
  sec.append(body);
  return sec;
}

/* ---------- Plantillas de uso rápido ---------- */
const TPL_FORMATS = {
  post: { label: 'Publicación', size: '1080 × 1080', w: 1080, h: 1080, shape: 'square' },
  story: { label: 'Historia', size: '1080 × 1920', w: 1080, h: 1920, shape: 'port' },
  banner: { label: 'Portada LinkedIn', size: '1584 × 396', w: 1584, h: 396, shape: 'strip' },
  link: { label: 'Enlace horizontal', size: '1200 × 628', w: 1200, h: 628, shape: 'land' },
  video: { label: 'Videollamada', size: '1920 × 1080', w: 1920, h: 1080, shape: 'land' },
  a4: { label: 'Cartel A4 / A3', size: '2480 × 3508', w: 2480, h: 3508, shape: 'port', print: true }
};
const TPL_STYLES = {
  negro: { label: 'Negro', bg: '#000000', glow: true, title: '#FFFFFF', text: '#CCCCCC', tag: '#FE5000', bar: '#FE5000', logo: 'oscuro', iso: 'naranja', isoAlpha: 0.08, cta: '#FE5000', ctaInk: '#000000', shade: '0,0,0',
    hi: '#FE5000', frame: '#FE5000', foot: '#141416', footLine: '#FE5000', circle: '#FE5000', circleInk: '#000000', badge: '#FE5000', badgeInk: '#000000', block: '#FE5000' },
  naranja: { label: 'Naranja', bg: '#FE5000', glow: false, title: '#FFFFFF', text: '#000000', tag: '#000000', bar: '#000000', logo: 'naranja', iso: 'naranja', isoAlpha: 0.16, cta: '#000000', ctaInk: '#FFFFFF', shade: '254,80,0',
    hi: '#000000', frame: '#000000', foot: '#000000', footLine: '', circle: '#000000', circleInk: '#FE5000', badge: '#000000', badgeInk: '#FFFFFF', block: '#000000' },
  claro: { label: 'Claro', bg: '#F2F2F2', glow: false, title: '#000000', text: '#44464B', tag: '#000000', bar: '#FE5000', logo: 'claro', iso: 'claro', isoAlpha: 0.09, cta: '#FE5000', ctaInk: '#000000', shade: '242,242,242',
    hi: '#FE5000', frame: '#FE5000', foot: '#000000', footLine: '#FE5000', circle: '#FE5000', circleInk: '#000000', badge: '#000000', badgeInk: '#FFFFFF', block: '#000000' }
};
const TPL_LAYOUTS = [['clasica', 'Clásica'], ['centrada', 'Centrada'], ['panel', 'Panel'], ['franja', 'Franja'], ['destacado', 'Destacado'], ['icono', 'Ícono'], ['marco', 'Marco']];
// Estructuras con un área de imagen separada del área de texto
const TPL_SPLIT = new Set(['panel', 'franja']);
// Propósitos: cargan textos y una estructura pensada para cada tipo de pieza
const TPL_PRESETS = [
  ['producto', 'Producto nuevo', { layout: 'franja', style: 'negro', tag: 'Nuevo ingreso', title: 'Guantes de alta resistencia', text: 'Protección y agarre para tareas exigentes. Consultá talles y stock.', cta: 'Consultanos', badge: 'Nuevo', highlight: '' }],
  ['promo', 'Promoción', { layout: 'destacado', style: 'negro', tag: 'Promoción', highlight: '$ 00.000', title: 'Botines de seguridad con puntera', text: 'Válido hasta agotar stock.', cta: 'Pedilo por WhatsApp', badge: '-15%' }],
  ['horario', 'Horarios y feriados', { layout: 'icono', style: 'claro', icon: 'Reloj', tag: 'Horarios', title: 'El lunes feriado permanecemos cerrados', text: 'El martes te esperamos en el horario habitual.', cta: '', badge: '', highlight: '' }],
  ['consejo', 'Consejo de seguridad', { layout: 'icono', style: 'negro', icon: 'Casco', tag: 'Consejo de seguridad', title: 'Un casco protege si está bien ajustado', text: 'Regulá el arnés antes de cada jornada y reemplazalo si tiene golpes o fisuras.', cta: '', badge: '', highlight: '' }],
  ['busqueda', 'Búsqueda laboral', { layout: 'marco', style: 'negro', tag: 'Búsqueda laboral', title: 'Sumate al equipo de Crisger', text: 'Buscamos vendedor/a con experiencia en elementos de protección personal.', cta: 'Enviá tu CV', badge: '', highlight: '' }],
  ['cartel', 'Cartel para imprimir', { format: 'a4', layout: 'icono', style: 'claro', icon: 'Casco', tag: 'Recordatorio', title: 'En esta zona usá casco', text: 'Tu seguridad empieza por el equipo correcto.', cta: '', badge: '', highlight: '' }]
];
const tpl = {
  format: 'post', style: 'negro', layout: 'clasica', preset: '',
  tag: 'Seguridad Industrial', title: 'La seguridad se hace visible.',
  text: 'Elementos de protección personal, indumentaria laboral y asesoramiento técnico en San Nicolás de los Arroyos.',
  cta: '', highlight: '$ 00.000', badge: '', icon: 'Casco', pattern: true,
  image: null, video: null, imageName: '', zoom: 1, ox: 0, oy: 0, shade: 60,
  showLogo: true, clipStart: 0, clipLength: 8,
  contact: false, phone: '', web: '', address: '', qr: false, qrLink: ''
};
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  return imgCache.get(src);
}
const setLS = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px.toFixed(1)}px`; };
function wrapLines(ctx, text, maxW) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = []; let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function fitTitle(ctx, text, maxW, size, maxLines, minSize) {
  let s = size, lines;
  do {
    ctx.font = `700 ${s}px "Bai Jamjuree"`; setLS(ctx, -0.03 * s);
    lines = wrapLines(ctx, text, maxW);
    s -= Math.max(1, size * 0.03);
  } while ((lines.length > maxLines || lines.some(l => ctx.measureText(l).width > maxW)) && s > minSize);
  return { lines, size: s + Math.max(1, size * 0.03) };
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/* Bloque de texto: etiqueta, destacado, titular, texto y botón, anclado arriba, abajo o al centro.
   Con measure: true solo devuelve la altura, sin dibujar. */
function textBlock(ctx, S, o) {
  const parts = [];
  if (tpl.tag) parts.push({ type: 'tag', h: o.tagSize, gap: o.tagSize * 0.95 });
  if (tpl.highlight && o.hiSize) { const t = fitTitle(ctx, tpl.highlight, o.w, o.hiSize, 1, o.hiSize * 0.4); parts.push({ type: 'hi', h: t.size * 0.86, t, gap: o.hiSize * 0.2 }); }
  if (tpl.title) { const t = fitTitle(ctx, tpl.title, o.w, o.titleSize, o.maxLines, o.titleSize * 0.5); parts.push({ type: 'title', h: t.lines.length * t.size, t, gap: o.titleSize * 0.34 }); }
  if (tpl.text && o.textLines) {
    ctx.font = `400 ${o.textSize}px Inter`; setLS(ctx, 0);
    const lines = wrapLines(ctx, tpl.text, o.w).slice(0, o.textLines);
    parts.push({ type: 'text', h: lines.length * o.textSize * 1.45, lines, gap: o.textSize * 1.1 });
  }
  if (tpl.cta && o.ctaSize) parts.push({ type: 'cta', h: o.ctaSize * 2.3, gap: 0 });
  const total = parts.reduce((a, p, i) => a + p.h + (i < parts.length - 1 ? p.gap : 0), 0);
  if (o.measure) return total;
  let y = o.bottom !== undefined ? o.bottom - total : o.center !== undefined ? o.center - total / 2 : o.top;
  const ax = o.align === 'center' ? o.x + o.w / 2 : o.align === 'right' ? o.x + o.w : o.x;
  ctx.textBaseline = 'alphabetic';
  for (const p of parts) {
    if (p.type === 'tag') {
      ctx.font = `600 ${o.tagSize}px "Bai Jamjuree"`; setLS(ctx, 0);
      const tw = ctx.measureText(tpl.tag).width, barW = o.tagSize * 1.3, gap = o.tagSize * 0.5, full = barW + gap + tw;
      const sx = o.align === 'center' ? ax - full / 2 : o.align === 'right' ? ax - full : ax;
      ctx.fillStyle = S.bar; ctx.fillRect(sx, y + o.tagSize * 0.44, barW, Math.max(3, o.tagSize * 0.14));
      ctx.fillStyle = S.tag; ctx.textAlign = 'left'; ctx.fillText(tpl.tag, sx + barW + gap, y + o.tagSize * 0.8);
    } else if (p.type === 'hi') {
      ctx.font = `700 ${p.t.size}px "Bai Jamjuree"`; setLS(ctx, -0.04 * p.t.size);
      ctx.fillStyle = S.hi; ctx.textAlign = o.align;
      ctx.fillText(p.t.lines[0] || '', ax, y + p.t.size * 0.76);
    } else if (p.type === 'title') {
      ctx.font = `700 ${p.t.size}px "Bai Jamjuree"`; setLS(ctx, -0.03 * p.t.size);
      ctx.fillStyle = S.title; ctx.textAlign = o.align;
      p.t.lines.forEach((l, i) => ctx.fillText(l, ax, y + p.t.size * 0.8 + i * p.t.size));
    } else if (p.type === 'text') {
      ctx.font = `400 ${o.textSize}px Inter`; setLS(ctx, 0);
      ctx.fillStyle = S.text; ctx.textAlign = o.align;
      p.lines.forEach((l, i) => ctx.fillText(l, ax, y + o.textSize * 1.05 + i * o.textSize * 1.45));
    } else if (p.type === 'cta') {
      ctx.font = `600 ${o.ctaSize}px "Bai Jamjuree"`; setLS(ctx, 0);
      const tw = ctx.measureText(tpl.cta).width, bw = tw + o.ctaSize * 2.2, bh = o.ctaSize * 2.3;
      const bx = o.align === 'center' ? ax - bw / 2 : o.align === 'right' ? ax - bw : ax;
      ctx.fillStyle = S.cta; roundRect(ctx, bx, y, bw, bh, bh / 2); ctx.fill();
      ctx.fillStyle = S.ctaInk; ctx.textAlign = 'center'; ctx.fillText(tpl.cta, bx + bw / 2, y + bh / 2 + o.ctaSize * 0.36);
    }
    y += p.h + p.gap;
  }
  ctx.textAlign = 'left'; setLS(ctx, 0);
  return total;
}
function drawCover(ctx, img, x, y, w, h) {
  // Sirve tanto para imágenes como para el cuadro actual de un video
  const iw = img.videoWidth || img.naturalWidth || img.width, ih = img.videoHeight || img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih) * tpl.zoom;
  const dw = iw * scale, dh = ih * scale;
  let dx = x + (w - dw) / 2 + tpl.ox * w, dy = y + (h - dh) / 2 + tpl.oy * h;
  dx = Math.min(x, Math.max(x + w - dw, dx)); dy = Math.min(y, Math.max(y + h - dh, dy));
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
}
function drawPattern(ctx, iso, S, region, strip) {
  const { x, y, w, h } = region;
  const t = Math.min(w, h) * (strip ? 0.3 : 0.1), th = t * iso.height / iso.width, gap = t * 0.1;
  const maxD = Math.hypot(w, h) * (strip ? 0.45 : 0.62);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let yy = y + h - th; yy > y - th; yy -= th + gap) for (let xx = x + w - t; xx > x - t; xx -= t + gap) {
    const a = S.isoAlpha * Math.max(0, 1 - Math.hypot(x + w - xx, y + h - yy) / maxD);
    if (a > 0.004) { ctx.globalAlpha = a; ctx.drawImage(iso, xx, yy, t, th); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
/* Área de la imagen y del área de texto en las estructuras Panel y Franja */
function splitGeometry(W, H, shape) {
  if (tpl.layout === 'panel') {
    if (shape === 'port') return { panel: { x: 0, y: H * 0.56, w: W, h: H * 0.44 }, image: { x: 0, y: 0, w: W, h: H * 0.56 } };
    if (shape === 'strip') return { panel: { x: W * 0.52, y: 0, w: W * 0.48, h: H }, image: { x: 0, y: 0, w: W * 0.52, h: H } };
    const pw = shape === 'square' ? W * 0.5 : W * 0.42;
    return { panel: { x: 0, y: 0, w: pw, h: H }, image: { x: pw, y: 0, w: W - pw, h: H } };
  }
  if (tpl.layout === 'franja') {
    if (shape === 'strip') return { panel: { x: W * 0.4, y: 0, w: W * 0.6, h: H }, image: { x: 0, y: 0, w: W * 0.4, h: H } };
    const r = shape === 'port' ? 0.6 : shape === 'land' ? 0.52 : 0.56;
    return { panel: { x: 0, y: H * r, w: W, h: H * (1 - r) }, image: { x: 0, y: 0, w: W, h: H * r } };
  }
  return null;
}
/* Sello circular (por ejemplo «Nuevo» o «-15%») */
function drawBadge(ctx, S, cx, cy, r) {
  if (!tpl.badge) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.14);
  ctx.fillStyle = S.badge; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  const t = fitTitle(ctx, tpl.badge, r * 1.45, r * 0.62, 2, r * 0.2);
  ctx.font = `700 ${t.size}px "Bai Jamjuree"`; setLS(ctx, -0.02 * t.size);
  ctx.fillStyle = S.badgeInk; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const total = t.lines.length * t.size;
  t.lines.forEach((l, i) => ctx.fillText(l, 0, -total / 2 + t.size * 0.76 + i * t.size));
  ctx.restore(); ctx.textAlign = 'left'; setLS(ctx, 0);
}
/* Ícono del set de marca dentro de un círculo */
function drawIconCircle(ctx, S, cx, cy, r) {
  ctx.fillStyle = S.circle; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  const s = r * 1.12 / 24;
  ctx.save(); ctx.translate(cx - 12 * s, cy - 12 * s); ctx.scale(s, s);
  ctx.strokeStyle = S.circleInk; ctx.lineWidth = 1.9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(ICON_SET[tpl.icon] || ICON_SET['Protección']));
  ctx.restore();
}
/* Contacto y código QR */
const WEB_ICON = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3.5 12h17M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z';
const contactItems = () => (tpl.contact ? [[ICON_SET['Teléfono'], tpl.phone], [WEB_ICON, tpl.web], [ICON_SET['Ubicación'], tpl.address]] : [])
  .map(([p, t]) => [p, String(t || '').trim()]).filter(([, t]) => t);
const qrTarget = () => (tpl.qr ? String(tpl.qrLink || '').trim() : '');
const waLink = phone => { const d = String(phone || '').replace(/\D/g, ''); return d.length >= 8 ? `https://wa.me/${d}` : ''; };
let qrLib = null;
const qrCache = new Map();
function loadQRLib() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  return (qrLib ||= new Promise((resolve, reject) => {
    const s = h('script', { src: 'vendor/qrcode.js' });
    s.onload = () => resolve(window.qrcode); s.onerror = () => { qrLib = null; reject(new Error('qr')); };
    document.head.append(s);
  }));
}
async function qrMatrix(text) {
  if (!qrCache.has(text)) {
    const lib = await loadQRLib();
    const q = lib(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount();
    qrCache.set(text, Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c))));
  }
  return qrCache.get(text);
}
function drawQR(ctx, matrix, x, y, size) {
  const n = matrix.length, quiet = 2.5, cell = size / (n + quiet * 2);
  ctx.fillStyle = '#FFFFFF'; roundRect(ctx, x, y, size, size, cell * 1.5); ctx.fill();
  ctx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (matrix[r][c]) ctx.fillRect(Math.floor(x + (quiet + c) * cell), Math.floor(y + (quiet + r) * cell), Math.ceil(cell), Math.ceil(cell));
}
async function drawFooter(ctx, S, W, y0, band, m) {
  ctx.fillStyle = S.foot; ctx.fillRect(0, y0, W, band.total);
  if (S.footLine) { ctx.fillStyle = S.footLine; ctx.fillRect(0, y0, W, Math.max(3, band.inner * 0.035)); }
  const pad = band.inner * 0.16, qrText = qrTarget();
  let qrSize = 0;
  if (qrText) {
    try { qrSize = band.inner - pad * 2; drawQR(ctx, await qrMatrix(qrText), W - m - qrSize, y0 + pad, qrSize); }
    catch { qrSize = 0; }
  }
  const items = contactItems();
  if (!items.length) return;
  const fs = Math.min(band.inner * 0.2, W * 0.028), isz = fs * 1.1, gapX = fs * 1.6, maxX = W - m - (qrSize ? qrSize + fs * 1.5 : 0);
  ctx.font = `600 ${fs}px "Bai Jamjuree"`; setLS(ctx, 0); ctx.textBaseline = 'alphabetic';
  // Reparte los datos en una o dos filas según el ancho disponible
  const rows = [[]]; let x = m;
  for (const [path, text] of items) {
    let t = text, w = isz + fs * 0.45 + ctx.measureText(t).width;
    if (x + w > maxX && rows.at(-1).length) { rows.push([]); x = m; }
    while (m + w > maxX && t.length > 4) { t = `${t.slice(0, -2)}…`; w = isz + fs * 0.45 + ctx.measureText(t).width; }
    rows.at(-1).push([path, t, x]); x += w + gapX;
  }
  const lineH = fs * 1.7, used = rows.slice(0, Math.max(1, Math.floor((band.inner - pad) / lineH)));
  let y = y0 + band.inner / 2 - (used.length * lineH) / 2 + lineH / 2;
  for (const row of used) {
    for (const [path, t, px] of row) {
      const s = isz / 24;
      ctx.save(); ctx.translate(px, y - isz / 2); ctx.scale(s, s);
      ctx.strokeStyle = S.footLine || '#FE5000'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.stroke(new Path2D(path)); ctx.restore();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(t, px + isz + fs * 0.45, y + fs * 0.36);
    }
    y += lineH;
  }
}
async function drawTemplate(canvas) {
  const F = TPL_FORMATS[tpl.format];
  const shape = F.shape, story = tpl.format === 'story', strip = shape === 'strip';
  let S = TPL_STYLES[tpl.style];
  const W = F.w, FH = F.h;
  if (canvas.width !== W || canvas.height !== FH) { canvas.width = W; canvas.height = FH; }
  const ctx = canvas.getContext('2d');
  if (!drawTemplate.fonts) drawTemplate.fonts = Promise.all([document.fonts.load('700 40px "Bai Jamjuree"'), document.fonts.load('600 40px "Bai Jamjuree"'), document.fonts.load('400 20px Inter')]).catch(() => {});
  await drawTemplate.fonts;
  ctx.clearRect(0, 0, W, FH);
  const L = tpl.layout;
  const img = tpl.video || tpl.image;
  // Con imagen de fondo a pantalla completa, los textos se ajustan para leerse sobre el velo
  if (img && !TPL_SPLIT.has(L)) {
    if (tpl.style === 'negro') S = { ...S, text: '#E6E6E6', tag: '#FFFFFF' };
    if (tpl.style === 'naranja') S = { ...S, title: '#FFFFFF', text: '#FFFFFF', tag: '#FFFFFF', bar: '#FFFFFF', cta: '#FFFFFF', ctaInk: '#000000', hi: '#FFFFFF' };
    if (tpl.style === 'claro') S = { ...S, text: '#000000' };
  }
  const [logo, iso] = await Promise.all([loadImg(logoAsset('principal', S.logo)), loadImg(logoAsset('isotipo', S.iso))]);
  // Franja de contacto y QR: ocupa la parte inferior (en historias deja libre la zona de la interfaz de Instagram)
  const u0 = Math.min(W, FH) / 1080;
  const hasFooter = !strip && (contactItems().length || qrTarget());
  // Mínimo de 150 px para que el QR tenga al menos 3 px por módulo y se pueda escanear
  const inner = hasFooter ? Math.max(150, (tpl.format === 'a4' ? 250 : story ? 190 : shape === 'land' ? 130 : 160) * u0) : 0;
  const band = { inner, total: inner + (story && hasFooter ? 200 * u0 : 0) };
  const H = FH - band.total;
  const u = Math.min(W, H) / 1080;
  const m = (shape === 'square' ? 88 : shape === 'port' ? 96 : 72) * u;
  const topSafe = story ? 150 * u : m, botSafe = story && !hasFooter ? 300 * u : m;
  const geo = splitGeometry(W, H, shape);
  const frameT = L === 'marco' ? (strip ? 14 : 26 * u) : 0;
  // 1. Fondo de color
  ctx.fillStyle = S.bg; ctx.fillRect(0, 0, W, FH);
  // 2. Imagen (toda la pieza, dentro del marco o solo en el área de imagen)
  const imgArea = geo ? geo.image : { x: frameT, y: frameT, w: W - frameT * 2, h: H - frameT * 2 };
  if (img) {
    drawCover(ctx, img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    if (!geo) {
      // Velo para asegurar la lectura del texto, con el color del fondo elegido
      const a = tpl.shade / 100;
      if (tpl.style === 'naranja') {
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(254,80,0,${0.35 + a * 0.55})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      const tint = tpl.style === 'naranja' ? '0,0,0' : S.shade;
      if (L === 'centrada' || L === 'icono') {
        ctx.fillStyle = `rgba(${tint},${a * 0.7})`; ctx.fillRect(0, 0, W, H);
        const r = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.55);
        r.addColorStop(0, `rgba(${tint},${Math.min(0.9, a * 1.1)})`); r.addColorStop(1, `rgba(${tint},0)`);
        ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
      } else {
        const g = strip ? ctx.createLinearGradient(W, 0, W * 0.3, 0) : ctx.createLinearGradient(0, H, 0, H * 0.25);
        g.addColorStop(0, `rgba(${tint},${Math.min(0.95, a * 1.25)})`); g.addColorStop(1, `rgba(${tint},${a * 0.15})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    }
  } else if (S.glow && !geo) {
    const g = ctx.createRadialGradient(W, H, 0, W, H, Math.max(W, H) * 0.95);
    g.addColorStop(0, 'rgba(254,80,0,0.62)'); g.addColorStop(0.38, 'rgba(254,80,0,0.2)'); g.addColorStop(0.7, 'rgba(254,80,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // 3. Área de texto sólida (Panel y Franja)
  if (geo) {
    const p = geo.panel;
    ctx.fillStyle = S.bg; ctx.fillRect(p.x, p.y, p.w, p.h);
    if (!img) { // sin imagen, el área de imagen se pinta con el color de contraste
      ctx.fillStyle = S.block; ctx.fillRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    }
    if (L === 'franja') {
      ctx.fillStyle = tpl.style === 'naranja' ? '#FFFFFF' : '#FE5000';
      const t = Math.max(4, (strip ? 8 : 10 * u));
      if (strip) ctx.fillRect(p.x, 0, t, H); else ctx.fillRect(0, p.y, W, t);
    }
  }
  // 4. Trama del isotipo: sobre una foto recarga la pieza, así que solo va en el área de texto o en fondos lisos
  if (tpl.pattern && (geo || !img)) drawPattern(ctx, iso, S, geo ? geo.panel : { x: 0, y: 0, w: W, h: H }, strip);
  // 5. Marco
  if (frameT) {
    ctx.fillStyle = S.frame;
    ctx.fillRect(0, 0, W, frameT); ctx.fillRect(0, H - frameT, W, frameT); ctx.fillRect(0, 0, frameT, H); ctx.fillRect(W - frameT, 0, frameT, H);
  }
  // 6. Logo, sello y textos
  const logoW = hgt => hgt * logo.width / logo.height;
  const drawLogo = (x, y, hgt) => { if (tpl.showLogo) ctx.drawImage(logo, x, y, logoW(hgt), hgt); };
  const drawLogoPill = (x, y, hgt) => {
    if (!tpl.showLogo) return;
    const px = hgt * 0.5, py = hgt * 0.42, w = logoW(hgt) + px * 2, hh = hgt + py * 2;
    ctx.fillStyle = S.bg; roundRect(ctx, x, y, w, hh, hh * 0.24); ctx.fill();
    ctx.drawImage(logo, x + px, y + py, logoW(hgt), hgt);
  };
  const cornerBadge = () => {
    if (strip || L === 'destacado') return;
    const r = (shape === 'port' ? 120 : 100) * u;
    // Sobre el bloque de color de Panel y Franja, el sello toma el color del fondo para no confundirse
    const onBlock = geo && !img;
    drawBadge(ctx, onBlock ? { ...S, badge: S.bg, badgeInk: S.title } : S, W - m - r * 0.9, (story ? topSafe : m) + r * 0.9, r);
  };
  const sz = (sq, port, land) => (shape === 'square' ? sq : shape === 'port' ? port : land) * u;
  if (L === 'panel') {
    const p = geo.panel, pm = strip ? 40 : 72 * u, lh = strip ? 30 : 44 * u;
    if (strip) {
      drawLogo(p.x + p.w - pm - logoW(lh), p.y + p.h - pm - lh, lh);
      textBlock(ctx, S, { x: p.x + pm, w: p.w - 2 * pm, align: 'right', top: pm, titleSize: 44, maxLines: 2, tagSize: 18, textSize: 0, textLines: 0, ctaSize: 0 });
    } else {
      drawLogo(p.x + pm, p.y + pm, lh);
      textBlock(ctx, S, { x: p.x + pm, w: p.w - 2 * pm, align: 'left', bottom: p.y + p.h - pm, titleSize: sz(72, 96, 64), maxLines: 4, tagSize: sz(26, 26, 22), textSize: sz(28, 28, 24), textLines: shape === 'port' ? 3 : 4, ctaSize: sz(26, 26, 22) });
    }
    cornerBadge();
  } else if (L === 'franja') {
    const p = geo.panel;
    if (strip) {
      drawLogoPill(18, 18, 26);
      textBlock(ctx, S, { x: p.x + 48, w: p.w - 96, align: 'right', center: H / 2, titleSize: 52, maxLines: 2, tagSize: 18, textSize: 0, textLines: 0, ctaSize: 0 });
    } else {
      drawLogoPill(m * 0.6, story ? topSafe : m * 0.6, sz(40, 46, 40));
      const bottom = story && !hasFooter ? H - 220 * u : p.y + p.h;
      textBlock(ctx, S, { x: m, w: W - 2 * m, align: 'left', center: (p.y + bottom) / 2 + 4 * u, titleSize: sz(76, 96, 60), maxLines: shape === 'land' ? 2 : 3, tagSize: sz(28, 34, 22), textSize: sz(30, 36, 24), textLines: shape === 'port' ? 3 : 2, ctaSize: sz(28, 34, 22) });
      cornerBadge();
    }
  } else if (L === 'centrada') {
    if (strip) {
      const lh = 30;
      drawLogo(W - 40 - logoW(lh), H - 40 - lh, lh);
      textBlock(ctx, S, { x: W * 0.2, w: W * 0.6, align: 'center', center: H / 2 - 10, titleSize: 56, maxLines: 2, tagSize: 18, textSize: 0, textLines: 0, ctaSize: 0 });
    } else {
      const lh = sz(50, 50, 46);
      drawLogo(W / 2 - logoW(lh) / 2, story ? topSafe : 80 * u, lh);
      const mm = sz(110, 110, 260);
      textBlock(ctx, S, { x: mm, w: W - 2 * mm, align: 'center', center: H / 2 + sz(30, 40, 30), titleSize: sz(100, 120, 84), maxLines: 4, tagSize: sz(30, 30, 26), textSize: sz(32, 32, 28), textLines: 3, ctaSize: sz(30, 30, 26) });
      cornerBadge();
    }
  } else if (L === 'destacado') {
    if (strip) {
      drawLogo(W - 56 - logoW(34), H - 56 - 34, 34);
      textBlock(ctx, S, { x: W * 0.35, w: W * 0.65 - 56, align: 'right', bottom: H - 56 - 34 - 30, hiSize: 116, titleSize: 40, maxLines: 1, tagSize: 18, textSize: 0, textLines: 0, ctaSize: 0 });
    } else if (shape === 'land') {
      drawLogo(m, m, 48 * u);
      const r = 150 * u;
      drawBadge(ctx, S, W - m - r, H / 2 + 20 * u, r);
      textBlock(ctx, S, { x: m, w: W - 2 * m - (tpl.badge ? r * 2 + 40 * u : 0), align: 'left', bottom: H - m, hiSize: 190 * u, titleSize: 60 * u, maxLines: 2, tagSize: 20 * u, textSize: 24 * u, textLines: 2, ctaSize: 22 * u });
    } else {
      const port = shape === 'port', lh = sz(46, 54, 0), r = sz(110, 130, 0);
      drawLogo(m, topSafe, lh);
      drawBadge(ctx, S, W - m - r * 0.9, topSafe + r * 0.9, r);
      textBlock(ctx, S, { x: m, w: W - 2 * m, align: 'left', bottom: H - botSafe, hiSize: sz(210, 260, 0), titleSize: sz(72, 96, 0), maxLines: port ? 4 : 3, tagSize: sz(29, 35, 0), textSize: sz(30, 36, 0), textLines: port ? 3 : 2, ctaSize: sz(28, 34, 0) });
    }
  } else if (L === 'icono') {
    if (strip) {
      const r = 118, cx = W - 56 - r, cy = H / 2 + 14;
      drawIconCircle(ctx, S, cx, cy, r);
      drawLogo(W - 56 - logoW(28), 24, 28);
      textBlock(ctx, S, { x: W * 0.3, w: cx - r - 56 - W * 0.3, align: 'right', center: H / 2, titleSize: 52, maxLines: 2, tagSize: 18, textSize: 0, textLines: 0, ctaSize: 0 });
    } else if (shape === 'land') {
      drawLogo(m, m, 48 * u);
      const r = H * 0.3, cx = W * 0.27, cy = H / 2 + 24 * u;
      drawIconCircle(ctx, S, cx, cy, r);
      textBlock(ctx, S, { x: W * 0.47, w: W * 0.53 - m, align: 'left', center: H / 2 + 16 * u, titleSize: 72 * u, maxLines: 3, tagSize: 22 * u, textSize: 26 * u, textLines: 3, ctaSize: 24 * u });
      cornerBadge();
    } else {
      const port = shape === 'port', poster = tpl.format === 'a4';
      drawLogo(m, topSafe, sz(46, 54, 0));
      const r = poster ? 250 * u : sz(150, 190, 0);
      const cy = poster ? H * 0.3 : port ? H * 0.34 : H * 0.33;
      drawIconCircle(ctx, S, W / 2, cy, r);
      const mm = sz(100, 96, 0);
      textBlock(ctx, S, { x: mm, w: W - 2 * mm, align: 'center', top: cy + r + sz(56, 72, 0), titleSize: poster ? 124 * u : sz(84, 104, 0), maxLines: port ? 4 : 3, tagSize: sz(28, 34, 0), textSize: sz(30, 36, 0), textLines: 3, ctaSize: sz(28, 34, 0) });
      cornerBadge();
    }
  } else if (L === 'marco') {
    const t = frameT;
    if (strip) {
      drawLogoPill(t + 14, t + 14, 24);
      const bw = W * 0.5, pad = 28;
      const opts = { x: W - t - bw + pad, w: bw - pad * 2, align: 'left', titleSize: 46, maxLines: 2, tagSize: 17, textSize: 0, textLines: 0, ctaSize: 0 };
      const bh = textBlock(ctx, S, { ...opts, measure: true }) + pad * 2;
      ctx.fillStyle = S.bg; ctx.fillRect(W - t - bw, H - t - bh, bw, bh);
      textBlock(ctx, S, { ...opts, top: H - t - bh + pad });
    } else {
      drawLogoPill(t + 24 * u, story ? topSafe : t + 24 * u, sz(40, 46, 40));
      const bw = W * (shape === 'square' ? 0.76 : shape === 'port' ? 0.86 : 0.52), pad = sz(52, 60, 44);
      const opts = { x: t + pad, w: bw - pad * 2, align: 'left', titleSize: sz(76, 96, 58), maxLines: shape === 'land' ? 2 : 3, tagSize: sz(28, 34, 20), textSize: sz(30, 34, 22), textLines: shape === 'port' ? 3 : 2, ctaSize: sz(28, 32, 22) };
      const bh = textBlock(ctx, S, { ...opts, measure: true }) + pad * 2;
      const by = H - t - bh - (story && !hasFooter ? 200 * u : 0);
      ctx.fillStyle = S.bg; ctx.fillRect(t, by, bw, bh);
      textBlock(ctx, S, { ...opts, top: by + pad });
      cornerBadge();
    }
  } else { // clásica
    if (strip) { const mm = 56; drawLogo(W - mm - logoW(34), H - mm - 34, 34); textBlock(ctx, S, { x: W * 0.4, w: W * 0.6 - mm, align: 'right', bottom: H - mm - 34 - 34, titleSize: 64, maxLines: 2, tagSize: 19, textSize: 0, textLines: 0, ctaSize: 0 }); }
    else if (shape === 'land') { drawLogo(m, m, 48 * u); textBlock(ctx, S, { x: m, w: W * 0.42, align: 'left', bottom: H - m, titleSize: 60 * u, maxLines: 2, tagSize: 18 * u, textSize: 24 * u, textLines: 2, ctaSize: 22 * u }); }
    else if (shape === 'port') { drawLogo(m, topSafe, 54 * u); textBlock(ctx, S, { x: m, w: W - 2 * m, align: 'left', bottom: H - botSafe, titleSize: 116 * u, maxLines: 5, tagSize: 35 * u, textSize: 38 * u, textLines: 4, ctaSize: 34 * u }); }
    else { drawLogo(m, m, 46 * u); textBlock(ctx, S, { x: m, w: W - 2 * m, align: 'left', bottom: H - m, titleSize: 96 * u, maxLines: 4, tagSize: 29 * u, textSize: 32 * u, textLines: 3, ctaSize: 28 * u }); }
    cornerBadge();
  }
  // 7. Contacto y QR
  if (hasFooter) await drawFooter(ctx, TPL_STYLES[tpl.style], W, H, band, shape === 'land' ? 72 * u0 : m);
}
/* PDF de una página con la pieza como imagen JPEG (sin dependencias externas) */
function jpegPDF(jpeg, imgW, imgH, pageW, pageH) {
  const enc = new TextEncoder();
  const chunks = []; const offsets = []; let size = 0;
  const push = part => { const b = typeof part === 'string' ? enc.encode(part) : part; chunks.push(b); size += b.length; };
  const obj = (n, body) => { offsets[n] = size; push(`${n} 0 obj\n${body}\nendobj\n`); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = size;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg); push('\nendstream\nendobj\n');
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  const xref = size;
  push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
const escapeHTML = v => String(v || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function signatureHTML(f) {
  const logoUrl = new URL('media/descargas/png/logo-crisger.png', location.href).href;
  const name = escapeHTML(f.name || 'Nombre Apellido'), role = escapeHTML(f.role || 'Cargo');
  const phone = escapeHTML(f.phone || '+54 000 000-0000'), mail = escapeHTML(f.mail || 'nombre@empresa.com');
  const brand = escapeHTML([data.brand, data.descriptor, data.location].filter(Boolean).join(' · '));
  return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#000000"><tr>`
    + `<td style="padding:4px 18px 4px 0;border-right:3px solid #FE5000;vertical-align:middle"><img src="${logoUrl}" width="150" alt="${escapeHTML(data.brand)}" style="display:block;width:150px;height:auto;border:0"></td>`
    + `<td style="padding:4px 0 4px 18px;vertical-align:middle"><div style="font-size:15px;line-height:20px;font-weight:bold;color:#000000">${name}</div>`
    + `<div style="font-size:13px;line-height:18px;font-weight:bold;color:#44464B">${role}</div>`
    + `<div style="font-size:12px;line-height:18px;color:#44464B;padding-top:8px">${phone}<br><a href="mailto:${mail}" style="color:#44464B;text-decoration:none">${mail}</a><br>${brand}</div></td></tr></table>`;
}
function renderTemplates() {
  const wrap = h('div', { class: 'kit-templates reveal', id: 'plantillas' });
  wrap.append(h('h3', { class: 'kit-subtitle', text: 'Plantillas de uso rápido' }),
    h('p', { class: 'kit-intro', text: 'Piezas listas para usar: escribí el texto, elegí el formato y descargá. El sistema aplica colores, tipografías y logo según el manual.' }));
  // Generador de piezas
  const VIDEO_MAX_MB = 50;      // peso máximo del video de origen
  const CLIP_MAX_S = 15;        // duración máxima de la pieza exportada
  const CLIP_MIN_S = 3;
  const OUT_MAX_MB = 12;        // tope orientativo del archivo exportado
  const canvas = h('canvas', { class: 'tpl-canvas', role: 'img', 'aria-label': 'Vista previa de la pieza' });
  const status = h('span', { class: 'tpl-size' });
  let timer = 0, exporting = false, loopId = 0, drawing = false;
  const hasMedia = () => !!(tpl.image || tpl.video);
  const syncTools = () => {
    const F = TPL_FORMATS[tpl.format];
    status.textContent = `${F.label} · ${F.size} px${F.print ? ' · para imprimir' : ''}${tpl.video ? ` · video de ${tpl.clipLength} s` : ''}`;
    canvas.classList.toggle('is-draggable', hasMedia());
    imgTools.hidden = !hasMedia();
    videoTools.hidden = !tpl.video;
    exportBtn.hidden = quickVideo.hidden = !tpl.video || !!F.print;
    pdfBtns.forEach(b => { b.hidden = !F.print; });
    hiField.hidden = tpl.layout !== 'destacado';
    iconField.hidden = tpl.layout !== 'icono';
    contactFields.hidden = !tpl.contact;
    qrFields.hidden = !tpl.qr;
    stripNote.hidden = F.shape !== 'strip' || !(tpl.contact || tpl.qr);
    badgeNote.hidden = !(tpl.badge && F.shape === 'strip');
    segs.forEach(sync => sync());
  };
  const redraw = (delay = 60) => {
    if (tpl.video && !tpl.video.paused) { syncTools(); return; } // el bucle del video ya redibuja
    clearTimeout(timer); timer = setTimeout(async () => { await drawTemplate(canvas); syncTools(); }, delay);
  };
  // Bucle de vista previa del video: repite el tramo elegido
  const startLoop = () => {
    cancelAnimationFrame(loopId);
    const v = tpl.video; if (!v) return;
    const tick = async () => {
      if (tpl.video !== v) return;
      if (!exporting && v.currentTime >= tpl.clipStart + tpl.clipLength) v.currentTime = tpl.clipStart;
      if (!drawing) { drawing = true; await drawTemplate(canvas); drawing = false; }
      loopId = requestAnimationFrame(tick);
    };
    v.play().catch(() => {});
    loopId = requestAnimationFrame(tick);
  };
  const stopVideo = () => { cancelAnimationFrame(loopId); if (tpl.video) { tpl.video.pause(); URL.revokeObjectURL(tpl.video.src); } tpl.video = null; };
  // Datos de contacto guardados en este navegador
  const CONTACT_KEYS = ['contact', 'phone', 'web', 'address', 'qr', 'qrLink'];
  try { Object.assign(tpl, JSON.parse(localStorage.getItem('crisger-contacto') || '{}')); } catch { /* sin datos guardados */ }
  if (!tpl.address && data.location) tpl.address = data.location;
  const saveContact = () => { try { localStorage.setItem('crisger-contacto', JSON.stringify(Object.fromEntries(CONTACT_KEYS.map(k => [k, tpl[k]])))); } catch { /* sin acceso */ } };
  const fields = {};
  const input = (label, key, multiline, placeholder = '', opts = {}) => {
    const id = `tpl-${key}`;
    const el = h(multiline ? 'textarea' : 'input', { id, type: multiline ? undefined : (opts.type || 'text'), rows: multiline ? 3 : undefined, maxlength: multiline ? 180 : (opts.max || 70), placeholder });
    el.value = tpl[key];
    el.addEventListener('input', () => { tpl[key] = el.value; if (CONTACT_KEYS.includes(key)) saveContact(); markPreset(''); redraw(); syncTools(); });
    fields[key] = el;
    return h('div', { class: 'tpl-field' }, [h('label', { for: id, text: label }), el, opts.help ? h('small', { class: 'tpl-help', text: opts.help }) : null]);
  };
  const check = (label, key) => {
    const el = h('input', { type: 'checkbox', id: `tpl-${key}`, checked: tpl[key] });
    el.addEventListener('change', () => { tpl[key] = el.checked; if (CONTACT_KEYS.includes(key)) saveContact(); redraw(0); syncTools(); });
    fields[key] = el;
    return h('label', { class: 'tpl-check', for: `tpl-${key}` }, [el, label]);
  };
  // Grupos de opciones que se actualizan solos cuando un propósito cambia la estructura o el formato
  const segs = [];
  const seg = (label, options, key) => {
    const group = h('div', { class: 'segmented', role: 'group', 'aria-label': label }, options.map(([value, text]) =>
      h('button', { type: 'button', text, 'data-value': value, onclick: () => { tpl[key] = value; markPreset(''); redraw(0); syncTools(); } })));
    segs.push(() => $$('button', group).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === tpl[key]))));
    return h('div', { class: 'control' }, [h('span', { class: 'control-label', text: label }), group]);
  };
  // Propósitos
  const presetBar = h('div', { class: 'tpl-presets', role: 'group', 'aria-label': 'Empezar desde un propósito' });
  const markPreset = key => { tpl.preset = key; $$('button', presetBar).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === key))); };
  const applyPreset = (key, values) => {
    Object.assign(tpl, values);
    for (const k of ['tag', 'title', 'text', 'cta', 'highlight', 'badge']) if (fields[k]) fields[k].value = tpl[k];
    if (fields.icon) fields.icon.value = tpl.icon;
    markPreset(key); redraw(0); syncTools();
    toast('Textos cargados: editalos a tu gusto');
  };
  TPL_PRESETS.forEach(([key, label, values]) => presetBar.append(h('button', { type: 'button', 'data-value': key, 'aria-pressed': 'false', text: label, onclick: () => applyPreset(key, values) })));
  const markThumbs = name => $$('.tpl-thumb', wrap).forEach(t => t.setAttribute('aria-pressed', String(t.title === name)));
  const resetFraming = name => { tpl.zoom = 1; tpl.ox = 0; tpl.oy = 0; zoom.value = 100; zoomOut.textContent = '100%'; imgName.textContent = name; tpl.imageName = name; markThumbs(name); };
  // Imagen de fondo
  const setImage = async (src, name) => {
    try { const im = await loadImg(src); stopVideo(); tpl.image = im; resetFraming(name); redraw(0); }
    catch { toast('No se pudo cargar la imagen. Probá con JPG, PNG o WebP.'); }
  };
  // Video de fondo, con límites de peso y duración
  const setVideo = (src, name, bytes) => new Promise(resolve => {
    if (bytes && bytes > VIDEO_MAX_MB * 1024 * 1024) { toast(`El video pesa más de ${VIDEO_MAX_MB} MB. Usá uno más corto o comprimido.`); return resolve(false); }
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous'; v.src = src;
    v.onloadeddata = () => {
      stopVideo(); tpl.image = null; tpl.video = v; resetFraming(name);
      const d = v.duration || CLIP_MAX_S;
      tpl.clipLength = Math.max(CLIP_MIN_S, Math.min(CLIP_MAX_S, Math.floor(d), tpl.clipLength || 8));
      tpl.clipStart = 0;
      clipLen.max = Math.max(CLIP_MIN_S, Math.min(CLIP_MAX_S, Math.floor(d))); clipLen.value = tpl.clipLength; clipLenOut.textContent = `${tpl.clipLength} s`;
      clipStart.max = Math.max(0, Math.floor(d - tpl.clipLength)); clipStart.value = 0; clipStartOut.textContent = '0 s';
      clipStart.disabled = d <= tpl.clipLength;
      durInfo.textContent = `Video de ${d.toFixed(1)} s. Se exporta un tramo de hasta ${CLIP_MAX_S} s, sin sonido.`;
      syncTools(); startLoop(); resolve(true);
    };
    v.onerror = () => { toast('No se pudo leer el video. Probá con MP4 (H.264) o WebM.'); resolve(false); };
  });
  const handleFile = file => {
    if (!file) return;
    if (file.type.startsWith('video/')) setVideo(URL.createObjectURL(file), file.name, file.size);
    else setImage(URL.createObjectURL(file), file.name);
  };
  const upload = h('input', { type: 'file', accept: 'image/*,video/mp4,video/webm,video/quicktime', class: 'sr-only' });
  upload.addEventListener('change', () => { handleFile(upload.files?.[0]); upload.value = ''; });
  const thumbs = h('div', { class: 'tpl-thumbs', role: 'group', 'aria-label': 'Usar una maqueta del manual como fondo' },
    data.sections.flatMap(sx => sx.modules).filter(m => m.kind === 'showcase' && m.media).map(m =>
      h('button', { type: 'button', class: 'tpl-thumb', 'aria-pressed': 'false', title: m.title, 'aria-label': `Usar ${m.title} como fondo`, onclick: () => setImage(m.media, m.title) }, h('img', { src: m.media, alt: '', loading: 'lazy' }))));
  // Carpeta de Google Drive
  const driveBox = h('div', { class: 'tpl-drive' });
  const driveCfg = () => {
    const raw = String(data.drive?.folder || '').trim();
    const id = (raw.match(/folders\/([\w-]+)/) || raw.match(/[?&]id=([\w-]+)/) || [null, raw])[1];
    return { id, key: String(data.drive?.apiKey || '').trim() };
  };
  const loadDrive = async () => {
    const { id, key } = driveCfg();
    if (!id || !key) {
      driveBox.replaceChildren(h('p', { class: 'tpl-help', text: 'Google Drive todavía no está conectado. Se configura desde el editor (pestaña Portada → Google Drive).' }));
      return;
    }
    driveBox.replaceChildren(h('p', { class: 'tpl-help', text: 'Cargando la carpeta de Drive…' }));
    try {
      const q = encodeURIComponent(`'${id}' in parents and trashed = false`);
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink,size)&orderBy=createdTime%20desc&pageSize=60&supportsAllDrives=true&includeItemsFromAllDrives=true&key=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      const files = ((await res.json()).files || []).filter(f => /^(image|video)\//.test(f.mimeType));
      if (!files.length) { driveBox.replaceChildren(h('p', { class: 'tpl-help', text: 'La carpeta de Drive no tiene imágenes ni videos todavía.' })); return; }
      const grid = h('div', { class: 'tpl-thumbs' }, files.map(f => {
        const isVideo = f.mimeType.startsWith('video/');
        return h('button', { type: 'button', class: `tpl-thumb${isVideo ? ' is-video' : ''}`, 'aria-pressed': 'false', title: f.name, 'aria-label': `Usar ${f.name} de Drive como fondo${isVideo ? ' (video)' : ''}`, onclick: async e => {
          const btn = e.currentTarget;
          if (isVideo && Number(f.size) > VIDEO_MAX_MB * 1024 * 1024) { toast(`Ese video pesa más de ${VIDEO_MAX_MB} MB.`); return; }
          btn.classList.add('is-loading');
          try {
            const r = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(key)}`);
            if (!r.ok) throw new Error(r.status);
            const blobUrl = URL.createObjectURL(await r.blob());
            if (isVideo) await setVideo(blobUrl, f.name, Number(f.size)); else await setImage(blobUrl, f.name);
          } catch { toast('No se pudo descargar el archivo de Drive. Revisá que la carpeta esté compartida.'); }
          btn.classList.remove('is-loading');
        } }, f.thumbnailLink ? h('img', { src: f.thumbnailLink, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : h('span', { class: 'tpl-thumb-name', text: f.name }));
      }));
      driveBox.replaceChildren(grid, h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Actualizar carpeta', onclick: loadDrive }));
    } catch {
      driveBox.replaceChildren(h('p', { class: 'tpl-help', text: 'No se pudo leer la carpeta de Drive. Verificá que esté compartida como «Cualquier persona con el enlace» y que la clave sea correcta.' }),
        h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Reintentar', onclick: loadDrive }));
    }
  };
  // Encuadre, velo y tramo de video
  const imgName = h('span', { class: 'tpl-size' });
  const range = (id, min, max, value, unit, onInput) => {
    const el = h('input', { type: 'range', min, max, value, id });
    const out = h('output', { for: id, text: `${value}${unit}` });
    el.addEventListener('input', () => { out.textContent = `${el.value}${unit}`; onInput(Number(el.value)); });
    return [el, out];
  };
  const [zoom, zoomOut] = range('tpl-zoom', 100, 250, 100, '%', v => { tpl.zoom = v / 100; redraw(0); });
  const [shade, shadeOut] = range('tpl-shade', 0, 90, tpl.shade, '%', v => { tpl.shade = v; redraw(0); });
  const [clipStart, clipStartOut] = range('tpl-clip-start', 0, 0, 0, ' s', v => { tpl.clipStart = v; if (tpl.video) tpl.video.currentTime = v; });
  const [clipLen, clipLenOut] = range('tpl-clip-len', CLIP_MIN_S, CLIP_MAX_S, tpl.clipLength, ' s', v => {
    tpl.clipLength = v;
    const d = tpl.video?.duration || v;
    clipStart.max = Math.max(0, Math.floor(d - v)); if (tpl.clipStart > clipStart.max) { tpl.clipStart = Number(clipStart.max); clipStart.value = tpl.clipStart; clipStartOut.textContent = `${tpl.clipStart} s`; }
    clipStart.disabled = d <= v; syncTools();
  });
  const ctrl = (label, id, pair) => h('div', { class: 'control' }, [h('label', { class: 'control-label', for: id, text: label }), h('div', { class: 'range-row' }, pair)]);
  const durInfo = h('p', { class: 'tpl-help' });
  const videoTools = h('div', { class: 'tpl-videotools', hidden: true }, [ctrl('Inicio del tramo', 'tpl-clip-start', [clipStart, clipStartOut]), ctrl('Duración de la pieza', 'tpl-clip-len', [clipLen, clipLenOut]), durInfo]);
  const imgTools = h('div', { class: 'tpl-imgtools', hidden: true }, [
    h('div', { class: 'tpl-imgname' }, [imgName, h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Quitar fondo', onclick: () => { stopVideo(); tpl.image = null; tpl.imageName = ''; markThumbs(''); redraw(0); } })]),
    ctrl('Zoom', 'tpl-zoom', [zoom, zoomOut]), ctrl('Velo para el texto', 'tpl-shade', [shade, shadeOut]), videoTools,
    h('p', { class: 'tpl-help', text: 'Arrastrá el fondo en la vista previa para encuadrarlo.' })
  ]);
  // Arrastrar para encuadrar
  let drag = null;
  canvas.addEventListener('pointerdown', e => { if (!hasMedia() || exporting) return; drag = { x: e.clientX, y: e.clientY, ox: tpl.ox, oy: tpl.oy }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    tpl.ox = Math.max(-1, Math.min(1, drag.ox + (e.clientX - drag.x) / r.width));
    tpl.oy = Math.max(-1, Math.min(1, drag.oy + (e.clientY - drag.y) / r.height));
    redraw(0);
  });
  ['pointerup', 'pointercancel'].forEach(ev => canvas.addEventListener(ev, () => { drag = null; }));
  // Descargas
  const fileBase = () => `crisger-${tpl.format}-${tpl.layout}-${tpl.style}`;
  const saveBlob = (blob, name) => { const url = URL.createObjectURL(blob); const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); };
  const savePNG = () => canvas.toBlob(blob => { saveBlob(blob, `${fileBase()}.png`); toast(tpl.video ? 'Cuadro actual descargado en PNG' : 'Pieza descargada'); }, 'image/png');
  // MP4 solo si el navegador codifica en H.264 (el formato que aceptan todas las redes); si no, WebM
  const pickMime = () => ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.4D401F', 'video/mp4;codecs=avc1.42E01E', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  const exportVideo = async () => {
    const v = tpl.video; if (!v || exporting) return;
    const mime = pickMime();
    if (!mime || !canvas.captureStream) { toast('Este navegador no permite exportar video. Probá con Chrome o Edge actualizados.'); return; }
    exporting = true; cancelAnimationFrame(loopId); exportBtn.disabled = quickVideo.disabled = true;
    const label = exportBtn.lastChild;
    const F = TPL_FORMATS[tpl.format];
    // Tasa de bits calculada para que la pieza no supere el tope de peso
    const bits = Math.min(8_000_000, Math.floor(OUT_MAX_MB * 8 * 1024 * 1024 / tpl.clipLength * 0.9));
    try {
      v.pause(); v.currentTime = tpl.clipStart;
      await new Promise(r => { v.onseeked = () => { v.onseeked = null; r(); }; });
      await drawTemplate(canvas);
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bits });
      const chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise(r => { rec.onstop = r; });
      rec.start(250);
      await v.play();
      const t0 = performance.now(), total = tpl.clipLength * 1000;
      await new Promise(resolve => {
        const frame = async () => {
          const el = performance.now() - t0;
          label.textContent = `Exportando… ${Math.min(99, Math.round(el / total * 100))}%`;
          await drawTemplate(canvas);
          if (el >= total || v.ended) resolve(); else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      rec.stop(); await done; stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: mime.split(';')[0] });
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      saveBlob(blob, `${fileBase()}.${ext}`);
      toast(`Video exportado: ${(blob.size / 1024 / 1024).toFixed(1)} MB · ${tpl.clipLength} s · ${F.size}${ext === 'webm' ? ' · formato WebM' : ''}`);
    } catch { toast('No se pudo exportar el video.'); }
    exporting = false; exportBtn.disabled = quickVideo.disabled = false; label.textContent = 'Exportar video';
    v.currentTime = tpl.clipStart; startLoop();
  };
  const download = h('button', { type: 'button', class: 'btn btn-primary', onclick: savePNG }, [icon(ICONS.download), 'Descargar PNG']);
  // Cartel: PDF en A4 o A3 (mismas proporciones, se escala sin deformarse)
  const savePDF = async (label, pw, ph) => {
    await drawTemplate(canvas);
    canvas.toBlob(async blob => {
      const jpeg = new Uint8Array(await blob.arrayBuffer());
      saveBlob(jpegPDF(jpeg, canvas.width, canvas.height, pw, ph), `${fileBase()}-${label.toLowerCase()}.pdf`);
      toast(`Cartel descargado en PDF ${label}`);
    }, 'image/jpeg', 0.93);
  };
  const pdfBtns = [['A4', 595.28, 841.89], ['A3', 841.89, 1190.55]].map(([label, pw, ph]) =>
    h('button', { type: 'button', class: 'btn btn-primary', hidden: true, onclick: () => savePDF(label, pw, ph) }, [icon(ICONS.download), `PDF ${label}`]));
  const exportBtn = h('button', { type: 'button', class: 'btn btn-primary', hidden: true, onclick: exportVideo }, [icon(ICONS.download), 'Exportar video']);
  const quickVideo = h('button', { type: 'button', class: 'btn btn-small btn-primary', hidden: true, onclick: exportVideo }, [icon(ICONS.download), 'Exportar video']);
  const hiField = input('Destacado (precio o número)', 'highlight', false, 'Por ejemplo: $ 45.900 o +20 años', { max: 16 });
  const iconSelect = h('select', { id: 'tpl-icon' }, Object.keys(ICON_SET).map(n => h('option', { value: n, text: n })));
  iconSelect.value = tpl.icon;
  iconSelect.addEventListener('change', () => { tpl.icon = iconSelect.value; markPreset(''); redraw(0); });
  fields.icon = iconSelect;
  const iconField = h('div', { class: 'tpl-field' }, [h('label', { for: 'tpl-icon', text: 'Ícono' }), iconSelect]);
  const badgeNote = h('p', { class: 'tpl-help', hidden: true, text: 'En la portada de LinkedIn el sello no se muestra.' });
  const contactFields = h('div', { class: 'tpl-sub' }, [
    input('Teléfono o WhatsApp', 'phone', false, '+54 9 336 000-0000', { type: 'tel', max: 30 }),
    input('Sitio web o red social', 'web', false, 'crisger.com.ar', { max: 40 }),
    input('Dirección', 'address', false, 'Calle 000, ciudad', { max: 60 })
  ]);
  const qrFields = h('div', { class: 'tpl-sub' }, [
    input('Enlace del código QR', 'qrLink', false, 'https://…', { type: 'url', max: 300, help: 'Al escanearlo se abre este enlace. Probalo con el celular antes de imprimir.' }),
    h('div', { class: 'tpl-upload' }, [
      h('button', { type: 'button', class: 'btn btn-small btn-outline', text: 'Usar mi WhatsApp', onclick: () => {
        const link = waLink(tpl.phone);
        if (!link) { toast('Primero completá el teléfono con código de país y de área'); return; }
        tpl.qrLink = link; fields.qrLink.value = link; saveContact(); redraw(0);
      } }),
      h('button', { type: 'button', class: 'btn btn-small btn-outline', text: 'Usar el sitio web', onclick: () => {
        const w = String(tpl.web || '').trim();
        if (!w) { toast('Primero completá el sitio web'); return; }
        tpl.qrLink = /^https?:\/\//i.test(w) ? w : `https://${w}`; fields.qrLink.value = tpl.qrLink; saveContact(); redraw(0);
      } })
    ])
  ]);
  const stripNote = h('p', { class: 'tpl-help', hidden: true, text: 'La portada de LinkedIn es muy angosta para el contacto y el QR: elegí otro formato para mostrarlos.' });
  const step = (n, title, children) => h('div', { class: 'tpl-step' }, [h('span', { class: 'tpl-step-n', text: n }), h('div', { class: 'tpl-step-body' }, [h('strong', { class: 'tpl-step-title', text: title }), ...children])]);
  wrap.append(h('article', { class: 'kit-card tpl-card', id: 'generador' }, [
    h('div', { class: 'tpl-controls' }, [
      h('h4', { text: 'Piezas para redes y videollamadas' }),
      h('div', { class: 'tpl-start' }, [h('span', { class: 'control-label', text: 'Empezá por un propósito (opcional)' }), presetBar]),
      step('1', 'Formato y estructura', [
        seg('Formato', Object.entries(TPL_FORMATS).map(([k, f]) => [k, f.label]), 'format'),
        seg('Estructura', TPL_LAYOUTS, 'layout'),
        seg('Color', Object.entries(TPL_STYLES).map(([k, st]) => [k, st.label]), 'style')
      ]),
      step('2', 'Fondo: imagen o video (opcional)', [
        h('div', { class: 'tpl-upload' }, [h('label', { class: 'btn btn-small btn-outline file-button' }, [icon(ICONS.upload), 'Subir imagen o video', upload]),
          h('span', { class: 'tpl-help', text: `Videos de hasta ${VIDEO_MAX_MB} MB; se exportan tramos de ${CLIP_MIN_S} a ${CLIP_MAX_S} s.` })]),
        h('span', { class: 'control-label', text: 'Maquetas del manual' }), thumbs,
        h('span', { class: 'control-label', text: 'Carpeta de Google Drive' }), driveBox,
        imgTools
      ]),
      step('3', 'Textos y logo', [
        input('Etiqueta', 'tag'), hiField, input('Titular', 'title'), input('Texto', 'text', true), input('Botón (opcional)', 'cta', false, 'Por ejemplo: Consultanos'),
        iconField,
        input('Sello (opcional)', 'badge', false, 'Por ejemplo: Nuevo o -15%', { max: 12, help: 'Se muestra en un círculo en la esquina. No aparece en la portada de LinkedIn.' }), badgeNote,
        h('div', { class: 'tpl-checks' }, [check('Mostrar logo', 'showLogo'), check('Trama del isotipo', 'pattern')])
      ]),
      step('4', 'Contacto y código QR (opcional)', [
        h('div', { class: 'tpl-checks' }, [check('Datos de contacto', 'contact'), check('Código QR', 'qr')]),
        contactFields, qrFields, stripNote
      ]),
      h('div', { class: 'tpl-actions' }, [download, ...pdfBtns, exportBtn, status])
    ]),
    h('div', { class: 'tpl-preview' }, [canvas, h('div', { class: 'tpl-quick' }, [h('button', { type: 'button', class: 'btn btn-small btn-primary', onclick: savePNG }, [icon(ICONS.download), 'Descargar PNG']), quickVideo])])
  ]));
  loadDrive();
  // Firma de correo
  let sig = { name: '', role: '', phone: '', mail: '' };
  try { sig = { ...sig, ...JSON.parse(localStorage.getItem('crisger-firma') || '{}') }; } catch { /* sin datos guardados */ }
  const preview = h('div', { class: 'sig-preview' });
  const drawSig = () => { preview.innerHTML = signatureHTML(sig); try { localStorage.setItem('crisger-firma', JSON.stringify(sig)); } catch { /* sin acceso */ } };
  const sigField = (label, key, placeholder, type = 'text') => {
    const el = h('input', { id: `sig-${key}`, type, placeholder, value: sig[key] });
    el.addEventListener('input', () => { sig[key] = el.value; drawSig(); });
    return h('div', { class: 'tpl-field' }, [h('label', { for: `sig-${key}`, text: label }), el]);
  };
  const copySig = async () => {
    const html = signatureHTML(sig);
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([preview.innerText], { type: 'text/plain' }) })]);
    } catch {
      const range = document.createRange(); range.selectNodeContents(preview);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); document.execCommand('copy'); sel.removeAllRanges();
    }
    toast('Firma copiada: pegala en la configuración de tu correo');
  };
  wrap.append(h('article', { class: 'kit-card sig-card', id: 'firma' }, [
    h('div', { class: 'tpl-controls' }, [
      h('h4', { text: 'Firma de correo' }),
      h('div', { class: 'sig-grid' }, [sigField('Nombre y apellido', 'name', 'Nombre Apellido'), sigField('Cargo', 'role', 'Cargo'), sigField('Teléfono', 'phone', '+54 000 000-0000', 'tel'), sigField('Correo', 'mail', 'nombre@empresa.com', 'email')]),
      h('div', { class: 'tpl-actions' }, [
        h('button', { type: 'button', class: 'btn btn-primary', onclick: copySig }, [icon(ICONS.copy), 'Copiar firma']),
        h('button', { type: 'button', class: 'btn btn-outline', onclick: () => downloadBlob(`<!doctype html><meta charset="utf-8">${signatureHTML(sig)}`, 'crisger-firma.html', 'text/html') }, [icon(ICONS.download), 'Descargar HTML'])
      ]),
      h('p', { class: 'tpl-help', text: 'Copiá la firma y pegala en Gmail (Configuración → Firma) o en Outlook (Configuración → Correo → Firmas). El logo se carga desde el sitio publicado.' })
    ]),
    h('div', { class: 'sig-stage' }, [h('span', { class: 'tpl-size', text: 'Vista previa' }), preview])
  ]));
  // Documentos listos
  const k = data.kit;
  const doc = (id, title, text, links, extra = []) => h('article', { class: 'kit-card doc-card', id }, [h('h4', { text: title }), h('p', { text }),
    h('div', { class: 'kit-actions' }, [...links.filter(l => l[1]).map(([label, href]) => h('a', { class: 'btn btn-small btn-outline', href, download: fileName(href) }, [icon(ICONS.download), label])), ...extra])]);
  const lists = data.sections.filter(s => s.checklist.length);
  wrap.append(h('div', { class: 'kit-row kit-docs' }, [
    doc('membretada', 'Hoja membretada', 'Formato A4 con el logo, la línea naranja y los datos de la marca. En Word para escribir; en PDF para imprimir.', [['Word (.docx)', k.letterheadDocx], ['PDF', k.letterheadPdf]]),
    doc('manual-pdf', 'Manual en PDF', 'Una versión del manual para enviar a imprentas o proveedores. También podés imprimir esta página: el diseño se adapta solo.', [['Descargar PDF', k.manualPdf]]),
    lists.length ? doc('checklists', 'Checklist para proveedores', 'Todos los puntos a verificar antes de producir una pieza, en un solo archivo de texto para adjuntar a un pedido.', [],
      [h('button', { type: 'button', class: 'btn btn-small btn-outline', onclick: () => { downloadBlob(`${data.brand} · Checklist para proveedores · ${data.version}\n\n` + lists.map(checklistText).join('\n\n') + '\n', 'crisger-checklist.txt', 'text/plain'); toast('Checklist descargado'); } }, [icon(ICONS.download), 'Descargar TXT'])]) : null
  ]));
  requestAnimationFrame(() => { redraw(); drawSig(); syncTools(); });
  return wrap;
}

/* ---------- Modo presentación ---------- */
const pres = { on: false, i: 0, fs: false };
function presSteps() {
  return [$('#inicio'), ...$$('.chapter').flatMap(sec => [sec, ...$$(':scope > .chapter-body > *', sec)])].filter(Boolean);
}
function presLabel(step) {
  if (step.id === 'inicio') return 'Portada';
  const sec = step.closest('.chapter');
  if (sec?.id === 'kit') return data.kit.title;
  const s = data.sections.find(x => x.id === sec?.id);
  const title = step.matches('.chapter') ? '' : (step.querySelector('h3, figcaption strong')?.textContent || (step.matches('.gallery') ? 'Galería' : ''));
  return [s?.navLabel || s?.title, title].filter(Boolean).join(' · ');
}
function presGo(i) {
  const steps = presSteps();
  pres.i = Math.max(0, Math.min(steps.length - 1, i));
  const step = steps[pres.i];
  step.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  $('#presenterLabel').textContent = presLabel(step);
  $('#presenterCount').textContent = `${pres.i + 1} / ${steps.length}`;
  $('#presenterPrev').disabled = pres.i === 0;
  $('#presenterNext').disabled = pres.i === steps.length - 1;
}
function presNearest() {
  const steps = presSteps();
  let best = 0;
  steps.forEach((st, i) => { if (st.getBoundingClientRect().top <= window.innerHeight * 0.35) best = i; });
  return best;
}
async function presStart() {
  pres.on = true;
  document.documentElement.classList.add('presenting');
  $('#presenter').hidden = false;
  pres.fs = false;
  try { if (document.documentElement.requestFullscreen) { await document.documentElement.requestFullscreen(); pres.fs = true; } } catch { /* pantalla completa no disponible */ }
  presGo(presNearest());
  $('#presenterNext').focus({ preventScroll: true });
  toast(matchMedia('(pointer: coarse)').matches ? 'Deslizá hacia los costados o usá los botones para avanzar' : 'Usá las flechas o la barra espaciadora para avanzar · Esc para salir');
}
function presStop() {
  if (!pres.on) return;
  pres.on = false;
  document.documentElement.classList.remove('presenting');
  $('#presenter').hidden = true;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  measureHeader();
  $('#presentBtn').focus({ preventScroll: true });
}
function initPresenter() {
  $('#presentBtn').addEventListener('click', presStart);
  $('#presenterNext').addEventListener('click', () => presGo(pres.i + 1));
  $('#presenterPrev').addEventListener('click', () => presGo(pres.i - 1));
  $('#presenterExit').addEventListener('click', presStop);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && pres.on && pres.fs) presStop(); });
  document.addEventListener('keydown', e => {
    if (!pres.on || $('#lightbox').open || $('#editor').open || $('#search').open) return;
    const t = e.target;
    const typing = t.matches?.('input, textarea, select, [contenteditable], .pattern-track');
    if (e.key === 'Escape') { e.preventDefault(); presStop(); return; }
    if (typing && ['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !t.matches?.('button, a'))) { e.preventDefault(); presGo(pres.i + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); presGo(pres.i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); presGo(0); }
    else if (e.key === 'End') { e.preventDefault(); presGo(Infinity); }
  });
  let sx = 0, sy = 0;
  document.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!pres.on || e.target.closest('.pattern-track, .gallery-filters, .site-nav, dialog')) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) presGo(pres.i + (dx < 0 ? 1 : -1));
  }, { passive: true });
}

/* ---------- Visor ---------- */
function openLightbox(list, index, opener) {
  const entries = list.filter(m => m.media);
  if (!entries.length) return;
  lightboxList = entries;
  lightboxIndex = Math.max(0, Math.min(index, entries.length - 1));
  lightboxOpener = opener || document.activeElement;
  drawLightbox();
  const dlg = $('#lightbox');
  if (!dlg.open) dlg.showModal();
  document.documentElement.classList.add('modal-open');
  $('#lightboxClose').focus();
}
function drawLightbox(direction = 0) {
  const m = lightboxList[lightboxIndex];
  const img = $('#lightboxImg');
  img.classList.remove('loaded', 'from-right', 'from-left');
  if (direction) { void img.offsetWidth; img.classList.add(direction > 0 ? 'from-right' : 'from-left'); }
  img.onload = () => img.classList.add('loaded');
  img.src = m.media;
  img.alt = /mockup-/.test(m.media) ? `Maqueta conceptual: ${m.title}` : m.title;
  $('#lightboxTitle').textContent = m.title;
  $('#lightboxText').textContent = m.body || '';
  brandify($('#lightbox .lightbox-caption'));
  $('#lightboxCategory').textContent = m.category || (m.kind === 'essence' || /mockup-/.test(m.media) ? 'Maqueta conceptual' : 'Referencia');
  const multi = lightboxList.length > 1;
  $('#lightboxCount').textContent = multi ? `${pad2(lightboxIndex + 1)} / ${pad2(lightboxList.length)}` : '';
  $('#lightboxPrev').hidden = $('#lightboxNext').hidden = !multi;
  $('#lightboxPrev').disabled = lightboxIndex === 0;
  $('#lightboxNext').disabled = lightboxIndex === lightboxList.length - 1;
}
function stepLightbox(delta) {
  const n = lightboxIndex + delta;
  if (n < 0 || n >= lightboxList.length) return;
  lightboxIndex = n; drawLightbox(delta);
}
function initLightbox() {
  const dlg = $('#lightbox');
  $('#lightboxClose').addEventListener('click', () => dlg.close());
  $('#lightboxPrev').addEventListener('click', () => stepLightbox(-1));
  $('#lightboxNext').addEventListener('click', () => stepLightbox(1));
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.classList.contains('lightbox-body')) dlg.close(); });
  dlg.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
  });
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('modal-open');
    lightboxOpener?.focus?.({ preventScroll: true });
  });
  let sx = 0, sy = 0;
  dlg.addEventListener('touchstart', e => { sx = e.changedTouches[0].clientX; sy = e.changedTouches[0].clientY; }, { passive: true });
  dlg.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) stepLightbox(dx < 0 ? 1 : -1);
    else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) dlg.close();
  }, { passive: true });
}

/* ---------- Navegación, progreso y animaciones ---------- */
function measureHeader() {
  document.documentElement.style.setProperty('--header-h', `${$('#header').offsetHeight}px`);
}
let activeId = null;
// Secciones de la navegación: las del manual más el kit de descargas.
const navTargets = () => [...(data?.sections || []).map(s => [s.id, s.navLabel || s.title]), ...(data?.kit ? [['kit', 'Kit']] : [])];
function updateActiveNav() {
  const offset = $('#header').offsetHeight + window.innerHeight * 0.3;
  const targets = navTargets();
  let current = null;
  for (const [id] of targets) {
    const node = document.getElementById(id);
    if (node && node.getBoundingClientRect().top <= offset) current = id;
  }
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atBottom && targets.length) current = targets.at(-1)[0];
  if (current === activeId) return;
  activeId = current;
  requestAnimationFrame(moveIndicator);
  $$('#navList a').forEach(a => {
    const on = a.hash === `#${current}`;
    a.classList.toggle('active', on);
    if (on) {
      a.setAttribute('aria-current', 'true');
      const nav = $('#siteNav');
      if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: reduceMotion() ? 'auto' : 'smooth' });
    } else a.removeAttribute('aria-current');
  });
}
function moveIndicator() {
  const indicator = $('.nav-indicator');
  const link = $('#navList a.active');
  if (!indicator) return;
  if (!link) { indicator.classList.remove('on'); return; }
  const pad = parseFloat(getComputedStyle(link).paddingLeft) || 12;
  indicator.style.width = `${link.offsetWidth - pad * 2}px`;
  indicator.style.transform = `translateX(${link.parentElement.offsetLeft + pad}px)`;
  indicator.classList.add('on');
}
function parallax() {
  if (reduceMotion()) return;
  const vh = window.innerHeight;
  const hero = $('.hero-decor');
  if (hero && window.scrollY < vh * 1.2) hero.style.setProperty('--hero-py', `${window.scrollY * 0.25}px`);
  for (const img of $$('.feature-media img:not(.feature-badge), .media-button img')) {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    const progress = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
    img.style.setProperty('--py', `${(progress * -24).toFixed(1)}px`);
  }
}
function onScroll() {
  const root = document.documentElement;
  const max = Math.max(1, root.scrollHeight - root.clientHeight);
  $('#progress span').style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
  $('#backToTop').classList.toggle('visible', window.scrollY > window.innerHeight * 0.9);
  $('#backToTop').style.setProperty('--p', Math.min(1, window.scrollY / max).toFixed(3));
  parallax();
  $('#header').classList.toggle('scrolled', window.scrollY > 10);
  updateActiveNav();
}
function prepareReveals(root) {
  revealObserver?.disconnect();
  $$('.stagger').forEach(group => [...group.children].forEach((child, i) => child.style.setProperty('--i', Math.min(i, 14))));
  liveObserver?.disconnect();
  if ('IntersectionObserver' in window) {
    liveObserver = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { threshold: 0.15 });
    $$('.pattern-stage', root).forEach(st => liveObserver.observe(st));
  }
  const targets = [...$$('.reveal', root), ...$$('.footer .reveal')];
  if (ui.revealAll || !('IntersectionObserver' in window) || reduceMotion()) { targets.forEach(x => x.classList.add('in-view')); return; }
  document.documentElement.classList.add('js-reveal');
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach(x => revealObserver.observe(x));
}
function initNavigation() {
  let ticking = false;
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  window.addEventListener('resize', () => { measureHeader(); onScroll(); moveIndicator(); });
  $('#backToTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
    $('.header-logo').focus({ preventScroll: true });
  });
  // Anclas internas: desplazamiento suave y foco en la sección de destino.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', a.hash === '#inicio' ? location.pathname + location.search : a.hash);
    const focusTarget = target.matches('[tabindex]') ? target : target.querySelector('h1, h2');
    focusTarget?.setAttribute('tabindex', focusTarget.getAttribute('tabindex') || '-1');
    focusTarget?.focus({ preventScroll: true });
  });
}

/* ---------- Buscador ---------- */
const fold = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function triggerDownload(href) { const a = h('a', { href, download: fileName(href) }); document.body.append(a); a.click(); a.remove(); }
function goTo(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
  const focusTarget = target.matches('[tabindex]') ? target : target.querySelector('h2, h3, h4') || target;
  if (!focusTarget.matches('[tabindex], a, button, input')) focusTarget.setAttribute('tabindex', '-1');
  focusTarget.focus({ preventScroll: true });
}
function searchIndex() {
  const out = [];
  const add = (type, title, context, text, run) => out.push({ type, title, context, run, hay: fold(`${title} ${context} ${text}`), t: fold(title) });
  for (const s of data.sections) {
    const label = s.navLabel || s.title;
    add('Sección', s.title, s.kicker, `${label} ${s.lead} ${s.note}`, () => goTo(s.id));
    const showcases = s.modules.filter(m => m.kind === 'showcase');
    for (const m of s.modules) {
      if (m.kind === 'showcase') add('Aplicación', m.title, `${label} · ${m.category || 'Galería'}`, m.body, () => openLightbox(showcases, showcases.indexOf(m), null));
      else add('Bloque', m.title, label, `${m.body} ${m.items.join(' ')} ${m.note}`, () => goTo(blockAnchor(m)));
    }
    if (s.checklist.length) add('Checklist', `Checklist · ${label}`, 'Para proveedores', s.checklist.join(' '), () => goTo(`checklist-${s.id}`));
  }
  for (const c of data.palette) add('Color', c.name, `${c.hex} · copiar`, `${c.hex} ${c.hex.slice(1)} rgb ${c.rgb} cmyk ${c.cmyk} color paleta`, () => copyText(c.hex, c.hex));
  for (const [v, label] of LOGO_VARIANTS) for (const [bg, bgLabel] of LOGO_BGS) {
    const src = logoAsset(v, bg), png = pngFor(src);
    add('Logo', `${label} · fondo ${bgLabel.toLowerCase()}`, png ? 'Descargar SVG · PNG en el kit' : 'Descargar SVG', `logo ${v} ${bg} svg png descargar archivo`, () => { if (src.startsWith('data:')) goTo('kit-logos'); else triggerDownload(src); });
  }
  const k = data.kit;
  const tools = [
    ['Paquete de logos (ZIP)', 'Kit · descarga', 'zip todos los logos descargar', k.zip ? () => triggerDownload(k.zip) : null],
    ['Paleta en CSS y texto para imprenta', 'Kit', 'colores descargar css txt imprenta', () => goTo('kit-paleta')],
    ['Tipografías Bai Jamjuree e Inter', 'Kit', 'fuentes ttf descargar tipografia', () => goTo('kit-paleta')],
    ['Generador de piezas', 'Kit · plantillas', 'redes instagram linkedin historia publicacion videollamada fondo plantilla video png', () => goTo('generador')],
    ['Firma de correo', 'Kit · plantillas', 'mail email gmail outlook firma', () => goTo('firma')],
    ['Hoja membretada', 'Kit · Word y PDF', 'carta papel membrete docx', () => goTo('membretada')],
    ['Manual en PDF', 'Kit · descarga', 'imprimir imprenta proveedores pdf', () => goTo('manual-pdf')],
    ['Checklist completo', 'Kit · descarga', 'proveedores lista verificar txt', () => goTo('checklists')]
  ];
  for (const [title, context, text, run] of tools) if (run) add('Kit', title, context, text, run);
  return out;
}
const search = { index: [], results: [], active: 0, opener: null };
function runSearch(q) {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return search.index.filter(x => x.type === 'Sección' || x.type === 'Kit').slice(0, 14);
  return search.index
    .filter(x => terms.every(t => x.hay.includes(t)))
    .map(x => ({ x, score: terms.reduce((acc, t) => acc + (x.t.startsWith(t) ? 6 : x.t.includes(t) ? 3 : 1), 0) + (x.type === 'Sección' ? 1 : 0) }))
    .sort((a, b) => b.score - a.score).slice(0, 14).map(r => r.x);
}
function drawSearch() {
  const list = $('#searchResults');
  const q = $('#searchInput').value;
  search.results = runSearch(q);
  search.active = Math.min(search.active, Math.max(0, search.results.length - 1));
  list.replaceChildren(...search.results.map((r, i) => h('li', { id: `sr-${i}`, role: 'option', class: 'search-item', 'aria-selected': String(i === search.active),
    onclick: () => pickSearch(i), onmousemove: () => { if (search.active !== i) { search.active = i; markSearch(); } } }, [
    h('span', { class: 'search-type', text: r.type }),
    h('span', { class: 'search-text' }, [h('strong', { text: r.title }), h('small', { text: r.context })])
  ])));
  $('#searchEmpty').hidden = search.results.length > 0;
  $('#searchStatus').textContent = q ? `${search.results.length} ${search.results.length === 1 ? 'resultado' : 'resultados'}` : '';
  markSearch();
}
function markSearch() {
  $$('#searchResults li').forEach((li, i) => li.setAttribute('aria-selected', String(i === search.active)));
  const cur = $(`#sr-${search.active}`);
  $('#searchInput').setAttribute('aria-activedescendant', cur ? cur.id : '');
  cur?.scrollIntoView({ block: 'nearest' });
}
function pickSearch(i) {
  const r = search.results[i];
  if (!r) return;
  search.opener = null;
  $('#search').close();
  requestAnimationFrame(() => r.run());
}
function openSearch() {
  if (!data || $('#search').open) return;
  if ($('#lightbox').open || $('#editor').open) return;
  search.index = searchIndex();
  search.opener = document.activeElement;
  search.active = 0;
  $('#searchInput').value = '';
  drawSearch();
  $('#search').showModal();
  document.documentElement.classList.add('modal-open');
  $('#searchInput').focus();
}
function initSearch() {
  const dlg = $('#search');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  $('#searchKey').textContent = isMac ? '⌘K' : 'Ctrl K';
  $('#searchBtn').addEventListener('click', openSearch);
  $('#searchInput').addEventListener('input', () => { search.active = 0; drawSearch(); });
  $('#searchInput').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); search.active = Math.min(search.results.length - 1, search.active + 1); markSearch(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); search.active = Math.max(0, search.active - 1); markSearch(); }
    else if (e.key === 'Enter') { e.preventDefault(); pickSearch(search.active); }
  });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { document.documentElement.classList.remove('modal-open'); search.opener?.focus?.({ preventScroll: true }); });
  document.addEventListener('keydown', e => {
    const typing = e.target.matches?.('input, textarea, select, [contenteditable]');
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
    else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); openSearch(); }
  });
}

/* ---------- Tema claro u oscuro ---------- */
const THEME_KEY = 'crisger-theme';
const THEME_MODES = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };
function themePref() { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch { return 'auto'; } }
function applyTheme(pref = themePref()) {
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  const btn = $('#themeBtn');
  if (btn) {
    btn.dataset.mode = pref;
    btn.setAttribute('aria-label', `Tema: ${THEME_MODES[pref].toLowerCase()}. Cambiar tema`);
    btn.title = `Tema: ${THEME_MODES[pref]}`;
  }
}
function initTheme() {
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());
  $('#themeBtn').addEventListener('click', () => {
    const order = ['auto', 'dark', 'light'];
    const next = order[(order.indexOf(themePref()) + 1) % order.length];
    try { next === 'auto' ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, next); } catch { /* sin acceso */ }
    applyTheme(next);
    toast(`Tema ${THEME_MODES[next].toLowerCase()}${next === 'auto' ? ': sigue la configuración del dispositivo' : ''}`);
  });
}

/* ---------- Editor ---------- */
function field(host, label, value, change, opts = {}) {
  const id = `f-${Math.random().toString(36).slice(2, 9)}`;
  const input = h(opts.multiline ? 'textarea' : 'input', { id, rows: opts.rows || (opts.multiline ? 4 : undefined), placeholder: opts.placeholder || '' });
  input.value = value ?? '';
  if (opts.readonly) input.readOnly = true;
  input.addEventListener('input', () => change(input.value));
  host.append(h('div', { class: 'editor-field' }, [h('label', { for: id, text: label }), input, opts.help ? h('small', { text: opts.help }) : null]));
  return input;
}
function selectField(host, label, options, value, change) {
  const id = `s-${Math.random().toString(36).slice(2, 9)}`;
  const select = h('select', { id }, options.map(([v, t]) => h('option', { value: String(v), text: t })));
  select.value = String(value);
  select.addEventListener('change', () => change(select.value));
  host.append(h('div', { class: 'editor-field' }, [h('label', { for: id, text: label }), select]));
  return select;
}
function actionRow(host, buttons) {
  host.append(h('div', { class: 'row-actions' }, buttons.filter(Boolean).map(([title, action, variant = 'btn-ghost', disabled = false]) =>
    h('button', { type: 'button', class: `btn btn-small ${variant}`, text: title, onclick: action, disabled }))));
}
function group(host, title) { const box = h('fieldset', { class: 'editor-group' }, h('legend', { text: title })); host.append(box); return box; }
function edit(fn, delay) { fn(); save(); scheduleRender(delay); }
function structural(fn) { fn(); save(); render(); renderEditor(); }

async function fileToDataURL(file, { maxWidth = 1800, keepOriginal = false } = {}) {
  if (keepOriginal || file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
  }
  const bmp = await createImageBitmap(file);
  const factor = Math.min(1, maxWidth / bmp.width);
  const canvas = h('canvas', { width: Math.round(bmp.width * factor), height: Math.round(bmp.height * factor) });
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}
function mediaField(host, label, value, onChange, { onRestore, keepOriginal, previewBg } = {}) {
  const box = h('div', { class: 'media-field' });
  const preview = h('div', { class: `media-preview ${previewBg ? `bg-${previewBg}` : ''}` });
  const drawPreview = src => preview.replaceChildren(src ? h('img', { src, alt: '' }) : h('span', { text: 'Sin imagen' }));
  drawPreview(value);
  box.append(h('span', { class: 'media-label', text: label }), preview);
  const pathInput = field(box, 'Ruta del archivo', value && value.startsWith('data:') ? '' : value, v => { onChange(v.trim()); drawPreview(v.trim()); },
    { placeholder: value?.startsWith('data:') ? 'Imagen incrustada desde el editor' : 'media/archivo.webp' });
  const upload = h('input', { type: 'file', accept: 'image/*', class: 'sr-only' });
  upload.addEventListener('change', async () => {
    const file = upload.files?.[0]; if (!file) return;
    try {
      const url = await fileToDataURL(file, { keepOriginal });
      onChange(url); drawPreview(url); pathInput.value = ''; pathInput.placeholder = 'Imagen incrustada desde el editor';
      toast('Imagen actualizada');
    } catch { toast('No se pudo procesar la imagen'); }
    upload.value = '';
  });
  box.append(h('div', { class: 'row-actions' }, [
    h('label', { class: 'btn btn-small btn-outline file-button' }, ['Subir imagen', upload]),
    onRestore ? h('button', { type: 'button', class: 'btn btn-small btn-ghost', text: 'Restaurar', onclick: () => { const v = onRestore(); drawPreview(v); pathInput.value = v; } }) : null
  ]));
  host.append(box);
}

function renderEditor() {
  const host = $('#editorFields');
  host.replaceChildren();
  $$('.editor-tabs [role=tab]').forEach(b => { const on = b.dataset.tab === editorState.tab; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  const tab = editorState.tab;

  if (tab === 'general') {
    const g = group(host, 'Portada');
    field(g, 'Etiqueta del manual', data.heroLabel, v => edit(() => { data.heroLabel = v; }));
    field(g, 'Versión', data.version, v => edit(() => { data.version = v; }));
    field(g, 'Título de portada', data.heroTitle, v => edit(() => { data.heroTitle = v; }), { help: 'La última palabra se destaca en naranja.' });
    field(g, 'Texto de portada', data.heroText, v => edit(() => { data.heroText = v; }), { multiline: true });
    field(g, 'Ubicación', data.location, v => edit(() => { data.location = v; }));
    field(g, 'Texto del enlace', data.heroCta, v => edit(() => { data.heroCta = v; }));
    const b = group(host, 'Marca y cierre');
    field(b, 'Nombre de marca (texto alternativo del logo)', data.brand, v => edit(() => { data.brand = v; }));
    field(b, 'Descriptor', data.descriptor, v => edit(() => { data.descriptor = v; }));
    field(b, 'Texto de cierre', data.footerText, v => edit(() => { data.footerText = v; }), { multiline: true, rows: 2 });
    const k = group(host, 'Kit de marca (descargas)');
    field(k, 'Etiqueta', data.kit.kicker, v => edit(() => { data.kit.kicker = v; }));
    field(k, 'Título', data.kit.title, v => edit(() => { data.kit.title = v; }));
    field(k, 'Introducción', data.kit.lead, v => edit(() => { data.kit.lead = v; }), { multiline: true, rows: 3 });
    field(k, 'Nota', data.kit.note, v => edit(() => { data.kit.note = v; }), { multiline: true, rows: 2 });
    field(k, 'Archivo ZIP de logos', data.kit.zip, v => edit(() => { data.kit.zip = v.trim(); }), { help: 'Ruta dentro del repositorio. Dejalo vacío para ocultar el botón.' });
    field(k, 'Hoja membretada (Word)', data.kit.letterheadDocx, v => edit(() => { data.kit.letterheadDocx = v.trim(); }));
    field(k, 'Hoja membretada (PDF)', data.kit.letterheadPdf, v => edit(() => { data.kit.letterheadPdf = v.trim(); }));
    field(k, 'Manual en PDF', data.kit.manualPdf, v => edit(() => { data.kit.manualPdf = v.trim(); }));
    const gd = group(host, 'Google Drive (fondos para plantillas)');
    field(gd, 'Carpeta de Drive (enlace o ID)', data.drive.folder, v => edit(() => { data.drive.folder = v.trim(); }, 600), { help: 'La carpeta debe estar compartida como «Cualquier persona con el enlace».' });
    field(gd, 'Clave de API de Google', data.drive.apiKey, v => edit(() => { data.drive.apiKey = v.trim(); }, 600), { help: 'Clave restringida a la API de Google Drive y al dominio del sitio. Ver README.' });
  }

  if (tab === 'section') {
    editorState.si = Math.min(editorState.si, data.sections.length - 1);
    selectField(host, 'Sección', data.sections.map((s, i) => [i, `${pad2(i + 1)} · ${s.navLabel || s.title}`]), editorState.si, v => { editorState.si = Number(v); editorState.mi = 0; renderEditor(); });
    const s = data.sections[editorState.si];
    if (s) {
      const g = group(host, 'Textos de la sección');
      field(g, 'Nombre en la navegación', s.navLabel, v => edit(() => { s.navLabel = v; }));
      field(g, 'Número y categoría', s.kicker, v => edit(() => { s.kicker = v; }));
      field(g, 'Título', s.title, v => edit(() => { s.title = v; }));
      field(g, 'Introducción', s.lead, v => edit(() => { s.lead = v; }), { multiline: true, rows: 3 });
      field(g, 'Nota', s.note, v => edit(() => { s.note = v; }), { multiline: true, rows: 2 });
      selectField(g, 'Fondo', THEMES, s.theme, v => edit(() => { s.theme = v; }, 0));
      field(g, 'Checklist para proveedores', s.checklist.join('\n'), v => edit(() => { s.checklist = v.split('\n').map(x => x.trim()).filter(Boolean); }), { multiline: true, rows: 4, help: 'Una línea por punto a verificar. Dejalo vacío para ocultar el checklist.' });
      field(g, 'Ancla (id)', s.id, () => {}, { readonly: true, help: 'Identificador fijo del enlace: #' + s.id });
      actionRow(host, [
        ['↑ Subir', () => move(data.sections, editorState.si, -1, 'si'), 'btn-ghost', editorState.si === 0],
        ['↓ Bajar', () => move(data.sections, editorState.si, 1, 'si'), 'btn-ghost', editorState.si === data.sections.length - 1],
        ['+ Nueva sección', () => structural(() => {
          data.sections.splice(editorState.si + 1, 0, { id: `seccion-${Date.now().toString(36)}`, kicker: 'Nueva sección', navLabel: 'Nueva', title: 'Nueva sección', lead: '', note: '', theme: 'white', modules: [] });
          editorState.si++; data = normalize(data);
        }), 'btn-outline'],
        ['Eliminar sección', () => {
          if (data.sections.length < 2 || !confirm(`¿Eliminar la sección «${s.title}» y todo su contenido?`)) return;
          structural(() => { data.sections.splice(editorState.si, 1); editorState.si = Math.max(0, editorState.si - 1); });
        }, 'btn-danger']
      ]);
    }
  }

  if (tab === 'module') {
    editorState.si = Math.min(editorState.si, data.sections.length - 1);
    selectField(host, 'Sección', data.sections.map((s, i) => [i, `${pad2(i + 1)} · ${s.navLabel || s.title}`]), editorState.si, v => { editorState.si = Number(v); editorState.mi = 0; renderEditor(); });
    const s = data.sections[editorState.si];
    if (!s) return;
    editorState.mi = Math.min(editorState.mi, Math.max(0, s.modules.length - 1));
    if (s.modules.length) selectField(host, 'Bloque', s.modules.map((m, i) => [i, `${pad2(i + 1)} · ${m.title}`]), editorState.mi, v => { editorState.mi = Number(v); renderEditor(); });
    const m = s.modules[editorState.mi];
    if (m) {
      const g = group(host, 'Contenido del bloque');
      selectField(g, 'Formato', KINDS, m.kind, v => structural(() => { m.kind = v; }));
      field(g, 'Título', m.title, v => edit(() => { m.title = v; }));
      field(g, 'Texto', m.body, v => edit(() => { m.body = v; }), { multiline: true, rows: 5 });
      const listHelp = {
        incorrect: 'Cada línea genera un ejemplo. Palabras clave: color, contorno, forma, volumen, sombra, reflejar, comprimir, expandir, rotar.',
        patterns: 'Una línea por patrón. Los diseños se alternan: trama técnica y ritmo alternado.',
        contrast: 'Líneas: 1 etiqueta, 2 titular, 3 texto, 4 acento.',
        'type-scale': 'Una línea por nivel: «Referencia — Texto de ejemplo».',
        essence: 'Cada línea se muestra como un concepto.',
        dos: 'Empezá cada línea con «Sí:» o «No:» para ubicarla en la columna correspondiente.',
        icons: `Una línea por ícono. Disponibles: ${Object.keys(ICON_SET).join(', ')}.`
      }[m.kind];
      field(g, 'Lista (una línea por elemento)', m.items.join('\n'), v => edit(() => { m.items = v.split('\n').map(x => x.trim()).filter(Boolean); }), { multiline: true, rows: 4, help: listHelp });
      field(g, m.kind === 'feature' ? 'Etiqueta' : 'Nota', m.note, v => edit(() => { m.note = v; }), { multiline: true, rows: 2 });
      if (['showcase', 'feature'].includes(m.kind)) field(g, 'Categoría de galería', m.category || '', v => edit(() => { m.category = v; }));
      if (!GENERATED.has(m.kind) || m.kind === 'clearspace') {
        mediaField(g, m.kind === 'clearspace' ? 'Imagen de referencia' : 'Imagen', m.media, v => edit(() => { m.media = v; }, 400), {
          onRestore: () => { const src = original.sections.flatMap(x => x.modules).find(x => x.id === m.id); m.media = src?.media || ''; save(); render(); return m.media; }
        });
      } else {
        g.append(h('p', { class: 'helper', text: m.kind === 'logo' || m.kind === 'type-logo' ? 'Este ejemplo usa los archivos definidos en la pestaña Logos.' : 'Este ejemplo se genera con los datos y estilos del manual.' }));
      }
      actionRow(host, [
        ['↑ Subir', () => move(s.modules, editorState.mi, -1, 'mi'), 'btn-ghost', editorState.mi === 0],
        ['↓ Bajar', () => move(s.modules, editorState.mi, 1, 'mi'), 'btn-ghost', editorState.mi === s.modules.length - 1],
        ['Duplicar', () => structural(() => { const copy = clone(m); copy.id = `${m.id}-copia-${Date.now().toString(36)}`; copy.title += ' (copia)'; s.modules.splice(editorState.mi + 1, 0, copy); editorState.mi++; }), 'btn-ghost'],
        ['Eliminar bloque', () => { if (!confirm(`¿Eliminar el bloque «${m.title}»?`)) return; structural(() => { s.modules.splice(editorState.mi, 1); editorState.mi = Math.max(0, editorState.mi - 1); }); }, 'btn-danger']
      ]);
    } else host.append(h('p', { class: 'helper', text: 'Esta sección todavía no tiene bloques.' }));
    actionRow(host, [['+ Agregar bloque', () => structural(() => {
      const isGallery = s.modules.some(x => x.kind === 'showcase');
      s.modules.splice(editorState.mi + 1, 0, { id: `bloque-${Date.now().toString(36)}`, title: 'Nuevo bloque', body: '', media: '', note: '', items: [], kind: isGallery ? 'showcase' : 'standard', ...(isGallery ? { category: 'Otras' } : {}) });
      editorState.mi = s.modules.length === 1 ? 0 : editorState.mi + 1;
    }), 'btn-outline']]);
  }

  if (tab === 'palette') {
    host.append(h('p', { class: 'helper', text: 'El primer color define el acento de toda la interfaz. Los ejemplos de contraste y degradados usan los colores de marca.' }));
    data.palette.forEach((c, i) => {
      const g = group(host, `${pad2(i + 1)} · ${c.name}`);
      const pick = h('input', { type: 'color', value: isHex(c.hex) ? c.hex.toLowerCase() : '#000000', 'aria-label': `Selector de color para ${c.name}` });
      g.append(h('div', { class: 'color-row' }, [pick]));
      const hexInput = field(g, 'HEX', c.hex, v => { if (isHex(v)) { edit(() => { c.hex = v.toUpperCase(); }); pick.value = v.toLowerCase(); } }, { help: 'Formato #RRGGBB' });
      pick.addEventListener('input', () => { hexInput.value = pick.value.toUpperCase(); edit(() => { c.hex = pick.value.toUpperCase(); }); });
      field(g, 'Nombre', c.name, v => edit(() => { c.name = v; }));
      field(g, 'RGB', c.rgb, v => edit(() => { c.rgb = v; }));
      field(g, 'CMYK', c.cmyk, v => edit(() => { c.cmyk = v; }));
      actionRow(g, [
        ['↑', () => move(data.palette, i, -1), 'btn-ghost', i === 0],
        ['↓', () => move(data.palette, i, 1), 'btn-ghost', i === data.palette.length - 1],
        ['Eliminar', () => { if (data.palette.length < 2 || !confirm(`¿Eliminar ${c.name}?`)) return; structural(() => data.palette.splice(i, 1)); }, 'btn-danger']
      ]);
    });
    actionRow(host, [['+ Agregar color', () => structural(() => data.palette.push({ name: 'Nuevo color', hex: '#888888', rgb: '136, 136, 136', cmyk: '' })), 'btn-outline']]);
  }

  if (tab === 'logos') {
    host.append(h('p', { class: 'helper', text: 'Cada versión tiene un archivo para fondo claro, oscuro y naranja. Usá PNG o SVG con transparencia.' }));
    LOGO_VARIANTS.forEach(([v, label]) => {
      const g = group(host, label);
      LOGO_BGS.forEach(([bg, bgLabel]) => mediaField(g, `Fondo ${bgLabel.toLowerCase()}`, data.logos[v][bg], val => edit(() => { data.logos[v][bg] = val; }, 300), {
        keepOriginal: true, previewBg: bg,
        onRestore: () => { data.logos[v][bg] = original.logos?.[v]?.[bg] || ''; save(); render(); return data.logos[v][bg]; }
      }));
    });
  }
}
function move(arr, index, delta, key) {
  const next = index + delta;
  if (next < 0 || next >= arr.length) return;
  structural(() => { [arr[index], arr[next]] = [arr[next], arr[index]]; if (key) editorState[key] = next; });
}
function initEditor() {
  const dlg = $('#editor');
  let opener = null;
  $('#editEntry').addEventListener('click', e => {
    opener = e.currentTarget; ui.revealAll = true; document.documentElement.classList.add('editing'); render();
    dlg.showModal(); document.documentElement.classList.add('modal-open');
    renderEditor(); $('#closeEditor').focus();
  });
  $('#closeEditor').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { clearTimeout(renderTimer); render(); document.documentElement.classList.remove('modal-open', 'editing'); opener?.focus({ preventScroll: true }); });
  const tabs = $$('.editor-tabs [role=tab]');
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => { editorState.tab = b.dataset.tab; renderEditor(); });
    b.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      n.click(); n.focus();
    });
  });
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: 'data.json' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('data.json exportado');
  });
  $('#importFile').addEventListener('change', async e => {
    try {
      const parsed = JSON.parse(await e.target.files[0].text());
      if (!validate(parsed)) throw new Error('invalid');
      structural(() => { data = normalize(parsed); editorState.si = editorState.mi = 0; });
      toast('Contenido importado');
    } catch { toast('El archivo no tiene el formato de data.json'); }
    e.target.value = '';
  });
  $('#resetBtn').addEventListener('click', async () => {
    if (!confirm('¿Descartar los cambios locales y cargar la versión publicada?')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin acceso */ }
    hideLocalNotice();
    try { original = normalize(await fetchData()); } catch { /* conserva la copia cargada */ }
    data = clone(original); editorState.si = editorState.mi = 0;
    render(); renderEditor(); updateEditBadge();
    toast('Versión publicada restaurada');
  });
}

/* ---------- Inicio ---------- */
async function fetchData() {
  const res = await fetch('data.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
function initEditMode() {
  // El botón «Editar contenido» solo aparece al abrir el sitio con ?editar (queda recordado en este navegador).
  // Para ocultarlo otra vez: ?editar=0
  const params = new URLSearchParams(location.search);
  try {
    if (params.has('editar')) {
      if (params.get('editar') === '0') localStorage.removeItem('crisger-editor');
      else localStorage.setItem('crisger-editor', '1');
    }
    $('#editEntry').hidden = localStorage.getItem('crisger-editor') !== '1';
  } catch { $('#editEntry').hidden = !params.has('editar'); }
}
(async function init() {
  document.documentElement.classList.add('intro');
  setTimeout(() => document.documentElement.classList.remove('intro'), 3200);
  initNavigation();
  initLightbox();
  initEditor();
  initEditMode();
  initPresenter();
  initSearch();
  initTheme();
  // Al imprimir o guardar como PDF: carga todas las imágenes y muestra todo el contenido.
  window.addEventListener('beforeprint', () => {
    $$('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
    $$('.reveal').forEach(el => el.classList.add('in-view'));
  });
  try {
    original = normalize(await fetchData());
  } catch {
    $('#main').replaceChildren(h('div', { class: 'load-error' }, [
      h('h1', { text: 'No se pudo cargar el manual' }),
      h('p', { text: 'Abrí el sitio desde GitHub Pages o desde un servidor local (por ejemplo, python -m http.server). Los navegadores bloquean data.json cuando se abre el archivo directamente.' })
    ]));
    return;
  }
  data = clone(original);
  let notice = null;
  try {
    localStorage.removeItem('crisger-landing-v6'); // copia de la versión anterior del sitio
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    const savedData = stored && stored.data ? stored.data : stored; // admite el formato anterior
    const base = stored && stored.data ? stored.base : null;
    if (validate(savedData)) {
      const local = normalize(savedData);
      if (fingerprint(local) === fingerprint(original)) localStorage.removeItem(STORAGE_KEY);
      else { data = local; notice = base === fingerprint(original) ? 'local' : 'outdated'; }
    }
  } catch { /* datos locales dañados: se usa la versión publicada */ }
  render();
  if (notice) showLocalNotice(notice === 'outdated');
  onScroll();
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
  document.fonts?.ready.then(() => { measureHeader(); onScroll(); });
})();
