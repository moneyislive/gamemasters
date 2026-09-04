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
