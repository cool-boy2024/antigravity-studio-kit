// Antigravity Studio Kit · 120fps+ Desk Companion + Context Ring + Gemini Pulse + Inline Side-Reply + i18n Engine
// Injected by dist/custom-theme-main.js on dom-ready inside an outer IIFE providing:
//   AGY_PHRASES, AGY_TELEMETRY_PORT, and optional AGY_TELEMETRY_TOKEN.

const POSES = __HAKIMI_POSES__;
const AGY_THEMES = __AGY_THEMES__;
const THEME_STORE = 'agy-theme-mode:v1';
const MUSE_COLLAPSED_STORE = 'agy-hakimi-collapsed:v1';
const VALID_THEMES = ['codex', 'claude', 'google', 'off'];

const THEME_META = {
  codex:  { dot: '#111113', darkDot: '#f3f3f6', label: '极简工作台', desc: '极简工作台' },
  claude: { dot: '#c96442', darkDot: '#e08261', label: '暖纸书房',   desc: '暖纸书房' },
  google: { dot: '#1a73e8', darkDot: '#8ab4f8', label: '晨光画布',   desc: '晨光画布' },
  off:    { dot: '#8e9299', darkDot: '#a1a1aa', label: '原生界面',   desc: '原生界面' }
};

function readThemeMode() {
  try {
    const v = localStorage.getItem(THEME_STORE);
    return VALID_THEMES.includes(v) ? v : 'google';
  } catch (_) {
    return 'google';
  }
}

function isDarkMode() {
  return Boolean(document.body && document.body.classList.contains('theme-dark'));
}

function syncDarkAttribute() {
  const dark = isDarkMode() ? '1' : '0';
  if (document.documentElement.getAttribute('data-agy-dark') !== dark) {
    document.documentElement.setAttribute('data-agy-dark', dark);
    updateThemeButtonUI(readThemeMode());
    syncPulseSurface();
  }
}

function getEffectiveSurfaceForPulse() {
  const dark = isDarkMode();
  const m = readThemeMode();
  if (dark) {
    if (m === 'claude') return 'claude-dark';
    if (m === 'codex') return 'codex-dark';
    return 'dark';
  }
  if (m === 'claude') return 'claude';
  if (m === 'codex') return 'codex';
  return 'google';
}

function syncPulseSurface() {
  const frame = document.getElementById('agy-pulse-iframe');
  if (!frame || !frame.src) return;
  const surf = getEffectiveSurfaceForPulse();
  if (frame.dataset.surf !== surf) {
    frame.dataset.surf = surf;
    try {
      frame.contentWindow?.postMessage({ type: 'gemini-pulse:surface', surface: surf }, new URL(frame.src).origin);
    } catch (_) {}
  }
}

function updateThemeButtonUI(mode) {
  const btn = document.getElementById('agy-inline-theme-btn');
  if (!btn) return;
  const meta = THEME_META[mode] || THEME_META.google;
  const dot = btn.querySelector('.agy-tb-dot');
  const lbl = btn.querySelector('.agy-tb-label');
  const color = isDarkMode() ? meta.darkDot : meta.dot;
  if (dot && dot.style.background !== color) dot.style.background = color;
  if (lbl && lbl.textContent !== meta.label) lbl.textContent = meta.label;
  const menu = document.getElementById('agy-theme-menu');
  if (menu) {
    const items = menu.querySelectorAll('.agy-tm-item');
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', items[i].dataset.theme === mode);
    }
  }
}

function applyThemeMode(mode) {
  const normalized = VALID_THEMES.includes(mode) ? mode : 'google';
  syncDarkAttribute();
  if (document.documentElement.getAttribute('data-agy-theme') !== normalized) {
    document.documentElement.setAttribute('data-agy-theme', normalized);
  }
  // Backward compatibility if an older dist/theme.css without bundled themes is active
  if (AGY_THEMES && Object.keys(AGY_THEMES).length > 0) {
    const css = AGY_THEMES[normalized] || '';
    let style = document.getElementById('agy-theme-style');
    if (css) {
      if (!style) {
        style = document.createElement('style');
        style.id = 'agy-theme-style';
        document.head.appendChild(style);
      }
      if (style.textContent !== css) style.textContent = css;
    } else if (style && style.textContent) {
      style.textContent = '';
    }
  }
  try { localStorage.setItem(THEME_STORE, normalized); } catch (_) {}
  window.__agyCurrentTheme = normalized;
  updateThemeButtonUI(normalized);
  syncPulseSurface();
  return normalized;
}

// ==================== Part 1: High-Speed 120fps Localization Engine ====================

