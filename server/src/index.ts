/**
 * Punto de entrada del servidor GameMasters.
 *
 * Orden de arranque: cargar configuración (dotenv vía ./config), montar
 * express con sus routers bajo /api, inicializar el almacén y escuchar.
 */
import fs from 'node:fs';
/*
 * DA DE ALTA LOS JUEGOS ANTES QUE NADA. Cada juego registra al importarse lo
 * que hacen sus acciones, que ve cada persona de su estado y que trofeos
 * reparte. Si esto no se importa, el registro esta vacio y la primera partida
 * de ese juego falla con «eso no se puede hacer en esta partida» — un mensaje
 * que no lleva a ningun sitio, en produccion, con la mesa puesta.
 */
import './juegos/instalados';
/*
 * Y DA DE ALTA LOS ARCADES, que son el otro motor y el otro registro.
 *
 * Son dos importaciones y no una a propósito: `shared/arcade` tiene su propio
 * `Symbol.for`, separado del de veladas, y esa separación es la que impide que
 * un minijuego acabe pintado en el carrusel de veladas de la portada. Si
 * compartieran tabla, la única defensa sería un `if (esArcade)` dentro de
 * `veladas()`, que es la primera de las cien banderas que deshacen la separación.
 *
 * Sin esta línea, `exigirSecretosTapados()` de ahí abajo comprobaría un registro
 * VACÍO y pasaría en verde sin haber mirado nada — que es la forma exacta en que
 * este repositorio ya se ha encontrado tres comprobadores felicitando a todo el
 * mundo. La garantía y las altas van juntas o no valen ninguna de las dos.
 */
import '../../shared/arcade/juegos';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { JuegoNoInstalado, instalarSoloEstos, juegosInstalados } from '../../shared/juegos';
import { instalarJuegosDeFuera } from './juegos/enchufe';
import { instalarArcadesDeFuera } from './arcade/enchufe';
import { DEMO_MODE, env } from './config';
import authRouter, { passwordRequired, requireAuth, tallerAbiertoPara } from './auth';
import aterrizajeRouter from './enlaces/aterrizaje';
import descargaRouter, { comprobarLaDescarga } from './enlaces/descarga';
import jugarWebRouter from './enlaces/jugar-web';
import escritorioWebRouter, { carpetaDelEscritorio } from './enlaces/escritorio-web';
import correoRouter from './correo/router';
import { modoDeCorreo } from './correo';
import legalRouter from './legal/documentos';
import limitadorDeIntentos from './puerta/montaje';
import wellKnownRouter from './enlaces/well-known';
import { getStorageKind, getStore, initStore } from './db/store';
import {
  exigirCifrasLegibles,
  exigirFinalesDeclarados,
  exigirQueAguantenVacio,
  exigirSecretosTapados,
} from '../../shared/arcade';
import { elCanal, ponerCanal } from './canal';
import { cuandoSeCierreUnaMesa, cuandoSeOlvideUnaMesa } from './arcade/mesas';
import { canalDeSondeo } from './canal/sondeo';
import arcadeRouter from './routes/arcade';
import boardRouter from './routes/board';
import chatRouter from './routes/chat';
import configRouter from './routes/config';
import diagnosticoRouter from './routes/diagnostico';
import documentsRouter from './routes/documents';
import entitiesRouter from './routes/entities';
import gamesRouter from './routes/games';
import generateRouter from './routes/generate';
import cuentaRouter from './routes/cuenta';
import generacionRouter from './routes/generacion';
import jugarRouter from './routes/jugar';
import liveRouter from './routes/live';
import materialRouter from './routes/material';
import refreshRouter from './routes/refresh';
import uploadsRouter from './routes/uploads';
import duenoRouter from './taller/dueno';
import { costurasDePruebaActivas } from './identidad/oidc';
import { secretoDeFirma } from './secreto';
import { exigeIdentidad } from './routes/generacion';

const app = express();

/*
 * Detrás de un proxy (Render, Fly, un Nginx doméstico) la conexión con el
 * navegador es HTTPS pero el último salto hasta aquí es HTTP en claro. Sin
 * esto, `req.secure` es falso, la cookie de sesión sale sin `secure`, y viaja
 * expuesta a cualquiera que comparta la wifi. El 1 es «me fío de UN proxy
 * delante», no de la cabecera que traiga cualquiera.
 */
app.set('trust proxy', 1);

app.use(cors());

/*
 * EL LIMITE DE CUERPO, y por qué son dos y no uno.
 *
 * Estaba en 25 MB para TODAS las rutas, y eso convierte cualquier ruta del
 * servidor en un sitio donde tirar veinticinco megas: quien quiera dejar la
 * máquina sin memoria solo tiene que mandar unos cuantos a la vez contra
 * `/api/auth/login`, que ni siquiera lee el cuerpo entero. Ninguna ruta salvo
 * una necesita más de unos kilobytes.
 *
 * La excepción es el estudio de avatares, que recibe la foto en base64 dentro
 * del JSON. Tolera hasta 15 MB de imagen (ver `routes/generacion.ts`), y en
 * base64 eso son unos veinte de texto. Así que ahí, y solo ahí, se levanta el
 * límite — montado ANTES del analizador general para que gane.
 */
/*
 * CON LA PUERTA DELANTE, que es lo que faltaba. El analizador se monta a nivel
 * de app y corría antes que cualquier comprobación: quien no tuviera credencial
 * podía mandar veinticinco megas igual, y el proceso los leía, los convertía en
 * cadena y los parseaba para terminar respondiendo un 401. Ahora quien no se
 * identifica no llega ni a que se lea el cuerpo.
 */
