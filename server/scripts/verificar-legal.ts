/**
 * Los documentos públicos: privacidad, aviso legal y términos de uso.
 *
 *   npm run verify:legal
 *
 * QUÉ VIGILA ESTO. Tres cosas que se rompen solas y en silencio:
 *
 *   1. QUE SE LEAN SIN CONTRASEÑA. Los tres van montados por DELANTE del
 *      guardián de la casa, porque las tiendas los exigen accesibles sin
 *      instalar nada y la LSSI exige que el aviso legal sea de acceso libre. El
 *      día que alguien mueva una línea en `index.ts` y caigan detrás del
 *      guardián, la web seguirá funcionando perfectamente para quien ya ha
 *      entrado —es decir, para todo el que la prueba— y el fallo lo descubrirá
 *      una tienda, semanas después, rechazando la revisión.
 *
 *   2. QUE NO ARRASTREN NADA CONSIGO. Es el riesgo real de montar algo delante
 *      de la única puerta que hay. Por eso, en el mismo servidor que acaba de
 *      servir los documentos, se comprueba que `/api/games` sigue contestando
 *      401 y que las fotos de los invitados siguen cerradas.
 *
 *   3. QUE EL TEXTO NO SE QUEDE ATRÁS DEL CÓDIGO. Esta es la parte que de
 *      verdad justifica el fichero. La política de privacidad estuvo meses
 *      diciendo «solo dos proveedores» encima de una lista de tres, sin nombrar
 *      a Google ni a Apple aunque el servidor ya les mandaba testigos de
 *      identidad, y sin mencionar ninguna de las tres cookies que reparte.
 *      Ninguna prueba de las que había podía notarlo, porque todas miraban
 *      funciones y esto es prosa. Así que aquí la lista de terceros y la de
 *      cookies se sacan LEYENDO EL CÓDIGO —no de una constante escrita en esta
 *      prueba, que solo sería un segundo sitio donde equivocarse— y se exige que
 *      el documento las nombre una por una. Conectar un proveedor nuevo pone
 *      esto en rojo antes de que llegue a producción.
 *
 * AISLAMIENTO. Proceso aparte, cwd temporal y entorno explícito y enumerado. Sin
 * esto, `dotenv` cargaría el `.env` de la casa y la prueba hablaría con el Atlas
 * de producción y con la clave de Anthropic de verdad.
 *
 * EL BANCO. Mientras `index.ts` no monte el router de `legal/documentos` —lo
 * integra otra persona—, los dos documentos nuevos no existen en el servidor de
 * verdad. Para no dejar de probarlos hasta entonces, se levanta un segundo
 * proceso con la MISMA disposición que se pide integrar: el router legal
 * delante, el guardián detrás. Y en cuanto `index.ts` los monte, esta prueba lo
 * detecta sola y se los exige también al servidor de verdad.
 */
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVIDOR = path.join(REPO, 'server', 'src', 'index.ts');
const FUENTES = path.join(REPO, 'server', 'src');
const CONTRASENA = 'la-contrasena-de-la-casa';
const SECRETO = 'secreto-de-prueba-de-legal-0123456789abcdef';

let hechas = 0;
const fallos: string[] = [];
const avisos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

type Respuesta = { estado: number; cuerpo: string; cabeceras: Headers };

async function pedir(puerto: number, ruta: string, init?: RequestInit): Promise<Respuesta> {
  const r = await fetch(`http://127.0.0.1:${puerto}${ruta}`, { redirect: 'manual', ...init });
  return { estado: r.status, cuerpo: await r.text(), cabeceras: r.headers };
}

async function esperar(puerto: number): Promise<void> {
  for (let intento = 0; intento < 80; intento++) {
    try {
      await fetch(`http://127.0.0.1:${puerto}/privacidad`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`el servidor del puerto ${puerto} no llegó a responder`);
}

/** Todo el código del servidor MENOS los propios documentos legales. */
function ficherosDelServidor(): Array<{ ruta: string; texto: string }> {
  const encontrados: Array<{ ruta: string; texto: string }> = [];
  const recorrer = (dir: string): void => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completa = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(completa);
      } else if (entrada.name.endsWith('.ts')) {
        encontrados.push({
          ruta: path.relative(REPO, completa).replace(/\\/g, '/'),
          texto: fs.readFileSync(completa, 'utf8'),
        });
      }
    }
  };
  recorrer(FUENTES);
  /*
   * Se excluye `src/legal` a propósito: si los documentos entraran en el barrido,
   * el texto que menciona una cookie valdría como prueba de que esa cookie
   * existe. La lista tiene que salir del código que TRATA los datos, nunca del
   * que los cuenta.
   */
  return encontrados.filter((f) => !f.ruta.startsWith('server/src/legal/'));
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-legal-'));
const procesos: ChildProcess[] = [];