const REGEX_RULES = [
  [/^Allow (.+?)\?$/, '允许 $1 吗？'],
  [/^Yes,\s*and always allow\s+(.+?)\s+in this conversation$/i, '是，且在本对话中始终允许 $1'],
  [/^Yes,\s*and always allow\s+(.+?)\s+for this conversation$/i, '是，且在本对话中始终允许 $1'],
  [/^Yes,\s*and always allow\s+(.+?)\s+in this workspace$/i, '是，且在此工作区中始终允许 $1'],
  [/^Yes,\s*and always allow\s+(.+)$/i, '是，且始终允许 $1'],
  [/^Yes,\s*allow\s+(.+?)\s+this time$/i, '是，仅本次允许 $1'],
  [/^Yes,\s*allow this time$/i, '是，仅本次允许'],
  [/^Yes,\s*allow once$/i, '是，仅本次允许'],
  [/^Always allow\s+(.+?)\s+in this conversation$/i, '在本对话中始终允许 $1'],
  [/^Always allow\s+(.+?)\s+in this workspace$/i, '在此工作区中始终允许 $1'],
  [/^Always allow\s+(.+)$/i, '始终允许 $1'],
  [/^No\s*\(tell the agent what to do instead\)$/i, '否（告诉智能体改做什么）'],
  [/^Remove shortcut (.+) for (.+)$/, '移除「$2」的快捷键 $1'],
  [/^Add shortcut for (.+)$/, '为「$1」添加快捷键'],
  [/^Shortcut (.+) for (.+)$/, '「$2」的快捷键 $1'],
  [/^Show (\d+) breakdowns?$/, '展开 $1 项明细'],
  [/^Toggle (.+)$/, '开关 $1'],
  [/^Rules: (.+) tokens$/, '规则：$1 tokens'],
  [/^Skills: (.+) tokens$/, '技能：$1 tokens'],
  [/^(.+) Weekly Limit$/, '$1 每周额度'],
  [/^(\d+)% left$/, '剩余 $1%'],
  [/^Resets in (.+)$/, '$1 后重置'],
  [/^You have used some of your weekly limit, it will fully refresh in (.+)\.$/, '本周额度已部分使用，将在 $1 后完全恢复。'],
  [/^You have used some of your 5-hour limit, it will fully refresh in (.+)\.$/, '5 小时额度已部分使用，将在 $1 后完全恢复。'],
  [/^You have hit your weekly limit, it refreshes in (.+?)\. If on a supported paid plan, you can use AI credits in the interim or upgrade to a higher tier\.$/, '本周额度已用完，将在 $1 后恢复。付费方案可先用 AI 积分顶上，或升级到更高档位。'],
  [/^(\d+) active conversations? and (\d+) archived conversations?$/, '$1 个进行中会话和 $2 个已归档会话'],
  [/^Show (.+) QR code$/, '显示$1二维码'],
  [/^Select Sidebar Item (\d+)$/, '切换到侧栏第 $1 项'],
  [/^Your (.+) setting$/, '当前「$1」设置'],
  [/^Modified in (\d+) projects?$/, '已在 $1 个项目中自定义'],
  [/^(\d+) files? changed$/, '$1 个文件已变更'],
  [/^Thought for (.+)$/, '已思考 $1'],
  [/^Show (\d+) more$/, '展开其余 $1 项'],
  [/^(\d+) items? running$/, '$1 个任务运行中'],
  [/^Repeat every (\d+) days?$/, '每 $1 天重复'],
  [/^Repeat every (\d+) hours?$/, '每 $1 小时重复'],
  [/^Agents created by (.+)$/, '由 $1 创建的智能体'],
  [/^Couldn't connect to (.+)$/, '无法连接到 $1'],
  [/^(\d+)\s*s ago$/, '$1 秒前'],
  [/^(\d+)\s*m ago$/, '$1 分钟前'],
  [/^(\d+)\s*h ago$/, '$1 小时前'],
  [/^(\d+)\s*d ago$/, '$1 天前'],
];

const REGEX_QUICK_GUARD = /^(?:Allow |Yes,|Always allow |No\s*\(|Remove shortcut |Add shortcut |Shortcut |Show |Toggle |Rules: |Skills: |Resets in |You have |Select Sidebar Item |Your |Modified in |Thought for |Repeat every |Agents created by |Couldn't connect to |\d+% left$|\d+ active conversation|\d+ files? changed$|\d+ items? running$|\d+\s*[smhd] ago$)| Weekly Limit$/;
const HAS_ASCII_LETTER = /[A-Za-z]/;
const SKIP_PURE_URL_OR_PATH = /^(?:https?:\/\/|file:\/\/|\/Users\/|\/Applications\/|[A-Za-z]:\\)/;

const RAW_PHRASES = (typeof AGY_PHRASES !== 'undefined' && Array.isArray(AGY_PHRASES)) ? AGY_PHRASES : [];
const exactMap = new Map();
const exactMapLower = new Map();
const subPhraseMap = new Map();
const subKeys = [];

for (let i = 0; i < RAW_PHRASES.length; i++) {
  const pair = RAW_PHRASES[i];
  if (!Array.isArray(pair) || pair.length < 2) continue;
  const en = String(pair[0]).trim();
  const zh = pair[1];
  if (!en) continue;
  exactMap.set(en, zh);
  if (en.indexOf(' ') !== -1 || en.length >= 6) {
    const low = en.toLowerCase();
    if (!exactMapLower.has(low)) exactMapLower.set(low, zh);
  }
  if (en.indexOf(' ') !== -1 && !subPhraseMap.has(en)) {
    subPhraseMap.set(en, zh);
    subKeys.push(en);
  }
}
subKeys.sort((a, b) => b.length - a.length);

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Compile all multi-word sub-phrases into ONE native V8 RegExp instead of 227 .includes() loops
const subPhraseRegex = subKeys.length > 0
  ? new RegExp(subKeys.map(escapeRegex).join('|'), 'g')
  : null;

const TRANSLATE_CACHE_MAX = 1500;
const translateCache = new Map();

function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  const len = text.length;
  if (len > 420) return text;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 380) return text;
  if (!HAS_ASCII_LETTER.test(trimmed)) return text;
  if (SKIP_PURE_URL_OR_PATH.test(trimmed)) return text;

  const cached = translateCache.get(trimmed);
  if (cached !== undefined) {
    return cached === trimmed ? text : text.replace(trimmed, cached);
  }

  // 1. O(1) exact dictionary hit (case-sensitive first, then sentence/title-case fallback)
  const exact = exactMap.get(trimmed) ?? exactMapLower.get(trimmed.toLowerCase());
  if (exact !== undefined) {
    if (translateCache.size >= TRANSLATE_CACHE_MAX) translateCache.clear();
    translateCache.set(trimmed, exact);
    return text.replace(trimmed, exact);
  }

  // 2. Dynamic regex rules (guarded by single fast pre-check)
  if (REGEX_QUICK_GUARD.test(trimmed)) {
    for (let r = 0; r < REGEX_RULES.length; r++) {
      const rx = REGEX_RULES[r][0];
      if (!rx.test(trimmed)) continue;
      let out = trimmed.replace(rx, REGEX_RULES[r][1]);
      out = out.replace(/「([^」]+)」/g, (_m, g) => '「' + (exactMap.get(g) || g) + '」');
      if (translateCache.size >= TRANSLATE_CACHE_MAX) translateCache.clear();
      translateCache.set(trimmed, out);
      return text.replace(trimmed, out);
    }
  }

  // 3. Single-pass compiled RegExp for multi-word phrases
  let out = trimmed;
  if (subPhraseRegex && trimmed.indexOf(' ') !== -1 && trimmed.length <= 260) {
    subPhraseRegex.lastIndex = 0;
    const replaced = trimmed.replace(subPhraseRegex, (m) => subPhraseMap.get(m) || m);
    if (replaced !== trimmed) out = replaced;
  }

  if (translateCache.size >= TRANSLATE_CACHE_MAX) translateCache.clear();
  translateCache.set(trimmed, out);
  return out === trimmed ? text : text.replace(trimmed, out);
}

const ATTRS = ['placeholder', 'data-placeholder', 'aria-placeholder', 'title', 'aria-label'];
const SKIP_TAGS = new Set([
  'SVG', 'PATH', 'G', 'CIRCLE', 'RECT', 'LINE', 'POLYLINE', 'POLYGON',
  'CODE', 'PRE', 'TEXTAREA', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'CANVAS', 'VIDEO', 'AUDIO'
]);
const OWN_IDS = new Set([
  'hakimi-muse-stage', 'hakimi-say', 'agy-inline-theme-btn', 'agy-theme-menu',
  'agy-codex-ctx-btn', 'agy-codex-ctx-popover', 'agy-pulse-drawer',
  'agy-kit-update-wrap', 'agy-kit-update-pop',
  'agy-inline-ask-trigger', 'agy-inline-ask-popover', 'agy-inline-ask-pins'
]);

function isExcludedElement(el) {
  let cur = el;
  while (cur && cur.nodeType === 1) {
    const id = cur.id;
    if (id && OWN_IDS.has(id)) return true;
    const tag = cur.tagName;
    if (SKIP_TAGS.has(tag)) return true;
    if (cur.hasAttribute('data-quotable')) return true;
    const tid = cur.getAttribute('data-testid');
    if (tid === 'planner-response-text') return true;
    const cl = cur.classList;
    if (cl && cl.length > 0 && (
      cl.contains('notranslate') ||
      cl.contains('monaco-editor') ||
      cl.contains('cm-content') ||
      cl.contains('hljs')
    )) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

function isOwnControlElement(el) {
  let cur = el;
  while (cur && cur.nodeType === 1) {
    if (cur.id && OWN_IDS.has(cur.id)) return true;
    cur = cur.parentElement;
  }
  return false;
}

function translateSingleNode(node) {
  if (!node) return false;
  const nt = node.nodeType;
  if (nt === 3) {
    const original = node.nodeValue;
    if (!original || node.__agyDoneVal === original) return false;
    if (original.length > 420 || !HAS_ASCII_LETTER.test(original)) {
      node.__agyDoneVal = original;
      return false;
    }
    if (isExcludedElement(node.parentElement)) {
      node.__agyDoneVal = original;
      return false;
    }
    const translated = translateText(original);
    if (translated !== original) {
      node.nodeValue = translated;
      node.__agyDoneVal = translated;
      return true;
    }
    node.__agyDoneVal = original;
    return false;
  }
  if (nt !== 1) return false;
  if (SKIP_TAGS.has(node.tagName)) return false;
  if (isExcludedElement(node)) return false;

  for (let i = 0; i < ATTRS.length; i++) {
    const a = ATTRS[i];
    if (!node.hasAttribute(a)) continue;
    const v = node.getAttribute(a);
    const key = '__agyDone_' + a;
    if (!v || node[key] === v) continue;
    const tv = translateText(v);
    if (v !== tv) node.setAttribute(a, tv);
    node[key] = tv;
  }
  return false;
}

function translateSubtree(root, deadlineMs) {
  if (!root) return [];
  const stack = [root];
  while (stack.length > 0) {
    if (deadlineMs && performance.now() >= deadlineMs) {
      return stack;
    }
    const node = stack.pop();
    if (!node) continue;
    const nt = node.nodeType;
    if (nt === 3) {
      translateSingleNode(node);
      continue;
    }
    if (nt !== 1) continue;
    if (SKIP_TAGS.has(node.tagName) || isExcludedElement(node)) continue;

    for (let i = 0; i < ATTRS.length; i++) {
      const a = ATTRS[i];
      if (!node.hasAttribute(a)) continue;
      const v = node.getAttribute(a);
      const key = '__agyDone_' + a;
      if (!v || node[key] === v) continue;
      const tv = translateText(v);
      if (v !== tv) node.setAttribute(a, tv);
      node[key] = tv;
    }

    for (let child = node.lastChild; child; child = child.previousSibling) {
      stack.push(child);
    }
  }
  return [];
}

function scan(root) {
  const target = root || document.body;
  if (!target) return;
  enqueueTranslateNode(target);
}

// Time-budgeted frame queue (keeps each frame's i18n work under 2.5ms for steady 120fps)
const pendingNodes = new Set();
let pendingStack = [];
let i18nFlushScheduled = false;

function enqueueTranslateNode(node) {
  if (!node) return;
  if (node.nodeType === 1 && isExcludedElement(node)) return;
  if (node.nodeType === 3 && isExcludedElement(node.parentElement)) return;
  pendingNodes.add(node);
  if (!i18nFlushScheduled) {
    i18nFlushScheduled = true;
    window.requestAnimationFrame(flushPendingTranslations);
  }
}

function flushPendingTranslations() {
  i18nFlushScheduled = false;
  const deadline = performance.now() + 2.4;

  // Resume interrupted subtree stack first
  while (pendingStack.length > 0) {
    if (performance.now() >= deadline) {
      i18nFlushScheduled = true;
      window.requestAnimationFrame(flushPendingTranslations);
      return;
    }
    const next = pendingStack.pop();
    const rest = translateSubtree(next, deadline);
    if (rest.length > 0) {
      for (let i = 0; i < rest.length; i++) pendingStack.push(rest[i]);
      i18nFlushScheduled = true;
      window.requestAnimationFrame(flushPendingTranslations);
      return;
    }
  }

  for (const node of pendingNodes) {
    pendingNodes.delete(node);
    if (!node.isConnected) continue;
    const rest = translateSubtree(node, deadline);
    if (rest.length > 0) {
      pendingStack = rest;
      i18nFlushScheduled = true;
      window.requestAnimationFrame(flushPendingTranslations);
      return;
    }
    if (performance.now() >= deadline) {
      if (pendingNodes.size > 0) {
        i18nFlushScheduled = true;
        window.requestAnimationFrame(flushPendingTranslations);
      }
      return;
    }
  }
}

// ==================== Part 2: Unified Custom Styles (GPU-Composited 120fps) ====================

const CUSTOM_UI_CSS = `
/* --- Muse-Style Full-Border Desk Companion (120Hz Pure-GPU, Zero-Decode Swap) --- */
#hakimi-muse-stage {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 38;
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  user-select: none;
  contain: layout style;
  will-change: transform;
  transform: translate3d(-9999px, -9999px, 0);
}

#hakimi-muse-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

#hakimi-muse-sprite {
  position: relative;
  width: 112px;
  height: 92px;
  cursor: pointer;
  transform-origin: 50% 80%;
  transition: transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1);
  contain: layout style;
  will-change: transform;
}

#hakimi-muse-sprite:hover {
  transform: translate3d(0, -2px, 0) scale(1.04);
}
#hakimi-muse-sprite:active {
  transform: translate3d(0, 0, 0) scale(0.96);
}

/* Independent GPU-composited character body (flips, dances & spins 360° without flipping pill or shadow) */
.hakimi-body {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: 50% 62%;
  pointer-events: none;
  will-change: transform;
  transform: translate3d(0, 0, 0);
}

/* Pre-baked subtle elliptical shadow (zero expensive animated filter: drop-shadow) */
#hakimi-muse-shadow {
  position: absolute;
  left: 50%;
  bottom: 14px;
  width: 68px;
  height: 10px;
  margin-left: -34px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(15, 23, 42, 0.16) 0%, transparent 72%);
  pointer-events: none;
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0) scaleX(1);
}
html[data-agy-dark="1"] #hakimi-muse-shadow {
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.44) 0%, transparent 72%);
}

/* Pure-GPU Celebration Sparkles (✦ ✧ ★ ✦) */
#hakimi-muse-fx {
  position: absolute;
  inset: -14px -18px 0 -18px;
  pointer-events: none;
  overflow: visible;
}
.hakimi-spark {
  position: absolute;
  left: 50%;
  top: 42%;
  font-size: 13px;
  line-height: 1;
  font-weight: 700;
  opacity: 0;
  color: var(--gs-accent, #1a73e8);
  pointer-events: none;
  will-change: transform, opacity;
}
.hakimi-spark.s2 { color: #f59e0b; font-size: 12px; }
.hakimi-spark.s3 { color: #ec4899; font-size: 11px; }
.hakimi-spark.s4 { color: #10b981; font-size: 12px; }
#hakimi-muse-fx.celebrate .hakimi-spark.s1 { animation: hakimi-spark-1 1.05s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
#hakimi-muse-fx.celebrate .hakimi-spark.s2 { animation: hakimi-spark-2 1.15s cubic-bezier(0.2, 0.8, 0.2, 1) 0.08s forwards; }
#hakimi-muse-fx.celebrate .hakimi-spark.s3 { animation: hakimi-spark-3 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s forwards; }
#hakimi-muse-fx.celebrate .hakimi-spark.s4 { animation: hakimi-spark-4 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s forwards; }
@keyframes hakimi-spark-1 {
  0%   { opacity: 0; transform: translate3d(-6px, 0, 0) scale(0.4) rotate(0deg); }
  22%  { opacity: 1; }
  100% { opacity: 0; transform: translate3d(-44px, -36px, 0) scale(1.15) rotate(-90deg); }
}
@keyframes hakimi-spark-2 {
  0%   { opacity: 0; transform: translate3d(6px, 0, 0) scale(0.4) rotate(0deg); }
  22%  { opacity: 1; }
  100% { opacity: 0; transform: translate3d(44px, -38px, 0) scale(1.15) rotate(110deg); }
}
@keyframes hakimi-spark-3 {
  0%   { opacity: 0; transform: translate3d(0, -4px, 0) scale(0.4) rotate(0deg); }
  25%  { opacity: 1; }
  100% { opacity: 0; transform: translate3d(-18px, -48px, 0) scale(1.1) rotate(140deg); }
}
@keyframes hakimi-spark-4 {
  0%   { opacity: 0; transform: translate3d(0, -4px, 0) scale(0.4) rotate(0deg); }
  25%  { opacity: 1; }
  100% { opacity: 0; transform: translate3d(24px, -46px, 0) scale(1.1) rotate(-130deg); }
}

.hakimi-pose-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  -webkit-user-drag: none;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  backface-visibility: hidden;
}
.hakimi-pose-layer.active {
  opacity: 1;
  visibility: visible;
}

/* Dynamic Status + Live Speed Pill beside Desk Companion */
#hakimi-muse-pill {
  position: absolute;
  left: calc(100% - 6px);
  right: auto;
  bottom: 28px;
  display: none;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--gs-side-elev, #ffffff);
  border: 1px solid var(--gs-line, #e3e8ef);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.07);
  color: var(--gs-ink-2, #525866);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  max-width: 268px;
  pointer-events: auto;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  contain: layout style;
  animation: hakimi-pill-in 0.16s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
#hakimi-muse-pill.pill-left {
  left: auto;
  right: calc(100% - 6px);
}
html[data-agy-dark="1"] #hakimi-muse-pill {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.36);
}
#hakimi-muse-pill.show {
  display: inline-flex;
}
#hakimi-muse-pill .muse-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gs-accent, #1a73e8);
  flex-shrink: 0;
  will-change: transform, opacity;
  animation: muse-dot-pulse 1.4s ease-in-out infinite;
}
#hakimi-muse-pill.is-done .muse-pulse-dot {
  background: #16a34a;
  animation: none;
}
#hakimi-muse-pill .muse-pill-txt {
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  max-width: 152px;
}
#hakimi-muse-pill .muse-pill-rate {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 11px;
  color: var(--gs-accent, #1a73e8);
  padding-left: 5px;
  border-left: 1px solid var(--gs-line, #e3e8ef);
  display: none;
}
#hakimi-muse-pill .muse-pill-rate.has-rate {
  display: inline;
}
@keyframes muse-dot-pulse {
  0%, 100% { opacity: 1; transform: scale3d(1, 1, 1); }
  50% { opacity: 0.42; transform: scale3d(0.78, 0.78, 1); }
}
@keyframes hakimi-pill-in {
  from { opacity: 0; transform: translate3d(-4px, 0, 0) scale(0.96); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

/* Collapsed Mini Badge Mode (right-click toggle) */
#hakimi-muse-mini {
  display: none;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 9px;
  margin-bottom: 5px;
  border-radius: 999px;
  background: var(--gs-side-elev, #ffffff);
  border: 1px solid var(--gs-line, #e3e8ef);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
  color: var(--gs-ink-2, #525866);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  pointer-events: auto;
}
#hakimi-muse-stage.collapsed #hakimi-muse-sprite,
#hakimi-muse-stage.collapsed #hakimi-muse-pill {
  display: none !important;
}
#hakimi-muse-stage.collapsed #hakimi-muse-mini {
  display: inline-flex;
}

/* Speech Bubble above Desk Companion */
#hakimi-say {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 42;
  width: max-content;
  max-width: 240px;
  padding: 5px 11px;
  border-radius: 12px;
  background: var(--gs-side-elev, #ffffff);
  border: 1px solid var(--gs-line, #e3e8ef);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.10);
  color: var(--gs-ink, #1f1f1f);
  font-size: 12px;
  line-height: 1.45;
  pointer-events: none;
  contain: layout style;
  will-change: transform, opacity;
  animation: hakimi-say-pop 0.16s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
#hakimi-say::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -5px;
  margin-left: -4.5px;
  width: 8px;
  height: 8px;
  background: inherit;
  border-right: 1px solid var(--gs-line, #e3e8ef);
  border-bottom: 1px solid var(--gs-line, #e3e8ef);
  transform: rotate(45deg);
}
@keyframes hakimi-say-pop {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* --- Codex-Style Context Ring Left of Permissions Button --- */
#agy-codex-ctx-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px;
  margin-right: 3px;
  border-radius: 7px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--gs-ink-2, #5f6368);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  transition: background-color 0.11s ease, color 0.11s ease, border-color 0.11s ease;
}
#agy-codex-ctx-btn:hover,
#agy-codex-ctx-btn.drawer-open {
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.08));
  color: var(--gs-ink, #1f1f1f);
  border-color: var(--gs-line, rgba(128, 138, 155, 0.22));
}
#agy-codex-ctx-btn svg.codex-ring-svg {
  width: 14px;
  height: 14px;
  transform: rotate(-90deg);
  flex-shrink: 0;
}
#agy-codex-ctx-btn .codex-ring-bg {
  stroke: currentColor;
  stroke-opacity: 0.18;
}
#agy-codex-ctx-btn .codex-ring-fg {
  stroke: var(--gs-accent, #1a73e8);
  transition: stroke-dashoffset 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), stroke 0.16s ease;
}
#agy-codex-ctx-btn[data-level="warn"] .codex-ring-fg { stroke: #d97706; }
#agy-codex-ctx-btn[data-level="warn"] .codex-ctx-pct { color: #b45309; }
html[data-agy-dark="1"] #agy-codex-ctx-btn[data-level="warn"] .codex-ctx-pct { color: #fbbf24; }
#agy-codex-ctx-btn[data-level="danger"] .codex-ring-fg { stroke: #dc2626; }
#agy-codex-ctx-btn[data-level="danger"] .codex-ctx-pct { color: #dc2626; font-weight: 600; }
html[data-agy-dark="1"] #agy-codex-ctx-btn[data-level="danger"] .codex-ctx-pct { color: #f87171; }

/* Codex Hover Popover Card */
#agy-codex-ctx-popover {
  position: fixed;
  z-index: 999992;
  width: 288px;
  padding: 12px 13px 10px;
  border-radius: 12px;
  background: var(--gs-side-elev, #ffffff);
  border: 1px solid var(--gs-line, #e3e8ef);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.05);
  color: var(--gs-ink, #1f1f1f);
  font-size: 12px;
  line-height: 1.45;
  font-variant-numeric: tabular-nums;
  display: none;
  pointer-events: auto;
  contain: layout style;
  animation: codex-pop-in 0.13s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
html[data-agy-dark="1"] #agy-codex-ctx-popover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.48);
}
#agy-codex-ctx-popover.open {
  display: block;
}
#agy-codex-ctx-popover .cpop-head {
  padding-right: 44px;
}
#agy-codex-ctx-popover .pulse-close {
  position: absolute;
  top: 7px;
  right: 8px;
}
@keyframes codex-pop-in {
  from { opacity: 0; transform: translate3d(0, 4px, 0) scale(0.985); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

.cpop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.cpop-title {
  font-weight: 600;
  font-size: 12px;
  color: var(--gs-ink, #1f1f1f);
}
.cpop-badge {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 99px;
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.09));
  color: var(--gs-accent, #1a73e8);
  font-weight: 500;
}
.cpop-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 7px;
}
.cpop-big {
  font-size: 16.5px;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.cpop-big small {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--gs-ink-3, #80868b);
}
.cpop-rem {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--gs-accent, #1a73e8);
}
.cpop-bar {
  height: 6px;
  border-radius: 99px;
  background: rgba(128, 138, 155, 0.16);
  overflow: hidden;
  display: flex;
  gap: 1px;
  margin-bottom: 8px;
}
.cpop-sub {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--gs-ink-2, #5f6368);
}
.cpop-alert {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.4;
  background: rgba(217, 119, 6, 0.10);
  border: 1px solid rgba(217, 119, 6, 0.28);
  color: #b45309;
}
html[data-agy-dark="1"] .cpop-alert {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.30);
  color: #fbbf24;
}
.cpop-div {
  height: 1px;
  background: var(--gs-line-soft, #eef2f7);
  margin: 9px 0;
}
.cpop-quota-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  margin-bottom: 4px;
}
.cpop-foot-btn {
  margin-top: 8px;
  width: 100%;
  padding: 5.5px 9px;
  border-radius: 8px;
  border: 1px solid var(--gs-line, #e3e8ef);
  background: var(--gs-bg, #fbfdff);
  color: var(--gs-ink-2, #5f6368);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color 0.12s ease, color 0.12s ease, background-color 0.12s ease;
}
.cpop-foot-btn:hover {
  border-color: var(--gs-accent, #1a73e8);
  color: var(--gs-accent, #1a73e8);
}

/* --- Docked Side Pane Drawer for Gemini Pulse (120fps translate3d) --- */
#agy-pulse-drawer {
  position: fixed;
  top: 35px;
  right: 0;
  bottom: 0;
  width: 380px;
  max-width: calc(100vw - 16px);
  z-index: 999991;
  background: var(--gs-bg, #fbfdff);
  border-left: 1px solid var(--gs-line, #e3e8ef);
  box-shadow: -6px 0 24px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  contain: layout style;
  will-change: transform;
  transform: translate3d(102%, 0, 0);
  transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0.18s step-end;
  visibility: hidden;
  pointer-events: none;
}
html[data-agy-dark="1"] #agy-pulse-drawer {
  box-shadow: -8px 0 28px rgba(0, 0, 0, 0.42);
}
#agy-pulse-drawer.open {
  transform: translate3d(0, 0, 0);
  transition: transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s step-start;
  visibility: visible;
  pointer-events: auto;
}
.pulse-drawer-head {
  height: 40px;
  flex: 0 0 40px;
  padding: 0 12px 0 14px;
  border-bottom: 1px solid var(--gs-line-soft, #eef2f7);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--gs-ink, #1f1f1f);
}
.pulse-drawer-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.pulse-close {
  -webkit-app-region: no-drag;
  flex: none;
  min-width: 40px;
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid var(--gs-line, #d2d8e0);
  background: var(--gs-bg, #fff);
  color: var(--gs-ink, #20242a);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 600;
}
.pulse-close:hover, .pulse-close:focus-visible {
  background: rgba(234, 67, 53, 0.10);
  color: #dc2626;
}
#agy-pulse-iframe {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
}

/* Topbar Theme Switcher Pill + Quick Picker Menu */
#agy-inline-theme-btn {
  -webkit-app-region: no-drag;
  font-size: 11.5px;
  line-height: 1.2;
  height: 22px;
  opacity: 0.90;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 6px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid rgba(128, 128, 128, 0.20);
  background: rgba(128, 128, 128, 0.08);
  color: inherit;
  cursor: pointer;
  user-select: none;
  pointer-events: auto;
  transition: opacity 0.11s ease, background-color 0.11s ease;
}
#agy-inline-theme-btn:hover {
  opacity: 1;
  background: rgba(128, 128, 128, 0.16);
}
#agy-inline-theme-btn .agy-tb-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
#agy-inline-theme-btn .agy-tb-caret {
  font-size: 9px;
  opacity: 0.65;
  margin-left: 1px;
  padding: 0 2px;
  border-radius: 4px;
}
#agy-inline-theme-btn .agy-tb-caret:hover {
  opacity: 1;
  background: rgba(128, 128, 128, 0.22);
}
#agy-theme-menu {
  position: fixed;
  z-index: 999998;
  min-width: 158px;
  padding: 4px;
  border-radius: 10px;
  background: var(--gs-side-elev, #ffffff);
  border: 1px solid var(--gs-line, #e3e8ef);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: none;
  flex-direction: column;
  gap: 2px;
  contain: layout style;
}
#agy-theme-menu.open {
  display: flex;
}
.agy-tm-item {
  border: none;
  background: transparent;
  color: var(--gs-ink, #1f1f1f);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 9px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  text-align: left;
}
.agy-tm-item:hover {
  background: var(--gs-side-hover, rgba(0, 0, 0, 0.05));
}
.agy-tm-item.active {
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.10));
  font-weight: 600;
}
.agy-tm-left {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.agy-tm-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.agy-tm-check {
  font-size: 11px;
  opacity: 0;
  color: var(--gs-accent, #1a73e8);
}
.agy-tm-item.active .agy-tm-check {
  opacity: 1;
}

/* Codex-Style Bottom-Left Sidebar Update Pill (hidden unless a newer release is live) */
#agy-kit-update-wrap {
  display: none;
  padding: 6px 8px 4px;
  flex-shrink: 0;
  contain: layout style;
}
#agy-kit-update-wrap.visible {
  display: block;
}
#agy-kit-update-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 9px;
  border: 1px solid var(--gs-line, #e3e8ef);
  background: var(--gs-side-elev, #ffffff);
  color: var(--gs-ink, #1f1f1f);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.25;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.11s ease, border-color 0.11s ease;
}
#agy-kit-update-btn:hover {
  border-color: var(--gs-accent, #1a73e8);
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.08));
}
.agy-upd-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}
.agy-upd-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--gs-accent, #1a73e8);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}
html[data-agy-theme="codex"][data-agy-dark="1"] .agy-upd-icon {
  color: #111113;
}
.agy-upd-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.agy-upd-dismiss {
  border: none;
  background: transparent;
  color: var(--gs-ink-3, #80868b);
  width: 18px;
  height: 18px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}
.agy-upd-dismiss:hover {
  background: var(--gs-side-hover, rgba(0, 0, 0, 0.06));
  color: var(--gs-ink, #1f1f1f);
}

#agy-kit-update-pop {
  position: fixed;
  z-index: 999996;
  width: 286px;
  padding: 12px 13px;
  border-radius: 12px;
  background: var(--gs-side-elev, #ffffff);
  border: 1px solid var(--gs-line, #e3e8ef);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);
  color: var(--gs-ink, #1f1f1f);
  font-size: 12px;
  line-height: 1.45;
  display: none;
  contain: layout style;
  animation: codex-pop-in 0.13s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
html[data-agy-dark="1"] #agy-kit-update-pop {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.50);
}
#agy-kit-update-pop.open {
  display: block;
}
.agy-upop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.agy-upop-title {
  font-weight: 600;
  font-size: 12.5px;
}
.agy-upop-ver {
  font-size: 10.5px;
  padding: 1px 7px;
  border-radius: 99px;
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.10));
  color: var(--gs-accent, #1a73e8);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.agy-upop-notes {
  max-height: 120px;
  overflow-y: auto;
  font-size: 11.5px;
  color: var(--gs-ink-2, #5f6368);
  white-space: pre-wrap;
  margin-bottom: 10px;
}
.agy-upop-actions {
  display: flex;
  gap: 6px;
}
.agy-upop-primary {
  flex: 1;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: none;
  background: var(--gs-accent, #1a73e8);
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}
html[data-agy-theme="codex"][data-agy-dark="1"] .agy-upop-primary {
  color: #111113;
}
.agy-upop-primary:disabled {
  opacity: 0.6;
  cursor: wait;
}
.agy-upop-sec {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--gs-line, #e3e8ef);
  background: var(--gs-bg, #ffffff);
  color: var(--gs-ink-2, #5f6368);
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
}
.agy-upop-sec:hover {
  border-color: var(--gs-accent, #1a73e8);
  color: var(--gs-accent, #1a73e8);
}
.agy-upop-status {
  margin-top: 7px;
  font-size: 11px;
  color: var(--gs-ink-2, #5f6368);
}

/* --- Inline Hover/Selection Contextual Side-Reply Dialog (120fps GPU-Composited) --- */
#agy-inline-ask-trigger {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 43;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--gs-line, #dde5f0);
  background: var(--gs-side-elev, #ffffff);
  color: var(--gs-ink-2, #525d6d);
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  contain: layout style;
  will-change: transform, opacity;
  transform: translate3d(-9999px, -9999px, 0);
  transition: opacity 0.12s ease, border-color 0.12s ease, color 0.12s ease, background-color 0.12s ease, visibility 0.12s step-end;
}
html[data-agy-dark="1"] #agy-inline-ask-trigger {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.42);
}
#agy-inline-ask-trigger.visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 0.12s ease, border-color 0.12s ease, color 0.12s ease, background-color 0.12s ease, visibility 0s step-start;
}
#agy-inline-ask-trigger:hover,
#agy-inline-ask-trigger[data-mode="selection"] {
  border-color: var(--gs-accent, #1a73e8);
  color: var(--gs-accent, #1a73e8);
  background: var(--gs-side-elev, #ffffff);
}
#agy-inline-ask-trigger svg {
  width: 12.5px;
  height: 12.5px;
  flex-shrink: 0;
}

#agy-inline-ask-popover {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 44;
  width: 412px;
  max-width: calc(100vw - 24px);
  max-height: min(540px, calc(100vh - 76px));
  border-radius: 14px;
  border: 1px solid var(--gs-line, #dde5f0);
  background: var(--gs-side-elev, #ffffff);
  color: var(--gs-ink, #1b1f24);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08), 0 18px 44px rgba(15, 23, 42, 0.16);
  display: none;
  flex-direction: column;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.5;
  contain: layout style;
  will-change: transform;
  transform: translate3d(-9999px, -9999px, 0);
}
html[data-agy-dark="1"] #agy-inline-ask-popover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.42), 0 22px 54px rgba(0, 0, 0, 0.58);
}
#agy-inline-ask-popover.open {
  display: flex;
  animation: agy-ia-pop-in 0.14s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes agy-ia-pop-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.agy-ia-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 11px 8px 13px;
  border-bottom: 1px solid var(--gs-line-soft, #eef2f7);
  background: var(--gs-bg-2, #f3f7fd);
  cursor: grab;
  user-select: none;
  flex-shrink: 0;
}
.agy-ia-head:active {
  cursor: grabbing;
}
.agy-ia-head-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}
.agy-ia-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gs-accent, #1a73e8);
  flex-shrink: 0;
}
.agy-ia-dot.busy {
  animation: muse-dot-pulse 1.2s ease-in-out infinite;
}
.agy-ia-badge {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--gs-ink, #1b1f24);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.agy-ia-model-chip {
  font-size: 10.5px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 99px;
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.10));
  color: var(--gs-accent, #1a73e8);
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.agy-ia-head-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.agy-ia-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--gs-ink-2, #525d6d);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  transition: background-color 0.11s ease, color 0.11s ease, border-color 0.11s ease;
}
.agy-ia-icon-btn:hover {
  background: var(--gs-side-hover, rgba(0, 0, 0, 0.06));
  color: var(--gs-ink, #1b1f24);
}
.agy-ia-icon-btn.close-btn:hover {
  background: rgba(220, 38, 38, 0.10);
  color: #dc2626;
}

.agy-ia-quote {
  padding: 7px 12px;
  border-bottom: 1px solid var(--gs-line-soft, #eef2f7);
  background: var(--gs-bg, #fbfdff);
  flex-shrink: 0;
}
.agy-ia-quote-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
  font-size: 10.5px;
  color: var(--gs-ink-3, #64748b);
}
.agy-ia-quote-conv {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 210px;
}
.agy-ia-quote-text {
  font-size: 11.5px;
  line-height: 1.42;
  color: var(--gs-ink-2, #525d6d);
  padding-left: 8px;
  border-left: 2.5px solid var(--gs-accent, #1a73e8);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.agy-ia-body {
  flex: 1 1 auto;
  min-height: 112px;
  max-height: 310px;
  overflow-y: auto;
  padding: 11px 13px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  background: var(--gs-side-elev, #ffffff);
}
.agy-ia-empty {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 0;
}
.agy-ia-empty-tip {
  font-size: 11.5px;
  color: var(--gs-ink-2, #525d6d);
  line-height: 1.48;
}
.agy-ia-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.agy-ia-chip {
  border: 1px solid var(--gs-line, #dde5f0);
  background: var(--gs-bg, #fbfdff);
  color: var(--gs-ink-2, #525d6d);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.11s ease, color 0.11s ease, background-color 0.11s ease;
}
.agy-ia-chip:hover {
  border-color: var(--gs-accent, #1a73e8);
  color: var(--gs-accent, #1a73e8);
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.08));
}

.agy-ia-turn {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.agy-ia-q {
  align-self: flex-end;
  max-width: 88%;
  padding: 6.5px 10px;
  border-radius: 11px 11px 3px 11px;
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.10));
  color: var(--gs-ink, #1b1f24);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.agy-ia-a {
  align-self: stretch;
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--gs-bg, #fbfdff);
  border: 1px solid var(--gs-line-soft, #eef2f7);
  color: var(--gs-ink, #1b1f24);
  font-size: 12.2px;
  line-height: 1.56;
  word-break: break-word;
}
.agy-ia-a-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--gs-ink-2, #525d6d);
}
.agy-ia-a-status.queued {
  color: #b45309;
}
html[data-agy-dark="1"] .agy-ia-a-status.queued {
  color: #fbbf24;
}
.agy-ia-a-status.error {
  color: #b91c1c;
}
html[data-agy-dark="1"] .agy-ia-a-status.error {
  color: #fca5a5;
}
.agy-ia-spinner {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gs-accent, #1a73e8);
  display: inline-block;
  animation: muse-dot-pulse 1.1s ease-in-out infinite;
}
.agy-ia-a-content p { margin: 0 0 6px; }
.agy-ia-a-content p:last-child { margin-bottom: 0; }
.agy-ia-a-content h1, .agy-ia-a-content h2, .agy-ia-a-content h3, .agy-ia-a-content h4 {
  font-size: 12.5px;
  font-weight: 650;
  margin: 7px 0 4px;
}
.agy-ia-a-content ul, .agy-ia-a-content ol {
  margin: 4px 0 6px;
  padding-left: 17px;
}
.agy-ia-a-content li { margin: 2px 0; }
.agy-ia-a-content blockquote {
  margin: 5px 0;
  padding: 3px 8px;
  border-left: 2.5px solid var(--gs-line, #d0d7de);
  color: var(--gs-ink-2, #525d6d);
}
.agy-ia-a-content code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.2px;
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--gs-bg-2, #eef2f7);
}
.agy-ia-a-content pre {
  margin: 6px 0;
  padding: 8px 9px;
  border-radius: 8px;
  background: var(--gs-bg-2, #eef2f7);
  border: 1px solid var(--gs-line-soft, #e3e8ef);
  overflow-x: auto;
  font-size: 11.2px;
  line-height: 1.45;
}
.agy-ia-a-content pre code {
  background: transparent;
  padding: 0;
}
.agy-ia-a-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 6px 0;
  font-size: 11.2px;
}
.agy-ia-a-content th, .agy-ia-a-content td {
  border: 1px solid var(--gs-line, #dde5f0);
  padding: 3px 6px;
  text-align: left;
}
.agy-ia-a-content a {
  color: var(--gs-accent, #1a73e8);
  text-decoration: underline;
}
.agy-ia-a-bar {
  margin-top: 7px;
  padding-top: 6px;
  border-top: 1px solid var(--gs-line-soft, #eef2f7);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.agy-ia-a-meta {
  font-size: 10.5px;
  color: var(--gs-ink-3, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.agy-ia-a-btns {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.agy-ia-mini-btn {
  border: 1px solid var(--gs-line, #dde5f0);
  background: var(--gs-side-elev, #ffffff);
  color: var(--gs-ink-2, #525d6d);
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 10.5px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.11s ease, color 0.11s ease;
}
.agy-ia-mini-btn:hover {
  border-color: var(--gs-accent, #1a73e8);
  color: var(--gs-accent, #1a73e8);
}
.agy-ia-mini-btn.primary {
  border-color: var(--gs-accent, #1a73e8);
  color: var(--gs-accent, #1a73e8);
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.08));
}
.agy-ia-mini-btn.primary:hover {
  background: var(--gs-accent, #1a73e8);
  color: var(--primary-foreground, #ffffff);
}

.agy-ia-foot {
  padding: 8px 11px 9px;
  border-top: 1px solid var(--gs-line-soft, #eef2f7);
  background: var(--gs-bg, #fbfdff);
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.agy-ia-input-row {
  display: flex;
  align-items: flex-end;
  gap: 7px;
}
.agy-ia-textarea {
  flex: 1;
  min-height: 34px;
  max-height: 98px;
  resize: none;
  padding: 7px 10px;
  border-radius: 9px;
  border: 1px solid var(--gs-line, #dde5f0);
  background: var(--gs-side-elev, #ffffff);
  color: var(--gs-ink, #1b1f24);
  font: inherit;
  font-size: 12px;
  line-height: 1.42;
  outline: none;
  transition: border-color 0.12s ease;
}
.agy-ia-textarea:focus {
  border-color: var(--gs-accent, #1a73e8);
}
.agy-ia-textarea::placeholder {
  color: var(--gs-ink-3, #7b8394);
}
.agy-ia-send {
  height: 34px;
  padding: 0 12px;
  border-radius: 9px;
  border: none;
  background: var(--gs-accent, #1a73e8);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.11s ease, opacity 0.11s ease;
}
.agy-ia-send:hover:not(:disabled) {
  background: var(--gs-accent-hover, #155fc2);
}
.agy-ia-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.agy-ia-foot-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--gs-ink-3, #64748b);
}

#agy-inline-ask-pins {
  position: fixed;
  inset: 0;
  z-index: 40;
  pointer-events: none;
}
.agy-ia-pin {
  position: fixed;
  top: 0;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid var(--gs-accent, #1a73e8);
  background: var(--gs-side-elev, #ffffff);
  color: var(--gs-accent, #1a73e8);
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.10);
  cursor: pointer;
  pointer-events: auto;
  user-select: none;
  contain: layout style;
  will-change: transform;
  transform: translate3d(-9999px, -9999px, 0);
}
html[data-agy-dark="1"] .agy-ia-pin {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.44);
}
.agy-ia-pin:hover {
  background: var(--gs-accent-soft, rgba(26, 115, 232, 0.12));
}

.agy-ia-flash {
  outline: 2px solid var(--gs-accent, #1a73e8) !important;
  outline-offset: 4px !important;
  border-radius: 8px !important;
  transition: outline-color 0.35s ease !important;
}
`;

// ==================== Part 3: 120Hz Pure-GPU Full-Border Desk Companion + Dual-Source Live Speed ====================

const IDLE_LINES = ['在呢，随时吩咐', '今天想推进哪件事？', '我在桌边巡逻守着啦', '有活随时叫我'];
const WRITE_LINES = ['嘘，正在伏案构思…', '刷刷记笔记中', '马上理出头绪啦'];
const LAPTOP_LINES = ['键盘都要敲火星子啦', '正在调工具跑任务…', '代码与命令飞速处理中'];
const DONE_LINES = ['办妥啦！', '搞定收工～', '全部给你弄好啦'];
const CELEBRATE_LINES = ['360° 转圈庆祝一下！✦', '哈基米托马斯回旋～', '转圈跳舞，干劲满满！'];
const SLEEPY_LINES = ['趴桌眯一小会儿…', '叫我就立马醒', '呼噜…轻轻待机中'];

const POSE_KEYS = ['idle', 'laptop1', 'laptop2', 'write1', 'write2', 'done', 'sleepy'];
let poseUrls = null;

function buildPoseObjectUrls() {
  if (poseUrls) return poseUrls;
  poseUrls = {};
  if (!POSES) return poseUrls;
  for (let i = 0; i < POSE_KEYS.length; i++) {
    const key = POSE_KEYS[i];
    const dataUri = POSES[key];
    if (!dataUri) continue;
    try {
      const comma = dataUri.indexOf(',');
      if (comma !== -1 && dataUri.startsWith('data:image/')) {
        const mimeMatch = dataUri.slice(5, comma).split(';')[0] || 'image/png';
        const bin = atob(dataUri.slice(comma + 1));
        const bytes = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
        poseUrls[key] = URL.createObjectURL(new Blob([bytes], { type: mimeMatch }));
      } else {
        poseUrls[key] = dataUri;
      }
    } catch (_) {
      poseUrls[key] = dataUri;
    }
  }
  return poseUrls;
}

let stageEl = null;
let spriteEl = null;
let bodyEl = null;
let shadowEl = null;
let fxEl = null;
let poseLayers = {};
let activePoseKey = 'idle';
let pillEl = null;
let pillTextEl = null;
let pillRateEl = null;
let sayEl = null;
let sayTimer = 0;
let sayVisible = false;
let saySize = { w: 120, h: 30 };

let currentMode = 'idle'; // 'idle' | 'write' | 'laptop' | 'done' | 'sleepy'
let animToggle = false;
let animTimer = 0;
let wasBusy = false;
let busyStartedAt = 0;
let composerResizeObs = null;
let lastObservedComposer = null;
const scrollPaddedComposers = new WeakSet();
let layoutRafId = 0;
let lastBusyCheckTs = 0;
let busyCheckTimer = 0;
let donePillUntil = 0;
let donePillTimer = 0;
let doneModeResetTimer = 0;
let fxClearTimer = 0;

// Cached composer border geometry (updated ONLY by ResizeObserver / resize / collapse — NEVER read in rAF!)
const museGeom = {
  visible: false,
  composerLeft: 0,
  composerRight: 0,
  composerWidth: 0,
  composerTop: 0,
  winW: 1200,
  winH: 800,
  imgW: 110,
  imgH: 90,
  stageW: 110,
  stageH: 90,
  baseY: -9999,
  minX: 0,
  maxX: 0,
  centerX: 0,
  collapsedX: 0
};

// Pure-GPU 120Hz motion state
const museMotion = {
  rafId: 0,
  lastTs: 0,
  x: 0,
  hasX: false,
  targetX: 0,
  facing: 1,
  pillLeft: false,
  action: 'stand', // 'stand' | 'walk' | 'spin' | 'dance' | 'victory'
  actionStartMs: 0,
  actionDurationMs: 0,
  hopStartMs: 0,
  nextWalkAt: 0,
  nextTrickAt: 0,
  reducedMotion: false,
  lastStageTx: -99999,
  lastStageTy: -99999
};

// Dual-source real-time speed state (gemini-pulse telemetry + live DOM streaming estimator)
const liveSpeed = {
  domTimer: 0,
  lastBlock: null,
  lastLen: 0,
  lastSampleTs: 0,
  domEma: 0,
  domUpdatedAt: 0,
  telLatest: 0,
  telAvg: 0,
  telSteps: 0,
  telUpdatedAt: 0,
  lastValidRate: 0,
  lastCompletedRate: 0
};

function isReducedMotionPreferred() {
  try {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) {
    return false;
  }
}

function estimateTokensFromChars(sample, deltaChars) {
  if (deltaChars <= 0) return 0;
  let cjk = 0;
  const checkLen = Math.min(sample.length, 160);
  for (let i = 0; i < checkLen; i++) {
    const code = sample.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fff) cjk++;
  }
  const cjkRatio = checkLen > 0 ? (cjk / checkLen) : 0.35;
  const charsPerTok = 3.7 - cjkRatio * 2.25; // ~1.45 chars/tok for Chinese, ~3.7 for English/code
  return deltaChars / Math.max(1.3, charsPerTok);
}

function sampleDomStreamingSpeed() {
  if (document.hidden || !isBusy()) return;
  const blocks = collectConversationResponseBlocks();
  if (!blocks.length) return;
  const last = blocks[blocks.length - 1];
  if (!last || !last.isConnected) return;
  const text = last.textContent || '';
  const len = text.length;
  const now = performance.now();

  if (liveSpeed.lastBlock !== last || len < liveSpeed.lastLen) {
    liveSpeed.lastBlock = last;
    liveSpeed.lastLen = len;
    liveSpeed.lastSampleTs = now;
    return;
  }

  const dtSec = (now - liveSpeed.lastSampleTs) / 1000;
  const deltaChars = len - liveSpeed.lastLen;
  liveSpeed.lastLen = len;
  liveSpeed.lastSampleTs = now;

  if (dtSec >= 0.22 && deltaChars >= 3) {
    const tail = text.slice(Math.max(0, len - Math.min(deltaChars, 160)));
    const deltaTok = estimateTokensFromChars(tail, deltaChars);
    const instant = Math.max(1, Math.min(320, deltaTok / dtSec));
    liveSpeed.domEma = liveSpeed.domEma > 0
      ? (liveSpeed.domEma * 0.58 + instant * 0.42)
      : instant;
    liveSpeed.domUpdatedAt = Date.now();
    liveSpeed.lastValidRate = liveSpeed.domEma;
    refreshMusePillRate();
  } else if (liveSpeed.domUpdatedAt > 0 && (Date.now() - liveSpeed.domUpdatedAt) > 2600) {
    // Gentle decay when paused between tool calls
    liveSpeed.domEma *= 0.86;
    if (liveSpeed.domEma < 1.5) liveSpeed.domEma = 0;
  }
}

function startDomSpeedSampler() {
  if (liveSpeed.domTimer || document.hidden) return;
  liveSpeed.lastBlock = null;
  liveSpeed.lastLen = 0;
  liveSpeed.lastSampleTs = performance.now();
  liveSpeed.domTimer = window.setInterval(sampleDomStreamingSpeed, 450);
}

function stopDomSpeedSampler() {
  if (liveSpeed.domTimer) {
    window.clearInterval(liveSpeed.domTimer);
    liveSpeed.domTimer = 0;
  }
}

function onTelemetrySpeedUpdate(payload) {
  const m = payload && payload.metrics;
  if (!m) return;
  const latest = Number(m.latestStepTokPerSec || 0);
  const avg = Number(m.avgTokPerSec || 0);
  const steps = Number(m.steps || 0);
  const stepAdvanced = steps > liveSpeed.telSteps;
  if (steps > 0) liveSpeed.telSteps = steps;
  if (latest > 0) {
    liveSpeed.telLatest = latest;
    if (stepAdvanced || liveSpeed.telUpdatedAt === 0) {
      liveSpeed.telUpdatedAt = Date.now();
    }
    liveSpeed.lastValidRate = latest;
    if (!wasBusy && Date.now() < donePillUntil) {
      liveSpeed.lastCompletedRate = latest;
    }
  }
  if (avg > 0) {
    liveSpeed.telAvg = avg;
    if (!liveSpeed.lastValidRate) liveSpeed.lastValidRate = avg;
  }
  refreshMusePillRate();
}

function getLiveTokenSpeed(preferCompleted = false) {
  const now = Date.now();
  const domFresh = liveSpeed.domEma >= 2 && (now - liveSpeed.domUpdatedAt) < 3200;
  const telFresh = liveSpeed.telLatest >= 2 && (now - liveSpeed.telUpdatedAt) < 8000;

  if (preferCompleted) {
    if (liveSpeed.lastCompletedRate >= 2) return Math.round(liveSpeed.lastCompletedRate);
    if (liveSpeed.telLatest >= 2) return Math.round(liveSpeed.telLatest);
    if (liveSpeed.domEma >= 2) return Math.round(liveSpeed.domEma);
    if (liveSpeed.telAvg >= 2) return Math.round(liveSpeed.telAvg);
    return liveSpeed.lastValidRate >= 2 ? Math.round(liveSpeed.lastValidRate) : 0;
  }

  if (domFresh && telFresh) {
    return Math.round(liveSpeed.domEma * 0.65 + liveSpeed.telLatest * 0.35);
  }
  if (domFresh) return Math.round(liveSpeed.domEma);
  if (liveSpeed.telLatest >= 2) return Math.round(liveSpeed.telLatest);
  if (liveSpeed.telAvg >= 2) return Math.round(liveSpeed.telAvg);
  if (liveSpeed.lastValidRate >= 2) return Math.round(liveSpeed.lastValidRate);
  if (liveSpeed.lastCompletedRate >= 2) return Math.round(liveSpeed.lastCompletedRate);
  return 0;
}

function refreshMusePillRate() {
  if (!pillEl || !pillRateEl) return;
  const working = currentMode === 'laptop' || currentMode === 'write';
  const holdingDone = !working && Date.now() < donePillUntil;
  if (!working && !holdingDone) {
    pillEl.classList.remove('show', 'is-done');
    return;
  }
  const rate = getLiveTokenSpeed(holdingDone);
  if (rate > 0) {
    const rateTxt = '⚡ ' + rate + ' t/s';
    if (pillRateEl.textContent !== rateTxt) pillRateEl.textContent = rateTxt;
    pillRateEl.classList.add('has-rate');
  } else {
    pillRateEl.textContent = '';
    pillRateEl.classList.remove('has-rate');
  }
  if (holdingDone && pillTextEl) {
    if (pillTextEl.textContent !== '完成') pillTextEl.textContent = '完成';
    pillEl.classList.add('show', 'is-done');
  } else if (working) {
    pillEl.classList.add('show');
    pillEl.classList.remove('is-done');
  }
}

function isBusy() {
  if (document.querySelector('button[data-testid="input-stop-button"]')) return true;
  if (document.querySelector('[data-testid="running-items-card"]')) return true;
  const composer = document.querySelector('.surface-composer');
  if (composer && composer.querySelector('button[aria-label*="停止"], button[aria-label*="Stop"]')) return true;
  return false;
}

function detectWorkActivity() {
  let statusText = '';
  const scope = document.querySelector('main') || document.body;
  const candidates = scope.querySelectorAll('[data-testid*="status"], [data-testid*="focus"]');
  for (let i = candidates.length - 1; i >= 0; i--) {
    const el = candidates[i];
    if (isOwnControlElement(el)) continue;
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t && t.length >= 2 && t.length <= 64) {
      statusText = t;
      break;
    }
  }

  const codeRx = /终端|命令|运行|执行|脚本|代码|修改|编辑|写入|构建|测试|搜索|排查|查看|读取|插件|部署|terminal|command|run|edit|write|file|search|build|test|mcp/i;
  const isCode = codeRx.test(statusText);

  let mode = isCode ? 'laptop' : 'write';
  if (!statusText && busyStartedAt > 0) {
    mode = (Math.floor((Date.now() - busyStartedAt) / 6500) % 2 === 0) ? 'write' : 'laptop';
  }

  let label = statusText;
  if (!label || label.length > 22) {
    label = mode === 'laptop' ? '正在敲电脑处理…' : '正在伏案构思…';
  }
  return { mode, label };
}

function applyPoseFrame() {
  if (!spriteEl) return;
  let key = 'idle';
  if (currentMode === 'laptop') {
    key = animToggle ? 'laptop2' : 'laptop1';
  } else if (currentMode === 'write') {
    key = animToggle ? 'write2' : 'write1';
  } else if (currentMode === 'done') {
    key = 'done';
  } else if (currentMode === 'sleepy') {
    key = 'sleepy';
  }
  if (!poseLayers[key]) key = 'idle';
  if (key !== activePoseKey) {
    if (poseLayers[activePoseKey]) poseLayers[activePoseKey].classList.remove('active');
    if (poseLayers[key]) poseLayers[key].classList.add('active');
    activePoseKey = key;
  }
}

function startAnimTimerIfVisible() {
  window.clearInterval(animTimer);
  animTimer = 0;
  if (document.hidden) return;
  if (currentMode === 'laptop' || currentMode === 'write') {
    const interval = currentMode === 'laptop' ? 320 : 440;
    animTimer = window.setInterval(() => {
      if (document.hidden) return;
      animToggle = !animToggle;
      applyPoseFrame();
    }, interval);
  }
}

function fireHakimiSparkles() {
  if (!fxEl || museMotion.reducedMotion) return;
  fxEl.classList.remove('celebrate');
  // Restart CSS animation on next microframe without forcing sync reflow
  window.requestAnimationFrame(() => {
    if (!fxEl) return;
    fxEl.classList.add('celebrate');
    window.clearTimeout(fxClearTimer);
    fxClearTimer = window.setTimeout(() => {
      if (fxEl) fxEl.classList.remove('celebrate');
    }, 1450);
  });
}

function triggerHakimiCelebration(kind, speakLine) {
  const now = performance.now();
  museMotion.action = kind === 'spin' ? 'spin' : 'victory';
  museMotion.actionStartMs = now;
  museMotion.actionDurationMs = kind === 'spin' ? 920 : 2500;
  museMotion.nextWalkAt = now + museMotion.actionDurationMs + 2400;
  museMotion.nextTrickAt = now + 18000 + Math.random() * 6000;
  fireHakimiSparkles();
  if (speakLine) say(speakLine, 2600);
  startMuseMotionLoop();
}

function setMuseMode(nextMode, statusLabel, opts) {
  const silentDone = Boolean(opts && opts.silentDone);
  if (currentMode !== nextMode) {
    currentMode = nextMode;
    animToggle = false;
    startAnimTimerIfVisible();
    applyPoseFrame();
  }

  const working = nextMode === 'laptop' || nextMode === 'write';
  if (working) {
    donePillUntil = 0;
    window.clearTimeout(donePillTimer);
    donePillTimer = 0;
    startDomSpeedSampler();
    if (museMotion.action === 'walk') {
      museMotion.action = 'stand';
    }
    if (pillEl && pillTextEl) {
      const label = statusLabel || (nextMode === 'laptop' ? '正在敲电脑处理…' : '正在伏案构思…');
      if (pillTextEl.textContent !== label) pillTextEl.textContent = label;
    }
    refreshMusePillRate();
  } else {
    stopDomSpeedSampler();
    if (nextMode === 'done' && !silentDone) {
      donePillUntil = Date.now() + 6000;
      window.clearTimeout(donePillTimer);
      donePillTimer = window.setTimeout(() => {
        donePillUntil = 0;
        refreshMusePillRate();
      }, 6100);
      refreshMusePillRate();
    } else if (Date.now() >= donePillUntil) {
      refreshMusePillRate();
    }
  }

  if (nextMode === 'sleepy') {
    museMotion.action = 'stand';
  }
  startMuseMotionLoop();
}

function updateSayBubbleFromCache() {
  if (!sayEl || !sayVisible || !museGeom.visible) return;
  const cx = museMotion.x + museGeom.stageW / 2;
  let left = cx - saySize.w / 2;
  left = Math.max(8, Math.min(museGeom.winW - saySize.w - 8, left));
  let top = museGeom.baseY - saySize.h - 5;
  if (top < 40) top = museGeom.baseY + museGeom.stageH + 6;
  sayEl.style.transform = 'translate3d(' + Math.round(left) + 'px,' + Math.round(top) + 'px,0)';
}

function say(text, ms) {
  if (!sayEl || !stageEl) return;
  sayEl.textContent = text;
  sayEl.style.display = 'block';
  sayVisible = true;
  // Measure once right when text changes (outside rAF!)
  saySize.w = sayEl.offsetWidth || 120;
  saySize.h = sayEl.offsetHeight || 30;
  updateSayBubbleFromCache();
  window.clearTimeout(sayTimer);
  sayTimer = window.setTimeout(() => {
    sayVisible = false;
    if (sayEl) sayEl.style.display = 'none';
  }, ms || 2500);
}

function ensureChatScrollPaddingOnce(composer) {
  if (!composer || scrollPaddedComposers.has(composer)) return;
  scrollPaddedComposers.add(composer);
  let cur = composer.parentElement;
  while (cur && cur !== document.body) {
    const prev = cur.previousElementSibling;
    if (prev) {
      const cs = window.getComputedStyle(prev);
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
        prev.classList.add('agy-muse-scroll-pad');
        return;
      }
      const innerScroll = prev.querySelector('[class*="overflow-y-auto"]');
      if (innerScroll) {
        innerScroll.classList.add('agy-muse-scroll-pad');
        return;
      }
    }
    cur = cur.parentElement;
  }
}

