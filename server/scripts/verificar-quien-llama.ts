/**
 * ¿SABE EL LIMITADOR DE QUIÉN HABLA?
 *
 *   npm run verify:quien-llama
 *
 * ═══ EL FALLO QUE ESTE GUIÓN EXISTE PARA CAZAR ═══
 *
 * `verify:limitador` comprueba que la puerta FRENA. Lo que nadie comprobaba es que sepa A
 * QUIÉN frena, y estaba mal: en producción, dos personas distintas entraban con la misma
 * dirección y `fiable: true`, así que compartían cubo y se bloqueaban entre ellas. Un
 * limitador que no distingue a nadie no es media protección: es un arma apuntando a la casa,
 * que es lo que `limitador.ts` lleva escrito desde el principio.
 *
 * Dos cosas lo causaban, y NINGUNA DE LAS DOS SOLA BASTA PARA ARREGLARLO:
 *
 *   1. `procedenciaDe` cogía `req.ips[req.ips.length - 1]`. En Express esa lista va EN EL
 *      ORDEN DE LA CABECERA —el primero es el cliente y el último el proxy más cercano—, así
 *      que cogía el balanceador. Con UN salto delante el primero y el último son el mismo, y
 *      por eso el fallo no se veía en casa.
 *   2. `app.set('trust proxy', 1)` estaba escrito a mano y producción tiene DOS saltos
 *      (`Server: cloudflare` + `x-render-origin-server: Render`, medido en las cabeceras).
 *      Con el número corto, Express tira al cliente de la lista y entonces el primero YA ES
 *      el balanceador.
 *
 * ═══ POR QUÉ ESTO MONTA UN EXPRESS DE VERDAD ═══
 *
 * Porque lo que falla es precisamente CÓMO EXPRESS CALCULA `req.ips` a partir de la cabecera
 * y del número de saltos. Un `req` de mentira con la lista escrita a mano —que es como está
 * hecho `verificar-limitador.ts`, y con razón para lo suyo— afirmaría sobre la lista que
 * escribió el propio comprobador: verde siempre, sin vigilar nada.
 *
 * El modo se fija ANTES de importar nada del servidor, porque `config.ts` lee el entorno al
 * cargarse y después ya no hay quien lo cambie.
 */
process.env.PROXY_DE_CONFIANZA = 'plataforma';
process.env.SALTOS_DE_CONFIANZA = '2';

import express from 'express';
import type { Request } from 'express';

const { procedenciaDe } = await import('../src/puerta/limitador');
const { env, leerSaltosDeConfianza, TOPE_DE_SALTOS } = await import('../src/config');

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : ` — ${JSON.stringify(detalle)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Lo que el servidor cree de una petición, sacado de un Express de verdad. */
interface LoQueSeVe {
  readonly ips: readonly string[];
  readonly procedencia: string;
  readonly fiable: boolean;
  /** Lo que devolvía la regla de antes, para poder afirmar que ésta muerde. */
  readonly comoAntes: string;
}

/**
 * Levanta un Express con los saltos que se le digan, le manda cada cabecera y devuelve lo
 * que el servidor vio. Un servidor por tanda, y se cierra al acabar.
 */
async function loQueVeElServidor(
  saltos: number,
  cabeceras: readonly (string | undefined)[],
): Promise<LoQueSeVe[]> {
  const app = express();
  app.set('trust proxy', saltos);
  const visto: LoQueSeVe[] = [];
  app.get('/', (req: Request, res) => {
    const ips = [...req.ips];
    const p = procedenciaDe(req);
    visto.push({
      ips,
      procedencia: p.ip,
      fiable: p.fiable,
      comoAntes: ips.length > 0 ? (ips[ips.length - 1] ?? '') : '',
    });
    res.json({ ok: true });
  });
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise<void>((listo) => {
    servidor.on('listening', () => {
      listo();
    });
  });
  const dir = servidor.address();
  const puerto = typeof dir === 'object' && dir !== null ? dir.port : 0;
  for (const xff of cabeceras) {
    await fetch(`http://127.0.0.1:${String(puerto)}/`, {
      headers: xff === undefined ? {} : { 'X-Forwarded-For': xff },
    });
  }
  await new Promise<void>((cerrado) => {
    servidor.close(() => {
      cerrado();
    });
  });
  return visto;
}

/* Dos personas detrás del MISMO borde de Cloudflare, que es el caso de producción. */
const ANA = '203.0.113.7';
const BRUNO = '198.51.100.22';
const BORDE = '172.71.0.9';

