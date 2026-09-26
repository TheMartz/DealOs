#!/usr/bin/env node
/*
 * flow_meter.js — Mide el Costo de Interacción (CI) de flujos reales con Playwright.
 *
 * Comandos:
 *   run <flow.json> [--out dir] [--url URL] [--headed]
 *       --url reemplaza la URL del flujo: corre el mismo flujo contra el prototipo y contra la app
 *       en producción/staging para comprobar paridad (el CI no debe subir al pasar a tu stack).
 *       Ejecuta un flujo definido paso a paso, mide CI mecánico, latencias, modales,
 *       navegaciones y scrolls, y toma una captura por paso. Genera report.json + report.md.
 *
 *   check <flujos-dir|flow.json…> [--baseline ux/baseline] [--base-url URL] [--out dir]
 *                                 [--summary resumen.md] [--tolerance 0] [--update-baseline]
 *       Revisión de PR: corre todos los flujos, los compara contra la línea base y sale con 1 si
 *       alguno cuesta más o dejó de completarse. Escribe un resumen Markdown para comentar en el PR
 *       (y en $GITHUB_STEP_SUMMARY si existe). --base-url resuelve URLs relativas ("/cotizaciones").
 *
 *   explore <sesion-dir> [--url URL] [--do JSON] [--viewport 1360x820] [--storage auth.json]
 *                       [--hide "#sel1,#sel2"] [--reset]
 *       Modo usuario simulado: abre la página, repite las acciones previas de la sesión,
 *       ejecuta la nueva acción (--do) y devuelve captura + lista numerada de elementos
 *       interactivos VISIBLES. El agente-persona elige por número, como lo haría una persona.
 *       Ej: --do '{"action":"click","index":4}'   --do '{"action":"fill","index":7,"value":"Grupo Norte"}'
 *           --do '{"action":"press","key":"Enter"}' --do '{"action":"hover","index":12}'
 *           --do '{"action":"scroll","dy":600}'      --do '{"action":"click","text":"Renovación flotilla"}'
 *           --do '{"action":"click","x":420,"y":288}' (coordenadas de la captura, como un humano)
 *
 *   compare <antes/report.json> <despues/report.json> [--out compare.md] [--parity]
 *       Tabla antes/después con deltas. Con --parity (prototipo vs. implementación) el veredicto es
 *       que el CI no suba, en lugar de la meta de −40% de un rediseño.
 *
 *   merge <report.json> <dudas.json>
 *       Suma las dudas de la prueba con personas al reporte: CI total = mecánico + 3 × dudas.
 *       dudas.json: [{ "step": 3, "persona": "Novato", "note": "No sé si 'Enviar' guarda o manda" }]
 *
 * Formato de flow.json (ejemplos en assets/flows/):
 *   {
 *     "name": "Registrar cotización", "url": "http://localhost:3000/cotizaciones" | "ruta/local.html",
 *     "frequency": "diaria" | "semanal" | "mensual",       // activa el presupuesto de overhead
 *     "viewport": "1360x820", "storageState": "auth.json",  // sesión iniciada (npx playwright codegen --save-storage=auth.json)
 *     "hide": ["#hud"],                                     // elementos que no son producto
 *     "setup": [ ...pasos que no se miden (login, datos)... ],
 *     "steps": [
 *       { "action": "click",  "target": "role=button[name=\"Nueva\"]", "note": "…" },
 *       { "action": "fill",   "target": "label=Cliente", "value": "Grupo Norte" },   // campo esencial por defecto
 *       { "action": "fill",   "target": "placeholder=Buscar", "value": "riego", "essential": false },
 *       { "action": "select", "target": "#estado", "value": "Enviada" },
 *       { "action": "press",  "key": "Enter" },
 *       { "action": "expect", "target": "text=Guardado" }                             // valida el resultado, no cuesta
 *     ]
 *   }
 *   Objetivos: label=… · placeholder=… · testid=… · text=… · role=rol[name="…"] · cualquier selector CSS.
 *   Otras acciones: dblclick, type, check, hover, scroll, wait, goto, note. Sin "target", fill/type escriben en el foco.
 *
 * Requiere Playwright: npm i -D playwright && npx playwright install chromium
 * (o define PW_CHROMIUM con la ruta a un Chromium ya instalado).
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* ---------------- Pesos del Costo de Interacción (mismos que SKILL.md) ---------------- */
const W = { click: 1, key: 1, field: 2, decision: 2, scroll: 1, modal: 2, navigation: 3, doubt: 3 };
const LABEL = { click: 'click', key: 'tecla', field: 'campo', decision: 'decisión', scroll: 'scroll', modal: 'modal', navigation: 'pantalla', doubt: 'duda' };
const BUDGET = { diaria: 5, semanal: 8, mensual: 12 };
const DOHERTY_MS = 400;
const INTERACTIVE = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=menuitem],[role=option],[role=tab],[role=checkbox],[role=radio],[role=switch],[role=combobox],[contenteditable="true"],[tabindex]:not([tabindex="-1"])';