function syncPillSideFromX(xPx) {
  if (!pillEl || museGeom.composerWidth <= 0) return;
  const centerRatio = (xPx + museGeom.stageW * 0.5 - museGeom.composerLeft) / museGeom.composerWidth;
  if (!museMotion.pillLeft && centerRatio > 0.60) {
    museMotion.pillLeft = true;
    pillEl.classList.add('pill-left');
  } else if (museMotion.pillLeft && centerRatio < 0.54) {
    museMotion.pillLeft = false;
    pillEl.classList.remove('pill-left');
  }
}

function applyStageTransform(xPx, yPx) {
  const rx = Math.round(xPx * 2) / 2;
  const ry = Math.round(yPx);
  if (museMotion.lastStageTx !== rx || museMotion.lastStageTy !== ry) {
    museMotion.lastStageTx = rx;
    museMotion.lastStageTy = ry;
    stageEl.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
  }
  syncPillSideFromX(rx);
  if (sayVisible) updateSayBubbleFromCache();
}

function pickNextBorderWalkTarget() {
  const span = museGeom.maxX - museGeom.minX;
  if (span < 36) return museGeom.centerX;
  const minDist = Math.min(120, Math.max(42, span * 0.26));
  for (let tries = 0; tries < 6; tries++) {
    const cand = museGeom.minX + Math.random() * span;
    if (Math.abs(cand - museMotion.x) >= minDist) return cand;
  }
  return museMotion.x > (museGeom.minX + span * 0.5)
    ? (museGeom.minX + span * 0.14)
    : (museGeom.maxX - span * 0.14);
}

function shouldRunMuseMotion() {
  return Boolean(
    stageEl &&
    bodyEl &&
    museGeom.visible &&
    !document.hidden &&
    !stageEl.classList.contains('collapsed') &&
    !museMotion.reducedMotion
  );
}

function stopMuseMotionLoop() {
  if (museMotion.rafId) {
    window.cancelAnimationFrame(museMotion.rafId);
    museMotion.rafId = 0;
  }
  museMotion.lastTs = 0;
}