paso('Y que esto habla de la rama que corre en Render, no de otra');
{
  /*
   * Poner `process.env.PROXY_DE_CONFIANZA` arriba no demuestra nada por si solo: con un peer
   * de bucle local —que es lo que hay en un arnes— la rama de `loopback` acaba mirando
   * `req.ips` igual, asi que el mismo caso sale identico en los dos modos y el comprobador no
   * sabria por donde ha pasado. Se afirma el modo, que es lo unico que lo distingue.
   */
  comprobar('el comprobador corre en el modo de la plataforma, que es el de produccion', env.proxyDeConfianza === 'plataforma', {
    modo: env.proxyDeConfianza,
  });
  comprobar('y con los saltos que declara este arnes', env.saltosDeConfianza === 2, {
    saltos: env.saltosDeConfianza,
  });
}

paso('Dos personas detrás del mismo balanceador no comparten cubo');
{
  const visto = await loQueVeElServidor(2, [`${ANA}, ${BORDE}`, `${BRUNO}, ${BORDE}`]);
  const [deAna, deBruno] = visto;

  comprobar('el arnés ha hecho las dos peticiones y el servidor las ha visto', visto.length === 2, {
    vistas: visto.length,
  });
  if (deAna === undefined || deBruno === undefined) {
    console.log('  (sin peticiones que juzgar: lo que sigue no se ha podido comprobar)');
  } else {
    comprobar('a Ana se la reconoce por su dirección, no por la del balanceador', deAna.procedencia === ANA, {
      procedencia: deAna.procedencia,
      ips: deAna.ips,
    });
    comprobar('y a Bruno por la suya', deBruno.procedencia === BRUNO, {
      procedencia: deBruno.procedencia,
      ips: deBruno.ips,
    });
    comprobar(
      'así que caen en cubos DISTINTOS y no se bloquean entre ellos',
      deAna.procedencia !== deBruno.procedencia,
      { ana: deAna.procedencia, bruno: deBruno.procedencia },
    );
    comprobar('y las dos siguen siendo fiables: esto no desarma la puerta', deAna.fiable && deBruno.fiable, {
      ana: deAna.fiable,
      bruno: deBruno.fiable,
    });

    /*
     * ═══ LA VACUNA: QUE LA REGLA DE ANTES CAE AQUÍ ═══
     *
     * Sin esto, las cuatro de arriba podrían estar comprando algo que ya pasaba. Con la regla
     * vieja —el último de la lista— las dos personas dan la MISMA dirección, que es el fallo
     * que se está arreglando. Si algún día esto dejara de ser verdad, es que el caso ya no
     * distingue nada y las de arriba no valen.
     */
    comprobar(
      'y con la regla de antes —el último de la lista— las dos daban la misma: por eso muerde',
      deAna.comoAntes === deBruno.comoAntes && deAna.comoAntes === BORDE,
      { ana: deAna.comoAntes, bruno: deBruno.comoAntes, borde: BORDE },
    );
  }
}

paso('Y el número de saltos es la otra mitad: corto, vuelve a fallar');
{
  /*
   * Esto NO comprueba algo que se arregle: es la prueba escrita de que los dos cambios van
   * juntos. Con el número corto, Express tira al cliente de la lista ANTES de que
   * `procedenciaDe` la vea, así que el primero ya es el balanceador y coger el primero no
   * salva nada. Quien vuelva a poner un 1 a mano tiene que ver esto.
   */
  const visto = await loQueVeElServidor(1, [`${ANA}, ${BORDE}`, `${BRUNO}, ${BORDE}`]);
  const [deAna, deBruno] = visto;
  comprobar('el arnés ha hecho las dos peticiones con el número corto', visto.length === 2, {
    vistas: visto.length,
  });
  if (deAna !== undefined && deBruno !== undefined) {
    comprobar(
      'con `trust proxy` corto, Express deja sólo el balanceador y los dos vuelven al mismo cubo',
      deAna.procedencia === deBruno.procedencia && deAna.procedencia === BORDE,
      { ana: deAna.procedencia, bruno: deBruno.procedencia, ips: deAna.ips },
    );
  }
}

