/**
 * LA PUERTA DE LA SALA DE ARCADE.
 *
 * ═══ VA DELANTE DE `requireAuth`, Y ESO NO ES UNA COMODIDAD ═══
 *
 * Este router se monta junto a `jugarRouter`, o sea ANTES del guardián de la
 * contraseña del taller. La razón es estructural y está en el §0 del diseño: un
 * arcade NO TIENE GAME MASTER. En una velada, todo el ciclo lo abre
 * `routes/live.ts` detrás de `requireAuth` porque hay alguien que dirige, que
 * pagó, que dio de alta a doce personas y que conoce la contraseña de la casa.
 *
 * Aquí no hay nada de eso. Cuatro personas abren una mesa con un código de cinco
 * letras y juegan. Montar esto detrás del guardián significaría que para jugar a
 * un juego de cartas de cinco minutos hay que conocer la contraseña del estudio
 * de misterios — que es exactamente el acoplamiento con el taller que el motor de
 * arcade existe para no tener.
 *
 * ═══ QUÉ VIGILA ESTA PUERTA, ENTONCES ═══
 *
 * La llave del asiento, que llega en la cabecera `x-asiento`. No es una cuenta:
 * es un secreto que el servidor reparte al sentarse y que solo conoce quien se
 * sentó. Sin ella se puede MIRAR una mesa —como espectador, sin ver la mano de
 * nadie— y no se puede mover ni una carta.
 *
 * Y hay una cosa que esta puerta NO hace y conviene decirlo: no comprueba a
 * quién le toca. Eso es una regla del juego y vive en el reductor. Lo único que
 * se comprueba aquí es quién dice ser, igual que lo único que comprueba el
 * árbitro es que esté sentado y que su revisión sea fresca.
 *
 * ═══ EL TRANSPORTE VIVE AQUÍ Y NO EN `mesas.ts` ═══
 *
 * Avisar de que la mesa ha cambiado es transporte, y el árbitro lo dice en su
 * cabecera: mezclarlo con la autoridad haría que no se pudiera ejecutar la
 * autoridad sin montar un canal —o sea, no se podría probar en proceso— y un
 * dispositivo que quisiera usar la misma autoridad en local arrastraría el bus
 * del servidor. Así que los seis verbos se llaman desde este fichero y desde
 * ningún otro.
 *
 * ═══ Y AQUÍ SE USA EL SEXTO ═══
 *
 * Una lectura con `?desde=N` se aparca hasta veinticinco segundos. Si en esa
 * ventana vence el plazo de la mesa, nadie llamaría a `avisarCambio` —porque el
 * problema es justamente que nadie se mueve— y el plazo vencería tarde. Antes de
 * aparcarse, la petición pide un `despertarAlVencer` para el instante en que
 * toca, y al despertar vuelve a entrar por `mirar`, que es donde se evalúan los
 * plazos bajo el candado. Está contado entero en `canal/index.ts`.
 */
import {
  abrir,
  AlmacenNoGuarda,
  ArcadeSinMesa,
  cerrar,
  MesaDesconocida,
  MesaLlena,
  mesasVivas,
  mirar,
  mover,
  MovimientoReservado,
  olvidarMesa,
  PLAZO_MAXIMO_S,
  saludDelAlmacen,
  sentarse,
  candadosDeMesaVivos,
} from '../arcade/mesas';
import type { VistaDeMesa } from '../arcade/mesas';
import {
  anunciarInicio,
  ArcadeSinRecords,
  avisosAbiertos,
  recordsDe,
  registrarRecord,
} from '../arcade/marcadores';
import {
  ArcadeFueraDePresupuesto,
  loMedido,
  losApartados,
  TOPE_BYTES,
  TOPE_MS,
} from '../arcade/presupuesto';
import { elCanal } from '../canal';
import { despertadoresVivos } from '../canal/sondeo';
import { MovimientoRechazado } from '../arcade/arbitro';
import { limitarIntentos } from '../puerta/limitador';
import {
  arcadeInstalado,
  arcadesInstalados,
  ArcadeNoInstalado,
} from '../../../shared/arcade';
import { turnoDeLaVista } from '../../../shared/mecanicas/turno-declarado';
import type { Request, Response } from 'express';
import { crearRouter } from '../rutas';

const router = crearRouter();

/** La llave del asiento, o `null` si quien pregunta viene a mirar. */
function llaveDe(req: Request): string | null {
  const cruda = req.headers['x-asiento'];
  const texto = Array.isArray(cruda) ? cruda[0] : cruda;
  return typeof texto === 'string' && texto.length > 0 ? texto : null;
}

/**
 * Traduce los errores de la autoridad a códigos HTTP.
 *
 * ═══ POR QUÉ LA TRADUCCIÓN VIVE AQUÍ Y NO EN `mesas.ts` ═══
 *
 * Porque la autoridad no sabe de HTTP y no debe: si supiera, no se podría
 * ejercitar desde un guion sin montar un servidor, que es justo lo que hace
 * falta para probar las reglas sin el ruido de la red.
 *
 * Y porque los motivos NO son todos el mismo código, que es la razón de que
 * `MotivoDeRechazo` sea una unión cerrada y no un texto:
 *
 *   · `revision-rancia` es 409 y SE ARREGLA SOLO: el dispositivo pide el estado
 *     otra vez y reintenta. Con la respuesta va el estado completo, para que no
 *     tenga que hacer dos viajes — que es el punto 4 de «La Larga»: volver con
 *     una revisión de hace tres días es lo normal, no un error.
 *   · `no-estas-sentado` es 403 y NO se arregla solo: o falta la llave, o es de
 *     otra mesa. Contestarlo como 409 mandaría al móvil a reintentar en bucle.
 *   · `mesa-terminada` es 409 y tampoco se arregla reintentando, pero es una
 *     situación normal —dos personas mandan el último movimiento a la vez— y no
 *     un intruso, así que no es un 403.
 *
 * Con un motivo en texto libre, esta tabla se escribiría comparando cadenas, y
 * un cambio de redacción se llevaría por delante el reintento automático sin que
 * nada avisara.
 */
