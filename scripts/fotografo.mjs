/**
 * EL FOTÓGRAFO: una pantalla de juego, fotografiada en muchos aparatos de verdad, con un informe de
 * lo que no cabe.
 *
 * ═══ POR QUÉ NO VALE EL PANEL DEL NAVEGADOR ═══
 *
 * El panel anuncia «emulando 375×812» y la página sigue midiendo 1024×2218 por dentro: lo que se
 * reduce es la captura, no el viewport CSS (memoria «el panel del navegador no pulsa en móvil»).
 * Y no emula el toque. Esto arranca Edge sin ventana y le habla por el protocolo de depuración
 * (CDP): `Emulation.setDeviceMetricsOverride` cambia el viewport de verdad —`innerWidth` da lo que
 * se pide—, `setTouchEmulationEnabled` pone `(pointer: coarse)` y los puntos de toque, y el agente
 * de usuario es el de un móvil. Pinta con la GPU real (ANGLE sobre D3D11), así que las escenas 3D
 * salen como en un aparato.
 *
 * ═══ USO ═══
 *
 *   node scripts/fotografo.mjs <plan.json>
 *
 * El plan (JSON):
 *   {
 *     "url": "http://localhost:5271/sala/burgo",   // SIEMPRE con puerto explícito
 *     "salida": "C:/…/scratchpad/fotos/burgo",      // carpeta; se crea
 *     "tamanos": ["movil-pequeno", "iphone-se", …], // o "todos"; ver TAMANOS
 *     "almacen": { "clave": "valor" },               // localStorage antes de cargar (el origen de la url)
 *     "esperaMs": 12000,                             // cuánto dejar cargar antes de actuar
 *     "antes": "código JS (async) que se ejecuta tras cargar: pulsar «Al hombro», etc.",
 *     "despuesMs": 3000,                              // cuánto esperar tras `antes`
 *     "perfil": "C:/…/scratchpad/edge-yo",            // un perfil por agente: dos con el mismo se pisan
 *     "puerto": 9333                                   // el de depuración; uno por agente
 *   }
 *
 * Por cada tamaño deja `<tamaño>.png` y, en `informe.json`, lo medido en la página: el viewport que
 * de verdad vio (si no coincide con el pedido, la foto no vale), los elementos tocables o fijos que
 * se salen de la pantalla, los que se pisan entre sí, los botones de menos de 44 px en un móvil y
 * los textos cortados. Es una pista para mirar la foto, no un veredicto: la foto se mira con Read.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(RAIZ, 'package.json'));
const WebSocket = require('ws');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const UA_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
const UA_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/**
 * LOS APARATOS. Los móviles, en CSS px con su densidad: el ancho más estrecho que se vende hoy
 * (360), los iPhone pequeño y corriente, un Android grande, y los mismos tumbados. Luego tableta y
 * dos pantallas de ordenador.
 */
export const TAMANOS = {
  'movil-pequeno': { ancho: 360, alto: 640, dpr: 3, movil: true, ua: UA_ANDROID },
  'iphone-se': { ancho: 375, alto: 667, dpr: 2, movil: true, ua: UA_IPHONE },
  'iphone-14': { ancho: 390, alto: 844, dpr: 3, movil: true, ua: UA_IPHONE },
  'android-grande': { ancho: 412, alto: 915, dpr: 2.625, movil: true, ua: UA_ANDROID },
  'movil-tumbado': { ancho: 844, alto: 390, dpr: 3, movil: true, ua: UA_IPHONE },
  'android-tumbado': { ancho: 915, alto: 412, dpr: 2.625, movil: true, ua: UA_ANDROID },
  tableta: { ancho: 768, alto: 1024, dpr: 2, movil: true, ua: UA_IPHONE },
  'tableta-tumbada': { ancho: 1024, alto: 768, dpr: 2, movil: true, ua: UA_IPHONE },
  portatil: { ancho: 1366, alto: 768, dpr: 1, movil: false, ua: null },
  escritorio: { ancho: 1920, alto: 1080, dpr: 1, movil: false, ua: null },
};