app.use('/api/generacion/avatar', exigeIdentidad, express.json({ limit: '25mb' }));
app.use(express.json({ limit: '256kb' }));

/*
 * Directorio de subidas (disco persistente en producción): se crea al arrancar
 * y se sirve estático en /uploads, tras la contraseña si la hay.
 *
 * EL ERROR SE TRADUCE, y no es cosmética. Si `UPLOADS_DIR` apunta a un sitio
 * donde el proceso no puede escribir, `mkdirSync` lanza un `EACCES` pelado y el
 * servidor muere con un volcado de Node que no menciona ni la variable ni el
 * disco. Pasó exactamente eso: se configuró `UPLOADS_DIR=/var/data/uploads`
 * antes de que el disco existiera, así que `/var/data` era un directorio del
 * contenedor propiedad de root — y el arranque quedó en un `EACCES` sin pistas.
 *
 * Y se muere igual, a propósito: arrancar escribiendo en un sitio que no es el
 * que se pidió significa perder las fotos de los invitados en el siguiente
 * despliegue, y eso es peor que no arrancar.
 */
const uploadsDir = env.uploadsDir;
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.accessSync(uploadsDir, fs.constants.W_OK);
} catch (fallo) {
  const causa = (fallo as NodeJS.ErrnoException).code ?? 'desconocida';
  throw new Error(
    `No se puede escribir en UPLOADS_DIR («${uploadsDir}»): ${causa}.\n` +
      '  · Si esperabas un disco persistente, comprueba que existe y está montado ' +
      'en la ruta que contiene a esa carpeta. Tener la variable puesta sin el disco ' +
      'creado deja este error exacto.\n' +
      '  · Si no quieres persistencia todavía, QUITA la variable: el servidor ' +
      'usará una carpeta local y arrancará (pero las fotos y los avatares 3D ' +
      'desaparecerán en cada despliegue).',
  );
}
app.use(
  '/uploads',
  (req, res, next) => {
    // Las fotos de los invitados son parte del misterio, y además son personas
    // reales: no se sirven a extraños. Va por `tallerAbiertoPara` como el resto
    // de la puerta —no por la firma del pasaporte a secas—, porque un pasaporte
    // de cuenta lo tiene también quien juega desde la app.
    void tallerAbiertoPara(req)
      .then((abierto) => (abierto ? next() : res.status(401).end()))
      .catch(() => res.status(503).end());
  },
  express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      // La tabla mime de Express no conoce AVIF y lo sirve como octet-stream,
      // con lo que el navegador no lo pinta. Se corrige a mano.
      if (filePath.toLowerCase().endsWith('.avif')) {
        res.setHeader('Content-Type', 'image/avif');
      }
    },
  }),
  // Una foto que no está es un 404, y se acaba aquí. Sin esto la petición
  // seguía hasta el comodín del cliente y devolvía index.html con un 200: el
  // navegador se encontraba una página HTML donde esperaba un JPEG, la imagen
  // salía rota sin decir por qué, y en el registro no quedaba ni rastro del
  // fallo.
  (_req, res) => {
    res.status(404).end();
  },
);

/*
 * La política de privacidad, en abierto y por delante de todo.
 *
 * Detrás de la contraseña no serviría de nada: las dos tiendas exigen una
 * dirección pública, accesible SIN instalar la app —para que pueda leerla quien
 * se lo está pensando, y para que la revise quien revisa—, y Apple pide además
 * un enlace desde dentro de la aplicación (directriz 5.1.1(i)).
 */
app.use(legalRouter);

/*
 * Los ficheros de asociación de dominio de Apple y Google. Van AQUI, delante
 * del guardian de la contrasena y delante del comodin, porque las dos
 * plataformas los piden sin credenciales ninguna y porque el comodin les
 * devolveria el index.html del taller con un 200 alegre. Ver enlaces/well-known.
 */
app.use(wellKnownRouter);

/*
 * Donde cae quien pulsa un enlace de invitacion SIN la app instalada. Tambien
 * delante del guardian: quien recibe la invitacion no conoce la contrasena de
 * la casa, y sin esto el enlace acaba en la portada del taller.
 */
app.use(aterrizajeRouter);

/*
 * La descarga del APK, mientras no haya tienda. Tambien delante del guardian:
 * quien va a instalar la app es quien juega, y no conoce la contrasena de la
 * casa ni tiene por que.
 */
app.use(descargaRouter);

/*
 * La app jugable desde el navegador, para quien no puede instalar el APK —todo
 * iPhone, porque Apple no permite instalar fuera de su tienda. Mismo origen que
 * la API, asi que no hay CORS ni direcciones que configurar. Delante del
 * guardian: quien juega no conoce la contrasena de la casa.
 */
app.use(jugarWebRouter);

/*
 * La Sala de Arcade para un PC, en `/sala`. Va junto a la app y por el mismo
 * motivo: delante del guardian, porque un arcade no tiene Game Master y su
 * puerta es la llave de asiento que reparte al sentarse. Es un cliente aparte y
 * no la app de movil ensanchada; ver la cabecera de `enlaces/escritorio-web.ts`.
 */
app.use(escritorioWebRouter);

/**
 * Señal de vida, para quien vigila el servicio.
 *
 * Existe porque `render.yaml` apuntaba su comprobación de salud a
 * `/api/config`, que está DETRÁS del guardián de la contraseña. En producción
 * —donde `APP_PASSWORD` es obligatoria— eso responde 401, así que Render daba
 * el servicio por caído y lo reiniciaba en bucle: el despliegue nunca llegaba a
 * estar sano, y no porque el servidor fallara.
 *
 * Dice lo justo. Ni la versión, ni el modo de almacenamiento, ni si hay
 * contraseña: una sonda pública no tiene por qué contarle a nadie de fuera cómo
 * está montada la casa.
 */
