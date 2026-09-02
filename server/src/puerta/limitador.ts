/**
 * El contador de intentos de la puerta.
 *
 * EL PROBLEMA. La puerta de la casa no tiene más defensa que un retardo de 600
 * ms en `/auth/login`, y la de la cuenta no tiene ninguna. Seiscientos
 * milisegundos por intento son cien intentos por minuto por conexión, y nada
 * impide abrir doscientas conexiones a la vez: contra una contraseña que ha
 * elegido una persona, eso no es un obstáculo, es un trámite. Lo mismo vale
 * para los códigos personales de seis letras con los que se entra a jugar.
 *
 * LO QUE SE CUENTA SON LOS FALLOS, NO LAS LLAMADAS, y es la decisión que hace
 * que esto se pueda encender en una velada de verdad. Doce personas en la misma
 * wifi comparten una sola IP pública y teclean su código a la vez, en el mismo
 * minuto, en cuanto se sientan a la mesa: un limitador que cuente peticiones las
 * echa a todas de la mesa a la vez, y ese fallo aparece exactamente el día que
 * importa. Contando solo los fallos, doce entradas correctas no gastan nada. Y
 * una entrada correcta perdona lo anterior —en las puertas donde acertar exige tener el secreto; ver `elAciertoPerdonaLaDireccion`—: quien se equivoca dos veces
 * al teclear y acierta a la tercera deja el contador a cero.
 *
 * EL PELIGRO DE VERDAD ESTÁ EN DE DÓNDE SALE LA IP. Detrás de nginx, `req.ip`
 * no es la IP de nadie: es lo que `trust proxy` decide creerse de la cabecera
 * `X-Forwarded-For`. Si nginx no la manda, o si se manda y aquí no se confía en
 * ella, TODAS las peticiones del mundo llegan con la misma dirección —la del
 * salto anterior, normalmente `127.0.0.1`— y entonces un limitador por IP se
 * convierte en lo contrario de lo que se contrató: cinco fallos de cualquiera,
 * y la casa entera se queda fuera de su propia velada. Es un fallo silencioso;
 * en local no se nota, porque en local la única IP es la misma de todas formas.
 *
 * Por eso aquí la procedencia se mira con desconfianza (`procedenciaDe`) y hay
 * DOS regímenes:
 *
 *   · Si se sabe quién llama, se bloquea: 429 con `Retry-After`.
 *   · Si NO se sabe —si todo el mundo colapsa en una sola dirección—, NO se
 *     bloquea a nadie. No se puede: sin poder distinguir al intruso de los
 *     invitados, cerrar la puerta es hacerle el trabajo al intruso. Lo que se
 *     hace es encarecer cada intento con un retardo creciente —de miles de
 *     pruebas por minuto se baja a unas pocas— y gritarlo en el registro con el
 *     nombre exacto de lo que hay que arreglar en nginx.
 *
 * Y ES EN MEMORIA, A PROPÓSITO, con el mismo razonamiento que los canjes
 * gastados de `routes/cuenta.ts`: la ventana dura minutos, así que lo que abre
 * un reinicio es una ventana de minutos, y a cambio no se paga una escritura en
 * la base de datos en el camino más caliente que hay. El día que haya más de un
 * proceso sirviendo, esto hay que llevarlo al almacén — y entonces será una
 * decisión y no un descuido.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from '../config';

/** Ventana por defecto: diez minutos, que es lo que dura sentarse a la mesa. */
const VENTANA_MS = 10 * 60 * 1000;
/** Fallos contra una misma credencial antes de cerrar, cuando se sabe quién llama. */
const POR_CREDENCIAL = 8;
/** Fallos desde una misma IP, sumando todas las credenciales que pruebe. */
const POR_IP = 40;
/**
 * Cuántos fallos se perdonan sin retardo cuando la procedencia no es fiable.
 * Tiene que caber una velada entera equivocándose: doce personas, dos erratas
 * cada una, y todavía sobra.
 */