/* ---------------- Utilidades ---------------- */
function die(msg) { console.error('✗ ' + msg); process.exit(1); }
function args(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { const k = a.slice(2); const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; opt[k] = v; }
    else pos.push(a);
  }
  return { pos, opt };
}
const readJSON = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { die(`No pude leer ${f}: ${e.message}`); } };
const writeJSON = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const slug = s => String(s || 'flujo').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const pad = n => String(n).padStart(2, '0');
const toURL = u => /^[a-z]+:\/\//i.test(u) ? u : 'file://' + path.resolve(u);
const parseViewport = v => { if (!v) return null; if (typeof v === 'object') return v; const [w, h] = String(v).split('x').map(Number); return { width: w, height: h }; };

function loadPlaywright() {
  for (const m of ['playwright', 'playwright-core', '@playwright/test']) { try { return require(m); } catch {} }
  try {
    const root = require('child_process').execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    for (const m of ['playwright', 'playwright-core']) { try { return require(path.join(root, m)); } catch {} }
  } catch {}
  die('No encontré Playwright. Instálalo con: npm i -D playwright && npx playwright install chromium');
}
function findChromium() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(base).filter(d => /^chromium-\d+/.test(d)).sort().reverse()) {
      for (const p of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe']) {
        if (fs.existsSync(path.join(base, d, p))) return path.join(base, d, p);
      }
    }
  } catch {}
  return undefined;
}
async function launch(headed) {
  const { chromium } = loadPlaywright();
  try { return await chromium.launch({ headless: !headed }); }
  catch (e) {
    const exe = findChromium();
    if (!exe) throw e;
    return chromium.launch({ headless: !headed, executablePath: exe });
  }
}
async function openPage(browser, cfg) {
  const vp = parseViewport(cfg.viewport) || { width: 1360, height: 820 };
  const ctx = await browser.newContext({
    viewport: vp, hasTouch: vp.width < 700, isMobile: vp.width < 700, locale: cfg.locale || 'es-MX',
    colorScheme: cfg.colorScheme || 'light',
    ...(cfg.storageState && fs.existsSync(cfg.storageState) ? { storageState: cfg.storageState } : {}),
  });
  const page = await ctx.newPage();
  const state = { navs: 0, nativeDialogs: 0, errors: [] };
  page.on('framenavigated', f => { if (f === page.mainFrame()) state.navs++; });
  page.on('dialog', d => { state.nativeDialogs++; d.accept().catch(() => {}); });
  page.on('pageerror', e => state.errors.push(e.message));
  const hide = [].concat(cfg.hide || []).flatMap(s => String(s).split(',')).map(s => s.trim()).filter(Boolean);
  if (hide.length) await ctx.addInitScript(css => {
    const add = () => { const st = document.createElement('style'); st.textContent = css; document.documentElement.append(st); };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', add) : add();
  }, `${hide.join(',')}{display:none!important}`);
  await page.goto(toURL(cfg.url), { waitUntil: 'load' });
  await settle(page);
  state.navs = 0;
  return { ctx, page, state };
}