function stepMuseMotion(ts) {
  museMotion.rafId = 0;
  if (!shouldRunMuseMotion()) return;

  const dt = museMotion.lastTs ? Math.min(0.05, Math.max(0.001, (ts - museMotion.lastTs) / 1000)) : 0.016;
  museMotion.lastTs = ts;
  const t = ts * 0.001;

  let bodyY = 0;
  let rotDeg = 0;
  let sx = 1;
  let sy = 1;
  let shadowScale = 1;
  let displayFacing = museMotion.facing;

  // 1. Victory dance (360° spin + celebratory dance) or spontaneous spin/dance
  if (museMotion.action === 'victory') {
    const elapsed = ts - museMotion.actionStartMs;
    if (elapsed >= museMotion.actionDurationMs) {
      museMotion.action = 'stand';
    } else if (elapsed < 760) {
      // Phase 1: energetic jump + full 360° spin!
      const p = elapsed / 760;
      const eased = 1 - Math.pow(1 - p, 3);
      bodyY = -Math.sin(p * Math.PI) * 19;
      rotDeg = eased * 360 * museMotion.facing;
      const pop = 1 + Math.sin(p * Math.PI) * 0.10;
      sx = pop;
      sy = pop;
      shadowScale = Math.max(0.55, 1 - Math.sin(p * Math.PI) * 0.36);
    } else {
      // Phase 2: rhythmic victory dance with double hops & joyful sway
      const d = (elapsed - 760) / 1000;
      const hop = Math.abs(Math.sin(d * 8.4));
      bodyY = -hop * 10.5;
      rotDeg = Math.sin(d * 8.4) * 11.5;
      displayFacing = (Math.floor(d * 2.1) % 2 === 0) ? museMotion.facing : -museMotion.facing;
      sx = 1 + (1 - hop) * 0.05;
      sy = 1 - (1 - hop) * 0.04;
      shadowScale = 1 - hop * 0.22;
    }
  } else if (museMotion.action === 'spin') {
    const elapsed = ts - museMotion.actionStartMs;
    if (elapsed >= museMotion.actionDurationMs) {
      museMotion.action = 'stand';
    } else {
      const p = elapsed / museMotion.actionDurationMs;
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      bodyY = -Math.sin(p * Math.PI) * 16;
      rotDeg = eased * 360 * museMotion.facing;
      const pop = 1 + Math.sin(p * Math.PI) * 0.08;
      sx = pop;
      sy = pop;
      shadowScale = Math.max(0.60, 1 - Math.sin(p * Math.PI) * 0.32);
    }
  } else if (museMotion.action === 'dance') {
    const elapsed = ts - museMotion.actionStartMs;
    if (elapsed >= museMotion.actionDurationMs) {
      museMotion.action = 'stand';
    } else {
      const d = elapsed / 1000;
      const beat = Math.abs(Math.sin(d * 7.8));
      bodyY = -beat * 8.5;
      rotDeg = Math.sin(d * 7.8) * 10;
      displayFacing = (Math.floor(d * 1.6) % 2 === 0) ? museMotion.facing : -museMotion.facing;
      sx = 1 + (1 - beat) * 0.045;
      sy = 1 - (1 - beat) * 0.04;
      shadowScale = 1 - beat * 0.18;
    }
  } else if (currentMode === 'laptop') {
    // Energetic rapid typing bounce & side groove
    const beat = Math.sin(t * 14.5);
    const groove = Math.sin(t * 6.4);
    bodyY = -Math.abs(beat) * 2.8 - 0.8;
    rotDeg = groove * 3.6;
    sx = 1 + beat * 0.022;
    sy = 1 - beat * 0.022;
    shadowScale = 1 - Math.abs(beat) * 0.07;
  } else if (currentMode === 'write') {
    // Focused rhythmic writing bob & pen-stroke tilt
    const stroke = Math.sin(t * 7.2);
    bodyY = -1.4 + stroke * 1.8;
    rotDeg = Math.sin(t * 5.2) * 3.8;
    sx = 1 + stroke * 0.018;
    sy = 1 - stroke * 0.018;
    shadowScale = 0.98;
  } else if (currentMode === 'sleepy') {
    // Slow cozy breathing
    const zzz = Math.sin(t * 1.15);
    bodyY = zzz * 1.2;
    rotDeg = -2.2 + zzz * 0.9;
    sx = 1 + zzz * 0.015;
    sy = 1 - zzz * 0.015;
  } else {
    // Idle: full-border strolling + spontaneous mini-dances & 360° spins
    if (museMotion.action === 'walk') {
      const dx = museMotion.targetX - museMotion.x;
      const dist = Math.abs(dx);
      if (dist <= 1.2) {
        museMotion.x = museMotion.targetX;
        museMotion.action = 'stand';
        museMotion.nextWalkAt = ts + 5200 + Math.random() * 3000;
      } else {
        museMotion.facing = dx >= 0 ? 1 : -1;
        displayFacing = museMotion.facing;
        const speed = Math.min(92, Math.max(32, dist * 1.35));
        const step = Math.min(dist, speed * dt);
        museMotion.x += Math.sign(dx) * step;
        const hop = Math.abs(Math.sin(t * 10.5));
        bodyY = -hop * 5.2;
        rotDeg = Math.sin(t * 10.5) * 4.8;
        sx = 1 + (1 - hop) * 0.03;
        sy = 1 - (1 - hop) * 0.03;
        shadowScale = 1 - hop * 0.14;
      }
    } else {
      // Standing idle with lively breathing
      const br = Math.sin(t * 2.2);
      bodyY = -1.1 + br * 1.7;
      rotDeg = Math.sin(t * 1.25) * 1.4;
      if (!museMotion.nextWalkAt) museMotion.nextWalkAt = ts + 4200 + Math.random() * 2800;
      if (!museMotion.nextTrickAt) museMotion.nextTrickAt = ts + 16000 + Math.random() * 8000;

      if (ts >= museMotion.nextTrickAt) {
        const doSpin = Math.random() < 0.45;
        museMotion.action = doSpin ? 'spin' : 'dance';
        museMotion.actionStartMs = ts;
        museMotion.actionDurationMs = doSpin ? 900 : 2100;
        museMotion.nextTrickAt = ts + 17000 + Math.random() * 7500;
        museMotion.nextWalkAt = ts + museMotion.actionDurationMs + 3200;
        if (doSpin) fireHakimiSparkles();
      } else if (ts >= museMotion.nextWalkAt && (museGeom.maxX - museGeom.minX) >= 36) {
        museMotion.targetX = pickNextBorderWalkTarget();
        museMotion.facing = museMotion.targetX >= museMotion.x ? 1 : -1;
        museMotion.action = 'walk';
      }
    }
  }

  // Click micro-hop overlay
  if (museMotion.hopStartMs > 0) {
    const he = ts - museMotion.hopStartMs;
    if (he >= 340) {
      museMotion.hopStartMs = 0;
    } else {
      bodyY -= Math.sin((he / 340) * Math.PI) * 9;
    }
  }

  // Clamp within cached composer border & push single GPU transforms (ZERO DOM reads!)
  museMotion.x = Math.max(museGeom.minX, Math.min(museGeom.maxX, museMotion.x));
  applyStageTransform(museMotion.x, museGeom.baseY);

  bodyEl.style.transform =
    'translate3d(0,' + bodyY.toFixed(2) + 'px,0) ' +
    'scaleX(' + (displayFacing * sx).toFixed(3) + ') ' +
    'scaleY(' + sy.toFixed(3) + ') ' +
    'rotate(' + rotDeg.toFixed(2) + 'deg)';

  if (shadowEl) {
    shadowEl.style.transform = 'translate3d(0,0,0) scaleX(' + shadowScale.toFixed(3) + ')';
    shadowEl.style.opacity = String(Math.max(0.42, shadowScale).toFixed(2));
  }

  museMotion.rafId = window.requestAnimationFrame(stepMuseMotion);
}

function startMuseMotionLoop() {
  if (!shouldRunMuseMotion()) {
    stopMuseMotionLoop();
    return;
  }
  if (!museMotion.rafId) {
    museMotion.lastTs = 0;
    museMotion.rafId = window.requestAnimationFrame(stepMuseMotion);
  }
}

function scheduleLayoutMuseStage() {
  if (layoutRafId) return;
  layoutRafId = window.requestAnimationFrame(() => {
    layoutRafId = 0;
    layoutMuseStageNow();
  });
}

function layoutMuseStageNow() {
  if (!stageEl) return;
  const composer = document.querySelector('.surface-composer');
  if (!composer) {
    if (museGeom.visible) {
      museGeom.visible = false;
      stageEl.style.display = 'none';
      stopMuseMotionLoop();
    }
    return;
  }
  const cr = composer.getBoundingClientRect();
  if (cr.width < 180 || cr.top < 80 || cr.height === 0) {
    if (museGeom.visible) {
      museGeom.visible = false;
      stageEl.style.display = 'none';
      stopMuseMotionLoop();
    }
    return;
  }

  ensureChatScrollPaddingOnce(composer);

  const isCollapsed = stageEl.classList.contains('collapsed');
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const imgH = winH < 660 ? 76 : 90;
  const imgW = Math.round(imgH * (560 / 460));
  const stageH = isCollapsed ? 30 : imgH;
  const stageW = isCollapsed ? 76 : imgW;
  const overhang = isCollapsed ? 0 : Math.round(imgH * 0.20 - 1);
  const baseY = Math.round(cr.top + overhang - stageH);
  const inset = Math.min(24, Math.max(10, Math.round(cr.width * 0.04)));
  const minX = Math.round(cr.left + inset);
  const maxX = Math.max(minX, Math.round(cr.right - inset - stageW));
  const centerX = Math.max(minX, Math.min(maxX, Math.round(cr.left + cr.width / 2 - stageW / 2)));
  const collapsedX = Math.round(cr.left + cr.width / 2 - 38);

  const prevW = museGeom.imgW;
  const prevH = museGeom.imgH;

  museGeom.composerLeft = cr.left;
  museGeom.composerRight = cr.right;
  museGeom.composerWidth = cr.width;
  museGeom.composerTop = cr.top;
  museGeom.winW = winW;
  museGeom.winH = winH;
  museGeom.imgW = imgW;
  museGeom.imgH = imgH;
  museGeom.stageW = stageW;
  museGeom.stageH = stageH;
  museGeom.baseY = baseY;
  museGeom.minX = minX;
  museGeom.maxX = maxX;
  museGeom.centerX = centerX;
  museGeom.collapsedX = collapsedX;

  if (!museGeom.visible) {
    stageEl.style.display = 'flex';
    museGeom.visible = true;
  }
  if (spriteEl && (prevW !== imgW || prevH !== imgH || !spriteEl.style.width)) {
    spriteEl.style.width = imgW + 'px';
    spriteEl.style.height = imgH + 'px';
  }

  if (isCollapsed) {
    stopMuseMotionLoop();
    museMotion.lastStageTx = -99999;
    applyStageTransform(collapsedX, baseY);
    return;
  }

  if (!museMotion.hasX) {
    museMotion.x = centerX;
    museMotion.targetX = centerX;
    museMotion.hasX = true;
  } else {
    museMotion.x = Math.max(minX, Math.min(maxX, museMotion.x));
    museMotion.targetX = Math.max(minX, Math.min(maxX, museMotion.targetX));
  }
  applyStageTransform(museMotion.x, baseY);

  if (museMotion.reducedMotion && bodyEl) {
    bodyEl.style.transform = 'translate3d(0,0,0)';
  }
  startMuseMotionLoop();
}

function syncHakimiStateThrottled(immediate = false) {
  if (!stageEl) return;
  const now = performance.now();
  const elapsed = now - lastBusyCheckTs;
  if (!immediate && elapsed < 250) {
    if (!busyCheckTimer) {
      busyCheckTimer = window.setTimeout(() => {
        busyCheckTimer = 0;
        syncHakimiStateNow();
      }, 250 - elapsed);
    }
    return;
  }
  if (busyCheckTimer) {
    window.clearTimeout(busyCheckTimer);
    busyCheckTimer = 0;
  }
  syncHakimiStateNow();
}

function syncHakimiStateNow() {
  lastBusyCheckTs = performance.now();
  if (!stageEl) return;
  const busy = isBusy();
  if (busy) {
    if (!wasBusy) {
      busyStartedAt = Date.now();
      liveSpeed.domEma = 0;
      liveSpeed.domUpdatedAt = 0;
      window.clearTimeout(doneModeResetTimer);
      doneModeResetTimer = 0;
    }
    wasBusy = true;
    const act = detectWorkActivity();
    setMuseMode(act.mode, act.label);
  } else if (wasBusy) {
    wasBusy = false;
    busyStartedAt = 0;
    const finalRate = getLiveTokenSpeed(false);
    if (finalRate > 0) liveSpeed.lastCompletedRate = finalRate;
    setMuseMode('done');
    const doneLine = DONE_LINES[Math.floor(Math.random() * DONE_LINES.length)]
      + (finalRate > 0 ? (' · ⚡ ' + finalRate + ' t/s') : '');
    triggerHakimiCelebration('victory', doneLine);
    window.clearTimeout(doneModeResetTimer);
    doneModeResetTimer = window.setTimeout(() => {
      if (!isBusy() && currentMode === 'done') setMuseMode('idle');
    }, 2600);
  }
}

function mountMuseHakimi() {
  for (const oldId of ['hakimi-dock', 'agy-composer-top-strip', 'agy-token-telemetry-bar']) {
    const old = document.getElementById(oldId);
    if (old) old.remove();
  }

  if (!POSES || !POSES.idle) return;
  museMotion.reducedMotion = isReducedMotionPreferred();

  const existing = document.getElementById('hakimi-muse-stage');
  if (existing && document.getElementById('hakimi-muse-sprite') && existing.querySelector('.hakimi-body') && existing.querySelector('.muse-pill-rate')) {
    stageEl = existing;
    spriteEl = document.getElementById('hakimi-muse-sprite');
    bodyEl = spriteEl.querySelector('.hakimi-body');
    shadowEl = document.getElementById('hakimi-muse-shadow');
    fxEl = document.getElementById('hakimi-muse-fx');
    pillEl = document.getElementById('hakimi-muse-pill');
    pillTextEl = pillEl ? pillEl.querySelector('.muse-pill-txt') : null;
    pillRateEl = pillEl ? pillEl.querySelector('.muse-pill-rate') : null;
    sayEl = document.getElementById('hakimi-say');
    poseLayers = {};
    spriteEl.querySelectorAll('.hakimi-pose-layer').forEach((img) => {
      if (img.dataset.pose) poseLayers[img.dataset.pose] = img;
    });
    scheduleLayoutMuseStage();
    return;
  } else if (existing) {
    existing.remove();
    document.getElementById('hakimi-say')?.remove();
  }

  const urls = buildPoseObjectUrls();

  stageEl = document.createElement('div');
  stageEl.id = 'hakimi-muse-stage';
  stageEl.className = 'notranslate';
  try {
    if (localStorage.getItem(MUSE_COLLAPSED_STORE) === '1') {
      stageEl.classList.add('collapsed');
    }
  } catch (_) {}

  const wrap = document.createElement('div');
  wrap.id = 'hakimi-muse-wrap';

  spriteEl = document.createElement('div');
  spriteEl.id = 'hakimi-muse-sprite';
  spriteEl.title = '左键对话报速 · 双击 360° 转圈跳舞 · Shift+双击打盹 · 右键折叠';

  shadowEl = document.createElement('div');
  shadowEl.id = 'hakimi-muse-shadow';
  spriteEl.appendChild(shadowEl);

  fxEl = document.createElement('div');
  fxEl.id = 'hakimi-muse-fx';
  fxEl.setAttribute('aria-hidden', 'true');
  fxEl.innerHTML =
    '<span class="hakimi-spark s1">✦</span>' +
    '<span class="hakimi-spark s2">✧</span>' +
    '<span class="hakimi-spark s3">★</span>' +
    '<span class="hakimi-spark s4">✦</span>';
  spriteEl.appendChild(fxEl);

  bodyEl = document.createElement('div');
  bodyEl.className = 'hakimi-body';

  poseLayers = {};
  for (let i = 0; i < POSE_KEYS.length; i++) {
    const key = POSE_KEYS[i];
    if (!urls[key]) continue;
    const img = document.createElement('img');
    img.className = 'hakimi-pose-layer' + (key === 'idle' ? ' active' : '');
    img.dataset.pose = key;
    img.alt = key === 'idle' ? '哈基米' : '';
    img.draggable = false;
    img.decoding = 'async';
    img.src = urls[key];
    // Pre-decode all 7 frames once in background so frame swaps are 0ms GPU opacity flips
    if (typeof img.decode === 'function') img.decode().catch(() => {});
    poseLayers[key] = img;
    bodyEl.appendChild(img);
  }
  spriteEl.appendChild(bodyEl);
  activePoseKey = 'idle';

  pillEl = document.createElement('div');
  pillEl.id = 'hakimi-muse-pill';
  pillEl.title = '点击查看实时模型额度与上下文';
  pillEl.innerHTML = '<span class="muse-pulse-dot"></span><span class="muse-pill-txt">正在构思…</span><span class="muse-pill-rate"></span>';
  pillTextEl = pillEl.querySelector('.muse-pill-txt');
  pillRateEl = pillEl.querySelector('.muse-pill-rate');
  pillEl.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePulseSidePanel();
  });

  const mini = document.createElement('div');
  mini.id = 'hakimi-muse-mini';
  mini.title = '点击展开哈基米挂件';
  mini.innerHTML = '<span style="color:var(--gs-accent,#1a73e8)">✦</span><span>哈基米</span>';
  mini.addEventListener('click', (e) => {
    e.stopPropagation();
    stageEl.classList.remove('collapsed');
    try { localStorage.setItem(MUSE_COLLAPSED_STORE, '0'); } catch (_) {}
    museMotion.lastStageTx = -99999;
    scheduleLayoutMuseStage();
  });

  spriteEl.addEventListener('click', (e) => {
    e.stopPropagation();
    museMotion.hopStartMs = performance.now();
    const rate = getLiveTokenSpeed(!isBusy());
    if (currentMode === 'sleepy') {
      setMuseMode('idle');
      say('醒啦！' + (rate > 0 ? ('上次跑了 ⚡ ' + rate + ' t/s，随时开工！') : '随时等你吩咐～'));
      return;
    }
    const pool = currentMode === 'laptop' ? LAPTOP_LINES
      : currentMode === 'write' ? WRITE_LINES
      : currentMode === 'done' ? DONE_LINES
      : IDLE_LINES;
    const base = pool[Math.floor(Math.random() * pool.length)];
    const rateSuffix = rate > 0
      ? (isBusy() ? (' · 实时 ⚡ ' + rate + ' t/s') : (' · 上次 ⚡ ' + rate + ' t/s'))
      : '';
    say(base + rateSuffix, 2600);
  });

  spriteEl.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) {
      if (isBusy()) return;
      const next = currentMode === 'sleepy' ? 'idle' : 'sleepy';
      setMuseMode(next);
      say(next === 'sleepy'
        ? SLEEPY_LINES[Math.floor(Math.random() * SLEEPY_LINES.length)]
        : '伸个懒腰，醒啦！');
      return;
    }
    const rate = getLiveTokenSpeed(!isBusy());
    const cheer = CELEBRATE_LINES[Math.floor(Math.random() * CELEBRATE_LINES.length)]
      + (rate > 0 ? (' · ⚡ ' + rate + ' t/s') : '');
    if (!isBusy()) {
      setMuseMode('done', '', { silentDone: true });
      window.clearTimeout(doneModeResetTimer);
      doneModeResetTimer = window.setTimeout(() => {
        if (!isBusy() && currentMode === 'done') setMuseMode('idle');
      }, 2500);
    }
    triggerHakimiCelebration('victory', cheer);
  });

  spriteEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    stageEl.classList.add('collapsed');
    try { localStorage.setItem(MUSE_COLLAPSED_STORE, '1'); } catch (_) {}
    stopMuseMotionLoop();
    museMotion.lastStageTx = -99999;
    scheduleLayoutMuseStage();
  });

  wrap.appendChild(spriteEl);
  wrap.appendChild(pillEl);
  wrap.appendChild(mini);
  stageEl.appendChild(wrap);

  sayEl = document.createElement('div');
  sayEl.id = 'hakimi-say';
  sayEl.className = 'notranslate';
  sayEl.style.display = 'none';

  document.body.appendChild(stageEl);
  document.body.appendChild(sayEl);

  wasBusy = isBusy();
  if (wasBusy) {
    busyStartedAt = Date.now();
    const act = detectWorkActivity();
    setMuseMode(act.mode, act.label);
  } else {
    setMuseMode('idle');
  }
  scheduleLayoutMuseStage();

  if (!window.__HAKIMI_MUSE_EVENTS__) {
    window.__HAKIMI_MUSE_EVENTS__ = true;
    window.addEventListener('resize', () => {
      scheduleLayoutMuseStage();
      positionCodexPopover();
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      document.documentElement.classList.toggle('agy-page-hidden', document.hidden);
      startAnimTimerIfVisible();
      if (document.hidden) {
        stopMuseMotionLoop();
        stopDomSpeedSampler();
      } else {
        startMuseMotionLoop();
        if (isBusy()) startDomSpeedSampler();
      }
    });
    try {
      const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq) {
        const onMqChange = () => {
          museMotion.reducedMotion = Boolean(mq.matches);
          if (museMotion.reducedMotion) {
            stopMuseMotionLoop();
            if (bodyEl) bodyEl.style.transform = 'translate3d(0,0,0)';
          } else {
            startMuseMotionLoop();
          }
        };
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMqChange);
        else if (typeof mq.addListener === 'function') mq.addListener(onMqChange);
      }
    } catch (_) {}
  }
}

function bindComposerResizeObserver(composer) {
  if (!composer) return;
  if (lastObservedComposer === composer) return;
  lastObservedComposer = composer;
  if (typeof ResizeObserver !== 'undefined') {
    if (!composerResizeObs) {
      composerResizeObs = new ResizeObserver(() => scheduleLayoutMuseStage());
    }
    composerResizeObs.disconnect();
    composerResizeObs.observe(composer);
    if (composer.parentElement) composerResizeObs.observe(composer.parentElement);
    const mainEl = document.querySelector('main');
    if (mainEl) composerResizeObs.observe(mainEl);
  }
  scheduleLayoutMuseStage();
}

// ==================== Part 4: Codex Context Ring + Popover + Side Panel ====================

const SEG_COLOR_HEX = {
  tools: '#0d9488',
  messages: '#2563eb',
  system: '#d97706',
  rules: '#64748b',
  thinking: '#7c3aed'
};

let popHideTimer = 0;

function fmtCompact(n) {
  const v = Number(n || 0);
  if (v >= 1000000) return (v / 1000000).toFixed(v >= 10000000 ? 1 : 2).replace(/\.00$/, '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(v >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return String(v);
}

function fmtResetShort(sec) {
  if (sec === null || sec === undefined || sec < 0) return '';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.max(1, Math.floor((sec % 3600) / 60));
  if (d > 0) return d + '天' + h + 'h 后重置';
  if (h > 0) return h + 'h' + m + 'm 后重置';
  return m + 'm 后重置';
}

function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function findPermissionButtonInComposer(composer) {
  if (!composer) return null;
  const micBtn = composer.querySelector('button[data-tooltip-id="input-send-button-record-tooltip"]');
  const sendBtn = composer.querySelector('button[data-testid="input-send-button"], button[data-testid="input-stop-button"], button[aria-label*="Send"], button[aria-label*="发送"]');
  const buttons = Array.from(composer.querySelectorAll('button, [role="button"]')).filter((b) => b.id !== 'agy-codex-ctx-btn');

  const permRx = /\b(Turbo|Auto|Strict|Review|Ask|Sandbox|Always\s*proceed|Request\s*review)\b|自动|极速|严格|审核|沙箱|始终允许|请求审查/i;
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    if (b === micBtn || b === sendBtn) continue;
    const txt = (b.textContent || '').replace(/\s+/g, ' ').trim();
    const aria = (b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '');
    if (permRx.test(txt) || /permission|execution|policy|sandbox|权限|执行策略/i.test(aria)) {
      return b;
    }
  }

  if (micBtn && micBtn.previousElementSibling && micBtn.previousElementSibling.id !== 'agy-codex-ctx-btn') {
    return micBtn;
  }
  return micBtn || sendBtn || null;
}

