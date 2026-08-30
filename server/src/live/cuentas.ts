/**
 * Cuentas de jugador, historial y trofeos.
 *
 * El factor de acceso para JUGAR sigue siendo el código de invitación que
 * reparte el Game Master: montar un servidor de correo para que doce personas
 * entren en un juego de sobremesa es desproporcionado, y una contraseña más es
 * justo lo que nadie quiere teclear con la cena servida.
 *
 * Pero la CUENTA es otra cosa, y ya no la abre quien organiza. El correo que él
 * teclea es una dirección de invitación, no una identidad: nadie lo ha
 * verificado y lo escribe un tercero. La cuenta nace cuando la persona, desde
 * su móvil, acepta que sus partidas se guarden — y deja de alimentarse en
 * cuanto lo retira. Quien no lo acepte juega exactamente igual; simplemente no
 * queda rastro suyo fuera de la propia partida.
 */
import { nanoid } from 'nanoid';
import { getStore } from '../db/store';
import { mutar, ultimaSenal } from './sesion';
import { normalizarEmail } from '../../../shared/live';
import type {
  Account,
  LiveSession,
  PartidaJugada,
  TrofeoId,
  VinculoDeCuenta,
} from '../../../shared/live';
import type { GameSession } from '../../../shared/types';
import { esElSenalado, manifiestoDe, personasDe } from '../../../shared/juegos';
import { trofeosDelJuego } from '../juegos/trofeos';
import { ganadoresDe } from '../juegos/veredictos';

/** Busca la cuenta del correo, o la crea si es la primera vez. */
export async function cuentaDe(email: string, displayName: string): Promise<Account> {
  const store = getStore();
  const normalizado = normalizarEmail(email);
  const existente = await store.getAccountByEmail(normalizado);
  if (existente) return existente;

  const nueva: Account = {
    id: nanoid(12),
    email: normalizado,
    displayName,
    createdAt: new Date().toISOString(),
    partidas: [],
    trofeos: [],
  };
  return store.saveAccount(nueva);
}

/**
 * ¿Esta cuenta ha demostrado que ese correo es suyo?
 *
 * Dos formas de demostrarlo: tener un proveedor vinculado —se entró con Google
 * o con Apple— o llevar el correo en `correos[]` con nivel `buzon`. Cualquiera
 * de las dos convierte la cuenta en algo que una invitación no puede tocar.
 */
function estaDemostrada(cuenta: Account, correo: string): boolean {
  if ((cuenta.identidades ?? []).length > 0) return true;
  return (cuenta.correos ?? []).some((c) => c.correo === correo && c.nivel === 'buzon');
}

/**
 * Cierra la partida en las cuentas: apunta lo jugado y reparte trofeos.
 *
 * Se llama al revelar el desenlace. Es idempotente: si se llama dos veces, la
 * partida no se duplica en el historial.
 */