/* ---------------- Localizar objetivos ---------------- */
// Acepta: "label=Cliente", "placeholder=Buscar", "testid=nuevo", "text=Guardar",
// 'role=button[name="Nueva"]', "css=..." o cualquier selector de Playwright/CSS.
function locate(page, target) {
  if (target && typeof target === 'object') {
    if (target.role) return page.getByRole(target.role, target.name ? { name: target.name, exact: !!target.exact } : {}).nth(target.nth || 0);
    if (target.css) return page.locator(target.css).first();
  }
  const t = String(target);
  let m;
  if ((m = t.match(/^label=(.+)$/s))) return page.getByLabel(m[1]).first();
  if ((m = t.match(/^placeholder=(.+)$/s))) return page.getByPlaceholder(m[1]).first();
  if ((m = t.match(/^testid=(.+)$/s))) return page.getByTestId(m[1]).first();
  if ((m = t.match(/^role=([\w-]+)(?:\[name=(["'])(.*?)\2\])?$/s))) return page.getByRole(m[1], m[3] ? { name: m[3] } : {}).first();
  return page.locator(t).first();
}

/* ---------------- Medición ---------------- */
async function armObserver(page) {
  await page.evaluate(() => {
    const fm = window.__fm = { t0: performance.now(), first: null, last: null };
    fm.mo?.disconnect?.();
    fm.mo = new MutationObserver(() => { const n = performance.now(); if (fm.first == null) fm.first = n; fm.last = n; });
    fm.mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  }).catch(() => {});
}
// Espera a que el DOM quede quieto 150 ms (máx 5 s). Devuelve { first, stable } en ms desde armObserver.
async function settle(page, quiet = 150, max = 5000, retry = true) {
  try {
    return await page.evaluate(([quiet, max]) => new Promise(res => {
      const fm = window.__fm || { t0: performance.now(), first: null, last: null };
      if (!fm.mo) {
        fm.mo = new MutationObserver(() => { const n = performance.now(); if (fm.first == null) fm.first = n; fm.last = n; });
        fm.mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
        window.__fm = fm;
      }
      const start = performance.now();
      const tick = () => {
        const now = performance.now(), last = fm.last ?? start;
        if (now - Math.max(last, start) >= quiet || now - start >= max) {
          fm.mo.disconnect(); fm.mo = null;
          res({ first: fm.first == null ? null : Math.round(fm.first - fm.t0), stable: Math.round((fm.last ?? fm.t0) - fm.t0) });
        } else setTimeout(tick, 25);
      };
      setTimeout(tick, 25);
    }), [quiet, max]);
  } catch {
    if (!retry) return { first: null, stable: null, navigated: true };
    await page.waitForLoadState('load').catch(() => {});
    const r = await settle(page, quiet, max, false);
    return { ...r, navigated: true };
  }
}
async function countDialogs(page) {
  return page.evaluate(() => [...document.querySelectorAll('dialog[open],[role=dialog],[role=alertdialog],[aria-modal="true"]')]
    .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (el.checkVisibility ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true); })
    .length).catch(() => 0);
}
async function describe(loc) {
  return loc.evaluate(el => {
    const r = el.getBoundingClientRect();
    const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    let options = 0;
    if (el.tagName === 'SELECT') options = el.options.length;
    else {
      const g = el.closest('[role=menu],[role=listbox],[role=radiogroup],[role=tablist],nav');
      if (g) options = g.querySelectorAll('[role=menuitem],[role=option],[role=radio],[role=tab],a[href],button').length;
    }
    const name = (el.getAttribute('aria-label') || el.labels?.[0]?.innerText || el.getAttribute('placeholder') || el.innerText || el.value || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    return { inView, options, name, tag: el.tagName.toLowerCase() };
  });
}

// Ejecuta un paso y devuelve su medición. `resolve` convierte step.index en objetivo (modo explore).
async function measureStep(page, st, step, opts = {}) {
  const b = { click: 0, key: 0, field: 0, decision: 0, scroll: 0, modal: 0, navigation: 0 };
  const flags = [];
  const timeout = step.timeout || opts.timeout || 8000;
  const target = step.target ?? (step.text != null && step.action !== 'note' ? `text=${step.text}` : null);
  const atPoint = step.x != null && step.y != null && target == null;
  const loc = target != null ? locate(page, target) : null;
  let info = { inView: true, options: 0, name: '' };
  if (atPoint) info = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return { inView: true, options: 0, name: (el?.getAttribute('aria-label') || el?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60), tag: el?.tagName.toLowerCase() };
  }, [step.x, step.y]);
  if (loc && !['wait', 'goto'].includes(step.action)) {
    await loc.waitFor({ state: 'attached', timeout }).catch(() => {
      throw new Error(`No encontré ${typeof target === 'string' ? target : JSON.stringify(target)} en ${timeout / 1000} s (¿cambió el texto, el rol o desapareció la acción?)`);
    });
    info = await describe(loc);
  }
  if (step.action === 'press') {
    info.options = await page.evaluate(() => {
      const g = document.activeElement?.closest('[role=menu],[role=listbox],[role=radiogroup],[role=tablist]');
      return g ? g.querySelectorAll('[role=menuitem],[role=option],[role=radio],[role=tab]').length : 0;
    }).catch(() => 0);
  }
  const dialogsBefore = await countDialogs(page);
  const navsBefore = st.navs, nativeBefore = st.nativeDialogs;
  const urlBefore = page.url();
  if (loc && !info.inView && ['click', 'dblclick', 'fill', 'type', 'select', 'check', 'hover'].includes(step.action)) {
    b.scroll = 1; flags.push('El objetivo estaba fuera de la pantalla: hubo que hacer scroll.');
  }
  await armObserver(page);
  const t0 = Date.now();
  let keys = 0;
  const val = step.value != null ? String(step.value) : '';
  switch (step.action) {
    case 'click': if (atPoint) await page.mouse.click(step.x, step.y); else await loc.click({ timeout }); b.click = 1; break;
    case 'dblclick': await loc.dblclick({ timeout }); b.click = 2; break;
    case 'fill':
      if (loc) await loc.fill(val, { timeout }); else await page.keyboard.type(val);
      b.field = 1; keys = val.length; break;
    case 'type':
      if (loc) await loc.pressSequentially(val, { timeout }); else await page.keyboard.type(val);
      b.field = 1; keys = val.length; break;
    case 'select':
      await loc.selectOption({ label: val }, { timeout }).catch(() => loc.selectOption(val, { timeout }));
      b.click = 2; break;
    case 'check': await loc.check({ timeout }); b.click = 1; break;
    case 'press': await page.keyboard.press(step.key); b.key = 1; keys = 1; break;
    case 'hover': if (atPoint) await page.mouse.move(step.x, step.y); else await loc.hover({ timeout }); break;
    case 'scroll':
      if (loc) await loc.scrollIntoViewIfNeeded({ timeout }); else await page.mouse.wheel(0, Number(step.dy || 600));
      b.scroll = 1; break;
    case 'wait':
      if (loc) await loc.waitFor({ state: 'visible', timeout }); else await page.waitForTimeout(Number(step.ms || 500));
      break;
    case 'expect': {
      const ok = await loc.waitFor({ state: 'visible', timeout }).then(() => true).catch(() => false);
      if (!ok) throw new Error(`No apareció lo esperado: ${JSON.stringify(target)}`);
      break;
    }
    case 'goto': await page.goto(toURL(step.url), { waitUntil: 'load' }); break;
    case 'note': break;
    default: throw new Error(`Acción desconocida: ${step.action}`);
  }
  const act = Date.now() - t0;
  const s = await settle(page);
  if (['click', 'select', 'press'].includes(step.action) && info.options > 3 && !/^(Escape|Tab|Arrow)/.test(step.key || '')) {
    b.decision = 1; flags.push(`Decisión entre ${info.options} opciones (Ley de Hick).`);
  }
  const dialogsAfter = await countDialogs(page);
  const native = st.nativeDialogs - nativeBefore;
  if (dialogsAfter > dialogsBefore || native > 0) {
    b.modal = Math.max(1, native);
    flags.push(native ? 'Apareció un diálogo nativo (confirm/alert): prefiere deshacer.' : 'Se abrió un modal o capa intermedia.');
  }
  if (st.navs > navsBefore || page.url() !== urlBefore || s.navigated) {
    b.navigation = 1; flags.push('Cambio de pantalla o recarga.');
  }
  const feedback = s.navigated ? act : s.first;
  if (['click', 'press', 'select', 'check', 'dblclick'].includes(step.action)) {
    // Un <select> o checkbox nativo muestra su nuevo valor sin mutar el DOM: no es falta de feedback.
    if (feedback == null && !['select', 'check'].includes(step.action) && !(info.tag === 'input' && step.action === 'click')) flags.push('Sin respuesta visible tras la acción: el usuario no sabe si funcionó.');
    else if (feedback > DOHERTY_MS) flags.push(`Primera respuesta en ${feedback} ms (umbral Doherty ${DOHERTY_MS} ms): usa optimistic UI o skeleton.`);
  }
  const cost = Object.entries(b).reduce((a, [k, n]) => a + n * W[k], 0);
  return {
    action: step.action, target: target ?? step.key ?? step.url ?? null, name: info.name || step.key || '', note: step.note || (step.action === 'note' ? step.text : '') || '',
    breakdown: b, cost, keys, essential: ['fill', 'type'].includes(step.action) ? step.essential !== false : !!step.essential, feedbackMs: feedback, stableMs: s.navigated ? act : s.stable, flags, url: page.url(),
  };
}

function totals(steps, doubts = []) {
  const t = { click: 0, key: 0, field: 0, decision: 0, scroll: 0, modal: 0, navigation: 0 };
  let keys = 0, mech = 0, ms = 0, essential = 0;
  for (const s of steps) {
    for (const k in t) t[k] += s.breakdown[k];
    keys += s.keys; mech += s.cost; ms += s.stableMs || 0;
    if (s.essential && s.breakdown.field) essential += s.breakdown.field;
  }
  const ciTotal = mech + doubts.length * W.doubt;
  // Overhead = todo lo que no es capturar datos que solo el usuario conoce. Es lo que se compara contra el presupuesto.
  return { ...t, keys, doubts: doubts.length, essentialFields: essential, ciMechanical: mech, ciTotal, ciOverhead: ciTotal - essential * W.field, systemMs: ms };
}
const fmtBreak = b => Object.entries(b).filter(([, n]) => n).map(([k, n]) => `${n > 1 ? n + '× ' : ''}${LABEL[k]}`).join(' + ') || '—';

function renderReport(r) {
  const T = r.totals, budget = BUDGET[r.frequency];
  const over = T.ciOverhead ?? T.ciTotal;
  const pct = budget ? Math.round((over / budget) * 100) : null;
  const L = [];
  L.push(`# Costo de interacción · ${r.name}`, '');
  L.push(`\`${r.url}\` · ${r.viewport.width}×${r.viewport.height} · ${r.date}`, '');
  L.push(`**CI ${r.doubts.length ? 'total' : 'mecánico'}: ${T.ciTotal}**` +
    (r.doubts.length ? ` (mecánico ${T.ciMechanical} + ${T.doubts} duda${T.doubts === 1 ? '' : 's'} × 3)` : '') +
    ` · **overhead: ${over}** (sin ${T.essentialFields || 0} campo${T.essentialFields === 1 ? '' : 's'} esencial${T.essentialFields === 1 ? '' : 'es'})` +
    (budget ? ` · presupuesto de uso ${r.frequency}: ${budget} → ${pct}% ${pct > 100 ? '⚠️ excedido' : '✓'}` : ''), '');
  if (r.failed) L.push(`> ⚠️ El flujo falló en el paso ${r.failed.step}: ${r.failed.error}`, '');
  L.push('| Clicks | Campos | Teclas | Decisiones | Scrolls | Modales | Pantallas | Hasta estable* |', '|---|---|---|---|---|---|---|---|');
  L.push(`| ${T.click} | ${T.field} | ${T.keys} | ${T.decision} | ${T.scroll} | ${T.modal} | ${T.navigation} | ${(T.systemMs / 1000).toFixed(1)} s |`, '');
  L.push('_* Tiempo sumado hasta que la interfaz deja de cambiar; incluye animaciones, no solo espera de red._', '');
  L.push('## Pasos', '', '| # | Acción | Objetivo | CI | Desglose | Respuesta | Nota |', '|---|---|---|---|---|---|---|');
  r.steps.forEach((s, i) => {
    const warn = s.flags.some(f => /Doherty|Sin respuesta/.test(f)) ? ' ⚠️' : '';
    L.push(`| ${i + 1} | ${s.action} | ${String(s.name || s.target || '').replace(/\|/g, '\\|')} | ${s.cost} | ${fmtBreak(s.breakdown)} | ${s.feedbackMs == null ? '—' : s.feedbackMs + ' ms'}${warn} | ${String(s.note || '').replace(/\|/g, '\\|')} |`);
  });
  const alerts = r.steps.flatMap((s, i) => s.flags.filter(f => !/^Cambio de pantalla/.test(f)).map(f => `- Paso ${i + 1}: ${f}`));
  L.push('', '## Alertas', '', ...(alerts.length ? alerts : ['- Ninguna.']), '');
  L.push('## Dudas (prueba con usuarios simulados)', '');
  if (r.doubts.length) r.doubts.forEach(d => L.push(`- Paso ${d.step ?? '?'} · **${d.persona || 'Persona'}**: ${d.note}`));
  else L.push('- Sin datos todavía. Corre la prueba con personas y fusiona: `node flow_meter.js merge report.json dudas.json`');
  L.push('', `_CI total = mecánico + 3 × dudas. Overhead = CI total − 2 × campos esenciales (datos que solo el usuario conoce; marca "essential": false en campos que no lo son, como búsquedas). Pesos: click 1 · tecla 1 · campo 2 · decisión >3 opciones 2 · scroll 1 · modal 2 · pantalla 3 · duda 3._`);
  if (r.shots) L.push('', `Capturas por paso en \`${r.shots}/\`.`);
  return L.join('\n') + '\n';
}

/* ---------------- Comando: run ---------------- */
// Ejecuta un flujo y devuelve { report, out }. La usan `run` y `check`.
async function runFlow(file, opt = {}) {
  const flow = readJSON(file);
  if (!flow.url || !Array.isArray(flow.steps)) die(`${file}: el flujo necesita "url" y "steps".`);
  const base = path.dirname(path.resolve(file));
  if (flow.storageState) flow.storageState = path.resolve(base, flow.storageState);
  const isAbs = u => /^[a-z]+:\/\//i.test(u);
  if (opt.url) flow.url = isAbs(opt.url) ? opt.url : path.resolve(opt.url);
  // --base-url: las URLs relativas del flujo ("/cotizaciones") se resuelven contra la app en CI.
  else if (opt['base-url'] && !isAbs(flow.url)) flow.url = new URL(flow.url, String(opt['base-url']).replace(/\/?$/, '/')).href;
  else if (!isAbs(flow.url)) flow.url = path.resolve(base, flow.url);
  const out = path.resolve(opt.out || `flow-report-${slug(flow.name)}`);
  fs.mkdirSync(path.join(out, 'shots'), { recursive: true });
  const browser = await launch(opt.headed);
  const steps = [];
  let failed = null, state = { errors: [] };
  try {
    const opened = await openPage(browser, flow);
    const page = opened.page; state = opened.state;
    for (const s of flow.setup || []) await measureStep(page, state, s);
    state.navs = 0;
    await page.screenshot({ path: path.join(out, 'shots', 'step-00.png') });
    for (let i = 0; i < flow.steps.length; i++) {
      try {
        const m = await measureStep(page, state, flow.steps[i], flow);
        steps.push(m);
        await page.screenshot({ path: path.join(out, 'shots', `step-${pad(i + 1)}.png`) });
      } catch (e) {
        failed = { step: i + 1, error: e.message.split('\n')[0] };
        await page.screenshot({ path: path.join(out, 'shots', `step-${pad(i + 1)}-fallo.png`) }).catch(() => {});
        break;
      }
    }
  } catch (e) {
    failed = { step: 0, error: `No se pudo abrir ${flow.url}: ${e.message.split('\n')[0]}` };
  } finally { await browser.close(); }
  const vp = parseViewport(flow.viewport) || { width: 1360, height: 820 };
  const report = {
    name: flow.name || path.basename(file), file: path.basename(file), url: flow.url, viewport: vp, frequency: flow.frequency || null,
    date: new Date().toISOString().slice(0, 16).replace('T', ' '), steps, doubts: [], failed, pageErrors: state.errors, shots: 'shots',
  };
  report.totals = totals(steps);
  writeJSON(path.join(out, 'report.json'), report);
  fs.writeFileSync(path.join(out, 'report.md'), renderReport(report));
  return { report, out };
}

async function cmdRun(file, opt) {
  const { report, out } = await runFlow(file, opt);
  console.log(renderReport(report));
  console.log(`→ ${path.relative(process.cwd(), out) || '.'}/report.md`);
  if (report.failed) process.exitCode = 2;
}

/* ---------------- Comando: check (revisión de PR) ---------------- */
// Corre todos los flujos y los compara contra la línea base. Sale con 1 si algún flujo cuesta más
// (o dejó de completarse). Genera un resumen en Markdown listo para comentar en el PR.
function listFlows(targets) {
  const files = [];
  for (const t of targets) {
    const p = path.resolve(t);
    if (fs.statSync(p).isDirectory()) {
      for (const f of fs.readdirSync(p).sort()) if (f.endsWith('.json')) files.push(path.join(p, f));
    } else files.push(p);
  }
  return files.filter(f => { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return j.url && Array.isArray(j.steps); } catch { return false; } });
}
function stepDiff(A, B) {
  const out = [];
  const n = Math.max(A.steps.length, B.steps.length);
  for (let i = 0; i < n; i++) {
    const a = A.steps[i], b = B.steps[i];
    const name = (b || a).name || (b || a).target || '';
    if (!a) { out.push(`- Paso ${i + 1} nuevo (${b.action} ${name}): +${b.cost}`); continue; }
    if (!b) { out.push(`- Paso ${i + 1} (${a.action} ${name}) no se alcanzó`); continue; }
    const added = Object.keys(b.breakdown).filter(k => b.breakdown[k] > a.breakdown[k]).map(k => `+${b.breakdown[k] - a.breakdown[k]} ${LABEL[k]}`);
    const removed = Object.keys(a.breakdown).filter(k => a.breakdown[k] > b.breakdown[k]).map(k => `−${a.breakdown[k] - b.breakdown[k]} ${LABEL[k]}`);
    if (a.cost !== b.cost) out.push(`- Paso ${i + 1} (${b.action} ${name}): ${a.cost} → ${b.cost}${added.length || removed.length ? ` (${[...added, ...removed].join(', ')})` : ''}`);
    const newFlags = b.flags.filter(f => !a.flags.includes(f) && !/^Cambio de pantalla/.test(f));
    newFlags.forEach(f => out.push(`  - ⚠️ Nuevo en el paso ${i + 1}: ${f}`));
    if (a.feedbackMs != null && b.feedbackMs != null && b.feedbackMs > DOHERTY_MS && a.feedbackMs <= DOHERTY_MS)
      out.push(`  - 🐢 Paso ${i + 1}: la respuesta pasó de ${a.feedbackMs} ms a ${b.feedbackMs} ms`);
  }
  return out;
}
async function cmdCheck(targets, opt) {
  const files = listFlows(targets);
  if (!files.length) die('No encontré flujos (.json con "url" y "steps") en: ' + targets.join(', '));
  const baseDir = path.resolve(opt.baseline || 'ux/baseline');
  const outRoot = path.resolve(opt.out || 'flow-check');
  const tol = Number(opt.tolerance || 0);
  fs.mkdirSync(baseDir, { recursive: true });
  const rows = [], details = [];
  let bad = 0;
  for (const f of files) {
    const key = path.basename(f, '.json');
    const { report: B } = await runFlow(f, { ...opt, out: path.join(outRoot, key) });
    const baseFile = path.join(baseDir, `${key}.json`);
    const A = fs.existsSync(baseFile) ? readJSON(baseFile) : null;
    let status;
    if (B.failed) { status = `❌ ya no se completa (paso ${B.failed.step})`; bad++; }
    else if (!A) status = '🆕 sin línea base';
    else {
      const d = B.totals.ciTotal - A.totals.ciTotal;
      status = d > tol ? (bad++, `❌ sube ${d}`) : d < 0 ? `✅ baja ${-d}` : '✅ igual';
    }
    const budget = BUDGET[B.frequency];
    const over = B.totals.ciOverhead ?? B.totals.ciTotal;
    const overCell = B.failed ? '—' : budget ? `${over}/${budget}${over > budget ? ' ⚠️' : ''}` : over;
    rows.push(`| ${B.name} | ${A ? A.totals.ciTotal : '—'} | ${B.failed ? '—' : B.totals.ciTotal} | ${overCell} | ${status} |`);
    const diff = A && !B.failed ? stepDiff(A, B) : [];
    if (B.failed) details.push(`### ${B.name}`, '', `El paso ${B.failed.step} falló: ${B.failed.error}`, '', 'Un flujo que ya no se completa es la regresión más cara. Si el cambio fue intencional, actualiza el flow.json en este mismo PR.', '');
    else if (diff.length) details.push(`### ${B.name}`, '', ...diff, '');
    if (opt['update-baseline'] && !B.failed) writeJSON(baseFile, B);
  }
  const md = [
    '<!-- interaction-cost -->',
    '## Costo de interacción',
    '',
    '| Flujo | Base | Este cambio | Overhead / presupuesto | Resultado |',
    '|---|---|---|---|---|',
    ...rows,
    '',
    ...(details.length ? ['#### Qué cambió', '', ...details] : ['Ningún paso cambió de costo.', '']),
    bad
      ? `> ${bad} flujo${bad > 1 ? 's' : ''} empeoró. Si el aumento es intencional (regulación, seguridad, una decisión que debe ser consciente), explícalo en el PR y actualiza la línea base con \`flow_meter.js check … --update-baseline\`.`
      : opt['update-baseline'] ? '> Línea base actualizada.' : '> Ningún flujo cuesta más que en la línea base.',
    '',
    `<sub>CI = click 1 · tecla 1 · campo 2 · decisión 2 · scroll 1 · modal 2 · pantalla 3. Capturas por paso en \`${path.relative(process.cwd(), outRoot) || '.'}/\`.</sub>`,
  ].join('\n') + '\n';
  if (opt.summary) fs.writeFileSync(path.resolve(opt.summary), md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(md);
  if (bad && !opt['update-baseline']) process.exitCode = 1;
}

/* ---------------- Comando: explore (usuario simulado) ---------------- */
async function listVisible(page) {
  return page.evaluate(SEL => {
    const cssPath = el => {
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) return '#' + CSS.escape(el.id);
      const parts = [];
      for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
        if (n.id && document.querySelectorAll('#' + CSS.escape(n.id)).length === 1) { parts.unshift('#' + CSS.escape(n.id)); break; }
        const sib = [...n.parentElement.children].filter(c => c.tagName === n.tagName);
        parts.unshift(n.tagName.toLowerCase() + (sib.length > 1 ? `:nth-of-type(${sib.indexOf(n) + 1})` : ''));
      }
      return parts.join(' > ');
    };
    const roleOf = el => el.getAttribute('role') || ({ A: 'link', BUTTON: 'button', SELECT: 'combobox', TEXTAREA: 'textbox', SUMMARY: 'button' }[el.tagName]) ||
      (el.tagName === 'INPUT' ? ({ checkbox: 'checkbox', radio: 'radio', submit: 'button', button: 'button', search: 'searchbox' }[el.type] || 'textbox') : 'elemento');
    const nameOf = el => {
      const by = el.getAttribute('aria-labelledby');
      const t = el.getAttribute('aria-label') || (by && by.split(' ').map(id => document.getElementById(id)?.innerText || '').join(' ')) ||
        el.labels?.[0]?.innerText || (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) ? '' : el.innerText) || el.getAttribute('placeholder') || el.getAttribute('title') || el.value || '';
      return t.trim().replace(/\s+/g, ' ').slice(0, 80);
    };
    const out = [];
    for (const el of document.querySelectorAll(SEL)) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (el.closest('[inert],[aria-hidden="true"]')) continue;
      const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
      const extra = [];
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') extra.push('deshabilitado');
      if (el.checked || el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-pressed') === 'true') extra.push('activo');
      if (['INPUT', 'TEXTAREA'].includes(el.tagName) && el.value && el.type !== 'checkbox') extra.push(`valor="${el.value.slice(0, 30)}"`);
      if (el.getAttribute('placeholder')) extra.push(`placeholder="${el.getAttribute('placeholder')}"`);
      if (document.activeElement === el) extra.push('con foco');
      const row = el.closest('tr,li,[role=row],[role=listitem],article');
      if (row) {
        const first = (row.querySelector('td:not(:has(input[type=checkbox])),h3,h4,strong') || row).innerText.trim().split('\n')[0].slice(0, 40);
        if (first && first !== nameOf(el)) extra.push(`en «${first}»`);
      }
      out.push({ role: roleOf(el), name: nameOf(el), inView, extra, css: cssPath(el), y: Math.round(r.top), x: Math.round(r.left) });
    }
    return out.sort((a, b) => (b.inView - a.inView) || (Math.abs(a.y - b.y) > 8 ? a.y - b.y : a.x - b.x));
  }, INTERACTIVE);
}
async function cmdExplore(dir, opt) {
  dir = path.resolve(dir);
  const sf = path.join(dir, 'session.json');
  fs.mkdirSync(dir, { recursive: true });
  let S = fs.existsSync(sf) && !opt.reset ? readJSON(sf) : null;
  if (!S) {
    if (!opt.url) die('Primera vez: pasa --url con la página a explorar.');
    S = { url: /^[a-z]+:\/\//i.test(opt.url) ? opt.url : path.resolve(opt.url), viewport: parseViewport(opt.viewport) || { width: 1360, height: 820 },
      storageState: opt.storage ? path.resolve(opt.storage) : null, hide: opt.hide ? String(opt.hide).split(',') : [], actions: [], lastElements: [] };
  }
  const browser = await launch(opt.headed);
  const { page, state } = await openPage(browser, S);
  try {
    for (const a of S.actions) await measureStep(page, state, a.step).catch(e => { throw new Error(`Falló al repetir la acción ${a.n}: ${e.message}`); });
    let result = null;
    if (opt.do) {
      let step;
      try { step = JSON.parse(opt.do); } catch { die('--do debe ser JSON válido'); }
      if (step.index != null) {
        const el = S.lastElements[step.index];
        if (!el) die(`No existe el elemento #${step.index} en la última vista.`);
        step.target = { css: el.css };
        step.label = `${el.role} "${el.name}"`;
        delete step.index;
      }
      result = await measureStep(page, state, step);
      S.actions.push({ n: S.actions.length + 1, step, label: step.label || step.key || step.text || '', cost: result.cost, breakdown: result.breakdown, flags: result.flags });
    }
    const n = pad(S.actions.length);
    const shot = path.join(dir, `vista-${n}.png`);
    await page.screenshot({ path: shot });
    const els = await listVisible(page);
    S.lastElements = els;
    writeJSON(sf, S);
    const title = await page.title();
    const heads = await page.evaluate(() => [...document.querySelectorAll('h1,h2,[role=status],[role=alert]')].filter(e => e.checkVisibility?.() !== false && e.innerText.trim()).map(e => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 90)).slice(0, 6));
    const ci = S.actions.reduce((a, x) => a + (x.cost || 0), 0);
    const L = [];
    if (result) L.push(`Acción ${S.actions.length}: ${S.actions.at(-1).label || result.action} → CI ${result.cost} (${fmtBreak(result.breakdown)})${result.flags.length ? '\n  · ' + result.flags.join('\n  · ') : ''}`);
    L.push(`Página: ${title} · ${page.url()}`, `Captura: ${shot}`, `CI acumulado de esta ruta: ${ci} en ${S.actions.length} acciones`);
    if (heads.length) L.push('Encabezados/avisos visibles: ' + heads.join(' | '));
    L.push('', 'Elementos interactivos visibles. Usa el número (index), o haz click como persona sobre texto visible ({"action":"click","text":"…"}) o coordenadas de la captura ({"action":"click","x":400,"y":220}):');
    els.forEach((e, i) => L.push(`  [${i}] ${e.role} "${e.name || '(sin nombre)'}"${e.extra.length ? ' · ' + e.extra.join(' · ') : ''}${e.inView ? '' : ' · fuera de pantalla'}`));
    console.log(L.join('\n'));
  } finally { await browser.close(); }
}