const HOLGURA_DEGRADADA = 30;
/** Lo que crece el retardo por cada fallo pasada la holgura. */
const PASO_DE_RETARDO_MS = 250;
/** Techo del retardo. Más que esto no encarece nada y sí parece una caída. */
const RETARDO_MAXIMO_MS = 3000;
/**
 * Tope de claves vivas. Sin él, quien rota credenciales inventadas hace crecer
 * el mapa sin fin: el limitador acabaría tumbando el proceso por memoria, que
 * es peor que lo que venía a evitar.
 */
const MAXIMO_DE_CLAVES = 20_000;

/** De dónde llega una petición, y si esa respuesta se puede creer. */
export interface Procedencia {
  /** La dirección con la que se va a contar. */
  ip: string;
  /** `false` cuando todo el mundo colapsa en la misma dirección. */
  fiable: boolean;
  /** Qué hay que mirar para arreglarlo, en cristiano. Solo si no es fiable. */
  motivo?: string;
}

/** Las direcciones del propio servidor, que no identifican a nadie. */
function esBucleLocal(ip: string): boolean {
  const limpia = ip.replace(/^::ffff:/, '');
  return limpia === '::1' || limpia.startsWith('127.');
}

/**
 * De dónde llega quien llama, y sobre todo: si se puede contar con ello.
 *
 * `req.ips` solo trae algo cuando se ha confiado en al menos un salto Y ese
 * salto ha mandado `X-Forwarded-For`. Es justo la condición que hay que exigir
 * detrás de nginx, así que se usa como prueba de que la cadena está bien
 * montada, en lugar de creerse `req.ip` a secas.
 *
 * Los dos modos de fallo que se cazan aquí son los dos que ocurren de verdad:
 *
 *   · Llega `X-Forwarded-For` y `req.ips` está vacío. Significa que no se está
 *     confiando en el proxy (`app.set('trust proxy', …)`), y entonces la
 *     dirección que se ve es la de nginx: la misma para todo el mundo. Este es
 *     el peor de los dos, porque desde fuera parece que funciona.
 *   · No llega `X-Forwarded-For` y quien llama es el bucle local. En producción
 *     se escucha solo en `127.0.0.1`, así que delante hay un proxy por
 *     definición: si además no identifica a nadie, no hay IP que contar.
 */
export function procedenciaDe(req: Request): Procedencia {
  /*
   * DE QUIÉN ES LA CABECERA: LO DICE `PROXY_DE_CONFIANZA`, NO SE ADIVINA.
   *
   * Hay dos despliegues y quieren cosas opuestas, así que adivinar falla en uno
   * de los dos — y este fichero ya ha fallado en los dos, uno detrás de otro:
   *
   *   · EN CASA (el portátil sirviendo a los móviles de la velada, escuchando
   *     en 0.0.0.0) cualquier móvil se conecta directo y elige la cabecera que
   *     quiere: rotándola no acumula fallos nunca, y fijándola en la de otra
   *     persona le gasta el presupuesto y la deja fuera. Eso último es lo grave:
   *     convierte una defensa en un arma. Aquí solo vale el otro extremo del
   *     TCP, que es lo único de toda la petición que quien llama no elige.
   *
   *   · EN RENDER hay un balanceador externo, así que el otro extremo del TCP
   *     es SIEMPRE suyo: mirarlo mete a toda la plataforma en el mismo cubo y
   *     ocho contraseñas mal tecleadas por cualquiera dejan a TODOS los Game
   *     Masters fuera del taller. Aquí la única dirección útil es la cabecera
   *     que el balanceador reescribe en cada petición.
   *
   * Mirar el peer primero rompía Render; mirar `req.ips` primero rompía la
   * velada en casa. Por eso se declara: `plataforma` en Render (ver
   * `render.yaml`), y el valor por defecto —`loopback`— es el seguro, que es
   * como tiene que fallar una variable que se olvida.
   */
  if (env.proxyDeConfianza === 'plataforma') {
    const deLaPlataforma = req.ips;
    if (deLaPlataforma.length > 0) {
      // El último de la lista es el que añadió el salto en el que sí se confía;
      // los de más a la izquierda los puede haber escrito quien llama.
      return { ip: deLaPlataforma[deLaPlataforma.length - 1] ?? '', fiable: true };
    }
  } else {
    /*
     * El peer manda: si es el bucle local, delante hay un proxy de esta misma
     * máquina y su cabecera vale; si no, quien llama ES el cliente y no vale
     * nada. Y NO se cae al camino de «no fiable» de más abajo aunque llegue la
     * cabecera: ese camino desactiva el bloqueo y deja solo retardos, así que a
     * quien probara contraseñas a lo bruto le bastaría con añadir un encabezado
     * para desarmar la puerta.
     */
    const peer = req.socket.remoteAddress ?? '';
    if (!esBucleLocal(peer) && peer) return { ip: peer, fiable: true };

    const porProxy = req.ips;
    if (porProxy.length > 0) {
      return { ip: porProxy[porProxy.length - 1] ?? '', fiable: true };
    }
  }

  const directa = req.ip ?? req.socket.remoteAddress ?? '';

  if (req.headers['x-forwarded-for']) {
    return {
      ip: directa || 'desconocida',
      fiable: false,
      motivo:
        'llega la cabecera X-Forwarded-For y este servidor no se fía de ella, así que la ' +
        'dirección que se ve es la del proxy y es la misma para todo el mundo. Revisa ' +
        "app.set('trust proxy', 1) en index.ts",
    };
  }

  if (directa === '' || esBucleLocal(directa)) {
    return {
      ip: directa || 'desconocida',
      fiable: false,
      motivo:
        'quien llama es el bucle local y no manda X-Forwarded-For, de modo que todas las ' +
        'peticiones son la misma dirección. Revisa que nginx incluya ' +
        'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for',
    };
  }

  return { ip: directa, fiable: true };
}