export async function cerrarPartidaEnCuentas(
  game: GameSession,
  sesion: LiveSession,
): Promise<void> {
  const plot = game.plot;
  if (!plot) return;
  const store = getStore();

  for (const jugador of sesion.players) {
    /*
     * SOLO quien ha dicho que sí.
     *
     * Antes la condición era «tiene correo», y el correo lo escribe quien
     * organiza: bastaba con eso para fabricarle a alguien una cuenta con su
     * historial y sus trofeos sin que hubiera pedido nada —ni abierto la app,
     * en muchos casos—. Ahora hace falta un `vinculo`, que solo se crea cuando
     * la persona lo acepta desde su móvil.
     *
     * Quien no lo acepte juega exactamente igual. Al terminar, sencillamente no
     * queda rastro suyo fuera de la propia partida, que es lo que había pedido.
     */
    if (!jugador.vinculo) continue;

    const cuenta = await store.getAccount(jugador.vinculo.accountId);
    if (!cuenta) continue;
    if (cuenta.partidas.some((p) => p.gameId === game.id)) continue;

    const personaje = plot.characters.find((c) => c.suspectId === jugador.suspectId);
    const suya = sesion.acusaciones.find((a) => a.suspectId === jugador.suspectId);
    /*
     * QUIEN ERA EL SENALADO, preguntado al manifiesto y no a CLUEDO.
     *
     * Antes: `culpableDe(plot.solution) === jugador.suspectId`, y `culpableDe`
     * lee la clave `culpable` de la solucion. En un juego cuyo eje se llame
     * `saqueador` esa clave no existe, asi que `eraCulpable` era SIEMPRE falso
     * y el trofeo de quien se sale con la suya no se concedia nunca — sin dar
     * ningun error.
     *
     * `esElSenalado` ya existia y ya la usaba la proyeccion; aqui no se habia
     * girado. Para CLUEDO devuelve exactamente lo mismo.
     */
    const manifiesto = manifiestoDe(sesion.juego ?? game.settings?.juego);
    const eraCulpable = esElSenalado(manifiesto, plot.solution.respuestas, jugador.suspectId);
    /*
     * ¿GANÓ? SE LE PREGUNTA AL JUEGO.
     *
     * `sesion.winnerId` significa «el primero que acertó la acusación», que es
     * exactamente ganar en CLUEDO y no lo es en ningún juego de bandos. En El
     * Misterio de la Momia solo se escribe si alguien SEÑALA al saqueador, así
     * que una noche en la que la expedición sellaba bien la tumba pero nadie
     * llegó a señalarlo quedaba anotada en el historial de las diez cuentas como
     * que no ganó nadie. Y eso no se arregla después: la velada ya pasó.
     *
     * Los dos juegos ya calculaban sus ganadores --`resolverSellado` y el consejo
     * del alba devuelven `ganadores: string[]`, y sus propios tipos dicen «es lo
     * que winnerId no sabe decir»-- y lo que faltaba era que alguien preguntara.
     *
     * Un juego sin veredicto dado de alta se comporta como siempre. CLUEDO no
     * registra ninguno, así que su historial sale idéntico.
     */
    const ganadores = ganadoresDe(game, sesion);
    const gano = ganadores ? ganadores.includes(jugador.suspectId) : sesion.winnerId === jugador.suspectId;

    const partida: PartidaJugada = {
      gameId: game.id,
      titulo: plot.title,
      personaje: personaje?.characterName ?? jugador.displayName,
      jugadaEl: new Date().toISOString(),
      acerto: suya?.correcta ?? false,
      gano,
      eraCulpable,
    };
    cuenta.partidas.push(partida);

    // ---- Trofeos ----
    /*
     * ═══ SOLO LOS TRES QUE SON DE LA PLATAFORMA ═══
     *
     * Aquí se concedían SEIS con sus ids escritos a mano, y tres de los seis son
     * reglas de CLUEDO que se repartían a cualquier partida. El caso que lo
     * retrata es «Crimen perfecto» —«fuiste el culpable y nadie te descubrió»—,
     * que se concedía con `eraCulpable && !sesion.winnerId`: en El Misterio de la
     * Momia `winnerId` solo se escribe si alguien SEÑALA al saqueador, así que
     * una noche en la que la expedición sella la tumba —o sea, en la que el
     * saqueador PIERDE— le daba la medalla de haberse salido con la suya si
     * además nadie llegó a señalarlo. Premiar al que perdió, con la frase de otro
     * juego.
     *
     * Los tres que quedan sí significan lo mismo en cualquier juego: haber jugado
     * la primera partida, haber llenado el cuaderno y seguir con el móvil
     * encendido al cerrar. `ganador`, `sabueso` y `culpable-impune` se han mudado
     * a `juegos/cluedo-trofeos.ts` y llegan por el gancho de abajo, igual que los
     * de la Momia y los de las Sombras.
     */
    const ganados = new Set<TrofeoId>(cuenta.trofeos);
    if (cuenta.partidas.length === 1) ganados.add('primera-partida');
    if (jugador.notas.length > 1000) ganados.add('escribano');
    // Superviviente: emparejó y seguía vivo al cerrar.
    // Por `ultimaSenal` y no por el documento: la señal del rato vive en
    // memoria, y leer solo el documento le quitaría el trofeo a quien estaba
    // delante del móvil pero no había pasado nada que escribir en cinco minutos.
    if (jugador.joined) {
      const cuando = ultimaSenal(jugador, sesion.id);
      if (cuando > 0 && Date.now() - cuando < 5 * 60_000) ganados.add('superviviente');
    }
    /*
     * Y los que reparta el juego por su cuenta, que ahora son TODOS los que
     * dependen de sus reglas: CLUEDO tambien registra los suyos desde que se
     * mudaron los tres de arriba. La Momia y las Sombras reparten condiciones
     * que no son variantes de las de nadie —«La Sombra» se gana PERDIENDO la
     * partida como saqueador— sino cosas de su propio estado.
     */
    for (const t of trofeosDelJuego(manifiesto.id, {
      game,
      sesion,
      plot,
      jugador,
      eraSenalado: eraCulpable,
      gano,
      acerto: suya?.correcta ?? false,
    })) {
      ganados.add(t);
    }
    cuenta.trofeos = [...ganados];

    await store.saveAccount(cuenta);
    // Se conserva por compatibilidad con las sesiones de antes; la verdad está
    // en `vinculo`.
    jugador.accountId = cuenta.id;
  }
}