app.get('/api/salud', (_req, res) => {
  res.json({ ok: true });
});

/*
 * El limitador de intentos, DELANTE de las tres puertas que hay.
 *
 * Tiene que ir por delante de `jugarRouter`, `cuentaRouter` y `authRouter`, que
 * son las tres que aceptan una credencial: un limitador montado detrás de una
 * de ellas no la protege, y montado detrás de todas no protege ninguna.
 */
app.use('/api', limitadorDeIntentos);

// La app del jugador va ANTES del guardián: quien juega no conoce la contraseña
// de la casa. Su credencial es el testigo firmado que recibe al emparejar el
// móvil, y cada ruta lo verifica por su cuenta.
app.use('/api', jugarRouter);
/*
 * ═══ LA SALA DE ARCADE VA AQUÍ, JUNTO A `jugarRouter` Y DELANTE DEL GUARDIÁN ═══
 *
 * No por comodidad: un arcade NO TIENE GAME MASTER. Todo el ciclo de una velada
 * lo abre `routes/live.ts` detrás de `requireAuth` porque hay alguien que dirige
 * y que conoce la contraseña de la casa. Aquí no: cuatro personas abren una mesa
 * con un código de cinco letras y juegan, sin taller, sin cuenta y sin correo.
 *
 * Montarlo detrás del guardián significaría que para echar una partida de cartas
 * de cinco minutos hay que saber la contraseña del estudio de misterios, y eso
 * es exactamente el acoplamiento con el taller que el segundo motor existe para
 * no tener. Su propia puerta es la llave de asiento que reparte al sentarse.
 */
app.use('/api', arcadeRouter);
// La cuenta va con ellos: quien juega no conoce la contraseña de la casa.
app.use('/api', cuentaRouter);
// El estudio de generación: su puerta la pone él (cualquier identidad + tope).
app.use('/api', generacionRouter);

// Acceso: el router de autenticación va primero y el guardián protege el resto.
app.use('/api', authRouter);
app.use('/api', requireAuth);

/*
 * De quién es cada partida. Va JUSTO detrás del guardián de acceso y DELANTE de
 * todos los routers que tocan una partida: si se moviera detrás, cada uno de
 * ellos tendría que comprobarlo por su cuenta, y ahí es donde se olvida.
 */
app.use('/api', duenoRouter);

// Routers de la API, todos bajo el prefijo /api.
/*
 * El diagnostico del disco, DETRAS del guardian del taller. Dice si los modelos
 * generados siguen ahi y si llegan comprimidos — las dos causas que producen el
 * mismo sintoma: un hueco donde deberia haber un avatar.
 */
app.use('/api', diagnosticoRouter);
app.use('/api', configRouter);
app.use('/api', gamesRouter);
app.use('/api', entitiesRouter);
app.use('/api', uploadsRouter);
app.use('/api', chatRouter);
app.use('/api', boardRouter);
app.use('/api', generateRouter);
app.use('/api', refreshRouter);
app.use('/api', materialRouter);
app.use('/api', correoRouter);
app.use('/api', liveRouter);
app.use('/api', documentsRouter);

// 404 en JSON para rutas de API desconocidas.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada.' });
});

/*
 * Cliente compilado (producción): un único servicio sirve la web y la API, de
 * modo que no hay CORS ni URLs que configurar. El comodín devuelve index.html
 * para que las rutas de react-router (/cluedo/:id) funcionen al entrar directo
 * o al recargar; sin esto darían 404.
 */