/** Levanta el servidor de verdad (`src/index.ts`) con contraseña puesta. */
function arrancarServidorReal(sub: string, puerto: number): ChildProcess {
  const cwd = path.join(dir, sub);
  fs.mkdirSync(path.join(cwd, 'data'), { recursive: true });
  const proceso = spawn(process.execPath, [TSX, SERVIDOR], {
    cwd,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(puerto),
      NODE_ENV: 'test',
      APP_PASSWORD: CONTRASENA,
      PLAYER_TOKEN_SECRET: SECRETO,
      CLIENT_DIR: path.join(cwd, 'cliente'),
      UPLOADS_DIR: path.join(cwd, 'uploads'),
    },
    stdio: 'ignore',
  });
  procesos.push(proceso);
  return proceso;
}

/**
 * Levanta el banco: el router legal montado como se pide integrarlo.
 *
 * El fichero se escribe en la carpeta temporal, así que no puede importar
 * `express` por su nombre —ahí no hay `node_modules` que valga— y se le da la
 * ruta ya resuelta. Los módulos del repositorio sí se importan por su ruta
 * absoluta: como viven dentro del repositorio, sus propias dependencias se
 * resuelven solas desde donde están.
 */
function arrancarBanco(sub: string, puerto: number, legales: Record<string, string>): ChildProcess {
  const cwd = path.join(dir, sub);
  fs.mkdirSync(path.join(cwd, 'data'), { recursive: true });

  const require = createRequire(import.meta.url);
  const url = (p: string): string => pathToFileURL(p).href;
  const banco = `
import express from '${url(require.resolve('express'))}';
import legalRouter from '${url(path.join(FUENTES, 'legal', 'documentos.ts'))}';
import { requireAuth } from '${url(path.join(FUENTES, 'auth.ts'))}';

const app = express();
app.set('trust proxy', 1);
// El orden es el que se pide integrar: los documentos delante del guardián.
app.use(legalRouter);
app.use('/api', requireAuth);
app.get('/api/games', (_req, res) => { res.json({ culpable: 'el mayordomo' }); });
app.listen(Number(process.env.PORT), '127.0.0.1');
`;
  const fichero = path.join(cwd, 'banco.ts');
  fs.writeFileSync(fichero, banco, 'utf8');

  const proceso = spawn(process.execPath, [TSX, fichero], {
    cwd,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      PORT: String(puerto),
      NODE_ENV: 'test',
      APP_PASSWORD: CONTRASENA,
      PLAYER_TOKEN_SECRET: SECRETO,
      ...legales,
    },
    stdio: 'ignore',
  });
  procesos.push(proceso);
  return proceso;
}

/** Las tres direcciones, y cómo se reconoce cada documento por dentro. */
const DOCUMENTOS = [
  { ruta: '/privacidad', alias: '/privacidad.html', titulo: 'Política de privacidad' },
  { ruta: '/aviso-legal', alias: '/aviso-legal.html', titulo: 'Aviso legal' },
  { ruta: '/terminos', alias: '/terminos.html', titulo: 'Términos de uso' },
];