/** Cómo se configura una puerta concreta. */
export interface OpcionesDeLimitador {
  /** Aparece en el registro cuando algo se cierra. Es para leerlo, no para la API. */
  nombre: string;
  /**
   * Qué se está intentando abrir: el código de la partida, el proveedor, la
   * casa entera. Sirve para que quien se ensaña con una credencial no gaste el
   * presupuesto de las demás, y para que en modo degradado —donde la IP no vale
   * nada— siga habiendo algo con lo que separar a unas personas de otras.
   */
  credencial: (req: Request) => string | undefined;
  ventanaMs?: number;
  porCredencial?: number;
  porIp?: number;
  /**
   * Qué respuesta cuenta como intento fallido. Por defecto, 401 y 403: un 400
   * es una petición mal escrita y un 500 es culpa nuestra, y ni uno ni otro son
   * alguien probando credenciales.
   */
  esFallo?: (estado: number) => boolean;
  /**
   * ¿UN ACIERTO PERDONA TAMBIÉN EL CUBO DE LA DIRECCIÓN?
   *
   * ═══ LA PREGUNTA DE VERDAD ES: ¿QUÉ PRUEBA UN ACIERTO EN ESTA PUERTA? ═══
   *
   * En la puerta de la casa, acertar exige TENER la contraseña: quien la produce
   * ya no necesita adivinarla, así que perdonar es gratis y además hace falta —su
   * credencial es constante (`'casa'`), o sea que el cubo fino y el grueso cuentan
   * lo mismo, y no perdonar el grueso lo convierte en un contador que no se vacía
   * NUNCA: doce personas de la misma wifi con dos erratas cada una y las tres
   * últimas reciben 429 con la contraseña BUENA—.
   *
   * En la puerta de los códigos de mesa es al revés: un acierto es GRATIS —leer tu
   * propia mesa— y no dice nada de los cincuenta y nueve códigos ajenos contra los
   * que se falló. Ahí perdonar la dirección abre el oráculo entero.
   *
   * Por eso se declara puerta por puerta y no se adivina. Por defecto SÍ, que es
   * lo que hacían todas y lo correcto para las de contraseña; la de los códigos
   * dice que no.
   */
  elAciertoPerdonaLaDireccion?: boolean;
}

interface Registro {
  fallos: number;
  expira: number;
}