if (env.clientDir) {
  const clientDir = env.clientDir;
  app.use(express.static(clientDir, { index: false }));
  app.get('*', (req, res) => {
    /*
     * El comodin NO puede contestar por la API ni por los ficheros de
     * asociacion. Sin esto, una ruta mal escrita de /api/ o un fichero de
     * .well-known que falte devuelven el index.html del taller con estado 200:
     * quien llama cree que le han respondido y lo que recibe es una pagina web.
     * Apple y Google, en concreto, dan la verificacion por buena y luego no
     * funciona nada.
     */
    if (req.path.startsWith('/api/') || req.path.startsWith('/.well-known/')) {
      res.status(404).json({ error: 'No existe.' });
      return;
    }
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

// Middleware de error final: cualquier excepción no controlada → 500 en JSON.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) {
    console.error('[servidor] Error no controlado:', err);
    res.end();
    return;
  }

  /*
   * UN JUEGO QUE NO ESTÁ INSTALADO NO ES UN FALLO DEL SERVIDOR.
   *
   * Es la situación normal el día que haya un servidor por país y cada uno
   * instale su reparto: alguien tiene guardada una partida de un juego que
   * aquí no existe. Antes de que `manifiestoDe` fallara, esa partida se abría
   * y SE JUGABA COMO CLUEDO, sin un solo error. Ahora falla, que es lo
   * correcto — pero contestar «Error interno del servidor» sería mentir por el
   * otro lado: no hay nada roto, hay algo que aquí no se puede hacer.
   *
   * 409 y no 500: quien pregunta puede entenderlo y actuar. Y el mensaje lleva
   * el nombre del juego, porque «no está instalado» sin decir cuál obliga a
   * abrir los registros para averiguar lo que el error ya sabía.
   */
  if (err instanceof JuegoNoInstalado) {
    console.warn(`[servidor] Se ha pedido algo de «${err.juego}», que no está instalado aquí.`);
    res.status(409).json({
      error: err.message,
      juego: err.juego,
      /*
       * Se dice qué SÍ hay. Con juegos por servidor, lo primero que necesita
       * saber quien recibe esto es si se ha equivocado de servidor.
       */
      instalados: juegosInstalados().map((m) => m.id),
    });
    return;
  }

  console.error('[servidor] Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

/**
 * Comprobaciones que se hacen ANTES de escuchar.
 *
 * Un servidor que se niega a arrancar se arregla en cinco minutos. Uno que
 * arranca inseguro no se arregla nunca, porque nadie se entera. Y aquí lo que
 * está en juego no es abstracto: sin contraseña, `requireAuth` deja pasar a
 * todo el mundo, de modo que cualquiera que alcance la dirección puede leer la
 * solución del caso en `/api/games/<id>`, descargar los dosieres y forzar el
 * desenlace para los doce invitados.
 */
function comprobarArranque(): void {
  // Falla aquí si falta el secreto de firma en producción.
  secretoDeFirma();

  /*
   * ═══ EL CANAL DE LA SALA DE ARCADE, PUESTO ANTES DE ATENDER A NADIE ═══
   *
   * Mientras nadie instale uno, `elCanal()` devuelve el CANAL QUE LANZA, y eso
   * es deliberado: un canal mudo que se tragara las llamadas dejaría un servidor
   * donde las mesas funcionan y nadie se entera de nada, sin un solo error — el
   * modo de fallo favorito de este repositorio y el que más caro ha salido
   * siempre, el que no falla.
   *
   * Va aquí y no junto al montaje del router porque esto es arranque y aquello
   * es encaminamiento, y porque lo que hay que garantizar es que esté puesto
   * ANTES de escuchar: un canal instalado en el segundo tres de vida del proceso
   * deja tres segundos de mesas que no avisan a nadie.
   */
  ponerCanal(canalDeSondeo);

  /*
   * ═══ Y QUE EL CIERRE DE UNA MESA SE OIGA ═══
   *
   * «Se acabó la partida» sólo se anunciaba desde `POST /cerrar`, que no pulsa
   * ningún cliente. Desde que las mesas se cierran solas al terminar el juego,
   * ese aviso no salía por ningún sitio: la partida acababa y el único rastro era
   * un tablero quieto.
   *
   * Va aquí, pegado a `ponerCanal` y por el mismo motivo: `arcade/mesas.ts` no
   * importa el canal a propósito, así que el hecho sale de allí y el encaminado
   * se decide aquí. `anunciar` y no `avisarCambio` a secas porque queda GUARDADO
   * con su revisión: quien estuviera en segundo plano lo recupera al volver.
   */
  cuandoSeCierreUnaMesa((codigo, rev) => {
    elCanal().anunciar(codigo, rev, { clave: 'arcade:mesa-cerrada', texto: 'Se acabó la partida.' });
  });

  /*
   * Y que el canal se OLVIDE de la mesa que el barrido se lleva. Sin esto, la
   * entrada de esa mesa en el mapa de avisos del concentrador se quedaba para
   * siempre: `olvidar()` sólo lo llamaban la apertura fallida y el `DELETE`, y el
   * barrido de las viejas es el único camino por el que una mesa desaparece sola.
   */
  cuandoSeOlvideUnaMesa((codigo) => {
    elCanal().olvidar(codigo);
  });

  /*
   * ═══ LA GARANTÍA QUE LA FASE 0 DEJÓ ESCRITA Y NO LLAMABA NADIE ═══
   *
   * `exigirSecretosTapados()` existe desde el primer commit del motor de arcade,
   * funciona, tiene sus dos excepciones escritas y su propia cabecera decía:
   * «NADIE LA LLAMA TODAVÍA … una garantía que existe y no está conectada es una
   * garantía que no existe». Esta línea es la que la conecta.
   *
   * QUÉ IMPIDE, EN CONCRETO. Que arranque un servidor con un arcade que declara
   * `secretos: true` y no ha registrado proyección —o no ha registrado
   * `loSecreto`—. Sin proyección, el estado ENTERO viajaría a todos los
   * dispositivos de la mesa: las cuatro manos a los cuatro móviles, la partida
   * jugándose con normalidad y nadie viendo un error jamás. Sin `loSecreto`, la
   * proyección existiría y no habría forma de comprobar que hace algo: un juego
   * puede registrar la identidad —`(estado) => estado`— y pasar todos los
   * comprobadores en verde mientras lo filtra todo.
   *
   * Y VA AQUÍ, EN LAS COMPROBACIONES DE ARRANQUE, Y NO AL PROYECTAR. Un fallo al
   * proyectar ocurre con la mesa puesta y la gente dentro, y la única salida
   * decente en ese momento es cortar la partida — o sea castigar a quien está
   * jugando por un error de quien instaló el juego. Un servidor que se niega a
   * arrancar se arregla en cinco minutos; uno que arranca filtrando no se
   * arregla nunca, porque nadie se entera.
   */
  exigirSecretosTapados();
  /*
   * Y que aguanten la mesa RECIEN ABIERTA, que nace sin estado a proposito. Un
   * juego de servidor que no admita `undefined` en sus tres puertas compila,
   * se instala, y devuelve 500 en la primera lectura de toda mesa nueva —con
   * una mesa huerfana dentro de la tabla—. Lo destapo un revisor de la fase 2.
   */
  exigirQueAguantenVacio();
  /*
   * ═══ Y QUE LA CIFRA QUE PUBLICAN SE PUEDA LEER ═══
   *
   * Tercera hermana de las dos de arriba, y la última en llegar porque hasta la
   * fase 5 esta comprobación vivía en `shared/arcade/juegos/`: colgar del arranque
   * una garantía escrita en la carpeta de los juegos habría sido meter una regla de
   * plataforma donde no toca, así que la llamaba sólo `verify:marcador` — o sea la
   * batería, y nunca un despliegue.
   *
   * QUÉ IMPIDE. Que arranque un servidor con un arcade que declara
   * `marcador: { tipo: 'cifra' }` y no trae `puntuacion`. El estado es opaco: sin
   * esa función, la repetición que alguien suba para verificar un récord se
   * reejecuta perfectamente y nadie sabe qué número mirar dentro. El fallo no salía
   * al arrancar — salía la PRIMERA VEZ que alguien subía un récord, meses después y
   * delante de quien acababa de jugarlo, con la forma de un récord honrado
   * rechazado. Es el falso negativo que más caro sale, porque el daño no es el
   * error: es dejar de creerse la cifra.
   *
   * Y con `ARCADES_EXTERNOS` dejó de ser hipotético: un arcade de fuera declara su
   * `marcador` en un fichero que nadie de esta casa ha revisado.
   */
  exigirCifrasLegibles();

  /*
   * ═══ Y LA CUARTA: QUE UN JUEGO CON MESA SEPA DECIR CUÁNDO SE ACABA ═══
   *
   * QUÉ IMPIDE. Que arranque un servidor con un arcade de mesa cuya alta no trae
   * `seAcabo`. El precio de ese olvido es una mesa que NO SE CIERRA NUNCA: la
   * partida acabada sigue pintando su cuenta atrás, sigue admitiendo tics y no
   * termina jamás. Y no es hipotético ni futuro: es el fallo que este servidor
   * tuvo desde la fase 2 hasta hoy, en los dos juegos de mesa a la vez, porque el
   * hueco para preguntarlo no existía.
   *
   * Ahora existe, y por eso hace falta esto: sin la guarda, omitirlo es más
   * silencioso que declararlo y el fallo vuelve gratis. Un juego que de verdad no
   * termine lo dice con `seAcabo: () => false`, que es una línea y una decisión.
   */
  exigirFinalesDeclarados();

  /*
   * ═══ QUIÉN HAY DELANTE, QUE DECIDE SI EL LIMITADOR PROTEGE O ATACA ═══
   *
   * `PROXY_DE_CONFIANZA` no la comprobaba nadie, y es la que decide si se sabe de
   * dónde llega cada petición. Sin ella `procedenciaDe` cae al seguro de casa
   * —`loopback`—, y detrás de un balanceador eso significa que el otro extremo del
   * TCP es SIEMPRE suyo: todas las peticiones del mundo entran con la misma
   * dirección y «fiable: true».
   *
   * Las dos caras del desastre, y las dos están escritas en `render.yaml`: ocho
   * contraseñas mal tecleadas por cualquiera dejan fuera del taller a TODOS los
   * Game Masters, y sesenta códigos fallidos dejan a todo el mundo fuera del
   * arcade. Un limitador que no sabe de quién habla no es media protección: es un
   * arma apuntando a la casa.
   *
   * Se exige SÓLO en producción, y por el mismo motivo que las otras: en casa el
   * `loopback` es el valor correcto y pedirla ahí sería ruido. Y se exige por el
   * mismo escarmiento que `MESAS_DIR`: va como dato del blueprint y no como
   * secreto, o sea que existe si y sólo si la sincronización la aplicó —y este
   * repositorio ya tiene esa cicatriz con `UPLOADS_DIR`—.
   */
  if (process.env.NODE_ENV === 'production') {
    const delante = process.env.PROXY_DE_CONFIANZA?.trim() ?? '';
    if (delante !== 'plataforma') {
      throw new Error(
        delante.length === 0
          ? 'Falta `PROXY_DE_CONFIANZA` y en producción hay un balanceador delante. Sin ella el ' +
            'limitador toma la dirección del balanceador como la de todo el mundo: ocho ' +
            'contraseñas mal tecleadas por cualquiera dejan a TODOS fuera. Pónla a ' +
            '`plataforma` (ya está declarada en `render.yaml`).'
          : `\`PROXY_DE_CONFIANZA\` vale «${delante}» y el único valor que activa la confianza es ` +
            '`plataforma`. Cualquier otra cosa cae en el seguro de casa, que detrás de un ' +
            'balanceador convierte al limitador en un arma apuntando a la casa entera.',
      );
    }
  }

  /*
   * ═══ EL MODO DE CORREO, QUE SE VALIDABA CUANDO YA ERA TARDE ═══
   *
   * `modoDeCorreo()` lanza si `CORREO_MODO` no es «memoria» ni «ses», y
   * `.env.example` lo anuncia diciendo que el servidor NO ARRANCA con un modo
   * desconocido. No era verdad: la función sólo la llamaba `transporte()`, o sea
   * al mandar el PRIMER correo.
   *
   * Y ése es el peor momento posible. Un modo mal escrito —«SES », «smtp»— dejaba
   * arrancar el servidor tan tranquilo, y el fallo aparecía cuando alguien
   * invitaba a doce personas a una velada: la invitación no sale, el Game Master
   * ve un error que habla de una variable de entorno, y para entonces ya ha
   * repartido la fecha.
   *
   * Una línea, al lado de las otras garantías, y el aviso llega cuando se
   * despliega en vez de cuando se juega.
   */
  modoDeCorreo();

  /*
   * Las costuras de prueba de OIDC permiten apuntar la verificación de
   * identidad a un emisor y a unas claves cualesquiera. Es justo lo que hace
   * falta para probarlo sin cuentas de Google ni de Apple, y justo lo que
   * jamás puede estar activo en producción: con ellas, cualquiera que pueda
   * levantar un servidor de claves se fabrica la identidad de quien quiera.
   */
  if (process.env.NODE_ENV === 'production' && costurasDePruebaActivas()) {
    throw new Error(
      'Hay variables OIDC_ISS_* u OIDC_JWKS_* definidas y esto es producción. Sirven para PROBAR ' +
        'la verificación de identidad contra claves propias: con ellas activas, cualquiera se ' +
        'fabrica la identidad de quien quiera.\nQuítalas.',
    );
  }

  if (process.env.NODE_ENV === 'production' && !env.appPassword) {
    throw new Error(
      'Falta APP_PASSWORD y esto es producción. Sin ella el taller queda ABIERTO: cualquiera con ' +
        'la dirección lee la solución del caso, descarga los dosieres y puede cerrar la partida.\n' +
        'Defínela, o arranca sin NODE_ENV=production si de verdad quieres una instancia abierta.',
    );
  }

  /*
   * ═══ «FALTA» Y «ESTÁ MAL ESCRITA» NO SON LO MISMO, Y DECÍAN LO MISMO ═══
   *
   * `readPublicOrigin()` devuelve `undefined` en los dos casos: cuando la
   * variable no está y cuando está pero `new URL(...)` no la traga. Así que
   * quien escribía `harkania.com` sin el `https://` —el error más fácil de todos
   * y el que más se comete— recibía «Falta PUBLIC_ORIGIN» con la variable
   * puesta delante, y se iba a mirar el panel del despliegue en vez de mirar el
   * valor.
   *
   * Se distingue AQUÍ y no dentro de `readPublicOrigin` a propósito: esa función
   * contesta «el origen que se puede usar, o ninguno», y ése es su contrato
   * entero. Quien tiene que dar un diagnóstico es quien se niega a arrancar.
   */
  if (process.env.NODE_ENV === 'production' && !env.publicOrigin) {
    const crudo = process.env.PUBLIC_ORIGIN?.trim();
    if (crudo) {
      throw new Error(
        `PUBLIC_ORIGIN vale «${crudo}», y no se puede leer como una dirección. Casi siempre es ` +
          'que le falta el esquema: hace falta «https://harkania.com», no «harkania.com».\n' +
          'Sin un origen legible el servidor se cree lo que diga la cabecera Host, y de ahí ' +
          'cuelgan la dirección de vuelta de Google y el flag «secure» de las cookies.',
      );
    }
    throw new Error(
      'Falta PUBLIC_ORIGIN y esto es producción. Sin ella el servidor se cree lo que diga la ' +
        'cabecera Host, así que la dirección de vuelta que se le manda a Google la elige quien ' +
        'llama: si nginx no la reenvía llega «localhost:5174» y fallan TODOS los inicios de ' +
        'sesión a la vez, con un «redirect_uri_mismatch» que no dice de dónde viene.\n' +
        'Y de ella cuelga el flag «secure» de las cookies: sin origen, una sesión de noventa ' +
        'días puede acabar viajando en claro sin que nada falle a la vista.\n' +
        'Defínela con el dominio público, sin barra final. Ejemplo: https://harkania.com',
    );
  }

  /*
   * ═══ Y LA QUINTA, QUE ES LA QUE FALTABA Y PIERDE PARTIDAS ═══
   *
   * `MONGODB_URI` va en `render.yaml` con `sync: false`: no la trae el blueprint,
   * la teclea una persona en el panel. Si falta —una sincronización rechazada,
   * una errata en el nombre de la clave, un servicio nuevo creado desde otra
   * rama— `initStore()` se salta entera la rama de Mongo y cae al fichero JSON
   * local. Y eso, en un contenedor, es el sistema de ficheros efímero.
   *
   * EL MODO DE FALLO ES EL PEOR QUE HAY: no hay error. El servidor levanta,
   * `/api/salud` contesta que sí, Render da el despliegue por bueno, y la gente
   * monta veladas y juega tan tranquila. Todo se guarda de verdad… hasta el
   * siguiente `git push`, que se lleva el disco y con él lo que no estaba en
   * Mongo. Nadie relaciona una cosa con la otra, porque entre las dos pasan días.
   *
   * Va aquí y no en `store.ts` por lo mismo que las otras cuatro: negarse a
   * arrancar se arregla en cinco minutos y con el aviso delante; arrancar mal se
   * descubre cuando ya se han perdido las partidas de alguien.
   *
   * Y comprueba LA VARIABLE, no la conexión. Comprobar la conexión ataría el
   * arranque a que Atlas conteste en ese instante, y un parpadeo de red dejaría
   * el servicio sin levantar por algo que se arregla solo. Lo que esta guarda
   * compra es que nadie se haya olvidado de configurarla, que es el fallo real.
   */
  /*
   * ═══ Y LA SEXTA: `MESAS_DIR`, QUE ENTRA POR PRIMERA VEZ EN ESTE DESPLIEGUE ═══
   *
   * Es la hermana exacta de la de abajo, y hace falta por lo mismo: sin ella, la
   * carpeta de las mesas cae al valor por defecto —`data/mesas` junto al
   * proceso— que en un contenedor es el sistema de ficheros EFÍMERO. Y con
   * `startCommand: npm start` el proceso corre desde `server/`, así que las
   * partidas se escribirían en `server/data/mesas` y desaparecerían en CADA
   * despliegue. Una partida de «La Larga» dura días: moriría en el siguiente
   * `git push` igual que si viviera solo en memoria, y sin un error.
   *
   * Y NO ES UNA HIPÓTESIS. Esta variable va en `render.yaml` como dato del
   * blueprint, no como secreto, o sea que existe en producción si y sólo si la
   * sincronización la aplica — y este repositorio ya tiene esa cicatriz escrita:
   * `render.yaml` declaraba `UPLOADS_DIR`, la sincronización fue rechazada por
   * otro motivo, y la variable nunca llegó a crearse. La carpeta se declara en el
   * fichero y no existe en la máquina, que es justo el caso que nadie mira.
   *
   * Se comprueba que esté PUESTA, no que se pueda escribir en ella: de eso ya se
   * encarga el almacén, que cuenta sus fallos y los publica en el diagnóstico.
   * Lo que esta guarda compra es que nadie se la haya dejado sin crear.
   */
  if (process.env.NODE_ENV === 'production' && !process.env.MESAS_DIR?.trim()) {
    throw new Error(
      'Falta MESAS_DIR y esto es producción. Sin ella las mesas de la Sala de Arcade se escriben ' +
        'en «data/mesas» junto al proceso, que en un contenedor es el sistema de ficheros efímero ' +
        'y desaparece en cada despliegue.\nNada da error: las mesas se abren, se juegan y se ' +
        'guardan, y el siguiente «git push» se lleva las partidas en curso —y una de «La Larga» ' +
        'dura días—.\nDefínela apuntando DENTRO del disco persistente. En Render va en ' +
        'render.yaml; comprueba en el panel que la sincronización la ha creado de verdad.',
    );
  }

  /*
   * ═══ Y QUE ADEMÁS SE PUEDA ESCRIBIR AHÍ ═══
   *
   * Aquí ponía que comprobar la escritura no hacía falta porque «de eso ya se
   * encarga el almacén, que cuenta sus fallos y los publica en el diagnóstico».
   * Era falso para la mitad que más duele: el fallo de LECTURA no se contaba ni se
   * publicaba —su `catch` era mudo—, así que una carpeta sin permisos daba
   * `mesas: 0` y `almacen.fallos: 0` a la vez. Eso ya se arregló en `mesas.ts`, y
   * aun así enterarse al arrancar es mejor que enterarse al guardar: para
   * entonces hay una partida en curso que se pierde.
   *
   * Es exactamente lo que hace `UPLOADS_DIR` unas líneas más arriba, con el
   * argumento escrito de que «arrancar escribiendo en un sitio que no es el que se
   * pidió es peor que no arrancar». Aquí vale igual.
   */
  if (process.env.NODE_ENV === 'production') {
    const carpeta = process.env.MESAS_DIR?.trim();
    if (carpeta !== undefined && carpeta.length > 0) {
      try {
        fs.mkdirSync(carpeta, { recursive: true });
        fs.accessSync(carpeta, fs.constants.W_OK);
      } catch (error) {
        throw new Error(
          `No se puede escribir en \`MESAS_DIR\` («${carpeta}»). Ahí viven las partidas de arcade ` +
            'en curso: sin esa carpeta se pierden todas al desplegar, y el síntoma es una mesa ' +
            `que desaparece sin decir nada. Revisa el disco y los permisos. Causa: ${String(error)}`,
        );
      }
    }
  }

  if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI?.trim()) {
    throw new Error(
      'Falta MONGODB_URI y esto es producción. Sin ella el servidor NO da error: cae al fichero ' +
        'JSON local, que en un contenedor vive en el sistema de ficheros efímero y desaparece en ' +
        'el siguiente despliegue.\nTodo parece ir bien —la salud dice que sí, las partidas se ' +
        'guardan y se juegan— hasta que un «git push» se lleva semanas de veladas sin que nada lo ' +
        'relacione con esto.\nDefínela en el panel del despliegue, o arranca sin ' +
        'NODE_ENV=production si de verdad quieres una instancia sobre fichero.',
    );
  }
}

/**
 * Red de última instancia.
 *
 * Los routers ya encaminan hacia el middleware de error todo lo que escape de
 * un manejador (ver `rutas.ts`). Esto cubre lo que NO nace de una petición: un
 * temporizador, una promesa suelta en el hub de avisos, una llamada a la API de
 * Anthropic que rechaza después de haber respondido. Node 20 mata el proceso
 * ante un rechazo sin gestionar, y aquí eso significa dejar a doce personas con
 * el móvil colgado en mitad de la cena.
 *
 * Se registra el fallo y se sigue en pie. Es deliberado: un servidor de juego
 * degradado sirve para terminar la partida; uno muerto, no. Las excepciones no
 * capturadas sí se dejan pasar —ahí el proceso ya está en un estado del que no
 * se puede razonar— pero se anotan antes de caer, que es lo que faltaba para
 * poder averiguar qué pasó.
 */
process.on('unhandledRejection', (razon) => {
  console.error('[servidor] Promesa rechazada sin gestionar:', razon);
});
process.on('uncaughtException', (error) => {
  console.error('[servidor] Excepción no capturada — el proceso termina:', error);
  process.exit(1);
});

/*
 * ═══ LOS ARCADES QUE VIENEN DE FUERA, Y VAN ANTES DE `comprobarArranque()` ═══
 *
 * Los juegos de VELADA de fuera se instalan más abajo, después de escuchar, y ahí
 * está bien: aquel enchufe no tiene ninguna garantía de arranque detrás.
 *
 * Los arcades sí, y son dos: `exigirSecretosTapados()` —que impide arrancar con un
 * arcade que declara secretos y no los tapa— y `exigirQueAguantenVacio()` —que
 * impide arrancar con uno que revienta en la primera lectura de toda mesa recién
 * abierta—. Las dos viven dentro de `comprobarArranque()`.
 *
 * Instalar los de fuera DESPUÉS las dejaría cubriendo sólo a los cuatro de dentro,
 * que son precisamente los únicos que alguien ya ha revisado. O sea: la
 * comprobación seguiría en verde y ya no comprobaría nada de lo que importa, que
 * es el modo de fallo que esta casa tiene apuntado tres veces.
 *
 * Va antes de `initStore()` porque no lo necesita —instalar un arcade es escribir
 * en una tabla en memoria— y porque cuanto antes se sepa que un arcade filtra,
 * mejor. `await` en el ámbito superior, que es lo que ya hace `initStore()` justo
 * debajo: el módulo es ESM.
 */
const arcadesDeFuera = env.arcadesDeFuera ?? [];
if (arcadesDeFuera.length > 0) {
  const puestos = await instalarArcadesDeFuera(arcadesDeFuera);
  console.log(`[arcade] de fuera: ${puestos.join(', ') || '(ninguno)'}`);
}

comprobarArranque();

await initStore();
const activeModel = await getStore().getConfigModel();

/*
 * En producción se escucha SOLO en el bucle local, y la razón es la línea
 * `app.set('trust proxy', 1)` de arriba: eso significa «me fío del primer
 * salto». Si el puerto fuera alcanzable desde fuera, quien llegara directo
 * SERÍA el primer salto, y podría dictar `X-Forwarded-Proto` y
 * `X-Forwarded-For` a voluntad — saltándose nginx entero y, con él, todo lo que
 * dependa del protocolo o de la IP de quien llama.
 *
 * Fuera de producción se abre, porque el portátil hace de servidor de los
 * móviles de la casa. Ver `readHost` en config.ts.
 */
/*
 * Se comprueba al arrancar que la descarga anunciada existe. No bloquea: solo
 * grita en el registro si el enlace esta muerto, que es un fallo invisible de
 * otra forma — la pagina se sirve igual de bien con un enlace roto dentro.
 */
comprobarLaDescarga();

/*
 * ═══ LOS JUEGOS QUE VIENEN DE FUERA, ANTES DE ESCUCHAR ═══
 *
 * Se instalan aquí y no en `juegos/instalados.ts` por una razón sencilla: esto
 * es asíncrono —hay que `await import(...)`— y aquel fichero es una lista de
 * imports que corre al cargarse. Meter un `await` allí obligaría a que todo el
 * arranque lo esperase de forma implícita, que es peor de leer y peor de
 * depurar.
 *
 * Y va ANTES de escuchar, no después: un servidor que acepta partidas de un
 * juego que todavía se está cargando contesta «eso no se puede hacer en esta
 * partida» durante los primeros segundos, y ese es el peor error que hay — el
 * que aparece una vez y no se reproduce.
 */
const deFuera = env.juegosDeFuera ?? [];
if (deFuera.length > 0) {
  const puestos = await instalarJuegosDeFuera(deFuera);
  console.log(`[juegos] de fuera: ${puestos.join(', ') || '(ninguno)'}`);
  /*
   * El reparto se vuelve a aplicar DESPUES, si lo hay. Un juego de fuera se da
   * de alta con `registrarJuego`, que respeta el reparto anotado, asi que esto
   * es cinturon y tirantes; se deja porque el orden de estas dos cosas es
   * exactamente la clase de detalle que se rompe al reordenar el arranque.
   */
  if (env.juegos) instalarSoloEstos(env.juegos);
}

app.listen(env.port, env.host, () => {
  const storageLabel =
    getStorageKind() === 'mongo'
      ? 'MongoDB Atlas (mongoose)'
      : 'fichero JSON (server/data/db.json)';
  const demoLabel = DEMO_MODE
    ? 'ACTIVO — sin ANTHROPIC_API_KEY, el agente responde con guion de demostración'
    : 'inactivo — API de Anthropic conectada';

  const title = 'GAMEMASTERS · Estudio de Misterios';
  const width = 50;
  const padLeft = Math.floor((width - title.length) / 2);
  const padRight = width - title.length - padLeft;

  console.log('');
  console.log(`  ╔${'═'.repeat(width)}╗`);
  console.log(`  ║${' '.repeat(padLeft)}${title}${' '.repeat(padRight)}║`);
  console.log(`  ╚${'═'.repeat(width)}╝`);
  console.log(`   » Escuchando en ....... http://localhost:${env.port}`);
  console.log(
    `   » Cliente ............. ${env.clientDir ? `servido desde ${env.clientDir}` : 'no compilado (en desarrollo lo sirve Vite en el 5173)'}`,
  );
  /*
   * Se dice DÓNDE la ha encontrado o que no la ha encontrado, y no un simple
   * «sí/no»: el fallo típico de esto es tener un empaquetado viejo en la otra
   * carpeta candidata, y con un «servido» a secas nadie lo ve nunca.
   */
  const salaCompilada = carpetaDelEscritorio();
  console.log(
    `   » Sala de Arcade ...... ${salaCompilada ? `http://localhost:${env.port}/sala (desde ${salaCompilada})` : 'no compilada (npm run build -w escritorio; en desarrollo, Vite en el 5175)'}`,
  );
  console.log(`   » Subidas ............. ${uploadsDir}`);
  console.log(
    `   » Acceso .............. ${passwordRequired() ? 'protegido con contraseña (APP_PASSWORD)' : 'ABIERTO — sin APP_PASSWORD configurada'}`,
  );
  console.log(`   » Almacenamiento ...... ${storageLabel}`);
  console.log(`   » Modelo activo ....... ${activeModel}`);
  console.log(`   » Modo demo ........... ${demoLabel}`);
  console.log('');
  console.log('   El telón se levanta. Que comience el misterio.');
  console.log('');
});
