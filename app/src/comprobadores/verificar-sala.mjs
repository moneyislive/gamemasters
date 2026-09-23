/**
 * LA SALA DE LA PORTADA: que enseñe lo que hay y que no mienta sobre ello.
 *
 * ═══ QUÉ CAMBIÓ PARA QUE ESTO HAGA FALTA ═══
 *
 * La Sala se componía del registro COMPILADO: los cinco arcades que vienen
 * dentro del binario. Ahora se fusiona con el catálogo del SERVIDOR, o sea con
 * manifiestos escritos en otro repositorio y cargados por `ARCADES_EXTERNOS`. Eso
 * mete en la portada dos clases de dato que antes no llegaban: valores que no
 * están en las uniones cerradas de este binario, y juegos cuyas reglas no vienen
 * aquí.
 *
 * Y el juicio de qué se puede jugar pasó de un sí/no a NUEVE ramas. Nueve ramas
 * no se compran leyendo: hay que EJECUTARLAS. Por eso `arcade/del-servidor.ts` es
 * un módulo puro, sin un solo `import` de ejecución, y por eso este comprobador
 * lo carga de verdad en vez de mirarlo con expresiones regulares.
 *
 * ═══ POR QUÉ CON MANIFIESTOS FABRICADOS Y NO CON LOS DE CASA ═══
 *
 * Por lo mismo que `laTerceraPregunta` en el comprobador del escritorio: una
 * comprobación atada a los arcades instalados hoy se apaga sola el día que
 * alguien los cambie, y nadie se entera. Fabricando un caso por rama, la regla se
 * compra ella sola y para siempre.
 *
 * Lo que NO se puede fabricar es la relación entre el juicio y el binario de
 * verdad, así que eso se lee aparte: que las listas con las que se ejercita sean
 * las que el binario declara.
 *
 * Corre con `node` pelado, en segundos, sin Metro y sin red.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, '..');
const APP = path.resolve(SRC, '..', 'app');

const fallos = [];
let cuantas = 0;

function comprobar(que, condicion, detalle) {
  cuantas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 300)}`}`,
  );
}

function paso(titulo) {
  console.log(`\n· ${titulo}`);
}

function leer(fichero) {
  return fs.readFileSync(fichero, 'utf8');
}

/**
 * LA RED DEL CONTRATO DE PINTOR APUNTA ANTES DE CAER.
 *
 * Riberas, el Burgo y Las Lindes tenían cada una su red bajo el lienzo, y la tercera no apuntaba
 * nada: un valle que se caía en un teléfono no dejaba rastro en el parte. Desde el contrato de
 * pintor (`arcade/pintor-propio.tsx`) montan LA MISMA, así que lo que antes se leía en cada pantalla
 * —«la red apunta el fallo»— se lee aquí una vez: en `componentDidCatch`, `apuntarFallo` con
 * `'render'` y DESPUÉS el aviso hacia arriba. Recibe el texto para poder verla caer con uno
 * envenenado; y mira el código sin comentarios, que cuentan el fallo con los mismos nombres.
 */
function laRedDelContratoApunta(texto) {
  const codigo = texto
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l))
    .join('\n');
  return /export class RedDelLienzo extends Component<[\s\S]*?override componentDidCatch\(error: unknown, info: ErrorInfo\): void \{[\s\S]*?apuntarFallo\(e, 'render', false\);\s*this\.props\.alCaer\(e\.message\);/.test(
    codigo,
  );
}

/**
 * Y LA PANTALLA MONTA ESA RED Y NO UNA SUYA: la importa del contrato y no recoge fallos por su
 * cuenta. Una red propia al lado —con su `componentDidCatch`— es exactamente cómo la de Las Lindes
 * se quedó sin apuntar, y por eso se prohíbe la pieza y no sólo se pide la otra.
 */
function montaLaRedDelContrato(codigo) {
  return (
    /import \{[^}]*\bRedDelLienzo\b[^}]*\} from '\.\/pintor-propio';/.test(codigo) &&
    !/componentDidCatch|getDerivedStateFromError/.test(codigo)
  );
}

async function cargarModuloTs(fichero) {
  const js = ts.transpileModule(leer(fichero), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js, 'utf8').toString('base64')}`);
}

const { dondeSePinta, loQueLlega, queSeEnsena } = await cargarModuloTs(
  path.join(SRC, 'arcade', 'del-servidor.ts'),
);

/**
 * LOS JUEGOS QUE TRAE EL BINARIO, LEÍDOS DE `pintados.ts` Y NO COPIADOS AQUÍ.
 *
 * Eran una lista escrita en este fichero —la del binario de abajo— que había que tocar
 * cada vez que un juego entraba en `LOS_QUE_PINTA`, además de su fila allí: la misma alta
 * dos veces, y la de aquí sólo servía para ponerse roja si no se hacía. La tabla no se
 * puede importar desde Node —trae componentes de React Native y de Skia—, así que sus
 * claves se leen del fuente (`[FRENTE]: LaFrente,` → `FRENTE`) y cada constante se resuelve
 * a su identificador en el fichero del juego (`export const FRENTE = 'frente';`). Una que
 * no se resuelva, o que dos juegos declaren con valores distintos, sale como `null`, y
 * eso se ve rojo más abajo; y como una lectura rota daría una lista vacía —que no juzga
 * nada—, allí mismo se le exige suelo.
 *
 * Recibe los textos para poder darle también uno FABRICADO: la vacuna de más abajo.
 */
function juegosDeLaTabla(textoDePintados, ficherosDeJuegos) {
  const cuerpo = (textoDePintados.split('LOS_QUE_PINTA: Record<ArcadeId, ComponentType> = {')[1] ?? '').split('};')[0] ?? '';
  const constantes = [...cuerpo.matchAll(/^\s*\[([A-Z_]+)\]:/gm)].map((m) => m[1]);
  const valores = new Map();
  for (const texto of ficherosDeJuegos) {
    for (const m of texto.matchAll(/^export const ([A-Z_]+)(?:: ArcadeId)? = '([a-z0-9-]+)';$/gm)) {
      valores.set(m[1], valores.has(m[1]) && valores.get(m[1]) !== m[2] ? null : m[2]);
    }
  }
  return constantes.map((constante) => ({ constante, id: valores.get(constante) ?? null }));
}

const CARPETA_DE_LOS_JUEGOS = path.resolve(SRC, '..', '..', 'shared', 'arcade', 'juegos');
const LOS_DE_LA_TABLA = juegosDeLaTabla(
  leer(path.join(SRC, 'arcade', 'pintados.ts')),
  fs
    .readdirSync(CARPETA_DE_LOS_JUEGOS)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => leer(path.join(CARPETA_DE_LOS_JUEGOS, f))),
);

/**
 * El binario con el que se ejercita el juicio.
 *
 * Es el de VERDAD —sus juegos salen de la tabla de arriba y se comprueban más abajo— y no
 * uno inventado: probar la regla contra un binario imaginario compraría que la regla es
 * coherente consigo misma, que no es lo que hay que comprar.
 */
const BINARIO = {
  juegos: LOS_DE_LA_TABLA.map((j) => j.id).filter((id) => id !== null),
  muebles: ['formulario', 'tablero', 'lienzo', 'escena'],
  genericosDelContrato: ['formulario', 'tablero'],
  genericos: ['tablero'],
};

/** Un manifiesto con lo justo para el juicio. */
function manifiesto(campos) {
  return {
    id: 'de-prueba',
    nombre: 'De prueba',
    gancho: 'Un gancho.',
    icono: 'mando',
    mueble: 'tablero',
    sede: 'servidor',
    ...campos,
  };
}

// ---------------------------------------------------------------------------

paso('El juicio contesta las nueve, y cada una la suya');
{
  const dentro = dondeSePinta(manifiesto({ id: 'frente', mueble: 'formulario', sede: 'dispositivo' }), BINARIO);
  comprobar('un juego que trae el binario se juega', dentro.aqui === true, dentro);
  comprobar('y se sabe que es por su componente propio', dentro.aqui && dentro.porComponentePropio === true, dentro);

  /*
   * ═══ LA VACUNA QUE MÁS IMPORTA, Y NO ES TEÓRICA ═══
   *
   * `GET /api/arcade` publica HOY `publicaOpciones: false` para La Frente, El
   * Arcade y La Peonza: ninguno registra `opciones()` porque los tres pintan su
   * propia pantalla. Un juicio que preguntara «¿publica algo?» antes que «¿lo
   * traigo dentro?» apagaría las tres tarjetas con una frase perfectamente
   * razonada y perfectamente falsa — y el cliente de escritorio hace justo esa
   * pregunta primero, así que copiarle el orden es el error a mano.
   */
  const frenteSinOpciones = dondeSePinta(
    manifiesto({ id: 'frente', mueble: 'formulario', sede: 'dispositivo', publicaOpciones: false }),
    BINARIO,
  );
  comprobar(
    'un juego del binario SIN opciones() sigue jugable, pase lo que pase con publicaOpciones',
    frenteSinOpciones.aqui === true,
    frenteSinOpciones,
  );

  const deFuera = dondeSePinta(manifiesto({ id: 'de-fuera', mueble: 'tablero' }), BINARIO);
  comprobar('un arcade de FUERA con mueble genérico se juega', deFuera.aqui === true, deFuera);
  comprobar('y se sabe que NO es por componente propio', deFuera.aqui && deFuera.porComponentePropio === false, deFuera);

  /*
   * La segunda vacuna: endurecer esta línea apaga el enchufe entero. Un arcade de
   * tablero resuelve su dibujo DENTRO de su proyección, así que no necesita
   * publicar opciones — y exigírselas dejaría fuera a todos los de fuera.
   */
  const tableroSinOpciones = dondeSePinta(
    manifiesto({ id: 'de-fuera', mueble: 'tablero', publicaOpciones: false }),
    BINARIO,
  );
  comprobar(
    'un arcade de fuera con mueble tablero se juega aunque no publique opciones',
    tableroSinOpciones.aqui === true,
    tableroSinOpciones,
  );

  const raro = dondeSePinta(manifiesto({ id: 'raro', mueble: 'holograma' }), BINARIO);
  comprobar('un mueble que este binario no conoce se apaga', raro.aqui === false, raro);
  comprobar('y dice que es eso', !raro.aqui && raro.razon === 'mueble-desconocido', raro);
  comprobar(
    'y su motivo NOMBRA el mueble, que es lo único accionable',
    !raro.aqui && raro.porque.includes('holograma'),
    raro,
  );

  const propio = dondeSePinta(manifiesto({ id: 'de-fuera', mueble: 'lienzo' }), BINARIO);
  comprobar('un mueble propio de un juego que no viene dentro se apaga', propio.aqui === false, propio);
  comprobar('y dice que sus píxeles están en el binario', !propio.aqui && propio.razon === 'pixeles-en-el-binario', propio);
  /*
   * Y NO puede decir «se juega en la app», que es lo que dice el cliente de
   * escritorio para este mismo caso. Esto ES la app: mandar a alguien a donde ya
   * está es la peor clase de mensaje honrado.
   */
  comprobar(
    'y NO manda a nadie a la app, porque esto es la app',
    !propio.aqui && !/en la app/i.test(propio.porque),
    propio,
  );

  /*
   * Y ESTE ES EL CASO QUE ESTE COMPROBADOR ENCONTRO, y que el juicio contestaba
   * mal: un mueble que es generico DEL CONTRATO y que esta version de la app aun
   * no pinta. Con una sola lista de genericos salia como «sus pixeles viven en su
   * binario», que manda a esperar algo que no va a pasar nunca. Lo que le pasa es
   * lo contrario: llega con una version nueva de la app y el juego no toca nada.
   *
   * EL BINARIO DE AQUI ES FABRICADO (`genericos: []`), y desde que la app pinta
   * tambien los formularios eso importa: hoy NO hay ningun mueble del contrato sin
   * pincel, asi que esta rama no la recorre ninguna tarjeta de nadie. Se prueba
   * igual, porque el dia que el contrato estrene un quinto mueble la rama pasa a
   * decidir de verdad y nadie va a volver a leerla. `formulario` se usa aqui como
   * SUPLENTE, no como descripcion de lo que la app pinta.
   */
  const sinPincel = dondeSePinta(
    manifiesto({ id: 'de-fuera', mueble: 'formulario', publicaOpciones: true }),
    { ...BINARIO, genericos: [] },
  );
  comprobar('un mueble generico que esta version no pinta se apaga', sinPincel.aqui === false, sinPincel);
  comprobar('y dice que le falta a la APP, no al juego', !sinPincel.aqui && sinPincel.razon === 'mueble-sin-pincel', sinPincel);
  comprobar(
    'y no lo confunde con los pixeles propios',
    !sinPincel.aqui && sinPincel.razon !== 'pixeles-en-el-binario',
    sinPincel,
  );

  /*
   * ═══ LAS TRES QUE SIGUEN YA SI SE ALCANZAN, Y ANTES NO ═══
   *
   * Aqui ponia que eran inalcanzables «con el binario de HOY», porque el unico
   * mueble generico que la app pintaba era `tablero` y un tablero sale por la rama
   * de arriba antes de llegar aqui. Ese texto se escribio como deuda —«el dia que
   * esta app estrene el pintor generico de formularios»— y ese dia ya llego: la
   * app da de alta `formulario` en `LOS_MUEBLES_GENERICOS`, porque no hacerlo
   * dejaba un arcade de fuera jugable en el PC y no en el movil.
   *
   * Asi que estas tres deciden de verdad desde hoy, y el binario fabricado de
   * abajo coincide con el real. Se deja fabricado a proposito: lo que se prueba es
   * el JUICIO, y atarlo a la tabla verdadera lo volveria verde por reflejo.
   */
  const CON_FORMULARIOS = { ...BINARIO, genericos: ['formulario', 'tablero'] };

  const sinMesa = dondeSePinta(
    manifiesto({ id: 'de-fuera', mueble: 'formulario', sede: 'dispositivo' }),
    CON_FORMULARIOS,
  );
  comprobar('un juego de aparato que no viene dentro se apaga', sinMesa.aqui === false, sinMesa);
  comprobar('y dice que no hay ni mesa ni reglas', !sinMesa.aqui && sinMesa.razon === 'ni-mesa-ni-reductor', sinMesa);

  const mudo = dondeSePinta(
    manifiesto({ id: 'de-fuera', mueble: 'formulario', publicaOpciones: false }),
    CON_FORMULARIOS,
  );
  comprobar('un mueble de lista sin lista se apaga', mudo.aqui === false, mudo);
  comprobar('y dice que no publica nada', !mudo.aqui && mudo.razon === 'no-publica-nada', mudo);

  /*
   * La tercera vacuna: `undefined` NO es `false`. Un servidor más viejo que este
   * binario no manda el campo, y desde aquí no se sabe. Colapsarlos es decirle a
   * alguien que un juego «no publica nada» cuando lo que pasa es que no se ha
   * preguntado.
   */
  const calla = dondeSePinta(manifiesto({ id: 'de-fuera', mueble: 'formulario' }), CON_FORMULARIOS);
  comprobar('si el servidor no lo dice, no se contesta como que no publica', calla.aqui === false && calla.razon === 'el-servidor-no-lo-dice', calla);
  comprobar(
    'y las dos razones son distintas de verdad',
    !mudo.aqui && !calla.aqui && mudo.porque !== calla.porque,
    { mudo: mudo.porque, calla: calla.porque },
  );

  const conOpciones = dondeSePinta(
    manifiesto({ id: 'de-fuera', mueble: 'formulario', publicaOpciones: true }),
    CON_FORMULARIOS,
  );
  comprobar('un mueble de lista CON lista se juega', conOpciones.aqui === true, conOpciones);
}

paso('Y el binario con el que se juzga es el de verdad');
{
  /*
   * Sin esto, arriba se estaría probando una regla contra un binario imaginario:
   * el día que entre un mueble genérico nuevo, el juicio lo trataría bien y esta
   * prueba seguiría verde con la lista vieja.
   */
  const pintados = leer(path.join(SRC, 'arcade', 'pintados.ts'));
  const muebles = leer(path.join(SRC, 'arcade', 'muebles.ts'));

  comprobar(
    'el binario declara sus tres listas derivándolas de las tablas',
    /juegos:\s*Object\.keys\(LOS_QUE_PINTA\)/.test(pintados) &&
      /genericos:\s*Object\.keys\(LOS_MUEBLES_GENERICOS\)/.test(pintados),
    'derivadas es lo que impide que se separen de las tablas',
  );
  comprobar(
    '`tablero` está entre los genéricos, que es lo que desbloquea el enchufe',
    /tablero:\s*ElTableroEnLinea/.test(pintados),
  );
  comprobar(
    'y hay al menos un mueble PROPIO fuera de los genéricos',
    /lienzo/.test(muebles) && !/lienzo:\s*[A-Z]/.test(pintados.split('LOS_MUEBLES_GENERICOS')[1] ?? ''),
    'sin un mueble propio, la rama `pixeles-en-el-binario` no la recorre nadie',
  );
  /*
   * Las claves de `LOS_QUE_PINTA` son CONSTANTES (`[FRENTE]`, `[RIBERAS]`…) y no
   * literales, asi que buscar la cadena 'riberas' en el fichero no encuentra nada.
   *
   * Aquí se contaban las entradas contra una lista escrita arriba, y un juego nuevo con
   * pintor propio obligaba a tocar esta prueba «que es justo lo que se quiere». Lo que se
   * quería era que el juicio se ejercite con el binario de verdad, y eso ya no necesita
   * una copia: los juegos del binario SALEN de la tabla (`juegosDeLaTabla`). Lo que queda
   * por comprar es que esa lectura no se rompa en silencio, y se compra por tres lados:
   *
   *   · cada clave de la tabla se resuelve a un identificador —una constante renombrada o
   *     escrita de otra forma saldría `null` y se perdería del juicio sin un error—;
   *   · SUELO: la lista no sale vacía y trae los seis de hoy —una lectura rota da cero
   *     juegos, y con cero juegos el juicio de arriba se juzga contra un binario vacío—;
   *   · y la lectura se ve CAER y LEER con una tabla fabricada, más abajo.
   */
  comprobar(
    'cada clave de `LOS_QUE_PINTA` se resuelve al identificador de su juego',
    LOS_DE_LA_TABLA.length > 0 && LOS_DE_LA_TABLA.every((j) => j.id !== null),
    LOS_DE_LA_TABLA,
  );
  const LOS_SEIS_DE_HOY = ['frente', 'el-arcade', 'riberas', 'peonza', 'burgo', 'lindes'];
  comprobar(
    `y los juegos con los que se juzga salen de ahí, sin repetir, y traen al menos los seis de hoy (${LOS_SEIS_DE_HOY.join(', ')})`,
    new Set(BINARIO.juegos).size === BINARIO.juegos.length && LOS_SEIS_DE_HOY.every((id) => BINARIO.juegos.includes(id)),
    BINARIO.juegos,
  );
  /*
   * LA VACUNA DE LA LECTURA. Una tabla fabricada con un juego que el binario no tiene
   * (`[NUEVO]`), una constante que no declara nadie (`[FANTASMA]`), y un renglón de
   * comentario con cara de fila que no tiene que contar; y una tabla sin la cabecera que
   * se busca, que tiene que dar cero y no la lista de siempre.
   */
  const fabricada = [
    'export const LOS_QUE_PINTA: Record<ArcadeId, ComponentType> = {',
    '  [FRENTE]: LaFrente,',
    '  /*',
    '   * [RIBERAS]: esto es un comentario, no una fila',
    '   */',
    '  [NUEVO]: ElNuevoEnTres,',
    '  [FANTASMA]: ElFantasma,',
    '};',
  ].join('\n');
  const declaraciones = ["export const FRENTE = 'frente';", "export const NUEVO: ArcadeId = 'el-nuevo';"];
  comprobar(
    'y la lectura lee lo que está escrito: en una tabla fabricada ve `frente` y `el-nuevo`, deja `[FANTASMA]` sin resolver y no cuenta el comentario',
    JSON.stringify(juegosDeLaTabla(fabricada, declaraciones)) ===
      JSON.stringify([
        { constante: 'FRENTE', id: 'frente' },
        { constante: 'NUEVO', id: 'el-nuevo' },
        { constante: 'FANTASMA', id: null },
      ]) && juegosDeLaTabla(fabricada.replace('LOS_QUE_PINTA:', 'OTRA_TABLA:'), declaraciones).length === 0,
    juegosDeLaTabla(fabricada, declaraciones),
  );
}

paso('Lo que llega por el cable se mira antes de pintarlo');
{
  comprobar('un cuerpo que no es objeto no pasa', loQueLlega(null) === null && loQueLlega(7) === null);
  comprobar('un 200 sin lista no pasa', loQueLlega({}) === null);
  comprobar('una lista vacía SÍ pasa: es un servidor sin arcades, no un fallo', Array.isArray(loQueLlega({ arcades: [] })));

  /*
   * ═══ ESTO ES LO QUE EVITA LA PANTALLA EN BLANCO ═══
   *
   * Un `nombre` que sea un objeto lanza «Objects are not valid as a React child»
   * DURANTE el render, y la portada no tiene `ErrorBoundary`: el throw desmonta
   * la raíz. No se cae una tarjeta, se cae la app.
   */
  const sucio = loQueLlega({
    arcades: [
      manifiesto({ id: 'bueno' }),
      manifiesto({ id: 'sin-nombre', nombre: '' }),
      manifiesto({ id: 'nombre-objeto', nombre: { es: 'malo' } }),
      manifiesto({ id: 'sin-mueble', mueble: 42 }),
      manifiesto({ id: 'sede-rara', sede: 'la-nube' }),
      { no: 'es un manifiesto' },
      null,
      'una cadena suelta',
    ],
  });
  comprobar('de ocho, solo pasa el bueno', sucio.length === 1, sucio.map((m) => m.id));
  comprobar('y el que pasa es el bueno', sucio[0]?.id === 'bueno', sucio[0]);
}

paso('Los tres momentos, y lo compilado nunca se quita');
{
  const dentro = [manifiesto({ id: 'frente' }), manifiesto({ id: 'peonza' })];

  const pidiendo = queSeEnsena({ que: 'pidiendo' }, dentro);
  comprobar('mientras se pide, salen los del binario', pidiendo.arcades.length === 2, pidiendo);
  comprobar('y NO se dice que no hay servidor: todavía no se sabe', pidiendo.sinServidor === false, pidiendo);

  const sinRed = queSeEnsena({ que: 'sin-servidor' }, dentro);
  comprobar('sin servidor, siguen saliendo los del binario', sinRed.arcades.length === 2, sinRed);
  comprobar('y ahí sí se dice', sinRed.sinServidor === true, sinRed);

  const puesto = queSeEnsena(
    { que: 'puesto', arcades: [manifiesto({ id: 'frente' }), manifiesto({ id: 'de-fuera' })] },
    dentro,
  );
  comprobar('con servidor, se fusiona sin duplicar', puesto.arcades.length === 3, puesto.arcades.map((m) => m.id));
  comprobar(
    'y el de fuera entra',
    puesto.arcades.some((m) => m.id === 'de-fuera'),
    puesto.arcades.map((m) => m.id),
  );
  /*
   * Un servidor que no liste un arcade compilado NO lo borra de la pantalla: se
   * puede jugar igual si corre en el aparato, y quitarlo sería esconder algo
   * jugable por una respuesta que no habla de él.
   */
  const servidorVacio = queSeEnsena({ que: 'puesto', arcades: [] }, dentro);
  comprobar(
    'un servidor sin arcades no borra los del binario',
    servidorVacio.arcades.length === 2,
    servidorVacio.arcades.map((m) => m.id),
  );
  comprobar('y gana lo compilado cuando los dos hablan del mismo', puesto.arcades[0]?.id === 'frente', puesto.arcades[0]);
}

paso('La portada no puede reventar por un icono que no conoce');
{
  const vitrina = leer(path.join(SRC, 'vitrina.ts'));
  const iconos = leer(path.join(SRC, 'iconos.tsx'));
  const portada = leer(path.join(APP, 'index.tsx'));

  comprobar(
    'la lista de iconos conocidos se deriva de la tabla',
    /ICONOS_DE_ARCADE_CONOCIDOS[^=]*=\s*Object\.keys\(ICONOS_DE_ARCADE\)/.test(iconos),
    'escrita a mano se separa de la tabla y vuelve el `undefined`',
  );
  comprobar(
    'la Sala normaliza el icono contra esa lista',
    /ICONOS_DE_ARCADE_CONOCIDOS/.test(vitrina) && /ICONO_DE_ARCADE_POR_DEFECTO/.test(vitrina),
    'sin esto, un arcade de fuera con otro icono deja `undefined` en la tarjeta',
  );
  /*
   * ANTES ESTO EXIGÍA VER UN `ICONOS_DE_ARCADE[…] ??` EN LA PORTADA, y esa
   * redacción caducó el día que la Sala estrenó identidad: la tarjeta nueva no
   * pinta icono —lo que distingue una máquina de otra es el raíl del aforo— así
   * que ya no indexa la tabla en ningún sitio.
   *
   * Pedir el guardia tal cual estaba obligaba a volver a poner un icono SOLO
   * para que un comprobador lo viera, que es la peor razón que hay para escribir
   * una línea. Pero borrar la comprobación tampoco valía: existe porque este
   * agujero —`ICONOS_DE_ARCADE[loQueSea]` devolviendo `undefined`, React
   * lanzando al pintar `<undefined />` y la portada entera en blanco— YA TUMBÓ
   * esta pantalla una vez, y volvería a caber el día que alguien devuelva el
   * icono a la ficha.
   *
   * Así que se afirma lo que de verdad hay que sostener, que es más fuerte que
   * lo de antes y no menos: NINGUNA indexación de esa tabla puede quedarse sin
   * respaldo. Con cero indexaciones se cumple por construcción; con una sin `??`
   * esto se pone rojo igual que antes.
   */
  const indexaciones = portada.match(/ICONOS_DE_ARCADE\s*\[[^\]]+\]/g) ?? [];
  const sinRespaldo = indexaciones.filter(
    (uso) => !new RegExp(`${uso.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\?\\?`).test(portada),
  );
  comprobar(
    'ninguna indexación de la tabla de iconos se queda sin respaldo en la portada',
    sinRespaldo.length === 0,
    sinRespaldo.length === 0
      ? `${indexaciones.length} indexaciones, todas con respaldo`
      : `sin \`??\`: ${sinRespaldo.join(', ')} — el agujero que ya tumbó esta portada una vez`,
  );
  comprobar(
    'la razón por la que no se puede jugar se pinta',
    /minijuego\.porque/.test(portada),
    'sin esto vuelve la frase única, que es falsa en tres de los cuatro casos',
  );
  comprobar(
    'y la portada pide el catálogo por la puerta de la casa',
    /pedirCatalogoDeArcade/.test(portada),
    'una dirección escrita a mano se salta la elección de servidor',
  );
}

paso('La Sala manda al Muelle a quien lo tiene, y al mueble a quien no');
{
  /*
   * ═══ `rutaDeArcade` YA NO ES UNA LÍNEA, Y HAY QUE LEERLA ═══
   *
   * Desde el Muelle, la tarjeta de un arcade con lobby en tres dimensiones lleva
   * a `/muelle?arcade=…` y NO al mueble que declara su manifiesto; el mueble no
   * cambia —Riberas sigue siendo `tablero`— y al zarpar es el propio Muelle quien
   * navega con `rutaDelMueble`. Quién tiene muelle lo dice
   * `escenas/embarcadero/tema.ts`, no el manifiesto (sellado).
   *
   * Lo que se compra aquí es que las dos puertas sigan siendo dos y en el orden
   * bueno: que la Sala navegue con `rutaDeArcade`, que `rutaDeArcade` pregunte a
   * `tieneMuelle` Y a la sede antes de mandar al Muelle, y que `rutaDelMueble`
   * siga siendo la del mueble a secas. Un día alguien «simplifica» y la tarjeta
   * de Riberas vuelve a abrir el tablero vacío sin pasar por el embarcadero.
   */
  const muebles = leer(path.join(SRC, 'arcade', 'muebles.ts'));
  const vitrina = leer(path.join(SRC, 'vitrina.ts'));
  const escena = leer(path.join(SRC, 'arcade', 'muelle-escena.tsx'));

  comprobar('`muebles.ts` importa `tieneMuelle` del tema del embarcadero', /import \{ tieneMuelle \} from '\.\.\/\.\.\/\.\.\/escenas\/embarcadero\/tema'/.test(muebles));
  comprobar(
    '`rutaDeArcade` manda al Muelle sólo con muelle Y con sede en el servidor',
    /sede === 'servidor' && tieneMuelle\(manifiesto\.id\)[\s\S]{0,120}pathname: '\/muelle'/.test(muebles),
    'sin la sede, un arcade de aparato con tema iría a un lobby sin mesa',
  );
  comprobar(
    'y en otro caso cae a `rutaDelMueble`, que es lo que hacía antes',
    /return rutaDelMueble\(manifiesto\);/.test(muebles) &&
      /export function rutaDelMueble[\s\S]{0,200}MUEBLES\[manifiesto\.mueble\]\.ruta/.test(muebles),
  );
  comprobar('la Sala sigue navegando con `rutaDeArcade` y no con la del mueble', /rutaDeArcade\(m\)/.test(vitrina) && !/rutaDelMueble/.test(vitrina));
  comprobar('y el Muelle zarpa con `rutaDelMueble`, nunca con `rutaDeArcade`', /router\.replace\(rutaDelMueble\(manifiesto\)\)/.test(escena) && !/rutaDeArcade/.test(escena), 'con `rutaDeArcade` zarparía hacia sí mismo');
  comprobar(
    '`/muelle` está en la unión de rutas del grupo, para que el tipado de rutas la conozca',
    /RutaDeMueble = [^;]*'\/muelle'/.test(muebles),
  );
  comprobar(
    'y la pila de `(arcade)` declara la pantalla `muelle` fuera del `Record` de muebles',
    /<Stack\.Screen name="muelle" \/>/.test(leer(path.join(APP, '(arcade)', '_layout.tsx'))),
  );
}