function ensurePulseSideDrawer() {
  let drawer = document.getElementById('agy-pulse-drawer');
  if (drawer) return drawer;

  drawer = document.createElement('aside');
  drawer.id = 'agy-pulse-drawer';
  drawer.className = 'notranslate';
  drawer.inert = true;
  drawer.setAttribute('aria-label', 'Gemini 额度与上下文');
  drawer.innerHTML =
    '<div class="pulse-drawer-head">' +
      '<span class="pulse-drawer-title">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gs-accent,#1a73e8)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9" stroke-opacity="0.25"/><path d="M12 3a9 9 0 1 1-8.4 12.2"/><path d="M12 7.5c.3 2.2 2.3 4.2 4.5 4.5-2.2.3-4.2 2.3-4.5 4.5-.3-2.2-2.3-4.2-4.5-4.5 2.2-.3 4.2-2.3 4.5-4.5Z" fill="var(--gs-accent,#1a73e8)" stroke="none"/></svg>' +
        '<span>Gemini 额度与上下文</span>' +
      '</span>' +
      '<button type="button" class="pulse-close" aria-label="关闭额度面板" title="关闭额度面板（Esc）">关闭</button>' +
    '</div>' +
    '<iframe id="agy-pulse-iframe" title="Gemini Pulse"></iframe>';

  drawer.querySelector('.pulse-close').addEventListener('click', () => closePulseViews(true));

  document.body.appendChild(drawer);
  return drawer;
}

function notifyPulseFrame(msg) {
  const frame = document.getElementById('agy-pulse-iframe');
  if (!frame || !frame.src || !frame.contentWindow) return;
  try {
    frame.contentWindow.postMessage(msg, new URL(frame.src).origin);
  } catch (_) {}
}

function closeThemeMenu() {
  document.getElementById('agy-theme-menu')?.classList.remove('open');
}

function closeUpdatePopover() {
  document.getElementById('agy-kit-update-pop')?.classList.remove('open');
}

function closePulseViews(restoreFocus = false) {
  const drawer = document.getElementById('agy-pulse-drawer');
  const pop = document.getElementById('agy-codex-ctx-popover');
  closeThemeMenu();
  closeUpdatePopover();
  if (!drawer?.classList.contains('open') && !pop?.classList.contains('open')) return false;
  window.clearTimeout(popHideTimer);
  pop?.classList.remove('open');
  if (drawer && drawer.classList.contains('open')) {
    drawer.classList.remove('open');
    drawer.inert = true;
    notifyPulseFrame({ type: 'gemini-pulse:active', active: false });
  }
  const btn = document.getElementById('agy-codex-ctx-btn');
  if (btn) {
    btn.classList.remove('drawer-open');
    btn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) btn.focus({ preventScroll: true });
  }
  return true;
}

function dismissPulseOutside(event) {
  const target = event.target;
  if (target instanceof Element) {
    if (!target.closest('#agy-theme-menu, #agy-inline-theme-btn')) closeThemeMenu();
    if (!target.closest('#agy-kit-update-pop, #agy-kit-update-wrap')) closeUpdatePopover();
    if (target.closest('#agy-pulse-drawer, #agy-codex-ctx-popover, #agy-codex-ctx-btn')) return;
  }
  closePulseViews();
}

if (!window.__AGY_GLOBAL_LISTENERS__) {
  window.__AGY_GLOBAL_LISTENERS__ = true;
  document.addEventListener('pointerdown', dismissPulseOutside, true);
  document.addEventListener('click', dismissPulseOutside, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (closeInlineAskPopover()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (closePulseViews(true)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }, true);
  window.addEventListener('message', (event) => {
    if (event.data !== 'gemini-pulse:close') return;
    const frame = document.getElementById('agy-pulse-iframe');
    if (frame?.src && event.source === frame.contentWindow && event.origin === new URL(frame.src).origin) {
      closePulseViews(true);
    }
  });
}

function buildPulseUrl(pathAndQuery) {
  const port = normalizeTelemetryPort(window.__agyTelemetryPort);
  if (!port) return '';
  const sep = pathAndQuery.indexOf('?') === -1 ? '?' : '&';
  const tok = window.__agyTelemetryToken ? (sep + 'token=' + encodeURIComponent(window.__agyTelemetryToken)) : '';
  return 'http://127.0.0.1:' + port + pathAndQuery + tok;
}

function togglePulseSidePanel() {
  const drawer = ensurePulseSideDrawer();
  if (drawer.classList.contains('open')) {
    closePulseViews(true);
    return;
  }
  document.getElementById('agy-codex-ctx-popover')?.classList.remove('open');
  const port = normalizeTelemetryPort(window.__agyTelemetryPort);
  if (!port) {
    say('额度服务尚未就绪，请先启用 gemini-pulse 插件或稍候重试', 2600);
    return;
  }
  const surf = getEffectiveSurfaceForPulse();
  const frame = drawer.querySelector('iframe');
  const tokenSig = String(port) + ':' + String(window.__agyTelemetryToken || '');
  if (!frame.src || frame.dataset.portSig !== tokenSig) {
    frame.dataset.surf = surf;
    frame.dataset.portSig = tokenSig;
    frame.src = buildPulseUrl('/?theme=' + encodeURIComponent(surf));
  } else {
    if (frame.dataset.surf !== surf) {
      frame.dataset.surf = surf;
      notifyPulseFrame({ type: 'gemini-pulse:surface', surface: surf });
    }
    notifyPulseFrame({ type: 'gemini-pulse:active', active: true });
  }
  drawer.inert = false;
  drawer.classList.add('open');
  const btn = document.getElementById('agy-codex-ctx-btn');
  if (btn) {
    btn.classList.add('drawer-open');
    btn.setAttribute('aria-expanded', 'true');
  }
  drawer.querySelector('.pulse-close').focus({ preventScroll: true });
  window.setTimeout(scheduleLayoutMuseStage, 200);
}

function positionCodexPopover() {
  const pop = document.getElementById('agy-codex-ctx-popover');
  const btn = document.getElementById('agy-codex-ctx-btn');
  if (!pop || !btn || !pop.classList.contains('open')) return;
  const r = btn.getBoundingClientRect();
  if (r.width === 0) {
    pop.classList.remove('open');
    return;
  }
  const w = pop.offsetWidth || 288;
  const h = pop.offsetHeight || 176;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(10, Math.min(window.innerWidth - w - 10, left));
  let top = r.top - h - 10;
  if (top < 10) top = r.bottom + 10;
  pop.style.left = Math.round(left) + 'px';
  pop.style.top = Math.round(top) + 'px';
}

function renderCodexPopoverContent(payload) {
  const pop = document.getElementById('agy-codex-ctx-content');
  if (!pop) return;
  const m = payload && payload.metrics;
  if (!m) {
    const readyHint = normalizeTelemetryPort(window.__agyTelemetryPort)
      ? '发送首条消息后即可实时统计上下文构成与模型配额。'
      : '未检测到本地 gemini-pulse 额度服务，开启插件后将自动接入。';
    pop.innerHTML =
      '<div class="cpop-head"><span class="cpop-title">上下文窗口</span><span class="cpop-badge">待就绪</span></div>' +
      '<div style="color:var(--gs-ink-2);font-size:11.5px;">' + escHtml(readyHint) + '</div>' +
      '<button type="button" class="cpop-foot-btn" id="cpopOpenSideBtn"><span>在侧边窗口打开额度看板</span><span>→</span></button>';
  } else {
    const bList = m.breakdown || [];
    const barSegs = bList.map((b) => {
      const w = m.contextLimit > 0 ? Math.max(0.8, (b.tokens / m.contextLimit) * 100) : 0;
      return '<div style="height:100%;width:' + w.toFixed(1) + '%;background:' + (SEG_COLOR_HEX[b.key] || '#1a73e8') + '"></div>';
    }).join('');

    const rate = m.latestStepTokPerSec > 0 ? m.latestStepTokPerSec : (m.avgTokPerSec || 0);
    const activePool = payload.quota && payload.quota.activePool;
    let quotaHtml = '';
    if (activePool && (activePool.window5h || activePool.windowWeekly)) {
      const qRows = [];
      if (Number.isFinite(activePool.window5h?.remainingPct)) {
        const rst = fmtResetShort(activePool.window5h.resetInSec);
        qRows.push(
          '<div class="cpop-quota-row">' +
            '<span style="color:var(--gs-ink-2)">' + escHtml(activePool.label) + ' · 5h</span>' +
            '<span><strong>剩余 ' + activePool.window5h.remainingPct + '%</strong>' + (rst ? ' <small style="color:var(--gs-ink-3)">(' + escHtml(rst) + ')</small>' : '') + '</span>' +
          '</div>'
        );
      }
      if (Number.isFinite(activePool.windowWeekly?.remainingPct)) {
        const weeklyReset = fmtResetShort(activePool.windowWeekly.resetInSec);
        qRows.push(
          '<div class="cpop-quota-row">' +
            '<span style="color:var(--gs-ink-2)">每周池余量</span>' +
            '<span><strong>剩余 ' + activePool.windowWeekly.remainingPct + '%</strong>' + (weeklyReset ? ' <small>(' + escHtml(weeklyReset) + ')</small>' : '') + '</span>' +
          '</div>'
        );
      }
      if (qRows.length) quotaHtml = '<div class="cpop-div"></div>' + qRows.join('');
    }

    const compactWarn = (Number(m.contextPct || 0) >= 80 && m.capMode !== 'physical')
      ? '<div class="cpop-alert">接近 512K 自动压缩线，建议执行 <code>/compact</code> 或开启新会话以保持高缓存命中。</div>'
      : '';

    const shortModel = (m.activeModelLabel || 'Gemini').replace(/^Gemini\s+/i, '');
    pop.innerHTML =
      '<div class="cpop-head">' +
        '<span class="cpop-title">上下文窗口</span>' +
        '<span class="cpop-badge">' + escHtml(shortModel) + '</span>' +
      '</div>' +
      '<div class="cpop-main">' +
        '<span class="cpop-big">' + fmtCompact(m.latestContextTokens) + ' <small>/ ' + fmtCompact(m.contextLimit) + '</small></span>' +
        '<span class="cpop-rem">剩余 ' + m.remainingPct + '%</span>' +
      '</div>' +
      '<div class="cpop-bar">' + barSegs + '</div>' +
      '<div class="cpop-sub">' +
        '<span>缓存命中 ' + Math.round(m.latestCacheHitPct || m.avgCacheHitPct || 0) + '%</span>' +
        '<span>' + (rate > 0 ? rate.toFixed(1) + ' tok/s' : m.steps + ' 步推理') + '</span>' +
      '</div>' +
      compactWarn +
      quotaHtml +
      '<button type="button" class="cpop-foot-btn" id="cpopOpenSideBtn"><span>在右侧窗口查看完整配额与 7 日明细</span><span>→</span></button>';
  }

  const openBtn = pop.querySelector('#cpopOpenSideBtn');
  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePulseSidePanel();
    });
  }
}

function updateTelemetryUI(payload) {
  if (!payload) return;
  window.__agyLastTelemetry = payload;
  const m = payload.metrics;

  const btn = document.getElementById('agy-codex-ctx-btn');
  if (btn && m) {
    const pct = Math.max(0, Math.min(100, Number(m.contextPct || 0)));
    const circ = 33.93;
    const offset = circ * (1 - pct / 100);
    const fg = btn.querySelector('.codex-ring-fg');
    const lbl = btn.querySelector('.codex-ctx-pct');
    if (fg) fg.setAttribute('stroke-dashoffset', offset.toFixed(2));
    const label = Math.round(pct) + '%';
    if (lbl && lbl.textContent !== label) lbl.textContent = label;

    const level = pct >= 82 ? 'danger' : (pct >= 60 ? 'warn' : 'normal');
    if (btn.getAttribute('data-level') !== level) btn.setAttribute('data-level', level);
  }

  const pop = document.getElementById('agy-codex-ctx-popover');
  if (pop && pop.classList.contains('open')) {
    renderCodexPopoverContent(payload);
    positionCodexPopover();
  }

  onTelemetrySpeedUpdate(payload);
  if (wasBusy) syncHakimiStateThrottled(false);
  syncInlineAskHeaderMeta();
}

function normalizeTelemetryPort(p) {
  const num = Number(p);
  return Number.isInteger(num) && num >= 1 && num <= 65535 ? num : null;
}

if (typeof window.__agyTelemetryPort === 'undefined') {
  window.__agyTelemetryPort = normalizeTelemetryPort(
    typeof AGY_TELEMETRY_PORT !== 'undefined' ? AGY_TELEMETRY_PORT : null
  );
} else if (typeof AGY_TELEMETRY_PORT !== 'undefined') {
  const injectedPort = normalizeTelemetryPort(AGY_TELEMETRY_PORT);
  if (injectedPort) window.__agyTelemetryPort = injectedPort;
}
if (typeof AGY_TELEMETRY_TOKEN !== 'undefined' && typeof AGY_TELEMETRY_TOKEN === 'string' && AGY_TELEMETRY_TOKEN) {
  window.__agyTelemetryToken = AGY_TELEMETRY_TOKEN;
} else if (typeof window.__agyTelemetryToken === 'undefined') {
  window.__agyTelemetryToken = '';
}

function connectTelemetryStream() {
  if (window.__agyTelemetryRetryTimer) {
    window.clearTimeout(window.__agyTelemetryRetryTimer);
    window.__agyTelemetryRetryTimer = 0;
  }
  if (window.__agyTelemetryES) {
    try { window.__agyTelemetryES.close(); } catch (_) {}
    window.__agyTelemetryES = null;
  }
  const url = buildPulseUrl('/api/events?conv=auto&view=compact');
  if (!url) return;
  try {
    const es = new EventSource(url);
    window.__agyTelemetryES = es;
    es.onmessage = (evt) => {
      try { updateTelemetryUI(JSON.parse(evt.data)); } catch (_) {}
    };
    es.onerror = () => {
      try { es.close(); } catch (_) {}
      if (window.__agyTelemetryES === es) window.__agyTelemetryES = null;
      window.__agyTelemetryRetryTimer = window.setTimeout(connectTelemetryStream, 4000);
    };
  } catch (_) {}
}

window.__agySetTelemetry = function(nextPort, nextToken) {
  const valid = normalizeTelemetryPort(nextPort);
  if (!valid) return;
  const tok = typeof nextToken === 'string' ? nextToken : (window.__agyTelemetryToken || '');
  const changed = window.__agyTelemetryPort !== valid || window.__agyTelemetryToken !== tok;
  window.__agyTelemetryPort = valid;
  window.__agyTelemetryToken = tok;
  if (changed || !window.__agyTelemetryES) {
    connectTelemetryStream();
  }
  const drawer = document.getElementById('agy-pulse-drawer');
  const frame = document.getElementById('agy-pulse-iframe');
  const nextSig = String(valid) + ':' + tok;
  if (changed && frame && frame.dataset.portSig && frame.dataset.portSig !== nextSig) {
    if (drawer?.classList.contains('open')) {
      const surf = getEffectiveSurfaceForPulse();
      frame.dataset.surf = surf;
      frame.dataset.portSig = nextSig;
      frame.src = buildPulseUrl('/?theme=' + encodeURIComponent(surf));
    } else {
      frame.dataset.portSig = '';
      frame.removeAttribute('src');
    }
  }
};

window.__agySetTelemetryPort = function(nextPort) {
  window.__agySetTelemetry(nextPort, window.__agyTelemetryToken || '');
};

// ==================== Part 4.5: Codex-Style Silent Auto-Update Pill ====================

const UPDATE_DISMISS_STORE = 'agy-kit-update-dismissed:v1';

if (typeof AGY_UPDATER_PORT !== 'undefined' && normalizeTelemetryPort(AGY_UPDATER_PORT)) {
  window.__agyUpdaterPort = normalizeTelemetryPort(AGY_UPDATER_PORT);
}
if (typeof AGY_UPDATER_TOKEN !== 'undefined' && typeof AGY_UPDATER_TOKEN === 'string' && AGY_UPDATER_TOKEN) {
  window.__agyUpdaterToken = AGY_UPDATER_TOKEN;
}
if (typeof AGY_UPDATE_STATE !== 'undefined' && AGY_UPDATE_STATE) {
  window.__agyUpdateState = AGY_UPDATE_STATE;
}

function getDismissedUpdateVersion() {
  try { return localStorage.getItem(UPDATE_DISMISS_STORE) || ''; } catch (_) { return ''; }
}

function dismissUpdateVersion(ver) {
  try { localStorage.setItem(UPDATE_DISMISS_STORE, String(ver || '')); } catch (_) {}
  closeUpdatePopover();
  syncSidebarUpdatePill();
}

async function callUpdaterApi(endpoint, method = 'POST') {
  const port = normalizeTelemetryPort(window.__agyUpdaterPort);
  const tok = window.__agyUpdaterToken || '';
  if (!port || !tok) throw new Error('updater_unavailable');
  const res = await fetch('http://127.0.0.1:' + port + endpoint, {
    method,
    headers: { 'X-Agy-Kit-Token': tok }
  });
  return res.json();
}

function openUpdatePopover(anchorEl) {
  const st = window.__agyUpdateState;
  if (!st || !st.available) return;
  let pop = document.getElementById('agy-kit-update-pop');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'agy-kit-update-pop';
    pop.className = 'notranslate';
    document.body.appendChild(pop);
  }
  if (pop.classList.contains('open')) {
    pop.classList.remove('open');
    return;
  }

  const isMac = st.platform === 'darwin' || /Mac/i.test(navigator.platform || '');
  const cliCmd = isMac ? 'git pull && python3 install.py' : 'git pull; python install.py';
  const notesText = st.notes || (st.canHotApply
    ? '包含新版皮肤、汉化或性能优化，支持点击直接热更新生效。'
    : '此版本包含底层更新，请前往 Release 页面查看或运行一键更新命令。');

  const primaryLabel = st.canHotApply ? '立即热更新并刷新' : '查看新版 Release';
  const secondaryLabel = st.canHotApply ? '查看更新日志' : '复制更新命令';

  pop.innerHTML =
    '<div class="agy-upop-head">' +
      '<span class="agy-upop-title">工作台套件有新版本</span>' +
      '<span class="agy-upop-ver">v' + escHtml(st.currentVersion) + ' → v' + escHtml(st.latestVersion) + '</span>' +
    '</div>' +
    '<div class="agy-upop-notes">' + escHtml(notesText) + '</div>' +
    '<div class="agy-upop-actions">' +
      '<button type="button" class="agy-upop-primary" id="agyUpdPrimary">' + primaryLabel + '</button>' +
      '<button type="button" class="agy-upop-sec" id="agyUpdSecondary">' + secondaryLabel + '</button>' +
    '</div>' +
    '<div class="agy-upop-status" id="agyUpdStatus" style="display:none"></div>';

  const statusEl = pop.querySelector('#agyUpdStatus');
  const primaryBtn = pop.querySelector('#agyUpdPrimary');
  const secBtn = pop.querySelector('#agyUpdSecondary');

  primaryBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!st.canHotApply) {
      try { await callUpdaterApi('/open-release', 'POST'); } catch (_) {
        if (st.releaseUrl) window.open(st.releaseUrl, '_blank', 'noopener');
      }
      return;
    }
    primaryBtn.disabled = true;
    primaryBtn.textContent = '正在更新…';
    statusEl.style.display = 'block';
    statusEl.textContent = '正在下载并校验 SHA-256，请稍候…';
    try {
      const res = await callUpdaterApi('/apply', 'POST');
      if (res && res.ok) {
        statusEl.textContent = '更新成功，正在刷新界面…';
      } else {
        primaryBtn.disabled = false;
        primaryBtn.textContent = '重试热更新';
        statusEl.textContent = '热更新未完成：' + (res && res.error ? res.error : '请前往 Release 手动更新');
      }
    } catch (_) {
      primaryBtn.disabled = false;
      primaryBtn.textContent = '重试热更新';
      statusEl.textContent = '连接本地更新服务失败，可点击右侧前往 Release 页更新。';
    }
  });

  secBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (st.canHotApply) {
      try { await callUpdaterApi('/open-release', 'POST'); } catch (_) {
        if (st.releaseUrl) window.open(st.releaseUrl, '_blank', 'noopener');
      }
    } else {
      try {
        await navigator.clipboard.writeText(cliCmd);
        statusEl.style.display = 'block';
        statusEl.textContent = '已复制：' + cliCmd;
      } catch (_) {
        statusEl.style.display = 'block';
        statusEl.textContent = cliCmd;
      }
    }
  });

  pop.classList.add('open');
  const r = anchorEl.getBoundingClientRect();
  const h = pop.offsetHeight || 168;
  const left = Math.max(8, Math.min(window.innerWidth - 294, r.left));
  const top = Math.max(12, r.top - h - 8);
  pop.style.left = Math.round(left) + 'px';
  pop.style.top = Math.round(top) + 'px';
}

function syncSidebarUpdatePill() {
  const st = window.__agyUpdateState;
  const shouldShow = Boolean(
    st &&
    st.available &&
    st.latestVersion &&
    getDismissedUpdateVersion() !== String(st.latestVersion)
  );

  let wrap = document.getElementById('agy-kit-update-wrap');
  if (!shouldShow) {
    if (wrap) wrap.classList.remove('visible');
    closeUpdatePopover();
    return;
  }

  const sidebar = document.querySelector('div[role="navigation"].bg-sidebar, div[role="navigation"][aria-label="Sidebar"]');
  if (!sidebar) return;

  // Insert directly above the bottom Settings footer row (exact Codex placement)
  const settingsBtn = sidebar.querySelector('[data-testid="settings-button"]');
  let footerSection = settingsBtn ? settingsBtn.closest('div[role="navigation"] > div') : sidebar.lastElementChild;
  if (!footerSection || footerSection.parentElement !== sidebar) {
    footerSection = sidebar.lastElementChild;
  }
  if (!footerSection) return;

  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'agy-kit-update-wrap';
    wrap.className = 'notranslate';
    wrap.innerHTML =
      '<button type="button" id="agy-kit-update-btn" title="点击查看并更新工作台套件">' +
        '<span class="agy-upd-left">' +
          '<span class="agy-upd-icon">↑</span>' +
          '<span class="agy-upd-label">更新可用</span>' +
        '</span>' +
        '<span class="agy-upd-dismiss" role="button" aria-label="忽略此版本" title="忽略此版本">×</span>' +
      '</button>';
    const btn = wrap.querySelector('#agy-kit-update-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target instanceof Element && e.target.closest('.agy-upd-dismiss')) {
        dismissUpdateVersion(window.__agyUpdateState && window.__agyUpdateState.latestVersion);
        return;
      }
      openUpdatePopover(btn);
    });
  }

  const lbl = wrap.querySelector('.agy-upd-label');
  const nextText = '更新可用 · v' + st.latestVersion;
  if (lbl && lbl.textContent !== nextText) lbl.textContent = nextText;

  if (wrap.parentElement !== sidebar || wrap.nextElementSibling !== footerSection) {
    sidebar.insertBefore(wrap, footerSection);
  }
  wrap.classList.add('visible');
}

window.__agySetUpdater = function(nextPort, nextToken) {
  const valid = normalizeTelemetryPort(nextPort);
  if (valid) window.__agyUpdaterPort = valid;
  if (typeof nextToken === 'string' && nextToken) window.__agyUpdaterToken = nextToken;
};

window.__agySetUpdateState = function(nextState) {
  if (!nextState || typeof nextState !== 'object') return;
  window.__agyUpdateState = nextState;
  syncSidebarUpdatePill();
};

// ==================== Part 4.6: Inline Hover/Selection Contextual Side-Reply Dialog ====================