/**
 * Un middleware que cuenta los intentos fallidos y cierra la puerta cuando se
 * pasan de la raya.
 *
 * Cada llamada a esta función tiene su propio recuento: dos puertas distintas
 * no se gastan el presupuesto la una a la otra.
 *
 * NO HACE FALTA QUE LA RUTA COLABORE. El desenlace del intento se lee del
 * estado de la respuesta cuando ya se ha enviado (`finish`), así que esto se
 * monta delante de una ruta escrita hace meses sin tocarle una línea. Si
 * dependiera de que cada ruta llamase a un «apunta que este ha fallado», la
 * ruta número nueve se olvidaría — y sería justo la que dejase la puerta
 * abierta.
 */
export function limitarIntentos(opciones: OpcionesDeLimitador): RequestHandler {
  const ventanaMs = opciones.ventanaMs ?? VENTANA_MS;
  const porCredencial = opciones.porCredencial ?? POR_CREDENCIAL;
  const porIp = opciones.porIp ?? POR_IP;
  const esFallo = opciones.esFallo ?? ((estado: number) => estado === 401 || estado === 403);
  const perdonaLaDireccion = opciones.elAciertoPerdonaLaDireccion ?? true;

  const registros = new Map<string, Registro>();
  let yaAvisado = false;

  /** Lo que queda vivo de una clave, o `null` si su ventana ya pasó. */
  function vigente(clave: string, ahora: number): Registro | null {
    const registro = registros.get(clave);
    if (!registro) return null;
    if (registro.expira <= ahora) {
      registros.delete(clave);
      return null;
    }
    return registro;
  }

  /** Tira lo caducado; si aun así sobran claves, tira las más viejas. */
  function barrer(ahora: number, forzado = false): void {
    for (const [clave, registro] of registros) {
      if (registro.expira <= ahora) registros.delete(clave);
    }
    if (!forzado || registros.size <= MAXIMO_DE_CLAVES) return;
    const porEdad = [...registros.entries()].sort((a, b) => a[1].expira - b[1].expira);
    for (const [clave] of porEdad.slice(0, registros.size - MAXIMO_DE_CLAVES)) {
      registros.delete(clave);
    }
  }

  function sumar(clave: string, ahora: number): void {
    const registro = vigente(clave, ahora);
    if (registro) {
      registro.fallos++;
      return;
    }
    /*
     * La ventana arranca en el PRIMER fallo y no se renueva con cada uno. Si se
     * renovara, quien se equivocara una vez cada nueve minutos —o quien tuviera
     * a alguien probando muy despacio desde su misma wifi— acabaría con un
     * castigo perpetuo sin haber pasado nunca del límite.
     */
    registros.set(clave, { fallos: 1, expira: ahora + ventanaMs });
    if (registros.size > MAXIMO_DE_CLAVES) barrer(ahora, true);
  }

  // El barrido va desatado del bucle de eventos (`unref`): un limitador no
  // puede ser el motivo de que un proceso no termine nunca.
  setInterval(() => barrer(Date.now()), ventanaMs).unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ahora = Date.now();
    const procedencia = procedenciaDe(req);

    /*
     * La credencial se recorta antes de tocar el mapa. Es la única parte de la
     * clave que elige quien llama: sin recortar, un cuerpo con un campo de diez
     * megas se convierte en una clave de diez megas guardada toda la ventana.
     */
    const credencial = (opciones.credencial(req) ?? '—').slice(0, 64).toLowerCase();

    /**
     * Apunta el desenlace cuando la respuesta ya ha salido.
     *
     * Un acierto BORRA lo anterior, y es deliberado: quien teclea mal su código
     * dos veces y acierta a la tercera no debe arrastrar nada, y un acierto es
     * además la mejor prueba que hay de que detrás de esa dirección está la
     * velada y no alguien probando a ciegas.
     *
     * ═══ Y EN ALGUNAS PUERTAS SÓLO PERDONA SU PROPIA CREDENCIAL ═══
     *
     * Esto borraba LAS DOS CLAVES, y con eso el cubo por dirección —que es el
     * único que ve una enumeración— se vaciaba con cualquier acierto. Medido
     * sobre la puerta de los códigos de mesa: se abre una mesa propia y luego se
     * repite «cincuenta y nueve códigos inventados más una lectura de la mía»; esa
     * lectura devuelve 200 y pone el contador a cero, así que nunca se llega al
     * tope y el «oráculo de qué códigos existen» sigue abierto con un 1,7 % de
     * peticiones de más.
     *
     * El razonamiento de arriba justifica perdonar ESTA credencial desde ESTA
     * dirección —acertar dice algo sobre ella—, y no justifica borrar lo que se
     * falló contra otras cincuenta y nueve, que es de lo que no dice nada.
     *
     * PERO SÓLO DONDE ACERTAR CUESTA ALGO, y esto se escribió primero para todas y
     * rompió la puerta de la casa: allí la credencial es constante, así que los dos
     * cubos cuentan lo mismo y el grueso pasaba a no vaciarse nunca —medido: doce
     * personas de la misma wifi con dos erratas cada una y las tres últimas
     * reciben 429 con la contraseña buena—. Ver `elAciertoPerdonaLaDireccion`.
     */
    const anotar = (claveFina: string, claves: string[]): void => {
      res.on('finish', () => {
        const cuando = Date.now();
        if (esFallo(res.statusCode)) {
          for (const clave of claves) sumar(clave, cuando);
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          for (const clave of perdonaLaDireccion ? claves : [claveFina]) registros.delete(clave);
        }
      });
    };

    if (!procedencia.fiable) {
      /*
       * Se dice UNA vez, y con nombre y apellidos. Este fallo no se manifiesta
       * como un error: se manifiesta como que el limitador protege bastante
       * menos de lo que aparenta su código, y eso solo se descubre leyendo el
       * registro o el día que alguien entra por la puerta.
       */
      if (!yaAvisado) {
        yaAvisado = true;
        console.error(
          `[puerta:${opciones.nombre}] no se puede saber de dónde llega cada petición: ` +
            `${procedencia.motivo}. Mientras siga así NO se bloquea a nadie —hacerlo dejaría ` +
            'fuera a la casa entera— y solo se encarece cada intento con un retardo.',
        );
      }

      // Sin IP útil, lo único que separa a unas personas de otras es qué están
      // intentando abrir. Se cuenta por credencial y jamás se cierra la puerta.
      const clave = `credencial:${credencial}`;
      anotar(clave, [clave]);
      const fallos = vigente(clave, ahora)?.fallos ?? 0;
      const retardo = Math.min(
        RETARDO_MAXIMO_MS,
        Math.max(0, fallos - HOLGURA_DEGRADADA) * PASO_DE_RETARDO_MS,
      );
      if (retardo === 0) {
        next();
        return;
      }
      setTimeout(next, retardo).unref?.();
      return;
    }

    const claveFina = `${procedencia.ip}|${credencial}`;
    const claveGruesa = `ip:${procedencia.ip}`;

    const fina = vigente(claveFina, ahora);
    const gruesa = vigente(claveGruesa, ahora);
    const cerrada =
      (fina && fina.fallos >= porCredencial ? fina : null) ??
      (gruesa && gruesa.fallos >= porIp ? gruesa : null);

    if (cerrada) {
      /*
       * 429 con `Retry-After`, y el mensaje dice qué hacer mientras tanto. Un
       * 401 aquí sería mentira —la credencial puede ser buena— y quien está
       * delante seguiría probando la que ya funciona, convencido de que la ha
       * olvidado.
       */
      const segundos = Math.max(1, Math.ceil((cerrada.expira - ahora) / 1000));
      res.setHeader('Retry-After', String(segundos));
      res.status(429).json({
        error:
          'Demasiados intentos fallidos desde esta conexión. Espera un momento y vuelve a ' +
          'probarlo; si no recuerdas el código, pídeselo a quien dirige la partida.',
        reintentarEn: segundos,
      });
      return;
    }

    anotar(claveFina, [claveFina, claveGruesa]);
    next();
  };
}
