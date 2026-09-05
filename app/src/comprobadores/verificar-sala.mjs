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
 * El binario con el que se ejercita el juicio.
 *
 * Es el de VERDAD —se comprueba más abajo contra las tablas— y no uno inventado:
 * probar la regla contra un binario imaginario compraría que la regla es
 * coherente consigo misma, que no es lo que hay que comprar.
 */
const BINARIO = {
  juegos: ['frente', 'el-arcade', 'riberas', 'peonza'],
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
   * Se cuentan las entradas y se contrastan con la lista de arriba: un juego nuevo
   * con pintor propio obliga a tocar esta prueba, que es justo lo que se quiere.
   */
  const cuerpoDeLosQuePinta = pintados.split('LOS_QUE_PINTA: Record<ArcadeId, ComponentType> = {')[1] ?? '';
  const entradas = (cuerpoDeLosQuePinta.split('};')[0] ?? '').match(/^\s*\[[A-Z_]+\]:/gm) ?? [];
  comprobar(
    'el binario trae exactamente los juegos con los que se juzga arriba',
    entradas.length === BINARIO.juegos.length,
    { enLaTabla: entradas.length, conLosQueSeJuzga: BINARIO.juegos.length },
  );
  for (const constante of ['FRENTE', 'EL_ARCADE', 'RIBERAS', 'PEONZA']) {
    comprobar(`y «${constante}» esta entre ellos`, new RegExp(`\\[${constante}\\]:`).test(pintados), constante);
  }
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
   * EL DELTA NO SE MONTA DONDE SALDRÍA GRIS, y el modelo no se pide siquiera.
   *
   * `tablero.glb` lleva la textura empotrada y Hermes no la decodifica: en nativo
   * `texturas-nativas.ts` la sustituye por blanco para que la carga no reviente, y
   * el tablero llega sin un solo color. Un delta gris no es una versión más pobre;
   * es un tablero donde no se distingue una salina de un cantil. Estas dos
   * comprobaciones son las que hay que ver caer el día que el modelo se hornee a
   * color por vértice y se borre la constante.
   */
  comprobar(
    'el delta sólo se monta donde se ve con color (`EL_DELTA_SE_VE_AQUI`)',
    /const EL_DELTA_SE_VE_AQUI = Platform\.OS === 'web'/.test(escena) &&
      /if \(!EL_DELTA_SE_VE_AQUI \|\| datos === null/.test(escena),
    'sin esto, en el móvil se pinta un tablero sin colores en vez del retablo',
  );
  comprobar(
    'y donde no se monta no se piden los dos megas del modelo',
    /usarCatalogoDelTablero\(EL_DELTA_SE_VE_AQUI\)/.test(escena) &&
      /if \(!hazFalta\) return undefined;/.test(escena),
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
   * El pellizco y el paseo exigen DOS PUNTEROS de verdad, y la única plataforma donde
   * esta pantalla monta el delta es la web (`EL_DELTA_SE_VE_AQUI`), o sea un navegador
   * de escritorio con un ratón o un panel táctil: uno da un puntero, el otro manda
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
  comprobar(
    'y la pantalla le da el nodo del lienzo, que es donde se escucha',
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

  comprobar(
    'la mano del mazo sale de `cartasEnTres` y se le da a `<Delta>`',
    /const cartasDelMazo = useMemo\(\(\) => cartasEnTres\(laVista, opciones\)/.test(escena) &&
      /cartasDelMazo=\{cartasDelMazo\}/.test(escena),
    'sin esto la franja de la izquierda no se pinta y las cartas no existen en la pantalla',
  );
  comprobar(
    'y con ella los tres avisos que la escena da: coger, jugar y revelar',
    /onCogerCartaDelMazo=\{alCogerCartaDelMazo\}/.test(escena) &&
      /onJugarCarta=\{alJugarCarta\}/.test(escena) &&
      /onRevelarCarta=\{alRevelarCarta\}/.test(escena) &&
      /cartaDelMazoCogida=\{cogidaDelMazo\}/.test(escena),
    'una mano que se pinta y no avisa de nada es un dibujo de una mano',
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
    'y al cambiar la revisión de la mesa se suelta TAMBIÉN el naipe y la hoja abierta',
    /ponerCogidaDelMazo\(null\);/.test(escenaSinComentarios) &&
      /ponerComoJugarla\(null\);\n  \}, \[\]\);/.test(escenaSinComentarios) &&
      /\}, \[vista\.rev, soltarTodo\]\);/.test(escenaSinComentarios),
    'una hoja de «¿a quién le robas?» abierta con las opciones de antes manda un movimiento muerto',
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

  /* ─── Comprar, que no es de la mano ─── */

  comprobar(
    'COMPRAR no se filtra con la mano y su botón sigue diciendo lo que cuesta',
    /opcionesFueraDeLaMano\(opcionesFueraDelTablero\(opciones\)\)/.test(escenaSinComentarios) &&
      !codigoDeLaEscena.some((l) => /\bCOMPRAR\b|riberas:comprar/.test(l)) &&
      /\{o\.ayuda\}/.test(mueble),
    'comprar no cuelga de ningún naipe: su único sitio es el botón, y el coste va en su ayuda',
  );

  /* ─── El respaldo: donde no hay franja, las cartas son botones ─── */

  comprobar(
    'el respaldo NO quita las opciones de la mano: ahí las cartas se juegan por botón',
    respaldo.length > 0 &&
      !/opcionesFueraDeLaMano/.test(respaldo) &&
      /opcionesSueltas\(tablero, opciones\)/.test(respaldo),
    'sobre el retablo no hay mano que pintar: quitarlas dejaría el móvil con cartas y sin jugarlas',
  );
  comprobar(
    'y el marcador se ve también ahí, que es la rama que hoy ve todo el móvil',
    /<ElMarcador marcador=\{marcador\} \/>/.test(respaldo),
    'un marcador que sólo saliera con el delta no lo vería nadie que juegue desde el teléfono',
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

// ---------------------------------------------------------------------------

if (fallos.length > 0) {
  console.error(`\n✘ ${fallos.length} de ${cuantas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.error(`   · ${f}`);
  process.exit(1);
}

console.log(
  `\n✔ ${cuantas} comprobaciones. La Sala de la portada enseña lo que trae el binario Y lo que\n` +
    '  instaló el servidor, cada tarjeta apagada dice SU razón y no una frase para todas, un\n' +
    'icono o un nombre que esta versión no conozca no se lleva la pantalla por delante, y lo\n' +
    '  que viene dentro se puede jugar aunque no conteste nadie.',
);
