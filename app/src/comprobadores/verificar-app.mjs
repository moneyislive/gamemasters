/**
 * Los dos arrastres de la app, comprobados.
 *
 *   node app/src/comprobadores/verificar-app.mjs
 *
 * POR QUÉ ESTÁ AQUÍ Y NO EN `app/scripts/`. Este agente solo posee `app/src/**`
 * y `app/app/**`, y en `app/app/**` no cabe: todo lo que hay ahí es una RUTA de
 * expo-router. Metro no empaqueta lo que nadie importa, así que un `.mjs`
 * suelto en `src/` no llega al binario. La línea para `app/package.json` va en
 * el informe, que ese fichero lo integra otra persona.
 *
 * POR QUÉ NO ES UN `grep` CON DELIRIOS DE GRANDEZA. La decisión de qué servidor
 * manda vive en `servidor-elegido.ts` sin importar nada de React Native
 * justamente para poder EJECUTARLA aquí: este comprobador la transpila con el
 * TypeScript que ya está instalado en `app/` y la llama de verdad. Una
 * comprobación que solo mirase el texto del fichero pasaría en verde con la
 * lógica invertida, que es exactamente el fallo que hay que cazar.
 *
 * Lo que sí se mira leyendo ficheros es el CABLEADO —que esa decisión esté
 * enchufada donde toca, que los desvíos apunten a rutas que existen y que el
 * enlace muerto de la tienda no se haya colado en la app—, porque eso no es
 * una función que se pueda llamar: es cómo encajan unos ficheros con otros, y
 * ahí es donde se rompen las cosas sin que nadie se entere.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, '..');
const RUTAS = path.resolve(SRC, '..', 'app');

let hechas = 0;
const fallos = [];

function comprobar(que, condicion, detalle) {
  hechas++;
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
 * Carga un módulo TypeScript sin dependencias y lo devuelve ejecutable.
 *
 * Se transpila a una URL `data:` en vez de a un fichero temporal para no dejar
 * basura si la prueba se cae a la mitad.
 */