/* ---------------- Comandos: compare / merge ---------------- */
function cmdCompare(a, b, opt) {
  const A = readJSON(a), B = readJSON(b);
  const rows = [['CI total', 'ciTotal'], ['CI overhead', 'ciOverhead'], ['CI mecánico', 'ciMechanical'], ['Clicks', 'click'], ['Campos', 'field'], ['Teclas', 'keys'],
    ['Decisiones', 'decision'], ['Scrolls', 'scroll'], ['Modales', 'modal'], ['Pantallas', 'navigation'], ['Dudas', 'doubts']];
  const d = (x, y) => x === y ? '=' : x === 0 ? `+${y}` : `${y > x ? '+' : ''}${Math.round(((y - x) / x) * 100)}%`;
  const L = [`# Antes vs después · ${B.name}`, '', `| Métrica | Antes | Después | Cambio |`, '|---|---|---|---|'];
  const acts = r => r.steps.filter(s => !['expect', 'wait', 'note'].includes(s.action)).length;
  L.push(`| Acciones | ${acts(A)} | ${acts(B)} | ${d(acts(A), acts(B))} |`);
  for (const [l, k] of rows) L.push(`| ${l} | ${A.totals[k]} | ${B.totals[k]} | ${d(A.totals[k], B.totals[k])} |`);
  L.push(`| Hasta estable (incl. animaciones) | ${(A.totals.systemMs / 1000).toFixed(1)} s | ${(B.totals.systemMs / 1000).toFixed(1)} s | ${d(A.totals.systemMs, B.totals.systemMs)} |`);
  const red = A.totals.ciTotal ? Math.round((1 - B.totals.ciTotal / A.totals.ciTotal) * 100) : 0;
  if (opt.parity) {
    const diff = B.totals.ciTotal - A.totals.ciTotal;
    L.push('', diff <= 0 ? `✓ Paridad: la implementación cuesta ${diff < 0 ? `${-diff} menos` : 'lo mismo'} que el prototipo (CI ${B.totals.ciTotal}).`
      : `✗ La implementación cuesta ${diff} más que el prototipo: revisa los pasos que cambiaron antes de publicar.`);
    const changed = A.steps.map((s, i) => [i, s, B.steps[i]]).filter(([, a, b]) => !b || a.cost !== b.cost);
    changed.forEach(([i, a, b]) => L.push(`- Paso ${i + 1} (${a.action} ${a.name || ''}): ${a.cost} → ${b ? b.cost : 'no existe'}`));
    if (process.exitCode == null && diff > 0) process.exitCode = 3;
  } else L.push('', red >= 40 ? `✓ Reducción de CI de ${red}% (meta ≥ 40%).` : red > 0 ? `⚠️ Reducción de CI de ${red}%: por debajo de la meta de 40%.` : `✗ El CI no bajó (${red}%).`);
  const md = L.join('\n') + '\n';
  if (opt.out) fs.writeFileSync(opt.out, md);
  console.log(md);
}
function cmdMerge(rep, dudas) {
  const R = readJSON(rep), D = readJSON(dudas);
  if (!Array.isArray(D)) die('dudas.json debe ser un arreglo de { step, persona, note }');
  R.doubts = D;
  R.totals = totals(R.steps, D);
  writeJSON(rep, R);
  fs.writeFileSync(path.join(path.dirname(rep), 'report.md'), renderReport(R));
  console.log(renderReport(R));
}

/* ---------------- Main ---------------- */
(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, opt } = args(rest);
  try {
    if (cmd === 'run' && pos[0]) await cmdRun(pos[0], opt);
    else if (cmd === 'check' && pos[0]) await cmdCheck(pos, opt);
    else if (cmd === 'explore' && pos[0]) await cmdExplore(pos[0], opt);
    else if (cmd === 'compare' && pos[1]) cmdCompare(pos[0], pos[1], opt);
    else if (cmd === 'merge' && pos[1]) cmdMerge(pos[0], pos[1]);
    else { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\n?/, '').replace(/^ \* ?/gm, '')); process.exitCode = 1; }
  } catch (e) { die(e.message.split('\n')[0]); }
})();