/** Lo que se mide dentro de la página. Va como texto a `Runtime.evaluate`. */
const MEDIR = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const visible = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const nombre = (e) => { const t = (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 50); const c = typeof e.className === 'string' ? e.className.split(' ')[0] : ''; return e.tagName.toLowerCase() + (c ? '.' + c : '') + (t ? ' «' + t + '»' : ''); };
  const tocables = [...document.querySelectorAll('button, a[href], [role=button], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(visible);
  const fijos = [...document.querySelectorAll('body *')].filter((e) => { const p = getComputedStyle(e).position; return (p === 'fixed' || p === 'absolute') && visible(e) && e.children.length < 12 && (e.textContent || '').trim().length > 0; });
  const caja = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
  const fuera = [];
  for (const e of new Set([...tocables, ...fijos])) { const b = caja(e); if (b.x < -1 || b.y < -1 || b.x + b.w > vw + 1 || b.y + b.h > vh + 1) fuera.push({ que: nombre(e), caja: b }); }
  const pisados = [];
  for (let i = 0; i < tocables.length; i++) for (let j = i + 1; j < tocables.length; j++) {
    const a = tocables[i], b = tocables[j]; if (a.contains(b) || b.contains(a)) continue;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 4 && h > 4) {
      /* ¿Se ve el de abajo? Si en el centro de la zona común el que manda es otro, uno tapa al otro. */
      const cx = Math.max(ra.left, rb.left) + w / 2, cy = Math.max(ra.top, rb.top) + h / 2; const arriba = document.elementFromPoint(cx, cy);
      pisados.push({ a: nombre(a), b: nombre(b), zona: Math.round(w) + 'x' + Math.round(h), manda: arriba ? nombre(arriba) : null });
    }
  }
  const chicos = matchMedia('(pointer: coarse)').matches ? tocables.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 && r.height < 44 && r.width > 0; }).map((e) => ({ que: nombre(e), caja: caja(e) })) : [];
  const cortados = [...document.querySelectorAll('body *')].filter((e) => visible(e) && e.children.length === 0 && (e.textContent || '').trim().length > 2 && (e.scrollWidth > e.clientWidth + 2) && getComputedStyle(e).overflow !== 'visible').map((e) => ({ que: nombre(e), caja: caja(e) })).slice(0, 30);
  const lienzos = [...document.querySelectorAll('canvas')].filter(visible).map((c) => ({ caja: caja(c) }));
  return { viewport: { ancho: vw, alto: vh, dpr: devicePixelRatio, grueso: matchMedia('(pointer: coarse)').matches, toques: navigator.maxTouchPoints }, scroll: { ancho: document.documentElement.scrollWidth, alto: document.documentElement.scrollHeight }, lienzos, fuera: fuera.slice(0, 40), pisados: pisados.slice(0, 40), chicos: chicos.slice(0, 40), cortados };
})()`;

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function versionDe(puerto) {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${puerto}/json/version`);
      if (r.ok) return await r.json();
    } catch {
      /* todavía arrancando */
    }
    await esperar(250);
  }
  throw new Error(`Edge no abrió la depuración en ${puerto}`);
}

