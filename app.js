/* CRISGER · Manual de marca interactivo
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
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14'
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
  ['type-display', 'Muestra Bai Jamjuree'], ['type-body', 'Muestra Inter'], ['type-scale', 'Jerarquía tipográfica']
];
const GENERATED = new Set(['logo', 'clearspace', 'incorrect', 'patterns', 'palette', 'tints', 'contrast', 'type-logo', 'type-display', 'type-scale']);
const WIDE = new Set(['incorrect', 'patterns', 'palette', 'tints', 'contrast', 'type-display', 'type-scale']);
const ITEMS_INTERNAL = new Set(['incorrect', 'patterns', 'contrast', 'type-scale', 'essence']);
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
  d.brand ||= 'CRISGER';
  d.heroLabel ||= 'Manual de marca';
  d.heroCta ||= 'Explorar el manual';
  d.logos ||= {};
  for (const [v] of LOGO_VARIANTS) { d.logos[v] ||= {}; for (const [b] of LOGO_BGS) d.logos[v][b] ||= ''; }
  d.palette = d.palette.filter(c => c && typeof c === 'object').map(c => ({ name: c.name || 'Color', hex: isHex(c.hex) ? c.hex.toUpperCase() : '#888888', rgb: c.rgb || '', cmyk: c.cmyk || '' }));
  d.sections.forEach((s, i) => {
    s.id = safeId(s.id || `seccion-${i + 1}`);
    s.kicker ??= ''; s.lead ??= ''; s.note ??= ''; s.navLabel ||= s.title;
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
  list.replaceChildren(...data.sections.map(s => h('li', {}, h('a', { href: `#${s.id}`, text: s.navLabel || s.title }))), h('li', { class: 'nav-indicator', 'aria-hidden': 'true' }));
  activeId = null;

  const main = $('#main');
  main.replaceChildren(renderHero(), ...data.sections.map((s, i) => renderSection(s, i)));
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
      h('img', { class: 'hero-logo', src: logoAsset('principal', 'oscuro'), alt: [data.brand, data.descriptor].filter(Boolean).join(' · '), width: 730, height: 120 }),
      h('p', { class: 'hero-label' }, [h('span', { text: data.heroLabel }), h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { text: `Versión ${data.version}` })]),
      splitWords(h('h1', { id: 'heroTitle' }), [...words, last].join(' '), { emLast: true }),
      h('p', { class: 'hero-text', text: data.heroText })
    ]),
    h('div', { class: 'hero-bottom' }, [
      h('span', { class: 'hero-location' }, [h('b', { text: data.descriptor }), h('span', { text: data.location })]),
      h('a', { class: 'hero-cta', href: `#${firstSection}` }, [h('span', { text: data.heroCta }), h('b', { class: 'cta-icon' }, icon(ICONS.down))])
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
  sec.append(body);
  return sec;
}

function moduleNumber(s, i) {
  const base = String(s.kicker || '').split('·')[0].trim();
  return `${/^\d+$/.test(base) ? base : pad2(data.sections.indexOf(s) + 1)}.${pad2(i + 1)}`;
}

function renderModule(s, m, i) {
  if (m.kind === 'feature') return renderFeature(m);
  const wide = WIDE.has(m.kind);
  const article = h('article', { class: `module kind-${m.kind} ${wide ? 'is-wide' : 'is-split'} reveal`, id: `bloque-${safeId(m.id)}` });
  const copy = h('div', { class: 'module-copy' }, [
    h('span', { class: 'module-number', text: moduleNumber(s, i) }),
    h('h3', { text: m.title }),
    m.body ? h('p', { class: 'module-body', text: m.body }) : null
  ]);
  if (m.items.length && !ITEMS_INTERNAL.has(m.kind)) copy.append(h('ul', { class: 'module-list stagger' }, m.items.map(x => h('li', { text: x }))));
  if (m.note) copy.append(h('p', { class: 'module-note', text: m.note }));
  const visual = h('div', { class: 'module-visual' });
  const renderers = {
    logo: renderLogoDemo, clearspace: renderClearspace, incorrect: renderIncorrect, patterns: renderPatterns,
    palette: renderPalette, tints: renderToneLab, contrast: renderContrast, 'type-logo': renderTypeLogo,
    'type-display': renderTypeDisplay, 'type-body': renderTypeBody, 'type-scale': renderTypeScale, essence: renderImage
  };
  (renderers[m.kind] || renderImage)(visual, m);
  if (!visual.childNodes.length) visual.classList.add('is-empty');
  if (i % 2 === 1 && !wide) article.classList.add('reverse');
  article.append(copy, visual);
  if (m.kind === 'essence' && m.items.length) {
    article.append(h('ol', { class: 'concepts stagger' }, m.items.map((item, n) =>
      h('li', { class: 'concept' }, [h('span', { text: pad2(n + 1) }), h('strong', { text: item })]))));
  }
  return article;
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
  const download = h('a', { class: 'btn btn-small btn-outline', download: '' }, [icon(ICONS.download), 'Descargar archivo']);
  const range = h('input', { type: 'range', min: 25, max: 100, value: ui.logoScale, id: 'logoScale' });
  const out = h('output', { for: 'logoScale', text: `${ui.logoScale}%` });
  function draw() {
    const src = logoAsset(ui.logoVariant, ui.logoBg);
    stage.className = `logo-stage bg-${ui.logoBg} v-${ui.logoVariant}`;
    stage.style.setProperty('--scale', ui.logoScale / 100);
    const label = LOGO_VARIANTS.find(v => v[0] === ui.logoVariant)?.[1] || '';
    const bgLabel = LOGO_BGS.find(v => v[0] === ui.logoBg)?.[1] || '';
    stage.replaceChildren(h('img', { src, alt: `Logo CRISGER, versión ${label.toLowerCase()} sobre fondo ${bgLabel.toLowerCase()}` }),
      h('span', { class: 'stage-tag', text: `${label} · fondo ${bgLabel.toLowerCase()}` }));
    file.textContent = src.startsWith('data:') ? 'Imagen cargada desde el editor' : src;
    download.href = src;
    download.setAttribute('download', src.startsWith('data:') ? `crisger-${ui.logoVariant}-${ui.logoBg}.${src.startsWith('data:image/svg') ? 'svg' : 'png'}` : src.split('/').pop());
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
      h('img', { src: logoAsset(ui.clearVariant, 'claro'), alt: `Espacio de protección alrededor del logo CRISGER, versión ${ui.clearVariant}` })
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
  const choices = data.palette.filter(c => !['#000000', '#FFFFFF', '#F2F2F2'].includes(c.hex.toUpperCase()));
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
    result.replaceChildren(...[['Matices', '#FFFFFF', 'Base mezclada con blanco'], ['Tonos', '#000000', 'Base mezclada con negro']].map(([name, target, desc]) => {
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
    orange: { label: 'Naranja', bg: P.orange, title: P.black, text: P.black, accent: P.white, accentInk: P.black, ref: P.orange },
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
    h('div', { class: 'type-logo-stage' }, h('img', { src: logoAsset('logotipo', 'claro'), alt: 'Logotipo CRISGER, archivo original' })),
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
function updateActiveNav() {
  const offset = $('#header').offsetHeight + window.innerHeight * 0.3;
  let current = null;
  for (const s of data?.sections || []) {
    const node = document.getElementById(s.id);
    if (node && node.getBoundingClientRect().top <= offset) current = s.id;
  }
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atBottom && data?.sections.length) current = data.sections.at(-1).id;
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
        essence: 'Cada línea se muestra como un concepto.'
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
(async function init() {
  document.documentElement.classList.add('intro');
  setTimeout(() => document.documentElement.classList.remove('intro'), 3200);
  initNavigation();
  initLightbox();
  initEditor();
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