async function cargarModuloTs(fichero) {
  const js = ts.transpileModule(leer(fichero), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js, 'utf8').toString('base64')}`);
}

/**
 * El cuerpo de una función, para poder afirmar cosas de ELLA y no del fichero.
 *
 * La primera llave que aparece tras la firma NO es la del cuerpo: en
 * `cargarSesionGuardada(): Promise<{ token: ... }>` es la del tipo de retorno,
 * y quedarse con ella devolvía una firma disfrazada de cuerpo en la que, por
 * supuesto, no había ninguna de las llamadas que se buscan. Se salta lo que
 * esté dentro de paréntesis o de ángulos.
 */
function cuerpoDe(fuente, firma) {
  const inicio = fuente.indexOf(firma);
  if (inicio === -1) return null;
  let parentesis = 0;
  let angulos = 0;
  let abre = -1;
  for (let i = inicio + firma.length; i < fuente.length; i++) {
    const c = fuente[i];
    if (c === '(') parentesis++;
    else if (c === ')') parentesis--;
    else if (c === '<') angulos++;
    else if (c === '>' && fuente[i - 1] !== '=') angulos--;
    else if (c === '{' && parentesis === 0 && angulos === 0) {
      abre = i;
      break;
    }
  }
  if (abre === -1) return null;
  let nivel = 0;
  for (let i = abre; i < fuente.length; i++) {
    if (fuente[i] === '{') nivel++;
    else if (fuente[i] === '}') {
      nivel--;
      if (nivel === 0) return fuente.slice(abre, i + 1);
    }
  }
  return null;
}

/**
 * Qué parámetros de ruta lee de verdad una pantalla.
 *
 * Se miran los nombres DESESTRUCTURADOS de `useLocalSearchParams`, y no si el
 * fichero menciona la palabra por algún sitio: la primera versión de esta
 * comprobación hacía lo segundo y pasaba en verde con el destino arreglado para
 * ignorar el parámetro, porque el `import` de arriba y el nombre de una
 * variable cualquiera bastaban para engañarla.
 */
function parametrosQueLee(fuente) {
  const nombres = new Set();
  for (const m of fuente.matchAll(/const\s*\{([^}]*)\}\s*=\s*useLocalSearchParams/g)) {
    for (const trozo of m[1].split(',')) {
      const nombre = trozo.split(':')[0].trim();
      if (nombre) nombres.add(nombre);
    }
  }
  return nombres;
}

/**
 * Cada `router.replace(...)` de un desvío, con su destino y SUS parámetros.
 *
 * Se recorta el argumento de cada llamada equilibrando paréntesis en vez de
 * buscar destinos y parámetros por separado en todo el fichero. Una pantalla de
 * desvío tiene más de una salida —con cuenta a un sitio, sin cuenta a otro— y
 * al buscarlos sueltos se emparejaba cada destino con los parámetros de todos
 * los demás, con lo que la comprobación exigía a la portada que leyera el sobre
 * que solo se le manda a la pantalla de cuenta.
 */
function llamadasDeDesvio(fuente) {
  const salida = [];
  const marca = 'router.replace(';
  let i = fuente.indexOf(marca);
  while (i !== -1) {
    let nivel = 0;
    let fin = -1;
    for (let j = i + marca.length - 1; j < fuente.length; j++) {
      if (fuente[j] === '(') nivel++;
      else if (fuente[j] === ')') {
        nivel--;
        if (nivel === 0) {
          fin = j;
          break;
        }
      }
    }
    if (fin === -1) break;
    const argumento = fuente.slice(i + marca.length, fin);
    const literal = argumento.match(/^\s*'([^']+)'/);
    const conNombre = argumento.match(/pathname:\s*'([^']+)'/);
    salida.push({
      destino: literal ? literal[1] : conNombre ? conNombre[1] : null,
      // `[^{}\n]*` y no `\s*`: los parámetros se pasan a menudo tras un
      // condicional —`params: sobre ? { invitacion } : {}`— y con `\s*` no
      // casaba nada, de modo que no se miraba ni un parámetro y la
      // comprobación pasaba en verde por no haber hecho nada.
      params: [...argumento.matchAll(/params:[^{}\n]*\{([^}]*)\}/g)].flatMap((m) =>
        [...m[1].matchAll(/(\w+)\s*:/g)].map((p) => p[1]),
      ),
    });
    i = fuente.indexOf(marca, fin);
  }
  return salida;
}

/** De un `pathname` de expo-router al fichero que lo sirve, si existe. */
function ficheroDeRuta(ruta) {
  const limpia = ruta.replace(/^\/+/, '');
  const candidatos =
    limpia === ''
      ? ['index.tsx', 'index.ts']
      : [`${limpia}.tsx`, `${limpia}.ts`, `${limpia}/index.tsx`, `${limpia}/index.ts`];
  for (const c of candidatos) {
    const entero = path.join(RUTAS, c);
    if (fs.existsSync(entero)) return entero;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1 · La dirección compilada gana a la guardada cuando ha cambiado
// ---------------------------------------------------------------------------

paso('La decisión de servidor, ejecutada de verdad');

const CASA = 'http://192.168.1.40:5174';
const VIEJO = 'http://localhost:5174';
const NUEVO = 'https://harkania.com';

const { decidirServidor } = await cargarModuloTs(path.join(SRC, 'servidor-elegido.ts'));

comprobar('sin elección guardada se usa la compilada', (() => {
  const v = decidirServidor({ elegido: null, compiladoDeEntonces: null }, NUEVO);
  return v.servidor === NUEVO && v.olvidar === false && v.motivo === 'sin-eleccion';
})());

comprobar('quien elige a propósito en ESTA versión conserva su elección', (() => {
  const v = decidirServidor({ elegido: CASA, compiladoDeEntonces: NUEVO }, NUEVO);
  return v.servidor === CASA && v.olvidar === false && v.motivo === 'eleccion-de-esta-version';
})());

comprobar(
  'el fósil de las veladas ya jugadas (elección sin testigo) se descarta y se borra',
  (() => {
    const v = decidirServidor({ elegido: CASA, compiladoDeEntonces: null }, NUEVO);
    return v.servidor === NUEVO && v.olvidar === true && v.motivo === 'eleccion-sin-testigo';
  })(),
);

comprobar(
  'si la dirección compilada cambió desde que se eligió, manda la compilada',
  (() => {
    const v = decidirServidor({ elegido: CASA, compiladoDeEntonces: VIEJO }, NUEVO);
    return v.servidor === NUEVO && v.olvidar === true && v.motivo === 'eleccion-de-otra-version';
  })(),
);

comprobar(
  'una elección que apuntaba a la compilada de entonces tampoco sobrevive al cambio',
  (() => {
    const v = decidirServidor({ elegido: VIEJO, compiladoDeEntonces: VIEJO }, NUEVO);
    return v.servidor === NUEVO && v.olvidar === true;
  })(),
);

comprobar('elegir la misma dirección compilada no se confunde con no elegir', (() => {
  const v = decidirServidor({ elegido: NUEVO, compiladoDeEntonces: NUEVO }, NUEVO);
  return v.servidor === NUEVO && v.olvidar === false && v.motivo === 'eleccion-de-esta-version';
})());

// ---------------------------------------------------------------------------
// 2 · Y esa decisión está enchufada donde se arranca
// ---------------------------------------------------------------------------

paso('El cableado en api.ts');

const api = leer(path.join(SRC, 'api.ts'));
/*
 * EL CUERPO VIVE EN `leerSesionDelDisco`, NO EN `cargarSesionGuardada`.
 *
 * Esto buscaba `export async function cargarSesionGuardada` y esa firma ya no
 * existe: la funcion se partio en dos para memoizar la lectura, y hoy es
 * `export function` delegando en `leerSesionDelDisco`. `cuerpoDe` devolvia
 * `null` y las cuatro comprobaciones de aqui abajo llevaban en rojo desde
 * entonces, con lo cual la vigilancia entera sobre a que servidor se conecta la
 * app estaba apagada — y un comprobador que siempre falla deja de mirarse, que
 * es la peor forma de no tener pruebas.
 */
const cargar = cuerpoDe(api, 'async function leerSesionDelDisco');
const fijar = cuerpoDe(api, 'export async function fijarServidor');

comprobar('api.ts importa la decisión de servidor-elegido', /from '\.\/servidor-elegido'/.test(api));
comprobar('se encontró el cuerpo de la lectura de sesión', cargar !== null);
comprobar('se encontró el cuerpo de fijarServidor', fijar !== null);

comprobar(
  'la lectura de sesión decide con decidirServidor',
  Boolean(cargar && cargar.includes('decidirServidor(')),
);
comprobar(
  'la lectura de sesión NO vuelve a coger la guardada a pelo',
  Boolean(cargar && !/almacen\.get\(CLAVE_SERVIDOR\)\s*\)?\s*\?\?/.test(cargar)),
  cargar?.slice(0, 200),
);
comprobar(
  'la lectura de sesión borra la elección caducada Y su testigo',
  Boolean(
    cargar &&
      cargar.includes('almacen.del(CLAVE_SERVIDOR)') &&
      cargar.includes('almacen.del(CLAVE_SERVIDOR_COMPILADO)'),
  ),
);
/*
 * Y LO QUE LA PARTICION EXISTE PARA GARANTIZAR, que hoy no vigilaba nadie: que
 * `cargarSesionGuardada` MEMOIZA. Sin eso, dos pantallas que arranquen a la vez
 * leen el disco en paralelo y pueden decidir servidores distintos.
 */
comprobar(
  'cargarSesionGuardada memoiza la lectura y no la repite',
  /lectura\s*\?\?=/.test(api),
);
comprobar(
  'fijarServidor guarda el testigo junto a la elección',
  Boolean(
    fijar &&
      fijar.includes('almacen.set(CLAVE_SERVIDOR,') &&
      fijar.includes('almacen.set(CLAVE_SERVIDOR_COMPILADO, SERVIDOR_POR_DEFECTO)'),
  ),
);
comprobar(
  'el testigo se guarda con la dirección COMPILADA, no con la elegida',
  Boolean(fijar && !/almacen\.set\(CLAVE_SERVIDOR_COMPILADO,\s*servidor\)/.test(fijar)),
);

paso('Nadie guarda una elección de servidor que no ha hecho');

const entrar = leer(path.join(RUTAS, 'entrar.tsx'));
comprobar(
  'la pantalla de códigos solo fija el servidor si de verdad ha cambiado',
  /!==\s*api\.servidorActual\(\)[^\n]*\n?[^\n]*api\.fijarServidor|api\.fijarServidor/.test(entrar) &&
    /!==\s*api\.servidorActual\(\)/.test(entrar),
);

// ---------------------------------------------------------------------------
// 3 · Los desvíos de los enlaces llevan a alguna parte
// ---------------------------------------------------------------------------

paso('Los desvíos de harkania.com/i y harkania.com/e');

const DESVIOS = [
  { fichero: path.join(RUTAS, 'i', '[sobre].tsx'), parametro: 'sobre' },
  { fichero: path.join(RUTAS, 'e', '[codigo].tsx'), parametro: 'codigo' },
];

for (const desvio of DESVIOS) {
  const nombre = path.relative(RUTAS, desvio.fichero).replace(/\\/g, '/');
  comprobar(`${nombre}: el fichero de la ruta existe`, fs.existsSync(desvio.fichero));
  if (!fs.existsSync(desvio.fichero)) continue;
  const fuente = leer(desvio.fichero);

  comprobar(
    `${nombre}: lee su propio parámetro «${desvio.parametro}»`,
    parametrosQueLee(fuente).has(desvio.parametro),
    [...parametrosQueLee(fuente)],
  );
  comprobar(
    `${nombre}: desvía con replace y nunca con push (o el gesto de atrás hace bucle)`,
    fuente.includes('router.replace(') && !fuente.includes('router.push('),
  );

  const llamadas = llamadasDeDesvio(fuente);
  comprobar(`${nombre}: desvía a alguna parte`, llamadas.length > 0);
  for (const { destino, params } of llamadas) {
    comprobar(`${nombre}: el desvío dice a dónde va`, destino !== null);
    if (destino === null) continue;
    const fichero = ficheroDeRuta(destino);
    comprobar(`${nombre}: la ruta «${destino}» existe de verdad`, fichero !== null, destino);
    if (!fichero) continue;

    // Cada parámetro que se manda tiene que leerlo quien lo recibe. Un
    // parámetro que el destino tira no es un error de compilación ni un aviso:
    // simplemente no pasa nada, y eso no se descubre nunca.
    const lee = parametrosQueLee(leer(fichero));
    for (const p of params) {
      comprobar(
        `${nombre}: «${destino}» lee el parámetro «${p}» que se le manda`,
        lee.has(p),
        [...lee],
      );
    }
  }
}

paso('Las pantallas de destino no son un callejón sin salida');

for (const [nombre, fuente] of [
  ['entrar.tsx', entrar],
  ['cuenta.tsx', leer(path.join(RUTAS, 'cuenta.tsx'))],
]) {
  comprobar(
    `${nombre}: el botón de volver contempla que la pila esté vacía`,
    fuente.includes('router.canGoBack()'),
  );
  comprobar(
    `${nombre}: y en ese caso lleva a la portada`,
    /canGoBack\(\)[\s\S]{0,120}router\.replace\('\/'\)/.test(fuente),
  );
}

// ---------------------------------------------------------------------------
// 4 · El botón muerto de la App Store no vive en la app
// ---------------------------------------------------------------------------

paso('Ningún enlace de tienda con identificador de relleno');

function ficherosDe(dir) {
  const salida = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const entero = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...ficherosDe(entero));
    else if (/\.(ts|tsx|mjs|js|json)$/.test(entrada.name)) salida.push(entero);
  }
  return salida;
}

const sospechosos = [...ficherosDe(SRC), ...ficherosDe(RUTAS)].filter(
  (f) => f !== fileURLToPath(import.meta.url),
);
const conRelleno = sospechosos.filter((f) => /apps\.apple\.com[^\s'"]*id0{6,}/.test(leer(f)));
comprobar(
  'nadie ha copiado a la app el `id0000000000` de las páginas de aterrizaje',
  conRelleno.length === 0,
  conRelleno.map((f) => path.relative(RUTAS, f)),
);

// ---------------------------------------------------------------------------
// «No hay proveedores» y «no llego al servidor» NO pueden verse igual
// ---------------------------------------------------------------------------
/*
 * ESTE FALLO OCURRIO DE VERDAD, y por eso hay una comprobacion. `disponibles()`
 * atrapaba el error de red y devolvia `{google:false, apple:false}` — o sea,
 * exactamente lo mismo que responde un servidor sano sin proveedores
 * configurados. Un servidor dormido, un wifi caido o una direccion mal grabada
 * en el APK se disfrazaban de «esto no esta configurado», y se buscaba el fallo
 * donde no estaba.
 *
 * Se mira el CODIGO, sin comentarios: el porque de esto se explica largo y
 * tendido justo encima de la funcion, y buscar las palabras en el fichero
 * entero daria verde por la propia explicacion.
 */
{
  const entrarCon = fs.readFileSync(path.join(SRC, 'entrar-con.ts'), 'utf8');
  const codigo = entrarCon.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  comprobar(
    'disponibles() distingue no-configurado de no-alcanzable',
    codigo.includes("'sin-servidor'"),
    'entrar-con.ts vuelve a colapsar el fallo de red en «no hay proveedores»',
  );
  comprobar(
    'y no devuelve dos booleanos a secas desde el catch',
    !/catch\s*\{[^}]*google:\s*false[^}]*\}/.test(codigo),
    'el catch de disponibles() vuelve a inventarse una respuesta',
  );

  const cuenta = fs.readFileSync(path.join(RUTAS, 'cuenta.tsx'), 'utf8');
  comprobar(
    'y la pantalla de cuenta cuenta ese caso en vez de callarlo',
    cuenta.includes("'sin-servidor'") && /REINTENTAR/i.test(cuenta),
    'cuenta.tsx no ofrece reintentar cuando no se llega al servidor',
  );
}

// ---------------------------------------------------------------------------
// Nadie abre la app sin cara
// ---------------------------------------------------------------------------
/*
 * LA SITUACION QUE ESTO EVITA: los catalogos de rasgos —pieles, peinados,
 * atuendos— llevaban en avatar.ts desde el principio SIN QUE NADIE LOS
 * DIBUJARA. El unico retrato posible era el modelo 3D de Tripo, que exige subir
 * una foto y esperar un par de minutos, asi que quien abria la app por primera
 * vez —con prisa, camino de una cena— no era nadie y solo veia un boton.
 */
{
  const avatarTs = fs.readFileSync(path.join(SRC, 'avatar.ts'), 'utf8');
  const personajes = (avatarTs.match(/^ {4}id: '/gm) || []).length;
  comprobar(
    'el elenco trae diez personajes o mas',
    personajes >= 10,
    `solo hay ${personajes} en ELENCO`,
  );

  /*
   * Y SE GUARDA, no solo se devuelve. Si `cargarAvatar` se limitara a devolver
   * uno al azar sin escribirlo, cada pantalla que preguntara sacaria un
   * personaje distinto y la identidad cambiaria sola al navegar.
   */
  const codigo = avatarTs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  comprobar(
    'el primer arranque asigna identidad Y la guarda',
    /personajeDeEstreno\(\)/.test(codigo) && /almacen\.set\(JSON\.stringify\(estreno\)\)/.test(codigo),
    'cargarAvatar no persiste el personaje de estreno',
  );

  // La figura tiene que existir de verdad, o el elenco no se ve.
  comprobar(
    'hay una figura dibujada que interpreta los rasgos',
    fs.existsSync(path.join(SRC, 'figura.tsx')),
    'falta src/figura.tsx',
  );

  /*
   * SIN COMENTARIOS, y es la tercera vez que hace falta en este proyecto. El
   * comentario que explica el boton retirado LO NOMBRA, asi que buscarlo en el
   * fichero entero daba rojo con el codigo correcto. Una comprobacion que falla
   * cuando todo esta bien se acaba desactivando, y entonces ya no protege nada.
   */
  const portada = fs
    .readFileSync(path.join(RUTAS, 'index.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  comprobar(
    'la portada pinta la figura y ya no un reclamo para forjar',
    portada.includes('<Figura avatar={avatar}') && !portada.includes('FORJA TU AVATAR'),
    'la portada sigue enseñando el boton en vez de la figura',
  );
}

// ---------------------------------------------------------------------------
// El marco del telefono se respeta
// ---------------------------------------------------------------------------
/*
 * `SafeAreaProvider` estaba montado desde el principio y NINGUNA pantalla
 * preguntaba por los margenes, asi que el contenido se dibujaba debajo de la
 * hora y la bateria de Android. Tener el proveedor puesto y no usarlo es la
 * forma mas silenciosa de que esto pase: no falla nada, se pinta encima.
 */
for (const pantalla of ['index.tsx', 'avatar.tsx', 'cuenta.tsx']) {
  const fuente = fs.readFileSync(path.join(RUTAS, pantalla), 'utf8');
  comprobar(
    `${pantalla} se aparta de la barra de estado`,
    fuente.includes('usarMarco()') && fuente.includes('marco.arriba'),
    `${pantalla} no usa el marco: se dibujara bajo la hora y la bateria`,
  );
}

// ---------------------------------------------------------------------------
// Iniciar sesion no esta escondido
// ---------------------------------------------------------------------------
/*
 * VIVIA AL FINAL DE LA PORTADA, dentro de «Tu leyenda», detras de un enlace que
 * decia «Saber mas». Para encontrarlo habia que bajar por todo el catalogo de
 * juegos sin ningun motivo para sospechar que estaba alli. Y lo que hay detras
 * no es un extra: es lo que hace que las veladas, los trofeos y las
 * invitaciones sobrevivan al telefono.
 */
{
  const portada = fs
    .readFileSync(path.join(RUTAS, 'index.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  /*
   * Con el nombre delimitado, no `includes` a secas: `<SelloDeCuentaLoQueSea`
   * contiene la cadena `<SelloDeCuenta`, asi que la primera version daba verde
   * con el componente renombrado. Una comprobacion que pasa con el codigo roto
   * es peor que ninguna, porque da confianza.
   */
  comprobar(
    'el sello de cuenta esta en la botonera de arriba',
    /<SelloDeCuenta[\s/>]/.test(portada),
    'la portada no monta el sello: iniciar sesion vuelve a estar al final',
  );
  comprobar(
    'y se rehacen portada Y figura al entrar o salir',
    /onCambio=\{\(\) => \{[\s\S]*?cargarPortada\(\);[\s\S]*?cargarFigura\(\);/.test(portada),
    'onCambio no rehace las dos: la pantalla contaria dos versiones de quien eres',
  );

  const sello = fs
    .readFileSync(path.join(SRC, 'sello-cuenta.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  /*
   * Que el sello INFORME y no solo abra: sin el punto de estado, estar dentro y
   * estar fuera se ven igual y hay que abrir la hoja para saberlo.
   */
  comprobar(
    'el sello dice si hay sesion sin tener que abrirlo',
    sello.includes('puntoDentro') && sello.includes('discoDentro'),
    'el sello no distingue visualmente dentro de fuera',
  );
  /*
   * Y que no ofrezca Apple donde no funciona: fuera de iOS haria falta el flujo
   * web, que no existe. Un boton ahi seria un callejon.
   */
  comprobar(
    'Apple solo se ofrece donde el dialogo nativo existe',
    /Platform\.OS === 'ios'/.test(sello),
    'el sello ofreceria Apple fuera de iOS, donde no hay flujo',
  );
  /*
   * LA HOJA SE APARTA DE LA BARRA DE GESTOS. Se pega al borde inferior, que es
   * donde Android pinta la suya: sin apartarse, la ultima fila —justo «Cerrar
   * sesion»— queda medio tapada y parece cortada. Un boton a medias no se
   * lee como un fallo de margen, se lee como que la app esta rota.
   */
  comprobar(
    'la hoja de cuenta respeta la barra de gestos de abajo',
    /marco\.abajo/.test(sello),
    'la hoja se pega al borde: la ultima fila quedara medio tapada',
  );
  /*
   * Y el icono del sello es del TRAZO de los otros dos, no la figura del avatar:
   * la portada ya la enseña en grande justo debajo y repetirla en miniatura
   * resta, porque el ojo la lee como escena y no como control.
   */
  comprobar(
    'el icono del sello es de la familia de los otros botones',
    /function IconoUsuario/.test(sello),
    'el sello volvio a repetir la figura del avatar en miniatura',
  );
}

// ---------------------------------------------------------------------------
// Quien tiene cuenta no vuelve a la pantalla de codigos
// ---------------------------------------------------------------------------
/*
 * LO QUE PASABA: al pulsar una invitacion, si el servidor pedia codigo, la app
 * desviaba a /entrar — con el de la partida ya relleno y el personal vacio. Los
 * dos codigos son el camino de quien juega SIN cuenta; mandar ahi a quien acaba
 * de identificarse con Google es pedirle que demuestre otra vez lo que ya
 * demostro, y encima sin decirle por que.
 */
{
  const portada = fs
    .readFileSync(path.join(RUTAS, 'index.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  comprobar(
    'una invitacion que pide codigo NO desvia a la pantalla de codigos',
    !/requiereCodigo[\s\S]{0,200}?router\.push\('\/entrar'\)/.test(portada),
    'la portada vuelve a mandar a /entrar a quien ya tiene cuenta',
  );
  comprobar(
    'sino al panel, donde cada mesa explica su estado',
    /router\.push\('\/partidas'\)/.test(portada),
    'no hay salida al panel de partidas',
  );

  comprobar(
    'existe el panel de partidas',
    fs.existsSync(path.join(RUTAS, 'partidas.tsx')),
    'falta app/partidas.tsx',
  );
  /*
   * Y SE LLEGA DESDE LA PORTADA, no solo desde el menu de cuenta. La primera
   * version lo dejo colgando del sello — exactamente donde estaba el inicio de
   * sesion cuando dijimos que parecia escondido, y por el mismo motivo: hay que
   * saber que esta ahi para ir a buscarlo.
   */
  comprobar(
    'y se llega a el desde la portada, no solo desde el menu de cuenta',
    /accessibilityLabel="Ver todas tus partidas"/.test(portada),
    'el panel volvio a quedar escondido detras del sello de cuenta',
  );

  const panel = fs.readFileSync(path.join(RUTAS, 'partidas.tsx'), 'utf8');
  /*
   * EL ESTADO SE DICE CON PALABRA Y NO SOLO CON COLOR: en una mesa de doce hay
   * siempre alguien que no distingue el verde del ambar, y un estado contado
   * solo con un tono es un estado que esa persona no puede leer.
   */
  for (const estado of ['espera', 'en-curso', 'pausada', 'terminada', 'retirada']) {
    comprobar(
      `el panel sabe pintar el estado «${estado}»`,
      panel.includes(`${estado}:`) || panel.includes(`'${estado}'`),
      `el panel no contempla ${estado}`,
    );
  }
  comprobar(
    'y cuando no se puede entrar, se dice por que',
    /p\.motivo/.test(panel),
    'un boton que desaparece sin explicacion se lee como que la app se equivoco',
  );
}

// ---------------------------------------------------------------------------
// Un avatar 3D que no se puede enseñar NO desaparece en silencio
// ---------------------------------------------------------------------------
/*
 * LO QUE PASO. Se genera un avatar con Tripo, se ve bien, y al dia siguiente la
 * portada aparece sin nadie. El fichero del modelo vive en el disco de las
 * subidas del servidor, que en un plan sin disco persistente se borra en cada
 * despliegue; la app pedia un 404 y salia por un `if (!r.ok) return;` MUDO: sin
 * aviso, sin respaldo y sin una sola pista. «No se ve nada» y a adivinar.
 */
{
  const escena = fs.readFileSync(path.join(SRC, 'escena-avatar.tsx'), 'utf8');
  const codigo = escena.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  comprobar(
    'una respuesta que no es 200 deja de salir en silencio',
    !/if \(!r\.ok\) return;/.test(codigo),
    'el modelo vuelve a fallar sin decir nada',
  );
  comprobar(
    'y se avisa a quien manda para que ponga otra cosa',
    /alFallar\?\.\(/.test(codigo),
    'la escena no avisa: la portada se quedara vacia',
  );
  /*
   * Y la distincion que evita el dano: borrar el avatar de alguien porque el
   * salon tenia mala cobertura seria peor que no enseñarlo un rato.
   */
  comprobar(
    'solo se olvida el modelo cuando de verdad ya no existe',
    /r\.status === 404 \|\| r\.status === 410/.test(codigo),
    'se borraria el avatar ante cualquier fallo, incluida la mala cobertura',
  );
  /*
   * Y UN MODELO QUE LLEGA PERO NO SE ABRE TAMPOCO ES DEFINITIVO. El fichero
   * esta ahi: lo que falla es abrirlo —descodificador, descarga a medias— y eso
   * puede ir bien al siguiente intento o en otro telefono. Tratarlo como
   * definitivo apagaba la seleccion de la persona: volvia a la figura dibujada
   * y en el estudio su avatar esculpido ya no salia elegido, asi que tenia que
   * volver a marcarlo cada vez sin que la causa apareciera por ningun sitio.
   */
  /*
   * Se mira el PRIMER aviso tras la marca, no una ventana de caracteres: la
   * primera version cogia 400 y ahi dentro cabia tambien el `alFallar(false)`
   * del `catch` de mas abajo, asi que daba verde con el codigo roto.
   */
  const trasAbrir = codigo.split('no se pudo abrir')[1] ?? '';
  const primerAviso = /alFallar\?\.\((true|false)\)/.exec(trasAbrir);
  comprobar(
    'un modelo que llega y no se abre NO borra la seleccion',
    primerAviso?.[1] === 'false',
    `el primer aviso tras fallar al abrir es alFallar(${primerAviso?.[1]})`,
  );

  const portada = fs
    .readFileSync(path.join(RUTAS, 'index.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  comprobar(
    'la portada cae a la figura dibujada si el modelo falla',
    /modeloRoto/.test(portada) && /alFallar=/.test(portada),
    'la portada se quedara sin nadie cuando el modelo no cargue',
  );
}

// ---------------------------------------------------------------------------
// Una sola seleccion de avatar, y la que ya estaba no se pierde
// ---------------------------------------------------------------------------
/*
 * LO QUE NO SE PODIA HACER: elegir. Mandaba la simple presencia de `modeloUrl`,
 * asi que el 3D ganaba siempre; se elegia un personaje del elenco, se guardaba,
 * y la portada seguia enseñando el 3D como si no hubieras tocado nada. Y si el
 * 3D no cargaba, no se veia ninguno de los dos y la eleccion parecia inutil.
 */
{
  const av = fs
    .readFileSync(path.join(SRC, 'avatar.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  comprobar(
    'hay un campo explicito que dice cual esta activo',
    /usa3D\?: boolean/.test(av),
    'sin ese campo, el 3D vuelve a ganar siempre',
  );
  /*
   * Y LA MIGRACION, que es lo que evita romperle el avatar a quien ya tenia uno:
   * su dato guardado no lleva el campo, y sin esta regla su 3D desapareceria el
   * dia de la actualizacion sin que hiciera nada.
   */
  comprobar(
    'y quien ya tenia un 3D lo conserva activo al actualizar',
    /a\.modeloUrl[\s\S]{0,40}usa3D: true/.test(av),
    'un avatar esculpido antes de este campo dejaria de verse',
  );
  comprobar(
    'olvidar el modelo lo DESACTIVA en vez de borrarlo',
    /guardarAvatar\(\{ \.\.\.avatar, usa3D: false \}\)/.test(av),
    'se borraria la figura esculpida y nadie sabria que llego a tenerla',
  );

  const portada = fs
    .readFileSync(path.join(RUTAS, 'index.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  comprobar(
    'la portada respeta esa seleccion',
    /avatar\.usa3D/.test(portada),
    'la portada vuelve a enseñar el 3D aunque se haya elegido un personaje',
  );

  const estudio = fs.readFileSync(path.join(RUTAS, 'avatar.tsx'), 'utf8');
  comprobar(
    'y la figura esculpida se elige en la misma rejilla que el elenco',
    /rasgos\.modeloUrl &&/.test(estudio) && /rasgos\.usa3D &&/.test(estudio),
    'la esculpida vuelve a vivir aparte: no hay forma de ver cual esta puesta',
  );
}

// ---------------------------------------------------------------------------
// La geometria comprimida no se puede abrir en el telefono
// ---------------------------------------------------------------------------
/*
 * LO QUE COSTO DESCUBRIR. El servidor pedia a Tripo la geometria comprimida
 * —bajaba de 12,3 MB a 0,47— y un GLB asi solo se abre con un descodificador,
 * y TODOS (meshopt, Draco) estan compilados a WebAssembly. Hermes, el motor de
 * JavaScript de React Native, no ejecuta WebAssembly: el fichero llega entero
 * al telefono y no hay manera de abrirlo.
 *
 * El sintoma es identico al de un fichero que falta, asi que se estuvo mirando
 * el disco del servidor. Y en un navegador —donde WebAssembly si existe—
 * funciona perfectamente: se probo ahi, se dio por bueno, y en el movil no
 * funciono nunca.
 */
{
  const tripo = fs.readFileSync(
    path.join(SRC, '..', '..', 'server', 'src', 'ia', 'tripo.ts'),
    'utf8',
  );
  const codigoTripo = tripo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  comprobar(
    'el servidor NO pide a Tripo la geometria comprimida',
    !/compress:/.test(codigoTripo),
    'un GLB comprimido no se puede abrir en el telefono: no hay WebAssembly',
  );
  comprobar(
    'y controla el peso por numero de caras, que si funciona en todas partes',
    /face_limit:/.test(codigoTripo),
    'sin face_limit el modelo llega enorme',
  );

  const escena = fs
    .readFileSync(path.join(SRC, 'escena-avatar.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  /*
   * Y preparar el descodificador NO puede tumbar la carga de un modelo que no
   * lo necesita: si `MeshoptDecoder.ready` revienta sin proteccion, se lleva
   * por delante tambien los modelos sin comprimir, que se abririan solos.
   */
  comprobar(
    'preparar el descodificador no puede tumbar la carga',
    /try \{[\s\S]{0,200}MeshoptDecoder\.ready/.test(escena),
    'un fallo al preparar el descodificador impediria abrir hasta lo no comprimido',
  );
}

// ---------------------------------------------------------------------------
// Las texturas empotradas no pueden tumbar la geometria
// ---------------------------------------------------------------------------
/*
 * COMPROBADO EN EL CODIGO DE THREE, no supuesto: cuando un GLB trae las
 * imagenes dentro del binario —lo que devuelve Tripo con texture:true—
 * GLTFLoader construye un Blob, llama a URL.createObjectURL y se lo pasa a un
 * cargador que por dentro crea un <img>. Nada de eso existe en React Native.
 *
 * Y lo grave no es perder la textura: es que al reventar la carga NO SE VE NI
 * LA GEOMETRIA, que se abriria sola. El sintoma es un hueco, identico al de un
 * fichero que falta — por eso se busco en el disco del servidor durante dias.
 */
{
  const escena = fs
    .readFileSync(path.join(SRC, 'escena-avatar.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  comprobar(
    'la escena contempla que el motor no decodifique imagenes',
    /decodificaImagenes\(\)/.test(escena) && /cargador\.register\(/.test(escena),
    'una textura empotrada volveria a impedir que se vea la geometria',
  );

  const puente = fs.readFileSync(path.join(SRC, 'tres', 'texturas-nativas.ts'), 'utf8');
  /*
   * BLANCA Y NO GRIS: en un material la textura MULTIPLICA al color base, asi
   * que el blanco lo deja intacto y el modelo sale con los colores que Tripo
   * escribio. Cualquier otro tono los ensuciaria todos por igual.
   */
  comprobar(
    'y la textura de relevo es blanca, que no ensucia el color base',
    /255, 255, 255, 255/.test(puente),
    'una textura de relevo que no sea blanca tiñe el modelo entero',
  );
  /*
   * Y SOLO DONDE HACE FALTA: en un navegador las texturas de verdad si cargan,
   * y registrar el relevo alli las sustituiria por nada — cambiar un fallo en
   * el movil por una perdida de calidad en todas partes.
   */
  comprobar(
    'el relevo no se registra donde las texturas si funcionan',
    /if \(!decodificaImagenes\(\)\)/.test(escena),
    'el relevo se registraria siempre y quitaria las texturas tambien en la web',
  );
  /*
   * Y ES EL RELEVO BLANCO, NO EL ATLAS DEL TABLERO. Desde el 5-9-2026
   * `texturas-nativas.ts` tiene un segundo complemento, `texturasDelTablero`, que
   * contesta con el atlas compilado de `tablero.glb` para que el delta se vea con
   * color en el telefono. En un avatar de Tripo ese atlas pintaria al personaje
   * de hexagonos de hierba: el avatar sigue con `texturasLisas`, y esto lo vigila.
   */
  comprobar(
    'el avatar registra `texturasLisas`, el relevo blanco, y no el atlas del tablero',
    /cargador\.register\(texturasLisas\)/.test(escena) && !/texturasDelTablero/.test(escena),
    'con el atlas del tablero un personaje de Tripo saldria pintado de hexagonos',
  );
}

// ---------------------------------------------------------------------------
// Ningun hook detras de una salida temprana
// ---------------------------------------------------------------------------

/*
 * LA TRAMPA QUE SE ARMA SOLA.
 *
 * `mapa.tsx` llamaba a `useTema()` cien lineas por debajo de su
 * `if (!vista) return ...`: en la primera pintada no se llamaba y en la
 * siguiente si. No reventaba de milagro —`useTema` es un `useContext`, y esos
 * no ocupan sitio en la lista de hooks— pero el dia que a `useTema` se le
 * añada un `useMemo` dentro, la pantalla revienta con el error 300 de React en
 * el movil de alguien, a mitad de partida, y el fichero que se toco no sera
 * ese.
 *
 * Por eso no se comprueba «que no rompa»: se comprueba la regla entera, que no
 * haya NINGUN hook detras de un `return`. Razonar cual es inofensivo es
 * exactamente como se llega aqui.
 *
 * Se lee con el arbol de TypeScript y no con expresiones regulares porque la
 * pregunta —¿esta esta llamada despues de aquel return, en el mismo cuerpo?—
 * es de estructura, y un `grep` la contesta mal en las dos direcciones. Solo se
 * miran las sentencias del cuerpo: lo que ocurra dentro de una funcion anidada
 * es de esa funcion.
 */
{
  const pantallas = [];
  const recorrer = (dir) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules') continue;
        recorrer(completo);
      } else if (entrada.name.endsWith('.tsx')) {
        pantallas.push(completo);
      }
    }
  };
  recorrer(RUTAS);
  recorrer(SRC);

  const esHook = (nombre) => /^use[A-Z]/.test(nombre);
  const tarde = [];

  for (const fichero of pantallas) {
    const fuente = ts.createSourceFile(
      fichero,
      fs.readFileSync(fichero, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const relativo = path.relative(path.resolve(SRC, '..'), fichero).replace(/\\/g, '/');

    // Los hooks de un cuerpo, sin entrar en funciones de dentro.
    const hooksDe = (nodo, salida) => {
      if (
        ts.isFunctionDeclaration(nodo) ||
        ts.isFunctionExpression(nodo) ||
        ts.isArrowFunction(nodo) ||
        ts.isMethodDeclaration(nodo)
      ) {
        return;
      }
      if (ts.isCallExpression(nodo) && ts.isIdentifier(nodo.expression) && esHook(nodo.expression.text)) {
        salida.push(nodo.expression.text);
      }
      ts.forEachChild(nodo, (h) => hooksDe(h, salida));
    };

    const contieneReturn = (nodo) => {
      let hay = false;
      const mirar = (n) => {
        if (hay) return;
        if (
          ts.isFunctionDeclaration(n) ||
          ts.isFunctionExpression(n) ||
          ts.isArrowFunction(n) ||
          ts.isMethodDeclaration(n)
        ) {
          return;
        }
        if (ts.isReturnStatement(n)) {
          hay = true;
          return;
        }
        ts.forEachChild(n, mirar);
      };
      ts.forEachChild(nodo, mirar);
      return hay;
    };

    const revisarCuerpo = (cuerpo, nombre) => {
      if (!cuerpo || !ts.isBlock(cuerpo)) return;
      let huboSalida = false;
      for (const sentencia of cuerpo.statements) {
        if (huboSalida) {
          const encontrados = [];
          hooksDe(sentencia, encontrados);
          for (const h of encontrados) {
            const { line } = fuente.getLineAndCharacterOfPosition(sentencia.getStart(fuente));
            tarde.push(`${relativo}:${line + 1} · ${nombre} llama a ${h}() tras un return`);
          }
        }
        if (ts.isReturnStatement(sentencia)) huboSalida = true;
        else if (ts.isIfStatement(sentencia) && contieneReturn(sentencia)) huboSalida = true;
      }
    };

    const visitar = (nodo) => {
      if (ts.isFunctionDeclaration(nodo) && nodo.name) {
        revisarCuerpo(nodo.body, nodo.name.text);
      } else if (
        ts.isVariableDeclaration(nodo) &&
        nodo.name &&
        ts.isIdentifier(nodo.name) &&
        nodo.initializer &&
        (ts.isArrowFunction(nodo.initializer) || ts.isFunctionExpression(nodo.initializer))
      ) {
        revisarCuerpo(nodo.initializer.body, nodo.name.text);
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(fuente);
  }

  comprobar(
    'ningun hook se llama detras de una salida temprana',
    tarde.length === 0,
    tarde.join(' | ') || 'un hook que unas veces se llama y otras no revienta React con el error 300',
  );
}


// ---------------------------------------------------------------------------
// La Sala no anuncia lo que no sabe pintar
// ---------------------------------------------------------------------------

/**
 * EL ESCAPARATE ESTABA MINTIENDO, Y ASÍ.
 *
 * `vitrina.ts` decidía si la tarjeta de un arcade era pulsable mirando
 * `MUEBLES[m.mueble].seSabePintar`, que contesta a otra pregunta: si esta app sabe
 * pintar ese MUEBLE. La pantalla del mueble decidía otra cosa —si sabe pintar ESE
 * JUEGO, con su propia tabla— y en cuanto entró el segundo arcade de formulario
 * las dos respuestas dejaron de coincidir: «La Ronda» salía en la Sala con tarjeta
 * pulsable y al tocarla aparecía «esta app todavía no sabe pintarlo».
 *
 * La portada tiene doctrina escrita contra eso en su propia cabecera —«nada de lo
 * que se enseña es mentira… no se rellena con cajas muertas»— y la estaba
 * incumpliendo.
 *
 * El arreglo fue estructural: una sola tabla, en `src/arcade/pintados.ts`, y las
 * dos pantallas leen de ella. Esto vigila que siga siendo así, porque el arreglo
 * se deshace con una línea razonable — alguien que quiera saber si un mueble se
 * pinta y tenga `MUEBLES` a mano.
 *
 * NO se puede comprobar llamando a la función: `pintados.ts` trae dentro
 * componentes de React Native y de Skia, y esto corre en Node pelado. Así que se
 * lee el código, que es menos, y se dice que es menos.
 */
paso('La Sala no anuncia ningún arcade que no sepa pintar');
{
  const vitrina = leer(path.join(SRC, 'vitrina.ts'));
  const pintados = leer(path.join(SRC, 'arcade', 'pintados.ts'));
  const pintar = leer(path.join(SRC, 'arcade', 'pintar.tsx'));

  comprobar('existe la tabla única `src/arcade/pintados.ts`', pintados.length > 0);
  comprobar(
    'y declara qué componente pinta cada arcade',
    /LOS_QUE_PINTA\s*:\s*Record</.test(pintados),
    'sin la tabla, cada pantalla vuelve a decidir por su cuenta',
  );
  /*
   * ═══ ESTA COMPROBACIÓN CAMBIÓ EN LA FASE 5, Y NO SE HA RELAJADO ═══
   *
   * Pedía literalmente `LOS_QUE_PINTA[…] !== undefined && MUEBLES[…]`, o sea UNA
   * ENTRADA POR JUEGO. Con el enchufe, eso era la mentira contraria: un arcade de
   * tablero instalado en un servidor y desconocido para este binario salía con la
   * tarjeta apagada aunque su mueble supiera pintar un juego que no conoce.
   *
   * La pregunta sigue teniendo DOS mitades y las dos siguen exigidas — lo que
   * cambia es la segunda: ya no es «está este juego en la lista» sino «hay CON QUÉ
   * pintarlo», que es o su componente propio o el genérico de su mueble. Eso lo
   * contesta `quienPinta`, y `seSabePintar` no puede contestarlo sin él.
   */
  comprobar(
    'y la pregunta «¿se sabe pintar este arcade?» sigue juntando las dos mitades',
    /MUEBLES\[[^\]]+\]\.seSabePintar\) return false/.test(pintados) &&
      /return quienPinta\(manifiesto\) !== undefined/.test(pintados),
    'con solo una de las dos mitades, la tarjeta vuelve a mentir en un sentido o en el otro',
  );
  comprobar(
    'y hay una tabla de muebles genéricos, que es lo que desbloquea un arcade de fuera',
    /LOS_MUEBLES_GENERICOS/.test(pintados) && /tablero:\s*ElTableroEnLinea/.test(pintados),
    'sin ella, `seSabePintar` vuelve a exigir una entrada por juego y el enchufe del servidor ' +
      'entrega arcades que ningún móvil puede abrir',
  );

  /*
   * ═══ Y ESTA CAMBIÓ CUANDO LA SALA EMPEZÓ A LISTAR LO DEL SERVIDOR ═══
   *
   * Pedía que `vitrina.ts` llamara a `seSabePintar(`. La regla que compraba —que
   * la vitrina NO decida por su cuenta— sigue siendo la misma; lo que cambió es
   * quién contesta. `seSabePintar` da un sí o un no, y desde que la Sala lista
   * arcades que este binario no conoce hace falta además el POR QUÉ: son cuatro
   * causas distintas y una frase para todas es falsa en tres.
   *
   * Lo contesta `dondeSePinta`, que vive en `arcade/del-servidor.ts` para poder
   * EJECUTARSE desde un comprobador de Node —`pintados.ts` no puede, trae React
   * Native dentro— y que recibe lo que este binario pinta como DATO.
   *
   * Así que lo que se exige ahora son las dos mitades de esa delegación: que la
   * vitrina llame al juicio, y que lo alimente con la descripción que sale de las
   * tablas de verdad. Con una sola de las dos se puede deshacer el arreglo sin
   * ponerse rojo: llamar al juicio con listas escritas a mano es exactamente
   * volver a decidirlo por su cuenta, con un rodeo.
   */
  comprobar(
    'la portada saca la respuesta del juicio y no la inventa',
    /\bdondeSePinta\s*\(/.test(vitrina) && /from '\.\/arcade\/pintados'/.test(vitrina),
    'si `vitrina.ts` vuelve a decidirlo por su cuenta, la Sala vuelve a ofrecer tarjetas que no ' +
      'llevan a ninguna parte',
  );
  comprobar(
    'y lo alimenta con lo que este binario pinta de verdad',
    /LO_QUE_PINTA_ESTE_BINARIO/.test(vitrina) && /LO_QUE_PINTA_ESTE_BINARIO/.test(pintados),
    'el juicio es correcto y el dato es lo que puede mentir: alimentarlo con una lista escrita ' +
      'a mano es decidirlo por su cuenta con un rodeo',
  );
  /*
   * Y LAS TRES LISTAS SE DERIVAN DE LAS TABLAS, que es lo que impide que se
   * separen de ellas. Escritas a mano compilan igual, pasan lo de arriba, y se
   * quedan viejas en silencio el día que entre un mueble genérico nuevo — que es
   * justo el día en que un arcade de fuera dejaría de salir sin que nada fallara.
   */
  comprobar(
    'y esas listas salen de las tablas, no de un literal',
    /juegos:\s*Object\.keys\(LOS_QUE_PINTA\)/.test(pintados) &&
      /genericos:\s*Object\.keys\(LOS_MUEBLES_GENERICOS\)/.test(pintados),
    'una lista escrita a mano se queda vieja el día que entre el mueble siguiente, y el fallo ' +
      'es que un arcade instalado deja de aparecer sin que nada se ponga rojo',
  );
  /*
   * Se mira SOLO EL CUERPO de `minijuegos()` y no el fichero entero, y no es un
   * atajo: la cabecera de `vitrina.ts` CITA la línea vieja para contar el fallo
   * que hubo. Un comprobador que se pusiera rojo por sus propias explicaciones
   * empujaría a no escribirlas — es la misma regla que `verify:pureza` aplica
   * quitando los comentarios antes de mirar.
   */
  const cuerpoDeMinijuegos = cuerpoDe(vitrina, 'export function minijuegos') ?? '';
  comprobar('se encuentra el cuerpo de `minijuegos()`', cuerpoDeMinijuegos.length > 0);
  comprobar(
    'y NO vuelve a decidirlo mirando solo el mueble',
    !/MUEBLES\[[^\]]*\]\.seSabePintar/.test(cuerpoDeMinijuegos),
    'ésa es exactamente la línea que hacía pulsable la tarjeta de un juego que la app no pinta',
  );
  /*
   * Se mira el CUERPO de `PintarEnElMueble` y no el fichero entero, por lo mismo
   * que arriba con `minijuegos()`: la cabecera de esa función cita la línea vieja
   * —`LOS_QUE_PINTA[id]` a secas— para contar qué cambió en la fase 5, y un
   * comprobador que se pusiera rojo por una explicación empuja a no escribirlas.
   */
  const cuerpoDePintar = cuerpoDe(pintar, 'export function PintarEnElMueble') ?? '';
  comprobar('se encuentra el cuerpo de `PintarEnElMueble()`', cuerpoDePintar.length > 0);
  comprobar(
    'la pantalla de un mueble pinta desde la misma función que decide la Sala',
    /quienPinta\(/.test(cuerpoDePintar) && /from '\.\/pintados'/.test(pintar),
    'con una tabla propia dentro de cada ruta de mueble, la cuarta copia se queda atrás',
  );
  comprobar(
    'y no vuelve a resolverlo con una tabla por juego',
    !/LOS_QUE_PINTA\s*\[/.test(cuerpoDePintar),
    'ésa es la línea que dejaba sin pintar a un arcade de fuera con mueble genérico',
  );

  /*
   * Y la vacuna, con las dos formas del fallo. Sin esto, un `\b` perdido en un
   * renombrado dejaría estas seis comprobaciones sin encontrar nada y en verde
   * para siempre — que es el patrón que esta casa tiene apuntado tres veces.
   */
  comprobar(
    'la comprobación caza la línea vieja si vuelve',
    /MUEBLES\[[^\]]*\]\.seSabePintar/.test('ruta: MUEBLES[m.mueble].seSabePintar ? rutaDeArcade(m) : null,'),
    'la expresión regular no reconoce el fallo que existe para cazar',
  );
  comprobar(
    'y no se la caza a sí misma con la línea buena',
    !/MUEBLES\[[^\]]*\]\.seSabePintar/.test('ruta: seSabePintar(m) ? rutaDeArcade(m) : null,'),
  );
}

// ---------------------------------------------------------------------------
// Ninguna tabla de modulo nombra algo que todavia no existe
// ---------------------------------------------------------------------------

/**
 * Un `const` de módulo se evalúa AL IMPORTAR, y en orden.
 *
 * La app reparte lo propio de cada juego en tablas de módulo —`PALETAS`,
 * `ORNAMENTOS`, `FONDOS`, `PANTALLAS_DE_JUEGO`, `BLOQUES`— y esa es la forma
 * buena: añadir un juego es añadir una fila. Pero tiene un filo. Si la tabla se
 * escribe ARRIBA y las constantes que nombra están más abajo, el fichero
 * revienta al cargarse con «Cannot access 'X' before initialization», y no en
 * una pantalla concreta: en el import, o sea la app entera en blanco antes de
 * la primera pantalla.
 *
 * No lo caza el compilador en todos los casos y no lo caza el empaquetador
 * nunca, porque ninguno de los dos EJECUTA el módulo. Se coló una vez —la tabla
 * de fondos escrita encima de los degradados— y se descubrió leyendo, que es
 * suerte y no red.
 *
 * Solo se miran los inicializadores de nivel de módulo: una referencia dentro
 * del cuerpo de una función es perfectamente legal, porque para cuando se llama
 * ya está todo montado.
 */
paso('Ninguna tabla de módulo nombra algo que todavía no existe');
{
  /*
   * ═══ SE RECORREN TODOS, Y ANTES ERAN SEIS ESCRITOS A MANO ═══
   *
   * La lista era `tema-juego.ts`, `pantallas.ts`, `dosier/bloques.tsx`,
   * `iconos.tsx`, `ui.tsx` y `barra.tsx` — los seis que tenían tabla el día que
   * se escribió esto. El fallo que caza no es de esos seis ficheros: es de
   * CUALQUIER módulo que declare un `const` que nombre otro `const` de más
   * abajo, y el cuarto juego trajo cinco ficheros nuevos con tablas y paletas
   * que la lista no miraba.
   *
   * Una lista escrita a mano en un comprobador se queda vieja con cada juego, y
   * se queda vieja EN SILENCIO: sigue en verde mirando seis ficheros de los
   * cuarenta que hay. Recorrer `src/` y `app/` enteros cuesta unos milisegundos
   * y no hay que acordarse de nada.
   */
  const recorrer = (dir) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .flatMap((e) =>
            e.isDirectory()
              ? recorrer(path.join(dir, e.name))
              : /\.tsx?$/.test(e.name)
                ? [path.join(dir, e.name)]
                : [],
          )
      : [];

  const ficheros = [...recorrer(SRC), ...recorrer(RUTAS)];

  comprobar('hay ficheros de tablas que revisar', ficheros.length >= 20, ficheros.length);

  const prematuras = [];
  for (const fichero of ficheros) {
    const fuente = ts.createSourceFile(fichero, leer(fichero), ts.ScriptTarget.Latest, true);

    // Nombre -> en que sentencia de nivel de modulo se declara.
    const declaradoEn = new Map();
    fuente.statements.forEach((sent, i) => {
      if (!ts.isVariableStatement(sent)) return;
      for (const d of sent.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) declaradoEn.set(d.name.text, i);
      }
    });

    fuente.statements.forEach((sent, i) => {
      if (!ts.isVariableStatement(sent)) return;
      for (const d of sent.declarationList.declarations) {
        if (!d.initializer) continue;
        const visitar = (nodo) => {
          // Dentro de una funcion la referencia es tardia y por tanto legal.
          if (
            ts.isFunctionDeclaration(nodo) ||
            ts.isFunctionExpression(nodo) ||
            ts.isArrowFunction(nodo) ||
            ts.isMethodDeclaration(nodo)
          ) {
            return;
          }
          if (ts.isIdentifier(nodo)) {
            const donde = declaradoEn.get(nodo.text);
            if (donde !== undefined && donde > i) {
              prematuras.push(
                `${path.basename(fichero)}: «${ts.isIdentifier(d.name) ? d.name.text : '?'}» nombra a «${nodo.text}», que se declara más abajo`,
              );
            }
          }
          ts.forEachChild(nodo, visitar);
        };
        visitar(d.initializer);
      }
    });
  }

  comprobar(
    'ninguna tabla de módulo nombra una constante declarada más abajo',
    prematuras.length === 0,
    prematuras.join(' | ') ||
      'al importar el fichero eso lanza «Cannot access X before initialization» y deja la app en blanco',
  );
}

console.log('');
if (fallos.length === 0) {
  console.log(
    `✔ ${hechas} comprobaciones. La dirección compilada gana a los fósiles y los enlaces llevan a algún sitio.`,
  );
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