paso('Un salto sigue funcionando como siempre: esto no rompe el despliegue de casa');
{
  const visto = await loQueVeElServidor(1, [ANA, BRUNO, undefined]);
  const [deAna, deBruno, sinCabecera] = visto;
  comprobar('el arnés ha hecho las tres peticiones', visto.length === 3, { vistas: visto.length });
  if (deAna !== undefined && deBruno !== undefined) {
    comprobar(
      'con un solo salto, cada cual es quien es',
      deAna.procedencia === ANA && deBruno.procedencia === BRUNO,
      { ana: deAna.procedencia, bruno: deBruno.procedencia },
    );
    comprobar(
      'y con un salto la regla vieja y la nueva coinciden: por eso el fallo no se veía en casa',
      deAna.comoAntes === deAna.procedencia,
      { vieja: deAna.comoAntes, nueva: deAna.procedencia },
    );
  }
  /*
   * Sin cabecera no hay nada que leer, y el camino de abajo tiene que seguir diciendo que no
   * se fía: ése es el que imprime el aviso del arranque. Si `procedenciaDe` devolviera
   * `req.ip` a secas en vez del primero de la lista, esto se pondría `fiable: true` con la
   * dirección del bucle local y el aviso desaparecería sin que nada hubiera mejorado.
   */
  if (sinCabecera !== undefined) {
    comprobar('y sin cabecera ninguna se sigue diciendo que no se sabe de dónde viene', !sinCabecera.fiable, {
      procedencia: sinCabecera.procedencia,
      fiable: sinCabecera.fiable,
    });
  }
}

paso('El número de saltos se declara, y lo que no es un entero para el arranque');
{
  comprobar('sin variable se queda en uno: un despliegue de casa no cambia', leerSaltosDeConfianza(undefined) === 1);
  comprobar('vacía, igual', leerSaltosDeConfianza('   ') === 1);
  comprobar('un uno es un uno', leerSaltosDeConfianza('1') === 1);
  comprobar('un dos es un dos', leerSaltosDeConfianza(' 2 ') === 2);
  comprobar('y el tope se acepta', leerSaltosDeConfianza(String(TOPE_DE_SALTOS)) === TOPE_DE_SALTOS);

  const basura = ['dos', '0', '-1', '2.5', String(TOPE_DE_SALTOS + 1), 'NaN', '1e3', 'xxx'];
  let lanzadas = 0;
  for (const mala of basura) {
    try {
      leerSaltosDeConfianza(mala);
    } catch {
      lanzadas++;
    }
  }
  comprobar('y todo lo que no sea un entero en rango para el arranque', lanzadas === basura.length, {
    lanzadas,
    deCuantas: basura.length,
    basura,
  });
}

paso('Por qué tiene que lanzar: el «2» con comillas apaga la puerta sin decir nada');
{
  /*
   * ═══ LA CADENA PELIGROSA ES LA QUE PARECE UN NÚMERO ═══
   *
   * Ésta es la razón de que `leerSaltosDeConfianza` devuelva un `number` y lance en vez de
   * caer a un valor por defecto. Y el matiz importa, porque la intuición falla: medido con
   * el Express y el `proxy-addr` de este árbol, `app.set('trust proxy', …)` con
   *
   *   · `'dos'` o `'true'`  → LANZA («invalid IP address»). Ruidoso, y por tanto inofensivo.
   *   · `'2'`, `'1'`, `'0'` → NO lanza: `req.ips` queda VACÍO y `req.ip` pasa a ser
   *     `127.0.0.1`. Express lee las cadenas como listas de direcciones, no como cuentas de
   *     saltos, y «2» compila a una subred que no casa con nada.
   *
   * O sea que lo que desarma la puerta de toda la casa no es un dedazo raro: es el valor
   * CORRECTO sin convertir, que es exactamente lo que devuelve `process.env.LO_QUE_SEA`.
   * Con la lista vacía `procedenciaDe` se cae al camino de «no fiable», que según
   * `limitador.ts` desactiva el bloqueo y deja sólo retardos. Sin un error en ningún sitio.
   */
  const conCadena = async (valor: string): Promise<{ ips: string[]; fiable: boolean } | 'lanza'> => {
    let app;
    try {
      app = express();
      app.set('trust proxy', valor as unknown as number);
    } catch {
      return 'lanza';
    }
    let ips: string[] = [];
    let fiable = true;
    app.get('/', (req: Request, res) => {
      ips = [...req.ips];
      fiable = procedenciaDe(req).fiable;
      res.json({ ok: true });
    });
    const servidor = app.listen(0, '127.0.0.1');
    await new Promise<void>((listo) => {
      servidor.on('listening', () => {
        listo();
      });
    });
    const dir = servidor.address();
    const puerto = typeof dir === 'object' && dir !== null ? dir.port : 0;
    await fetch(`http://127.0.0.1:${String(puerto)}/`, {
      headers: { 'X-Forwarded-For': `${ANA}, ${BORDE}` },
    });
    await new Promise<void>((cerrado) => {
      servidor.close(() => {
        cerrado();
      });
    });
    return { ips, fiable };
  };

  const conDosEnLetra = await conCadena('dos');
  comprobar('una cadena que no parece un número revienta el arranque, y eso es lo bueno', conDosEnLetra === 'lanza', {
    conDosEnLetra,
  });

  const conDosEnCifra = await conCadena('2');
  comprobar(
    'pero el «2» CON COMILLAS no revienta: deja la lista de direcciones vacía',
    conDosEnCifra !== 'lanza' && conDosEnCifra.ips.length === 0,
    { conDosEnCifra },
  );
  comprobar(
    'y entonces la puerta deja de fiarse de nadie, que es dejar de bloquear a todo el mundo',
    conDosEnCifra !== 'lanza' && !conDosEnCifra.fiable,
    { conDosEnCifra },
  );
  comprobar(
    'por eso la configuración devuelve un número y no lo que venga del entorno',
    typeof env.saltosDeConfianza === 'number' && Number.isInteger(env.saltosDeConfianza),
    { saltos: env.saltosDeConfianza, tipo: typeof env.saltosDeConfianza },
  );
}