/**
 * Perfil que ve el jugador en la app: su historial y sus trofeos.
 *
 * Se busca por el VÍNCULO, no por el correo. Buscar por correo devolvía el
 * perfil de una cuenta que la persona no había reclamado —y que a lo mejor era
 * de otro, si quien organiza se equivocó al teclear o reutilizó la dirección de
 * un conocido—. Sin vínculo no hay perfil que enseñar, y eso es correcto: no
 * hay nada guardado todavía.
 */
export async function perfilDe(vinculo: VinculoDeCuenta | undefined): Promise<Account | null> {
  if (!vinculo) return null;
  return getStore().getAccount(vinculo.accountId);
}

/**
 * Acepta guardar las partidas de esta persona en un perfil.
 *
 * Es el consentimiento, y por eso lo pide el jugador desde SU móvil y no lo
 * concede quien organiza. Si ya existe una cuenta con ese correo se reutiliza
 * —es la gracia de tener historial entre veladas—; si no, se crea aquí.
 *
 * Devuelve el vínculo para que quien llame lo escriba en la sesión, dentro del
 * candado.
 */
export async function aceptarGuardar(
  email: string,
  displayName: string,
  via: VinculoDeCuenta['via'] = 'confirmacion',
): Promise<VinculoDeCuenta> {
  const normalizado = normalizarEmail(email);

  /*
   * UNA INVITACIÓN NO PUEDE ADOPTAR UNA CUENTA DEMOSTRADA.
   *
   * `cuentaDe` devuelve la cuenta que ya exista con ese correo, y el correo de
   * una silla lo teclea QUIEN MONTA LA PARTIDA: es una invitación, y la
   * cabecera de `shared/identidad.ts` lo dice con todas las letras —«puede ser
   * una errata, o el correo de un conocido... solo lo segundo puede abrir una
   * puerta»—. Esta era una puerta abierta: bastaba con escribir en una silla la
   * dirección de alguien con cuenta para que quien se sentara en ella quedara
   * vinculado a SU cuenta, con su historial y sus trofeos, y `GET /jugar/perfil`
   * se la sirviera entera.
   *
   * Si la cuenta tiene un proveedor vinculado o ese correo demostrado a nivel
   * `buzon`, el consentimiento no basta: hay que entrar con ella. Una cuenta
   * nacida de otra invitación al mismo correo sí se reutiliza, que es el flujo
   * legítimo de siempre — ahí nadie ha demostrado nada todavía, ni antes ni
   * ahora.
   */
  const yaExiste = await getStore().getAccountByEmail(normalizado);
  if (yaExiste && via === 'confirmacion' && estaDemostrada(yaExiste, normalizado)) {
    throw new Error(
      'Esa dirección ya tiene una cuenta con su propio inicio de sesión. Entra con ella para guardar la partida.',
    );
  }

  const cuenta = await cuentaDe(email, displayName);

  /*
   * Se apunta el correo en la cuenta, con el nivel de prueba que tiene.
   *
   * `invitacion` y no `buzon`: lo tecleó quien organiza y nadie ha demostrado
   * el buzón. Lo que SÍ demuestra quien acepta es que tenía el código personal
   * de esa velada en la mano, y eso basta para que se le avise de otras
   * invitaciones al mismo correo — pero no para entrar en ellas sin código.
   */
  const correos = cuenta.correos ?? [];
  if (!correos.some((c) => c.correo === normalizado)) {
    correos.push({
      correo: normalizado,
      nivel: via === 'confirmacion' ? 'invitacion' : 'buzon',
      origen: via,
      anadidoEl: new Date().toISOString(),
    });
    cuenta.correos = correos;
    await getStore().saveAccount(cuenta);
  }

  return { accountId: cuenta.id, aceptadoEl: new Date().toISOString(), via };
}

/**
 * Borra la cuenta de un correo Y desengancha ese correo de todas las partidas.
 *
 * LAS DOS COSAS, y este es el motivo de que no sea una línea. Borrar solo la
 * fila de la cuenta no borra nada en la práctica:
 *
 *   1. El correo sigue escrito en `sesion.players[].email`, y con él el
 *      `vinculo` que apunta a la cuenta recién borrada: la partida seguiría
 *      alimentando un perfil fantasma. (Desde que el consentimiento es
 *      explícito ya no basta con el correo para RECREARLA, pero el vínculo que
 *      quedó vivo sí la resucitaría.)
 *   2. Y aunque se limpiara la sesión, `sincronizarJugadores` copia el correo
 *      DESDE la partida cada vez que se sincroniza (`{ ...previo, email:
 *      s.email }`). Hay que quitarlo también de `game.suspects`, o el primer
 *      «sincronizar» del Game Master lo devuelve a su sitio.
 *
 * Se barren TODAS las partidas, no solo aquella desde la que se pidió el
 * borrado: quien dice «borra mis datos» no está hablando de una velada.
 *
 * Lo que NO se toca: el historial de los demás y la partida en sí. Que alguien
 * jugara y ganara es un hecho de la mesa, no un dato personal suyo en exclusiva;
 * lo que desaparece es el correo que lo identifica y todo lo colgado de él.
 *
 * Devuelve cuántas partidas quedaron limpias, para poder contarlo.
 */