/** Un cliente CDP mínimo sobre `ws`, con sesiones planas. */
function cliente(url) {
  const ws = new WebSocket(url, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
  let n = 0;
  const pendientes = new Map();
  const oyentes = [];
  ws.on('message', (d) => {
    const m = JSON.parse(String(d));
    if (m.id && pendientes.has(m.id)) {
      const { ok, ko } = pendientes.get(m.id);
      pendientes.delete(m.id);
      if (m.error) ko(new Error(`${m.error.message} ${m.error.data ?? ''}`));
      else ok(m.result);
    } else for (const o of oyentes) o(m);
  });
  const listo = new Promise((ok, ko) => {
    ws.once('open', ok);
    ws.once('error', ko);
  });
  return {
    listo,
    oir: (f) => oyentes.push(f),
    mandar: (method, params = {}, sessionId) =>
      new Promise((ok, ko) => {
        const id = ++n;
        pendientes.set(id, { ok, ko });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      }),
    cerrar: () => ws.close(),
  };
}

async function main() {
  const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  if (!/^https?:\/\/[^/]+:\d+/.test(plan.url)) throw new Error('La url tiene que llevar el puerto explícito: un puerto por defecto fotografía otro worktree.');
  const nombres = plan.tamanos === 'todos' || plan.tamanos === undefined ? Object.keys(TAMANOS) : plan.tamanos;
  for (const t of nombres) if (!TAMANOS[t]) throw new Error(`No conozco el tamaño «${t}». Hay: ${Object.keys(TAMANOS).join(', ')}`);
  mkdirSync(plan.salida, { recursive: true });
  const puerto = plan.puerto ?? 9333;
  const perfil = plan.perfil ?? path.join(plan.salida, '.perfil-edge');
  const edge = spawn(
    EDGE,
    [
      '--headless=new',
      `--remote-debugging-port=${puerto}`,
      `--user-data-dir=${perfil}`,
      '--disable-gpu-sandbox',
      '--use-angle=d3d11',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1920,1080',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  const informe = { url: plan.url, cuando: new Date().toISOString(), aparatos: {} };
  try {
    const v = await versionDe(puerto);
    const cdp = cliente(v.webSocketDebuggerUrl);
    await cdp.listo;
    const origen = new URL(plan.url).origin;
    for (const t of nombres) {
      const a = TAMANOS[t];
      const { targetId } = await cdp.mandar('Target.createTarget', { url: 'about:blank' });
      const { sessionId: s } = await cdp.mandar('Target.attachToTarget', { targetId, flatten: true });
      const errores = [];
      cdp.oir((m) => {
        if (m.sessionId !== s) return;
        if (m.method === 'Runtime.exceptionThrown') errores.push(String(m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text).slice(0, 300));
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errores.push(m.params.args.map((x) => x.value ?? x.description ?? '').join(' ').slice(0, 300));
      });
      await cdp.mandar('Page.enable', {}, s);
      await cdp.mandar('Runtime.enable', {}, s);
      await cdp.mandar(
        'Emulation.setDeviceMetricsOverride',
        {
          width: a.ancho,
          height: a.alto,
          deviceScaleFactor: a.dpr,
          mobile: a.movil,
          screenWidth: a.ancho,
          screenHeight: a.alto,
          screenOrientation: a.ancho > a.alto ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
        },
        s,
      );
      if (a.movil) await cdp.mandar('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, s);
      if (a.ua) await cdp.mandar('Emulation.setUserAgentOverride', { userAgent: a.ua, platform: a.ua.includes('iPhone') ? 'iPhone' : 'Linux armv8l' }, s);
      /* El almacén, sólo en el origen de la url y antes de que corra ningún guion de la página. */
      if (plan.almacen) {
        const dentro = Object.entries(plan.almacen)
          .map(([k, val]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(val)});`)
          .join('');
        await cdp.mandar('Page.addScriptToEvaluateOnNewDocument', { source: `if (location.origin === ${JSON.stringify(origen)}) { try { ${dentro} } catch (e) {} }` }, s);
      }
      await cdp.mandar('Page.navigate', { url: plan.url }, s);
      await esperar(plan.esperaMs ?? 10000);
      let antes = null;
      if (plan.antes) {
        const r = await cdp.mandar('Runtime.evaluate', { expression: `(async () => { ${plan.antes} })()`, awaitPromise: true, returnByValue: true }, s);
        antes = r.exceptionDetails ? `FALLÓ: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}` : r.result.value ?? null;
        await esperar(plan.despuesMs ?? 3000);
      }
      const medido = (await cdp.mandar('Runtime.evaluate', { expression: MEDIR, returnByValue: true }, s)).result.value;
      const foto = await cdp.mandar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, s);
      const archivo = path.join(plan.salida, `${t}.png`);
      writeFileSync(archivo, Buffer.from(foto.data, 'base64'));
      const cuadra = medido.viewport.ancho === a.ancho && medido.viewport.alto === a.alto;
      informe.aparatos[t] = { pedido: `${a.ancho}x${a.alto}`, cuadra, foto: archivo, antes, errores: errores.slice(0, 10), ...medido };
      console.log(
        `${t.padEnd(16)} ${cuadra ? 'ok' : 'VIEWPORT NO CUADRA'} ${medido.viewport.ancho}x${medido.viewport.alto} · fuera ${medido.fuera.length} · pisados ${medido.pisados.length} · chicos ${medido.chicos.length} · cortados ${medido.cortados.length} · errores ${errores.length}${antes ? ' · antes: ' + JSON.stringify(antes).slice(0, 80) : ''}`,
      );
      await cdp.mandar('Target.closeTarget', { targetId });
    }
    cdp.cerrar();
  } finally {
    edge.kill();
    writeFileSync(path.join(plan.salida, 'informe.json'), JSON.stringify(informe, null, 2));
    if (!plan.perfil) {
      await esperar(800);
      try {
        rmSync(perfil, { recursive: true, force: true });
      } catch {
        /* Edge aún suelta el perfil; se queda */
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