const INLINE_ASK_MARKER = '【就地追问｜锚点摘录】';
const INLINE_ASK_QUICK_PROMPTS = [
  '简明解释这段的核心含义',
  '给一个具体例子说明',
  '它和当前主任务有什么关系？'
];

const inlineAsk = {
  triggerEl: null,
  popoverEl: null,
  pinsRootEl: null,
  pendingTriggerCtx: null, // { block, excerpt, rect, mode }
  activeSession: null,
  sessionByEl: new WeakMap(),
  pinnedSessions: new Set(),
  pos: { x: 0, y: 0, dragged: false },
  hideTriggerTimer: 0,
  hoverTimer: 0,
  selTimer: 0,
  pinRafId: 0,
  submittingLock: false,
  lastSubmitText: '',
  lastSubmitAt: 0,
  activeWatch: null,
  meta: { conversationId: '', title: '', activeModel: '', activeModelLabel: '', isRunning: false, fetchedAt: 0 }
};

function isInsideInlineAskExcludedUi(el) {
  if (!el || el.nodeType !== 1) return true;
  if (isOwnControlElement(el)) return true;
  return Boolean(el.closest(
    'div[role="navigation"], .surface-composer, [role="dialog"], [role="menu"], ' +
    '[role="listbox"], [role="tooltip"], .settings-modal-container, nav, header, ' +
    'button, input, textarea, select, [contenteditable="true"]'
  ));
}

function findInlineAskContentBlock(target) {
  if (!(target instanceof Element)) return null;
  if (isInsideInlineAskExcludedUi(target)) return null;
  const msgRoot = target.closest(
    '[data-quotable="true"], [data-testid="planner-response-text"], .markdown-body, .prose, article'
  );
  if (!msgRoot || isInsideInlineAskExcludedUi(msgRoot)) return null;

  const block = target.closest('p, h1, h2, h3, h4, li, blockquote, pre, table');
  let chosen = (block && msgRoot.contains(block)) ? block : null;
  if (!chosen) {
    const directText = (msgRoot.textContent || '').replace(/\s+/g, ' ').trim();
    if (directText.length >= 8 && !msgRoot.querySelector('p, pre, table, ul, ol')) {
      chosen = msgRoot;
    }
  }
  if (!chosen) return null;
  const txt = (chosen.innerText || chosen.textContent || '').replace(/\s+/g, ' ').trim();
  if (txt.length < 4) return null;
  const rect = chosen.getBoundingClientRect();
  if (rect.width < 48 || rect.height < 14 || rect.bottom < 44 || rect.top > window.innerHeight - 24) {
    return null;
  }
  return { block: chosen, text: txt, rect };
}

function getInlineAskSelectionContext() {
  const sel = window.getSelection ? window.getSelection() : null;
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString().replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > 4000) return null;
  const rawNode = sel.focusNode || sel.anchorNode;
  const el = rawNode && rawNode.nodeType === 1 ? rawNode : (rawNode && rawNode.parentElement);
  if (!el || isInsideInlineAskExcludedUi(el)) return null;
  const inMain = el.closest('main, [data-quotable="true"], [data-testid="planner-response-text"], .markdown-body, .prose');
  if (!inMain) return null;

  const range = sel.getRangeAt(0);
  const rects = range.getClientRects();
  let rect = null;
  for (let i = rects.length - 1; i >= 0; i--) {
    if (rects[i].width > 1 && rects[i].height > 1) {
      rect = rects[i];
      break;
    }
  }
  if (!rect) rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;

  const blockHit = findInlineAskContentBlock(el);
  const block = (blockHit && blockHit.block) || el.closest('p, li, pre, blockquote, h1, h2, h3, h4, div') || el;
  return { block, text, rect };
}

function detectActiveModelFromDOM() {
  const composer = document.querySelector('.surface-composer');
  const scope = composer || document.querySelector('main') || document.body;
  if (!scope) return '';
  const permRx = /\b(Turbo|Auto|Strict|Review|Ask|Sandbox)\b|极速|自动|严格|审核|沙箱|权限/i;
  const modelNameRx = /\b(Gemini|Claude|GPT|Sonnet|Opus|Haiku|Carbon|Argon|o[134])\b/i;

  const candidates = scope.querySelectorAll('button, [role="button"]');
  let fallback = '';
  for (let i = 0; i < candidates.length; i++) {
    const b = candidates[i];
    if (b.id === 'agy-codex-ctx-btn' || isOwnControlElement(b)) continue;
    const tid = (b.getAttribute('data-testid') || '').toLowerCase();
    const aria = (b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '');
    const txt = (b.textContent || '').replace(/\s+/g, ' ').trim();
    const isModelTrigger = tid.includes('model') || /model|模型/i.test(aria);
    const cleaned = txt.replace(/^(?:current|当前选择|模型)\s*[:：]\s*/i, '').trim();
    if (isModelTrigger && cleaned && cleaned.length <= 44 && !permRx.test(cleaned)) {
      return cleaned;
    }
    if (!fallback && cleaned && cleaned.length <= 44 && modelNameRx.test(cleaned) && !permRx.test(cleaned)) {
      fallback = cleaned;
    }
  }
  return fallback;
}

function getInlineAskModelLabel() {
  const domModel = detectActiveModelFromDOM();
  if (domModel) return domModel;
  if (inlineAsk.meta.activeModelLabel && inlineAsk.meta.activeModelLabel !== '上下文自动压缩') {
    return inlineAsk.meta.activeModelLabel;
  }
  const tModel = window.__agyLastTelemetry && window.__agyLastTelemetry.metrics && window.__agyLastTelemetry.metrics.activeModelLabel;
  if (tModel && tModel !== '上下文自动压缩') return tModel;
  return '当前对话模型';
}

function getInlineAskConversationTitle() {
  if (inlineAsk.meta.title) return inlineAsk.meta.title;
  if (window.__agyLastTelemetry && window.__agyLastTelemetry.activeTitle) {
    return window.__agyLastTelemetry.activeTitle;
  }
  const activeRow = document.querySelector(
    'div[data-testid="conversation-row-sidebar"][data-selected="true"], div[data-testid="conversation-row-sidebar"].bg-sidebar-secondary'
  );
  if (activeRow) {
    const t = (activeRow.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) return t.slice(0, 36);
  }
  return '';
}

async function fetchInlineAskContextMeta(includeLatest = false) {
  const url = buildPulseUrl('/api/context-meta?conv=auto' + (includeLatest ? '&includeLatest=1' : ''));
  if (!url) return null;
  try {
    const headers = window.__agyTelemetryToken ? { 'X-Gemini-Pulse-Token': window.__agyTelemetryToken } : {};
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === 'object') {
      inlineAsk.meta = {
        conversationId: data.conversationId || '',
        title: data.title || '',
        activeModel: data.activeModel || '',
        activeModelLabel: data.activeModelLabel || '',
        turns: Number(data.turns || 0),
        steps: Number(data.steps || 0),
        isRunning: Boolean(data.isRunning),
        latestResponseText: data.latestResponseText || inlineAsk.meta.latestResponseText || '',
        fetchedAt: Date.now()
      };
      syncInlineAskHeaderMeta();
      return data;
    }
  } catch (_) {}
  return null;
}

function syncInlineAskHeaderMeta() {
  const pop = inlineAsk.popoverEl;
  if (!pop || !pop.classList.contains('open')) return;
  const badge = pop.querySelector('.agy-ia-badge');
  const chip = pop.querySelector('.agy-ia-model-chip');
  const dot = pop.querySelector('.agy-ia-dot');
  const convEl = pop.querySelector('.agy-ia-quote-conv');
  const modelLabel = getInlineAskModelLabel();
  if (badge && badge.textContent !== '并行子助手 · 同款模型') {
    badge.textContent = '并行子助手 · 同款模型';
  }
  if (chip) {
    const chipTxt = '(' + modelLabel + ')';
    if (chip.textContent !== chipTxt) chip.textContent = chipTxt;
    chip.title = '独立并行子助手 · 与主任务完全同款模型：' + modelLabel;
  }
  if (dot) {
    const activeTurn = inlineAsk.activeSession && inlineAsk.activeSession.turns[inlineAsk.activeSession.turns.length - 1];
    const working = Boolean(activeTurn && (activeTurn.status === 'streaming' || activeTurn.status === 'pending'));
    dot.classList.toggle('busy', working);
  }
  if (convEl) {
    const title = getInlineAskConversationTitle();
    const label = title ? ('主任务：' + title) : '当前任务上下文';
    if (convEl.textContent !== label) convEl.textContent = label;
  }
}

const SAFE_MD_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'DEL', 'S', 'CODE', 'PRE',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A', 'SPAN', 'DIV'
]);

function serializeSafeResponseHtml(rootEl) {
  if (!rootEl) return '';
  function walk(node) {
    if (!node) return '';
    if (node.nodeType === 3) return escHtml(node.nodeValue || '');
    if (node.nodeType !== 1) return '';
    const tag = node.tagName;
    if (tag === 'BUTTON' || tag === 'SVG' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return '';
    if (node.getAttribute('aria-hidden') === 'true') return '';
    if (tag === 'PRE') {
      const codeEl = node.querySelector('code');
      const codeText = codeEl ? (codeEl.innerText || codeEl.textContent || '') : (node.innerText || node.textContent || '');
      return '<pre><code>' + escHtml(codeText.replace(/\n+$/, '')) + '</code></pre>';
    }
    let inner = '';
    for (let c = node.firstChild; c; c = c.nextSibling) {
      inner += walk(c);
    }
    if (!SAFE_MD_TAGS.has(tag)) return inner;
    if (tag === 'BR' || tag === 'HR') return '<' + tag.toLowerCase() + '>';
    if (tag === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        return '<a href="' + escHtml(href) + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
      }
      return inner;
    }
    if (tag === 'SPAN' || tag === 'DIV') {
      return inner;
    }
    const lower = tag.toLowerCase();
    return '<' + lower + '>' + inner + '</' + lower + '>';
  }
  const html = walk(rootEl).trim();
  if (html) return html;
  const plain = (rootEl.innerText || rootEl.textContent || '').trim();
  return plain ? '<p>' + escHtml(plain).replace(/\n/g, '<br>') + '</p>' : '';
}

function renderMiniMarkdown(md) {
  const src = String(md || '').replace(/\r\n/g, '\n').trim();
  if (!src) return '';
  const codeBlocks = [];
  const placeholderText = src.replace(/```[^\n]*\n([\s\S]*?)```/g, (_m, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push('<pre><code>' + escHtml(code.replace(/\n+$/, '')) + '</code></pre>');
    return '\u0000CB' + idx + '\u0000';
  });

  function formatInline(line) {
    let s = escHtml(line);
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    return s;
  }

  const lines = placeholderText.split('\n');
  const out = [];
  let inUl = false;
  let inOl = false;
  const closeLists = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const cbMatch = trimmed.match(/^\u0000CB(\d+)\u0000$/);
    if (cbMatch) {
      closeLists();
      out.push(codeBlocks[Number(cbMatch[1])] || '');
      continue;
    }
    if (!trimmed) {
      closeLists();
      continue;
    }
    const hMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      closeLists();
      const lvl = hMatch[1].length;
      out.push('<h' + lvl + '>' + formatInline(hMatch[2]) + '</h' + lvl + '>');
      continue;
    }
    const bqMatch = trimmed.match(/^>\s?(.*)$/);
    if (bqMatch) {
      closeLists();
      out.push('<blockquote>' + formatInline(bqMatch[1]) + '</blockquote>');
      continue;
    }
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul>'); inUl = true; }
      out.push('<li>' + formatInline(ulMatch[1]) + '</li>');
      continue;
    }
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol>'); inOl = true; }
      out.push('<li>' + formatInline(olMatch[1]) + '</li>');
      continue;
    }
    closeLists();
    out.push('<p>' + formatInline(trimmed) + '</p>');
  }
  closeLists();
  return out.join('');
}

function collectConversationResponseBlocks() {
  const plannerEls = document.querySelectorAll('[data-testid="planner-response-text"]');
  if (plannerEls.length > 0) {
    return Array.from(plannerEls).filter((el) => !isOwnControlElement(el));
  }
  const quotables = document.querySelectorAll('[data-quotable="true"] .markdown-body, [data-quotable="true"]');
  if (quotables.length > 0) {
    return Array.from(quotables).filter((el) => {
      if (isOwnControlElement(el)) return false;
      if (el.matches('[data-quotable="true"]') && el.querySelector('.markdown-body')) return false;
      return true;
    });
  }
  const main = document.querySelector('main') || document.body;
  return Array.from(main.querySelectorAll('.markdown-body, .prose')).filter(
    (el) => !isOwnControlElement(el) && !el.closest('.surface-composer')
  );
}

function findChatScrollContainer(anchorEl) {
  let cur = anchorEl ? anchorEl.parentElement : null;
  while (cur && cur !== document.body) {
    const cs = window.getComputedStyle(cur);
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && cur.scrollHeight > cur.clientHeight + 20) {
      return cur;
    }
    cur = cur.parentElement;
  }
  const padded = document.querySelector('.agy-muse-scroll-pad');
  if (padded) return padded;
  const main = document.querySelector('main');
  if (main) {
    const sc = main.querySelector('[class*="overflow-y-auto"]');
    if (sc) return sc;
  }
  return null;
}

function readComposerValue(inputEl) {
  if (!inputEl) return '';
  if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
    return String(inputEl.value || '');
  }
  return String(inputEl.innerText || inputEl.textContent || '').replace(/\u200B/g, '');
}

function writeComposerValue(inputEl, text) {
  if (!inputEl) return false;
  if (inputEl.tagName === 'TEXTAREA') {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(inputEl, text);
    else inputEl.value = text;
    inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  try { inputEl.focus({ preventScroll: true }); } catch (_) {}
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(inputEl);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (_) {}

  let inserted = false;
  try {
    if (text === '') {
      document.execCommand('delete', false);
      inserted = readComposerValue(inputEl).trim() === '';
    } else {
      document.execCommand('insertText', false, text);
      inserted = readComposerValue(inputEl).trim().length > 0;
    }
  } catch (_) {}

  if (!inserted && text) {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      inputEl.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
      inserted = readComposerValue(inputEl).trim().length > 0;
    } catch (_) {}
  }

  if (!inserted) {
    try {
      inputEl.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: text ? 'insertText' : 'deleteContentBackward', data: text }));
      inputEl.textContent = text;
      inputEl.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: text ? 'insertText' : 'deleteContentBackward', data: text }));
      inserted = true;
    } catch (_) {}
  }
  return inserted;
}

function findEnabledComposerSendButton(composer) {
  if (!composer) return null;
  const selectors = [
    'button[data-testid="input-send-button"]',
    'button[data-testid*="queue"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="发送"]',
    'button[aria-label*="Queue"]',
    'button[aria-label*="排队"]',
    'button[type="submit"]'
  ];
  for (let i = 0; i < selectors.length; i++) {
    const list = composer.querySelectorAll(selectors[i]);
    for (let j = 0; j < list.length; j++) {
      const btn = list[j];
      if (btn.id === 'agy-codex-ctx-btn' || isOwnControlElement(btn)) continue;
      if (btn.getAttribute('data-testid') === 'input-stop-button') continue;
      if (btn.getAttribute('data-tooltip-id') === 'input-send-button-record-tooltip') continue;
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') continue;
      const r = btn.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      return btn;
    }
  }
  return null;
}

function buildContextualInlinePrompt(session, question) {
  const excerpt = String(session.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 420);
  const quoted = excerpt ? ('> ' + excerpt.replace(/\n+/g, '\n> ')) : '';
  const prevDone = session.turns.filter((t) => t.status === 'done' && t.question);
  const lastTurn = prevDone.length > 0 ? prevDone[prevDone.length - 1] : null;
  const followLine = lastTurn
    ? ('\n\n【延续旁注追问】上一轮追问：' + lastTurn.question.slice(0, 120))
    : '';
  return (
    INLINE_ASK_MARKER + '\n' +
    quoted +
    followLine +
    '\n\n【问题】\n' + question.trim() +
    '\n\n（请结合当前任务的整体上下文直接简明回答该问题，不要偏离或重置主任务）'
  );
}

function dispatchInlinePromptToComposer(formattedPrompt, anchorEl) {
  return new Promise((resolve) => {
    const composer = document.querySelector('.surface-composer');
    const input = composer
      ? composer.querySelector('[contenteditable="true"][role="textbox"], [contenteditable="true"], textarea')
      : document.querySelector('main [contenteditable="true"], main textarea');
    if (!input) {
      resolve({ ok: false, reason: 'no_composer' });
      return;
    }

    const scrollEl = findChatScrollContainer(anchorEl);
    const savedScrollTop = scrollEl ? scrollEl.scrollTop : null;
    const prevDraft = readComposerValue(input).trim();
    const busyBefore = isBusy();

    const keepScrollLocked = () => {
      if (scrollEl && savedScrollTop !== null && inlineAsk.popoverEl?.classList.contains('open')) {
        scrollEl.scrollTop = savedScrollTop;
      }
    };

    writeComposerValue(input, formattedPrompt);
    keepScrollLocked();

    window.setTimeout(() => {
      keepScrollLocked();
      const sendBtn = findEnabledComposerSendButton(composer || input.parentElement);
      if (sendBtn) {
        sendBtn.click();
      } else {
        input.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
        }));
      }
      keepScrollLocked();

      window.setTimeout(() => {
        keepScrollLocked();
        const remaining = readComposerValue(input).trim();
        const accepted = !remaining || remaining !== formattedPrompt.trim();
        if (accepted) {
          if (prevDraft && !readComposerValue(input).trim()) {
            window.setTimeout(() => {
              if (!readComposerValue(input).trim()) writeComposerValue(input, prevDraft);
              const popInput = inlineAsk.popoverEl?.querySelector('.agy-ia-textarea');
              if (popInput) { try { popInput.focus({ preventScroll: true }); } catch (_) {} }
            }, 220);
          } else {
            const popInput = inlineAsk.popoverEl?.querySelector('.agy-ia-textarea');
            if (popInput) { try { popInput.focus({ preventScroll: true }); } catch (_) {} }
          }
          window.setTimeout(keepScrollLocked, 140);
          resolve({ ok: true, queuedNative: busyBefore });
          return;
        }

        // Retry with Ctrl+Enter / Meta+Enter in case user configured alternate send shortcut
        if (!busyBefore) {
          const isMac = /Mac/i.test(navigator.platform || '');
          input.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
            ctrlKey: !isMac, metaKey: isMac, bubbles: true, cancelable: true
          }));
          window.setTimeout(() => {
            keepScrollLocked();
            const rem2 = readComposerValue(input).trim();
            if (!rem2 || rem2 !== formattedPrompt.trim()) {
              const popInput = inlineAsk.popoverEl?.querySelector('.agy-ia-textarea');
              if (popInput) { try { popInput.focus({ preventScroll: true }); } catch (_) {} }
              resolve({ ok: true, queuedNative: false });
            } else {
              resolve({ ok: false, reason: 'send_not_triggered' });
            }
          }, 150);
          return;
        }

        // Agent is busy and host composer declined immediate queuing: restore composer and hold in local queue
        writeComposerValue(input, prevDraft);
        keepScrollLocked();
        const popInput = inlineAsk.popoverEl?.querySelector('.agy-ia-textarea');
        if (popInput) { try { popInput.focus({ preventScroll: true }); } catch (_) {} }
        resolve({ ok: false, reason: 'busy_queue_locally' });
      }, 150);
    }, 60);
  });
}

function stopActiveInlineWatch() {
  const w = inlineAsk.activeWatch;
  if (!w) return;
  if (w.observer) { try { w.observer.disconnect(); } catch (_) {} }
  if (w.rafId) window.cancelAnimationFrame(w.rafId);
  if (w.fallbackTimer) window.clearInterval(w.fallbackTimer);
  if (w.idleTimer) window.clearInterval(w.idleTimer);
  inlineAsk.activeWatch = null;
}

function patchInlineTurnInDOM(session, turn) {
  if (inlineAsk.activeSession !== session || !inlineAsk.popoverEl?.classList.contains('open')) {
    if (session.pinned) updatePinBadge(session);
    return;
  }
  const turnNode = inlineAsk.popoverEl.querySelector('[data-ia-turn-id="' + turn.id + '"]');
  if (!turnNode) {
    renderInlineAskBody();
    return;
  }
  const ansBox = turnNode.querySelector('.agy-ia-a');
  if (!ansBox) return;

  const bodyEl = inlineAsk.popoverEl.querySelector('.agy-ia-body');
  const nearBottom = bodyEl ? (bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight < 52) : true;

  ansBox.innerHTML = buildInlineTurnAnswerHtml(turn);
  bindTurnActionButtons(ansBox, turn);
  syncInlineAskHeaderMeta();
  if (bodyEl && nearBottom) {
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }
}