export async function borrarCuenta(cuenta: Account): Promise<{
  cuentaBorrada: boolean;
  partidasLimpiadas: number;
}> {
  const store = getStore();

  /*
   * POR ID, Y NO POR CORREO. La versión anterior recibía un correo y borraba
   * `getAccountByEmail(correo)`, que devuelve la PRIMERA cuenta que lo lleve.
   * Ninguna colección tiene índice único, así que dos cuentas pueden compartir
   * dirección —una nacida del consentimiento y otra verificada con Google, por
   * ejemplo— y quien pedía borrar la suya podía llevarse la ajena por delante,
   * con un `borrada: true` de respuesta. Quien llama ya sabe exactamente qué
   * cuenta es: se la pasa entera y aquí no se vuelve a adivinar.
   */
  await store.deleteAccount(cuenta.id);

  /*
   * Y SE BARREN TODOS SUS CORREOS, no solo el principal. Una cuenta puede tener
   * varias direcciones demostradas en `correos[]`; barriendo solo `email`,
   * todo lo que esa persona hubiera escrito bajo la segunda sobrevivía al
   * borrado. El derecho de supresión no se ejerce a medias.
   */
  const suyos = new Set(
    [cuenta.email, ...(cuenta.correos ?? []).map((c) => c.correo)]
      .filter(Boolean)
      .map((c) => normalizarEmail(c)),
  );
  const esSuyo = (correo: string | undefined): boolean =>
    Boolean(correo) && suyos.has(normalizarEmail(correo!));

  let partidasLimpiadas = 0;
  for (const resumen of await store.listGames()) {
    const game = await store.getGame(resumen.id);
    if (!game) continue;

    let tocada = false;
    for (const sospechoso of personasDe(game)) {
      if (esSuyo(sospechoso.email)) {
        delete sospechoso.email;
        tocada = true;
      }
    }
    if (tocada) await store.saveGame(game);

    /*
     * Por `mutar`, no a pelo: doce móviles pueden estar escribiendo notas y
     * eligiendo sala en este mismo instante, y una lectura-modificación-
     * escritura por libre se lleva por delante lo que se guardara entretanto.
     * Que la revisión suba está bien: para quien pierde la cuenta, su pantalla
     * de perfil ha cambiado de verdad.
     *
     * PERO SOLO SI ESA PARTIDA TIENE ALGO SUYO. Antes se entraba en `mutar` para
     * TODAS las sesiones vivas de la plataforma, y `mutar` sube la revisión y
     * despierta a los móviles aunque el cambio no toque nada: una persona
     * borrando su cuenta sacudía las veladas de doce desconocidos que estaban
     * jugando en ese momento, cada uno con su refresco y su viaje al servidor.
     * Se mira antes, y a las que no le deben nada no se las molesta.
     */
    const enVivo = await store.getLive(game.id);
    const leDebeAlgo =
      enVivo?.players.some(
        (j) => esSuyo(j.email) || j.accountId === cuenta.id || esSuyo(j.reclamadaPor?.correo),
      ) ?? false;
    if (leDebeAlgo) {
      const { resultado } = await mutar(game.id, (sesion) => {
        let sesionTocada = false;
        for (const jugador of sesion.players) {
          // Por correo O por cuenta: si la silla estaba vinculada a esta cuenta,
          // se limpia aunque el correo escrito en ella fuera otro.
          if (esSuyo(jugador.email) || jugador.accountId === cuenta.id || esSuyo(jugador.reclamadaPor?.correo)) {
            delete jugador.email;
            delete jugador.accountId;
            // Y el consentimiento: si no, la partida seguiría alimentando una
            // cuenta que ya no existe, y el desenlace la volvería a crear.
            delete jugador.vinculo;
            /*
             * Y LA MARCA DE QUIÉN RECLAMÓ LA SILLA, que se quedaba puesta.
             * `reclamadaPor.correo` guarda la dirección en claro y el puesto de
             * mando la pinta, así que tras borrar la cuenta el correo seguía a
             * la vista de quien dirige — justo lo que la política publicada
             * promete que desaparece.
             */
            delete jugador.reclamadaPor;
            sesionTocada = true;
          }
        }
        return sesionTocada;
      });
      if (resultado) tocada = true;
    }

    if (tocada) partidasLimpiadas++;
  }

  return { cuentaBorrada: true, partidasLimpiadas };
}