function contestarElFallo(error: unknown, res: Response, vista?: VistaDeMesa): boolean {
  if (error instanceof MesaDesconocida) {
    res.status(404).json({ error: error.message, codigo: error.codigo });
    return true;
  }
  if (error instanceof MesaLlena) {
    res.status(409).json({ error: error.message, motivo: 'mesa-llena' });
    return true;
  }
  if (error instanceof ArcadeNoInstalado) {
    res.status(409).json({
      error: error.message,
      arcade: error.arcade,
      /*
       * Se dice qué SÍ hay, por lo mismo que hace el manejador de error del
       * servidor con las veladas: con repartos por servidor, lo primero que
       * necesita saber quien recibe esto es si se ha equivocado de servidor.
       */
      instalados: arcadesInstalados().map((m) => m.id),
    });
    return true;
  }
  if (error instanceof ArcadeSinMesa) {
    /*
     * 409 y no 404: el arcade EXISTE y está en el catálogo que esta misma ruta
     * publica; lo que no tiene es mesa de servidor. Un 404 mandaría a quien lo
     * lea a buscar un juego que sí está instalado.
     */
    res.status(409).json({ error: error.message, arcade: error.arcade, motivo: 'sin-mesa' });
    return true;
  }
  if (error instanceof MovimientoReservado) {
    /*
     * 400 y no 403: no es que este asiento no pueda: es que ese movimiento no lo
     * manda ningún dispositivo. Un 403 le diría a quien lo recibe que con otra
     * credencial funcionaría, y no hay credencial que valga para el prefijo de
     * la plataforma.
     */
    res.status(400).json({ error: error.message, motivo: 'movimiento-reservado', tipo: error.tipo });
    return true;
  }
  if (error instanceof AlmacenNoGuarda) {
    /*
     * ═══ 503 CON LA MESA DENTRO, QUE ES LO ÚNICO HONESTO QUE SE PUEDE DECIR ═══
     *
     * Las dos cosas son ciertas a la vez y hay que decir las dos: el movimiento
     * ENTRÓ —está en memoria y los otros tres ya lo ven— y NO ESTÁ GUARDADO, así
     * que un reinicio se lo lleva. Contestar 200 sería romper la promesa de la
     * escritura síncrona en silencio; contestar 500 a secas haría creer que el
     * movimiento no entró y provocaría un reintento que además saldría rancio.
     *
     * Va la mesa dentro por lo mismo que en `revision-rancia`: para que quien
     * juega vea el estado bueno sin un segundo viaje.
     */
    res.status(503).json({
      error: error.message,
      motivo: 'no-guardado',
      codigo: error.codigo,
      mesa: vista,
    });
    return true;
  }
  if (error instanceof ArcadeFueraDePresupuesto) {
    /*
     * ═══ 503, Y ES EL CÓDIGO EXACTO ═══
     *
     * No es 400 —quien movió no hizo nada mal—, ni 403 —no le falta ninguna
     * credencial—, ni 500 —el servidor está perfectamente y sirviendo todo lo
     * demás—. Lo que pasa es que ESTE arcade está apartado: el servicio de ese
     * juego no está disponible y no lo va a estar reintentando. 503 dice eso, y
     * además es lo que evita que un cliente entre en un bucle de reintentos contra
     * un juego que va a rechazárselo todo.
     *
     * NO va la mesa dentro, al revés que en `revision-rancia`: componerla obligaría
     * a proyectar, o sea a volver a ejecutar código del arcade que acaba de
     * demostrar que se pasa del presupuesto. Enseñar el estado no vale una segunda
     * pasada por el mismo hilo.
     */
    res.status(503).json({
      error: error.message,
      motivo: 'fuera-de-presupuesto',
      arcade: error.arcade,
      porque: error.porque,
    });
    return true;
  }
  if (error instanceof MovimientoRechazado) {
    const estado = error.motivo === 'no-estas-sentado' ? 403 : 409;
    res.status(estado).json({ error: error.message, motivo: error.motivo, mesa: vista });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// LAS DOS PUERTAS CON CONTADOR
//
// ═══ POR QUÉ AQUÍ Y NO EN `puerta/montaje.ts` ═══
//
// Porque aquel fichero es la puerta de la CASA —la contraseña del taller, la
// cuenta de proveedor y el código de una velada— y este motor no vive detrás de
// ninguna de las tres. Lo que se comparte es el MECANISMO (`limitarIntentos`),
// que es una pieza de plataforma y no de veladas, y se comparte llamándolo, que
// es exactamente lo que el §0 del diseño permite.
//
// ═══ Y POR QUÉ HACEN FALTA, MEDIDO ═══
//
// Sin ellas: trescientos intentos de sentarse con códigos inventados se sirven
// los trescientos con un 404 limpio —o sea, un oráculo perfecto de qué códigos
// existen— y un solo cliente abrió cuatrocientas mesas en setecientos treinta
// milisegundos. Y acertar un código NO es mirar: es sentarse, porque sentarse
// solo pide el código. Desde ese asiento se puede cerrar la partida de otros
// cuatro o borrarla entera.
//
// La casa ya tenía escrita la doctrina para el caso hermano —el código de una
// velada, «la puerta delicada», treinta por código y sesenta por conexión— y los
// números son los mismos por la misma razón: cinco letras que se dictan en voz
// alta en un bar se teclean mal, y nadie puede quedarse fuera de la partida por
// haberse equivocado dos veces.
// ---------------------------------------------------------------------------

/**
 * SENTARSE: se cuentan los códigos que NO existen.
 *
 * Un 404 es un intento fallido y es lo único que cuenta: los aciertos no gastan
 * nada y además PERDONAN lo anterior, que es lo que permite que cuatro personas
 * de la misma wifi entren a la vez sin echarse unas a otras. Un 409 —la mesa
 * está llena— no cuenta: es una respuesta a un código bueno.
 */
const contadorDeCodigos = limitarIntentos({
  nombre: 'código de mesa de arcade',
  credencial: (req) => String(req.params.codigo ?? '').toUpperCase(),
  porCredencial: 30,
  porIp: 60,
  esFallo: (estado) => estado === 404,
});

/**
 * ABRIR: aquí se cuentan TODAS, y es la diferencia con la puerta de al lado.
 *
 * Abrir una mesa no falla casi nunca —no hay nada que acertar— así que un
 * contador de fallos no contaría nada. Lo que hay que acotar es el VOLUMEN, que
 * es lo que cuesta memoria y disco durante treinta días sin que nadie haya
 * tecleado una credencial. Con `esFallo` siempre cierto, cada apertura gasta una
 * y el tope es «cuántas mesas puede abrir una conexión en diez minutos».
 *
 * Sesenta por conexión y treinta por juego son de sobra para una casa entera
 * detrás de la misma IP montando partidas toda la tarde, y cortan en seco las
 * tres mil que se midieron en siete segundos.
 */
const contadorDeAperturas = limitarIntentos({
  nombre: 'apertura de mesa de arcade',
  credencial: (req) => {
    const cuerpo = req.body as { arcade?: unknown } | undefined;
    return typeof cuerpo?.arcade === 'string' ? cuerpo.arcade : 'sin-arcade';
  },
  porCredencial: 30,
  porIp: 60,
  esFallo: () => true,
});

// ---------------------------------------------------------------------------
// El catálogo
// ---------------------------------------------------------------------------

/**
 * Qué arcades tiene instalados ESTE servidor.
 *
 * Sin credencial ninguna: es el catálogo, y saber a qué se puede jugar aquí no
 * es información de nadie. La app lo lee del registro compilado cuando el juego
 * viene en el binario; esto es lo que hará falta el día que un servidor instale
 * un reparto distinto del que trae la app.
 */
router.get('/arcade', (_req, res) => {
  res.json({ arcades: arcadesInstalados() });
});

// ---------------------------------------------------------------------------
// Abrir y sentarse
// ---------------------------------------------------------------------------

/**
 * ABRE UNA MESA. La abre el primer jugador y se sienta de paso.
 *
 * Devuelve el código —para dictarlo— y la llave —para guardarla—. La llave no
 * vuelve a salir nunca más: quien la pierda tiene que sentarse otra vez, y en un
 * juego de cuatro asientos exactos eso significa que la mesa se ha quedado
 * coja. Es el precio de no tener cuentas, y es un precio y no un descuido.
 */
router.post('/arcade/mesas', contadorDeAperturas, async (req, res) => {
  const cuerpo = req.body as { arcade?: unknown; nombre?: unknown; plazoSegundos?: unknown };
  const arcade = typeof cuerpo.arcade === 'string' ? cuerpo.arcade : '';
  if (!arcadeInstalado(arcade)) {
    res.status(409).json({
      error: `«${arcade}» no es un arcade instalado en este servidor.`,
      instalados: arcadesInstalados().map((m) => m.id),
    });
    return;
  }

  const plazoSegundos =
    typeof cuerpo.plazoSegundos === 'number' ? cuerpo.plazoSegundos : undefined;
  if (plazoSegundos !== undefined && plazoSegundos > PLAZO_MAXIMO_S) {
    res.status(400).json({
      error: `El plazo por turno no puede pasar de ${PLAZO_MAXIMO_S} segundos (siete días).`,
    });
    return;
  }

  try {
    const abierta = await abrir({
      arcade,
      nombre: typeof cuerpo.nombre === 'string' ? cuerpo.nombre : '',
      plazoSegundos,
    });
    /*
     * La respuesta se compone con la MISMA `mirar` que usan las demás rutas, y no
     * con una copia hecha a mano de los mismos campos. Un solo camino para
     * componer lo que sale es la diferencia entre un campo nuevo que aparece en
     * todas partes y uno que aparece en todas menos en la primera pantalla — que
     * es justo la que nadie vuelve a mirar.
     */
    let mesa: VistaDeMesa;
    try {
      mesa = await mirar(abierta.mesa.codigo, abierta.silla.llave);
    } catch (error) {
      /*
       * ═══ SI LA PRIMERA MIRADA FALLA, LA MESA NO SE QUEDA AHÍ ═══
       *
       * `abrir` ya la ha metido en la tabla y en el almacén, así que sin esto
       * queda una MESA HUÉRFANA: nadie recibió su llave de asiento, así que
       * nadie puede sentarse a ella, nadie puede cerrarla y nadie puede
       * borrarla —el `DELETE` exige estar sentado— y se queda los treinta días
       * del olvido ocupando memoria y disco.
       *
       * Pasó de verdad: abrir una mesa de un arcade de `sede: 'dispositivo'`
       * reventaba al proyectar y dejaba la mesa puesta. Aquello se arregla en
       * `abrir`, que ahora se niega; esto es la red de debajo, porque el día que
       * la vista falle por cualquier otro motivo el resultado sería el mismo.
       */
      await olvidarMesa(abierta.mesa.codigo).catch(() => {});
      elCanal().olvidar(abierta.mesa.codigo);
      throw error;
    }
    res.status(201).json({
      codigo: mesa.codigo,
      asiento: abierta.silla.id,
      llave: abierta.silla.llave,
      mesa,
    });
  } catch (error) {
    if (!contestarElFallo(error, res)) throw error;
  }
});

/**
 * SE SIENTA ALGUIEN CON EL CÓDIGO.
 *
 * El aforo lo decide el manifiesto del juego, no esta ruta. Que el quinto se
 * quede fuera de una mesa de La Ronda no está escrito en ningún sitio del
 * servidor: sale de `jugadores.maximo`.
 */
router.post('/arcade/mesas/:codigo/asientos', contadorDeCodigos, async (req, res) => {
  const codigo = String(req.params.codigo ?? '').toUpperCase();
  const cuerpo = req.body as { nombre?: unknown };
  try {
    const silla = await sentarse(codigo, typeof cuerpo.nombre === 'string' ? cuerpo.nombre : '');
    /*
     * Los otros tres están sondeando y tienen que enterarse de que ha llegado
     * alguien. Se avisa DESPUÉS de que la mesa esté guardada: al despertar, el
     * móvil que esperaba vuelve a preguntar de inmediato, y si el aviso saliera
     * antes podría leer la mesa sin el asiento nuevo y quedarse con la revisión
     * nueva y el contenido viejo. Es el mismo razonamiento que ya está escrito
     * en `mutar`, y allí costó encontrarlo.
     */
    elCanal().avisarCambio(codigo);
    const mesa = await mirar(codigo, silla.llave);
    res.json({ asiento: silla.id, llave: silla.llave, mesa });
  } catch (error) {
    if (!contestarElFallo(error, res)) throw error;
  }
});

// ---------------------------------------------------------------------------
// LA LECTURA, con espera larga y evaluación de plazos
// ---------------------------------------------------------------------------

/**
 * LA VISTA DE LA MESA. Con `?desde=N` no contesta hasta que algo cambie.
 *
 * ═══ LOS TRES CAMINOS, Y POR QUÉ SON TRES ═══
 *
 *  1. SIN `desde`: se contesta lo que hay. Es lo que pide un móvil que acaba de
 *     abrir la pantalla y no sabe nada.
 *  2. CON `desde` Y ALGO NUEVO: se contesta lo que hay. Incluye el caso de un
 *     `desde` rancio de días, que NO es un error: es alguien que volvió del
 *     trabajo, y lo que recibe es el estado completo.
 *  3. CON `desde` Y NADA NUEVO: se aparca. Y antes de aparcarse se pide el
 *     despertador por vencimiento, que es el sexto verbo.
 *
 * ═══ POR QUÉ SE VUELVE A MIRAR DESPUÉS DE LA ESPERA, INCLUSO SI SE AGOTÓ ═══
 *
 * Porque el despertador es una PISTA y no una promesa: puede no saltar, o saltar
 * tarde, y en ese caso el plazo tiene que vencer igualmente. La segunda mirada
 * pasa otra vez por el candado y evalúa los plazos, así que una espera agotada
 * que llega justo después del vencimiento contesta con el tic ya metido en vez
 * de con un 204 y otros veinticinco segundos de mesa quieta.
 *
 * El 204 se reserva para lo que de verdad significa: no ha pasado nada, vuelve a
 * preguntar.
 *
 * ═══ Y SE COMPARA CON `!==`, NO CON `>`: UN `desde` ADELANTADO SE RESINCRONIZA ═══
 *
 * Con `>` —que es como estaba escrito— una lectura con `desde` MAYOR que la
 * revisión de la mesa se aparcaba, contestaba 204 a los veinticinco segundos, y
 * volvía a hacer lo mismo en la siguiente vuelta. Para siempre: la pantalla del
 * móvil se quedaba muerta sin un solo error, porque el estado no llegaba NUNCA.
 *
 * Y no es un caso imposible ni un cliente manipulado. Se llega por tres caminos
 * que esta fase misma contempla: un servidor que contestó una revisión que no
 * llegó a guardarse, un almacén restaurado de una copia, y la escritura diferida
 * de `tickHz > 0`. Los tres dejan al móvil con una revisión más alta que la de
 * la mesa, que es la definición de «rancio» al revés — y el punto 4 de La Larga
 * dice que un `rev` rancio es el caso normal y se trata resincronizando, no
 * colgando al cliente.
 *
 * `!==` significa «lo que tienes no es lo que hay»: si no coincide, se manda el
 * estado completo y se acabó. Igual que `hub.ts`.
 */
router.get('/arcade/mesas/:codigo', async (req, res) => {
  const codigo = String(req.params.codigo ?? '').toUpperCase();
  const llave = llaveDe(req);
  const desde = Number(req.query.desde);

  try {
    const primera = await mirar(codigo, llave);
    if (!Number.isFinite(desde) || primera.rev !== desde) {
      responderConLaMesa(res, primera, desde);
      return;
    }

    /*
     * EL SEXTO VERBO. Solo se pide si de verdad hay un plazo por delante: pedirlo
     * siempre dejaría un temporizador por mesa aunque la mesa no tuviera nada que
     * caducar, que es una entrada más en un mapa de ámbito de módulo a cambio de
     * nada.
     */
    if (primera.venceEn !== null && !primera.terminada) {
      elCanal().despertarAlVencer(codigo, primera.venceEn - Date.now());
    }
    await elCanal().esperarCambio(codigo);

    const segunda = await mirar(codigo, llave);
    if (segunda.rev !== desde) {
      responderConLaMesa(res, segunda, desde);
      return;
    }
    res.status(204).end();
  } catch (error) {
    if (!contestarElFallo(error, res)) throw error;
  }
});

/**
 * Lo que sale por la lectura: la mesa y los avisos que se hayan perdido.
 *
 * Los avisos van con la mesa y no en una ruta aparte, por lo mismo que en las
 * veladas: pedirlos en un segundo viaje abre la ventana en la que el móvil se
 * lleva la revisión nueva sin los avisos de esa revisión, y como pedirá los
 * siguientes «desde» ahí, esos avisos no le llegarían nunca.
 */
function responderConLaMesa(res: Response, mesa: VistaDeMesa, desde: number): void {
  res.json({
    mesa,
    avisos: Number.isFinite(desde) ? elCanal().avisosDesde(mesa.codigo, desde, mesa.yo) : [],
  });
}

// ---------------------------------------------------------------------------
// A QUIÉN LE TOCA, QUE ES LO ÚNICO QUE LA FASE 4 BIS AÑADE A ESTA PUERTA
// ---------------------------------------------------------------------------

/**
 * A QUIÉN LE TOCA Y DESDE CUÁNDO.
 *
 * ═══ POR QUÉ ESTO EXISTE, SI EL §12 DEJA LAS NOTIFICACIONES FUERA DE ALCANCE ═══
 *
 * Y sigue dejándolas: aquí no hay ni un `push`, ni un testigo de dispositivo, ni
 * una cola de envíos, y no los va a haber en esta fase. Lo que hay es LO QUE HACE
 * FALTA PARA QUE ALGÚN DÍA SE PUEDA ESCRIBIR UNO, que es otra cosa y es barato.
 *
 * Un aviso de La Larga dice exactamente dos datos: a quién y desde cuándo. Si el
 * servidor no sabe contestarlos, el aviso no se puede escribir nunca —ni por
 * nosotros, ni por nadie que monte este motor— y la fase habría entregado una
 * partida de tres días en la que la única forma de enterarse de que te toca es
 * abrir la app a ver. Que es justo lo que una partida de tres días no puede pedir.
 *
 * ═══ DE DÓNDE SALE «A QUIÉN», QUE ES LA PARTE DELICADA ═══
 *
 * No del estado: es OPACO y esta capa no lo mira, que es la decisión de la que
 * cuelga el diseño entero. Sale de la VISTA, que es lo que el juego publica a
 * propósito, y se lee con `turnoDeLaVista` — la misma técnica y el mismo motivo
 * que `tableroDeLaVista` para pintar el mueble genérico. Está contado entero en
 * `shared/mecanicas/turno-declarado.ts`.
 *
 * Y se lee de la vista del ESPECTADOR, con `mirar(codigo, null)`, no de la de
 * quien pregunta. Dos razones, y la segunda es la que importa:
 *
 *   · No hace falta llave. Quien va a mandar el aviso es el servidor, no un
 *     asiento, y de quién es el turno no es secreto de nadie: los dos juegos por
 *     turnos de esta casa lo publican igual en las cuatro vistas.
 *   · La vista del espectador es la ÚNICA que por contrato no lleva secretos
 *     dentro. Si un juego mal escrito pusiera en `turnoDe` algo que no debe
 *     salir, leyéndolo de ahí no sale de donde ya estaba.
 *
 * ═══ Y «DESDE CUÁNDO» SALE DE LA MESA, QUE ES QUIEN SABE QUÉ HORA ES ═══
 *
 * `turnoDesde` es un campo de la mesa y no del juego, por lo mismo que `venceEn`:
 * un reductor puro no sabe qué hora es y no debe saberlo. Se manda además
 * `esperandoMs` ya restado, porque el consumidor natural de esto es un guion que
 * decide «avisa si lleva más de N horas» y hacerle restar dos instantes contra un
 * reloj que no es el del servidor es pedirle que se equivoque.
 *
 * ═══ SIN CREDENCIAL, IGUAL QUE LA LECTURA DE AL LADO ═══
 *
 * Se sirve lo mismo que ya sale en el `GET` de la mesa —el asiento a quien le
 * toca es un seudónimo por mesa (§5 bis) y su nombre es el que se teclea— sin una
 * sola carta de nadie dentro. Exigir la llave aquí no protegería nada y sí
 * impediría el único uso que esto tiene: un proceso que repasa las mesas para
 * decidir a quién hay que dar un toque.
 *
 * LO QUE NO HACE, DICHO EN VOZ ALTA: no manda nada, no guarda a quién se avisó y
 * no sabe si alguien lo leyó. Eso es la fase que el §12 aplaza, y prometerlo aquí
 * a medias sería peor que no tenerlo.
 */
router.get('/arcade/mesas/:codigo/turno', async (req, res) => {
  const codigo = String(req.params.codigo ?? '').toUpperCase();
  try {
    /*
     * Pasa por `mirar`, y eso NO es de paso: `mirar` evalúa el plazo bajo el
     * candado. O sea que preguntar a quién le toca es una de las lecturas que
     * pueden hacer vencer el turno del ausente, exactamente igual que la de
     * cualquiera de los otros jugadores. Preguntarlo por un camino que no pasara
     * por ahí daría la respuesta de antes del vencimiento —«le toca a quien lleva
     * tres días sin aparecer»— y el aviso saldría hacia quien ya no le toca.
     */
    const mesa = await mirar(codigo, null);
    const turno = turnoDeLaVista(mesa.vista);
    const ahora = Date.now();

    res.json({
      codigo: mesa.codigo,
      arcade: mesa.arcade,
      rev: mesa.rev,
      terminada: mesa.terminada,
      /*
       * `declarado: false` se dice tal cual en vez de mandar `turnoDe: null`. Son
       * dos cosas distintas —«este juego no tiene turnos» y «ahora mismo no le
       * toca a nadie»— y confundirlas es lo que convertiría un juego cuya vista
       * cambió de forma en una mesa que parece parada para siempre.
       */
      declaraTurno: turno.declarado,
      turnoDe: turno.declarado ? turno.de : null,
      /* El nombre tecleado, para que el aviso pueda decirlo sin un segundo viaje. */
      nombre: turno.declarado
        ? (mesa.asientos.find((a) => a.id === turno.de)?.nombre ?? null)
        : null,
      turnoDesde: mesa.turnoDesde,
      esperandoMs: Math.max(0, ahora - mesa.turnoDesde),
      venceEn: mesa.venceEn,
      quedanMs: mesa.venceEn === null ? null : mesa.venceEn - ahora,
      /*
       * La presencia va porque es la mitad de la decisión de avisar y no se puede
       * deducir de lo demás: a quien está mirando la pantalla no hay que darle
       * ningún toque. Y es COSMÉTICA para la partida —quien no está sigue
       * jugando— que es la línea entera del punto 3 de esta fase.
       */
      presente: turno.declarado
        ? (mesa.asientos.find((a) => a.id === turno.de)?.presente ?? false)
        : false,
    });
  } catch (error) {
    if (!contestarElFallo(error, res)) throw error;
  }
});

// ---------------------------------------------------------------------------
// Mover
// ---------------------------------------------------------------------------

/**
 * ALGUIEN MUEVE.
 *
 * `rev` es OBLIGATORIA. Podría ser opcional —«si no la mandas, no la
 * compruebo»— y sería un error de los que se pagan caros: un dispositivo
 * manipulado la omitiría y conseguiría exactamente la escritura rancia que la
 * comprobación existe para impedir. Una comprobación que el comprobado puede
 * desactivar no es una comprobación.
 *
 * `carga` viaja tal cual y NO se valida aquí. No es dejadez: el estado es opaco
 * y esta ruta no sabe qué es una carta. La comprobación no desaparece, BAJA AL
 * REDUCTOR, que es el único que sabe qué es real en su juego. El trato está
 * escrito en la cabecera de `shared/arcade/movimiento.ts` y en la del árbitro,
 * porque es la clase de garantía que a alguien le entrarán ganas de subir aquí
 * «para tenerla en un solo sitio» — y subirla es reconstruir el acoplamiento que
 * todo esto existe para no tener.
 */
router.post('/arcade/mesas/:codigo/movimientos', async (req, res) => {
  const codigo = String(req.params.codigo ?? '').toUpperCase();
  const llave = llaveDe(req);
  const cuerpo = req.body as { rev?: unknown; tipo?: unknown; carga?: unknown };

  if (typeof cuerpo.rev !== 'number' || !Number.isFinite(cuerpo.rev)) {
    res.status(400).json({
      error: 'Falta `rev`: sobre qué revisión creías estar jugando. Sin ella no se puede saber ' +
        'si estabas mirando una pantalla vieja.',
    });
    return;
  }
  if (typeof cuerpo.tipo !== 'string' || cuerpo.tipo.length === 0) {
    res.status(400).json({ error: 'Falta `tipo`: qué clase de movimiento es.' });
    return;
  }

  try {
    const mesa = await mover(codigo, llave, cuerpo.rev, {
      tipo: cuerpo.tipo,
      carga: cuerpo.carga,
    });
    /*
     * ═══ SOLO SE AVISA SI LA REVISIÓN HA SUBIDO ═══
     *
     * `mover` descarta los movimientos que el juego ignora y devuelve la mesa con
     * la revisión intacta, así que si vuelve la misma que trajo la petición es
     * que no ha pasado nada. Avisar igual despertaría a los otros tres de su
     * sondeo para que volvieran a preguntar, leyeran lo mismo y se aparcaran de
     * nuevo — un viaje de ida y vuelta por cada movimiento vacío que alguien
     * quiera mandar, y quien los manda elige cuántos.
     *
     * Se compara con lo que trajo la petición y no con un dato de dentro porque
     * es lo que esta ruta sabe: un movimiento aceptado que cambia algo SIEMPRE
     * sube la revisión, y si un tic hubiera entrado por delante, este movimiento
     * habría salido por `revision-rancia` y no por aquí.
     */
    if (mesa.rev !== cuerpo.rev) elCanal().avisarCambio(codigo);
    res.json({ mesa });
  } catch (error) {
    /*
     * CON EL RECHAZO VA EL ESTADO COMPLETO, y ésa es la mitad de la
     * resincronización. Un 409 seco obligaría al móvil a hacer un segundo viaje
     * para enterarse de qué se ha perdido, y en ese hueco puede cambiar otra vez
     * — con lo que el reintento nace ya rancio. Devolviendo la mesa, el
     * dispositivo tiene lo que necesita para volver a intentarlo en el acto.
     *
     * Se mira antes si se puede componer: si el rechazo fue «no estás sentado»,
     * quien pregunta no tiene asiento y lo que se le manda es la vista de
     * espectador, que no lleva la mano de nadie.
     */
    let vista: VistaDeMesa | undefined;
    if (error instanceof MovimientoRechazado) {
      try {
        vista = await mirar(codigo, llave);
      } catch {
        vista = undefined;
      }
    }
    if (!contestarElFallo(error, res, vista)) throw error;
  }
});

// ---------------------------------------------------------------------------
// Cerrar y olvidar
// ---------------------------------------------------------------------------

/**
 * SE ACABÓ: la mesa queda cerrada y no admite más movimientos.
 *
 * Lo pide quien está sentado, porque la plataforma no sabe leer el estado y
 * decidir si el juego terminó — «fin como función del estado» es uno de los
 * conceptos que el diseño aplaza a propósito. La mesa NO desaparece: se queda
 * cerrada para que los cuatro puedan ver el resultado.
 */
router.post('/arcade/mesas/:codigo/cerrar', async (req, res) => {
  const codigo = String(req.params.codigo ?? '').toUpperCase();
  const llave = llaveDe(req);
  try {
    const mesa = await cerrar(codigo, llave);
    /*
     * `anunciar` y no `avisarCambio` a secas: es un suceso que la app celebra, y
     * además queda GUARDADO con su revisión, de modo que quien estuviera en
     * segundo plano lo recupera al volver. Es el tercero de los seis verbos y es
     * el único sitio de esta fase donde hace falta.
     */
    elCanal().anunciar(codigo, mesa.rev, {
      clave: 'arcade:mesa-cerrada',
      texto: 'Se acabó la partida.',
    });
    res.json({ mesa });
  } catch (error) {
    if (!contestarElFallo(error, res)) throw error;
  }
});

/**
 * OLVIDA UNA MESA DEL TODO.
 *
 * ═══ POR QUÉ ESTO EXISTE SI NADIE LO PULSA ═══
 *
 * Porque es el quinto verbo del canal, `olvidar`, y es el que se cae de las
 * listas. Sin él, `esperas` y `avisos` —dos `Map` de ámbito de módulo, o sea
 * memoria del proceso— crecen una entrada por mesa jugada hasta que Render mata
 * la instancia por memoria. Con mesas de un minuto y cientos a la vez eso no es
 * una hipótesis, es aritmética.
 *
 * Que hoy solo lo llame `verify:mesa` es un hecho y no una excusa: un verbo que
 * no se ejecuta nunca es un verbo que no se sabe si funciona. El barrido
 * automático de las mesas viejas vive en `mesas.ts` y se lleva la memoria de la
 * autoridad; esto se lleva además la del transporte.
 */
router.delete('/arcade/mesas/:codigo', async (req, res) => {
  const codigo = String(req.params.codigo ?? '').toUpperCase();
  const llave = llaveDe(req);
  try {
    /*
     * Se comprueba que quien lo pide está sentado ANTES de borrar nada. Sin esto,
     * cualquiera que conociera un código —y un código se dicta en voz alta en un
     * bar— podría tirar la partida de otros cuatro.
     */
    const antes = await mirar(codigo, llave);
    if (antes.yo === null) {
      res.status(403).json({
        error: 'Solo puede olvidar la mesa quien está sentado a ella.',
        motivo: 'no-estas-sentado',
      });
      return;
    }
    await olvidarMesa(codigo);
    elCanal().olvidar(codigo);
    res.json({ olvidada: codigo });
  } catch (error) {
    if (!contestarElFallo(error, res)) throw error;
  }
});

// ---------------------------------------------------------------------------
// Lo que se mide
// ---------------------------------------------------------------------------

/**
 * EL PRESUPUESTO POR MOVIMIENTO, MEDIDO **Y EXIGIDO** DESDE LA FASE 5.
 *
 * Aquí ponía «medido y no exigido», con el razonamiento de por qué el tope no se
 * podía inventar antes de tener números. Ya los hay, y ya hay contra quién hacen
 * falta: con `ARCADES_EXTERNOS`, un reductor ajeno corre en este mismo proceso y
 * un bucle suyo se lleva por delante las veladas en curso. `presupuesto.ts` cuenta
 * exactamente qué garantiza y qué no —y lo que no garantiza es interrumpir el
 * primer movimiento que se pase, porque eso no se puede hacer en un solo hilo—.
 *
 * `apartados` es lo que hay que mirar cuando un juego deja de responder: dice qué
 * arcade está en cuarentena y por qué, con el número medido dentro. Sin eso, un
 * arcade apartado se vería desde fuera como «da 503 y no sé por qué».
 *
 * Se sirve sin credencial y a propósito: son tiempos y tamaños agregados por
 * arcade, sin una sola partida dentro. Ponerlo detrás del guardián del taller
 * sería volver a atar el arcade al taller por la puerta de atrás, y por un dato
 * que no dice nada de nadie.
 */
router.get('/arcade/presupuesto', (_req, res) => {
  res.json({
    medidas: loMedido().map((m) => ({
      ...m,
      msMedia: m.movimientos > 0 ? m.msTotal / m.movimientos : 0,
    })),
    /*
     * Los topes van EN LA RESPUESTA y no sólo en el código, para que quien escriba
     * un arcade de fuera sepa contra qué se mide sin tener este repositorio
     * delante. Un límite que sólo conoce quien lo aplica no es un contrato.
     */
    topeMs: TOPE_MS,
    topeBytes: TOPE_BYTES,
    apartados: losApartados(),
  });
});

/**
 * QUÉ HAY VIVO EN MEMORIA.
 *
 * Existe por la misma razón por la que `candadosVivos()` existe en las veladas:
 * la fuga que hubo allí —el mapa de candados que crecía una entrada por partida
 * jugada— era invisible desde fuera, y sin una forma de mirar dentro la prueba
 * que la impide no se puede escribir. Aquí hay tres mapas de ámbito de módulo
 * —mesas, candados y despertadores— y los tres pueden fugarse igual.
 *
 * ═══ Y EL ALMACÉN, QUE ES LO QUE NO SE VE DE NINGUNA OTRA FORMA ═══
 *
 * Un fallo de escritura no tiene síntoma: la mesa funciona, los cuatro juegan y
 * el disco no tiene nada. Con la escritura diferida ni siquiera hay una petición
 * a la que contestarle un 503. Y el caso real no es exótico: en la VPS, con la
 * carpeta fuera de `ReadWritePaths`, ese es el estado normal desde el arranque.
 *
 * Así que sale la CARPETA que se está usando —para poder compararla con la del
 * despliegue de un vistazo— y la cuenta de fallos con el último. Sin la carpeta,
 * el número de fallos no dice dónde mirar.
 */
router.get('/arcade/diagnostico', (_req, res) => {
  res.json({
    mesas: mesasVivas(),
    candados: candadosDeMesaVivos(),
    despertadores: despertadoresVivos(),
    almacen: saludDelAlmacen(),
    avisosDeArcade: avisosAbiertos(),
  });
});

// ---------------------------------------------------------------------------
// EL MARCADOR: dos avisos y una tabla
//
// ═══ POR QUÉ ESTO NO SON MESAS, AUNQUE SE LE PAREZCA ═══
//
// Un arcade de un jugador no tiene mesa: no hay asientos, ni `rev`, ni canal, ni
// nadie con quien sincronizarse. El reductor corre en el móvil de principio a fin
// y el servidor no ve un solo fotograma. Lo único que hace el servidor es lo que
// el §6 del diseño le asigna en esa fila —«el cliente simula, el servidor
// VERIFICA»— y eso son exactamente dos momentos: repartir la semilla al empezar y
// reejecutar la partida al terminar.
//
// Meter esto en `mesas.ts` habría obligado a abrir una mesa, sentarse en ella y
// llevarle un `rev` a un juego que no tiene nada de eso: el peaje clásico, «el
// que no venía, fingía». Son tres rutas y ninguna toca el almacén de mesas.
//
// ═══ Y POR QUÉ TAMPOCO VAN DETRÁS DE NINGUNA CREDENCIAL ═══
//
// Por lo mismo que el resto de la Sala: no hay cuenta que pedir. La defensa de
// estas rutas es que la de fin EXIGE una de inicio, que la de inicio está acotada
// por conexión, y que un aviso se gasta una sola vez. Ver `marcadores.ts`.
// ---------------------------------------------------------------------------

/**
 * ANUNCIAR EL INICIO: se cuentan TODAS, como en la apertura de mesa.
 *
 * Y por la misma razón: esto no falla casi nunca —no hay nada que acertar— así
 * que un contador de fallos no contaría nada. Lo que hay que acotar es el
 * VOLUMEN, porque cada aviso ocupa una entrada en un mapa de memoria durante dos
 * horas, y quien pida mil avisos por segundo llena esa tabla sin jugar a nada.
 *
 * Ciento veinte por conexión son dos partidas por minuto durante diez minutos
 * seguidos: más de lo que aguanta nadie jugando de verdad.
 */
const contadorDeInicios = limitarIntentos({
  nombre: 'inicio de partida de arcade',
  credencial: (req) => {
    const cuerpo = req.body as { arcade?: unknown } | undefined;
    return typeof cuerpo?.arcade === 'string' ? cuerpo.arcade : 'sin-arcade';
  },
  porCredencial: 120,
  porIp: 120,
  esFallo: () => true,
});

/**
 * EMPIEZA UNA PARTIDA: toma la semilla, y apunto la hora.
 *
 * La semilla la elige el servidor y ésa es la mitad de la verificación. Está
 * contado entero en `InicioAnunciado.semilla`: si la eligiera el aparato, quien
 * juega probaría semillas hasta encontrar la fácil y después jugaría ésa,
 * honradamente, y la repetición cuadraría.
 */
router.post('/arcade/partidas', contadorDeInicios, (req, res) => {
  const cuerpo = req.body as { arcade?: unknown };
  const arcade = typeof cuerpo.arcade === 'string' ? cuerpo.arcade : '';
  try {
    res.json(anunciarInicio(arcade));
  } catch (error) {
    if (error instanceof ArcadeSinRecords) {
      /*
       * 404 si no está instalado y 409 si está y no admite récords, porque son dos
       * arreglos distintos: lo primero lo arregla instalar el juego —o dejar de
       * pedirlo—, y lo segundo no lo arregla nada, porque ese arcade declaró que
       * no publica ninguna cifra. Contestar lo mismo a las dos mandaría a la app a
       * reintentar donde no hay nada que reintentar.
       */
      res
        .status(error.porque === 'no-instalado' ? 404 : 409)
        .json({ error: error.message, motivo: error.porque });
      return;
    }
    throw error;
  }
});

/**
 * SE ACABÓ: aquí llega la repetición entera, y aquí se deja de creer al móvil.
 *
 * ═══ NO HAY NINGUNA RUTA QUE ACEPTE UNA CIFRA SUELTA, Y ESO ES EL DISEÑO ═══
 *
 * Se podría haber escrito `POST /arcade/records { arcade, cifra }` y añadirle
 * después una verificación opcional. Con eso, el día que la verificación diera un
 * problema, alguien la haría opcional de verdad y la ruta seguiría ahí aceptando
 * números. Aquí el cuerpo o es una repetición o no es nada: quien mande una cifra
 * suelta se lleva un 400 por `repeticion-mal-formada`, siempre, y no hay ningún
 * camino que lo salve.
 *
 * ═══ LOS CÓDIGOS: 400 PARA LO MAL ESCRITO, 409 PARA LO QUE NO CUADRA ═══
 *
 * La diferencia importa para quien escriba la app: un 400 es un fallo de quien
 * manda —una repetición mal montada, un movimiento reservado— y reintentar no
 * arregla nada. Un 409 es una partida que no se acepta —la cifra no sale, el
 * reloj no acompaña, el aviso ha caducado—, y ahí lo que toca es empezar otra.
 */
router.post('/arcade/records', (req, res) => {
  const veredicto = registrarRecord(req.body);
  if (veredicto.acepta) {
    res.json({
      aceptado: true,
      record: veredicto.record,
      /*
       * Lo medido va de vuelta para que la app pueda enseñarlo si quiere y, sobre
       * todo, para que `verify:marcador` compruebe la comparación con el reloj de
       * pared desde fuera, sin tener que mirar dentro del proceso.
       */
      declaradoMs: Math.round(veredicto.declaradoMs),
      paredMs: veredicto.paredMs,
    });
    return;
  }
  res.status(veredicto.motivo === 'repeticion-mal-formada' ? 400 : 409).json({
    aceptado: false,
    motivo: veredicto.motivo,
    detalle: veredicto.detalle,
    error: veredicto.porque,
  });
});

/**
 * LA TABLA de un arcade, de mejor a peor.
 *
 * Sin credencial: son cifras y nada más. No lleva nombres porque en el motor de
 * arcade no hay cuentas y un asiento es un nombre tecleado — el día que la tabla
 * quiera decir de quién es cada récord, eso es una decisión de producto con datos
 * personales detrás, y no un campo que se añade aquí.
 */
router.get('/arcade/records/:arcade', (req, res) => {
  const arcade = String(req.params.arcade ?? '');
  if (!arcadeInstalado(arcade)) {
    res.status(404).json({ error: `«${arcade}» no es un arcade instalado en este servidor.` });
    return;
  }
  res.json({ arcade, records: recordsDe(arcade) });
});

export default router;