function startResponseMirrorWatch(session, turn, baseline) {
  stopActiveInlineWatch();
  const watch = {
    session,
    turn,
    baselineSet: baseline.elSet,
    baselineLastEl: baseline.lastEl,
    baselineLastLen: baseline.lastLen,
    baselineSteps: baseline.steps,
    baselineRespText: baseline.respText,
    targetEl: null,
    sawBusy: isBusy(),
    startedAt: Date.now(),
    lastChangeAt: Date.now(),
    lastText: '',
    rafId: 0,
    observer: null,
    fallbackTimer: 0,
    idleTimer: 0
  };
  inlineAsk.activeWatch = watch;

  const finalize = (finalStatus) => {
    if (inlineAsk.activeWatch !== watch) return;
    stopActiveInlineWatch();
    turn.status = finalStatus || 'done';
    turn.modelName = getInlineAskModelLabel();
    patchInlineTurnInDOM(session, turn);
    syncInlineAskHeaderMeta();
  };

  const inspectDom = () => {
    watch.rafId = 0;
    if (inlineAsk.activeWatch !== watch) return;
    if (isBusy()) watch.sawBusy = true;

    const blocks = collectConversationResponseBlocks();
    let candidate = watch.targetEl && watch.targetEl.isConnected ? watch.targetEl : null;

    if (!candidate) {
      for (let i = blocks.length - 1; i >= 0; i--) {
        const el = blocks[i];
        if (watch.baselineSet.has(el)) continue;
        const txt = (el.innerText || el.textContent || '').trim();
        if (!txt || txt.indexOf(INLINE_ASK_MARKER) !== -1) continue;
        candidate = el;
        break;
      }
    }

    if (!candidate && watch.baselineLastEl && watch.baselineLastEl.isConnected) {
      const curTxt = (watch.baselineLastEl.innerText || watch.baselineLastEl.textContent || '').trim();
      if (curTxt.length > watch.baselineLastLen + 12 && curTxt.indexOf(INLINE_ASK_MARKER) === -1) {
        candidate = watch.baselineLastEl;
      }
    }

    if (candidate) {
      watch.targetEl = candidate;
      const plain = (candidate.innerText || candidate.textContent || '').trim();
      if (plain && plain !== watch.lastText) {
        watch.lastText = plain;
        watch.lastChangeAt = Date.now();
        turn.answerText = plain;
        turn.answerHtml = serializeSafeResponseHtml(candidate);
        turn.responseEl = candidate;
        turn.status = 'streaming';
        turn.modelName = getInlineAskModelLabel();
        patchInlineTurnInDOM(session, turn);
      }
    }
  };

  const scheduleInspect = () => {
    if (watch.rafId || inlineAsk.activeWatch !== watch) return;
    watch.rafId = window.requestAnimationFrame(inspectDom);
  };

  const root = document.querySelector('main') || document.body;
  watch.observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const t = mutations[i].target;
      const el = t.nodeType === 1 ? t : t.parentElement;
      if (!el || isOwnControlElement(el)) continue;
      scheduleInspect();
      return;
    }
  });
  watch.observer.observe(root, { childList: true, subtree: true, characterData: true });

  // Lightweight completion & timeout checker
  watch.idleTimer = window.setInterval(() => {
    if (inlineAsk.activeWatch !== watch) return;
    const now = Date.now();
    const busyNow = isBusy();
    if (busyNow) watch.sawBusy = true;

    if (watch.lastText.length > 0) {
      const quietMs = now - watch.lastChangeAt;
      if (!busyNow && quietMs >= 850) {
        inspectDom();
        finalize('done');
        return;
      }
      if (quietMs >= 15000 && !busyNow) {
        finalize('done');
        return;
      }
    } else if (!busyNow && watch.sawBusy && (now - watch.startedAt) > 4000) {
      // One last check + telemetry fallback before giving up
      inspectDom();
      if (!watch.lastText && (now - watch.startedAt) > 12000) {
        turn.answerText = '回复已同步到当前对话流中，可点击下方定位查看。';
        turn.answerHtml = '<p>' + escHtml(turn.answerText) + '</p>';
        finalize('done');
      }
    } else if (!busyNow && (now - watch.startedAt) > 65000) {
      turn.answerText = '等待回复超时，请检查当前对话底部状态或重试。';
      turn.answerHtml = '<p>' + escHtml(turn.answerText) + '</p>';
      finalize('error');
    }
  }, 450);

  // Fallback mirror via authenticated gemini-pulse /api/context-meta?includeLatest=1
  watch.fallbackTimer = window.setInterval(async () => {
    if (inlineAsk.activeWatch !== watch) return;
    if (watch.targetEl && watch.lastText.length > 0) return;
    const meta = await fetchInlineAskContextMeta(true);
    if (!meta || inlineAsk.activeWatch !== watch) return;
    const resp = String(meta.latestResponseText || '').trim();
    const hasNewStep = Number(meta.steps || 0) > watch.baselineSteps;
    if (resp && (hasNewStep || resp !== watch.baselineRespText) && resp.indexOf(INLINE_ASK_MARKER) === -1) {
      if (resp !== watch.lastText) {
        watch.lastText = resp;
        watch.lastChangeAt = Date.now();
        turn.answerText = resp;
        turn.answerHtml = renderMiniMarkdown(resp);
        turn.status = meta.isRunning ? 'streaming' : 'done';
        if (meta.activeModelLabel && meta.activeModelLabel !== '上下文自动压缩') {
          turn.modelName = meta.activeModelLabel;
        }
        patchInlineTurnInDOM(session, turn);
        if (!meta.isRunning && !isBusy()) {
          finalize('done');
        }
      }
    }
  }, 1250);

  scheduleInspect();
}

function stopTurnPolling(turn) {
  if (!turn) return;
  if (turn.pollTimer) {
    window.clearTimeout(turn.pollTimer);
    turn.pollTimer = 0;
  }
}

async function sendTurnToMainComposerFallback(session, turn) {
  stopTurnPolling(turn);
  const formattedPrompt = buildContextualInlinePrompt(session, turn.question);
  const existing = collectConversationResponseBlocks();
  const lastEl = existing.length > 0 ? existing[existing.length - 1] : null;
  const baseline = {
    elSet: new Set(existing),
    lastEl,
    lastLen: lastEl ? (lastEl.innerText || lastEl.textContent || '').trim().length : 0,
    steps: Number(inlineAsk.meta.steps || (window.__agyLastTelemetry && window.__agyLastTelemetry.metrics && window.__agyLastTelemetry.metrics.steps) || 0),
    respText: String(inlineAsk.meta.latestResponseText || '')
  };

  turn.mode = 'main-fallback';
  turn.status = 'pending';
  turn.statusHint = '已手动改发到主会话底部，正在等待回复…';
  turn.answerText = '';
  turn.answerHtml = '';
  turn.errorText = '';
  turn.modelName = getInlineAskModelLabel();
  patchInlineTurnInDOM(session, turn);

  const res = await dispatchInlinePromptToComposer(formattedPrompt, session.anchorEl);
  if (res.ok) {
    turn.status = res.queuedNative ? 'queued' : 'pending';
    turn.statusHint = res.queuedNative ? '已手动发送到主会话底部队列，等待主会话回复…' : '已发送到主会话底部，正在生成回复…';
    patchInlineTurnInDOM(session, turn);
    startResponseMirrorWatch(session, turn, baseline);
    return;
  }

  turn.status = 'error';
  turn.errorText = res.reason === 'no_composer'
    ? '未找到当前对话底部输入框，请先打开任意对话页面。'
    : '内容已填入主会话底部输入框但主任务正在占用，请在底部手动确认发送。';
  patchInlineTurnInDOM(session, turn);
}

function startInlineSideAskPoll(session, turn, port, token) {
  stopTurnPolling(turn);
  const startedAt = Date.now();
  const TIMEOUT_MS = 120000;
  let consecutiveErrors = 0;

  const scheduleNext = () => {
    turn.pollTimer = window.setTimeout(pollOnce, 550);
  };

  const pollOnce = async () => {
    turn.pollTimer = 0;
    if (turn.status !== 'pending' && turn.status !== 'streaming') return;
    if (Date.now() - startedAt > TIMEOUT_MS) {
      turn.status = turn.answerText ? 'done' : 'error';
      if (!turn.answerText) {
        turn.errorText = '并行子助手响应超过 120 秒，可重试或改发到主会话底部。';
      }
      patchInlineTurnInDOM(session, turn);
      return;
    }

    try {
      const headers = token ? { 'X-Gemini-Pulse-Token': token } : {};
      const url = 'http://127.0.0.1:' + port + '/api/inline-ask/status?id=' + encodeURIComponent(turn.askId);
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data || !data.ok) throw new Error((data && data.error) || 'status_error');
      consecutiveErrors = 0;

      if (data.modelLabel && data.modelLabel !== '上下文自动压缩') {
        turn.modelName = data.modelLabel;
      }

      const reply = String(data.replyText || '').trim();
      if (reply && reply !== turn.answerText) {
        turn.answerText = reply;
        turn.answerHtml = renderMiniMarkdown(reply);
        turn.status = data.done ? 'done' : 'streaming';
        patchInlineTurnInDOM(session, turn);
      } else if (!reply) {
        const nextHint = data.hasThinking
          ? ('并行子助手深度思考中（' + (turn.modelName || '同款模型') + '）…')
          : (data.runState === 'RUN_STATE_RUNNING'
            ? ('并行子助手正在并行生成回复（零排队）…')
            : ('正在唤醒独立并行子助手（同款模型）…'));
        if (turn.statusHint !== nextHint) {
          turn.statusHint = nextHint;
          patchInlineTurnInDOM(session, turn);
        }
      }

      if (data.done) {
        if (reply) {
          turn.answerText = reply;
          turn.answerHtml = renderMiniMarkdown(reply);
          turn.status = 'done';
        } else {
          turn.status = 'error';
          turn.errorText = '并行子助手已结束但未返回可见正文，可点击重试或改发到主会话底部。';
        }
        patchInlineTurnInDOM(session, turn);
        return;
      }
      scheduleNext();
    } catch (_) {
      consecutiveErrors += 1;
      if (consecutiveErrors >= 6) {
        turn.status = turn.answerText ? 'done' : 'error';
        if (!turn.answerText) {
          turn.errorText = '与本地 gemini-pulse 子助手状态轮询中断，可点击重试或改发到主会话底部。';
        }
        patchInlineTurnInDOM(session, turn);
        return;
      }
      scheduleNext();
    }
  };

  scheduleNext();
}

async function dispatchInlineAskSideAgent(session, turn) {
  stopTurnPolling(turn);
  const port = normalizeTelemetryPort(window.__agyTelemetryPort);
  const token = window.__agyTelemetryToken || '';

  turn.mode = 'side-agent';
  turn.status = 'pending';
  turn.errorText = '';
  turn.answerText = '';
  turn.answerHtml = '';
  turn.modelName = getInlineAskModelLabel();
  turn.statusHint = '正在派发独立并行子助手（同款模型，零排队）…';
  patchInlineTurnInDOM(session, turn);

  if (!port) {
    turn.status = 'error';
    turn.errorText = '本地 gemini-pulse 并行子助手服务尚未连接（请确认 gemini-pulse 插件已启用，或按 Cmd+R / Ctrl+R 刷新）。不会自动打断主会话，你也可以点击下方按钮手动改发到主会话底部。';
    patchInlineTurnInDOM(session, turn);
    return;
  }

  const history = session.turns
    .filter((t) => t !== turn && t.status === 'done' && t.question)
    .slice(-4)
    .map((t) => ({ question: t.question, answer: t.answerText || '' }));

  const modelHint = detectActiveModelFromDOM() || inlineAsk.meta.activeModel || getInlineAskModelLabel();
  const payload = {
    convId: inlineAsk.meta.conversationId || 'auto',
    excerpt: session.excerpt || '',
    question: turn.question,
    history,
    modelHint
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['X-Gemini-Pulse-Token'] = token;
    const res = await fetch('http://127.0.0.1:' + port + '/api/inline-ask', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok || !data.askId) {
      const reason = (data && data.error) ? String(data.error) : ('HTTP ' + res.status);
      turn.status = 'error';
      turn.errorText = '并行子助手派发未成功（' + reason + '），未改动主会话输入框。可重试，或手动改发到主会话底部。';
      patchInlineTurnInDOM(session, turn);
      return;
    }

    turn.askId = data.askId;
    if (data.modelLabel && data.modelLabel !== '上下文自动压缩') {
      turn.modelName = data.modelLabel;
    }
    turn.statusHint = '并行子助手已启动（同款模型：' + turn.modelName + '），实时生成中…';
    patchInlineTurnInDOM(session, turn);
    startInlineSideAskPoll(session, turn, port, token);
  } catch (err) {
    turn.status = 'error';
    turn.errorText = '连接本地并行子助手服务失败（' + String(err && err.message || 'network_error') + '），未改动主会话输入框。可重试，或手动改发到主会话底部。';
    patchInlineTurnInDOM(session, turn);
  }
}

async function submitInlineAsk(rawQuestion) {
  const session = inlineAsk.activeSession;
  if (!session) return;
  const question = String(rawQuestion || '').trim();
  if (!question) return;

  // Strict double-dispatch guard (prevents duplicate Enter/click/chip submissions)
  const now = Date.now();
  if (inlineAsk.submittingLock) return;
  if (question === inlineAsk.lastSubmitText && (now - inlineAsk.lastSubmitAt) < 500) return;
  inlineAsk.submittingLock = true;
  inlineAsk.lastSubmitText = question;
  inlineAsk.lastSubmitAt = now;

  const sendBtn = inlineAsk.popoverEl?.querySelector('.agy-ia-send');
  if (sendBtn) sendBtn.disabled = true;

  const turn = {
    id: 't_' + now + '_' + Math.random().toString(36).slice(2, 6),
    askId: '',
    mode: 'side-agent',
    question,
    answerText: '',
    answerHtml: '',
    errorText: '',
    status: 'pending',
    statusHint: '正在派发独立并行子助手（同款模型，零排队）…',
    responseEl: null,
    pollTimer: 0,
    modelName: getInlineAskModelLabel(),
    createdAt: now
  };
  session.turns.push(turn);
  renderInlineAskBody();

  try {
    await dispatchInlineAskSideAgent(session, turn);
  } finally {
    inlineAsk.submittingLock = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

function buildInlineTurnAnswerHtml(turn) {
  if (turn.status === 'error' && !turn.answerHtml) {
    return (
      '<div class="agy-ia-a-status error"><span>⚠ ' + escHtml(turn.errorText || '并行子助手暂时不可用。') + '</span></div>' +
      '<div class="agy-ia-a-bar">' +
        '<span class="agy-ia-a-meta">未触发主会话排队</span>' +
        '<div class="agy-ia-a-btns">' +
          '<button type="button" class="agy-ia-mini-btn primary" data-ia-act="retry-side">重试并行子助手</button>' +
          '<button type="button" class="agy-ia-mini-btn" data-ia-act="send-main">改发到主会话底部</button>' +
        '</div>' +
      '</div>'
    );
  }
  if (turn.status === 'queued' && !turn.answerHtml) {
    return '<div class="agy-ia-a-status queued"><span class="agy-ia-spinner"></span><span>' +
      escHtml(turn.statusHint || '已改发到主会话队列…') + '</span></div>';
  }
  if (turn.status === 'pending' && !turn.answerHtml) {
    return '<div class="agy-ia-a-status"><span class="agy-ia-spinner"></span><span>' +
      escHtml(turn.statusHint || '正在派发并行子助手（同款模型）…') + '</span></div>';
  }
  const content = '<div class="agy-ia-a-content">' + (turn.answerHtml || '<p>' + escHtml(turn.answerText || '') + '</p>') + '</div>';
  const sourcePrefix = turn.mode === 'main-fallback' ? '主会话回复 · ' : '并行子助手 · ';
  const streamingTag = turn.status === 'streaming'
    ? '<span class="agy-ia-a-meta"><span class="agy-ia-spinner" style="margin-right:5px;vertical-align:middle;"></span>并行流式输出 · ' + escHtml(turn.modelName || '同款模型') + '</span>'
    : '<span class="agy-ia-a-meta">' + sourcePrefix + escHtml(turn.modelName || '同款模型') + '</span>';

  const secondBtn = turn.mode === 'main-fallback'
    ? '<button type="button" class="agy-ia-mini-btn" data-ia-act="jump">定位到对话流</button>'
    : '<button type="button" class="agy-ia-mini-btn" data-ia-act="anchor">定位锚点</button>';

  const actions =
    '<div class="agy-ia-a-bar">' +
      streamingTag +
      '<div class="agy-ia-a-btns">' +
        '<button type="button" class="agy-ia-mini-btn" data-ia-act="copy">复制回复</button>' +
        secondBtn +
      '</div>' +
    '</div>';
  return content + actions;
}

function bindTurnActionButtons(container, turn) {
  const copyBtn = container.querySelector('[data-ia-act="copy"]');
  if (copyBtn) {
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = turn.answerText || '';
      if (!text) return;
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (_) {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          copied = document.execCommand('copy');
          ta.remove();
        } catch (_) {}
      }
      copyBtn.textContent = copied ? '已复制 ✓' : '复制失败';
      window.setTimeout(() => { copyBtn.textContent = '复制回复'; }, 1500);
    });
  }

  const jumpBtn = container.querySelector('[data-ia-act="jump"]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (turn.responseEl && turn.responseEl.isConnected) {
        turn.responseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        turn.responseEl.classList.add('agy-ia-flash');
        window.setTimeout(() => turn.responseEl && turn.responseEl.classList.remove('agy-ia-flash'), 1700);
      } else {
        const sc = findChatScrollContainer(inlineAsk.activeSession?.anchorEl);
        if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
      }
    });
  }

  const anchorBtn = container.querySelector('[data-ia-act="anchor"]');
  if (anchorBtn) {
    anchorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = inlineAsk.activeSession?.anchorEl;
      if (el && el.isConnected) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('agy-ia-flash');
        window.setTimeout(() => el.classList.remove('agy-ia-flash'), 1700);
      }
    });
  }

  const retryBtn = container.querySelector('[data-ia-act="retry-side"]');
  if (retryBtn) {
    retryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!inlineAsk.activeSession) return;
      void dispatchInlineAskSideAgent(inlineAsk.activeSession, turn);
    });
  }

  const sendMainBtn = container.querySelector('[data-ia-act="send-main"]');
  if (sendMainBtn) {
    sendMainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!inlineAsk.activeSession) return;
      void sendTurnToMainComposerFallback(inlineAsk.activeSession, turn);
    });
  }
}

function renderInlineAskBody() {
  const pop = inlineAsk.popoverEl;
  const session = inlineAsk.activeSession;
  if (!pop || !session) return;

  const quoteEl = pop.querySelector('.agy-ia-quote-text');
  if (quoteEl) quoteEl.textContent = session.excerpt || '（当前段落）';

  const bodyEl = pop.querySelector('.agy-ia-body');
  if (!bodyEl) return;

  if (session.turns.length === 0) {
    bodyEl.innerHTML =
      '<div class="agy-ia-empty">' +
        '<div class="agy-ia-empty-tip">派发独立并行子助手（与主任务同款模型），直接基于当前任务上下文与锚点摘录即时回答；主任务运行中无需排队，且自动归档不占侧栏。</div>' +
        '<div class="agy-ia-chips">' +
          INLINE_ASK_QUICK_PROMPTS.map((q) =>
            '<button type="button" class="agy-ia-chip">' + escHtml(q) + '</button>'
          ).join('') +
        '</div>' +
      '</div>';
    bodyEl.querySelectorAll('.agy-ia-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        void submitInlineAsk(chip.textContent || '');
      });
    });
  } else {
    bodyEl.innerHTML = session.turns.map((t) =>
      '<div class="agy-ia-turn" data-ia-turn-id="' + escHtml(t.id) + '">' +
        '<div class="agy-ia-q">' + escHtml(t.question) + '</div>' +
        '<div class="agy-ia-a">' + buildInlineTurnAnswerHtml(t) + '</div>' +
      '</div>'
    ).join('');
    for (let i = 0; i < session.turns.length; i++) {
      const t = session.turns[i];
      const node = bodyEl.querySelector('[data-ia-turn-id="' + t.id + '"] .agy-ia-a');
      if (node) bindTurnActionButtons(node, t);
    }
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }
  syncInlineAskHeaderMeta();
}

function clampPopoverPosition(x, y) {
  const pop = inlineAsk.popoverEl;
  const w = (pop && pop.offsetWidth) || 404;
  const h = (pop && pop.offsetHeight) || 340;
  const cx = Math.max(12, Math.min(window.innerWidth - w - 12, Math.round(x)));
  const cy = Math.max(46, Math.min(Math.max(46, window.innerHeight - h - 14), Math.round(y)));
  return { x: cx, y: cy };
}

function positionInlineAskPopoverNear(rect) {
  const pop = inlineAsk.popoverEl;
  if (!pop) return;
  const w = pop.offsetWidth || 404;
  let x;
  if (window.innerWidth - rect.right >= w + 24) {
    x = rect.right + 14;
  } else if (rect.left >= w + 24) {
    x = rect.left - w - 14;
  } else {
    x = window.innerWidth - w - 18;
  }
  const y = rect.top - 12;
  const clamped = clampPopoverPosition(x, y);
  inlineAsk.pos = { x: clamped.x, y: clamped.y, dragged: false };
  pop.style.transform = 'translate3d(' + clamped.x + 'px,' + clamped.y + 'px,0)';
}

function ensureInlineAskDOM() {
  if (!inlineAsk.triggerEl) {
    const trig = document.createElement('button');
    trig.id = 'agy-inline-ask-trigger';
    trig.type = 'button';
    trig.className = 'notranslate';
    trig.title = '派发独立并行子助手就地追问（同款模型 · 零排队 · 自动归档）';
    trig.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
        '<path d="M9 10h6"/><path d="M9 14h4"/>' +
      '</svg>' +
      '<span class="agy-ia-trig-lbl">旁注追问</span>';

    trig.addEventListener('pointerenter', () => window.clearTimeout(inlineAsk.hideTriggerTimer));
    trig.addEventListener('pointerleave', () => scheduleHideInlineTrigger(240));
    trig.addEventListener('mousedown', (e) => {
      // Preserve active text selection before click handler reads it
      e.preventDefault();
      e.stopPropagation();
    });
    trig.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ctx = inlineAsk.pendingTriggerCtx;
      if (!ctx) return;
      hideInlineTriggerNow();
      openInlineAskPopover(ctx);
    });
    document.body.appendChild(trig);
    inlineAsk.triggerEl = trig;
  }

  if (!inlineAsk.pinsRootEl) {
    const pins = document.createElement('div');
    pins.id = 'agy-inline-ask-pins';
    pins.className = 'notranslate';
    document.body.appendChild(pins);
    inlineAsk.pinsRootEl = pins;
  }

  if (!inlineAsk.popoverEl) {
    const pop = document.createElement('section');
    pop.id = 'agy-inline-ask-popover';
    pop.className = 'notranslate';
    pop.setAttribute('aria-label', '就地上下文追问框');
    pop.innerHTML =
      '<div class="agy-ia-head">' +
        '<div class="agy-ia-head-left">' +
          '<span class="agy-ia-dot"></span>' +
          '<span class="agy-ia-badge">并行子助手 · 同款模型</span>' +
          '<span class="agy-ia-model-chip">(同款模型)</span>' +
        '</div>' +
        '<div class="agy-ia-head-actions">' +
          '<button type="button" class="agy-ia-icon-btn pin-btn" title="最小化为旁注气泡" aria-label="最小化为旁注气泡">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>' +
          '</button>' +
          '<button type="button" class="agy-ia-icon-btn close-btn" title="关闭（Esc）" aria-label="关闭追问框">×</button>' +
        '</div>' +
      '</div>' +
      '<div class="agy-ia-quote">' +
        '<div class="agy-ia-quote-meta"><span>锚点摘录</span><span class="agy-ia-quote-conv">当前任务上下文</span></div>' +
        '<div class="agy-ia-quote-text"></div>' +
      '</div>' +
      '<div class="agy-ia-body"></div>' +
      '<div class="agy-ia-foot">' +
        '<div class="agy-ia-input-row">' +
          '<textarea class="agy-ia-textarea" rows="1" placeholder="并行子助手实时追问（Enter 发送，Shift+Enter 换行）…"></textarea>' +
          '<button type="button" class="agy-ia-send">发送</button>' +
        '</div>' +
        '<div class="agy-ia-foot-hint"><span>独立并行子助手 · 自动归档 · 零排队</span><span>拖拽顶栏可微调位置</span></div>' +
      '</div>';

    // Draggable header (120fps pointer capture + translate3d)
    const head = pop.querySelector('.agy-ia-head');
    let dragState = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target instanceof Element && e.target.closest('button')) return;
      e.preventDefault();
      dragState = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origX: inlineAsk.pos.x,
        origY: inlineAsk.pos.y
      };
      try { head.setPointerCapture(e.pointerId); } catch (_) {}
    });
    head.addEventListener('pointermove', (e) => {
      if (!dragState || e.pointerId !== dragState.id) return;
      const next = clampPopoverPosition(
        dragState.origX + (e.clientX - dragState.startX),
        dragState.origY + (e.clientY - dragState.startY)
      );
      inlineAsk.pos = { x: next.x, y: next.y, dragged: true };
      pop.style.transform = 'translate3d(' + next.x + 'px,' + next.y + 'px,0)';
    });
    const endDrag = (e) => {
      if (!dragState || e.pointerId !== dragState.id) return;
      try { head.releasePointerCapture(e.pointerId); } catch (_) {}
      dragState = null;
    };
    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);

    pop.querySelector('.pin-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      minimizeInlineAskToPin();
    });
    pop.querySelector('.close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      closeInlineAskPopover();
    });

    const ta = pop.querySelector('.agy-ia-textarea');
    const sendBtn = pop.querySelector('.agy-ia-send');
    const autoGrow = () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(98, Math.max(34, ta.scrollHeight)) + 'px';
    };
    const triggerSend = () => {
      if (inlineAsk.submittingLock) return;
      const val = ta.value.trim();
      if (!val) return;
      ta.value = '';
      autoGrow();
      void submitInlineAsk(val);
    };
    ta.addEventListener('input', autoGrow);
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        e.stopPropagation();
        triggerSend();
      }
    });
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerSend();
    });

    document.body.appendChild(pop);
    inlineAsk.popoverEl = pop;
  }
}