paso('Si la mesa ha empezado se sabe sin abrir la vista del juego');
{
  /*
   * `empezada.ts` no importa nada, así que se EJECUTA: los tres casos que el
   * encargo pide —el campo viene `true`, viene `false`, y no viene pero el juego
   * ofrece la opción de empezar— más los bordes que la propia función documenta.
   * El Muelle decide con esto si monta el lienzo y cuándo zarpa; una inferencia
   * mal hecha manda a la gente al tablero antes de repartir.
   */
  const { haEmpezado, opcionDeEmpezar } = await cargarModuloTs(path.join(SRC, 'arcade', 'empezada.ts'));
  const empezar = { id: 'empezar', tipo: 'riberas:empezar', carga: {}, rotulo: 'Repartir el delta', ayuda: '' };
  const otra = { id: 'fundar:0', tipo: 'riberas:fundar', carga: { vertice: 0 }, rotulo: 'Fundar', ayuda: '' };

  comprobar('si viene `true`, ha empezado', haEmpezado({ empezada: true, opciones: [empezar] }) === true);
  comprobar('si viene `false`, no ha empezado aunque no ofrezca nada', haEmpezado({ empezada: false, opciones: [] }) === false);
  comprobar(
    'si no viene y el juego ofrece empezar, NO ha empezado',
    haEmpezado({ opciones: [empezar] }) === false,
  );
  comprobar('si no viene y ofrece otras cosas, sí ha empezado', haEmpezado({ opciones: [otra] }) === true);
  comprobar('sin mesa no ha empezado nada', haEmpezado(null) === false && haEmpezado(undefined) === false);
  comprobar('una mesa terminada no se reúne', haEmpezado({ terminada: true, opciones: [empezar] }) === true);
  comprobar(
    'la opción de empezar se reconoce por el `id` o por el último tramo del `tipo`',
    opcionDeEmpezar([otra, { ...empezar, id: 'x' }])?.tipo === 'riberas:empezar' &&
      opcionDeEmpezar([{ ...empezar, tipo: 'otro:arrancar' }])?.id === 'empezar' &&
      opcionDeEmpezar([otra]) === undefined,
  );
  comprobar(
    'y el Muelle y la hoja preguntan por esta puerta y no leen `empezada` a pelo',
    /haEmpezado\(mesa\.mesa\)/.test(leer(path.join(SRC, 'arcade', 'muelle-escena.tsx'))) &&
      /opcionDeEmpezar\(/.test(leer(path.join(SRC, 'arcade', 'hoja-del-muelle.tsx'))) &&
      !/\.empezada\b/.test(leer(path.join(SRC, 'arcade', 'muelle-escena.tsx'))),
  );
}

paso('La cámara de Riberas en tres dimensiones se puede mover con el dedo');
{
  /*
   * ═══ EL FALLO QUE ESTO VIGILA NO SE VE EN NINGÚN COMPROBADOR DE TIPOS ═══
   *
   * Un `Gesture.Pan()` con `manualActivation(true)` tiene que llamar a
   * `estado.activate()` / `estado.fail()` él mismo, y esas dos SÓLO hacen algo
   * desde un worklet: en el hilo de JavaScript, `setGestureState` de Reanimated
   * avisa por consola y no cambia nada, así que el gesto se queda en `BEGAN` para
   * siempre. Con `.runOnJS(true)` en ese mismo gesto compila, no avisa en tipos, y
   * la cámara no gira en iOS ni en Android. Pasó en `mirador-tactil.ts`: se
   * copió el `runOnJS(true)` de `entrada.ts`, que sí puede llevarlo porque no
   * activa nada a mano.
   *
   * Se mira cada CADENA de gesto por separado —de un `Gesture.` al siguiente— y no
   * el fichero entero, porque en el mismo fichero conviven un arrastre worklet y
   * una pinza en JS, y las dos están bien.
   */
  const carpeta = path.join(SRC, 'arcade');
  const ficheros = fs.readdirSync(carpeta).filter((f) => /\.tsx?$/.test(f));
  const conActivacionManualEnJs = [];
  for (const f of ficheros) {
    const texto = leer(path.join(carpeta, f));
    const cadenas = texto.split(/(?=Gesture\.)/g).slice(1);
    for (const cadena of cadenas) {
      if (/manualActivation\(/.test(cadena) && /runOnJS\(\s*true\s*\)/.test(cadena)) {
        conActivacionManualEnJs.push(f);
      }
    }
  }
  comprobar(
    'ningún gesto de `app/src/arcade` con `manualActivation(` lleva `runOnJS(true)`',
    conActivacionManualEnJs.length === 0,
    conActivacionManualEnJs,
  );

  const tactil = leer(path.join(SRC, 'arcade', 'mirador-tactil.ts'));
  comprobar(
    '`mirador-tactil.ts` guarda lo que cruza de hilo en `useSharedValue`',
    /useSharedValue/.test(tactil) && /from 'react-native-reanimated'/.test(tactil),
    'una referencia de React no se ve desde el worklet: el gesto entraría y la cámara no se movería',
  );
  comprobar(
    'y el arrastre con activación manual decide con `estado.activate()` y `estado.fail()`',
    /manualActivation\(true\)/.test(tactil) && /estado\.activate\(\)/.test(tactil) && /estado\.fail\(\)/.test(tactil),
  );
  comprobar(
    'y vuelve a JavaScript sólo para mover el mirador, con `runOnJS(mover)`',
    /runOnJS\(mover\)\(/.test(tactil),
  );
}

paso('La pantalla de Riberas en tres dimensiones no sabe reglas y no bombea');
{
  const escena = leer(path.join(SRC, 'arcade', 'riberas-en-tres-escena.tsx'));

  /*
   * `tableroEnTres` devuelve `null` también con cinco o seis colonos aunque haya
   * islas (el atlas sólo trae cuatro colores). Una pantalla que decida «se está
   * reuniendo la mesa» sólo con `datos === null` enseña a una mesa de cinco
   * empezada decenas de botones y ningún tablero. Tiene que preguntar a
   * `seVeEnTres` y caer al retablo.
   */
  comprobar(
    'la escena importa `seVeEnTres` de la traducción compartida',
    /import \{[^}]*\bseVeEnTres\b[^}]*\} from '\.\.\/\.\.\/\.\.\/shared\/arcade\/juegos\/riberas-en-tres'/.test(escena),
  );
  comprobar('y lo usa para decidir la rama, no sólo lo importa', /seVeEnTres\(laVista\)/.test(escena));
  comprobar(
    'y con más de cuatro lo dice en la nota del respaldo',
    /Sois más de cuatro/.test(escena),
  );

  /*
   * La corrección de retrato es UNA y vive en `escenas/camara.ts`: proyectar
   * esquinas con `three` y ajustar a límites asimétricos daba un factor de 2,18 en
   * apaisado y bombeaba al inclinar. Si vuelve, vuelve el bombeo.
   */
  /*
   * Se buscan los IDENTIFICADORES —declaración, prop o argumento— y no la palabra
   * suelta: «contorno» es también castellano corriente en los comentarios de la hoja.
   */
  comprobar(
    'no queda ningún encuadre por proyección en la pantalla',
    !/factorQueEncaja\(|const LIMITE\b|LIMITE\.|const contorno\b|contorno=\{|contorno:\s*readonly|\.project\(/.test(escena),
    'la única corrección de retrato es `alejarseParaQueQuepa` dentro de `ojoDelMirador`',
  );
  /*
   * ESTA COMPROBACIÓN CAMBIÓ DE FORMA CUANDO LLEGÓ EL ACERCAMIENTO, y no de fondo.
   * Pedía ver `ojoDelMirador(m, alcance * acercamiento.current, proporcion)`, que
   * era la llamada de cuando el acercamiento era un número suelto y se miraba
   * siempre al centro. Ahora la distancia la reparte `ojoYMira` —es su argumento— y
   * `ojoDelMirador` entra dentro como función. Lo que hay que seguir comprando es
   * exactamente lo de antes: que la PROPORCIÓN del lienzo llega hasta ahí, porque
   * sin ella la corrección de retrato de `camara.ts` queda muerta y el delta se sale
   * por los lados en un móvil.
   */
  comprobar(
    'y `Ojo` compone `ojoYMira` con `ojoDelMirador`, pasándole la proporción del lienzo',
    /ojoYMira\(\s*cercania\.current,\s*alcance,\s*\(d\)\s*=>\s*ojoDelMirador\(m, d, proporcion\)/.test(
      escena,
    ),
    'sin la proporción la corrección de `camara.ts` queda muerta',
  );

  /* La semilla y la ruta de modelos son las compartidas, no copias. */
  comprobar(
    'la semilla del delta es la de `shared/mecanicas/semilla.ts`, sin copia local',
    /from '\.\.\/\.\.\/\.\.\/shared\/mecanicas\/semilla'/.test(escena) && !/0x811c_9dc5/.test(escena),
  );
  comprobar(
    'y la ruta del tablero sale de `escenas/ruta-de-modelos.ts`, no de las figuras del embarcadero',
    /from '\.\.\/\.\.\/\.\.\/escenas\/ruta-de-modelos'/.test(escena) && !/from '[^']*embarcadero\/figuras'/.test(escena),
  );

  /* Las islas se firman por contenido para que la escena no reconstruya el mundo en cada sondeo. */
  comprobar(
    'las islas se reutilizan por firma de contenido entre revisiones',
    /islasVistas/.test(escena) && /antes\.firma === firma \? antes\.islas : crudo\.islas/.test(escena),
    'sin la firma, cada sondeo recalcula relieve, red y plan y los resube a la GPU',
  );

  /*
   * EL DELTA SE MONTA EN LAS DOS PLATAFORMAS, Y NINGUNA DECISIÓN POR `Platform.OS`
   * MANDA AL RETABLO.
   *
   * Durante meses aquí había dos comprobaciones del revés: que existiera
   * `EL_DELTA_SE_VE_AQUI = Platform.OS === 'web'` y que el móvil no pidiera el modelo,
   * porque Hermes no decodifica el PNG empotrado de `tablero.glb` y el delta llegaba
   * sin un solo color. El 5-9-2026 el atlas se compiló a bytes
   * (`escenas/atlas-del-tablero.ts`) y el complemento `texturasDelTablero` lo monta
   * como `DataTexture`: la constante se borró y aquellas dos cayeron, como estaba
   * escrito que caerían. Las de ahora vigilan que no vuelva por la puerta de atrás:
   * un `Platform.OS` que decidiera si se pinta el delta dejaría al teléfono en dos
   * dimensiones sin que nada se pusiera rojo, y un `register(texturasLisas)` lo
   * dejaría gris.
   */
  const codigoDeLaPantalla = escena.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l));
  const lineasConPlataforma = codigoDeLaPantalla.filter((l) => /Platform\.OS/.test(l));
  comprobar(
    'en el código de la escena `Platform.OS` sólo decide las sombras, nunca si se pinta el delta',
    lineasConPlataforma.length > 0 &&
      lineasConPlataforma.every((l) => /shadows=/.test(l)) &&
      !/EL_DELTA_SE_VE_AQUI|NOTA_DEL_MOVIL/.test(codigoDeLaPantalla.join('\n')),
    lineasConPlataforma.map((l) => l.trim()),
  );

  /*
   * LA RED BAJO EL LIENZO. Los tres respaldos de la pantalla se deciden ANTES de montar
   * el Canvas; un throw DENTRO del lienzo —una textura que expo-gl no quiere, un
   * sombreador que no compila en esa GPU— no lo recoge ninguno, y en producción cierra
   * la app. La primera vez que el delta 3D se monta en un teléfono real es la víspera de
   * una partida: si el lienzo cae, se apunta el motivo (el parte de fallos lo enseña al
   * volver a abrir) y se sigue jugando sobre el retablo. Se exige que el Canvas vaya
   * dentro de la red, que la red apunte, y que la pantalla tenga la rama que cae al
   * retablo: quitar cualquiera de las tres deja al teléfono sin partida.
   *
   * La red es la del CONTRATO DE PINTOR (`pintor-propio.tsx`) desde que las tres pantallas
   * dejaron de tener cada una la suya: se exige que ésta monte ESA y ninguna propia
   * (`montaLaRedDelContrato`) y que ésa apunte (`laRedDelContratoApunta`, arriba del todo).
   */
  const contratoDePintor = leer(path.join(SRC, 'arcade', 'pintor-propio.tsx'));
  const dondeLaRed = codigoDeLaPantalla.join('\n');
  const abreLaRed = dondeLaRed.indexOf('<RedDelLienzo juego={juego} alCaer={ponerElLienzoCayo}>');
  const elCanvas = dondeLaRed.indexOf('<Canvas');
  const cierraLaRed = dondeLaRed.indexOf('</RedDelLienzo>');
  comprobar(
    'el Canvas del delta va dentro de la red que cae al retablo si el lienzo revienta al pintar',
    abreLaRed >= 0 && elCanvas > abreLaRed && cierraLaRed > elCanvas,
    { abreLaRed, elCanvas, cierraLaRed },
  );
  comprobar(
    'y la red es la del contrato de pintor, que apunta el fallo antes de caer para que el parte lo cuente al volver a abrir',
    montaLaRedDelContrato(dondeLaRed) &&
      laRedDelContratoApunta(contratoDePintor) &&
      /if \(elLienzoCayo !== null\)[\s\S]*?respaldoSobreElRetablo\(/.test(dondeLaRed),
  );
  comprobar(
    'la rama del respaldo decide sólo por islas y por colonos, y el fallo de carga sigue teniendo la suya',
    /if \(datos === null \|\| encuadre === null\) \{/.test(escena) &&
      /seVeEnTres\(laVista\)\s*\?\s*'El delta/.test(escena) &&
      /NOTA_DE_MAS_DE_CUATRO,/.test(escena) &&
      /if \(catalogo\.que === 'fallo'\) \{/.test(escena),
    'sin `seVeEnTres` una mesa de cinco vería el delta con dos colonos del mismo color',
  );
  comprobar(
    'y donde el motor no decodifica imágenes se registra el atlas compilado del tablero, no la blanca de los avatares',
    /if \(!decodificaImagenes\(\)\) cargador\.register\(texturasDelTablero\)/.test(escena) &&
      !/register\(texturasLisas\)/.test(escena) &&
      /usarCatalogoDelTablero\(\)/.test(escena),
    'con `texturasLisas` el delta llega al teléfono sin un solo color',
  );

  /*
   * LOS DADOS LLEGAN EN SU FICHERO Y SU FALLO NO TIRA EL TABLERO.
   *
   * `dados.glb` es el D6 de KayKit horneado, unos kB, y se pide a la vez que el tablero
   * por la misma puerta HTTP (`rutaDeLosDados`, no una cadena escrita aquí). Lo que se
   * rompe en silencio es la RED: un `Promise.all` a secas sobre las dos peticiones
   * convierte un despliegue sin `dados.glb` en una partida sin tablero, cuando la escena
   * sabe pintar los dados del respaldo si el catálogo no trae `dado`. Se exige que la
   * promesa de los dados lleve su propio `.catch` que resuelve a `null` ANTES de entrar
   * en el `Promise.all`, y que los dos catálogos se unan con `unirCatalogos`.
   */
  comprobar(
    'los dados se piden por `rutaDeLosDados()` de `escenas/ruta-de-modelos.ts`, a la vez que el tablero',
    /rutaDeLosDados\(\)/.test(escena) &&
      /import \{[^}]*rutaDeLosDados[^}]*\} from '\.\.\/\.\.\/\.\.\/escenas\/ruta-de-modelos'/.test(escena) &&
      !/dados\.glb'/.test(codigoDeLaPantalla.join('\n')),
  );
  comprobar(
    'y su fallo no tira el tablero: la promesa de los dados lleva su `.catch` a `null` antes del `Promise.all`, y los catálogos se unen',
    /const dados = dadosPrometidos\(\)\.catch\(\(fallo: unknown\): null => \{[\s\S]{0,300}?return null;[\s\S]{0,40}?\}\);/.test(escena) &&
      /Promise\.all\(\[tablero, dados\]\)\.then\(\(\[delTablero, deLosDados\]\) => unirCatalogos\(delTablero, deLosDados\)\)/.test(escena) &&
      !/Promise\.all\(\[[^\]]*(rutaDelTablero|rutaDeLosDados|traer\()/.test(escena),
    'con `Promise.all` a secas, un 404 de `dados.glb` deja al teléfono sin delta',
  );
}

paso('El delta se puede mirar de cerca, recorrer, y siempre se puede volver');
{
  /*
   * ═══ LO QUE SE COMPRA AQUÍ, Y POR QUÉ NINGÚN OTRO COMPROBADOR LO COMPRA ═══
   *
   * La aritmética de acercarse y de pasear la mirada vive en `escenas/acercar.ts` y
   * la miden veinticuatro comprobaciones de `verify:escena`, con sus topes. Lo que
   * aquellas no pueden ver es si el CLIENTE la usa: `tsc` da por bueno un pellizco
   * que multiplique un factor a mano, un `lookAt(0, 0, 0)` que ignore el punto de
   * mira, o un acercamiento sin ninguna forma de deshacerse. Los tres compilan, los
   * tres pasan los tipos, y los tres se ven sólo con un móvil en la mano.
   *
   * Y son exactamente los tres fallos que ya estaban escritos en este fichero antes
   * de la fase: el acercamiento era un `number` con sus dos topes copiados en la
   * app, la cámara miraba siempre al origen —así que acercarse era acercarse
   * siempre al centro del delta— y la niebla se medía con el módulo de la posición
   * del ojo, que sólo vale mirando al centro.
   */
  const escena = leer(path.join(SRC, 'arcade', 'riberas-en-tres-escena.tsx'));
  const tactil = leer(path.join(SRC, 'arcade', 'mirador-tactil.ts'));

  /*
   * ═══ TODA REGLA DE PROHIBICIÓN MIRA EL CÓDIGO, NUNCA EL FICHERO ENTERO ═══
   *
   * Es la misma corrección que ya se pagó en `verify:gramatica` con la tabla del raíl,
   * y aquí se pagó otra vez: la cabecera de `Ojo` CUENTA que allí hubo un
   * `lookAt(0, 0, 0)` y por qué se fue, que es documentación correcta, y la primera
   * versión de aquella regla se ponía roja por ella. Una regla que castiga HABLAR de
   * algo enseña a no hablar de ello, y en esta casa las cabeceras cuentan los fallos
   * que se arreglaron: la regla que las persigue las borra.
   *
   * Se filtra una vez, aquí arriba, y lo usan TODAS las prohibiciones de esta sección
   * —dos de ellas seguían mirando el crudo—. Sale en dos formas porque hacen falta las
   * dos: la lista, para poder decir en qué línea; y el texto pegado, para las reglas
   * que buscan una forma repartida en varias líneas.
   */
  const soloCodigo = (texto) => texto.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l));
  const codigoDeLaEscena = soloCodigo(escena);
  const codigoDelGesto = soloCodigo(tactil);
  const escenaSinComentarios = codigoDeLaEscena.join('\n');
  const gestoSinComentarios = codigoDelGesto.join('\n');

  /* ─── La cámara mira adonde se mira, y no al origen ─── */

  comprobar(
    '`Ojo` saca el ojo Y el punto de mira de `ojoYMira`',
    /const \{ ojo, mira \} = ojoYMira\(/.test(escena),
    'con la posición sola no hay adónde mirar: se vuelve al centro del delta',
  );
  comprobar(
    'y la cámara apunta a ese punto de mira',
    /camara\.lookAt\(\.\.\.mira\)/.test(escena) && /camara\.position\.set\(\.\.\.ojo\)/.test(escena),
  );
  comprobar(
    'y NO queda ningún `lookAt(0, 0, 0)`, que es lo que dejaba el borde del delta sin poder mirarse',
    !codigoDeLaEscena.some((l) => /lookAt\(\s*0\s*,\s*0\s*,\s*0\s*\)/.test(l)),
    'mirando siempre al origen, acercarse es acercarse siempre a lo mismo',
  );
  comprobar(
    'la niebla se mide del ojo al punto de MIRA y no del ojo al origen',
    /\.distanceTo\([^;]*mira/.test(escena),
    'con el módulo de la posición, mirar de cerca una esquina metía la niebla por detrás de todo',
  );

  /* ─── Los dos dedos: uno acerca, dos pasean ─── */

  comprobar(
    'el pellizco acerca con `pellizcando` de `acercar.ts`',
    /cercania\.current = pellizcando\(cercania\.current, factorAlEmpezar\.current, e\.scale\)/.test(
      tactil,
    ),
  );
  /*
   * EL `minPointers(2)` SE LE PIDE AL PASEO Y NO AL FICHERO. Buscarlo suelto daba por
   * bueno cualquier gesto que lo llevara —y ahora hay tres—, de modo que el día que el
   * paseo lo perdiera se pelearía con el giro de un dedo sin que esto se enterase.
   */
  comprobar(
    'y el gesto de DOS DEDOS mueve la mirada con `arrastrandoLaMirada`',
    /const paseo = Gesture\.Pan\(\)[\s\S]{0,160}?\.minPointers\(2\)/.test(gestoSinComentarios) &&
      /cercania\.current = arrastrandoLaMirada\(/.test(gestoSinComentarios),
    'sin esto sólo se puede acercar al centro, y la comarca del canto no se ve nunca de cerca',
  );
  comprobar(
    'y le da el rumbo, el alcance y el tamaño del lienzo, que es lo que aquella función pide',
    /arrastrandoLaMirada\([\s\S]{0,300}?mirador\.current\.rumbo,[\s\S]{0,200}?cuantoMundo\.current,[\s\S]{0,80}?pantalla\.current/.test(
      tactil,
    ),
    'sin el rumbo, arrastrar mueve el mapa en diagonal en cuanto el tablero está girado',
  );

  /* ─── Y EN LA WEB, QUE ES DONDE ESTO SE JUEGA HOY, CON EL RATÓN ─── */

  /*
   * ═══ LAS REGLAS DE ARRIBA ESTABAN TODAS VERDES SOBRE ALGO QUE NO LLEGABA A NADIE ═══
   *
   * El pellizco y el paseo exigen DOS PUNTEROS de verdad, y durante meses la única
   * plataforma donde esta pantalla montaba el delta fue la web (hasta que el atlas se
   * compiló para el móvil, el 5-9-2026), o sea un navegador de escritorio con un ratón
   * o un panel táctil: uno da un puntero, el otro manda
   * `wheel` con `ctrlKey`, y ninguno da dos. Con las nueve comprobaciones anteriores en
   * verde, quien abría Riberas podía girar el tablero y nada más — ni acercarse, ni
   * mirar un borde, ni ver aparecer el botón de volver, que sólo sale cuando algo ha
   * movido la cercanía. Un acercamiento medido, comprobado y sin ninguna forma de
   * llegar a él.
   *
   * Así que aquí se comprueba la mano que de verdad hay delante. Las cuentas siguen
   * siendo de `acercar.ts`: lo único que este cliente traduce son las unidades de la
   * rueda, que el navegador no manda en ninguna.
   */
  comprobar(
    'en la web la RUEDA acerca, que es la única mano que hoy llega a este tablero',
    /addEventListener\('wheel'/.test(gestoSinComentarios) &&
      /cercania\.current = acercando\(/.test(gestoSinComentarios),
    'sin rueda, en la única plataforma donde el delta se monta no se puede acercar de ninguna manera',
  );
  comprobar(
    'y se apunta con `{ passive: false }` y para el suceso, o la Sala se desplaza al acercarse',
    /addEventListener\('wheel',[\s\S]{0,80}\{ passive: false \}/.test(gestoSinComentarios) &&
      /const rueda = \(e: WheelEvent\): void => \{\s*\n\s*e\.preventDefault\(\);/.test(
        gestoSinComentarios,
      ),
    'un oyente pasivo no puede quitarle la rueda al navegador, y la página se va hacia abajo',
  );
  comprobar(
    'y se descuelga: el lienzo aparece y desaparece con el respaldo, y los oyentes van con él',
    /removeEventListener\('wheel'/.test(gestoSinComentarios) &&
      /removeEventListener\('pointermove'/.test(gestoSinComentarios),
    'oyentes que se acumulan en cada montaje acercan el doble, el triple, y no se ve por qué',
  );
  comprobar(
    'y los tres modos de la rueda se traducen a lo mismo (Firefox la manda en LÍNEAS)',
    /deltaMode === 1/.test(gestoSinComentarios) && /deltaMode === 2/.test(gestoSinComentarios),
    'tres líneas leídas como tres píxeles son un zoom que no se mueve',
  );
  /*
   * ═══ Y CON LOS MISMOS CUATRO NÚMEROS QUE EL ESCRITORIO, QUE SE HABÍAN SEPARADO ═══
   *
   * `mirador-tactil.ts` decía que sus números eran una copia de los del escritorio, y ya no lo
   * eran: el escritorio pasó a contar el modo línea EN LÍNEAS —tres por muesca— y esta copia se
   * quedó pasándolas por dieciséis píxeles, o sea media muesca: en Firefox la rueda acercaba a la
   * mitad de velocidad en la app y a la entera en el PC, en la misma máquina. Se leen los cuatro de
   * los dos ficheros y se comparan; un número que falte en cualquiera de los dos es rojo, no igual.
   */
  const NUMEROS_DE_LA_RUEDA = ['PIXELES_POR_MUESCA', 'LINEAS_POR_MUESCA', 'MUESCAS_POR_PAGINA', 'MUESCAS_DE_GOLPE'];
  const numerosDeLaRueda = (texto) => NUMEROS_DE_LA_RUEDA.map((n) => new RegExp(`const ${n} = (\\d+);`).exec(texto)?.[1] ?? null);
  const losDelEscritorio = numerosDeLaRueda(leer(path.resolve(SRC, '..', '..', 'escritorio', 'src', 'lienzo-propio.tsx')));
  const losDeAqui = numerosDeLaRueda(gestoSinComentarios);
  comprobar(
    'y la rueda cuenta con LOS MISMOS cuatro números que el escritorio —el modo línea en líneas, tres por muesca—: son los dos clientes de la misma partida en la misma máquina',
    losDeAqui.every((n) => n !== null) &&
      JSON.stringify(losDeAqui) === JSON.stringify(losDelEscritorio) &&
      /e\.deltaMode === 1\s*\?\s*e\.deltaY \/ LINEAS_POR_MUESCA/.test(gestoSinComentarios) &&
      !/PIXELES_POR_LINEA/.test(gestoSinComentarios),
    { losDeAqui, losDelEscritorio },
  );
  comprobar(
    'el paseo de la mirada también existe con ratón: botón secundario o Mayúsculas',
    /e\.button === 2 \|\| e\.shiftKey/.test(gestoSinComentarios),
    'sólo con rueda se acerca siempre al centro, y el borde del delta sigue sin poder mirarse',
  );
  comprobar(
    'y no se pelea con el giro: mientras el ratón pasea, el `Pan` de un puntero se falla',
    /elRatonPasea\.value = pasea/.test(gestoSinComentarios) &&
      /if \(deLaInterfaz\.value \|\| elRatonPasea\.value\)/.test(gestoSinComentarios),
    'el mismo arrastre girando el tablero y moviendo la mirada a la vez es un bandazo',
  );
  /*
   * El nodo se le da SIEMPRE: a pie quien se calla es el gancho (`apagado`), y eso lo compra el
   * bloque de andar («Riberas a pie en la app»). Aquí antes se aceptaba también la forma con la
   * guarda —`aPie ? undefined :`—, que era la otra mitad del interruptor escrita en la pantalla;
   * desde que el gancho se apaga entero, esa guarda sería un segundo interruptor y no se acepta.
   */
  comprobar(
    'y la pantalla le da el nodo del lienzo, que es donde se escucha, siempre y sin guarda',
    /ref=\{apuntarElLienzo\}/.test(escenaSinComentarios),
    'sin el nodo no hay dónde apuntarse: en React Native Web el `onWheel` del `View` no basta',
  );

  /* ─── La salida, que es lo que separa un zoom de una trampa ─── */

  /*
   * EL RÓTULO SE VE CORTO Y SE OYE ENTERO. Lo escrito es «Tablero entero» porque este
   * botón está ENCIMA del tablero y cada punto de ancho es un cuadrado que deja de
   * poder tocarse; el nombre accesible sigue siendo la frase entera —lo comprueba la
   * regla de accesibilidad de tres más abajo— y contiene al rótulo palabra por palabra,
   * que es lo que hace falta para poder pedirlo en voz alta.
   */
  comprobar(
    'hay un botón de la Sala con el rótulo «Tablero entero»',
    /<Text style=\{estilos\.volverRotulo\}>Tablero entero<\/Text>/.test(escena),
    'una tecla escondida no existe en un móvil, y volver tiene que poder verse',
  );
  /*
   * ═══ Y NO VIVE EN EL BORDE DE LA MANO ═══
   *
   * La baraja de `escenas/baraja.ts` está pegada al canto DERECHO y crece hacia arriba:
   * apretada al tope, la carta de arriba llega a 0,04 del alto del lienzo —14 px en uno
   * de 360— y este botón ocupa de 12 a 56. O sea que estando arriba a la derecha tapaba
   * la carta que hay que arrastrar para proponer un trueque. La cuenta entera, con los
   * pasos de la baraja y con la barra de construir, está en la cabecera del estilo.
   */
  const estiloDelBoton = /\n  volver: \{([\s\S]*?)\n  \},/.exec(escena)?.[1] ?? '';
  comprobar(
    'y no está en la esquina de la mano: se ancla a la izquierda y no a la derecha',
    /left:/.test(estiloDelBoton) && !/right:/.test(estiloDelBoton),
    'con trece cartas la baraja ya se le mete debajo, y con la mano llena siempre',
  );
  comprobar(
    'y devuelve la vista con `verElTableroEntero`, que es `comoAlPrincipio()`',
    /onPress=\{verElTableroEntero\}/.test(escena) &&
      /cercania\.current = comoAlPrincipio\(\)/.test(tactil),
  );
  comprobar(
    'y sólo se enseña cuando hace falta, mirando `estaComoAlPrincipio`',
    /seHaMovido \?/.test(escena) && /!estaComoAlPrincipio\(cercania\.current\)/.test(tactil),
    'un botón para volver a donde ya estás es ruido encima del tablero',
  );
  comprobar(
    'y es accesible: papel de botón y etiqueta propia',
    /accessibilityRole="button"[\s\S]{0,160}accessibilityLabel="Ver el tablero entero"/.test(escena),
  );
  /*
   * El aviso a React va por el CAMBIO y no por fotograma: si `seHaMovido` se
   * anunciara en cada `onUpdate`, la mesa entera —barra, turno, crónica— se
   * repintaría sesenta veces por segundo mientras dura un pellizco.
   */
  comprobar(
    'y el aviso a React sólo salta cuando cambia, no en cada fotograma',
    /if \(ahora === seLeDijo\.current\) return;/.test(tactil),
    'sesenta repintados por segundo de la mesa entera para no cambiar nada',
  );

  /* ─── Y ninguna cuenta de cámara vive en el cliente ─── */

  /*
   * LA REGLA ES LA DE LA CABECERA DE `acercar.ts`: una cuenta que vive en un fichero
   * con `three` o con React dentro no se puede comprobar en Node, hay que abrirla en
   * un aparato y mirar. Así que aquí no se escribe ninguna: cada valor nuevo de la
   * cercanía tiene que salir de llamar a una función de `acercar.ts`.
   *
   * No se persigue cualquier número: la niebla lleva sus factores de alcance y eso
   * es atmósfera, no cámara. Lo que se persigue es la ARITMÉTICA de la cámara.
   */
  const asignaciones = [
    ...gestoSinComentarios.matchAll(/cercania\.current\s*=\s*([A-Za-z_]\w*)\s*\(/g),
  ].map((m) => m[1]);
  const DE_ACERCAR = new Set(['acercando', 'pellizcando', 'arrastrandoLaMirada', 'comoAlPrincipio']);
  const forasteras = asignaciones.filter((f) => !DE_ACERCAR.has(f));
  const todasLasAsignaciones = (gestoSinComentarios.match(/cercania\.current\s*=[^=]/g) ?? []).length;
  comprobar(
    'cada valor nuevo de la cercanía sale de una función de `acercar.ts`',
    asignaciones.length >= 3 && forasteras.length === 0 && todasLasAsignaciones === asignaciones.length,
    forasteras.length > 0
      ? `de fuera de \`acercar.ts\`: ${forasteras.join(', ')}`
      : `${String(asignaciones.length)} asignaciones, ${String(todasLasAsignaciones)} en total`,
  );
  comprobar(
    'y la cercanía se importa de `escenas/acercar.ts`, no se declara aquí',
    /from '\.\.\/\.\.\/\.\.\/escenas\/acercar'/.test(tactil) &&
      !codigoDelGesto.some((l) => /ACERCAMIENTO_(MINIMO|MAXIMO)/.test(l)),
    'los topes estuvieron copiados aquí (0,55 y 1,25) y eran más cortos que los medidos',
  );
  comprobar(
    'ninguna potencia ni ningún módulo en la pantalla: la cámara no se calcula aquí',
    !codigoDeLaEscena.some((l) => /Math\.pow\(|Math\.hypot\(/.test(l)),
    'el módulo de la posición del ojo era la niebla vieja, y sólo valía mirando al centro',
  );
  const modulos = codigoDelGesto.filter((l) => /Math\.hypot\(/.test(l));
  comprobar(
    'y el único módulo del gesto es la zona muerta del dedo, en píxeles de pantalla',
    modulos.length === 1 && /MINIMO_PARA_GIRAR/.test(modulos[0] ?? ''),
    modulos,
  );
  comprobar(
    'ninguna potencia en el gesto tampoco',
    !codigoDelGesto.some((l) => /Math\.pow\(/.test(l)),
    'el paso del acercamiento es multiplicativo y esa potencia es de `acercar.ts`',
  );

  /*
   * ═══ Y LA CÁMARA NO SE RECOLOCA CUANDO JUEGA OTRO ═══
   *
   * La pantalla suelta lo cogido en cada revisión de la mesa —los anillos rancios
   * son una mentira—, y la tentación de al lado es soltar también la cámara. No:
   * quien está mirando una esquina de cerca se queda donde estaba aunque otro
   * juegue. Una cámara que salta con cada jugada ajena marea y hace imposible
   * construir. Se compra tocando la única forma que hay de moverla desde aquí.
   */
  comprobar(
    'la pantalla no escribe nunca la cercanía: la cámara no salta con la revisión de la mesa',
    !codigoDeLaEscena.some((l) => /cercania\.current\s*=[^=]/.test(l)),
    'la revisión cambia con cada jugada de cualquiera, y recolocar ahí es marear a quien construye',
  );
}

paso('El mazo de Riberas se juega desde la app, y en las DOS ramas');
{
  /*
   * ═══ QUÉ SE COMPRA AQUÍ, Y POR QUÉ NO LO COMPRA `verify:riberas-en-tres` ═══
   *
   * Las reglas del mazo son de `shared/arcade/juegos/riberas.ts` y las miden 270
   * comprobaciones; la traducción de la vista a lo que se pinta es de
   * `riberas-en-tres.ts` y la mide su propio guion con partidas de verdad. Ninguno de
   * los dos puede ver lo que esta pantalla hace con lo que le dan, y ahí caben los
   * fallos que compilan, pasan los tipos y sólo se ven jugando:
   *
   *   · pintar la mano de cartas Y dejar además los mismos movimientos como botones,
   *     o al revés — quitarlos de los botones en la rama que NO pinta la mano, que es
   *     la que hoy ve todo el móvil, y dejar las cartas sin ninguna manera de jugarse;
   *   · montar `{ tipo, carga }` a mano con el seudónimo y el bien, en vez de mandar
   *     la opción entera que dio el juego: la forma del movimiento pasa a estar
   *     escrita en dos sitios y el segundo no lo comprueba nadie;
   *   · tener las dos manos cogidas a la vez, que es lo que `escenas/cartas.ts` da por
   *     imposible para medir la separación de su franja contra las áreas de trueque;
   *   · preguntar a quién se le roba con las opciones de la revisión anterior;
   *   · enseñar en el marcador un segundo número de otro colono, que es información
   *     que no está en la vista de nadie.
   */
  const escena = leer(path.join(SRC, 'arcade', 'riberas-en-tres-escena.tsx'));
  const mueble = leer(path.join(SRC, 'arcade', 'tablero-en-linea.tsx'));
  /*
   * La misma regla que la sección de arriba y por lo mismo: toda prohibición mira el
   * CÓDIGO y nunca el fichero entero. Las cabeceras de esta pantalla cuentan los
   * fallos que evita —nombran `carga`, nombran COMPRAR— y una regla que castigue
   * hablar de algo enseña a no documentarlo.
   */
  const soloCodigo = (texto) => texto.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l));
  const codigoDeLaEscena = soloCodigo(escena);
  const escenaSinComentarios = codigoDeLaEscena.join('\n');

  /* El cuerpo del respaldo, para poder afirmar cosas SÓLO de esa rama. */
  const respaldo =
    /const respaldoSobreElRetablo = \(nota: string\): JSX\.Element => \{([\s\S]*?)\n  \};/.exec(
      escena,
    )?.[1] ?? '';
  comprobar(
    'se sabe leer la rama del respaldo, que es la que hoy ve todo el móvil',
    respaldo.length > 0 && /<Retablo/.test(respaldo),
    'sin este trozo, las tres reglas de abajo no estarían mirando nada',
  );

  /* ─── La mano llega a la escena, y llega traducida ─── */

  /*
   * LA MANO SALE COMPUESTA, Y ESA COMPOSICIÓN NO PUEDE VOLVER AL CLIENTE.
   *
   * Era `cartasEnTres(laVista, opciones)` a secas, y con eso la franja de la izquierda
   * enseñaba las cartas del mazo y NADA MÁS: quien ganaba El Vado Largo se llevaba los dos
   * puntos y no veía aparecer nada en su mano. `laManoDeLaIzquierda` pega los premios
   * delante, y vive en `shared/` para que las dos pantallas no puedan discrepar.
   *
   * Se prohíbe además `cartasEnTres` a secas en esta línea, y eso es lo que compra de
   * verdad: volver a la llamada de antes deja una pantalla que compila, pasa los tipos y
   * pierde otra vez los premios sin que se caiga ni un comprobador de reglas.
   */
  const manoDeLaEscena =
    /const cartasDelMazo = useMemo\(([\s\S]*?)\n  \);/.exec(escenaSinComentarios)?.[1] ?? '';
  comprobar(
    'la mano de la izquierda sale COMPUESTA (`laManoDeLaIzquierda`) y se le da a `<Delta>`',
    /laManoDeLaIzquierda\(laVista, opciones, yo\)/.test(manoDeLaEscena) &&
      !/cartasEnTres\(/.test(manoDeLaEscena) &&
      /cartasDelMazo=\{cartasDelMazo\}/.test(escena),
    'con `cartasEnTres` a secas la franja pinta las cartas y pierde los dos premios, y nada falla',
  );
  comprobar(
    'y con ella los tres avisos que la escena da: coger, jugar y revelar',
    /onCogerCartaDelMazo=\{alCogerCartaDelMazo\}/.test(escena) &&
      /onJugarCarta=\{alJugarCarta\}/.test(escena) &&
      /onRevelarCarta=\{alRevelarCarta\}/.test(escena) &&
      /cartaDelMazoCogida=\{cogidaDelMazo\}/.test(escena),
    'una mano que se pinta y no avisa de nada es un dibujo de una mano',
  );
  /*
   * EL TAPETE DEL TURNO LLEGA A `<Delta>`. La entrada es opcional y sin ella no se cae
   * nada: la mesa se pintaba sin tapete en la partida y con tapete sólo en el banco del
   * escritorio. Se exige que salga de `turnoEnTres(laVista)` —el color del turno compuesto
   * en `shared/`, el mismo reparto que las chozas— y no de un color escrito en la pantalla.
   */
  comprobar(
    'y el tapete del turno también: `<Delta>` recibe `turnoDe={turnoDe}` y `turnoDe` sale de `turnoEnTres(laVista)`',
    /<Delta[\s\S]*?turnoDe=\{turnoDe\}[\s\S]*?\/>/.test(escena) &&
      /const turnoDe = useMemo\(\(\) => turnoEnTres\(laVista\), \[laVista\]\);/.test(escenaSinComentarios),
    'sin esto la mesa sale sin tapete en la partida y nada falla',
  );

  /* ─── Las dos manos no pueden estar cogidas a la vez ─── */

  /*
   * NO ES COSMÉTICA: `escenas/cartas.ts` mide la franja de las cartas contra la
   * columna de áreas de trueque dando por hecho que las dos manos se excluyen, y lo
   * deja dicho —«esa exclusión la sostiene el cliente, no la geometría»—. Si las dos
   * pueden estar cogidas, las áreas y las casillas se pisan en un móvil de pie.
   */
  const cogerDelMazo = /const alCogerCartaDelMazo = useCallback\(([\s\S]*?)\n  \);/.exec(escena)?.[1] ?? '';
  const cogerBien = /const alCogerCarta = useCallback\(([\s\S]*?)\n  \);/.exec(escena)?.[1] ?? '';
  const tomarDeLaBarra = /const alTomarDeLaBarra = useCallback\(([\s\S]*?)\n  \);/.exec(escena)?.[1] ?? '';
  comprobar(
    'coger un naipe del mazo suelta el bien y la pieza de la barra',
    /ponerCogida\(null\)/.test(cogerDelMazo) &&
      /ponerTomada\(null\)/.test(cogerDelMazo) &&
      /ponerColocando\(null\)/.test(cogerDelMazo),
    'las dos manos cogidas a la vez pisan las áreas de trueque con las casillas de la mano',
  );
  comprobar(
    'y coger un bien —o una pieza— suelta el naipe, que es la vuelta de lo mismo',
    /ponerCogidaDelMazo\(null\)/.test(cogerBien) && /ponerCogidaDelMazo\(null\)/.test(tomarDeLaBarra),
    'la exclusión tiene que valer en las dos direcciones o no es una exclusión',
  );
  comprobar(
    'y al cambiar la revisión de la mesa se suelta TAMBIÉN el naipe y LAS TRES hojas abiertas',
    /ponerCogidaDelMazo\(null\);/.test(escenaSinComentarios) &&
      /ponerComoJugarla\(null\);\n    ponerComprando\(null\);\n  \}, \[\]\);/.test(escenaSinComentarios) &&
      /\}, \[vista\.rev, soltarTodo\]\);/.test(escenaSinComentarios),
    'una hoja abierta —«¿a quién le robas?», «¿compras una carta?»— con las opciones de antes manda un movimiento muerto',
  );

  /* ─── Jugar: se pregunta sólo cuando hay que elegir, y viaja la opción entera ─── */

  comprobar(
    'con una sola manera de jugarla se manda sin preguntar (`jugadaSinPreguntar`)',
    /const sola = jugadaSinPreguntar\(laVista, opciones, carta\.id\);/.test(escena),
    'preguntar «¿a quién?» en una mesa de dos, donde no hay a quién elegir, es un toque de más por carta',
  );
  comprobar(
    'y con varias se abre la hoja con TODAS las que ofrece el juego',
    /const todas = jugadasDeLaCarta\(laVista, opciones, carta\.id\);/.test(escena) &&
      /<HojaDeLaCarta/.test(escena),
    'la guardia pide a quién, el año bueno dos bienes y el acaparamiento uno: sin hoja no se pueden jugar',
  );
  /*
   * LO QUE VIAJA ES LA OPCIÓN ENTERA. Es la misma frontera que `SitioDeObra` con una
   * obra y `TruequePosible` con una oferta, y está escrita en `JugadaDeCarta`: si el
   * cliente montara la carga, la forma del movimiento —`{ carta, a }`, `{ carta,
   * bienes }`— quedaría escrita aquí además de en las reglas, y esta copia no la
   * comprueba nadie. Se persigue cualquier carga fabricada en esta pantalla.
   */
  comprobar(
    'el movimiento que se manda es el que dio el juego, sin montar ninguna carga aquí',
    /mesa\.mover\(\{ tipo: sola\.opcion\.tipo, carga: sola\.opcion\.carga \}\)/.test(escena) &&
      /mesa\.mover\(\{ tipo: j\.opcion\.tipo, carga: j\.opcion\.carga \}\)/.test(escena) &&
      !codigoDeLaEscena.some((l) => /carga:\s*\{/.test(l)),
    'una carga montada en el cliente es la forma del movimiento escrita en un segundo sitio',
  );
  comprobar(
    'revelar un título sale de `revelarDe`, y sin opción no se manda nada',
    /const revelar = revelarDe\(opciones, carta\.id\);/.test(escena) &&
      /if \(revelar === null\) return;/.test(escena),
    'revelar no se puede deshacer: una carta enseñada ya no se desenseña',
  );
  /*
   * La hoja del Año Bueno lleva QUINCE botones —los quince pares del §2 del diseño—,
   * y quince de 44 no caben en la caja del lienzo, que en el peor caso mide 360. Sin
   * el desplazamiento los últimos pares quedan recortados por el `overflow: hidden` y
   * no hay manera de llegar a ellos: una carta a la que le faltan jugadas y ni un
   * error en ninguna parte.
   */
  comprobar(
    'y la lista de la hoja se desplaza, que es lo que hace jugables los quince pares del año bueno',
    /<ScrollView style=\{estilos\.hojaLista\}/.test(escena) &&
      /hojaLista: \{[^}]*maxHeight:/.test(escena),
    'quince botones de 44 miden casi ochocientos puntos y la caja del lienzo mide 360',
  );

  /* ─── Comprar: ya no es un botón, es el cuarto hueco de la barra ─── */

  /*
   * AQUÍ SE EXIGÍA LO CONTRARIO, Y SE HA DADO LA VUELTA.
   *
   * La regla vieja decía «COMPRAR no se filtra con la mano y su botón sigue diciendo lo
   * que cuesta», y era verdad mientras el único sitio donde se ofrecía era el pie. Ahora
   * hay un cuarto hueco en la barra con un naipe tapado que se pulsa, así que dejar
   * también el botón sería ofrecer el mismo movimiento dos veces en la misma pantalla.
   *
   * No se borra: se le da la vuelta y se le añade la mitad que faltaba. Lo que hay que
   * impedir ahora son dos cosas a la vez —que salga dos veces con delta, y que no salga
   * NINGUNA sobre el respaldo— y las dos las ata el mismo dato: `opcionesFueraDeLaBarra`
   * recibe EL MAZO y no un interruptor, así que el botón desaparece exactamente donde el
   * naipe aparece.
   *
   * Desde la fase 4 lo que se le pasa es `mesaRecogida ? null : mazo`, que sigue siendo EL
   * MISMO OBJETO cuando la mesa está puesta y el mismo `null` que en el respaldo cuando está
   * recogida: el naipe baja con la mesa, así que la regla —«el botón desaparece exactamente
   * donde el naipe se puede pulsar»— se cumple igual. Lo prohibido sigue siendo un `boolean`
   * suelto o un filtro sin condición.
   */
  comprobar(
    'COMPRAR se cae del pie con `opcionesFueraDeLaBarra`, y pasándole EL MAZO, no un interruptor',
    /opcionesFueraDeLaBarra\(opcionesFueraDeLaMano\(opcionesFueraDelTablero\(opciones\)\), mesaRecogida \? null : mazo\)/.test(
      escenaSinComentarios,
    ),
    'con un `true` escrito a mano, el botón y el naipe se separan el día que uno de los dos cambie',
  );
  comprobar(
    'el cuarto hueco se lo pide a las reglas: `mazoEnLaBarra`, y ni rastro del coste de la carta',
    /const mazo = useMemo\(/.test(escenaSinComentarios) &&
      /mazoEnLaBarra\(laVista, yo, opciones\)/.test(escenaSinComentarios) &&
      !/COSTE_DE_LA_CARTA/.test(escena),
    'recalcular el coste en el cliente es la fuga contra la que existe `riberas-en-tres.ts`',
  );
  comprobar(
    'y se lo pasa a la escena por su entrada propia, con el aviso de pulsación',
    /mazo=\{mazo\}/.test(escena) && /onPulsarElMazo=\{alPulsarElMazo\}/.test(escena),
    'sin las dos entradas la barra sigue teniendo tres huecos y nadie se entera',
  );
  comprobar(
    'el nombre del movimiento sigue sin escribirse en la pantalla: se pide por `comprarEnTres`',
    /comprarEnTres\(opciones\)/.test(escenaSinComentarios) &&
      !codigoDeLaEscena.some((l) => /\bCOMPRAR\b|riberas:comprar/.test(l)),
    'colgar un movimiento de su identificador escrito a mano es colgarlo de un rótulo',
  );
  comprobar(
    'y en el móvil `laInterfazSeLoQueda()` va LA PRIMERA, antes de mirar si se puede',
    /const alPulsarElMazo = useCallback\(\(\) => \{\n    laInterfazSeLoQueda\(\);/.test(escenaSinComentarios),
    'el WeakSet de camara.ts no puede casar los dos sucesos en nativo: sin esta línea el giro le roba el dedo',
  );
  comprobar(
    'y se CONFIRMA siempre, aunque la opción sea única: pulsar el mazo abre la hoja y no manda nada',
    /ponerComprando\(comprar\);\n  \}, \[laInterfazSeLoQueda, mesa\.quieto, opciones\]\);/.test(
      escenaSinComentarios,
    ) && !/const alPulsarElMazo = useCallback\(\(\) => \{[\s\S]*?mesa\.mover\([\s\S]*?\n  \}, \[laInterfazSeLoQueda/.test(escenaSinComentarios),
    'el naipe vive en la franja de abajo, donde el pulgar ya está: un roce gastaría tres bienes que no vuelven',
  );
  comprobar(
    'la hoja de comprar va FUERA del GestureDetector, hermana de las otras dos',
    /<HojaDeComprar/.test(escena) &&
      escena.indexOf('</GestureDetector>') < escena.indexOf('<HojaDeComprar'),
    'un Pressable dentro del detector le pelea el toque al giro del tablero',
  );
  comprobar(
    'y no redacta ni una palabra de la jugada: rótulo y ayuda son los del juego',
    /\{comprar\.rotulo\}/.test(escena) && /\{comprar\.ayuda\}/.test(escena),
    'lo que cuesta una carta y cuántas quedan son reglas de Riberas, no texto de esta pantalla',
  );
  comprobar(
    'y el botón del mueble sigue diciendo su ayuda, que es lo que salva al respaldo',
    /\{o\.ayuda\}/.test(mueble),
    'sobre el retablo comprar sigue siendo un botón, y su coste va en la ayuda',
  );

  /* ─── El respaldo: donde no hay franja, las cartas son botones ─── */

  comprobar(
    'el respaldo NO quita las opciones de la mano: ahí las cartas se juegan por botón',
    respaldo.length > 0 &&
      !/opcionesFueraDeLaMano/.test(respaldo) &&
      /opcionesSueltas\(tableroEntero, opciones\)/.test(respaldo),
    'sobre el retablo no hay mano que pintar: quitarlas dejaría el móvil con cartas y sin jugarlas',
  );
  comprobar(
    'y el marcador se ve también ahí, que es la rama que hoy ve todo el móvil',
    /<ElMarcador marcador=\{marcador\} \/>/.test(respaldo),
    'un marcador que sólo saliera con el delta no lo vería nadie que juegue desde el teléfono',
  );

  /* ─── EL TRUEQUE EN EL RETABLO, que es la única pantalla de una mesa de cinco o de seis ─── */

  /*
   * ═══ POR QUÉ ESTO SE COMPRA AQUÍ Y CÓMO ═══
   *
   * `MANIFIESTO_RIBERAS.jugadores` admite hasta SEIS y el atlas trae CUATRO colores de
   * jugador, así que con el quinto sentado el respaldo deja de ser un respaldo: es la partida
   * entera, en el teléfono. Y hasta esta fase ahí las propuestas de trueque no se veían —el
   * pregón cuelga de la cinta del delta— y aceptar era un botón suelto del retablo, a UN
   * toque, o sea sin la confirmación que Miguel pidió.
   *
   * Se compra por EXPRESIÓN REGULAR sobre el fuente y no ejecutando, por lo mismo que el
   * resto de este guion: detrás de esta pantalla hay React Native y no se puede montar en
   * Node. Que React haga con esto lo que se espera lo compra `verify:escritorio` sobre el
   * mueble hermano, renderizado de verdad; y que las cuentas del componedor sean las del
   * motor lo compra `verify:riberas-en-tres` jugándolas por el árbitro. Lo que se compra
   * aquí es que las dos plataformas hagan LO MISMO, que es la regla de esta casa.
   */
  comprobar(
    'el pregón se pinta en el respaldo, que es donde se juegan las mesas de cinco y de seis',
    /<ElPregonEnElRetablo pregon=\{pregon\} abierta=\{tratoAbierto\} alAbrir=\{ponerTratoAbierto\} \/>/.test(respaldo),
    'sin él, en una mesa de cinco las propuestas de trueque no se ven en ninguna parte',
  );
  comprobar(
    'y va ANTES del tablero: la caja del retablo se come lo que queda de pantalla, y lo que quede debajo empieza fuera del canto',
    respaldo.indexOf('<ElPregonEnElRetablo') > 0 &&
      respaldo.indexOf('<ElPregonEnElRetablo') < respaldo.indexOf('<Retablo'),
    'lo que hay que contestar tiene que verse sin buscarlo',
  );
  comprobar(
    'la tira ENTERA es el botón y no lleva ninguno dentro: aceptar cuesta dos toques y el primero no está encima del segundo',
    /<Pressable[\s\S]{0,400}?style=\{estilos\.pregonTira\}/.test(escena) &&
      !/estilos\.pregonTira[\s\S]{0,600}?<Pressable/.test(escena),
    'un botón de aceptar dentro de la tira es exactamente lo que Miguel pidió que no pasara',
  );
  comprobar(
    'y la hoja es donde se confirma, modal y con los rótulos que escribe el juego',
    /<HojaDeLaPropuesta/.test(respaldo) &&
      /accessibilityViewIsModal/.test(/function HojaDeLaPropuesta\(\{[\s\S]*?\n\}\r?\n/.exec(escena)?.[0] ?? ''),
    'sin hoja, la tira no serviría para nada y aceptar seguiría siendo un toque',
  );
  /*
   * CONTESTAR NO SALE ADEMÁS COMO BOTÓN, y aquí son DOS caminos y no uno: las acciones del
   * tablero —que `Retablo` pinta a un toque— y las opciones sueltas del pie. Los dos filtros
   * reciben EL PREGÓN y no un interruptor, para que donde no hay tiras que pulsar los botones
   * se queden: sin eso, un mirón se quedaría mirando una propuesta que no puede contestar.
   */
  comprobar(
    'contestar se va por los DOS caminos —las acciones del tablero y los botones del pie—, y los dos filtros reciben EL PREGÓN',
    /\.\.\.accionesFueraDelPregon\(tableroEntero, pregon\),/.test(respaldo) &&
      /opcionesFueraDelPregon\(\s*tableroEntero === null \? opciones : opcionesSueltas\(tableroEntero, opciones\),\s*pregon,\s*\)/.test(
        respaldo,
      ),
    'con los dos puestos, la misma pantalla ofrecería contestar dos veces; con ninguno, ninguna',
  );
  /*
   * ═══ Y EL PANEL «Trueques» TAMPOCO SE QUEDA, QUE ERA LA TERCERA COPIA Y FALTABA ENTERA ═══
   *
   * `panelesFueraDelPregon` no se usaba NI UNA VEZ en todo este cliente. Y el sitio donde
   * faltaba no es un rincón: `Retablo` pinta `tablero.paneles` debajo del mapa, y ésta es la
   * única pantalla que ve una mesa de CINCO o de SEIS, así que ahí el mismo trueque VIVO
   * salía dos veces —tira del pregón arriba, renglón de texto abajo— con dos redacciones
   * distintas. Es la regla de la casa: cada movimiento se enseña exactamente una vez.
   *
   * Se compra que el filtro reciba EL MISMO `pregon` que decide si se pinta la tira —no un
   * interruptor calculado aparte— y que lo que llega a `<Retablo>` sea el tablero YA
   * filtrado y no el entero, que es el único fallo silencioso posible aquí: filtrar a un
   * lado y pintar del otro. La misma regla, ejecutada de verdad sobre el árbol pintado, la
   * compra `verify:escritorio` en el mueble hermano, con cinco sentados.
   */
  comprobar(
    'y el panel «Trueques» del retablo se retira con el MISMO pregón: en una mesa de cinco el trueque vivo no se cuenta dos veces',
    /paneles: panelesFueraDelPregon\(tableroEntero\.paneles, pregon\),/.test(respaldo) &&
      /import \{[\s\S]*?\bpanelesFueraDelPregon,/.test(escena),
    'sin esto, la tira dice «1 piedra → 1 limo» y el panel de abajo «t1: Ana da piedra por limo a Bruno — propuesta»',
  );
  comprobar(
    'y lo que llega al Retablo es el tablero YA filtrado, no el entero: filtrar a un lado y pintar del otro es el fallo mudo de esta clase',
    /<Retablo tablero=\{tablero\}/.test(respaldo) && !/<Retablo tablero=\{tableroEntero\}/.test(respaldo),
    'el filtro tiene que llegar a lo que se pinta',
  );
  comprobar(
    'y el pregón se compone ANTES, con las opciones ENTERAS: al revés cada tira se quedaría sin los botones que cuelga',
    /const pregon = useMemo\(\(\) => elPregonEnTres\(laVista, yo, opciones\), \[laVista, yo, opciones\]\);/.test(escena),
    'es el mismo orden que el del mazo en la barra, y por el mismo motivo',
  );
  /*
   * EL COMPONEDOR: la única manera de montar una oferta de varios bienes con el dedo. Su
   * botón sale de la DECLARACIÓN —`elComponedor` la busca por la marca— y no de las acciones
   * del tablero, donde la declaración no llega a propósito.
   */
  comprobar(
    'el componedor se pinta en el respaldo, y sale de la declaración y no de la lista de acciones',
    /<ElComponedorEnElRetablo/.test(respaldo) &&
      /const componedor = useMemo\(\s*\(\) => elComponedor\(laVista, yo, opciones, loQueSeCompone\),/.test(escena),
    'sin él, en una mesa de cinco un tres por dos sólo se podría hacer por el cable',
  );
  comprobar(
    'y va DEBAJO del tablero: es de quien tiene el turno, que ya ha mirado el tablero, y sólo crece cuando se abre',
    respaldo.indexOf('<ElComponedorEnElRetablo') > respaldo.indexOf('<Retablo'),
    'arriba le quitaría al tablero el alto que el pregón sí se gana',
  );
  /*
   * Y AQUÍ NO SE DECIDE NINGUNA REGLA. Ni el tope por lado, ni cuántas fichas tengo, ni qué
   * bien no puede estar en los dos lados: lo que un «+» hace al pulsarse es guardar el estado
   * que ya viene dentro (`r.mas`), y va apagado exactamente cuando ese estado es `null`. Se
   * persigue la aritmética escrita a mano, que es la forma que tendría el fallo.
   */
  const elComponedorDeLaApp = /function ElComponedorEnElRetablo\(\{[\s\S]*?\n\}\r?\n/.exec(escena)?.[0] ?? '';
  comprobar(
    'el «+» y el «−» guardan el estado que trae el renglón y no suman ellos, ni saben el tope',
    elComponedorDeLaApp.length > 0 &&
      /ponerPuesto\(r\.mas\)/.test(elComponedorDeLaApp) &&
      /ponerPuesto\(r\.menos\)/.test(elComponedorDeLaApp) &&
      !/[+-]\s*1\b/.test(soloCodigo(elComponedorDeLaApp).join('\n')) &&
      !/TOPE_POR_LADO/.test(elComponedorDeLaApp),
    'dos clientes sumando el uno por su cuenta son dos aritméticas del tope, y la que se rompe es la del teléfono',
  );
  comprobar(
    'y el botón de proponer va apagado cuando no hay movimiento que mandar, diciendo por qué con la frase que escribe el juego',
    /const noSePuede = quieto \|\| componedor\.movimiento === null;/.test(elComponedorDeLaApp) &&
      /accessibilityHint=\{componedor\.porQueNo\.length > 0 \? componedor\.porQueNo : undefined\}/.test(elComponedorDeLaApp) &&
      /\{componedor\.porQueNo\}/.test(elComponedorDeLaApp),
    'un botón apagado y mudo es el mismo fallo que uno encendido que no juega, con menos tinta',
  );
  comprobar(
    'y ni una palabra del trueque redactada en esta pantalla: el rótulo, el resumen y los porqués salen de la traducción',
    /\{componedor\.rotulo\}/.test(elComponedorDeLaApp) &&
      /\{componedor\.resumen\}/.test(elComponedorDeLaApp) &&
      /accessibilityLabel=\{r\.seOyeMas\}/.test(elComponedorDeLaApp) &&
      !/fichas por lado/.test(elComponedorDeLaApp),
    'lo que la app diga de la regla y lo que diga el PC tienen que ser la misma frase',
  );

  /*
   * ═══ Y EL BOTÓN QUE ABRE SE APAGA CON LAS CUATRO VIVAS, IGUAL QUE EL DEL PC ═══
   *
   * No es lo mismo que apagar «Proponer», que está dentro: con cuatro propuestas en la mesa
   * no hay nada que montar, y para leer el porqué habría que abrir una caja de ocho
   * renglones. El §4.2 del diseño lo dice con estas palabras: «el mismo botón, con la misma
   * ayuda y el mismo apagado por las cuatro vivas» en las dos pantallas.
   *
   * Y el booleano viene de `shared/` —`componedor.noCabenMas`— y no de una cuenta escrita
   * aquí: con la comparación escrita dos veces, la que se queda atrás es la de este aparato.
   * Se compra ADEMÁS que se apague con COLOR y no con `opacity`, que apagaría también la
   * letra; eso ya lo caza `verify:gramatica`, y aquí se compra que el estilo que se pone sea
   * el mismo con el que este fichero apaga «Proponer».
   */
  comprobar(
    'y el botón que ABRE el componedor se apaga con las cuatro propuestas vivas, con la frase del juego y sin contar las vivas en esta pantalla',
    /style=\{\[estilos\.hojaBoton, componedor\.noCabenMas && estilos\.componedorApagado\]\}/.test(elComponedorDeLaApp) &&
      /if \(componedor\.noCabenMas\) return;/.test(elComponedorDeLaApp) &&
      /accessibilityState=\{\{ expanded: abierto, disabled: componedor\.noCabenMas \}\}/.test(elComponedorDeLaApp) &&
      /accessibilityHint=\{componedor\.ayuda\}/.test(elComponedorDeLaApp) &&
      !/PROPUESTAS_VIVAS/.test(elComponedorDeLaApp),
    'sin esto, con cuatro en la mesa el botón se abre, «Proponer» sale apagado dentro, y el porqué queda a ocho renglones de distancia',
  );

  /* ─── El marcador ─── */

  comprobar(
    'el marcador sale de `marcadorEnTres` y se pinta en las dos ramas',
    /const marcador = useMemo\(\(\) => marcadorEnTres\(laVista\), \[laVista\]\);/.test(escena) &&
      (escena.match(/<ElMarcador marcador=\{marcador\} \/>/g) ?? []).length === 2,
    'los puntos de cada colono y lo que queda de mazo se ven SIEMPRE (§4 y §5 del diseño)',
  );
  /*
   * EL NÚMERO GRANDE ES EL PÚBLICO EN LAS CUATRO FICHAS. Poner el total con lo oculto
   * en la propia haría que dos números de la misma fila y del mismo tamaño
   * significaran cosas distintas. Lo que sólo cuento yo va debajo, sumando desde el
   * público, y sólo cuando hay algo que decir.
   */
  comprobar(
    'la cifra grande es la PÚBLICA, y lo oculto va aparte y sumando desde ella',
    /<Text style=\{estilos\.fichaPuntos\}>\{colono\.puntos\}<\/Text>/.test(escena) &&
      /const soloMios = oculto === null \? 0 : oculto - colono\.puntos;/.test(escena) &&
      /soloMios > 0 \?/.test(escena),
    'con el total en la mía, comparar mi cifra con la de al lado es comparar dos cosas distintas',
  );
  /*
   * Y NO SE INVENTA UN SEGUNDO NÚMERO DE OTRO. `puntosConLoOculto` viene `null` en las
   * fichas ajenas y eso quiere decir «de éste no lo sé»; un `?? colono.puntos` lo
   * convertiría en un dato, y la pantalla enseñaría a los demás una cifra secreta que
   * no existe. Se persigue el respaldo, que es la única forma de que pase.
   */
  comprobar(
    'y de los demás no se enseña ningún total oculto: `null` es «no lo sé», no un cero',
    !codigoDeLaEscena.some((l) => /puntosConLoOculto\s*\?\?/.test(l)),
    'lo que no está en la vista no se puede pintar, ni con un valor por defecto',
  );
  /*
   * ═══ Y CUÁNTO MIDE LA CADENA DE CADA UNO, CON EL MÍNIMO SACADO DE LA REGLA ═══
   *
   * La cinta nombraba «Vado largo» a quien ya lo tenía y callaba con todos los demás. A
   * Miguel, que encadenó veredas y no vio el premio, esa cinta no le decía nada. Ahora
   * cada ficha lleva su cifra y, cuando el premio no es suyo, cuántas hacen falta.
   *
   * Lo que se persigue aquí es la FRASE ESCRITA A MANO. La primera versión de la ficha la
   * escribía ella —«vado N de M»— y mentía en el peor caso: al segundo que llegaba a cinco
   * le decía «vado 5 de 5», con cero puntos de premio, porque el premio sólo se mueve a
   * quien SUPERA al dueño. Ahora la escribe `shared/` con sus tres estados (`renglonDelVado`
   * la que se ve, `loQueSeOyeDelVado` la que se oye) y la ficha recibe el MARCADOR entero,
   * que es lo que hace falta para saber de quién es el premio. Un cinco o un «de» escritos
   * aquí serían una segunda copia de la bifurcación, y la copia es la que vuelve a mentir.
   */
  comprobar(
    'cada ficha dice cuánto mide su cadena, y la frase la escribe `shared/` (`renglonDelVado`), no la ficha',
    /const suVado = renglonDelVado\(colono, marcador\);/.test(escena) &&
      /<Text style=\{estilos\.fichaPie\}>\{suVado\}<\/Text>/.test(escena),
    'una frase escrita aquí tiene dos estados; la del vado tiene tres, y el tercero es el que decía «vado 5 de 5»',
  );
  comprobar(
    'y la que se OYE también: el `accessibilityLabel` la compone con `loQueSeOyeDelVado`',
    /loQueSeOyeDelVado\(colono, marcador\),/.test(escena) && !codigoDeLaEscena.some((l) => /su cadena mide/.test(l)),
    'la frase que se oía decía «de las 5» a quien ya tenía cinco, igual que la que se veía',
  );
  comprobar(
    'la ficha recibe el marcador entero, y ni el cinco ni el «de» se escriben en la pantalla',
    /<FichaDelColono key=\{c\.asiento\} colono=\{c\} marcador=\{marcador\} \/>/.test(escena) &&
      !codigoDeLaEscena.some((l) => /vado\b[^\n]*\bde (5|\$\{)/.test(l)) &&
      !codigoDeLaEscena.some((l) => /`vado \$\{/.test(l)),
    'un cinco escrito aquí y otro en el escritorio se separan el día que la regla cambie',
  );
  /*
   * EL MARCADOR NO FLOTA SOBRE EL LIENZO. Acercado del todo el delta llega de borde a
   * borde, así que todo cromo encima es tablero que deja de poder tocarse —la cabecera
   * del botón de volver tiene la cuenta entera—. El marcador se mira ANTES de decidir,
   * no mientras se arrastra una pieza, así que vive con el cromo de la mesa.
   */
  const estiloDelMarcador = /\n  marcador: \{([\s\S]*?)\n  \},/.exec(escena)?.[1] ?? '';
  comprobar(
    'y no se pone encima del lienzo: la cinta va en la columna, no flotando',
    estiloDelMarcador.length > 0 && !/position:/.test(estiloDelMarcador),
    'todo lo que flota sobre el delta es tablero que deja de poder tocarse',
  );
}

/*
 * `mover` DEVUELVE CÓMO ACABÓ, y lo devuelve con lo que ya calculaba.
 *
 * Los dados de la mesa de madera (`docs/LA-MESA-DE-RIBERAS.md` §5.3) ruedan al tocarlos
 * sin saber el número, y tienen que enterarse EN EL ACTO de que la tirada no va a llegar
 * —un doble toque, una revisión rancia— en vez de rodar seis segundos. La pantalla ya sabía
 * distinguirlo para escribir el aviso (`seIgnoro`, `r.ok`, el `catch`); lo que se exige
 * aquí es que esa misma decisión SALGA de `mover` como `'hecho' | 'rechazado' | 'sin-red'`,
 * sin una segunda lectura de la respuesta, y que el `catch` sea `'sin-red'` y no un
 * rechazo. Es la misma comprobación que lleva `verificar-escritorio` sobre su `mesa.ts`:
 * las dos mesas se copian el razonamiento y tienen que copiarse también esto.
 */
paso('Mover devuelve cómo acabó: hecho, rechazado o sin red, con lo que ya sabía');
{
  const fuente = leer(path.join(SRC, 'arcade', 'mesa.ts'));
  const codigo = fuente.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
  comprobar('el tipo está escrito con sus tres valores y nada más', /export type ResultadoDelMovimiento = 'hecho' \| 'rechazado' \| 'sin-red';/.test(codigo));
  comprobar('y `mover` lo promete en el contrato de la mesa', /mover: \(movimiento: MovimientoDeclarado\) => Promise<ResultadoDelMovimiento>;/.test(codigo));
  const cuerpo = /const mover = useCallback\(([\s\S]*?)\n    \[mesa\?\.rev, cabeceras\],/.exec(codigo)?.[1] ?? '';
  comprobar('se sabe leer el cuerpo de `mover`', cuerpo.length > 0 && /await fetch\(/.test(cuerpo));
  comprobar('ya no tira la promesa al suelo con `void (async`: la devuelve', !/void \(async/.test(cuerpo) && /\(async \(\): Promise<ResultadoDelMovimiento> =>/.test(cuerpo));
  comprobar('sin mesa o sin revisión no se manda nada y se contesta `rechazado`', /if \(donde === null \|\| rev === undefined\) return 'rechazado';/.test(cuerpo));
  comprobar(
    'una respuesta correcta es `hecho` salvo que la mesa volviera igual (`seIgnoro`) o el juego dijera por qué; un error del servidor es `rechazado`',
    /return !r\.ok \|\| seIgnoro \|\| loQueDijoElJuego\.length > 0 \? 'rechazado' : 'hecho';/.test(cuerpo),
  );
  const enElCatch = /catch \(error\) \{([\s\S]*?)\} finally/.exec(cuerpo)?.[1] ?? '';
  comprobar('y el `catch` —no hubo respuesta que leer— es `sin-red`, no un rechazo', /return 'sin-red';/.test(enElCatch) && !/'rechazado'/.test(enElCatch));
  comprobar('el `finally` sigue soltando `quieto` en las tres ramas', /finally \{\s*ponerQuieto\(false\);/.test(cuerpo));
}

/*
 * LOS DADOS EN LA PANTALLA: sólo donde caben, con la misma pregunta que la escena, y el
 * botón de tirar se va exactamente donde ellos están.
 *
 * Se lee el fuente porque en Node no hay lienzo que medir. Lo que hay que impedir es que la
 * pantalla decida el sitio con OTRA función o con OTRA medida que la escena (lienzos con
 * dados y botón, o sin ninguno de los dos), que filtre TIRAR antes de preguntar a
 * `dadosEnTres` (`porTirar` siempre falso: los dados no vibran nunca), que `quieto` no los
 * apague, que el toque no devuelva a la escena cómo acabó, o que en el móvil el giro le
 * robe el dedo al asa (`laInterfazSeLoQueda()` la primera). Y que tirar quede sólo al
 * alcance del dedo: la acción accesible existe mientras existan los dados.
 */
paso('Los dados en la pantalla: donde caben, el botón de tirar se va con ellos, y el toque vuelve con su resultado');
{
  const escena = leer(path.join(SRC, 'arcade', 'riberas-en-tres-escena.tsx'));
  const codigo = escena.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l)).join('\n');
  comprobar(
    'el sitio de los dados se decide con `huecosDeLaMesa` de `escenas/barra.ts` (la misma función que la escena) con el campo de 45° del Canvas y la medida del lienzo del `onLayout`',
    /import \{ huecosDeLaMesa \} from '\.\.\/\.\.\/\.\.\/escenas\/barra';/.test(escena) &&
      /const CAMPO_DE_LA_CAMARA = \(45 \* Math\.PI\) \/ 180;/.test(codigo) &&
      /fov: 45/.test(codigo) &&
      /huecosDeLaMesa\(cuantos, CAMPO_DE_LA_CAMARA, medida\.ancho \/ medida\.alto, medida\.alto\)\.dados !== null/.test(codigo) &&
      /const cuantos = barra\.length \+ \(mazo === null \? 0 : 1\);/.test(codigo),
    'con otra función u otra medida, habría lienzos con dados y botón, o sin ninguno de los dos',
  );
  comprobar(
    'sin sitio no hay dados (`null`, no apagados); con sitio salen de `dadosEnTres` con las opciones ENTERAS y `quieto` sólo los apaga',
    /if \(!haySitioParaLosDados\) return null;\s+const suyos = dadosEnTres\(laVista, yo, opciones\);\s+return suyos === null \|\| !mesa\.quieto \? suyos : \{ \.\.\.suyos, disponible: false \};/.test(codigo),
  );
  comprobar(
    'TIRAR se cae del pie con `opcionesFueraDeLaMesa` pasándole LOS DADOS (no un interruptor) y DESPUÉS de los tres filtros de siempre',
    /const fueraDelTablero = useMemo\(\s+\(\) => opcionesFueraDeLaMesa\(fueraDeLaBarra, mesaRecogida \? null : dados\),/.test(codigo) &&
      /const fueraDeLaBarra = useMemo\(\s+\(\) => opcionesFueraDeLaBarra\(opcionesFueraDeLaMano\(opcionesFueraDelTablero\(opciones\)\), mesaRecogida \? null : mazo\)/.test(codigo),
  );
  comprobar(
    'la escena recibe `dados={dados}` y `onPulsarLosDados={alPulsarLosDados}`',
    /<Delta[\s\S]*?dados=\{dados\}\s+onPulsarLosDados=\{alPulsarLosDados\}[\s\S]*?\/>/.test(escena),
  );
  const manejador = /const alPulsarLosDados = useCallback\(\(\): Promise<ResultadoDelMovimiento> => \{([\s\S]*?)\n  \}, \[/.exec(codigo)?.[1] ?? '';
  comprobar(
    'al pulsar el asa, `laInterfazSeLoQueda()` va LA PRIMERA, se manda la opción TIRAR del juego (`tirarEnTres`) por `mesa.mover` devolviendo su promesa, y sin opción o quieto se contesta `rechazado`',
    manejador.length > 0 &&
      /^\s*laInterfazSeLoQueda\(\);/.test(manejador) &&
      /if \(mesa\.quieto\) return Promise\.resolve\('rechazado'\);/.test(manejador) &&
      /const tirar = tirarEnTres\(opciones\);\s+if \(tirar === null\) return Promise\.resolve\('rechazado'\);/.test(manejador) &&
      /return mesa\.mover\(\{ tipo: tirar\.tipo, carga: tirar\.carga \}\);/.test(manejador) &&
      !/tipo: '/.test(manejador),
  );
  comprobar(
    'y la vista que envuelve el Canvas declara la acción accesible `tirar` mientras hay dados, y la atiende sólo si están disponibles',
    /accessibilityActions=\{dados !== null \? \[\{ name: 'tirar', label: 'Tirar los dados' \}\] : undefined\}/.test(codigo) &&
      /actionName === 'tirar' && dados !== null && dados\.disponible\) void alPulsarLosDados\(\);/.test(codigo),
  );
}

/**
 * RECOGER LA MESA EN LA APP (§6 del diseño, fase 4).
 *
 * ═══ LAS CUATRO PARTIDAS ROTAS EN SILENCIO QUE ESTO IMPIDE ═══
 *
 *   1. LA PARTIDA PARADA. Con la mesa recogida no hay dados que tocar ni naipe del mazo que
 *      pulsar, y `opcionesFueraDeLaMesa` / `opcionesFueraDeLaBarra` los siguen quitando del
 *      pie mientras la escena los reciba. El §6 deja recoger la mesa EN MI PROPIO TURNO y
 *      la deja recogida hasta que yo diga: sin devolver TIRAR y COMPRAR al pie, quien
 *      recoja antes de tirar se queda sin poder tirar y sin error en ninguna parte.
 *   2. LAS PIEZAS QUE SE MUEVEN AL RECOGER, si alguien arregla lo anterior pasándole `null`
 *      a `<Delta>`: `dados !== null` es la llave del quinto hueco y el mazo la del cuarto.
 *   3. LA CARTA PEGADA AL DEDO con la barra fuera de la pantalla y nada debajo.
 *   4. LA MESA QUE SUBE A MITAD DE ARRASTRE, si la vuelta sola no espera a que la mano
 *      quede vacía.
 *
 * Se lee el fuente porque todo esto vive dentro del `Canvas` o encima de él, y aquí no hay
 * `Canvas`; el aspecto se mira en el banco del escritorio, que monta el mismo `<Delta>`.
 */
paso('Recoger la mesa en la app: suelta lo cogido, devuelve tirar y comprar al pie, y vuelve sola al tocarme salvo con algo en la mano');
{
  const escena = leer(path.join(SRC, 'arcade', 'riberas-en-tres-escena.tsx'));
  const codigo = escena.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l)).join('\n');

  comprobar(
    'el estado vive en la pantalla y no se guarda: un `useState` a secas, y `<Delta>` lo recibe entero',
    /const \[mesaRecogida, ponerMesaRecogida\] = useState\(false\);/.test(codigo) &&
      /<Delta[\s\S]*?mesaRecogida=\{mesaRecogida\}/.test(escena),
  );
  comprobar(
    'recoger SUELTA lo cogido —por el mismo `soltarTodo` de los siete estados que usa el cambio de revisión— y sacar no suelta nada',
    /const alRecogerLaMesa = useCallback\(\(\) => \{\s*if \(!mesaRecogida\) soltarTodo\(\);\s*ponerMesaRecogida\(!mesaRecogida\);\s*\}, \[mesaRecogida, soltarTodo\]\);/.test(codigo),
  );
  comprobar(
    'con la mesa recogida, TIRAR y COMPRAR vuelven al pie: la cinta se compone con `null` en los dos filtros que la mesa se lleva',
    /opcionesFueraDeLaMesa\(fueraDeLaBarra, mesaRecogida \? null : dados\)/.test(codigo) &&
      /opcionesFueraDeLaBarra\(opcionesFueraDeLaMano\(opcionesFueraDelTablero\(opciones\)\), mesaRecogida \? null : mazo\)/.test(codigo),
  );
  comprobar(
    'y la ESCENA sigue recibiendo `dados` y `mazo` sin tocar: son la llave del quinto y del cuarto hueco, y con `null` las piezas se moverían al recoger',
    /<Delta[\s\S]*?mazo=\{mazo\}[\s\S]*?dados=\{dados\}[\s\S]*?\/>/.test(escena) &&
      !/<Delta[\s\S]*?(dados|mazo)=\{mesaRecogida/.test(escena),
  );
  /* `aPie` entra en las dependencias desde que se anda: la salida también espera a volver a la mesa. */
  const laVuelta = /const meTocaAhora = meToca\(laVista\);[\s\S]*?\}, \[meTocaAhora, cogida, cogidaDelMazo(?:, aPie)?\]\);/.exec(codigo)?.[0] ?? '';
  comprobar(
    'la mesa sale sola cuando `meToca` pasa de falso a verdadero (el FLANCO, con `meToca` de shared) y no cada vez que me toca',
    laVuelta.length > 0 &&
      /if \(meTocaAhora && !meTocabaAntes\.current\) laSalidaEspera\.current = true;/.test(laVuelta) &&
      /meTocabaAntes\.current = meTocaAhora;/.test(laVuelta) &&
      /import \{[\s\S]*?\bmeToca,/.test(escena),
    laVuelta.slice(0, 300),
  );
  comprobar(
    'y con una carta en la mano —el bien o el naipe— la salida ESPERA: una mesa que sube bajo un arrastre cambia lo que hay bajo el dedo a mitad de gesto',
    /if \(cogida !== null \|\| cogidaDelMazo !== null\) return;\s*laSalidaEspera\.current = false;\s*ponerMesaRecogida\(false\);/.test(laVuelta),
    laVuelta.slice(-300),
  );
  /*
   * EL BOTÓN. Fuera del `Canvas`, hermano del lienzo como el de «Tablero entero» —así se
   * lleva su propio toque sin quitárselo a la escena y el lector de pantalla lo anuncia
   * aparte—, cuadrado de 44 ARRIBA A LA IZQUIERDA y debajo de aquél.
   *
   * ═══ POR QUÉ NO ESTÁ ABAJO, QUE ES DONDE ESTUVO ═══
   *
   * Porque abajo se comía una esquina del asa de la choza y nadie lo veía. El sitio se
   * había medido tratando el asa como un rectángulo en el plano de la barra —canto
   * izquierdo en 48 puntos en 320×360— y el asa es una caja de 0,8 lados de fondo girada
   * 39,6°: su cara cercana se proyecta a 41,2. Y no es cosa de la esquina izquierda: la
   * barra está centrada, así que deja los mismos 41,2 puntos a los dos lados y un botón de
   * 44 no cabe en ninguna de las dos. `verify:escena` mide la silueta proyectada de todas
   * las asas contra el cuadrado del mando en los quince lienzos; aquí sólo se compra que
   * esta tabla de estilos diga los mismos tres números.
   *
   * Y LOS TRES NÚMEROS SE LEEN DE `escenas/mesa.ts`, no se copian: un botón medido allí y
   * colocado con otros números aquí no está medido. Este guion no puede importar TypeScript
   * de la escena en cualquier orden, así que se leen del texto del fichero —que es
   * exactamente lo que hace este guion con todo lo demás— y si la tabla deja de estar, esto
   * se cae en vez de comparar contra `undefined`.
   */
  const mesaTs = leer(path.resolve(SRC, '..', '..', 'escenas', 'mesa.ts'));
  const mando = /export const MANDO_DE_RECOGER = \{[\s\S]*?lado: (\d+),[\s\S]*?margen: (\d+),[\s\S]*?bajoElOtroMando: (\d+),/.exec(mesaTs);
  comprobar(
    '`MANDO_DE_RECOGER` sigue en `escenas/mesa.ts` con sus tres números: es de donde salen el sitio y el tamaño de este botón, y donde `verify:escena` los mide',
    mando !== null && Number(mando[1]) === 44 && Number(mando[2]) === 12 && Number(mando[3]) === 52,
    mando === null ? 'no está la tabla' : mando.slice(1, 4),
  );
  const ladoDelMando = Number(mando?.[1] ?? NaN);
  const margenDelMando = Number(mando?.[2] ?? NaN);
  const arribaDelMando = margenDelMando + Number(mando?.[3] ?? NaN);
  comprobar(
    'el botón de recoger existe sólo donde hay mesa que recoger (la misma condición con la que `<Delta>` monta la barra) y dice qué hace con todas sus letras',
    /\{catalogo\.que === 'listo' && (?:!aPie && )?\(barra\.length > 0 \|\| mazo !== null\) \? \(\s*<Pressable[\s\S]*?style=\{estilos\.recogerLaMesa\}[\s\S]*?onPress=\{alRecogerLaMesa\}[\s\S]*?accessibilityRole="button"\s+accessibilityLabel=\{mesaRecogida \? 'Sacar la mesa' : 'Recoger la mesa'\}/.test(codigo),
  );
  const estiloDelRecoger = /recogerLaMesa: \{([^}]*)\},/.exec(codigo)?.[1] ?? '';
  comprobar(
    'y está arriba a la izquierda, cuadrado del lado que dice `MANDO_DE_RECOGER` con su margen y bajado su `bajoElOtroMando` entero, con el cromo de `volver`: teja, contorno blanco al 40 % y radio de mando',
    estiloDelRecoger.includes(`top: ${arribaDelMando},`) &&
      estiloDelRecoger.includes(`left: ${margenDelMando},`) &&
      estiloDelRecoger.includes(`width: ${ladoDelMando},`) &&
      estiloDelRecoger.includes(`height: ${ladoDelMando},`) &&
      !/bottom:|right:/.test(estiloDelRecoger) &&
      /borderRadius: RADIO\.mando,\s*borderWidth: 1,\s*borderColor: conAlfa\(SALA\.blanco, 0\.4\),\s*backgroundColor: SALA\.teja,/.test(estiloDelRecoger),
    estiloDelRecoger.replace(/\s+/g, ' ').slice(0, 200),
  );
  /*
   * Y QUE LOS DOS MANDOS NO SE SOLAPEN NO SE MIDE EN PÍXELES DE RÓTULO: se apilan. «Tablero
   * entero» arranca en 12 y mide 44 de mínimo de dedo; éste arranca por debajo de los dos.
   * Con eso da igual lo que crezca el rótulo de arriba, que es lo que se quería.
   */
  const estiloDelVolver = /[^A-Za-z]volver: \{([^}]*)\},/.exec(codigo)?.[1] ?? '';
  comprobar(
    'el de recoger empieza por debajo de donde acaba «Tablero entero», así que los dos mandos del lienzo no pueden solaparse por mucho que crezca el rótulo de arriba',
    /top: 12,/.test(estiloDelVolver) &&
      /left: 12,/.test(estiloDelVolver) &&
      /minHeight: 44,/.test(estiloDelVolver) &&
      arribaDelMando >= 12 + 44,
    { volver: estiloDelVolver.replace(/\s+/g, ' ').slice(0, 120), recoge: arribaDelMando },
  );
}

// ---------------------------------------------------------------------------

/*
 * ═══ RIBERAS A PIE EN LA APP ═══
 *
 * El delta se anda con el paseo común de la escena (`escenas/andar-por-el-delta.tsx`), y lo
 * que es de esta pantalla es lo que sólo sabe un teléfono: la palanca, y que el mirador
 * táctil se APAGUE mientras se anda. Las dos cosas fallan sin decir nada: una palanca que no
 * sale deja al móvil sin poder andar —el escritorio anda con el teclado y la batería en
 * verde—, y un mirador encendido gira la mesa por debajo con el mismo pulgar que anda. Y la
 * tercera, que no se puede perder: la cámara de la MESA tiene que seguir siendo la de siempre,
 * el `Ojo` con su `ojoYMira`, y sólo en la mesa.
 *
 * Se lee el fuente porque todo esto vive dentro del `Canvas` o encima de él y aquí no hay
 * `Canvas`, y cada regla se ve CAER con su caso envenenado, como las del Burgo.
 */
paso('Riberas a pie en la app: la palanca sólo a pie, el mirador táctil apagado mientras se anda, y la cámara de la mesa la de siempre');
{
  const escena = leer(path.join(SRC, 'arcade', 'riberas-en-tres-escena.tsx'));
  const tactil = leer(path.join(SRC, 'arcade', 'mirador-tactil.ts'));
  const soloCodigo = (texto) =>
    texto
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l))
      .join('\n');
  /** Afirma la regla sobre el fichero de verdad, y la ve CAER con el caso envenenado. */
  const reglaDelFuente = (que, prueba, bueno, envenenado, porque) => {
    comprobar(que, prueba(bueno), porque);
    comprobar(
      `y «${que}» se ve CAER con el caso envenenado`,
      !prueba(envenenado),
      'una regla que no se ve caer puede estar mirando otra cosa, y entonces es verde para siempre',
    );
  };

  reglaDelFuente(
    'desde dónde se mira es un `useState` de la pantalla —mesa, hombro u ojos— y «a pie» es no estar en la mesa',
    (t) =>
      /const \[modo, ponerModo\] = useState<ModoDeCamaraDelDelta\['modo'\]>\('mesa'\);/.test(soloCodigo(t)) &&
      /const aPie = modo !== 'mesa';/.test(soloCodigo(t)),
    escena,
    escena.replace("const aPie = modo !== 'mesa';", "const aPie = modo === 'ojos';"),
    'si «a pie» no es todo lo que no es la mesa, al hombro se anda con la mesa encendida por debajo',
  );
  reglaDelFuente(
    'la palanca de Las Lindes sale SÓLO a pie, y escribe en la misma referencia que lee la escena',
    (t) => {
      const c = soloCodigo(t);
      return (
        /<MandosDelPaseo mandos=\{mandos\} visibles=\{aPie\} \/>/.test(c) &&
        /const mandos = useRef<MandosDeFuera>\(SIN_MANDOS_DE_FUERA\);/.test(c) &&
        /<Delta[\s\S]*?\bmandos=\{mandos\}[\s\S]*?\/>/.test(c) &&
        /import \{ MandosDelPaseo \} from '\.\/mandos-del-paseo';/.test(c)
      );
    },
    escena,
    escena.replace('<MandosDelPaseo mandos={mandos} visibles={aPie} />', '<MandosDelPaseo mandos={mandos} visibles />'),
    'sin la palanca en el teléfono no se anda: la escena lee el teclado, y en iOS y en Android no hay',
  );
  reglaDelFuente(
    'y la escena recibe la cámara, la VISTA —de ella sale `mundoDeRiberas`— y `traer`: el paseo es el común, y esta pantalla no da un paso',
    (t) => {
      const c = soloCodigo(t);
      return (
        /<Delta[\s\S]*?camara=\{camara\}\s+vista=\{laVista\}\s+traer=\{traer\}[\s\S]*?\/>/.test(c) &&
        /const camara: ModoDeCamaraDelDelta = modo === 'mesa' \? \{ modo: 'mesa' \} : \{ modo, asiento: yo \?\? '' \};/.test(c) &&
        !/\b(pasoDelTic|unPaso|fotogramaDelPaseo|usarElPaseo|teclaDelPaseo)\b/.test(c)
      );
    },
    escena,
    escena.replace('vista={laVista}', 'vista={datos}'),
    'con otra cosa que la vista la escena no sabe derivar el mundo, y a pie no se choca con nada',
  );

  /* ─── El mirador táctil, apagado a pie ─── */

  /*
   * A PIE EL MIRADOR SE APAGA, Y LO APAGA ÉL: `usarMiradorTactil(…, { apagado: aPie })`.
   *
   * Aquí se vigilaba un GEMELO APAGADO —los mismos tres gestos, deshabilitados— que la pantalla le
   * cambiaba al `GestureDetector` al bajar a andar, con la forma exigida igual a la del mirador para
   * que el detector no se volviera a enganchar. La forma no bastaba: `react-native-gesture-handler`
   * (2.32, `updateHandlers`) se queda con los gestos del PRIMER enganche y a los que llegan después
   * con la misma forma les copia encima la configuración y los manejadores. Corriendo el código de
   * la librería contra un módulo nativo de mentira: en una mesa normal, tras bajar a andar y volver,
   * los tres gestos se quedaban apagados y con los manejadores vacíos del gemelo; en una de botas,
   * que empieza a pie, tras subir y volver a bajar, se quedaban encendidos. Con `.enabled()` sobre
   * los MISMOS gestos, bien en las dos secuencias y antes de montar el detector.
   *
   * Así que se compran dos mitades, cada una en su fichero: que la pantalla le pase `aPie` al
   * gancho, lleve SIEMPRE el mismo gesto en el detector —ninguno construido aquí— y le dé siempre
   * el nodo; y que el gancho apague SUS gestos, en un efecto de maquetación —el detector manda la
   * configuración desde su efecto normal, que corre después—, y no apunte el ratón apagado.
   */
  const trozo = (texto, desde, hasta) => {
    const a = texto.indexOf(desde);
    const b = a < 0 ? -1 : texto.indexOf(hasta, a + desde.length);
    return a < 0 || b < 0 ? '' : texto.slice(a, b);
  };
  /*
   * EL GIRO SIGUE SIENDO DE TRABAJO, CON GEMELO O SIN ÉL. Aquí se exigía la forma del mirador para
   * que el gemelo la copiara, y la mitad de lo que se exigía no era del gemelo: que el giro —el
   * `Pan` con activación a mano— sea worklets de arriba abajo. Un manejador suyo sin `'worklet'`
   * deja el gesto entero en JavaScript, y ahí `estado.activate()` no hace nada: es el fallo que dejó
   * la cámara sin girar en iOS y en Android (cabecera de `mirador-tactil.ts`). La regla del
   * `runOnJS(true)`, más arriba, no lo ve: sin esa línea el gesto también acaba en JavaScript. Se
   * cuenta ahora MANEJADOR A MANEJADOR, que es más de lo que se miraba.
   */
  const elGiroEsDeTrabajo = (t) => {
    const c = soloCodigo(t);
    const giro = trozo(c, 'const giro = Gesture.Pan()', 'const pellizco = ');
    const pellizco = trozo(c, 'const pellizco = Gesture.Pinch()', 'const paseo = ');
    const paseoDeDos = trozo(c, 'const paseo = Gesture.Pan()', 'return Gesture.Simultaneous(');
    const manejadores = (giro.match(/\.on[A-Z]\w*\(/g) ?? []).length;
    return (
      manejadores >= 5 &&
      (giro.match(/'worklet';/g) ?? []).length === manejadores &&
      !/\.runOnJS\(true\)/.test(giro) &&
      /\.runOnJS\(true\)/.test(pellizco) &&
      /\.runOnJS\(true\)/.test(paseoDeDos) &&
      /return Gesture\.Simultaneous\(giro, pellizco, paseo\);/.test(c)
    );
  };
  reglaDelFuente(
    "el giro del mirador es de trabajo de arriba abajo —cada manejador suyo lleva `'worklet'` y ninguno `runOnJS(true)`—, y el pellizco y el paseo de dos van en JavaScript, simultáneos",
    elGiroEsDeTrabajo,
    tactil,
    tactil.replace(".onStart((e) => {\n        'worklet';\n", '.onStart((e) => {\n'),
    'un manejador del giro fuera del hilo de trabajo lo deja en JavaScript, donde `estado.activate()` no hace nada: la cámara no gira en el teléfono',
  );
  /*
   * Lo que se prohíbe es EXACTAMENTE la forma del gemelo —un detector con un gesto u otro según algo,
   * y gestos apagados a mano en la pantalla—, no que la pantalla tenga otros gestos o detectores: el
   * día que la mano de cartas quiera el suyo, esta regla no tiene por qué ponerse en medio.
   */
  const pideElApagado = (t) => {
    const c = soloCodigo(t);
    return (
      /\} = usarMiradorTactil\(medida, encuadre\?\.alcance \?\? 0, \{ apagado: aPie \}\);/.test(c) &&
      /<GestureDetector gesture=\{gesto\}>/.test(c) &&
      !/<GestureDetector gesture=\{[^}]*\?[^}]*\}>/.test(c) &&
      !/\.enabled\(/.test(c) &&
      /ref=\{apuntarElLienzo\}/.test(c)
    );
  };
  reglaDelFuente(
    'a pie el mirador se APAGA desde su gancho —`usarMiradorTactil(…, { apagado: aPie })`—: el detector lleva siempre el mismo gesto, sin gemelo, y el lienzo le da siempre su nodo',
    pideElApagado,
    escena,
    escena.replace(
      'usarMiradorTactil(medida, encuadre?.alcance ?? 0, { apagado: aPie });',
      'usarMiradorTactil(medida, encuadre?.alcance ?? 0);',
    ),
    'con el gancho encendido a pie, el pulgar que anda gira por detrás una mesa que no se ve, y al volver está torcida',
  );
  comprobar(
    'y se ve CAER con un gemelo apagado de vuelta en el detector',
    !pideElApagado(
      escena.replace(
        '<GestureDetector gesture={gesto}>',
        '<GestureDetector gesture={aPie ? gestoApagado : gesto}>',
      ),
    ) &&
      !pideElApagado(`${escena}\nconst gestoApagado = Gesture.Simultaneous(Gesture.Pan().enabled(false));`),
    'el gemelo se desincroniza: la librería le copia su configuración a los gestos del mirador y ya no se la devuelve',
  );
  const apagaLoSuyo = (t) => {
    const c = soloCodigo(t);
    return (
      /\{ apagado = false \}: ComoSeMontaElMirador = \{\},/.test(c) &&
      /useLayoutEffect\(\(\) => \{\s*for \(const g of gesto\.toGestureArray\(\)\) g\.enabled\(!apagado\);\s*\}, \[gesto, apagado\]\);/.test(c) &&
      /if \(!EL_RATON_CUENTA_AQUI \|\| elLienzo === null \|\| apagado\) return undefined;/.test(c) &&
      /\}, \[elLienzo, apagado, deLaInterfaz, elRatonPasea, avisarSiCambia\]\);/.test(c)
    );
  };
  reglaDelFuente(
    'y el gancho apaga SUS MISMOS gestos —`.enabled(!apagado)` sobre `toGestureArray()`, en un efecto de maquetación— y con el mirador apagado no apunta la rueda ni el arrastre del ratón',
    apagaLoSuyo,
    tactil,
    tactil.replace(
      /useLayoutEffect\(\(\) => \{\s*for \(const g of gesto\.toGestureArray\(\)\) g\.enabled\(!apagado\);\s*\}, \[gesto, apagado\]\);/,
      '',
    ),
    'sin apagarlos, `{ apagado }` no apaga nada: el gesto sigue girando la mesa por debajo de quien anda',
  );
  comprobar(
    'y se ve CAER con el ratón apuntado aunque el mirador esté apagado, y con un efecto normal en vez del de maquetación',
    !apagaLoSuyo(tactil.replace(' || apagado) return undefined;', ') return undefined;')) &&
      !apagaLoSuyo(tactil.replace('useLayoutEffect(() => {\n    for (const g', 'useEffect(() => {\n    for (const g')),
    'con el ratón apuntado, la rueda sigue acercando a pie la mesa que no se ve',
  );
  reglaDelFuente(
    'la cámara de la MESA es la de siempre —el `Ojo` con `ojoYMira`— y sólo en la mesa: a pie la pone el paseo',
    (t) => {
      const c = soloCodigo(t);
      return (
        /\{aPie \? null : <Ojo mirador=\{mirador\} cercania=\{cercania\} alcance=\{alcance\} \/>\}/.test(c) &&
        /const \{ ojo, mira \} = ojoYMira\(cercania\.current, alcance, \(d\) =>\s*ojoDelMirador\(m, d, proporcion\),?\s*\);/.test(c) &&
        (c.match(/<Ojo\b/g) ?? []).length === 1
      );
    },
    escena,
    escena.replace(
      '{aPie ? null : <Ojo mirador={mirador} cercania={cercania} alcance={alcance} />}',
      '<Ojo mirador={mirador} cercania={cercania} alcance={alcance} />',
    ),
    'con el `Ojo` montado a pie, cada fotograma devuelve la cámara al aire: el paseo pone la suya y el `Ojo` la pisa',
  );

  /* ─── Bajar recoge la mesa, y subir la saca ─── */

  reglaDelFuente(
    'bajar a andar suelta lo cogido y RECOGE la mesa con su mismo estado, y volver a la mesa la saca',
    (t) => {
      const cuerpo = trozo(soloCodigo(t), 'const cambiarDeCamara = useCallback(', '[modo, soltarTodo],');
      return (
        /if \(modo === 'mesa'\) \{\s*soltarTodo\(\);\s*ponerMesaRecogida\(true\);\s*\} else if \(nuevo === 'mesa'\) \{\s*ponerMesaRecogida\(false\);\s*\}\s*ponerModo\(nuevo\);/.test(
          cuerpo,
        )
      );
    },
    escena,
    escena.replace(/soltarTodo\(\);\n(\s*)ponerMesaRecogida\(true\);/, 'ponerMesaRecogida(true);'),
    'sin recogerla, la barra y los dados cuelgan delante de la cámara de hombro y encima de la palanca',
  );
  reglaDelFuente(
    'y a pie la mesa NO sale sola al pasar a tocarme: la salida espera a volver a la mesa, y `aPie` la despierta',
    (t) => {
      const vuelta =
        /const meTocaAhora = meToca\(laVista\);[\s\S]*?\}, \[meTocaAhora, cogida, cogidaDelMazo, aPie\]\);/.exec(soloCodigo(t))?.[0] ?? '';
      return /if \(!laSalidaEspera\.current\) return;\s*if \(aPie\) return;\s*if \(cogida !== null \|\| cogidaDelMazo !== null\) return;/.test(vuelta);
    },
    escena,
    escena.replace(/\n\s*if \(aPie\) return;\n/, '\n'),
    'una mesa que sube mientras se anda cuelga la barra delante de la cámara y encima de la palanca',
  );
  reglaDelFuente(
    'y a pie no hay ni mando de recoger ni «Tablero entero»: la mesa ya está recogida, «sacarla» colgaría la barra delante de quien anda, y andando no hay aire al que volver',
    (t) =>
      /\{catalogo\.que === 'listo' && !aPie && \(barra\.length > 0 \|\| mazo !== null\) \? \(/.test(soloCodigo(t)) &&
      /\{catalogo\.que === 'listo' && !aPie && seHaMovido \? \(/.test(soloCodigo(t)),
    escena,
    escena.replace("catalogo.que === 'listo' && !aPie && (barra", "catalogo.que === 'listo' && (barra"),
    'un «Sacar la mesa» andando saca la barra encima de la palanca',
  );

  /* ─── Los tres botones de cámara, debajo del lienzo ─── */

  reglaDelFuente(
    'las tres cámaras son botones DEBAJO del lienzo —fuera del gesto y de la red— que cambian por `cambiarDeCamara`, y lo que se oye empieza por lo que se lee',
    (t) => {
      const c = soloCodigo(t);
      const lista = /const LAS_CAMARAS[^=]*= \[([\s\S]*?)\];/.exec(c)?.[1] ?? '';
      const filas = [...lista.matchAll(/\{ modo: '(\w+)', rotulo: '([^']+)', dicho: '([^']+)' \}/g)];
      const botones = c.indexOf('style={estilos.camaras}');
      return (
        filas.length === 3 &&
        filas.map((f) => f[1]).join(',') === 'mesa,hombro,ojos' &&
        filas.every((f) => (f[3] ?? '').startsWith(f[2] ?? '\u0000')) &&
        /LAS_CAMARAS\.map\(\(c\) => \([\s\S]*?onPress=\{\(\) => cambiarDeCamara\(c\.modo\)\}[\s\S]*?accessibilityState=\{\{ selected: modo === c\.modo \}\}/.test(c) &&
        botones > c.indexOf('</RedDelLienzo>') &&
        botones > c.indexOf('</GestureDetector>') &&
        botones < c.indexOf('style={estilos.pieDeLaMesa}', botones)
      );
    },
    escena,
    escena.replace("dicho: 'Hombro: bajar", "dicho: 'Bajar"),
    'un nombre que no empieza por lo que se lee no se puede decir en voz alta para pulsarlo',
  );

  /*
   * EN UNA MESA DE BOTAS, CÓMO VA EL CANAL: en la tira de las cámaras, DEBAJO del lienzo, por lo
   * mismo que ellas —encima no queda esquina—, y sólo detrás de la pregunta de botas. (Que el canal
   * se construya sólo en botas y que se empiece a pie lo mira `verify:canal-del-paseo`.)
   */
  reglaDelFuente(
    'en una mesa de botas se dice cómo va el canal en la tira de las cámaras, debajo del lienzo; en una normal, nada',
    (t) => {
      const c = soloCodigo(t);
      const tira = c.indexOf('style={estilos.camaras}');
      const cartel = c.indexOf('<Text style={estilos.canal} numberOfLines={2}>');
      return (
        /const esBotas = esMesaDeBotas\(vista\);/.test(c) &&
        /\{esBotas \? \(\s*<Text style=\{estilos\.canal\} numberOfLines=\{2\}>\s*\{estadoDelCanal\?\.texto \?\? 'Conectando…'\}/.test(c) &&
        (c.match(/style=\{estilos\.canal\}/g) ?? []).length === 1 &&
        tira > c.indexOf('</RedDelLienzo>') &&
        cartel > tira &&
        cartel < c.indexOf('style={estilos.pieDeLaMesa}', tira)
      );
    },
    escena,
    escena.replace(/\{esBotas \? \(\s*<Text style=\{estilos\.canal\}/, '{true ? (\n            <Text style={estilos.canal}'),
    'sin la pregunta, una mesa normal diría «Conectando…» debajo del delta sin abrir ningún socket',
  );
}

// ---------------------------------------------------------------------------

paso('El mueble de opciones de la app no pinta una DECLARACIÓN como si fuera un botón');

/*
 * ═══ QUÉ SE COMPRA AQUÍ, Y QUÉ NO SE PUEDE COMPRAR ═══
 *
 * Desde el trueque de varios bienes, una opción puede traer la marca `declaracion` del
 * contrato (`shared/arcade/opciones.ts`): quiere decir que su carga NO es un movimiento
 * montado sino los límites de una FAMILIA de movimientos —un tope y una lista de
 * destinos—, porque enumerar esa familia serían 5.000 opciones y 1,14 MB de lista por
 * cada lectura de la mesa. Un mueble que la pinte enciende un botón que, pulsado, manda
 * la declaración, recibe un motivo y no juega nada.
 *
 * Y aquí no se puede EJECUTAR `LasOpciones` como el escritorio ejecuta su `Formulario`:
 * vive en `tablero-en-linea.tsx`, que trae React Native entero detrás, y este guion corre
 * con `node` pelado y en segundos. Así que se lee el fichero, y se lee sabiendo lo que
 * eso compra y lo que no: compra que el filtro esté escrito y que el `map` recorra la
 * lista FILTRADA y no la de entrada, que es el único fallo silencioso posible aquí
 * —filtrar a un lado y pintar del otro—. No compra que React haga con eso lo que se
 * espera; eso lo compra la misma regla, ejecutada de verdad, en `verify:escritorio`,
 * sobre el mueble hermano y con la misma marca.
 */
{
  const enLinea = leer(path.join(SRC, 'arcade', 'tablero-en-linea.tsx'));
  const laEscena = leer(path.join(SRC, 'arcade', 'riberas-en-tres-escena.tsx'));
  const contrato = leer(path.join(SRC, 'arcade', 'mesa.ts'));
  comprobar(
    'lo que llega por el cable tiene sitio donde traer la marca',
    /declaracion\?: true;/.test(contrato),
  );
  comprobar(
    'el mueble filtra las declaraciones antes de pintar',
    /function loQueLasOpcionesPintan\(opciones: readonly OpcionDeMesa\[\]\): OpcionDeMesa\[\] \{\s+return opciones\.filter\(\(o\) => o\.declaracion !== true\);/.test(enLinea) &&
      /const pintables = loQueLasOpcionesPintan\(opciones\);/.test(enLinea),
  );
  /*
   * ═══ Y LA GUARDA QUE DECIDE SI SE PINTA EL CAJÓN SALE DEL MISMO FILTRO ═══
   *
   * Ésta nace de un fallo medido y no de una precaución. La guarda era
   * `sueltas.length > 0`, o sea que contaba lo que LLEGA mientras que quien decide qué se
   * pinta es el filtro de arriba. Con la puerta del trueque como única suelta —lo normal en
   * el turno de quien tiene bienes— se montaba un `<View>` con cero hijos y su relleno de 16
   * puntos: treinta y dos puntos de hueco vacío en el pie de la pantalla más apretada de las
   * cuatro. En el escritorio, el mismo fallo escribía además «Ahora mismo no hay nada que
   * puedas hacer en esta mesa» debajo de cuarenta y ocho botones.
   *
   * Se compra que las DOS salgan del mismo `loQueLasOpcionesPintan`, que es lo que hace que
   * no se puedan separar: una condición repetida es un sitio donde se olvida.
   */
  comprobar(
    'y la guarda que decide si se pinta el cajón cuenta lo PINTABLE y no lo que llega',
    /function hayAlgoQuePintar\(opciones: readonly OpcionDeMesa\[\]\): boolean \{\s+return loQueLasOpcionesPintan\(opciones\)\.length > 0;/.test(enLinea) &&
      /\{hayAlgoQuePintar\(sueltas\) \? \(/.test(enLinea) &&
      !/\{sueltas\.length > 0 \? \(/.test(enLinea),
  );
  comprobar(
    'y la pantalla en tres dimensiones usa la MISMA, importada y no copiada',
    /\{hayAlgoQuePintar\(sueltas\) \? \(/.test(laEscena) &&
      !/\{sueltas\.length > 0 \? \(/.test(laEscena) &&
      /\n  hayAlgoQuePintar,\n/.test(laEscena),
  );
  comprobar(
    'y el `map` recorre la lista FILTRADA, no la de entrada',
    /\{pintables\.map\(\(o\) => \(/.test(enLinea) && !/\{opciones\.map\(\(o\) => \(/.test(enLinea),
  );
  comprobar(
    'y se compara con `=== true`, que es lo que el contrato promete y no la veracidad',
    !/o\.declaracion \?/.test(enLinea) && !/!o\.declaracion\b/.test(enLinea),
  );
}

/**
 * ═══ EL BURGO EN TRES DIMENSIONES: LAS MISMAS REGLAS QUE YA SE LE EXIGEN A RIBERAS ═══
 *
 * Es el SEGUNDO pintor propio sobre el mueble `tablero`, y eso quiere decir que cada
 * fallo silencioso que costó una tarde con el delta cabe otra vez aquí, entero y sin que
 * nada se ponga rojo:
 *
 *   · un `React.lazy` creado DENTRO del componente: la escena se desmonta y se vuelve a
 *     bajar en cada vuelta del sondeo, y no hay ningún error en ninguna parte;
 *   · un `Canvas` fuera de la red: un `throw` al pintar —una textura que expo-gl no
 *     quiere, un fundido que se queda sin memoria— cierra la app en mitad de la partida;
 *   · un `Platform.OS` que mande el teléfono al retablo: dos dimensiones en el móvil y
 *     tres en el PC, sin un solo aviso, que es exactamente lo que pasó con `tablero.glb`
 *     durante meses;
 *   · un manejador que no llame a `laInterfazSeLoQueda()` LO PRIMERO: en el móvil el giro
 *     del tablero le roba el dedo al asa de los dados y el toque no llega nunca;
 *   · una hoja modal DENTRO del `GestureDetector`: sus botones le pelean el toque al giro;
 *   · y el orden de composición al revés —filtrar las opciones ANTES de dárselas a
 *     `dadosEnTres`—, con lo que `porTirar` es siempre falso y nadie puede tirar en toda
 *     la tarde.
 *
 * Ninguno de los seis lo caza `tsc`; ninguno lo caza `verify:burgo-en-tres`, que mide la
 * TRADUCCIÓN con mesas de verdad y no la pantalla; y ninguno se ve sin un teléfono en la
 * mano. Se leen del fuente, y se leen sabiendo lo que eso compra —que la forma está
 * escrita— y lo que no: que React haga con ella lo que se espera lo compra el banco del
 * escritorio, que monta el mismo `<Burgo>`.
 *
 * ═══ Y LA TANDA DE PANTALLA COMPLETA TRAJO OTROS SEIS DE LA MISMA FAMILIA ═══
 *
 * Todos con la misma forma: la partida se para o se pierde un movimiento, y no hay un solo
 * error en ninguna consola.
 *
 *   · EL CARRIL DENTRO DEL CAJÓN. «Empezar la partida» es una opción del momento, o sea de
 *     la sección «Ahora», y «Ahora» nace plegada dentro de un cajón que nace cerrado: con
 *     una mesa recién abierta la única jugada posible del juego queda detrás de dos toques
 *     que nadie tiene motivo para dar. Una partida que no arranca.
 *   · UNA LISTA SIN `keyboardShouldPersistTaps` alrededor del único campo de texto de la
 *     partida: el primer toque en «Pujar» sólo cierra el teclado, y una subasta con plazo
 *     se pierde por un toque que no hizo nada. No se ve NUNCA con un ratón.
 *   · LA CRIBA CONTANDO UNA HOJA QUE NO SE PINTA: con el cajón cerrado, lo que sólo enseña
 *     la hoja se queda sin botón en toda la pantalla.
 *   · UN INTERRUPTOR EN LUGAR DEL MUEBLE en `hojaEnTres`: un `true` con la caja o el carril
 *     sin pintar deja el movimiento sin sitio, que es el mismo fallo dicho por el contrato.
 *   · UNA CAJA MODAL SIN VELO sobre un tablero que se toca: cerrar la tarjeta deja el dedo
 *     encima de una casilla, y una casilla con UNA obra posible manda el movimiento sin
 *     preguntar. Cerrar una tarjeta no puede comprar un solar.
 *   · Y LA CRÓNICA COMPARANDO EL TEXTO en vez de la jugada: dos sucesos iguales seguidos
 *     eran uno solo en el relato, y el segundo desaparecía sin que nadie lo notara.
 *
 * ═══ Y LOS CUATRO REPAROS DE LA APP TRAJERON OTROS CUATRO DE LA MISMA FAMILIA ═══
 *
 * Los cuatro medidos por un revisor adversario, y los cuatro con la misma forma: algo deja
 * de poder hacerse y no hay un error en ninguna consola.
 *
 *   · DOS DE LAS CUATRO MITADES EN LAS TRES HOJAS. Tenían velo y
 *     `accessibilityViewIsModal`, que no es una trampa de foco: es de iOS y sólo hace
 *     ignorar a los HERMANOS de la vista que lo lleva —o sea al velo—, y en Android no
 *     atrapa nada. Con una tarjeta modal abierta, un lector salía a la cinta, al carril, a
 *     la caja de los tratos y a «Salir» y «Tirar la mesa». Y su velo tampoco llegaba: vivían
 *     dentro de `cajaDelLienzo` y `tapaTodo` es absoluto respecto de SU padre, así que la
 *     barra de la mesa seguía pulsable CON EL DEDO. «Tirar la mesa» acaba la partida de
 *     todos.
 *   · EL PIE FLOTANTE SIN TECHO DE ALTO. Absoluto sin `top`: medía lo que su contenido y lo
 *     recortaba el `overflow` de la caja del lienzo, POR ARRIBA. Peor pie real 460 de 725 en
 *     retrato, pero el techo del mueble son 728 y esto corre también en la web. Lo primero
 *     que se cae es el cartel y lo segundo la caja de los tratos, cuyos tres movimientos la
 *     criba ya descontó: contestar un trato desaparece de la pantalla entera.
 *   · TOCAR UN JUGADOR NO ABRÍA NADA EN EL RESPALDO. Las tres hojas vivían sólo dentro de
 *     `cajaDelLienzo`, que en esa rama no existe, y el marcador con su `alTocarJugador` sí
 *     se monta: pulsar una ficha ponía el jugador elegido, mataba el cartel y no pintaba
 *     nada. Y en la rama del anillo el mismo toque desde el marcador abría la hoja DEBAJO
 *     del cajón, que es el mismo botón muerto por la puerta de al lado.
 *   · HASTA TRES REGIONES VIVAS A LA VEZ, cuando la casa pide UNA por pantalla: la línea del
 *     turno, el aviso de la mesa y el que el retablo pinta dentro. Y el de la mesa devuelve
 *     `null` con el texto vacío, o sea que la región nace con su contenido y no se anuncia
 *     nunca. Dos de los tres muebles no son de esta tanda; su arreglo exacto está escrito
 *     junto a la regla.
 *
 * Y con ellos el otro medio fallo del ÚNICO campo de texto de la partida: que «Pujar» se
 * pueda pulsar al primer toque no sirve de nada si en iOS el teclado se pone encima del
 * campo, que es lo que hace con un cajón pegado al borde de abajo.
 *
 * ═══ Y CADA REGLA SE VE CAER ═══
 *
 * `reglaDelFuente` afirma la regla sobre el fichero de VERDAD y vuelve a aplicarla sobre
 * una copia ENVENENADA —el mismo texto con el fallo dentro— exigiendo que ahí falle. Un
 * comprobador de fuente que sólo mira el caso bueno se queda verde para siempre el día que
 * alguien le rompe la expresión regular, y en este árbol eso ya pasó dos veces: un `sed`
 * que dejó `/bLETRA./` y un filtro que no inspeccionaba ni un fichero.
 */
paso(
  'El Burgo en tres dimensiones: envoltura perezosa, red bajo el lienzo, sin plataforma, hojas fuera del gesto, ' +
    'y de pantalla completa —el carril a la vista, el cajón con sus cuatro mitades y el teclado que no se come el primer toque—; ' +
    'y los cuatro reparos: la trampa de foco de las tres hojas, el techo del pie, las hojas en las dos ramas y una sola región viva',
);
{
  const escena = leer(path.join(SRC, 'arcade', 'burgo-en-tres-escena.tsx'));
  const hojas = leer(path.join(SRC, 'arcade', 'hojas-del-burgo.tsx'));
  const laTabla = leer(path.join(SRC, 'arcade', 'pintados.ts'));

  /*
   * TODA REGLA DE PROHIBICIÓN MIRA EL CÓDIGO, NUNCA EL FICHERO ENTERO. Es la misma
   * corrección que ya se pagó dos veces en este guion: en esta casa las cabeceras CUENTAN
   * los fallos que se arreglaron —la del Burgo nombra `Platform.OS` para decir que no
   * aparece— y una regla que castiga hablar de algo enseña a no hablar de ello.
   */
  const soloCodigo = (texto) =>
    texto
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l))
      .join('\n');

  /** Afirma la regla sobre el fichero de verdad, y la ve CAER con el caso envenenado. */
  const reglaDelFuente = (que, prueba, bueno, envenenado, porque) => {
    comprobar(que, prueba(bueno), porque);
    comprobar(
      `y «${que}» se ve CAER con el caso envenenado`,
      !prueba(envenenado),
      'una regla que no se ve caer puede estar mirando otra cosa, y entonces es verde para siempre',
    );
  };

  /** El cuerpo de un manejador, de su `=> {` al cierre del `useCallback`. Las dos formas de escribirlo. */
  const cuerpoDelManejador = (texto, nombre) => {
    const codigo = soloCodigo(texto);
    const desde = codigo.indexOf(`const ${nombre} = useCallback(`);
    if (desde < 0) return '';
    const cierres = [codigo.indexOf('\n  );', desde), codigo.indexOf('\n  }, [', desde)].filter((i) => i > 0);
    if (cierres.length === 0) return '';
    const hasta = Math.min(...cierres);
    const cuerpo = codigo.slice(desde, hasta);
    const llave = cuerpo.indexOf('=> {');
    return llave < 0 ? '' : cuerpo.slice(llave + '=> {'.length);
  };
  const primeraLineaDe = (texto, nombre) =>
    cuerpoDelManejador(texto, nombre)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)[0] ?? '';

  const LOS_MANEJADORES = ['alElegirOpcion', 'alMandar', 'alTocarCasilla', 'alTocarLosDados', 'alTocarFigura'];
  const LOS_QUE_MUEVEN = ['alElegirOpcion', 'alMandar', 'alTocarCasilla', 'alTocarLosDados'];

  /* ─── Las envolturas perezosas, que es lo que protege la portada ─── */

  /*
   * ═══ UNA FÁBRICA, Y CADA JUEGO LA LLAMA EN EL ÁMBITO DE SU MÓDULO ═══
   *
   * Esta regla miraba la envoltura del Burgo y buscaba en ella `const LaPantalla = lazy(…)`
   * pegado al margen. Las tres envolturas eran la misma copiada, y ahora son una llamada a
   * `pantallaPerezosa` (`pantalla-perezosa.tsx`), así que el filo —un `lazy` creado dentro
   * del componente, que desmonta la escena y la vuelve a bajar en cada sondeo sin un error—
   * puede caer en dos sitios, y se mira en los dos:
   *
   *   · en la FÁBRICA: `lazy` una sola vez, en su cuerpo y ANTES del componente que
   *     devuelve, nunca dentro de él; y sin importar ninguna escena;
   *   · en CADA ENVOLTURA de la carpeta —las que hay, no una lista: la de un juego nuevo
   *     queda vigilada sin tocar esto, y con suelo en las tres de hoy—: la llamada a la
   *     fábrica pegada al margen, o sea en el ámbito del módulo, con el `import()` de SU
   *     escena escrito ahí; y sin un `lazy` propio.
   *
   * Y ninguna de las dos arrastra `three` a la portada. Las prohibiciones miran el CÓDIGO y
   * no el fichero: las cabeceras EXPLICAN que con un `import` normal entrarían `three` y
   * `@react-three/fiber` en la portada, que es documentación correcta y la primera versión
   * de esta regla se ponía roja por ella. Es el mismo filo que ya se pagó con
   * `lookAt(0, 0, 0)` unas secciones más arriba.
   */
  const laFabrica = leer(path.join(SRC, 'arcade', 'pantalla-perezosa.tsx'));
  const esEnvoltura = (f) => /^[a-z-]+-en-tres\.tsx$/.test(f);
  const lasEnvolturas = fs
    .readdirSync(path.join(SRC, 'arcade'))
    .filter(esEnvoltura)
    .map((f) => [f, leer(path.join(SRC, 'arcade', f))]);
  const sinTres = (c) => !/from 'three'/.test(c) && !/@react-three\/fiber/.test(c);
  const fabricaSana = (t) => {
    const c = soloCodigo(t);
    const devuelve = c.indexOf('return function ');
    const crea = c.indexOf('lazy(traer)');
    return (
      (c.match(/\blazy\(/g) ?? []).length === 1 &&
      crea > 0 &&
      devuelve > crea &&
      !/\blazy\(/.test(c.slice(devuelve)) &&
      !/-en-tres-escena/.test(c) &&
      sinTres(c)
    );
  };
  const envolturaSana = (fichero, t) => {
    const c = soloCodigo(t);
    const suEscena = fichero.replace(/\.tsx$/, '-escena');
    return (
      new RegExp(`^export const [A-Za-z]+ = pantallaPerezosa\\(\\(\\) => import\\('\\./${suEscena}'\\),`, 'm').test(c) &&
      !/\blazy\(/.test(c) &&
      !new RegExp(`from '\\./${suEscena}'`).test(c) &&
      sinTres(c)
    );
  };
  const LAS_TRES_DE_HOY = ['burgo-en-tres.tsx', 'lindes-en-tres.tsx', 'riberas-en-tres.tsx'];
  const todasSanas = (lista) =>
    LAS_TRES_DE_HOY.every((f) => lista.some(([g]) => g === f)) && lista.every(([f, t]) => envolturaSana(f, t));

  reglaDelFuente(
    'la fábrica de las envolturas crea el `lazy` UNA vez, en su cuerpo y fuera del componente que devuelve, y no arrastra `three` ni ninguna escena',
    fabricaSana,
    laFabrica,
    laFabrica
      .replace('  const LaPantalla = lazy(traer);\n', '')
      .replace('  return function LaPantallaEnTres(): JSX.Element {\n', '  return function LaPantallaEnTres(): JSX.Element {\n    const LaPantalla = lazy(traer);\n'),
    'creado dentro del componente, cada sondeo desmonta la escena y la vuelve a bajar entera, y sin un error en ninguna parte',
  );
  reglaDelFuente(
    `y cada envoltura de la carpeta (${lasEnvolturas.map(([f]) => f).join(', ')}) llama a la fábrica en el ÁMBITO DE MÓDULO con el \`import()\` de su escena, sin \`lazy\` propio ni \`three\``,
    todasSanas,
    lasEnvolturas,
    lasEnvolturas.map(([f, t]) => [
      f,
      f === 'burgo-en-tres.tsx'
        ? t.replace(/^export const ElBurgoEnTres = pantallaPerezosa/m, 'export function ElBurgoEnTres(): JSX.Element {\n  const LaEnvoltura = pantallaPerezosa')
        : t,
    ]),
    'la llamada dentro de un componente crea la fábrica —y su `lazy`— en cada repintado',
  );
  comprobar(
    'y la carpeta se lee de verdad: la envoltura de un juego nuevo entra en la regla y una escena no, y una envoltura nueva a mano cae',
    esEnvoltura('nuevo-en-tres.tsx') &&
      !esEnvoltura('nuevo-en-tres-escena.tsx') &&
      !esEnvoltura('muelle-escena.tsx') &&
      !todasSanas([...lasEnvolturas, ['nuevo-en-tres.tsx', "const LaPantalla = lazy(() => import('./nuevo-en-tres-escena'));"]]) &&
      !todasSanas(lasEnvolturas.filter(([f]) => f !== 'lindes-en-tres.tsx')),
    lasEnvolturas.map(([f]) => f),
  );
  reglaDelFuente(
    'y la tabla de pintores monta la ENVOLTURA y no la escena',
    (t) => /\[BURGO\]: ElBurgoEnTres,/.test(t) && /from '\.\/burgo-en-tres'/.test(t) && !/burgo-en-tres-escena/.test(t),
    laTabla,
    laTabla.replace("from './burgo-en-tres'", "from './burgo-en-tres-escena'"),
    'con la escena en la tabla, `three` y las tres mil líneas de `escenas/burgo/` entran en la portada',
  );

  /* ─── La red bajo el lienzo ─── */

  /*
   * La red es la del CONTRATO DE PINTOR desde que las tres pantallas dejaron de tener cada una la
   * suya: se exige que el Burgo monte ESA —importada, y sin recoger fallos por su cuenta— y que ésa
   * apunte. Las dos mitades se ven caer: la pantalla sin la red, y el contrato sin el apunte.
   */
  const elContrato = leer(path.join(SRC, 'arcade', 'pintor-propio.tsx'));
  reglaDelFuente(
    'el `Canvas` del Burgo va DENTRO de la red que cae al retablo si el lienzo revienta al pintar, y la red es la del contrato de pintor',
    (t) => {
      const c = soloCodigo(t);
      const abre = c.indexOf('<RedDelLienzo juego={juego} alCaer={ponerElLienzoCayo}>');
      const lienzo = c.indexOf('<Canvas');
      const cierra = c.indexOf('</RedDelLienzo>');
      return (
        abre >= 0 &&
        lienzo > abre &&
        cierra > lienzo &&
        montaLaRedDelContrato(c) &&
        /if \(elLienzoCayo !== null\) \{[\s\S]*?respaldoSobreElRetablo\(/.test(c)
      );
    },
    escena,
    escena.replace('<RedDelLienzo juego={juego} alCaer={ponerElLienzoCayo}>', '<View>').replace('</RedDelLienzo>', '</View>'),
    'sin la red, un `throw` al pintar cierra la app en mitad de una partida de tres días',
  );
  reglaDelFuente(
    'y la red del contrato apunta el fallo en el parte ANTES de avisar hacia arriba',
    laRedDelContratoApunta,
    elContrato,
    elContrato.replace("apuntarFallo(e, 'render', false);", ''),
    'sin el apunte, un lienzo que revienta en un teléfono no deja rastro: al volver a abrir, el parte no dice nada',
  );

  /* ─── Ninguna decisión por plataforma ─── */

  reglaDelFuente(
    'en el código de la pantalla del Burgo `Platform.OS` no aparece ni una vez',
    (t) => !/Platform\.OS/.test(soloCodigo(t)),
    escena,
    `${escena}\nconst enLaWeb = Platform.OS === 'web';\n`,
    'un `Platform.OS` que decidiera si se pinta el anillo dejaría al teléfono en dos dimensiones sin que nada se pusiera rojo',
  );

  /* ─── El dedo es de la interfaz antes que del giro ─── */

  reglaDelFuente(
    'los cinco manejadores del Burgo llaman a `laInterfazSeLoQueda()` LO PRIMERO',
    (t) => LOS_MANEJADORES.every((n) => primeraLineaDe(t, n) === 'laInterfazSeLoQueda();'),
    escena,
    escena.replace('laInterfazSeLoQueda();', ''),
    'sin esto, en el móvil el giro del tablero le roba el dedo al asa y el toque no llega nunca',
  );
  reglaDelFuente(
    'y ninguno manda un movimiento sin volver a mirar `mesa.quieto` antes',
    (t) =>
      LOS_QUE_MUEVEN.every((n) => {
        const cuerpo = cuerpoDelManejador(t, n);
        const mueve = cuerpo.indexOf('mesa.mover(');
        const quieto = cuerpo.indexOf('mesa.quieto');
        return cuerpo.length > 0 && mueve > 0 && quieto > 0 && quieto < mueve;
      }),
    escena,
    escena.replace(
      'if (mesa.quieto) return;\n      soltarTodo();\n      void mesa.mover({ tipo: o.tipo, carga: o.carga });',
      'void mesa.mover({ tipo: o.tipo, carga: o.carga });',
    ),
    '`quieto` es estado y no cerrojo: entre el toque y la respuesta que acaba de llegar hay una carrera, y dos movimientos seguidos vuelven rancios',
  );
  reglaDelFuente(
    'y lo que se manda es la OPCIÓN ENTERA del juego, nunca un `tipo` escrito en la pantalla',
    (t) => {
      const c = soloCodigo(t);
      return (
        /void mesa\.mover\(\{ tipo: o\.tipo, carga: o\.carga \}\);/.test(c) &&
        /return mesa\.mover\(\{ tipo: tirar\.tipo, carga: tirar\.carga \}\);/.test(c) &&
        !/tipo: 'burgo:/.test(c)
      );
    },
    escena,
    escena.replace('return mesa.mover({ tipo: tirar.tipo, carga: tirar.carga });', "return mesa.mover({ tipo: 'burgo:tirar', carga: {} });"),
    'montar la carga aquí escribiría la forma del movimiento en un segundo sitio, y el segundo no lo comprueba nadie',
  );

  /* ─── Las hojas, fuera del gesto y fuera de la caja del lienzo ─── */

  /**
   * El cuerpo de una función local de la pantalla, de su `= (` a la línea que la cierra
   * al mismo nivel. Es como se leen `elPie`, `elCajon` y `lasHojas`, que son tres
   * funciones y no tres componentes a propósito: sin ganchos dentro se pueden llamar
   * detrás de los `return` de las ramas de respaldo.
   */
  const bloqueDe = (texto, cabecera) => {
    const c = soloCodigo(texto);
    const desde = c.indexOf(cabecera);
    if (desde < 0) return '';
    const hasta = c.indexOf('\n  );', desde);
    return hasta < 0 ? '' : c.slice(desde, hasta);
  };

  const CABECERA_DE_LAS_HOJAS = 'const lasHojas = (): JSX.Element => (';

  /*
   * ═══ LAS TRES HOJAS VIVEN EN UN SOLO SITIO, Y ESE SITIO NO ES LA CAJA DEL LIENZO ═══
   *
   * Dos fallos distintos con la misma cura. El viejo: una hoja DENTRO del
   * `GestureDetector` le pelea el toque al giro del tablero. Y el que este comprobador
   * no veía: escritas dentro de `cajaDelLienzo`, su velo —`tapaTodo`, que es absoluto
   * respecto de SU PADRE— tapaba el anillo y nada más, así que con «¿Qué haces en Calle
   * Mayor?» delante «Salir» y «Tirar la mesa» de la barra de la mesa seguían encendidos
   * y pulsables con el dedo. «Tirar la mesa» acaba la partida de todos.
   *
   * Se compra leyendo que las tres están dentro de `lasHojas` —las tres, y ninguna
   * suelta por ahí— y que ese bloque no contiene ni el detector ni el lienzo.
   */
  reglaDelFuente(
    'las cuatro hojas del Burgo se escriben en `lasHojas` y ahí dentro no hay ni gesto ni lienzo',
    (t) => {
      const c = soloCodigo(t);
      const bloque = bloqueDe(t, CABECERA_DE_LAS_HOJAS);
      const todas = (c.match(/<LaHojaSobreElLienzo/g) ?? []).length;
      const dentro = (bloque.match(/<LaHojaSobreElLienzo/g) ?? []).length;
      /* Cuatro desde el 16-sep-2026: las tres de siempre y la tarjeta del final de la partida. */
      return (
        bloque.length > 0 &&
        todas === 4 &&
        dentro === 4 &&
        !/GestureDetector/.test(bloque) &&
        !/<Canvas/.test(bloque)
      );
    },
    escena,
    escena.replace('<Canvas', '<LaHojaSobreElLienzo titulo="" alDejarlo={soltarTodo} />\n<Canvas'),
    'un `Pressable` dentro del detector le pelea el toque al giro del tablero, y una hoja escrita dentro de la caja del lienzo lleva un velo que no llega a la barra de la mesa',
  );

  /*
   * ─── La cámara del cliente, antes de la escena y con prioridad 0 ───
   *
   * Y la pose de salida es la del Burgo: `poseDeSalida(ventana)`, o la que la envuelve para no dejar
   * casillas detrás de la caja del Burgo, `poseDeSalidaAlLadoDeLaCaja(ventana, …)` —que devuelve
   * exactamente aquélla cuando la caja no esconde nada, como en un móvil en vertical—.
   */

  reglaDelFuente(
    'el ojo del cliente se monta ANTES de `<Burgo>`, con prioridad 0, y compone `ojoYMira` con las constantes del Burgo',
    (t) => {
      const c = soloCodigo(t);
      const ojo = c.indexOf('<ElOjoDelBurgo');
      const burgo = c.indexOf('<Burgo\n');
      return (
        ojo >= 0 &&
        burgo > ojo &&
        /useFrame\(\(\) => \{[\s\S]*?\}, 0\);/.test(c) &&
        /ojoYMira\(\s*cercania\.current,\s*ALCANCE_DEL_BURGO,\s*\(d\) => ojoDelMirador\(mirador\.current, d, proporcion\),\s*ALTURA_MINIMA_DEL_OJO_DEL_BURGO,\s*\)/.test(
          c,
        ) &&
        /poseDeSalida(?:AlLadoDeLaCaja)?\(ventana[,)]/.test(c)
      );
    },
    escena,
    escena.replace('<ElOjoDelBurgo mirador={mirador} cercania={cercania} />', ''),
    'r3f corre los suscriptores de igual prioridad en orden de montaje: montado después, el seguimiento de la escena iría siempre un fotograma por detrás',
  );

  /*
   * ─── A pie por el Burgo: la palanca sólo a pie, el mirador táctil apagado y la mesa la de siempre ───
   *
   * El ojo del cliente NO se desmonta a pie, al revés que en Riberas: aquí va montado ANTES que
   * `<Burgo>` por el seguimiento al que mueve (la regla de arriba), y desmontado y vuelto a montar se
   * suscribiría detrás. A pie lo sigue escribiendo y la escena pone encima la cámara del paseo. Lo
   * que se apaga es lo que MUEVE la cámara de mesa por detrás: el mirador táctil, y lo apaga su
   * gancho —`{ apagado: aPie }`: sus mismos gestos con `enabled(false)` y el ratón de la web sin
   * apuntar—. Esta pantalla lo hacía con su propio `apagarElMiradorAPie` y quitándole el nodo al
   * lienzo; que el gancho lo haga bien lo compra el bloque de Riberas a pie, que lee el gancho.
   */
  reglaDelFuente(
    'el Burgo baja a andar con un `useState` de la pantalla —mesa, hombro u ojos—, y la escena recibe la cámara con el asiento de quien mira y la palanca',
    (t) => {
      const c = soloCodigo(t);
      return (
        /const \[modo, ponerModo\] = useState<ModoDelBurgo>\('mesa'\);/.test(c) &&
        /const aPie = modo !== 'mesa';/.test(c) &&
        /const camara = useMemo\(\(\): ModoDeCamara => \(modo === 'mesa' \? CAMARA_DE_MESA : \{ modo, asiento: yo \?\? '' \}\), \[modo, yo\]\);/.test(c) &&
        /<Burgo\n[\s\S]*?camara=\{camara\}\s+mandos=\{mandos\}[\s\S]*?\/>/.test(c) &&
        /const mandos = useRef<MandosDeFuera>\(SIN_MANDOS_DE_FUERA\);/.test(c)
      );
    },
    escena,
    escena.replace('camara={camara}\n                    mandos={mandos}', 'camara={CAMARA_DE_MESA}'),
    'sin la cámara con su modo la escena no baja nunca a andar, y sin la palanca en la referencia, en el teléfono no se da un paso',
  );
  reglaDelFuente(
    'la palanca de Las Lindes sale SÓLO a pie, en la franja justo encima del pie y no en el borde, que es de la cinta y del carril',
    (t) => {
      const c = soloCodigo(t);
      const franja = c.indexOf('<View style={[estilos.franjaDelPaseo, aPie ? estilos.franjaAndando : null]} pointerEvents="box-none">');
      const palanca = c.indexOf('<MandosDelPaseo mandos={mandos} visibles={aPie} />');
      const pie = c.indexOf('{elPie(fuera)}');
      return (
        /import \{ MandosDelPaseo \} from '\.\/mandos-del-paseo';/.test(c) &&
        (c.match(/<MandosDelPaseo\b/g) ?? []).length === 1 &&
        franja > c.indexOf('<View style={estilos.pieFlotante} pointerEvents="box-none">') &&
        palanca > franja &&
        pie > palanca &&
        /franjaDelPaseo: \{ height: ALTO_DE_LA_FRANJA_EN_LA_MESA, flexShrink: 0 \}/.test(c) &&
        /franjaAndando: \{ height: ALTO_DE_LA_FRANJA_ANDANDO \}/.test(c)
      );
    },
    escena,
    escena.replace('<MandosDelPaseo mandos={mandos} visibles={aPie} />', '<MandosDelPaseo mandos={mandos} visibles />'),
    'una palanca también en la mesa es un pulgar que no mueve a nadie tapando el tablero; y en el borde, se sienta encima de la cinta y del carril',
  );
  const pideElApagadoDelBurgo = (t) => {
    const c = soloCodigo(t);
    return (
      /usarMiradorTactil\(medida, ALCANCE_DEL_BURGO, \{ apagado: aPie \}\);/.test(c) &&
      /<GestureDetector gesture=\{gesto\}>/.test(c) &&
      !/<GestureDetector gesture=\{[^}]*\?[^}]*\}>/.test(c) &&
      /ref=\{apuntarElLienzo\}/.test(c) &&
      !/\.enabled\(|toGestureArray\(/.test(c)
    );
  };
  reglaDelFuente(
    'a pie el mirador del Burgo se APAGA desde su gancho —`usarMiradorTactil(…, { apagado: aPie })`—: el detector lleva siempre el mismo gesto, el lienzo le da siempre su nodo y la pantalla no apaga nada por su cuenta',
    pideElApagadoDelBurgo,
    escena,
    escena.replace('usarMiradorTactil(medida, ALCANCE_DEL_BURGO, { apagado: aPie });', 'usarMiradorTactil(medida, ALCANCE_DEL_BURGO);'),
    'con el gesto vivo a pie, el dedo que arrastra por el lienzo gira por detrás la cámara de mesa, y al volver el tablero está torcido sin que nadie lo pidiera',
  );
  comprobar(
    'y se ve CAER con un segundo interruptor en la pantalla: los gestos apagados aquí a mano, o el nodo quitado a pie',
    !pideElApagadoDelBurgo(`${escena}\nfor (const g of gesto.toGestureArray()) g.enabled(!aPie);`) &&
      !pideElApagadoDelBurgo(escena.replace('ref={apuntarElLienzo}', 'ref={aPie ? undefined : apuntarElLienzo}')),
    'dos interruptores para lo mismo son dos sitios donde se desincroniza, que es lo que pasó con el gemelo de Riberas',
  );
  reglaDelFuente(
    'y a pie no sale «Ver el burgo entero»: andando no hay acercamiento del que volver',
    (t) => /\{!llegando && seHaMovido && !aPie \? \(/.test(soloCodigo(t)),
    escena,
    escena.replace('{!llegando && seHaMovido && !aPie ? (', '{!llegando && seHaMovido ? ('),
    'un botón de volver al aire que sale andando devuelve la cámara de mesa por debajo de quien anda',
  );
  reglaDelFuente(
    'las tres cámaras son botones del pie —Mesa, Hombro y Ojos, como en Las Lindes—, FUERA del gesto, que le quitan el dedo al giro antes de cambiar de cámara',
    (t) => {
      const c = soloCodigo(t);
      const lista = /const LAS_CAMARAS[^=]*= \[([\s\S]*?)\];/.exec(c)?.[1] ?? '';
      const filas = [...lista.matchAll(/\{ modo: '(\w+)', rotulo: '([^']+)', ayuda: '([^']+)' \}/g)];
      const botones = c.indexOf('style={estilos.camaras}');
      return (
        filas.length === 3 &&
        filas.map((f) => f[1]).join(',') === 'mesa,hombro,ojos' &&
        /LAS_CAMARAS\.map\(\(c\) => \([\s\S]*?onPress=\{\(\) => \{\s*laInterfazSeLoQueda\(\);\s*ponerModo\(c\.modo\);\s*\}\}[\s\S]*?accessibilityState=\{\{ selected: modo === c\.modo \}\}/.test(c) &&
        botones > c.indexOf('</GestureDetector>') &&
        /camara: \{\s*minHeight: 44,/.test(c)
      );
    },
    escena,
    escena.replace(/onPress=\{\(\) => \{\s*laInterfazSeLoQueda\(\);\s*ponerModo\(c\.modo\);\s*\}\}/, 'onPress={() => ponerModo(c.modo)}'),
    'sin quitarle el dedo al giro, pulsar «Hombro» con el gesto aún vivo arranca además un giro de la mesa',
  );
  /*
   * EN UNA MESA DE BOTAS, CÓMO VA EL CANAL. Encima de la franja del paseo y en la pila del pie, y no
   * arriba a la izquierda como en Las Lindes: arriba está la caja del Burgo, que en un teléfono en pie
   * ocupa casi todo el ancho. Sólo detrás de la pregunta de botas y sin coger el dedo, que lo que tapa
   * sigue siendo tablero. (Que el canal se construya sólo en botas y que se empiece a pie lo mira
   * `verify:canal-del-paseo`, en los dos clientes de los tres juegos.)
   */
  reglaDelFuente(
    'en una mesa de botas se dice cómo va el canal encima de la franja del paseo, en la pila del pie y sin coger el dedo; en una normal, nada',
    (t) => {
      const c = soloCodigo(t);
      const pila = c.indexOf('<View style={estilos.pieFlotante} pointerEvents="box-none">');
      const cartel = c.indexOf('<Text style={estilos.canal} numberOfLines={2}>');
      const franja = c.indexOf('<View style={[estilos.franjaDelPaseo, aPie ? estilos.franjaAndando : null]} pointerEvents="box-none">');
      return (
        /const esBotas = esMesaDeBotas\(vista\);/.test(c) &&
        /\{esBotas \? \(\s*<View pointerEvents="none">\s*<Text style=\{estilos\.canal\} numberOfLines=\{2\}>\s*\{estadoDelCanal\?\.texto \?\? 'Conectando…'\}/.test(c) &&
        (c.match(/style=\{estilos\.canal\}/g) ?? []).length === 1 &&
        pila >= 0 &&
        cartel > pila &&
        franja > cartel
      );
    },
    escena,
    escena.replace(/\{esBotas \? \(\s*<View pointerEvents="none">/, '{true ? (\n              <View pointerEvents="none">'),
    'sin la pregunta, una mesa normal diría «Conectando…» encima del tablero sin abrir ningún socket',
  );

  /* ─── El orden de composición, que es el fallo que no se ve ─── */

  reglaDelFuente(
    'los dados reciben las opciones ENTERAS y el filtro de los botones sueltos se aplica DESPUÉS',
    (t) => {
      const c = soloCodigo(t);
      return (
        /const dados = useMemo\(\(\) => dadosEnTres\(laVista, yo, opciones\), \[laVista, yo, opciones\]\);/.test(c) &&
        /opcionesFueraDelTablero\(opciones, datos, dados, cajonAbierto \? hoja : null, pregon, carril\)/.test(c) &&
        /from '\.\.\/\.\.\/\.\.\/shared\/arcade\/juegos\/burgo-en-tres'/.test(t)
      );
    },
    escena,
    escena.replace(
      'const dados = useMemo(() => dadosEnTres(laVista, yo, opciones), [laVista, yo, opciones]);',
      'const dados = useMemo(() => dadosEnTres(laVista, yo, fuera), [laVista, yo, fuera]);',
    ),
    'al revés, `porTirar` es siempre falso: el asa no se monta y nadie puede tirar en toda la tarde',
  );

  /*
   * ═══ EL ORDEN DE LAS SEIS COMPOSICIONES, QUE ES LO QUE NO SE VE FALLAR ═══
   *
   * `shared/arcade/juegos/burgo-en-tres.ts` dice el orden con todas las letras: los tres
   * muebles primero, la hoja recibiendo los DOS que ya pintan movimientos suyos, y la
   * criba SIEMPRE la última porque es la única que mira a las demás. Compuesta antes que
   * el carril, quitaría por un mueble que todavía no existe y el movimiento se quedaría
   * sin sitio en toda la pantalla. Nada de esto lo caza `tsc` —los seis argumentos son del
   * tipo correcto en cualquier orden— ni `verify:burgo-en-tres`, que mide la TRADUCCIÓN.
   */
  reglaDelFuente(
    'la pantalla compone en el orden del contrato: la caja de los tratos, el carril, la hoja con LOS DOS, y la criba la última',
    (t) => {
      const c = soloCodigo(t);
      const laCaja = c.indexOf('const pregon = useMemo(() => pregonDelBurgo(laVista, yo, opciones)');
      const elCarril = c.indexOf('const carril = useMemo(() => carrilDelBurgo(laVista, yo, opciones)');
      const laHoja = c.indexOf('hojaEnTres(laVista, yo, opciones, pregon, carril)');
      const laCriba = c.indexOf('opcionesFueraDelTablero(opciones, datos, dados,');
      return laCaja >= 0 && elCarril > laCaja && laHoja > elCarril && laCriba > laHoja;
    },
    escena,
    escena.replace('hojaEnTres(laVista, yo, opciones, pregon, carril)', 'hojaEnTres(laVista, yo, opciones)'),
    'sin pasarle los dos muebles, «Ahora» y «El trato» conservan sus botones y los mismos movimientos se pintan dos veces en la misma pantalla',
  );
  reglaDelFuente(
    'y a la hoja se le pasan LOS OBJETOS que se pintan, nunca un booleano',
    (t) => {
      const c = soloCodigo(t);
      return (
        /hojaEnTres\(laVista, yo, opciones, pregon, carril\)/.test(c) &&
        /usarLaSeccionAbierta\(vista\.codigo, hoja\.abre, hoja\.cinta\.espera, hoja\.cinta\.meToca, carril, pregon\)/.test(c) &&
        !/hojaEnTres\([^)]*(true|false)\)/.test(c)
      );
    },
    escena,
    escena.replace('hojaEnTres(laVista, yo, opciones, pregon, carril)', 'hojaEnTres(laVista, yo, opciones, true, true)'),
    'un interruptor se queda en `true` con el mueble sin pintar, y entonces contestar un trato o empezar la partida no se puede hacer en ninguna parte',
  );
  reglaDelFuente(
    'la criba cuenta la hoja SÓLO con el cajón abierto, en las dos ramas',
    (t) => {
      const c = soloCodigo(t);
      return (
        /opcionesFueraDelTablero\(opciones, datos, dados, cajonAbierto \? hoja : null, pregon, carril\)/.test(c) &&
        /opcionesFueraDelTablero\(\s*sinElRetablo,\s*null,\s*null,\s*cajonAbierto \? hoja : null,\s*pregon,\s*carril,\s*\)/.test(c) &&
        /obrasSoloEnElAnillo\(opciones, datos, cajonAbierto \? hoja : null, carril\)/.test(c)
      );
    },
    escena,
    escena.replace(
      'opcionesFueraDelTablero(opciones, datos, dados, cajonAbierto ? hoja : null, pregon, carril)',
      'opcionesFueraDelTablero(opciones, datos, dados, hoja, pregon, carril)',
    ),
    'una hoja dentro de un cajón cerrado no se pinta: contándola, lo que sólo enseña la hoja —las pujas de una subasta— se queda sin botón en toda la pantalla',
  );

  /* ─── El carril: la sección «Ahora» puesta a la vista ─── */

  /*
   * ═══ EL FALLO QUE ESTO COMPRA, Y NO ES TEÓRICO ═══
   *
   * «Empezar la partida» es una opción del momento, o sea de la sección «Ahora», y
   * «Ahora» nace plegada dentro de una hoja que nace cerrada: con una mesa recién abierta
   * la ÚNICA jugada posible del juego quedaba detrás de dos toques que nadie tiene motivo
   * para dar. Una partida parada, sin un error en ninguna consola y sin nada rojo. Lo que
   * lo arregla es que el carril se pinte FUERA del cajón; lo que lo volvería a romper es
   * meterlo dentro, y eso es lo que la vacuna mete.
   */
  reglaDelFuente(
    'el carril se pinta en el PIE, fuera del cajón, y el cajón sólo lleva la hoja y la crónica',
    (t) => {
      const c = soloCodigo(t);
      const pie = c.indexOf('const elPie = (sueltas: readonly OpcionDeMesa[]): JSX.Element => (');
      const carrilEnElPie = c.indexOf('<ElCarrilDeLaMesa carril={carril}');
      const cajon = c.indexOf('const elCajon = ()');
      return (
        pie >= 0 &&
        carrilEnElPie > pie &&
        cajon > carrilEnElPie &&
        /<LaCintaDelBurgo\s+cinta=\{hoja\.cinta\}\s+cajonAbierto=\{cajonAbierto\}/.test(c) &&
        !/<ElCarrilDeLaMesa[\s\S]*<ElCajonDeLaHoja/.test(c.slice(cajon))
      );
    },
    escena,
    escena.replace('<ElCarrilDeLaMesa carril={carril} quieto={mesa.quieto} alElegir={alElegirOpcion} />', ''),
    'sin carril en el pie, «Empezar la partida» vuelve detrás de un «≡» que nadie tiene motivo para pulsar: una mesa recién abierta no puede empezar',
  );
  reglaDelFuente(
    'un carril vacío no se pinta —ni el hueco ni el filo— y cada cuadrado manda LA OPCIÓN ENTERA',
    (t) => {
      const c = soloCodigo(t);
      return (
        /export function ElCarrilDeLaMesa\(\{[\s\S]*?if \(carril\.length === 0\) return null;/.test(c) &&
        /onPress=\{\(\) => \{\s*alElegir\(g\.opcion\);\s*\}\}/.test(c) &&
        /accessibilityLabel=\{g\.ayuda\}/.test(c) &&
        !/tipo: g\.opcion\.tipo/.test(c)
      );
    },
    hojas,
    hojas.replace('if (carril.length === 0) return null;', ''),
    'una tira vacía encima del tablero es cromo que no dice nada y tapa casillas, y además el carril vacío es la condición con la que «Ahora» conserva sus botones',
  );

  /* ─── El respaldo, que no es opcional ─── */

  reglaDelFuente(
    'hay UNA rama de respaldo sobre el retablo, con sus tres motivos y los DOS filtros compuestos',
    (t) => {
      const c = soloCodigo(t);
      return (
        /const respaldoSobreElRetablo = \(nota: string\): JSX\.Element => \{/.test(c) &&
        /<Retablo tablero=\{tablero\} alTocar=\{mesa\.mover\} quieto=\{mesa\.quieto\} \/>/.test(c) &&
        /if \(datos === null\) \{/.test(c) &&
        /if \(elLienzoCayo !== null\) \{/.test(c) &&
        /if \(elMundoNoLlego !== null\) \{/.test(c) &&
        /seVeEnTres\(laVista\)/.test(c) &&
        /opcionesSueltas\(tablero, opciones\)/.test(c) &&
        /opcionesFueraDelTablero\(\s*sinElRetablo,\s*null,\s*null,\s*cajonAbierto \? hoja : null,\s*pregon,\s*carril,\s*\)/.test(
          c,
        )
      );
    },
    escena,
    escena.replace('if (elMundoNoLlego !== null) {', 'if (elMundoNoLlego !== null && false) {'),
    'sin la rama del `.glb` que no llega, un túnel de treinta segundos deja la partida en un telón para siempre',
  );

  /* ─── El tablero es la pantalla, y la ruta del modelo es la de la casa ─── */

  /*
   * ═══ AQUÍ HABÍA UN 58 %, Y AHORA NO HAY NINGUNA FRACCIÓN ═══
   *
   * El lienzo se llevaba el 58 % del alto porque debajo iba la hoja, en flujo, y había que
   * repartir. La decisión es que el juego se hace de pantalla completa desde el principio:
   * la hoja sube desde el pie como cajón y el lienzo se lleva todo lo que queda bajo la
   * barra de la mesa. Lo que la regla vieja compraba —que la caja del lienzo no se
   * encogiera a cero— lo compra ahora otra cosa: es el ÚNICO hijo que crece de una columna
   * que ya tiene alto, así que se le exige `flex: 1` y que no quede ni rastro de la
   * fracción, porque un `PARTE_DEL_ALTO` olvidado en el fichero sería el reparto viejo
   * volviendo por una línea que nadie mira.
   *
   * Y LO QUE HAY QUE VOLVER A MEDIR NO ESTÁ AQUÍ: `verify:burgo-escena` proyecta las cuatro
   * esquinas del anillo en una ventana que llama «9:19,5 al 58 %» (390 × 490). Esa ventana
   * describe una pantalla que ya no existe; la buena es 390 × 725. Ese fichero no es de
   * esta tanda y no se toca: las esquinas siguen cayendo dentro con más margen que antes
   * —x ∈ [−0,778, 0,712], y ∈ [−0,362, 0,299]—, así que allí no hay nada rojo, sólo un
   * nombre desfasado.
   */
  reglaDelFuente(
    'el lienzo se lleva TODO el alto que queda —ni fracción ni suelo— y el pie flota encima sin comerse el gesto',
    (t) => {
      const c = soloCodigo(t);
      return (
        !/PARTE_DEL_ALTO/.test(c) &&
        !/ALTO_MINIMO_DEL_LIENZO/.test(c) &&
        /cajaDelLienzo: \{ flex: 1, width: '100%', overflow: 'hidden' \}/.test(c) &&
        /pieFlotante: \{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' \}/.test(
          c,
        ) &&
        /<View style=\{estilos\.pieFlotante\} pointerEvents="box-none">/.test(c)
      );
    },
    escena,
    escena.replace('<View style={estilos.pieFlotante} pointerEvents="box-none">', '<View style={estilos.pieFlotante}>'),
    'sin `box-none`, el hueco entre los muebles del pie deja de ser tablero y la franja de abajo del anillo no responde al gesto, sin que se vea por qué',
  );

  /*
   * ═══ EL PIE FLOTANTE TENÍA SUELO Y NO TENÍA TECHO, Y LO QUE SE CAÍA ERA UN MOVIMIENTO ═══
   *
   * Era `{ position: 'absolute', left: 0, right: 0, bottom: 0 }`, sin `top`. Una caja
   * absoluta sin `top` mide lo que mida su CONTENIDO y no tiene contra qué ceder: el
   * `flexShrink: 1` de `pieDeLaMesa` no hacía nada —su propio comentario lo admitía— y
   * quien recortaba era el `overflow: hidden` de `cajaDelLienzo`, POR ARRIBA.
   *
   * Medido: el peor pie real son 460 puntos de los 725 del lienzo en un teléfono en pie,
   * así que en retrato no se cae nada. Pero el techo del mueble son unos 728 —cartel 60,
   * caja de los tratos 290, sueltas 180, carril 106, cinta 60 y 32 de huecos— y esta app
   * corre TAMBIÉN en la web, donde el alto de la ventana lo elige quien mira. Y lo que se
   * recorta por arriba es, por ese orden, el CARTEL y la CAJA DE LOS TRATOS: los tres
   * movimientos de la caja ya se los ha descontado la criba a la sección «El trato»
   * —`opcionesFueraDelTablero` recibe `pregon`—, así que contestar un trato se queda sin
   * un solo botón en toda la pantalla. Es el fallo que esta tanda vino a matar, entrando
   * por el alto de la ventana y sin un error en ninguna consola.
   *
   * El techo son `top: 0` más `justifyContent: 'flex-end'` —la pila sigue pegada al pie,
   * pero ahora HAY contra qué ceder— y el `flexShrink: 1` de la caja de los tratos, que
   * en React Native vale cero por defecto. Cediendo, encogen las DOS listas que ya tienen
   * tope y ruedan por dentro (`sueltasDelPie` y `cajaLista`) en vez de irse un mueble
   * entero por arriba.
   */
  reglaDelFuente(
    'el pie flotante tiene techo y cede, y quien encoge son las dos listas que ya ruedan, no un mueble entero',
    (t) => {
      const c = soloCodigo(t);
      return (
        /pieFlotante: \{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' \}/.test(
          c,
        ) &&
        /pieDeLaMesa: \{ flexShrink: 1,/.test(c) &&
        /sueltasDelPie: \{ flexGrow: 0, flexShrink: 1, maxHeight: 180 \}/.test(c)
      );
    },
    escena,
    /* Envenenado: el pie flotante vuelve a no tener techo, que es como estaba. */
    escena.replace(
      "pieFlotante: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }",
      "pieFlotante: { position: 'absolute', left: 0, right: 0, bottom: 0 }",
    ),
    'sin techo el pie mide lo que mide su contenido y lo recorta el `overflow` de la caja del lienzo POR ARRIBA: se van el cartel y la caja de los tratos, y contestar un trato desaparece de la pantalla entera',
  );
  reglaDelFuente(
    'y la caja de los tratos cede, porque en React Native el `flexShrink` por defecto es cero',
    (t) => {
      const c = soloCodigo(t);
      return /caja: \{\s*flexShrink: 1,/.test(c) && /cajaLista: \{ flexGrow: 0, flexShrink: 1, maxHeight: 220 \}/.test(c);
    },
    hojas,
    hojas.replace('caja: {\n    flexShrink: 1,', 'caja: {'),
    'sin ceder, la caja se planta en sus 290 puntos y quien se recorta es el mueble entero: la criba ya le quitó a «El trato» sus tres botones porque esta caja se pinta',
  );
  reglaDelFuente(
    'la ruta de `burgo.glb` sale de `escenas/ruta-de-modelos.ts` y no hay ninguna escrita a mano',
    (t) =>
      /import \{ rutaDelBurgo \} from '\.\.\/\.\.\/\.\.\/escenas\/ruta-de-modelos'/.test(t) &&
      /motivo\.includes\(rutaDelBurgo\(\)\)/.test(soloCodigo(t)) &&
      !/burgo\.glb/.test(soloCodigo(t)),
    escena,
    escena.replace('motivo.includes(rutaDelBurgo())', "motivo.includes('/burgo.glb')"),
    'una ruta escrita a mano se separa de la del servidor y el respaldo deja de dispararse el día que cambie',
  );

  /* ─── La hoja: sin lógica propia, y con la gramática de la casa ─── */

  reglaDelFuente(
    'la hoja del Burgo no sabe reglas: no toca `three`, no mueve la mesa, no lee la tabla de casillas y compone por las dos puertas',
    (t) =>
      !/from 'three'/.test(t) &&
      !/mesa\.mover/.test(t) &&
      !/burgo-tablero/.test(t) &&
      /from '\.\.\/\.\.\/\.\.\/shared\/arcade\/juegos\/burgo-en-tres'/.test(t) &&
      /puja\.montar\(cuanto\)/.test(t) &&
      /trato\.montar\(destino\.asiento, doy, pido\)/.test(t),
    hojas,
    hojas.replace('puja.montar(cuanto)', "cuanto % 10 === 0 ? { tipo: 'pujar', carga: { cuanto } } : null"),
    'componer la carga aquí sería una segunda aritmética de qué cabe, y la que se rompe es la del cliente',
  );
  reglaDelFuente(
    'y pinta las ocho secciones EN EL ORDEN de la traducción, con su caso para las cuatro que no son texto',
    (t) =>
      /hoja\.secciones\.map\(\(s\) =>/.test(t) &&
      /case 'marcador':/.test(t) &&
      /case 'almoneda':/.test(t) &&
      /case 'trato':/.test(t) &&
      /case 'mios':/.test(t),
    hojas,
    hojas.replace('hoja.secciones.map((s) =>', 'ORDEN_DE_LA_HOJA.map((s) =>'),
    'reordenarlas aquí sería una segunda versión del §6.3 que se separa de la del escritorio el primer día',
  );
  reglaDelFuente(
    'y «Lo mío» sin ningún título dice la frase DE LA TRADUCCIÓN, no una escrita aquí',
    /* `soloCodigo` y no el fichero entero: el comentario que explica por qué la frase no se
       escribe aquí LA CITA, y una regla que mire los comentarios se caza a sí misma. */
    (t) => !/Todavía no tienes ningún título\./.test(soloCodigo(t)) && /<LoMio barrios=\{hoja\.mios\} lineas=\{seccion\.lineas\}/.test(t),
    hojas,
    hojas.replace('return <LasLineas lineas={lineas} />;', 'return <Text style={estilos.linea}>Todavía no tienes ningún título.</Text>;'),
    'la misma frase escrita en dos sitios: `lineasDeLoMio` ya la manda, y el día que cambie una la otra se queda atrás',
  );
  reglaDelFuente(
    'lo apagado se apaga con `BOTON.quieto` y nunca con opacidad, y nada de lo que se toca baja de 44',
    (t) =>
      /const DEDO = 44;/.test(t) &&
      /minHeight: DEDO/.test(t) &&
      /BOTON\.quieto\.fondo/.test(t) &&
      !/opacity/.test(soloCodigo(t)),
    hojas,
    hojas.replace('backgroundColor: BOTON.quieto.fondo, borderColor: BOTON.quieto.borde', 'opacity: 0.4'),
    'apagar con opacidad apaga también la letra: una ayuda en tenue cae de 5,95 a 2,32:1',
  );
  reglaDelFuente(
    'la sección abierta se recuerda POR MESA en el bolsillo y lo guardado se contrasta con la lista de verdad',
    (t) =>
      /import \{ guardarLaSeccion, laSeccionGuardada \} from '\.\/bolsillo'/.test(t) &&
      /laSeccionGuardada\(BURGO, codigo\)/.test(t) &&
      /guardarLaSeccion\(BURGO, codigo, id\)/.test(t) &&
      /for \(const id of ORDEN_DE_LA_HOJA\) if \(id === guardada\) ponerAbierta\(id\);/.test(t) &&
      /ponerAbierta\(abre \?\? 'ahora'\);/.test(t),
    hojas,
    hojas.replace(
      'for (const id of ORDEN_DE_LA_HOJA) if (id === guardada) ponerAbierta(id);',
      'ponerAbierta(guardada as IdDeSeccion);',
    ),
    'una sección guardada por una versión anterior dejaría la hoja entera plegada y sin manera de saber por qué',
  );

  /* ─── El teclado, que es el segundo fallo de esta tanda y no se ve con un ratón ─── */

  /*
   * ═══ EL FALLO, CON SU CASO Y SU COSTE ═══
   *
   * La puja libre es el ÚNICO campo de texto de toda la partida, y vive dentro de una
   * lista que se desplaza. Una lista sin `keyboardShouldPersistTaps` se come el PRIMER
   * toque para cerrar el teclado: hay que pulsar «Pujar» dos veces, y la primera no hace
   * nada visible. Con el plazo de una subasta corriendo, eso es la subasta perdida — y no
   * hay error, ni aviso, ni nada rojo. No se ve NUNCA con un ratón, que es exactamente por
   * qué esto se lee del fuente: las dos listas que pueden llevar un campo dentro tienen que
   * escucharlo.
   */
  reglaDelFuente(
    'las dos listas que pueden llevar un campo dentro escuchan los toques con el teclado abierto',
    (t) => {
      const c = soloCodigo(t);
      const enElCajon = c.indexOf('style={estilos.cajonLista}');
      const enLaHoja = c.indexOf('style={estilos.sobreElLienzoLista}');
      const persistentes = (c.match(/keyboardShouldPersistTaps="handled"/g) ?? []).length;
      return enElCajon >= 0 && enLaHoja >= 0 && persistentes >= 2;
    },
    hojas,
    hojas.replace(/keyboardShouldPersistTaps="handled"/g, ''),
    'sin esto el primer toque en «Pujar» sólo cierra el teclado, y una subasta con plazo se pierde por un toque que no hizo nada',
  );

  /* ─── El cajón: las cuatro mitades de una caja modal, escritas para esta plataforma ─── */

  reglaDelFuente(
    'el cajón lleva velo que se come el toque, papel con nombre, y la lista que se desplaza dentro',
    (t) => {
      const c = soloCodigo(t);
      const cajon = c.indexOf('export function ElCajonDeLaHoja(');
      if (cajon < 0) return false;
      const cuerpo = c.slice(cajon, cajon + 1400);
      return (
        /<Pressable style=\{estilos\.velo\} onPress=\{alCerrar\} accessible=\{false\} \/>/.test(cuerpo) &&
        /accessibilityViewIsModal accessibilityLabel=\{LA_HOJA_DE_LA_PARTIDA\}/.test(cuerpo) &&
        /velo: \{ position: 'absolute'[\s\S]*?backgroundColor: conAlfa\(SALA\.suelo, 0\.72\) \}/.test(c)
      );
    },
    hojas,
    hojas.replace('<Pressable style={estilos.velo} onPress={alCerrar} accessible={false} />', ''),
    'sin velo, cerrar el cajón deja el dedo sobre lo que hubiera debajo — y debajo hay cuarenta casillas que con una obra posible MANDAN el movimiento sin preguntar',
  );
  reglaDelFuente(
    'y la trampa de foco apaga lo de debajo con LAS DOS mitades, la de iOS y la de Android',
    (t) => {
      const c = soloCodigo(t);
      const conLasDos =
        c.match(
          /accessibilityElementsHidden=\{hayCajaModal\}\s*importantForAccessibility=\{hayCajaModal \? 'no-hide-descendants' : 'auto'\}/g,
        ) ?? [];
      /* Las dos ramas —la del anillo y la del respaldo— tienen que llevarla; si no, una de las dos se escapa. */
      return conLasDos.length >= 2 && /debajoDelCajon: \{ flex: 1 \}/.test(c);
    },
    escena,
    escena.replace(/importantForAccessibility=\{hayCajaModal \? 'no-hide-descendants' : 'auto'\}/g, ''),
    'con una sola mitad, en la otra plataforma el lector se sale del modal y se pone a leer el tablero: un modal que no atrapa nada',
  );

  /*
   * ═══ Y LA TRAMPA VALE PARA LAS CUATRO CAJAS MODALES, NO SÓLO PARA EL CAJÓN ═══
   *
   * La regla de arriba compraba la trampa del CAJÓN y ahí se quedaba. Las tres hojas
   * —«¿Qué haces en …?», la ficha de una casilla y la de un jugador— tenían DOS de las
   * cuatro mitades: velo y `accessibilityViewIsModal`. Y eso segundo no es una trampa:
   * es de iOS y sólo hace ignorar a los HERMANOS de la vista que lo lleva, o sea al velo
   * y a nada más; en Android no atrapa absolutamente nada. Medido con una tarjeta modal
   * abierta, un lector de pantalla salía a la cinta, al carril, a la caja de los tratos y
   * a «Salir» y «Tirar la mesa». Cuatro muebles vivos detrás de un velo, y «Tirar la
   * mesa» acaba la partida de todos.
   *
   * Y `hayHojaAbierta` se lee de LOS OBJETOS QUE SE PINTAN y no de los tres estados del
   * dedo, que es la regla de la casa dicha para una trampa de foco: `elJugador` guarda un
   * asiento y `buscarJugador` devuelve `null` si esa persona ya se ha ido de la mesa. Con
   * el estado, la pantalla se apagaría entera para un lector sin NINGUNA hoja delante que
   * leer — una pantalla muda, y sin un solo error.
   */
  reglaDelFuente(
    'la trampa se enciende también con una de las tres hojas, y se lee de los objetos que se pintan',
    (t) => {
      const c = soloCodigo(t);
      return (
        /const hayHojaAbierta = queHacesAqui !== null \|\| laFicha !== null \|\| elDelJugador !== null \|\| elFinal !== null;/.test(c) &&
        /const elFinal = finalDejado \? null : finalEnTres\(laVista, yo\);/.test(c) &&
        /const hayCajaModal = cajonAbierto \|\| hayHojaAbierta;/.test(c) &&
        /* `\b` a propósito: `elDelJugador` LLEVA DENTRO `elJugador`, y sin el filo esto se pone rojo con el fichero bueno. */
        !/hayHojaAbierta = [^\n]*\belJugador !== null/.test(c)
      );
    },
    escena,
    escena.replace(
      'const hayCajaModal = cajonAbierto || hayHojaAbierta;',
      'const hayCajaModal = cajonAbierto;',
    ),
    'con la trampa atada sólo al cajón, una tarjeta modal delante deja «Salir» y «Tirar la mesa» a un toque del lector de pantalla, y `accessibilityViewIsModal` no atrapa nada en Android',
  );
  /*
   * ═══ EL ORDEN DE LOS HERMANOS ES QUIÉN PINTA ENCIMA, Y AQUÍ NO HAY `z-index` ═══
   *
   * En esta plataforma pinta encima el hermano que va DESPUÉS, y las cuatro cajas modales
   * de esta pantalla se apilan en un orden que no es libre:
   *
   *     la columna de debajo  →  las tres hojas  →  el cajón
   *
   * Con las hojas dentro de la columna —que es donde estaban, dentro de `cajaDelLienzo`—
   * su velo tapaba el anillo y dejaba la cinta, el carril, la caja de los tratos y la
   * barra de la mesa encendidos y pulsables con una tarjeta modal delante. Y con las
   * hojas DETRÁS del cajón, la ficha de un jugador que se abre desde el marcador —que
   * vive dentro del cajón— se pintaría debajo de él: el botón muerto que esta tanda vino
   * a matar, otra vez.
   *
   * Se compra leyendo las dos ramas: en las dos, `{lasHojas()}` va entre el cierre de la
   * columna y `{elCajon()}`, y no hay ningún `{elCajon()}` sin su `{lasHojas()}` delante.
   */
  reglaDelFuente(
    'las tres hojas se montan en LAS DOS ramas, entre la columna de debajo y el cajón',
    (t) => {
      const lineas = soloCodigo(t)
        .split('\n')
        .map((l) => l.trim());
      const cajones = [];
      for (const [i, l] of lineas.entries()) if (l === '{elCajon()}') cajones.push(i);
      return (
        cajones.length === 2 &&
        cajones.every((i) => lineas[i - 1] === '{lasHojas()}' && lineas[i - 2] === '</View>')
      );
    },
    escena,
    /* Envenenado: la rama del respaldo se queda sin hojas, que es como estaba. */
    escena.replace('{lasHojas()}', ''),
    'sin las hojas en el respaldo, tocar un jugador en el marcador pone el jugador elegido, mata el cartel y no pinta nada: un botón muerto justo en la rama a la que se llega cuando algo ya ha ido mal',
  );

  reglaDelFuente(
    'la cinta lleva el asa del cajón con su estado, y la hoja ya no la pinta dentro',
    (t) => {
      const c = soloCodigo(t);
      const cinta = c.indexOf('export function LaCintaDelBurgo(');
      const hojaEntera = c.indexOf('export function LaHojaDelBurgo(');
      return (
        cinta >= 0 &&
        hojaEntera >= 0 &&
        /accessibilityState=\{\{ expanded: cajonAbierto \}\}/.test(c) &&
        /onPress=\{alAlternarElCajon\}/.test(c) &&
        !/<LaCinta cinta=\{hoja\.cinta\} \/>/.test(c)
      );
    },
    hojas,
    hojas.replace('accessibilityState={{ expanded: cajonAbierto }}', ''),
    'un asa que no dice si está abierta o cerrada obliga a pulsarla para saberlo, y con lector de pantalla eso es abrir el cajón para averiguar que ya estaba abierto',
  );

  /* ─── El cajón sube solo únicamente por lo que NO se ve fuera ─── */

  reglaDelFuente(
    'el cajón sube solo mirando los muebles que se pintan, no dos banderas',
    (t) => {
      const c = soloCodigo(t);
      return (
        /if \(carril\.length > 0\) cubiertas\.push\('ahora'\);/.test(c) &&
        /if \(pregon !== null\) cubiertas\.push\('trato'\);/.test(c) &&
        /if \(abre !== null && seVeFuera\.current\.indexOf\(abre\) < 0\) ponerCajonAbierto\(true\);/.test(c)
      );
    },
    hojas,
    hojas.replace(
      'if (abre !== null && seVeFuera.current.indexOf(abre) < 0) ponerCajonAbierto(true);',
      'if (abre !== null) ponerCajonAbierto(true);',
    ),
    '`abre` vale «ahora» en cuanto me toca el turno: sin mirar el carril, el cajón se levantaría encima del anillo en cada vuelta para enseñar botones que ya están a la vista',
  );

  /* ─── Aceptar un trato: dos toques, y el mismo objeto ─── */

  reglaDelFuente(
    'aceptar un trato se pregunta antes, y lo que se manda es EL MISMO objeto del juego',
    (t) => {
      const c = soloCodigo(t);
      const tira = c.indexOf('function LaTiraDelTrato(');
      if (tira < 0) return false;
      const cuerpo = c.slice(tira);
      return (
        /const \[preguntando, ponerPreguntando\] = useState<number \| null>\(null\);/.test(c) &&
        /onPress=\{\(\) => \{\s*alPreguntar\(tira\.id\);\s*\}\}/.test(cuerpo) &&
        /alPreguntar\(null\);\s*alElegir\(aceptar\);/.test(cuerpo) &&
        !/tipo: aceptar\.tipo/.test(cuerpo)
      );
    },
    hojas,
    hojas.replace('alPreguntar(tira.id);', 'alElegir(aceptar);'),
    'aceptar mueve dinero y títulos y no se puede deshacer, y esta caja vive pegada al pie de un tablero que se gira con el dedo: un toque de más no puede regalar un solar',
  );

  /* ─── Lo que sólo tiene el anillo, para quien no puede tocar el anillo ─── */

  reglaDelFuente(
    'las obras que sólo tiene el anillo salen por las acciones del lienzo, la misma puerta que tirar',
    (t) => {
      const c = soloCodigo(t);
      return (
        /obrasSoloEnElAnillo\(opciones, datos, cajonAbierto \? hoja : null, carril\)/.test(c) &&
        /lista\.push\(\{ name: `obra:\$\{String\(i\)\}`, label: o\.rotulo \}\)/.test(c) &&
        /accessibilityActions=\{accionesDelLienzo\}/.test(c) &&
        /const obra = soloEnElAnillo\[donde\];\s*if \(obra !== undefined\) alElegirOpcion\(obra\);/.test(c) &&
        /return lista\.length === 0 \? undefined : lista;/.test(c)
      );
    },
    escena,
    escena.replace('for (const [i, o] of soloEnElAnillo.entries()) lista.push({ name: `obra:${String(i)}`, label: o.rotulo });', ''),
    'comprar es el movimiento que decide la partida y no tiene ficha en «Lo mío»: sin esto sólo se puede hacer con el dedo sobre una escena, que para un lector de pantalla es UN elemento con una etiqueta',
  );

  /* ─── El cartel de la casilla señalada ─── */

  reglaDelFuente(
    'tocar una casilla sin obras SEÑALA y no abre una caja modal, y la señalada no se suelta con la revisión',
    (t) => {
      const c = soloCodigo(t);
      const tocar = c.indexOf('const alTocarCasilla = useCallback(');
      if (tocar < 0) return false;
      const cuerpo = c.slice(tocar, c.indexOf('[laInterfazSeLoQueda, mesa, laVista, yo, opciones, soltarTodo],', tocar));
      const soltar = c.indexOf('const soltarTodo = useCallback(');
      /* Del `useCallback` a su cierre, y ni una línea más: detrás está la declaración de la señalada. */
      const cuerpoDeSoltar = c.slice(soltar, c.indexOf('}, []);', soltar));
      return (
        /ponerLaCasilla\(null\);\s*ponerLaSenalada\(indice\);/.test(cuerpo) &&
        /cartelDeCasilla\(laVista, laSenalada\)/.test(c) &&
        !/ponerLaSenalada/.test(cuerpoDeSoltar)
      );
    },
    escena,
    escena.replace('ponerLaCasilla(null);\n      ponerLaSenalada(indice);', 'ponerLaCasilla(indice);'),
    'tocar una casilla en la que no hay nada que hacer es lo más frecuente del juego —«¿de quién es?»— y abría la tarjeta entera con velo y cierre: veinte cajas modales por turno para leer dos renglones',
  );

  /* ─── La crónica ya no la acumula esta pantalla ─── */

  reglaDelFuente(
    'la crónica sale de `laCronicaConLaVista` y no de comparar el texto con el anterior',
    (t) => {
      const c = soloCodigo(t);
      return (
        /ponerCronicaDelBurgo\(\(antes\) => laCronicaConLaVista\(antes, laVista\)\);/.test(c) &&
        !/ultimoPregon/.test(c) &&
        !/elPregonEnTres/.test(c)
      );
    },
    escena,
    escena.replace(
      'ponerCronicaDelBurgo((antes) => laCronicaConLaVista(antes, laVista));',
      'const ultimoPregon = elPregonEnTres(laVista);',
    ),
    'comparando el TEXTO, dos sucesos iguales seguidos —dos «Ana tira», dos cobros idénticos— eran uno solo en el relato, y el segundo desaparecía sin que nadie lo notara',
  );

  /* ─── La ficha de una casilla, contra lo nuevo del contrato ─── */

  reglaDelFuente(
    'la ficha de una casilla enseña los solares del barrio, que es lo que se mira antes de comprar',
    (t) =>
      /<LosSolaresDelBarrio solares=\{ficha\.solaresDelBarrio\} \/>/.test(t) &&
      /function LosSolaresDelBarrio\(\{ solares \}/.test(t) &&
      /if \(solares\.length === 0\) return null;/.test(t),
    hojas,
    hojas.replace('<LosSolaresDelBarrio solares={ficha.solaresDelBarrio} />', ''),
    'sin eso, la tarjeta de una casilla AJENA no dice cuánto le falta a alguien para el barrio entero, que es lo único que decide si comprar el tercer solar vale trescientos euros o la partida',
  );

  /* ─── Y que los muebles se MONTEN, que es lo que ninguna de las de arriba compraba ─── */

  /*
   * ═══ UN MUEBLE QUE NO SE MONTA NO DA ERROR, Y AQUÍ NO DABA NI ROJO ═══
   *
   * Las reglas de arriba vigilan que el CARRIL y la CINTA estén en el pie, y ahí se
   * quedaban. Probado una a una sobre el fichero de verdad, con el guion en 249 de 249:
   * borrar `<LaCajaDeLosTratos>` del pie, borrar el cartel, borrar las sueltas, dejar el
   * pie fuera de la rama del respaldo o hacer que `elCajon()` devolviera `null` siempre
   * salían las cinco VERDES. Y no son cromo que falta: la criba YA HA CONTADO ese mueble
   * —`opcionesFueraDelTablero` recibe `pregon`, y `hojaEnTres` con `pregon` deja «El
   * trato» sin botones—, así que lo que ese mueble pintaba se queda SIN UN SOLO BOTÓN en
   * toda la pantalla:
   *
   *   · sin la caja, contestar un trato que caduca al cambiar el turno;
   *   · sin el cajón montado, las pujas de una subasta y «Lo mío» entero, porque con
   *     `cajonAbierto` en cierto la criba se los descuenta a la hoja que nadie pinta;
   *   · y sin el pie en la rama del respaldo, empezar la partida sobre el retablo.
   *
   * Es el mismo fallo que esta tanda vino a matar, entrando por la puerta de al lado: una
   * partida parada y sin un error en ninguna consola. Por eso el inventario del pie y el
   * montaje del cajón se leen enteros y en su sitio, y no sólo dos de sus cinco piezas.
   */
  reglaDelFuente(
    'el pie monta su inventario ENTERO —cartel, caja de los tratos, sueltas, carril y cinta— en las dos ramas, y el cajón se monta con la hoja y la crónica dentro',
    (t) => {
      const c = soloCodigo(t);
      const pie = c.indexOf('const elPie = (sueltas: readonly OpcionDeMesa[]): JSX.Element => (');
      const cajon = c.indexOf('const elCajon = ()');
      if (pie < 0 || cajon < 0 || cajon < pie) return false;
      const dentroDelPie = c.slice(pie, cajon);
      const dentroDelCajon = c.slice(cajon, cajon + 900);
      return (
        /<ElCartelDeLaCasilla\b/.test(dentroDelPie) &&
        /<LaCajaDeLosTratos pregon=\{pregon\}/.test(dentroDelPie) &&
        /hayAlgoQuePintar\(sueltas\) \?/.test(dentroDelPie) &&
        /<ElCarrilDeLaMesa carril=\{carril\}/.test(dentroDelPie) &&
        /<LaCintaDelBurgo\s+cinta=\{hoja\.cinta\}/.test(dentroDelPie) &&
        /!cajonAbierto \? null : \(/.test(dentroDelCajon) &&
        /<ElCajonDeLaHoja alCerrar=\{cerrarElCajon\} abajo=\{abajo\}>/.test(dentroDelCajon) &&
        /<LaHojaDelBurgo/.test(dentroDelCajon) &&
        /<LaCronica cronica=\{cronica\} \/>/.test(dentroDelCajon) &&
        /\{elPie\(sueltas\)\}/.test(c) &&
        /\{elPie\(fuera\)\}/.test(c) &&
        (c.match(/\{elCajon\(\)\}/g) ?? []).length >= 2
      );
    },
    escena,
    escena.replace('<LaCajaDeLosTratos pregon={pregon} quieto={mesa.quieto} alElegir={alElegirOpcion} />', ''),
    'con la caja fuera del pie, «El trato» ya ha soltado sus botones y la criba ya los ha descontado: aceptar, rechazar y retirar se quedan sin un solo botón en toda la pantalla, y el trato muere de viejo',
  );

  /* ─── Tocar un jugador: la hoja tiene que quedar donde se pueda ver ─── */

  /*
   * ═══ UNA HOJA QUE SE ABRE DEBAJO DEL CAJÓN ES UN BOTÓN MUERTO ═══
   *
   * A `alTocarFigura` se entra por DOS puertas: el peón en el anillo —con el cajón
   * cerrado, porque con el cajón abierto no se puede tocar el anillo— y un renglón del
   * MARCADOR, que vive dentro de la hoja, que vive dentro del cajón. Por la segunda, la
   * hoja que esto abre se pintaba debajo del cajón, porque el cajón es el último hermano
   * de la pantalla y aquí pinta encima el que va después: pulsar a Ana en el marcador
   * ponía el jugador elegido, mataba el cartel de la casilla señalada y no enseñaba nada.
   *
   * Bajar el cajón es el camino inverso del que ya estaba escrito —«Proponer trato»
   * suelta la hoja y SUBE el cajón con `alAbrirEnElCajon`— y por la puerta del anillo no
   * hace nada, porque ahí el cajón ya estaba cerrado.
   */
  reglaDelFuente(
    'tocar un jugador baja el cajón, para que su ficha no se pinte debajo de él',
    (t) => {
      const cuerpo = cuerpoDelManejador(t, 'alTocarFigura');
      const cierra = cuerpo.indexOf('cerrarElCajon();');
      const pone = cuerpo.indexOf('ponerElJugador(asiento);');
      return cuerpo.length > 0 && cierra > 0 && pone > cierra;
    },
    escena,
    escena.replace('      cerrarElCajon();\n', ''),
    'desde el marcador —que vive dentro del cajón— la ficha del jugador se abre detrás del cajón: se pone el jugador elegido, se mata el cartel y no se pinta nada',
  );

  /* ─── Una sola región viva por pantalla ─── */

  /*
   * ═══ HASTA TRES REGIONES VIVAS A LA VEZ, CUANDO LA CASA PIDE UNA ═══
   *
   * Medido en la rama del respaldo con el cajón cerrado, y son tres muebles distintos:
   * `LineaDelTurno` (viva, cortés), `ElAviso` (viva, tajante) y el aviso que el `Retablo`
   * pinta dentro de sí (viva, cortés). Tres regiones en la misma pantalla se pisan y
   * acaban leyéndose a destiempo, que es justo lo que una región viva viene a evitar. Y
   * `ElAviso` devuelve `null` con el texto vacío: la región NACE a la vez que su texto, y
   * una región que se monta con su contenido dentro no anuncia nada — o sea que el aviso
   * de la mesa no se oía nunca, ni siquiera solo.
   *
   * LO QUE SE ARREGLA DESDE AQUÍ: la pantalla del Burgo no monta `<ElAviso>` en sus dos
   * ramas de mesa y le pasa el texto a LA CINTA, que está siempre en el árbol, en las dos
   * ramas, y por delante del aviso del juego y de la espera. Quedan DOS en el respaldo y
   * UNA en la rama del anillo. El vestíbulo sí lo monta, y ahí es la única.
   *
   * LO QUE NO ES DE ESTA TANDA, CON SU ARREGLO EXACTO ESCRITO:
   *
   *   · `tablero-en-linea.tsx` → `ElAviso` tiene que pintar SIEMPRE la vista con
   *     `accessibilityLiveRegion` y meter el `Text` dentro condicionado, en vez de
   *     devolver `null`: una región que aparece con su texto no se anuncia. Y para que la
   *     pantalla se quede en UNA, el aviso de la mesa debería ir dentro del
   *     `accessibilityLabel` de `LineaDelTurno`, que ya compone la frase entera.
   *   · `retablo.tsx` → su aviso necesita un interruptor (`avisoVivo`, cierto por
   *     defecto) para que una pantalla que ya tiene su región pida el texto pelado. Sin
   *     él, el respaldo del Burgo se queda con dos regiones corteses a la vez.
   */
  /*
   * Y EL VESTÍBULO, QUE ES DONDE SÍ VA, YA NO ES DE ESTE FICHERO: desde el contrato de pintor es el
   * de la plataforma (`LaMesaDeUnPintor`), y allí es la única región viva de su rama —lo compra la
   * regla del contrato, más abajo—. Así que en la pantalla del Burgo no puede quedar NINGUNA: la
   * que antes se contaba «una y sólo una, en el vestíbulo» ahora se cuenta cero, y la cinta sigue
   * llevándose el aviso de la mesa en las dos ramas.
   */
  reglaDelFuente(
    'la pantalla del Burgo no monta `ElAviso` en ninguna parte: el del vestíbulo es del contrato de pintor, y sobre la mesa el aviso se lo lleva la cinta, que está siempre en el árbol',
    (t) => {
      const c = soloCodigo(t);
      return !/<ElAviso\b/.test(c) && /avisoDeLaMesa=\{mesa\.aviso\}/.test(c);
    },
    escena,
    escena.replace(
      '        <LineaDelTurno mesa={vista} nombres={nombres} />',
      '        <LineaDelTurno mesa={vista} nombres={nombres} />\n        <ElAviso texto={mesa.aviso} />',
    ),
    'en el respaldo llegaban a coincidir tres regiones vivas —la línea del turno, este aviso y el del retablo— y se pisan; y ésta además nace con su texto, así que no se anuncia nunca',
  );
  reglaDelFuente(
    'y la cinta dice el aviso de la mesa por delante del del juego y de la espera, sin redactar ninguno',
    (t) => {
      const c = soloCodigo(t);
      return (
        /avisoDeLaMesa: string;/.test(c) &&
        /const dicho =\s*avisoDeLaMesa\.length > 0 \? avisoDeLaMesa : cinta\.aviso\.length > 0 \? cinta\.aviso : cinta\.espera;/.test(
          c,
        ) &&
        !/accessibilityLiveRegion/.test(c)
      );
    },
    hojas,
    hojas.replace(
      'avisoDeLaMesa.length > 0 ? avisoDeLaMesa : cinta.aviso.length > 0 ? cinta.aviso : cinta.espera',
      'cinta.aviso.length > 0 ? cinta.aviso : cinta.espera',
    ),
    'sin la mesa por delante, «No ha salido el movimiento» se queda debajo de «Espera a que Ana tire» y no se ve en ninguna parte: lo que se acaba de pulsar manda sobre lo que hay que esperar',
  );

  /* ─── El teclado y el único campo de texto de la partida, por el otro lado ─── */

  /*
   * ═══ QUE «PUJAR» SE PUEDA PULSAR NO SIRVE SI EL CAMPO NO SE VE ═══
   *
   * La tanda anterior arregló que el primer toque en «Pujar» no se lo comiera el teclado
   * (`keyboardShouldPersistTaps`). Queda la otra mitad del mismo campo: que se VEA lo que
   * se teclea. El cajón está pegado al borde de abajo (`tapaTodo` con `flex-end`) y se
   * queda en el 86 % del alto, así que lo suyo se lee en la mitad de abajo de la
   * pantalla. En Android da igual: la ventana se redimensiona sola (`adjustResize`, el
   * modo por defecto, y `app.json` no lo cambia). En iOS el teclado NO redimensiona nada
   * —se pone encima y se lleva unos 336 de los 845 puntos de un teléfono en pie—, o sea
   * justo la franja donde caen el campo de la puja y su botón con la subasta abierta:
   * se teclea a ciegas una cifra que decide un solar, con el plazo corriendo.
   *
   * La receta es la de la casa, ya medida en `piezas.tsx`: `KeyboardAvoidingView` con
   * `padding` SÓLO en iOS —en Android empuja dos veces y deja un hueco muerto—. Sube el
   * cajón entero, que es distinto de que el campo se busque rodando dentro de un marco
   * que sigue medio tapado. Y `Platform` aquí no decide qué se pinta ni cómo se juega:
   * eso es lo que la PANTALLA del Burgo tiene prohibido, y se vigila allí.
   */
  reglaDelFuente(
    'el cajón sube con el teclado, que es lo que deja ver el único campo de texto de la partida',
    (t) => {
      const c = soloCodigo(t);
      const cajon = c.indexOf('export function ElCajonDeLaHoja(');
      if (cajon < 0) return false;
      const cuerpo = c.slice(cajon, cajon + 1800);
      const marco = cuerpo.indexOf('<KeyboardAvoidingView');
      const dentro = cuerpo.indexOf('<View style={estilos.cajon}');
      return (
        marco > 0 &&
        dentro > marco &&
        /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/.test(cuerpo) &&
        /subeConElTeclado: \{ flex: 1, justifyContent: 'flex-end' \}/.test(c)
      );
    },
    hojas,
    hojas.replace("behavior={Platform.OS === 'ios' ? 'padding' : undefined}", ''),
    'en iOS el teclado se pone encima y se come los 336 de abajo: con la subasta abierta, el campo de la puja y su botón quedan detrás del teclado y se escribe a ciegas la cifra que decide un solar',
  );
}

/*
 * ═══ EL CONTRATO DE PINTOR DE LA APP: LO QUE ES DE CUALQUIER MESA, ESCRITO UNA VEZ ═══
 *
 * Riberas, el Burgo y Las Lindes escribían cada una la mesa, el vestíbulo con su plazo, el latido,
 * los nombres, la barra, la red bajo el lienzo, el respaldo, el telón y la calidad; y la tercera
 * copia ya se había quedado sin plazo, sin parte de fallos y con «Volcar la bolsa» —que es empezar
 * la partida— en el botón de abrir la mesa. Desde `arcade/pintor-propio.tsx` todo eso es de la
 * plataforma y cada pantalla pinta su escena con `LoQueVeElPintor`, como en el escritorio.
 *
 * Lo que puede volver en silencio es la COPIA: una pantalla que se escriba otra vez su vestíbulo,
 * su barra o su red —y la copia es la que pierde la marca de Boots on Board, el plazo o el parte—,
 * o un contrato que pierda una de sus piezas sin que ninguna pantalla se queje. Se lee el fuente,
 * sabiendo lo que eso compra —que la forma está escrita— y lo que no: que se VEA bien en un
 * teléfono, que es mirarlo. Cada regla se afirma sobre el fichero de verdad y se ve CAER con cada
 * copia envenenada; un envenenado que no cambia el fichero cuenta como fallo.
 *
 * ═══ Y LA MESA —VESTÍBULO, BARRA Y LATIDO— SE LEE DONDE VIVE: EN EL MUEBLE GENÉRICO ═══
 *
 * La cuarta copia del vestíbulo era la del mueble genérico (`tablero-en-linea.tsx`), igual a la
 * del contrato palabra por palabra. No podía usar la del contrato sin un ciclo de `import` —el
 * contrato ya carga el mueble—, así que `LaMesaDeUnPintor` se mudó al mueble y el contrato la
 * presta. Las reglas del vestíbulo, la barra y el latido leen ahora `tablero-en-linea.tsx`, que es
 * donde están; y dos más compran lo que la mudanza pide: que el contrato la preste sin escribirse
 * otra, y que el mueble genérico sea un pintor como los demás y no vuelva a pintar su vestíbulo.
 */
paso('El contrato de pintor de la app: las tres pantallas —y el mueble genérico— pintan lo suyo y la plataforma pone lo demás');
{
  const soloCodigo = (texto) =>
    texto
      .split('\n')
      .filter((l) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(l))
      .join('\n');
  /** Afirma la regla sobre el fichero de verdad, y la ve CAER con cada caso envenenado. */
  const regla = (que, prueba, bueno, envenenados, porque) => {
    comprobar(que, prueba(bueno), porque);
    envenenados.forEach((envenenado, i) => {
      comprobar(
        `y «${que}» se ve CAER con el caso envenenado ${String(i + 1)}`,
        envenenado !== bueno && !prueba(envenenado),
        envenenado === bueno ? 'el envenenado no ha cambiado el fichero: la regla no se está poniendo a prueba' : porque,
      );
    });
  };
  const contrato = leer(path.join(SRC, 'arcade', 'pintor-propio.tsx'));
  /* La mesa con su vestíbulo, su barra y su latido: vive en el mueble genérico y el contrato la presta. */
  const laMesa = leer(path.join(SRC, 'arcade', 'tablero-en-linea.tsx'));
  /*
   * LAS PANTALLAS DE PINTOR SE LEEN DE LA CARPETA, no de una lista escrita aquí: la de un juego nuevo
   * —`<juego>-en-tres-escena.tsx`— queda vigilada sin tocar este guion, que es lo que el contrato
   * promete. Su constante es la del juego en mayúsculas (`burgo` → `BURGO`), como las tres de hoy; y
   * con SUELO, porque una lectura rota da cero pantallas y cero pantallas no juzgan nada.
   */
  const esPantallaDePintor = (f) => /^[a-z-]+-en-tres-escena\.tsx$/.test(f);
  const LAS_TRES_DE_HOY = ['burgo', 'lindes', 'riberas'];
  const PANTALLAS = fs
    .readdirSync(path.join(SRC, 'arcade'))
    .filter(esPantallaDePintor)
    .map((f) => {
      const juego = f.replace(/-en-tres-escena\.tsx$/, '');
      return { juego, constante: juego.toUpperCase().replace(/-/g, '_'), fuente: leer(path.join(SRC, 'arcade', f)) };
    });
  comprobar(
    `las pantallas de pintor se leen de la carpeta (${PANTALLAS.map((p) => p.juego).join(', ')}): las tres de hoy están, y la de un juego nuevo entra sola`,
    LAS_TRES_DE_HOY.every((j) => PANTALLAS.some((p) => p.juego === j)) &&
      esPantallaDePintor('nuevo-en-tres-escena.tsx') &&
      !esPantallaDePintor('nuevo-en-tres.tsx') &&
      !esPantallaDePintor('muelle-escena.tsx'),
    PANTALLAS.map((p) => p.juego),
  );

  /* ── Cada pantalla: su `export default` es la plataforma, con SU juego y un pintor del módulo ── */
  const delegaEnLaPlataforma = (constante) => (t) => {
    const c = soloCodigo(t);
    const m = /export default function \w+\(\): JSX\.Element \{\s*return <LaMesaDeUnPintor arcade=\{([A-Z_]+)\} Pintor=\{(\w+)\} \/>;\s*\}/.exec(
      c,
    );
    return (
      m !== null &&
      m[1] === constante &&
      new RegExp(`\\nfunction ${m[2]}\\(`).test(c) &&
      /import \{[^}]*\bLaMesaDeUnPintor\b[^}]*\} from '\.\/pintor-propio';/.test(c) &&
      /import type \{ LoQueVeElPintor \} from '\.\/pintor-propio';/.test(c)
    );
  };
  /* ── Y ninguna se escribe otra vez lo que es de la plataforma; la barra la monta como le llega ── */
  const sinLoDeLaPlataforma = (t) => {
    const c = soloCodigo(t);
    return (
      !/\bmesa\.(abrir|entrar)\(/.test(c) &&
      !/\bPLAZOS\b/.test(c) &&
      !/<BarraDeLaMesa\b/.test(c) &&
      !/\buseSafeAreaInsets\(/.test(c) &&
      !/\busarMesaDeArcade\(/.test(c) &&
      !/\blatir\(/.test(c) &&
      !/componentDidCatch|getDerivedStateFromError/.test(c) &&
      /\{laBarra\}/.test(c)
    );
  };
  for (const p of PANTALLAS) {
    regla(
      `${p.juego}: su pantalla es la de la plataforma —\`LaMesaDeUnPintor\` con ${p.constante}— y su pintor es un componente del módulo`,
      delegaEnLaPlataforma(p.constante),
      p.fuente,
      [
        p.fuente.replace(/Pintor=\{(\w+)\} \/>/, 'Pintor={(q: LoQueVeElPintor) => <$1 {...q} />} />'),
        p.fuente.replace(`arcade={${p.constante}}`, 'arcade={deLaRuta}'),
      ],
      'un pintor creado al pintar es un componente nuevo en cada latido, y React desmonta la escena entera con su contexto de dibujo; y con el parámetro de la ruta, la mesa sería la que diga el enlace',
    );
    regla(
      `${p.juego}: y no se escribe otra vez nada de lo que es de la plataforma —ni vestíbulo, ni plazo, ni barra, ni área segura, ni mesa, ni latido, ni red propia—, y monta la barra que le llega`,
      sinLoDeLaPlataforma,
      p.fuente,
      [
        `${p.fuente}\nconst otra = <BarraDeLaMesa juego="" codigo="" asientos={[]} salir={() => {}} tirar={() => {}} arriba={0} />;`,
        `${p.fuente}\nconst abre = () => mesa.abrir(nombre.trim());`,
        `${p.fuente}\nclass OtraRed extends Component { componentDidCatch() {} }`,
      ],
      'una copia de la barra se queda sin la marca de Boots on Board, una de vestíbulo sin plazo y una de red sin parte: las tres cosas que la copia de Las Lindes ya había perdido',
    );
  }

  /* ── Las Lindes, que es la que más gana: la red que apunta y el respaldo con la mesa entera ── */
  const lasLindes = PANTALLAS.find((p) => p.juego === 'lindes')?.fuente ?? '';
  regla(
    'Las Lindes monta su lienzo DENTRO de la red del contrato, la que apunta el fallo, y la red la manda al respaldo',
    (t) => {
      const c = soloCodigo(t);
      const abre = c.indexOf('<RedDelLienzo juego={juego} alCaer={valle.alFallar}>');
      const lienzo = c.indexOf('<Canvas');
      const cierra = c.indexOf('</RedDelLienzo>');
      return abre >= 0 && lienzo > abre && cierra > lienzo && montaLaRedDelContrato(c);
    },
    lasLindes,
    [lasLindes.replace('<RedDelLienzo juego={juego} alCaer={valle.alFallar}>', '<View>').replace('</RedDelLienzo>', '</View>')],
    'su red de antes no apuntaba nada: un valle que se caía en un teléfono no dejaba rastro en el parte',
  );
  regla(
    'y cae al respaldo del contrato —la mesa de siempre sobre el retablo, con la nota de por qué— cuando la vista no se lee y cuando el valle se cae',
    (t) =>
      /if \(valle\.escena === null \|\| valle\.roto !== null\) \{\s*return \(\s*<ElRespaldo\s+pintor=\{pintor\}\s+nota=\{/.test(soloCodigo(t)),
    lasLindes,
    [lasLindes.replace('if (valle.escena === null || valle.roto !== null) {', 'if (valle.escena === null) {')],
    'sin la rama del valle que se cae, un tablero que no llega deja la mesa con el lienzo vacío y nada que tocar',
  );

  /* ── La mesa de la plataforma: el vestíbulo con su plazo, la barra con su marca, el latido ── */
  /*
   * Estas tres leían el contrato; desde que la mesa se mudó al mueble genérico leen `laMesa`, que es
   * donde está, con las mismas expresiones. El vestíbulo se busca DESPUÉS de su `if`, y no en el
   * fichero entero: en el mueble viven más cosas que en el contrato, y un `const vista` anterior
   * dejaría el trozo vacío sin decir por qué.
   */
  regla(
    'el vestíbulo de la plataforma —el de las pantallas de pintor Y el del mueble genérico, que es uno— abre la mesa con el PLAZO elegido —en un grupo de radio—, entra con el código, y su única región viva es el aviso de la mesa',
    (t) => {
      const c = soloCodigo(t);
      const desde = c.indexOf("if (mesa.fase === 'fuera' || mesa.mesa === null) {");
      const hasta = desde < 0 ? -1 : c.indexOf('const vista = mesa.mesa;', desde);
      const vestibulo = desde >= 0 && hasta > desde ? c.slice(desde, hasta) : '';
      return (
        /PLAZOS\.map\(\(p, i\) => \(/.test(vestibulo) &&
        /accessibilityRole="radiogroup"/.test(vestibulo) &&
        /onPress=\{\(\) => mesa\.abrir\(nombre\.trim\(\), PLAZOS\[plazo\]\?\.segundos\)\}/.test(vestibulo) &&
        /onPress=\{\(\) => mesa\.entrar\(codigo, nombre\.trim\(\)\)\}/.test(vestibulo) &&
        (vestibulo.match(/<ElAviso texto=\{mesa\.aviso\} \/>/g) ?? []).length === 1 &&
        !/accessibilityLiveRegion/.test(vestibulo)
      );
    },
    laMesa,
    [laMesa.replace('mesa.abrir(nombre.trim(), PLAZOS[plazo]?.segundos)', 'mesa.abrir(nombre.trim())')],
    'sin el plazo, desde el móvil sólo se abren mesas del plazo por defecto: una partida de días existe en el servidor y no hay forma de empezarla',
  );
  regla(
    'y el pintor recibe la barra YA MONTADA —el juego, el código, salir, tirar, el área segura y la marca de Boots on Board de `esMesaDeBotas`—, y es la única barra de la mesa',
    (t) => {
      const c = soloCodigo(t);
      const barra = /laBarra=\{\s*<BarraDeLaMesa([\s\S]*?)\/>\s*\}/.exec(c)?.[1] ?? '';
      return (
        /juego=\{juego\}/.test(barra) &&
        /codigo=\{vista\.codigo\}/.test(barra) &&
        /asientos=\{vista\.asientos\}/.test(barra) &&
        /salir=\{mesa\.salir\}/.test(barra) &&
        /tirar=\{mesa\.tirar\}/.test(barra) &&
        /arriba=\{bordes\.top\}/.test(barra) &&
        /deBotas=\{esMesaDeBotas\(vista\)\}/.test(barra) &&
        (c.match(/<BarraDeLaMesa\b/g) ?? []).length === 1
      );
    },
    laMesa,
    [
      laMesa.replace('deBotas={esMesaDeBotas(vista)}', ''),
      laMesa.replace('arriba={bordes.top}\n          deBotas', 'arriba={0}\n          deBotas'),
    ],
    'sin la marca, una mesa de Boots on Board se pinta como una cualquiera; sin el área segura, en un iPhone con muesca los mandos de la barra caen debajo del reloj',
  );
  regla(
    'y el latido de la cuenta atrás es de la mesa: cada segundo en el último minuto, cada minuto el resto, y el ritmo se reelige en cada vuelta',
    (t) => {
      const c = soloCodigo(t);
      return (
        /const cada = quedan > 0 && quedan < 60_000 \? 1000 : 60_000;/.test(c) &&
        /const reloj = setTimeout\(\(\) => latir\(\(n\) => n \+ 1\), cada\);/.test(c) &&
        /\}, \[venceEn, latido\]\);/.test(c)
      );
    },
    laMesa,
    [laMesa.replace('}, [venceEn, latido]);', '}, [venceEn]);')],
    'sin el latido en las dependencias, una mesa que entra en su último minuto sigue latiendo cada minuto y la cuenta atrás salta de sesenta en sesenta justo cuando se mira',
  );
  /*
   * ── Y LA MUDANZA: el contrato presta la mesa y no se escribe otra; el mueble es un pintor más ──
   *
   * Contadas y no sólo buscadas: el vestíbulo, el área segura, la mesa y el latido UNA vez en el
   * mueble, y NINGUNA en el contrato. Una segunda copia en cualquiera de los dos —la cuarta que se
   * acaba de quitar, o una quinta que naciera en el contrato— sale en la cuenta.
   */
  const cuantasVeces = (c, re) => (c.match(re) ?? []).length;
  const LO_QUE_ES_DE_LA_MESA = [/\bmesa\.abrir\(/g, /\bmesa\.entrar\(/g, /\buseSafeAreaInsets\(/g, /\busarMesaDeArcade\(/g, /\blatir\(/g, /<BarraDeLaMesa\b/g, /\bPLAZOS\.map\(/g];
  regla(
    'el contrato PRESTA la mesa del mueble genérico —`LaMesaDeUnPintor` y `LoQueVeElPintor`, importados y vueltos a exportar— y no se escribe otra: ni vestíbulo, ni plazo, ni barra, ni área segura, ni latido',
    (t) => {
      const c = soloCodigo(t);
      return (
        /import \{[^}]*\bLaMesaDeUnPintor\b[^}]*\} from '\.\/tablero-en-linea';/.test(c) &&
        /import type \{ LoQueVeElPintor \} from '\.\/tablero-en-linea';/.test(c) &&
        /\nexport \{ LaMesaDeUnPintor \};/.test(c) &&
        /\nexport type \{ LoQueVeElPintor \};/.test(c) &&
        !/function LaMesaDeUnPintor\b|interface LoQueVeElPintor\b/.test(c) &&
        LO_QUE_ES_DE_LA_MESA.every((re) => cuantasVeces(c, re) === 0)
      );
    },
    contrato,
    [
      `${contrato}\nconst abre = () => mesa.abrir(nombre.trim(), PLAZOS[plazo]?.segundos);`,
      contrato.replace('export { LaMesaDeUnPintor };', ''),
    ],
    'un contrato que se escribe su vestíbulo al lado del prestado es la quinta copia, y la primera que se separa se queda sin plazo o sin marca',
  );
  regla(
    'y el mueble genérico es un pintor más: `ElTableroEnLinea` monta `LaMesaDeUnPintor` con el arcade de la ruta y un pintor del módulo, y la mesa está en el mueble UNA sola vez',
    (t) => {
      const c = soloCodigo(t);
      return (
        /export function ElTableroEnLinea\(\): JSX\.Element \{\s*const \{ arcade \} = useLocalSearchParams<\{ arcade\?: string \}>\(\);\s*return <LaMesaDeUnPintor arcade=\{typeof arcade === 'string' \? arcade : ''\} Pintor=\{ElPintorDelMueble\} \/>;\s*\}/.test(c) &&
        /\nfunction ElPintorDelMueble\(\{[^}]*\blaBarra\b[^}]*\}: LoQueVeElPintor\): JSX\.Element \{/.test(c) &&
        cuantasVeces(c, /\{laBarra\}/g) === 2 &&
        cuantasVeces(c, /\bexport function LaMesaDeUnPintor\(/g) === 1 &&
        LO_QUE_ES_DE_LA_MESA.every((re) => cuantasVeces(c, re) === 1)
      );
    },
    laMesa,
    [
      laMesa.replace('Pintor={ElPintorDelMueble} />', 'Pintor={(q: LoQueVeElPintor) => <ElPintorDelMueble {...q} />} />'),
      `${laMesa}\nconst otraVez = () => mesa.abrir(nombre.trim(), PLAZOS[plazo]?.segundos);`,
      laMesa.replace('      {laBarra}\n      {/*\n        ═══ DE QUIÉN ES EL TURNO', '      <BarraDeLaMesa juego={juego} codigo={vista.codigo} asientos={vista.asientos} salir={mesa.salir} tirar={mesa.tirar} arriba={arriba} />\n      {/*\n        ═══ DE QUIÉN ES EL TURNO'),
    ],
    'con el pintor creado al pintar, el retablo se desmonta en cada latido; con una segunda mesa en el mueble vuelve la cuarta copia; y con una barra suya, la rama pierde la marca de Boots on Board',
  );
  regla(
    'y ni el contrato ni la mesa saben de ningún juego: ni una constante de arcade, ni la escena de ninguno, ni `three`',
    (t) => {
      const c = soloCodigo(t);
      return (
        !/\b(BURGO|LINDES|RIBERAS|PEONZA|FRENTE|EL_ARCADE)\b/.test(c) &&
        !/from '[^']*escenas\/(burgo|lindes)\//.test(c) &&
        !/from '[^']*escenas\/(delta|andar-por-el-delta)'/.test(c) &&
        !/from 'three'|@react-three\/fiber/.test(c) &&
        !/-en-tres-escena/.test(c)
      );
    },
    `${contrato}\n${laMesa}`,
    [
      `${contrato}\n${laMesa}\nimport { BURGO } from '../../../shared/arcade/juegos';`,
      `${contrato}\n${laMesa.replace("import { Retablo } from './retablo';", "import { Retablo } from './retablo';\nimport { Burgo } from '../../../escenas/burgo/Burgo';")}`,
    ],
    'una mesa que sabe de un juego sale a medida de ese juego, y el siguiente vuelve a copiarse la pantalla entera',
  );
  regla(
    'y su telón no coge el dedo: es un cartel encima del lienzo, no una tapa',
    (t) => /export function ElTelon\([\s\S]*?<View style=\{estilos\.telon\} pointerEvents="none">/.test(soloCodigo(t)),
    contrato,
    [contrato.replace('<View style={estilos.telon} pointerEvents="none">', '<View style={estilos.telon}>')],
    'un telón que coge el dedo deja el tablero de debajo sin poder tocarse mientras llega el mundo',
  );
  regla(
    'y su respaldo es la mesa de siempre sobre el retablo: la barra, el turno, el aviso, la nota, el retablo, lo que el retablo no pinta y la crónica',
    (t) => {
      const c = soloCodigo(t);
      const desde = c.indexOf('export function ElRespaldo(');
      const r = desde >= 0 ? c.slice(desde) : '';
      return (
        /\{laBarra\}/.test(r) &&
        /<LineaDelTurno mesa=\{vista\} nombres=\{nombres\} \/>/.test(r) &&
        /<ElAviso texto=\{mesa\.aviso\} \/>/.test(r) &&
        /<Text style=\{estilos\.nota\}>\{nota\}<\/Text>/.test(r) &&
        /<Retablo tablero=\{tablero\} alTocar=\{mesa\.mover\} quieto=\{mesa\.quieto\} \/>/.test(r) &&
        /const sueltas = tablero === null \? opciones : opcionesSueltas\(tablero, opciones\);/.test(r) &&
        /\{hayAlgoQuePintar\(sueltas\) \? \(/.test(r) &&
        /<LaCronica cronica=\{mesa\.cronica\} \/>/.test(r)
      );
    },
    contrato,
    [contrato.replace('const sueltas = tablero === null ? opciones : opcionesSueltas(tablero, opciones);', 'const sueltas = opciones;')],
    'sin la criba, lo que el retablo ya pinta sale otra vez como botón; y sin las sueltas, lo que no pinta no sale en ninguna parte',
  );
}

/*
 * ═══ BOOTS ON BOARD EN LA APP: LA ELECCIÓN AL ABRIR, LA MARCA Y LA SILLA QUE NO SE DA ═══
 *
 * `verify:compuerta-de-botas` mide la compuerta en sí, en Node y caso por caso. Lo que allí no se
 * puede ver es si la APP la llama, y dónde: una función pura correcta y una pantalla que no la usa
 * es el verde falso de siempre. Y aquí no se puede pintar nada —React Native entero detrás, y este
 * guion corre con `node` pelado—, así que se lee el fuente, sabiendo lo que eso compra: que cada
 * llamada está escrita donde tiene que estar y con lo que tiene que llevar. Lo que cada llamada
 * DECIDE lo compra aquel comprobador, ejecutándola.
 *
 *   · La orilla del lobby común pinta la elección, empieza en la normal y manda en `abrir` lo que
 *     se ve encendido; sin elección si el juego no se recorre, y apagada —`disabled`— con su porqué.
 *   · El lobby mide en las TRES plataformas (la calidad sólo baja en Android), parte del veredicto
 *     guardado, guarda el nuevo y le da la compuerta a la hoja.
 *   · `entrar` pregunta a la compuerta ANTES de la única petición que pide silla, leyendo la mesa
 *     sin llave; y el veredicto se guarda por aparato, y el último manda también en memoria.
 *   · La barra de la mesa y la del lobby dicen Boots on Board cuando `esMesaDeBotas` lo dice.
 *   · Y los vestíbulos PROPIOS de cada juego siguen abriendo la mesa de siempre: en toda la app,
 *     sólo la orilla del lobby común le pasa una modalidad a `abrir`.
 *
 * Cada regla se afirma sobre el fichero de verdad y se ve CAER con una copia envenenada.
 */
paso('Boots on Board en la app: la elección sólo en el lobby común, apagada con su porqué, la marca en la barra, y nadie sin figura en una mesa de botas');
{
  const hoja = leer(path.join(SRC, 'arcade', 'hoja-del-muelle.tsx'));
  const escena = leer(path.join(SRC, 'arcade', 'muelle-escena.tsx'));
  const laMesa = leer(path.join(SRC, 'arcade', 'mesa.ts'));
  const enLinea = leer(path.join(SRC, 'arcade', 'tablero-en-linea.tsx'));

  /* Sin comentarios: las cabeceras cuentan el porqué con los mismos nombres que aquí se buscan. */
  const soloCodigo = (texto) =>
    texto
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

  /** Afirma la regla sobre el fichero de verdad, y la ve CAER con el caso envenenado. */
  const regla = (que, prueba, bueno, envenenado, porque) => {
    comprobar(que, prueba(bueno), porque);
    comprobar(
      `y «${que}» se ve CAER con el caso envenenado`,
      !prueba(envenenado),
      'una regla que no se ve caer puede estar mirando otra cosa, y entonces es verde para siempre',
    );
  };

  /* ── La orilla del lobby común ── */
  regla(
    'la orilla del lobby común pinta la elección, empieza en la normal, y en `abrir` viaja lo que se ve encendido',
    (c) => {
      const codigo = soloCodigo(c);
      return (
        /const \[elegida, ponerElegida\] = useState<Modalidad>\('normal'\);/.test(codigo) &&
        /<EleccionDeModalidad elegida=\{elegida\} compuerta=\{compuerta\} alElegir=\{ponerElegida\} \/>/.test(codigo) &&
        /mesa\.abrir\(nombre\.trim\(\), PLAZOS\[plazo\]\?\.segundos, figura \?\? undefined, modalidadQueViaja\(elegida, compuerta\)\)/.test(codigo)
      );
    },
    hoja,
    hoja.replace('modalidadQueViaja(elegida, compuerta))', 'elegida)'),
    'mandar la marcada a pelo abriría una mesa de botas con la opción apagada en pantalla',
  );
  regla(
    'sin elección si el juego no se recorre; con Boots on Board apagada —`disabled`— y su porqué en el renglón de debajo mientras el aparato no llegue',
    (c) => {
      const codigo = soloCodigo(c);
      return (
        /if \(compuerta\.que === 'no-se-recorre'\) return null;/.test(codigo) &&
        /const motivo = compuerta\.que === 'se-ofrece' \? null : compuerta\.motivo;/.test(codigo) &&
        /const apagada = m\.modalidad === 'botas' && motivo !== null;/.test(codigo) &&
        /disabled=\{apagada\}/.test(codigo) &&
        /accessibilityState=\{\{ selected: es, disabled: apagada \}\}/.test(codigo) &&
        /const renglon = motivo \?\? /.test(codigo) &&
        /<Text style=\{estilos\.ayuda\}>\{renglon\}<\/Text>/.test(codigo)
      );
    },
    hoja,
    hoja.replace('disabled={apagada}', ''),
    'sin `disabled` la apagada se pulsaría igual, y el porqué de debajo diría una cosa mientras el dedo hace otra',
  );

  /* ── El lobby mide ── */
  regla(
    'el lobby mide en las tres plataformas —la calidad sólo baja en Android—, parte del veredicto guardado, guarda el nuevo y le da la compuerta a la hoja',
    (c) => {
      const codigo = soloCodigo(c);
      return (
        /if \(calidadJuzgada\.current\) return;/.test(codigo) &&
        !/Platform\.OS !== 'android' \|\| calidadJuzgada\.current/.test(codigo) &&
        /AppState\.currentState === 'background'/.test(codigo) &&
        /if \(Platform\.OS === 'android'\) ponerCalidad\(juicio\);\s*ponerVeredicto\(juicio\);\s*void guardarElVeredicto\(juicio\);/.test(codigo) &&
        /void elVeredictoDelAparato\(\)\.then\(\(guardado\) => \{\s*if \(vivo\) ponerVeredicto\(\(antes\) => antes \?\? guardado\);/.test(codigo) &&
        /const compuerta = compuertaDeBotas\(veredicto, manifiesto\.id, midiendo\);/.test(codigo) &&
        /compuerta=\{compuerta\}/.test(codigo)
      );
    },
    escena,
    escena.replace('if (calidadJuzgada.current) return;', "if (Platform.OS !== 'android' || calidadJuzgada.current) return;"),
    'con el filtro de antes, un iPhone o la web no se medirían nunca, y a ninguno se le ofrecería Boots on Board',
  );

  /* ── La silla que no se da ── */
  regla(
    '`entrar` pregunta a la compuerta ANTES de la única petición que pide silla, y en una mesa de botas deja fuera con su frase a quien no llega',
    (c) => {
      const codigo = soloCodigo(c);
      const cuerpo = /const entrar = useCallback\(([\s\S]*?)\n {4}\[apuntarLaLlave, arcade, cabeceras\],/.exec(codigo)?.[1] ?? '';
      const pregunta = cuerpo.indexOf('await porQueNoTeSientas(limpio, arcade, await elVeredictoDelAparato(), leerSinLlave)');
      const silla = cuerpo.indexOf('/asientos`');
      return (
        cuerpo.length > 0 &&
        pregunta > 0 &&
        silla > pregunta &&
        /if \(motivo !== null\) \{\s*ponerFase\('fuera'\);\s*avisoDeLaRed\(motivo\);\s*return;\s*\}/.test(cuerpo) &&
        (codigo.match(/\/asientos`/g) ?? []).length === 1
      );
    },
    laMesa,
    laMesa.replace('await porQueNoTeSientas(limpio, arcade, await elVeredictoDelAparato(), leerSinLlave)', 'null'),
    'sin la pregunta, un aparato que no llega se sienta en una mesa de botas y juega desde arriba sin que nadie pueda alcanzarle',
  );
  regla(
    'la mesa se lee SIN llave —como la ve quien aún no se ha sentado— y en el acto, con `?desde=-1`',
    (c) => {
      const cuerpo = /async function leerSinLlave\(codigo: string\): Promise<LecturaSinLlave> \{([\s\S]*?)\n\}/.exec(soloCodigo(c))?.[1] ?? '';
      return (
        /await fetch\(`\$\{servidorActual\(\)\}\/api\/arcade\/mesas\/\$\{codigo\}\?desde=-1`\);/.test(cuerpo) &&
        !/x-asiento|headers|cabeceras|CABECERA/.test(cuerpo)
      );
    },
    laMesa,
    laMesa.replace('?desde=-1`);', "?desde=-1`, { headers: { 'x-asiento': 'la-mia' } });"),
    'con la llave puesta la mesa contestaría como a un sentado, que no es lo que se pregunta',
  );
  regla(
    'el veredicto se guarda por aparato en el almacén del bolsillo, se lee con `leerElVeredicto`, y el último sustituye al anterior también en memoria',
    (c) => {
      const codigo = soloCodigo(c);
      return (
        /const LLAVE_DEL_VEREDICTO = 'arcade\.aparato\.veredicto';/.test(codigo) &&
        /await SecureStore\.getItemAsync\(LLAVE_DEL_VEREDICTO\)/.test(codigo) &&
        /await SecureStore\.setItemAsync\(LLAVE_DEL_VEREDICTO, veredicto\)/.test(codigo) &&
        /globalThis\.localStorage\?\.setItem\(LLAVE_DEL_VEREDICTO, veredicto\)/.test(codigo) &&
        /veredictoEnMemoria = leerElVeredicto\(crudo\)/.test(codigo) &&
        /export async function guardarElVeredicto\(veredicto: Calidad\): Promise<void> \{\s*veredictoEnMemoria = veredicto;/.test(codigo)
      );
    },
    laMesa,
    laMesa.replace(/(export async function guardarElVeredicto\(veredicto: Calidad\): Promise<void> \{\s*)veredictoEnMemoria = veredicto;/, '$1'),
    'sin la copia en memoria, el veredicto recién medido no valdría para el `entrar` de un segundo después',
  );

  /* ── La marca ── */
  /*
   * La barra se montaba en las DOS ramas del mueble genérico, y se contaban dos preguntas. Desde que
   * la mesa —`LaMesaDeUnPintor`, en el mismo fichero— la monta UNA vez y se la da a cada pintor como
   * `laBarra`, lo que se compra es lo mismo dicho de la forma nueva: que CADA barra que se monta lleve
   * la pregunta, y que haya una sola. Que las ramas pinten esa y no otra lo compra el contrato.
   */
  regla(
    'la barra de la mesa dice Boots on Board cuando `esMesaDeBotas` lo dice —se monta UNA vez, en la mesa, para todas las ramas de todos los pintores—, y sin la prop no dice nada',
    (c) => {
      const codigo = soloCodigo(c);
      const barras = (codigo.match(/<BarraDeLaMesa\b/g) ?? []).length;
      return (
        /deBotas = false,/.test(codigo) &&
        /deBotas\?: boolean;/.test(codigo) &&
        /\{deBotas \? \(\s*<Text style=\{estilos\.marcaDeBotas\}[^>]*>\s*\{MARCA_DE_BOTAS\}\s*<\/Text>\s*\) : null\}/.test(codigo) &&
        barras === 1 &&
        (codigo.match(/deBotas=\{esMesaDeBotas\(vista\)\}/g) ?? []).length === barras
      );
    },
    enLinea,
    enLinea.replace('deBotas={esMesaDeBotas(vista)}', ''),
    'una barra sin la prop pinta la mesa de botas como una cualquiera, en todas las ramas de todos los pintores a la vez',
  );
  regla(
    'y la barra del lobby también, debajo del nombre del juego, sólo sentados en una mesa que lo sea',
    (c) => {
      const codigo = soloCodigo(c);
      return (
        /const deBotas = mesa\.fase === 'dentro' && esMesaDeBotas\(mesa\.mesa\);/.test(codigo) &&
        /\{deBotas \? \(\s*<Text style=\{estilos\.marcaDeBotas\}/.test(codigo)
      );
    },
    hoja,
    hoja.replace("const deBotas = mesa.fase === 'dentro' && esMesaDeBotas(mesa.mesa);", 'const deBotas = false;'),
    'quien llega con el código tiene que saber a qué mesa ha entrado antes de que empiece',
  );

  /* ── Los vestíbulos propios siguen abriendo la mesa de siempre ── */

  /** Cuántos argumentos lleva cada `mesa.abrir(…)` de un fuente, contando comas de primer nivel. */
  const llamadasAAbrir = (fuente) => {
    const salen = [];
    const puerta = 'mesa.abrir(';
    let desde = 0;
    for (;;) {
      const i = fuente.indexOf(puerta, desde);
      if (i < 0) break;
      let hondo = 0;
      let args = 1;
      let vacia = true;
      let cadena = null;
      let j = i + puerta.length;
      for (; j < fuente.length; j++) {
        const c = fuente[j];
        if (cadena !== null) {
          if (c === '\\') j++;
          else if (c === cadena) cadena = null;
          continue;
        }
        if (c === "'" || c === '"' || c === '`') {
          cadena = c;
          vacia = false;
        } else if (c === '(' || c === '[' || c === '{') {
          hondo++;
          vacia = false;
        } else if (c === ')' || c === ']' || c === '}') {
          if (hondo === 0) break;
          hondo--;
        } else if (c === ',' && hondo === 0) {
          args++;
        } else if (!/\s/.test(c)) {
          vacia = false;
        }
      }
      salen.push({ args: vacia ? 0 : args, texto: fuente.slice(i, j + 1) });
      desde = j + 1;
    }
    return salen;
  };
  /*
   * Los vestíbulos PROPIOS: los que se pintan cuando no hay mesa. No tienen elección y no la tendrán.
   *
   * Eran cuatro —uno por cada pantalla en tres dimensiones y el del mueble genérico—, luego DOS
   * —el del contrato de pintor y el del mueble, iguales palabra por palabra— y ahora es UNO: el de
   * `LaMesaDeUnPintor`, que vive en el mueble (`tablero-en-linea.tsx`) y el contrato presta. Que
   * nadie vuelva a escribirse el suyo —las tres pantallas, el contrato, el mueble— lo compran las
   * reglas del contrato, más arriba; aquí se mira que el que queda abra la mesa de siempre.
   */
  const PROPIOS = ['tablero-en-linea.tsx'];
  const losDeLaApp = fs
    .readdirSync(path.join(SRC, 'arcade'))
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => [f, soloCodigo(leer(path.join(SRC, 'arcade', f)))]);
  const soloElLobbyComun = (lista) => {
    const conModalidad = lista.flatMap(([f, t]) => llamadasAAbrir(t).filter((l) => l.args > 3).map((l) => ({ f, texto: l.texto })));
    const propios = lista.filter(([f]) => PROPIOS.includes(f));
    return (
      conModalidad.length === 1 &&
      conModalidad[0].f === 'hoja-del-muelle.tsx' &&
      conModalidad[0].texto.endsWith(', modalidadQueViaja(elegida, compuerta))') &&
      propios.length === PROPIOS.length &&
      propios.every(([, t]) => llamadasAAbrir(t).length > 0 && llamadasAAbrir(t).every((l) => l.args <= 3 && !/modalidad|botas/i.test(l.texto)))
    );
  };
  comprobar(
    `los vestíbulos propios de los juegos siguen abriendo la mesa de siempre, y de los ${losDeLaApp.length} ficheros de la Sala sólo la orilla del lobby común le pasa una modalidad a \`abrir\``,
    losDeLaApp.length > 20 && soloElLobbyComun(losDeLaApp),
    losDeLaApp.flatMap(([f, t]) => llamadasAAbrir(t).map((l) => `${f}: ${l.args} · ${l.texto.slice(0, 90)}`)),
  );
  comprobar(
    'se ve fallar: un vestíbulo propio que abriera de botas, o la orilla mandándola a pelo, cae; y el contador no confunde las comas de dentro',
    !soloElLobbyComun([...losDeLaApp, ['vestibulo-propio.tsx', "mesa.abrir(nombre.trim(), PLAZOS[plazo]?.segundos, undefined, 'botas');"]]) &&
      !soloElLobbyComun(losDeLaApp.map(([f, t]) => [f, f === 'hoja-del-muelle.tsx' ? t.replace('modalidadQueViaja(elegida, compuerta))', "'botas')") : t])) &&
      llamadasAAbrir("mesa.abrir(a(b, c), [d, e], { f, g }, 'h, i')")[0]?.args === 4 &&
      llamadasAAbrir('mesa.abrir()')[0]?.args === 0,
  );
}

/*
 * ═══ BOOTS ON BOARD EN LA APP: «GOLPEAR» ═══
 *
 * La refriega se golpea con la G en el escritorio, y aquí con un botón (`BotonDeGolpear`, en
 * `mandos-del-paseo.tsx`). Todo lo que puede ir mal con él va mal en silencio, y en el escritorio
 * nada de eso se ve:
 *
 *   · Que sea un `Pressable`: con el pulgar en la palanca, el dedo nuevo ni le pregunta —la
 *     negociación empieza en el antepasado común de los dos—, y no se puede golpear andando. Tiene
 *     que ser el toque en crudo, `onTouchStart`; y nada de `onClick`, que en la app no llega.
 *   · Que quien reescribe la referencia —la palanca, sesenta veces por segundo; el correr— se deje
 *     los golpes por el camino: el golpe del otro pulgar desaparece antes de que lo lea el paseo.
 *   · Que tape la palanca o el correr, o que en el Burgo se salga de la franja del paseo, que mide
 *     152 y fuera de la cual el dedo no llega en Android. La cuenta del sitio se EJECUTA: sus
 *     medidas y `ladoDelGolpe` se sacan del fuente y se corren para los anchos de teléfono.
 *   · Y que salga donde no toca —en una mesa normal, mirando la mesa— o que, escondido, siga
 *     cogiendo el dedo: tiene que no pintarse.
 *
 * Lo que esto no compra es que en un teléfono se vea bien y se acierte con el pulgar: eso pide
 * un teléfono. Cada regla se afirma sobre el fichero de verdad y se ve CAER envenenada.
 */
paso('Boots on Board en la app: «Golpear» sólo a pie y con canal, con el toque en crudo, sin tapar la palanca ni el correr, y sin perder un golpe');
{
  const mandos = leer(path.join(SRC, 'arcade', 'mandos-del-paseo.tsx'));
  const laDelBurgo = leer(path.join(SRC, 'arcade', 'burgo-en-tres-escena.tsx'));
  const PANTALLAS = [
    ['Las Lindes', leer(path.join(SRC, 'arcade', 'lindes-en-tres-escena.tsx')), "modo !== 'mesa'"],
    ['el Burgo', laDelBurgo, 'aPie'],
    ['Riberas', leer(path.join(SRC, 'arcade', 'riberas-en-tres-escena.tsx')), 'aPie'],
  ];
  const soloCodigo = (texto) =>
    texto
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const aLaLetra = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /** Afirma la regla sobre el fichero de verdad, y la ve CAER con cada caso envenenado. */
  const regla = (que, prueba, bueno, envenenados, porque) => {
    comprobar(que, prueba(bueno), porque);
    envenenados.forEach((envenenado, i) => {
      comprobar(
        `y «${que}» se ve CAER con el caso envenenado ${String(i + 1)}`,
        envenenado !== bueno && !prueba(envenenado),
        envenenado === bueno ? 'el envenenado no ha cambiado el fichero: la regla no se está poniendo a prueba' : porque,
      );
    });
  };

  /* ── El botón ── */
  const elBoton = (t) =>
    /export function BotonDeGolpear\(\{ mandos, visible \}: BotonDeGolpearProps\): JSX\.Element \| null \{([\s\S]*?)\n\}/.exec(soloCodigo(t))?.[1] ?? '';
  regla(
    '«Golpear» se pulsa con el toque EN CRUDO —`onTouchStart`, que llega aunque la palanca sea el respondedor—, sin `Pressable` ni `onClick`, cuenta un golpe más sin tocar lo demás, y el lector de pantalla lo activa',
    (t) => {
      const b = elBoton(t);
      return (
        b.length > 0 &&
        /onTouchStart=\{\(\) => \{\s*golpear\(\);/.test(b) &&
        !/Pressable|onPress|onClick/.test(b) &&
        /mandos\.current = \{ \.\.\.mandos\.current, golpes: mandos\.current\.golpes \+ 1 \};/.test(b) &&
        /accessibilityRole="button"/.test(b) &&
        /accessibilityActions=\{ACCIONES_DEL_GOLPE\}/.test(b) &&
        /if \(e\.nativeEvent\.actionName === 'activate'\) golpear\(\);/.test(b) &&
        /const ACCIONES_DEL_GOLPE[^=]*= \[\{ name: 'activate', label: 'Golpear' \}\];/.test(t) &&
        !/onClick/.test(soloCodigo(t))
      );
    },
    mandos,
    [mandos.replace('onTouchStart={() => {', 'onPress={() => {'), mandos.replace('golpes: mandos.current.golpes + 1', 'golpes: 1')],
    'con un `Pressable`, andando con la palanca el botón no se entera, y sin sumar se pisan dos toques seguidos',
  );
  regla(
    'y cuando no toca NO SE PINTA: su `return null` va antes de pintar nada y detrás de todos sus ganchos',
    (t) => {
      const b = elBoton(t);
      const salida = b.indexOf('if (!visible) return null;');
      return salida > 0 && b.indexOf('<View') > salida && !/\buse[A-Z]\w*\(/.test(b.slice(salida));
    },
    mandos,
    [mandos.replace('if (!visible) return null;', '')],
    'un botón escondido con opacidad seguiría cogiendo el dedo encima del tablero, y un gancho detrás del `return` rompe la pantalla al cambiar de rama',
  );

  /* ── Quien reescribe la referencia copia los golpes ── */
  regla(
    'la palanca y el correr, que reescriben la referencia, copian los golpes tal cual: el otro pulgar puede haber golpeado entre dos movimientos',
    (t) => {
      const escrituras = [...soloCodigo(t).matchAll(/mandos\.current = ([^;]*);/g)].map((m) => m[1] ?? '');
      return escrituras.length >= 5 && escrituras.every((e) => e === 'SIN_MANDOS_DE_FUERA' || /\bgolpes: mandos\.current\.golpes\b/.test(e) || /\.\.\.mandos\.current\b/.test(e));
    },
    mandos,
    [mandos.replace('y: -y / RECORRIDO }, deprisa: mandos.current.deprisa, golpes: mandos.current.golpes }', 'y: -y / RECORRIDO }, deprisa: mandos.current.deprisa }')],
    'una palanca que reescribe `{ palanca, deprisa }` borra el golpe que el otro pulgar acaba de dar, y el golpe no sale nunca',
  );

  /* ── Dónde va, con la cuenta de verdad ── */
  const MEDIDAS = ['BASE', 'ABAJO_DEL_CORRER', 'ANCHO_DEL_CORRER', 'LADO_DEL_GOLPE', 'LADO_MINIMO_DEL_GOLPE', 'HUECO_DEL_GOLPE', 'LO_DE_LA_PALANCA', 'LO_DEL_CORRER'];
  const lasMedidas = MEDIDAS.map((n) => new RegExp(`^const ${n} = [^;\\n]+;`, 'm').exec(mandos)?.[0] ?? `const ${n} = Number.NaN;`);
  const laCuenta = /export function ladoDelGolpe\(ancho: number\): number \{[\s\S]*?\n\}/.exec(mandos)?.[0] ?? 'export function ladoDelGolpe() { return Number.NaN; }';
  const laFranja = /^const ALTO_DE_LA_FRANJA_ANDANDO = [^;\n]+;/m.exec(laDelBurgo)?.[0] ?? 'const ALTO_DE_LA_FRANJA_ANDANDO = Number.NaN;';
  const js = ts.transpileModule(
    `${lasMedidas.join('\n')}\n${laFranja}\n${laCuenta}\nexport const MEDIDAS = { BASE, ABAJO_DEL_CORRER, ANCHO_DEL_CORRER, LO_DEL_CORRER, ALTO_DE_LA_FRANJA_ANDANDO };`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
  ).outputText;
  const { ladoDelGolpe, MEDIDAS: m } = await import(`data:text/javascript;base64,${Buffer.from(js, 'utf8').toString('base64')}`);
  /** Dónde queda el golpe en un lienzo de `ancho` puntos, con su derecha a `derechaDelGolpe` del canto. */
  const dibujo = (ancho, derechaDelGolpe = m.LO_DEL_CORRER) => {
    const lado = ladoDelGolpe(ancho);
    const derecha = ancho - derechaDelGolpe;
    return { lado, izquierda: derecha - lado, derecha, arriba: m.ABAJO_DEL_CORRER + lado };
  };
  const tapa = (ancho, derechaDelGolpe) => {
    const d = dibujo(ancho, derechaDelGolpe);
    return d.izquierda < 16 + m.BASE || d.derecha > ancho - 16 - m.ANCHO_DEL_CORRER;
  };
  const ANCHOS = [360, 375, 390, 393, 412, 414, 428, 430];
  comprobar(
    'de 360 a 430 puntos de ancho, «Golpear» no tapa ni la palanca ni el correr',
    ANCHOS.every((w) => !tapa(w)),
    ANCHOS.map((w) => [w, dibujo(w)]),
  );
  comprobar('se ve fallar: con el golpe donde está el correr, lo tapa', ANCHOS.every((w) => tapa(w, 16)));
  comprobar(
    'y es grande para el pulgar: 76 puntos desde 375, 64 o más en todos, y nunca menos de 48, ni en 320 ni con un ancho roto',
    ladoDelGolpe(375) === 76 && ANCHOS.every((w) => ladoDelGolpe(w) >= 64) && ladoDelGolpe(320) === 48 && ladoDelGolpe(Number.NaN) === 48,
    ANCHOS.map((w) => ladoDelGolpe(w)),
  );
  comprobar(
    `y cabe en la franja del paseo del Burgo (${String(m.ALTO_DE_LA_FRANJA_ANDANDO)} de alto), que es donde el dedo llega en Android`,
    [320, ...ANCHOS].every((w) => dibujo(w).arriba <= m.ALTO_DE_LA_FRANJA_ANDANDO),
    [320, ...ANCHOS].map((w) => dibujo(w).arriba),
  );
  comprobar(
    'y el estilo lo pone donde dice la cuenta: a la izquierda del correr, a su altura, y el correr con su ancho fijo',
    /golpear: \{\s*position: 'absolute',\s*right: LO_DEL_CORRER,\s*bottom: ABAJO_DEL_CORRER,/.test(mandos) &&
      /correr: \{\s*position: 'absolute',\s*right: 16,\s*bottom: ABAJO_DEL_CORRER,\s*width: ANCHO_DEL_CORRER,/.test(mandos) &&
      /\{ width: lado, height: lado, borderRadius: lado \/ 2 \}/.test(mandos),
  );

  /* ── Las tres pantallas lo montan: a pie, SÓLO con canal, junto a la palanca ── */
  for (const [juego, fuente, aPie] of PANTALLAS) {
    const esperado = new RegExp(
      `<MandosDelPaseo mandos=\\{mandos\\} visibles=\\{${aLaLetra(aPie)}\\} \\/>\\s*<BotonDeGolpear mandos=\\{mandos\\} visible=\\{${aLaLetra(aPie)} && canal !== undefined\\} \\/>`,
    );
    regla(
      `${juego}: la pantalla monta «Golpear» UNA vez, junto a la palanca y en su misma caja, a pie y SÓLO con canal`,
      (t) => {
        const c = soloCodigo(t);
        return esperado.test(c) && (c.match(/<BotonDeGolpear\b/g) ?? []).length === 1 && /import \{ BotonDeGolpear \} from '\.\/mandos-del-paseo';/.test(c);
      },
      fuente,
      [fuente.replace(`visible={${aPie} && canal !== undefined}`, `visible={${aPie}}`), `${fuente}\n<BotonDeGolpear mandos={mandos} visible />`],
      'sin la pregunta por el canal, una mesa normal enseñaría un botón que no golpea a nadie; y fuera de la caja de la palanca, en el Burgo el dedo no llegaría en Android',
    );
  }
}

/**
 * EL GUARDIA DE «NO SE HAN HECHO TODAS», el mismo que llevan el servidor y la escena.
 *
 * Este guion no lo tuvo nunca, y la fase que metió aquí las comprobaciones del empate del
 * Vado en la ficha del móvil lo dejó dicho: un bloque borrado, o un guion que se cae a la
 * mitad, termina con código cero y una lista corta de aciertos, y eso se lee como verde.
 * Con el número escrito, salir con menos es un fallo ruidoso. Va a mano y se sube al
 * añadir comprobaciones; un guardia desfasado no guarda nada.
 */
/*
 * Y VA CON MARGEN Y NO AL RAS: hoy se hacen 265 —el Burgo trajo treinta y cinco al llegar,
 * otras treinta y dos cuando se hizo de pantalla completa, dos más para que un mueble que no
 * se monta se vea rojo y catorce en la tanda de los cuatro reparos de la app (la trampa de
 * foco de las tres hojas, el techo del pie flotante y lo que cede debajo, las hojas montadas
 * en las dos ramas, el cajón que baja al tocar un jugador, la región viva que sobraba y el
 * teclado que tapaba la puja), la mitad de todas ellas vacunas— y el guardia está en 253. Al
 * ras hace lo contrario de lo que quiere: una comprobación que se cae de su bloque dispara el
 * guardia en vez de la roja.
 *
 * ═══ Y LAS ROJAS SE IMPRIMEN ANTES DE QUE EL GUARDIA SALGA ═══
 *
 * Estaban al revés: con el guardia delante, un bloque que se cayera a la mitad terminaba
 * con «sólo se han hecho N» y SIN el nombre de lo que se había roto, que es justo el dato
 * que hace falta para arreglarlo. Ahora las rojas se cuentan primero y el guardia habla
 * después, con su propio código de salida (2) para que se distinga de una roja de verdad.
 */
/* Y dieciocho más de Boots on Board en la app —la mitad, vacunas—: el guardia sube con ellas. */
/* Y veintiuna de «Golpear», la refriega en la app —once de ellas, vacunas—: el guardia sube con ellas. */
/*
 * Y cuarenta y una del contrato de pintor de la app —veinticinco de ellas, vacunas—: las dos que se
 * reescriben en la red de Riberas y del Burgo no cambian la cuenta, y la del Burgo gana su segunda
 * mitad, la red del contrato vista caer sin el apunte. Y una más: la rueda de la app con los números
 * del escritorio. El guardia sube con ellas.
 */
const COMPROBACIONES_ESCRITAS = 334;

if (fallos.length > 0) {
  console.error(`\n✘ ${fallos.length} de ${cuantas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.error(`   · ${f}`);
}

if (cuantas < COMPROBACIONES_ESCRITAS) {
  console.error(
    `\nSolo se han hecho ${cuantas} de las ${COMPROBACIONES_ESCRITAS} comprobaciones que ` +
      'tiene escritas este guion: se ha caído por el camino sin decirlo. ' +
      'Si has añadido comprobaciones nuevas, sube el número.',
  );
  process.exit(2);
}

if (fallos.length > 0) process.exit(1);

console.log(
  `\n✔ ${cuantas} comprobaciones. La Sala de la portada enseña lo que trae el binario Y lo que\n` +
    '  instaló el servidor, cada tarjeta apagada dice SU razón y no una frase para todas, un\n' +
    'icono o un nombre que esta versión no conozca no se lleva la pantalla por delante, y lo\n' +
    '  que viene dentro se puede jugar aunque no conteste nadie.',
);
