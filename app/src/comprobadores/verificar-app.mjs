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
const cargar = cuerpoDe(api, 'export async function cargarSesionGuardada');
const fijar = cuerpoDe(api, 'export async function fijarServidor');

comprobar('api.ts importa la decisión de servidor-elegido', /from '\.\/servidor-elegido'/.test(api));
comprobar('se encontró el cuerpo de cargarSesionGuardada', cargar !== null);
comprobar('se encontró el cuerpo de fijarServidor', fijar !== null);

comprobar(
  'cargarSesionGuardada decide con decidirServidor',
  Boolean(cargar && cargar.includes('decidirServidor(')),
);
comprobar(
  'cargarSesionGuardada NO vuelve a coger la guardada a pelo',
  Boolean(cargar && !/almacen\.get\(CLAVE_SERVIDOR\)\s*\)?\s*\?\?/.test(cargar)),
  cargar?.slice(0, 200),
);
comprobar(
  'cargarSesionGuardada borra la elección caducada Y su testigo',
  Boolean(
    cargar &&
      cargar.includes('almacen.del(CLAVE_SERVIDOR)') &&
      cargar.includes('almacen.del(CLAVE_SERVIDOR_COMPILADO)'),
  ),
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