try {
  const ficheros = ficherosDelServidor();

  // -------------------------------------------------------------------------
  paso('El servidor de verdad: los documentos se leen sin contraseña');
  // -------------------------------------------------------------------------
  arrancarServidorReal('real', 5895);
  await esperar(5895);

  const privacidad = await pedir(5895, '/privacidad');
  comprobar('la política de privacidad responde 200 sin credenciales', privacidad.estado === 200, privacidad.estado);
  comprobar(
    'y como HTML, no como descarga',
    (privacidad.cabeceras.get('content-type') ?? '').includes('text/html'),
    privacidad.cabeceras.get('content-type'),
  );
  /*
   * Un documento legal no tiene por qué poner una cookie a nadie, y ponerla
   * tendría consecuencias: sería una cookie servida ANTES de que exista ninguna
   * relación con quien la lee, en la única página que se puede visitar sin
   * aceptar nada.
   */
  comprobar(
    'y no reparte ninguna cookie: se lee sin dejar rastro',
    privacidad.cabeceras.get('set-cookie') === null,
    privacidad.cabeceras.get('set-cookie'),
  );

  /*
   * LA COMPROBACIÓN QUE MÁS IMPORTA DE ESTA SECCIÓN. Estas rutas van delante del
   * guardián, y el riesgo de montar algo delante del guardián es que se lleve el
   * resto por delante.
   */
  const taller = await pedir(5895, '/api/games');
  comprobar('y el taller sigue pidiendo credenciales', taller.estado === 401, taller.estado);
  const fotos = await pedir(5895, '/uploads/');
  comprobar('y las fotos de los invitados siguen cerradas', fotos.estado === 401, fotos.estado);

  /*
   * Los dos documentos nuevos los monta otra persona en `index.ts`. Mientras no
   * estén, se avisa; en cuanto estén, se exigen aquí también sin tocar nada.
   */
  const indexTs = fs.readFileSync(SERVIDOR, 'utf8');
  const yaIntegrado = indexTs.includes('legal/documentos');
  if (yaIntegrado) {
    for (const doc of DOCUMENTOS) {
      const r = await pedir(5895, doc.ruta);
      comprobar(`el servidor de verdad sirve ${doc.ruta}`, r.estado === 200, r.estado);
      comprobar(`y es el documento esperado (${doc.titulo})`, r.cuerpo.includes(doc.titulo), doc.ruta);
    }
  } else {
    avisos.push(
      'index.ts todavía no monta `legal/documentos`: el aviso legal y los términos se han probado ' +
        'en el banco, no en el servidor de verdad. Añade la línea que dice el informe.',
    );
  }

  // -------------------------------------------------------------------------
  paso('Los tres documentos, montados como se pide integrarlos');
  // -------------------------------------------------------------------------
  arrancarBanco('banco', 5896, {});
  await esperar(5896);

  const paginas = new Map<string, string>();
  for (const doc of DOCUMENTOS) {
    const r = await pedir(5896, doc.ruta);
    comprobar(`${doc.ruta} responde 200 sin credenciales`, r.estado === 200, r.estado);
    comprobar(
      `${doc.ruta} llega como HTML`,
      (r.cabeceras.get('content-type') ?? '').includes('text/html'),
      r.cabeceras.get('content-type'),
    );
    comprobar(`${doc.ruta} es el documento que dice ser`, r.cuerpo.includes(doc.titulo), doc.ruta);
    comprobar(`${doc.ruta} no pone cookies`, r.cabeceras.get('set-cookie') === null, doc.ruta);
    paginas.set(doc.ruta, r.cuerpo);

    // La dirección que se pega en la consola de una tienda a veces trae `.html`.
    const conExtension = await pedir(5896, doc.alias);
    comprobar(`${doc.alias} lleva al mismo sitio`, conExtension.estado === 200, conExtension.estado);
  }

  /*
   * Que se enlacen entre sí no es cortesía: las tiendas piden la privacidad y
   * los términos por separado, y quien llega a uno de los tres —desde la ficha
   * de la app, desde un correo de invitación— tiene que poder llegar al resto sin
   * adivinar la dirección.
   *
   * SE EXIGE LA BRÚJULA DE LA CABECERA, y no vale con que el enlace aparezca en
   * alguna parte del texto. Esta comprobación nació débil: los tres documentos
   * se citan de pasada dentro de la prosa, así que quitar la cabecera entera
   * —que es lo que garantiza el camino desde CUALQUIERA de los tres hacia los
   * otros dos— la dejaba en verde. Un enlace suelto en el párrafo undécimo de
   * los términos no es un camino: es una casualidad que la siguiente reescritura
   * del texto se lleva por delante.
   */
  for (const doc of DOCUMENTOS) {
    const pagina = paginas.get(doc.ruta) ?? '';
    comprobar(`${doc.ruta} lleva la cabecera con los tres documentos`, pagina.includes('class="brujula"'), doc.ruta);
    const cabecera = pagina.slice(pagina.indexOf('class="brujula"'), pagina.indexOf('</nav>'));
    for (const otro of DOCUMENTOS.filter((d) => d.ruta !== doc.ruta)) {
      comprobar(
        `${doc.ruta} enlaza a ${otro.ruta} desde la cabecera`,
        cabecera.includes(`href="${otro.ruta}"`),
        { documento: doc.ruta, cabecera: cabecera.slice(0, 200) },
      );
    }
  }

  const tallerDelBanco = await pedir(5896, '/api/games');
  comprobar(
    'y con los tres montados delante, el guardián sigue cerrado',
    tallerDelBanco.estado === 401,
    tallerDelBanco,
  );
  comprobar(
    'de verdad cerrado: no se ha colado la respuesta protegida',
    !tallerDelBanco.cuerpo.includes('mayordomo'),
    tallerDelBanco.cuerpo.slice(0, 120),
  );

  // -------------------------------------------------------------------------
  paso('Los terceros del documento son los terceros del código');
  // -------------------------------------------------------------------------
  /*
   * Cada fila dice: dónde se ve en el código que ese tercero recibe algo, y qué
   * tiene que decir el documento sobre él. Las dos mitades se comprueban. Si un
   * proveedor desaparece del código, esto también salta: un documento que
   * enumera terceros que ya no existen tampoco es cierto.
   */
  const privacidadHtml = paginas.get('/privacidad') ?? '';
  const TERCEROS: Array<{ quien: string; señal: string; enElCodigo: string; enElTexto: string[] }> = [
    {
      quien: 'Anthropic (el modelo que escribe la trama y el Mayordomo)',
      señal: '@anthropic-ai/sdk',
      enElCodigo: 'server/src/agent/anthropic.ts',
      enElTexto: ['Anthropic'],
    },
    {
      quien: 'Tripo (esculpe el avatar 3D desde la foto)',
      señal: 'api.tripo3d.ai',
      enElCodigo: 'server/src/ia/tripo.ts',
      enElTexto: ['Tripo', 'tripo3d.ai'],
    },
    {
      quien: 'Google, generando los fondos de sala con Gemini',
      señal: 'generativelanguage.googleapis.com',
      enElCodigo: 'server/src/ia/fondos.ts',
      enElTexto: ['Gemini'],
    },
    {
      quien: 'Google, como proveedor de identidad',
      señal: 'accounts.google.com',
      enElCodigo: 'server/src/identidad/oidc.ts',
      enElTexto: ['entrar con Google'],
    },
    {
      quien: 'Apple, como proveedor de identidad',
      señal: 'appleid.apple.com',
      enElCodigo: 'server/src/identidad/oidc.ts',
      enElTexto: ['Apple', 'entrar con Apple'],
    },
    {
      quien: 'Google, sirviendo las tipografías de los dosieres',
      señal: 'fonts.googleapis.com',
      enElCodigo: 'server/src/docs/estilos.ts',
      enElTexto: ['tipografías'],
    },
    {
      quien: 'MongoDB Atlas, donde se guarda todo',
      señal: 'mongoose',
      enElCodigo: 'server/src/db/store.ts',
      enElTexto: ['MongoDB'],
    },
  ];

  for (const tercero of TERCEROS) {
    const fichero = ficheros.find((f) => f.ruta === tercero.enElCodigo);
    comprobar(`${tercero.enElCodigo} existe`, fichero !== undefined, tercero.enElCodigo);
    comprobar(
      `el código sigue usando a ${tercero.quien}`,
      fichero?.texto.includes(tercero.señal) === true,
      { busca: tercero.señal, en: tercero.enElCodigo },
    );
    for (const texto of tercero.enElTexto) {
      comprobar(
        `y la política de privacidad lo dice: «${texto}» — ${tercero.quien}`,
        privacidadHtml.includes(texto),
        { falta: texto },
      );
    }
  }

  /*
   * El alojamiento no deja huella en `server/src` —no se llama a AWS desde
   * ninguna línea de código— así que la prueba de que está se busca donde de
   * verdad vive: en las instrucciones de despliegue.
   */
  const despliegue = fs.readFileSync(path.join(REPO, 'despliegue', 'LEEME.md'), 'utf8');
  comprobar('el servidor se despliega en una EC2, según despliegue/LEEME.md', despliegue.includes('EC2'));
  comprobar(
    'y la política de privacidad nombra a quien lo aloja',
    privacidadHtml.includes('Amazon Web Services'),
    'falta el proveedor de alojamiento',
  );

  /*
   * El recuento del texto. Es literalmente el fallo que motivó esta prueba: la
   * lista decía «solo dos proveedores» y tenía tres elementos debajo, y más
   * tarde seis. Un número escrito a mano en una prosa que crece es una mentira
   * a plazo fijo.
   */
  comprobar(
    'y ya no queda ningún recuento a mano contradiciendo la lista',
    !/[Ss]olo dos proveedores|Ambos pueden tratar/.test(privacidadHtml),
    'la política sigue diciendo «solo dos proveedores» o «Ambos» sobre una lista más larga',
  );

  // -------------------------------------------------------------------------
  paso('Las cookies del documento son las cookies del código');
  // -------------------------------------------------------------------------
  /*
   * La lista sale de los literales del código, no de una constante escrita aquí.
   * Añadir una cuarta cookie sin contarla en el documento pone esto en rojo, que
   * es exactamente lo que no ocurrió las tres veces anteriores.
   */
  const cookies = new Set<string>();
  for (const fichero of ficheros) {
    for (const encontrada of fichero.texto.matchAll(/'(gm_[a-z_]+)'/g)) {
      cookies.add(encontrada[1]);
    }
  }
  comprobar('el código reparte exactamente tres cookies', cookies.size === 3, [...cookies]);
  for (const cookie of cookies) {
    comprobar(
      `la política de privacidad nombra la cookie ${cookie}`,
      privacidadHtml.includes(cookie),
      cookie,
    );
  }
  for (const duracion of ['30 días', '90 días', '5 minutos']) {
    comprobar(`y dice cuánto dura cada una: ${duracion}`, privacidadHtml.includes(duracion), duracion);
  }

  // -------------------------------------------------------------------------
  paso('Lo que falta se dice, y lo que se configura aparece');
  // -------------------------------------------------------------------------
  /*
   * Sin los datos del responsable, el documento tiene que DECIRLO. La
   * alternativa —el hueco en blanco— produce un aviso legal que parece completo,
   * y quien lo publica no descubre que le falta el NIF hasta que se lo dice una
   * tienda con la revisión rechazada. Y un dato inventado sería peor todavía.
   *
   * SE MIRA LA FILA, NO LA PÁGINA, y esto costó una comprobación mal escrita:
   * buscar «pendiente de completar» en cualquier parte del documento seguía
   * dando verde con los huecos vacíos, porque el aviso de arriba menciona esas
   * mismas palabras al explicar qué significan. Lo que hay que ver es el dato
   * concreto marcado como ausente, dentro de su fila de la ficha.
   */
  const HUECO_MARCADO = '<dd><span class="pendiente">pendiente de completar</span></dd>';
  const avisoLegalSinDatos = paginas.get('/aviso-legal') ?? '';
  /*
   * EL AVISO LO LLEVA EL AVISO LEGAL, Y SOLO ÉL. No es un matiz de estilo:
   *
   *   · El aviso legal existe para publicar el NIF y el domicilio (artículo 10
   *     de la LSSI). Sin ellos está incompleto de verdad, y callarlo sería
   *     esconderlo.
   *   · La política de privacidad no publica esos datos. El RGPD (artículo 13)
   *     le pide la identidad del responsable y una vía de contacto, y las dos
   *     están. Encabezarla con «este documento está incompleto» le cuelga un
   *     defecto que no tiene — y quien lo leería es justamente quien revisa la
   *     app para la tienda, porque la ficha apunta a esa dirección.
   *
   * La primera versión de esta comprobación exigía el aviso en los TRES, así que
   * daba por bueno el fallo en vez de cazarlo.
   */
  comprobar(
    'sin NIF ni domicilio, el AVISO LEGAL lo dice',
    avisoLegalSinDatos.includes('pendiente de completar'),
    '/aviso-legal',
  );
  /*
   * Se busca el ELEMENTO PINTADO, no la clase suelta. Los estilos son
   * compartidos, así que `.aviso-incompleto` y `.pendiente` aparecen dentro del
   * <style> de las TRES páginas aunque el aviso no se pinte en ninguna: mirar
   * la clase a secas hacía fallar la comprobación con el código correcto, que
   * es la forma más rápida de que alguien la borre por molesta.
   */
  for (const ruta of ['/privacidad', '/terminos']) {
    const pagina = paginas.get(ruta) ?? '';
    comprobar(
      `pero ${ruta} NO se anuncia como incompleto: esos datos no le tocan`,
      !pagina.includes('<p class="aviso-incompleto"') && !pagina.includes(HUECO_MARCADO),
      ruta,
    );
  }
  comprobar(
    'y la privacidad sigue publicando quién responde y cómo escribirle',
    (paginas.get('/privacidad') ?? '').includes('mailto:'),
    'la política de privacidad se ha quedado sin vía de contacto',
  );
  comprobar(
    'y los dos datos que faltan —NIF y domicilio— salen marcados en su fila, no en blanco',
    avisoLegalSinDatos.split(HUECO_MARCADO).length - 1 === 2,
    avisoLegalSinDatos.slice(avisoLegalSinDatos.indexOf('<dl>'), 600),
  );
  comprobar(
    'el aviso legal avisa, arriba y de forma visible, de que está incompleto',
    avisoLegalSinDatos.includes('class="aviso-incompleto"'),
    'no hay aviso de documento incompleto',
  );
  comprobar(
    'y dice qué variables lo arreglan, para quien administra el servidor',
    avisoLegalSinDatos.includes('LEGAL_NIF') && avisoLegalSinDatos.includes('LEGAL_DIRECCION'),
    'el aviso no dice cómo completarlo',
  );

  /*
   * Y con los datos puestos, el documento los enseña y deja de quejarse. Se
   * incluye una razón social con `&` y unas comillas dentro a propósito: son
   * caracteres perfectamente legítimos en un nombre —«Peidro & hijos»— que sin
   * escapar rompen la página, y quien rellena el fichero de entorno está
   * configurando un servidor, no escribiendo HTML.
   */
  arrancarBanco('completo', 5897, {
    LEGAL_RESPONSABLE: 'Misterios & Veladas "Harkania" S.L.',
    LEGAL_NIF: 'B00000000',
    LEGAL_DIRECCION: 'Calle de la Sospecha 13, 46001 Valencia',
    LEGAL_CORREO: 'legal@harkania.com',
  });
  await esperar(5897);

  for (const doc of DOCUMENTOS) {
    const r = await pedir(5897, doc.ruta);
    comprobar(`con los datos puestos, ${doc.ruta} ya no dice que falte nada`, !r.cuerpo.includes('pendiente de completar'), doc.ruta);
    comprobar(`y ${doc.ruta} usa el correo configurado`, r.cuerpo.includes('legal@harkania.com'), doc.ruta);
  }

  const avisoCompleto = await pedir(5897, '/aviso-legal');
  comprobar('el aviso legal enseña el NIF configurado', avisoCompleto.cuerpo.includes('B00000000'), 'falta el NIF');
  comprobar(
    'y el domicilio',
    avisoCompleto.cuerpo.includes('Calle de la Sospecha 13'),
    'falta el domicilio',
  );
  comprobar(
    'y ya no lleva el aviso de documento incompleto',
    !avisoCompleto.cuerpo.includes('class="aviso-incompleto"'),
    'sigue avisando de que falta algo',
  );
  /*
   * El escapado se comprueba EN NEGATIVO, y por un motivo que costó descubrir:
   * el nombre del responsable se imprime en dos sitios —la ficha y el pie— y
   * cada uno lo escapa por su cuenta. Buscar la versión escapada en la página
   * entera daba verde aunque la ficha imprimiera el nombre en crudo, porque el
   * pie seguía haciéndolo bien. Lo que no puede aparecer NUNCA, en ninguna parte
   * del documento, es el texto sin escapar.
   */
  const RAZON_SOCIAL = 'Misterios & Veladas "Harkania" S.L.';
  comprobar(
    'la razón social con «&» y comillas se imprime escapada en la ficha',
    avisoCompleto.cuerpo.includes('<dd>Misterios &amp; Veladas &quot;Harkania&quot; S.L.</dd>'),
    avisoCompleto.cuerpo.slice(avisoCompleto.cuerpo.indexOf('<dl>'), 400),
  );
  for (const doc of DOCUMENTOS) {
    const r = await pedir(5897, doc.ruta);
    comprobar(
      `y ${doc.ruta} no la imprime en crudo en ningún sitio`,
      !r.cuerpo.includes(RAZON_SOCIAL),
      doc.ruta,
    );
  }
} catch (e) {
  fallos.push(`la prueba se cayó: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  for (const proceso of procesos) proceso.kill();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* carpeta temporal: no merece tumbar la prueba */
  }
}

console.log('');
for (const aviso of avisos) console.log(`   ⚠ ${aviso}`);
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. Los tres documentos se leen en abierto y dicen la verdad.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