paso('Y si el número declarado está DE MÁS, se dice en voz alta');
{
  /*
   * ═══ SÓLO SE AVISA DEL LADO QUE NADIE PUEDE FABRICAR ═══
   *
   * La cuenta de entradas de la cabecera NO es un invariante: quien llama antepone las que
   * quiera. Así que una cadena MÁS LARGA de lo declarado no dice nada —puede ser un proxy más
   * o un curioso— y avisar de eso sería gritar en falso a la primera visita y, peor, empujar
   * a quien opera a SUBIR el número por lo que diga un desconocido. Subirlo de más es
   * exactamente el error peligroso.
   *
   * El lado corto sí dice algo: nadie de fuera puede hacer que lleguen MENOS entradas de las
   * que añade la infraestructura. Una cadena más corta que lo declarado es prueba de que el
   * número está de más, y eso es lo que se grita.
   */
  const { apuntarLaCadena, cadenasVistas, olvidarLasCadenas } = await import('../src/puerta/limitador');

  const conCadena = (xff: string | undefined): Request =>
    ({ headers: xff === undefined ? {} : { 'x-forwarded-for': xff } }) as unknown as Request;

  const gritos: string[] = [];
  const antes = console.warn;
  console.warn = (...partes: unknown[]): void => {
    gritos.push(partes.map((p) => String(p)).join(' '));
  };
  try {
    olvidarLasCadenas();
    /* Lo declarado son 2. Una cadena de 2 es lo esperado: silencio. */
    apuntarLaCadena(conCadena(`${ANA}, ${BORDE}`));
    comprobar('con los saltos que se han declarado, no se dice nada', gritos.length === 0, { gritos });

    /*
     * Y una MÁS LARGA tampoco dice nada, que es el cambio que importa: es lo que provoca
     * cualquiera anteponiendo una entrada, y avisar de eso sería invitar a subir el número.
     */
    for (let i = 0; i < 10; i++) apuntarLaCadena(conCadena(`1.2.3.4, ${ANA}, ${BORDE}`));
    comprobar(
      'y con una cadena MÁS LARGA tampoco: eso lo provoca cualquiera anteponiendo una entrada',
      gritos.length === 0,
      { gritos },
    );

    /* Pero una más CORTA no la puede provocar nadie de fuera: el número está de más. */
    apuntarLaCadena(conCadena(BORDE));
    comprobar('y con una MÁS CORTA sí, porque eso nadie de fuera puede provocarlo', gritos.length === 1, {
      gritos,
    });
    comprobar(
      'y el aviso dice los dos números y que hay que BAJARLO',
      gritos[0]?.includes('1 entrada') === true &&
        gritos[0]?.includes('declara 2') === true &&
        gritos[0]?.includes('DE MÁS') === true,
      { grito: gritos[0] },
    );
    comprobar(
      'y no dice ni una dirección: lo que se cuenta son saltos, no gente',
      gritos[0]?.includes(ANA) === false && gritos[0]?.includes(BORDE) === false,
      { grito: gritos[0] },
    );

    for (let i = 0; i < 20; i++) apuntarLaCadena(conCadena(BORDE));
    comprobar('y se dice una sola vez, no una por petición', gritos.length === 1, { gritos: gritos.length });

    const antesDeNada = cadenasVistas().size;
    apuntarLaCadena(conCadena(undefined));
    comprobar('sin cabecera no se apunta nada', cadenasVistas().size === antesDeNada, {
      vistas: [...cadenasVistas()],
    });
    comprobar(
      'y se ha apuntado lo que llegó, para poder mirarlo después',
      cadenasVistas().get(2) === 1 && cadenasVistas().get(3) === 10 && cadenasVistas().get(1) === 21,
      { vistas: [...cadenasVistas()] },
    );
  } finally {
    console.warn = antes;
    olvidarLasCadenas();
  }
}