function showInlineTrigger(ctx) {
  ensureInlineAskDOM();
  const trig = inlineAsk.triggerEl;
  if (!trig || !ctx || !ctx.rect) return;
  if (
    inlineAsk.popoverEl?.classList.contains('open') &&
    inlineAsk.activeSession &&
    inlineAsk.activeSession.anchorEl === ctx.block &&
    ctx.mode === 'hover'
  ) {
    return;
  }
  window.clearTimeout(inlineAsk.hideTriggerTimer);
  inlineAsk.pendingTriggerCtx = ctx;

  const lbl = trig.querySelector('.agy-ia-trig-lbl');
  const nextLbl = ctx.mode === 'selection' ? '就地追问' : '旁注追问';
  if (lbl && lbl.textContent !== nextLbl) lbl.textContent = nextLbl;
  trig.setAttribute('data-mode', ctx.mode);

  const w = trig.offsetWidth || 84;
  const h = trig.offsetHeight || 26;
  let x;
  let y;
  if (ctx.mode === 'selection') {
    x = ctx.rect.right + 8;
    if (x + w > window.innerWidth - 10) x = ctx.rect.right - w;
    y = ctx.rect.top - h - 6;
    if (y < 44) y = ctx.rect.bottom + 6;
  } else {
    x = ctx.rect.right + 8;
    if (x + w > window.innerWidth - 12) x = ctx.rect.right - w - 6;
    y = ctx.rect.top + 2;
  }
  x = Math.max(10, Math.min(window.innerWidth - w - 10, Math.round(x)));
  y = Math.max(44, Math.min(window.innerHeight - h - 10, Math.round(y)));
  trig.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  trig.classList.add('visible');
}

function hideInlineTriggerNow() {
  window.clearTimeout(inlineAsk.hideTriggerTimer);
  if (inlineAsk.triggerEl) {
    inlineAsk.triggerEl.classList.remove('visible');
  }
}

function scheduleHideInlineTrigger(delayMs = 280) {
  window.clearTimeout(inlineAsk.hideTriggerTimer);
  inlineAsk.hideTriggerTimer = window.setTimeout(() => {
    if (inlineAsk.triggerEl && inlineAsk.triggerEl.matches(':hover')) return;
    hideInlineTriggerNow();
  }, delayMs);
}

function getOrCreateInlineSession(block, excerpt) {
  let session = block ? inlineAsk.sessionByEl.get(block) : null;
  if (!session) {
    session = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      anchorEl: block,
      excerpt: excerpt || '',
      turns: [],
      pinned: false,
      pinEl: null
    };
    if (block) inlineAsk.sessionByEl.set(block, session);
  } else if (excerpt && excerpt !== session.excerpt) {
    session.excerpt = excerpt;
  }
  return session;
}

function openInlineAskPopover(ctx) {
  ensureInlineAskDOM();
  const block = ctx.block || null;
  const excerpt = String(ctx.excerpt || ctx.text || '').replace(/\s+/g, ' ').trim().slice(0, 420);
  const session = getOrCreateInlineSession(block, excerpt);
  inlineAsk.activeSession = session;

  // Hide pin badge while its popover is open
  if (session.pinEl) session.pinEl.style.display = 'none';

  const pop = inlineAsk.popoverEl;
  pop.classList.add('open');
  renderInlineAskBody();

  const rect = (ctx.rect && (ctx.rect.width > 0 || ctx.rect.height > 0))
    ? ctx.rect
    : (block && block.isConnected ? block.getBoundingClientRect() : { top: 120, right: window.innerWidth - 430, left: 240, bottom: 160, width: 200, height: 40 });
  positionInlineAskPopoverNear(rect);

  void fetchInlineAskContextMeta(false);

  const ta = pop.querySelector('.agy-ia-textarea');
  if (ta) {
    window.requestAnimationFrame(() => {
      try { ta.focus({ preventScroll: true }); } catch (_) {}
    });
  }
}

function closeInlineAskPopover() {
  const pop = inlineAsk.popoverEl;
  if (!pop || !pop.classList.contains('open')) return false;
  pop.classList.remove('open');
  if (inlineAsk.activeSession && inlineAsk.activeSession.pinned && inlineAsk.activeSession.pinEl) {
    inlineAsk.activeSession.pinEl.style.display = 'inline-flex';
    scheduleRepositionInlinePins();
  }
  inlineAsk.activeSession = null;
  return true;
}

function updatePinBadge(session) {
  if (!session || !session.pinEl) return;
  const count = session.turns.length;
  const label = count > 0 ? ('旁注 ' + count) : '旁注';
  const lbl = session.pinEl.querySelector('.agy-ia-pin-txt');
  if (lbl && lbl.textContent !== label) lbl.textContent = label;
}

function minimizeInlineAskToPin() {
  const session = inlineAsk.activeSession;
  if (!session) return;
  ensureInlineAskDOM();
  session.pinned = true;
  if (!session.pinEl) {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'agy-ia-pin';
    pin.title = '点击展开此处的旁注追问记录';
    pin.innerHTML = '<span>💬</span><span class="agy-ia-pin-txt">旁注</span>';
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = session.anchorEl && session.anchorEl.isConnected
        ? session.anchorEl.getBoundingClientRect()
        : pin.getBoundingClientRect();
      openInlineAskPopover({ block: session.anchorEl, excerpt: session.excerpt, rect, mode: 'pin' });
    });
    inlineAsk.pinsRootEl.appendChild(pin);
    session.pinEl = pin;
  }
  updatePinBadge(session);
  inlineAsk.pinnedSessions.add(session);
  closeInlineAskPopover();
  scheduleRepositionInlinePins();
}

function repositionAllInlinePinsNow() {
  inlineAsk.pinRafId = 0;
  if (inlineAsk.pinnedSessions.size === 0) return;
  for (const session of Array.from(inlineAsk.pinnedSessions)) {
    const pin = session.pinEl;
    const anchor = session.anchorEl;
    if (!pin || !anchor || !anchor.isConnected) {
      if (pin) pin.remove();
      session.pinEl = null;
      session.pinned = false;
      inlineAsk.pinnedSessions.delete(session);
      continue;
    }
    if (inlineAsk.activeSession === session && inlineAsk.popoverEl?.classList.contains('open')) {
      pin.style.display = 'none';
      continue;
    }
    const r = anchor.getBoundingClientRect();
    if (r.width === 0 || r.bottom < 46 || r.top > window.innerHeight - 36) {
      pin.style.display = 'none';
      continue;
    }
    pin.style.display = 'inline-flex';
    const w = pin.offsetWidth || 62;
    let x = r.right + 8;
    if (x + w > window.innerWidth - 10) x = r.right - w - 6;
    x = Math.max(10, Math.min(window.innerWidth - w - 10, Math.round(x)));
    const y = Math.max(46, Math.min(window.innerHeight - 34, Math.round(r.top + 2)));
    pin.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }
}

function scheduleRepositionInlinePins() {
  if (inlineAsk.pinRafId || inlineAsk.pinnedSessions.size === 0) return;
  inlineAsk.pinRafId = window.requestAnimationFrame(repositionAllInlinePinsNow);
}

function mountInlineAskEngine() {
  ensureInlineAskDOM();
  if (window.__AGY_INLINE_ASK_BOUND__) return;
  window.__AGY_INLINE_ASK_BOUND__ = true;

  // Debounced hover anchoring (zero layout thrashing)
  document.addEventListener('pointerover', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest('#agy-inline-ask-trigger')) {
      window.clearTimeout(inlineAsk.hideTriggerTimer);
      return;
    }
    if (isInsideInlineAskExcludedUi(target)) {
      if (!target.closest('#agy-inline-ask-popover')) scheduleHideInlineTrigger(220);
      return;
    }
    // Don't override an active text selection trigger with hover
    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return;

    window.clearTimeout(inlineAsk.hoverTimer);
    inlineAsk.hoverTimer = window.setTimeout(() => {
      const hit = findInlineAskContentBlock(target);
      if (hit) {
        showInlineTrigger({ block: hit.block, excerpt: hit.text.slice(0, 420), rect: hit.rect, mode: 'hover' });
      } else {
        scheduleHideInlineTrigger(260);
      }
    }, 95);
  }, { passive: true });

  // Selection anchoring (划词选中)
  const checkSelection = () => {
    const hit = getInlineAskSelectionContext();
    if (hit) {
      showInlineTrigger({ block: hit.block, excerpt: hit.text.slice(0, 420), rect: hit.rect, mode: 'selection' });
    } else if (inlineAsk.pendingTriggerCtx && inlineAsk.pendingTriggerCtx.mode === 'selection') {
      hideInlineTriggerNow();
    }
  };
  document.addEventListener('mouseup', () => {
    window.clearTimeout(inlineAsk.selTimer);
    inlineAsk.selTimer = window.setTimeout(checkSelection, 35);
  }, { passive: true });
  document.addEventListener('selectionchange', () => {
    window.clearTimeout(inlineAsk.selTimer);
    inlineAsk.selTimer = window.setTimeout(checkSelection, 130);
  }, { passive: true });

  // Keep minimized pins aligned on scroll & clamp popover on window resize
  window.addEventListener('scroll', () => {
    if (inlineAsk.triggerEl?.classList.contains('visible') && inlineAsk.pendingTriggerCtx?.mode === 'hover') {
      hideInlineTriggerNow();
    }
    scheduleRepositionInlinePins();
  }, { passive: true, capture: true });

  window.addEventListener('resize', () => {
    scheduleRepositionInlinePins();
    if (inlineAsk.popoverEl?.classList.contains('open')) {
      const clamped = clampPopoverPosition(inlineAsk.pos.x, inlineAsk.pos.y);
      inlineAsk.pos.x = clamped.x;
      inlineAsk.pos.y = clamped.y;
      inlineAsk.popoverEl.style.transform = 'translate3d(' + clamped.x + 'px,' + clamped.y + 'px,0)';
    }
  }, { passive: true });
}

function openThemeMenu(anchorBtn) {
  let menu = document.getElementById('agy-theme-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'agy-theme-menu';
    menu.className = 'notranslate';
    menu.innerHTML = VALID_THEMES.map((k) => {
      const m = THEME_META[k];
      return '<button type="button" class="agy-tm-item" data-theme="' + k + '">' +
        '<span class="agy-tm-left"><span class="agy-tm-dot" style="background:' + m.dot + '"></span><span>' + m.label + '</span></span>' +
        '<span class="agy-tm-check">✓</span></button>';
    }).join('');
    menu.addEventListener('click', (e) => {
      const item = e.target instanceof Element ? e.target.closest('.agy-tm-item') : null;
      if (!item) return;
      e.stopPropagation();
      const next = item.dataset.theme;
      applyThemeMode(next);
      closeThemeMenu();
      if (!isBusy()) {
        setMuseMode('done', '', { silentDone: true });
        say((THEME_META[next] && THEME_META[next].desc) || next, 1500);
        window.setTimeout(() => { if (!isBusy() && currentMode === 'done') setMuseMode('idle'); }, 1400);
      }
    });
    document.body.appendChild(menu);
  }
  const wasOpen = menu.classList.contains('open');
  if (wasOpen) {
    menu.classList.remove('open');
    return;
  }
  updateThemeButtonUI(readThemeMode());
  const r = anchorBtn.getBoundingClientRect();
  menu.classList.add('open');
  const w = menu.offsetWidth || 158;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w));
  menu.style.left = Math.round(left) + 'px';
  menu.style.top = Math.round(r.bottom + 6) + 'px';
}

function findThemeButtonHost() {
  // Windows renders a custom frameless menu bar; macOS uses the native OS menu bar
  // so we fall back cleanly to the right-side pane titlebar toolbar or top-left logo bar.
  const winMenuBar = document.querySelector('[data-testid="title-menu-bar"]');
  if (winMenuBar) return { container: winMenuBar, position: 'append' };

  const paneToolbar = document.querySelector('[data-testid="pane-titlebar-toolbar"]');
  if (paneToolbar) return { container: paneToolbar, position: 'prepend' };

  const openEditorBtn = document.querySelector(
    '[data-testid="open-editor-empty"], [data-testid="open-editor-single"], [data-testid="open-editor-multi"]'
  );
  if (openEditorBtn && openEditorBtn.parentElement) {
    return { container: openEditorBtn.parentElement, position: 'before', ref: openEditorBtn };
  }

  const logoTrigger = document.querySelector('[data-testid="app-logo-menu-trigger"]');
  if (logoTrigger && logoTrigger.parentElement) {
    return { container: logoTrigger.parentElement, position: 'append' };
  }
  return null;
}

function mountCodexRingAndTopTheme() {
  for (const oldId of ['agy-theme-switch', 'agy-theme-tip', 'agy-theme-switch-style', 'agy-theme-switcher-host', 'agy-token-telemetry-style', 'agy-composer-top-strip', 'agy-token-telemetry-bar']) {
    const el = document.getElementById(oldId);
    if (el) el.remove();
  }

  let st = document.getElementById('agy-custom-ui-style');
  if (!st) {
    st = document.createElement('style');
    st.id = 'agy-custom-ui-style';
    document.head.appendChild(st);
  }
  if (st.textContent !== CUSTOM_UI_CSS) st.textContent = CUSTOM_UI_CSS;

  // 1. Mount Codex Context Ring immediately left of Permissions button inside .surface-composer
  const composer = document.querySelector('.surface-composer');
  if (composer) {
    bindComposerResizeObserver(composer);
    const anchor = findPermissionButtonInComposer(composer);
    if (anchor && anchor.parentElement) {
      let ctxBtn = document.getElementById('agy-codex-ctx-btn');
      if (!ctxBtn) {
        ctxBtn = document.createElement('button');
        ctxBtn.id = 'agy-codex-ctx-btn';
        ctxBtn.type = 'button';
        ctxBtn.className = 'notranslate';
        ctxBtn.setAttribute('aria-label', '查看上下文窗口与模型额度');
        ctxBtn.setAttribute('aria-controls', 'agy-pulse-drawer');
        ctxBtn.setAttribute('aria-expanded', String(document.getElementById('agy-pulse-drawer')?.classList.contains('open') === true));
        ctxBtn.innerHTML =
          '<svg class="codex-ring-svg" viewBox="0 0 16 16" fill="none">' +
            '<circle class="codex-ring-bg" cx="8" cy="8" r="5.4" stroke-width="2.1"/>' +
            '<circle class="codex-ring-fg" cx="8" cy="8" r="5.4" stroke-width="2.1" stroke-dasharray="33.93" stroke-dashoffset="33.93" stroke-linecap="round"/>' +
          '</svg>' +
          '<span class="codex-ctx-pct">--%</span>';

        ctxBtn.addEventListener('mouseenter', () => {
          if (document.getElementById('agy-pulse-drawer')?.classList.contains('open')) return;
          window.clearTimeout(popHideTimer);
          let pop = document.getElementById('agy-codex-ctx-popover');
          if (!pop) {
            pop = document.createElement('div');
            pop.id = 'agy-codex-ctx-popover';
            pop.className = 'notranslate';
            pop.innerHTML = '<div id="agy-codex-ctx-content"></div><button type="button" class="pulse-close" aria-label="关闭速览">关闭</button>';
            pop.querySelector('.pulse-close').addEventListener('click', () => closePulseViews(true));
            pop.addEventListener('mouseenter', () => window.clearTimeout(popHideTimer));
            pop.addEventListener('mouseleave', () => {
              popHideTimer = window.setTimeout(() => pop.classList.remove('open'), 150);
            });
            document.body.appendChild(pop);
          }
          renderCodexPopoverContent(window.__agyLastTelemetry);
          pop.classList.add('open');
          positionCodexPopover();
        });

        ctxBtn.addEventListener('mouseleave', () => {
          const pop = document.getElementById('agy-codex-ctx-popover');
          if (pop) {
            popHideTimer = window.setTimeout(() => pop.classList.remove('open'), 170);
          }
        });

        ctxBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          togglePulseSidePanel();
        });
      }

      if (ctxBtn.parentElement !== anchor.parentElement || ctxBtn.nextElementSibling !== anchor) {
        anchor.parentElement.insertBefore(ctxBtn, anchor);
      }
      if (window.__agyLastTelemetry) updateTelemetryUI(window.__agyLastTelemetry);
    }
  }

  // 2. Mount Topbar Theme Switcher Pill (Windows title-menu-bar & macOS pane-titlebar-toolbar)
  const themeHost = findThemeButtonHost();
  if (themeHost && themeHost.container) {
    let btn = document.getElementById('agy-inline-theme-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'agy-inline-theme-btn';
      btn.type = 'button';
      btn.className = 'notranslate';
      btn.title = '点击切换主题 · 点击 ▾ 或右键展开选择 (极简工作台 / 暖纸书房 / 晨光画布 / 原生界面)';
      btn.innerHTML = '<span class="agy-tb-dot"></span><span class="agy-tb-label">晨光画布</span><span class="agy-tb-caret" title="展开主题列表">▾</span>';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target instanceof Element && e.target.closest('.agy-tb-caret')) {
          openThemeMenu(btn);
          return;
        }
        closeThemeMenu();
        const cur = readThemeMode();
        const next = VALID_THEMES[(VALID_THEMES.indexOf(cur) + 1) % VALID_THEMES.length];
        applyThemeMode(next);
        if (!isBusy()) {
          setMuseMode('done', '', { silentDone: true });
          say((THEME_META[next] && THEME_META[next].desc) || next, 1500);
          window.setTimeout(() => { if (!isBusy() && currentMode === 'done') setMuseMode('idle'); }, 1400);
        }
      });
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openThemeMenu(btn);
      });
    }
    if (btn.parentElement !== themeHost.container) {
      if (themeHost.position === 'before' && themeHost.ref && themeHost.ref.parentElement === themeHost.container) {
        themeHost.container.insertBefore(btn, themeHost.ref);
      } else if (themeHost.position === 'prepend' && themeHost.container.firstChild) {
        themeHost.container.insertBefore(btn, themeHost.container.firstChild);
      } else {
        themeHost.container.appendChild(btn);
      }
    }
    btn.style.marginRight = themeHost.position === 'prepend' || themeHost.position === 'before' ? '6px' : '0';
    btn.style.marginLeft = themeHost.position === 'append' ? '6px' : '0';
    applyThemeMode(readThemeMode());
  }

  if (!window.__agyTelemetryStarted) {
    window.__agyTelemetryStarted = true;
    connectTelemetryStream();
  }
  syncSidebarUpdatePill();
}

// ==================== Part 5: Zero-Jank 120fps Observers & Public API ====================

function ensureObserver() {
  if (window.__AGY_I18N_OBS__) return;
  window.__AGY_I18N_OBS__ = true;

  // Dedicated ultra-cheap observer on body class ONLY -> replaces expensive html:has(body.theme-dark)
  const darkObs = new MutationObserver(() => syncDarkAttribute());
  darkObs.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: false });

  let mountCheckQueued = false;
  function runLightweightMountCheck() {
    mountCheckQueued = false;
    syncHakimiStateThrottled(false);
    const composer = document.querySelector('.surface-composer');
    const composerChanged = composer && composer !== lastObservedComposer;
    const needsRing = composer && !document.getElementById('agy-codex-ctx-btn');
    const themeBtn = document.getElementById('agy-inline-theme-btn');
    const needsTheme = Boolean(findThemeButtonHost()) && (!themeBtn || !themeBtn.isConnected);
    if (needsRing || needsTheme) {
      mountCodexRingAndTopTheme();
    } else if (composerChanged) {
      bindComposerResizeObserver(composer);
    }
    if (window.__agyUpdateState && window.__agyUpdateState.available && !document.getElementById('agy-kit-update-wrap')) {
      syncSidebarUpdatePill();
    }
  }

  const observer = new MutationObserver((mutations) => {
    let structuralChanged = false;
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      const targetEl = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      if (!targetEl || isOwnControlElement(targetEl)) continue;

      // Fast-skip streaming assistant responses, code blocks, and editors before any work!
      const excluded = isExcludedElement(targetEl);
      if (m.type === 'characterData') {
        if (!excluded) enqueueTranslateNode(m.target);
        continue;
      }

      if (m.type === 'childList') {
        if (m.addedNodes && m.addedNodes.length) {
          structuralChanged = true;
          if (!excluded) {
            for (let j = 0; j < m.addedNodes.length; j++) {
              enqueueTranslateNode(m.addedNodes[j]);
            }
          }
        } else if (m.removedNodes && m.removedNodes.length) {
          structuralChanged = true;
        }
        continue;
      }

      if (m.type === 'attributes') {
        structuralChanged = true;
        if (!excluded && (m.attributeName === 'aria-label' || m.attributeName === 'placeholder' || m.attributeName === 'title')) {
          enqueueTranslateNode(m.target);
        }
      }
    }

    if (structuralChanged && !mountCheckQueued) {
      mountCheckQueued = true;
      window.requestAnimationFrame(runLightweightMountCheck);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-testid', 'aria-label', 'placeholder', 'title']
  });
}

window.__AGY_THEME__ = {
  set: (m) => applyThemeMode(m),
  get: () => readThemeMode(),
  list: () => VALID_THEMES.slice(),
  openPulse: () => togglePulseSidePanel(),
  closeInlineAsk: () => closeInlineAskPopover(),
};

window.__AGY_I18N__ = {
  refresh() {
    syncDarkAttribute();
    scan(document.body);
    ensureObserver();
    mountCodexRingAndTopTheme();
    mountMuseHakimi();
    mountInlineAskEngine();
    scheduleLayoutMuseStage();
  },
  translate: translateText,
};

syncDarkAttribute();
applyThemeMode(readThemeMode());
scan(document.body);
ensureObserver();
mountCodexRingAndTopTheme();
mountMuseHakimi();
mountInlineAskEngine();

return 'AGY_MUSE_PULSE_V2_120FPS_OK';