paso('Las dos variables no pueden decir cosas distintas');
{
  /*
   * `loopback` es el despliegue de casa, con un nginx propio delante como mucho, y ese nginx
   * AÑADE la dirección de quien llama a lo que quien llama haya mandado. Declarar dos saltos
   * ahí hace fiable la entrada que escribió el móvil: cualquiera rota la cabecera para no
   * acumular fallos nunca, o fija la de otra persona para dejarla fuera. Se aceptaba sin una
   * palabra, y lo encontró un atacante leyendo `despliegue/nginx-harkania.conf`.
   */
  comprobar('en casa, un salto se acepta', leerSaltosDeConfianza('1', 'loopback') === 1);
  let lanzo = false;
  try {
    leerSaltosDeConfianza('2', 'loopback');
  } catch {
    lanzo = true;
  }
  comprobar('pero dos saltos en casa paran el arranque', lanzo);
  comprobar('y con balanceador externo, dos saltos se aceptan', leerSaltosDeConfianza('2', 'plataforma') === 2);
}

paso('Y el aviso está enchufado a la puerta de verdad, no sólo probado a mano');
{
  /*
   * Las comprobaciones de arriba llaman a `apuntarLaCadena` directamente. Eso prueba lo que
   * hace la funcion, no que alguien la llame: una funcion perfecta que nadie invoca es el
   * fallo mas facil de dejar puesto. Aqui se pasa por `limitarIntentos`, que es el unico
   * sitio desde el que se llama en el producto.
   */
  const { limitarIntentos, cadenasVistas, olvidarLasCadenas } = await import('../src/puerta/limitador');
  olvidarLasCadenas();
  const puerta = limitarIntentos({
    nombre: 'prueba del cable',
    credencial: () => 'x',
    porCredencial: 1000,
    porIp: 1000,
    esFallo: () => false,
  });
  const app = express();
  app.set('trust proxy', 2);
  app.get('/', puerta, (_req, res) => {
    res.json({ ok: true });
  });
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise<void>((listo) => {
    servidor.on('listening', () => {
      listo();
    });
  });
  const dir = servidor.address();
  const puerto = typeof dir === 'object' && dir !== null ? dir.port : 0;
  await fetch(`http://127.0.0.1:${String(puerto)}/`, {
    headers: { 'X-Forwarded-For': `${ANA}, ${BORDE}` },
  });
  await new Promise<void>((cerrado) => {
    servidor.close(() => {
      cerrado();
    });
  });
  comprobar(
    'pasando por una puerta de verdad, la cadena queda apuntada: el aviso tiene cable',
    cadenasVistas().get(2) === 1,
    { vistas: [...cadenasVistas()] },
  );
  olvidarLasCadenas();
}

paso('Y el número no vuelve a estar escrito a mano');
{
  const fs = await import('node:fs');
  const arranque = fs.readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
  /* Sin comentarios: la explicación de por qué esto está prohibido no puede tumbarlo. */
  const soloCodigo = arranque.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  comprobar(
    'el arranque no escribe el número de saltos a mano: lo saca de la configuración',
    !/app\.set\(\s*'trust proxy'\s*,\s*\d/.test(soloCodigo),
    { donde: /app\.set\([^)]*trust proxy[^)]*\)/.exec(soloCodigo)?.[0] },
  );
  comprobar(
    'y de verdad lo saca de ahí',
    /app\.set\(\s*'trust proxy'\s*,\s*env\.saltosDeConfianza\s*\)/.test(soloCodigo),
  );
  /* Vacuna: que se ha leído el arranque de verdad y no una cadena vacía. */
  comprobar('y se ha leído el arranque para juzgarlo', soloCodigo.includes('PROXY_DE_CONFIANZA'), {
    letras: soloCodigo.length,
  });
}

console.log('');
console.log(`Modo: ${env.proxyDeConfianza} · saltos declarados: ${String(env.saltosDeConfianza)}`);
if (fallos.length > 0) {
  console.log(`\n${String(fallos.length)} de ${String(hechas)} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`\n${String(hechas)} comprobaciones`);
console.log('\nEl limitador sabe de quién habla: detrás de dos balanceadores, dos personas son dos');
console.log('personas y no una sola; y el número de saltos se declara, se valida y no se adivina.');
