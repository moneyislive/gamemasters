/**
 * SENTARSE A UNA MESA DESDE UN PC, SONDEARLA Y MOVER.
 *
 * ═══ QUÉ ES ESTO Y QUÉ NO ES ═══
 *
 * Es la mitad de este cliente que habla con la autoridad. La otra mitad —los dos
 * muebles— solo pinta lo que esta le da. Aquí no hay ni una regla de ningún
 * juego: el reductor corre en el servidor (`sede: 'servidor'`), este lado manda
 * `{tipo, carga}` y recibe una vista ya proyectada para su asiento. Es el «`shared/`
 * son las reglas, `server/` es la autoridad» del §0 cobrado: un cliente nuevo no
 * reimplementa ni un juego.
 *
 * ═══ LO QUE ESTÁ COPIADO DE `app/src/arcade/mesa.ts`, Y ES EL RAZONAMIENTO ═══
 *
 * Aquel fichero es React Native y no se importa. Lo que se trae son las tres
 * decisiones que allí costaron caro, cada una comentada donde se aplica:
 *
 *   1. UN ASIENTO SOLO SE OLVIDA SI EL SERVIDOR LO NIEGA. Un fallo de red no
 *      borra nada. Borrar por no haber podido preguntar es perder una partida en
 *      curso por un túnel.
 *   2. EL RECHAZO SILENCIOSO SE DETECTA PORQUE LA REVISIÓN NO SUBIÓ. Con la regla
 *      del «sólo si» del §5 bis, el reductor devuelve EL MISMO objeto de estado
 *      cuando rechaza, y eso llega aquí como un `200` con la mesa igual que
 *      estaba. Sin mirar `rev` esto se pinta como «movimiento hecho».
 *   3. LA PAUSA DEL SONDEO CABE EN LA VENTANA DE PRESENCIA. Ver `relojes.ts`.
 *
 * ═══ Y DOS QUE SON NUEVAS DE AQUÍ ═══
 *
 * En un PC hay direcciones. El código de la mesa va EN LA URL, así que se puede
 * pegar en un chat y quien lo reciba cae en la pantalla de entrar con el código
 * puesto; y recargar no es un accidente que cuesta la partida.
 *
 * Y el aviso de pantalla SABE QUIÉN LO ESCRIBIÓ, porque aquí lo escriben la red
 * y tus propias jugadas, y quien puede borrarlo no es el mismo en los dos casos.
 * Está contado en `DeDondeSaleElAviso`, y es la factura de la regla 2: si el
 * rechazo silencioso es el camino normal, el renglón que lo dice no puede
 * desaparecer porque haya movido otro.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Opcion } from '../../shared/arcade';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';
import { turnoDeLaVista } from '../../shared/mecanicas/turno-declarado';
import { elSitioGuardado, guardarElSitio, olvidarElSitio } from './bolsillo';
import { pausaAntesDeVolverAPreguntar } from './relojes';

/**
 * Lo que contesta `GET /api/arcade/mesas/:codigo`, y nada más.
 *
 * Se escribe aquí en vez de importar `VistaDeMesa` del servidor a propósito:
 * `server/src/arcade/mesas.ts` es código de Node y este paquete se empaqueta
 * para un navegador. Lo que cruza el cable es JSON, y el tipo de lo que cruza el
 * cable se declara en los dos extremos.
 */
export interface MesaVista {
  codigo: string;
  arcade: string;
  rev: number;
  tic: number;
  terminada: boolean;
  venceEn: number | null;
  turnoDesde: number;
  asientos: Array<{ id: string; nombre: string; presente: boolean }>;
  yo: string | null;
  vista: unknown;
  /**
   * QUÉ SE PUEDE HACER AHORA MISMO, dicho por el juego y traído por el servidor.
   *
   * OPCIONAL, y la marca de interrogación es la corrección entera. El campo lo
   * estrenó la fase 5; una versión de este cliente puede estar hablando con un
   * servidor anterior, y un campo que falta no puede ser un fallo — la app lo
   * declara igual y por el mismo motivo. Declararlo obligatorio no lo hacía
   * llegar: solo convencía al compilador de que llegaba, y lo que llegaba era
   * `undefined` recorriendo tres ficheros hasta reventar en un `.length`.
   */
  opciones?: readonly Opcion[];
  /** Por qué el juego no hizo nada. Solo llega en la respuesta de mover. */
  motivo?: string | null;
}

export interface AvisoDeMesa {
  clave: string;
  texto: string;
}

/*
 * «DE DÓNDE SALE EL RENGLÓN QUE HAY EN PANTALLA» SE MUDÓ A `shared/mecanicas`.
 *
 * Nació aquí, se quedó aquí, y la app arrastró el fallo entero: su sondeo hacía
 * `ponerAviso('')` en cada respuesta buena, o sea que borraba el motivo del
 * rechazo justo cuando el tablero cambia por la jugada de otro —que es el
 * instante en el que más se parece a que la tuya entró—. Una regla que los dos
 * clientes necesitan y que sólo uno tenía no es una regla: es una casualidad.
 * Se reexporta con los mismos nombres; el razonamiento entero está allí.
 */
export type { AvisoPuesto, DeDondeSaleElAviso } from '../../shared/mecanicas/aviso-puesto';
export {
  loQueQuedaTrasElSondeo,
  SIN_AVISO,
} from '../../shared/mecanicas/aviso-puesto';
import {
  loQueQuedaTrasElSondeo,
  SIN_AVISO,
} from '../../shared/mecanicas/aviso-puesto';
import type { AvisoPuesto } from '../../shared/mecanicas/aviso-puesto';

export type FaseDeLaMesa =
  /** No estamos en ninguna mesa: se abre una o se entra con un código. */
  | 'fuera'
  /** Pidiendo. Ni fuera ni dentro: es el estado que impide el parpadeo. */
  | 'yendo'
  /** Sentados, con llave y sondeando. */
  | 'dentro';

export interface LaMesa {
  fase: FaseDeLaMesa;
  mesa: MesaVista | null;
  /**
   * Lo último que ha pasado, dicho para quien juega. Vacío casi siempre.
   *
   * Un renglón y no una lista, a propósito: dos avisos a la vez obligan a leer
   * cuál es el de ahora. Lo que sí distingue este fichero por dentro es de dónde
   * salió cada uno, porque de eso depende quién puede borrarlo — ver
   * `DeDondeSaleElAviso`, que es donde está el fallo que costó contar.
   */
  aviso: string;
  /** Los avisos del canal, de lo más nuevo a lo más viejo. */
  cronica: AvisoDeMesa[];
  /** Hay una petición que escribe en curso: los botones se quedan quietos. */
  quieto: boolean;
  abrir: (nombre: string, plazoSegundos?: number) => void;
  entrar: (codigo: string, nombre: string) => void;
  mover: (movimiento: MovimientoDeclarado) => void;
  salir: () => void;
  /**
   * Tirar la mesa entera, para todos. Ver su implementación.
   *
   * Es lo único que saca a cuatro personas de una mesa congelada por un asiento
   * que nadie libera, y por eso está aquí al lado de `salir` y no escondido:
   * quien pinta la pantalla tiene que poder ofrecer las dos cosas y explicar en
   * qué se diferencian.
   */
  tirar: () => void;
}

const CABECERA_DE_ASIENTO = 'x-asiento';
const ESPERA_TRAS_FALLO_MS = 2000;
/** Lo que se recuerda de la crónica. Una mesa de días produce muchos avisos. */
const TOPE_DE_CRONICA = 40;

/**
 * A qué servidor se habla: al MISMO que sirvió esta página.
 *
 * No hay ninguna variable de entorno ni ningún selector de servidor, y es una
 * diferencia real con la app: un teléfono se conecta al portátil de quien
 * organiza por su IP de la casa, un PC abre una dirección. Como esto lo sirve el
 * mismo Node que la API —igual que `/jugar`—, las rutas relativas bastan, y en
 * desarrollo el proxy de Vite las reenvía. Un solo camino, probado siempre.
 */
function ruta(cola: string): string {
  return `/api/arcade${cola}`;
}

/*
 * ═══ DE QUÉ MESAS SE HA LEVANTADO UNO A PROPÓSITO EN ESTA PESTAÑA ═══
 *
 * Vive en el módulo y no en el componente: tiene que sobrevivir a que la pantalla
 * se desmonte —levantarse es justamente eso— y NO tiene que sobrevivir a recargar
 * la página. Con eso basta para lo único que el olvido conseguía de útil: que la
 * Sala no te devuelva sola a la mesa de la que acabas de irte.
 *
 * Antes esto se conseguía OLVIDANDO la llave, y el olvido costaba el asiento:
 * entrar con el código pide silla NUEVA, y desde que el servidor no sienta a
 * nadie con la partida en marcha eso es un 409 —o sea que «Levantarse» pasó a
 * ser una puerta de un solo sentido—. La app resolvió esto mismo; este cliente se
 * quedó con el fallo, que es la asimetría al revés.
 */
const salidasDeEstaPestana = new Set<string>();

export function usarMesaDeArcade(arcade: string, silla: string): LaMesa {
  const [fase, ponerFase] = useState<FaseDeLaMesa>('fuera');
  const [mesa, ponerMesa] = useState<MesaVista | null>(null);
  const [aviso, ponerAviso] = useState<AvisoPuesto>(SIN_AVISO);
  const [cronica, ponerCronica] = useState<AvisoDeMesa[]>([]);
  const [quieto, ponerQuieto] = useState(false);

  /*
   * El código y la llave viven en refs y no en estado. No es una optimización:
   * el bucle de sondeo es un `async` largo que sobrevive a varios renders, y si
   * leyera el estado leería el de la vuelta en que se creó. Con refs lee lo de
   * AHORA, que es lo único correcto cuando lo que se pregunta es «¿sigo en la
   * misma mesa?».
   */
  const codigo = useRef<string | null>(null);
  const llave = useRef<string | null>(null);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const cabeceras = useCallback((conJson: boolean): Record<string, string> => {
    const h: Record<string, string> = {};
    if (conJson) h['content-type'] = 'application/json';
    if (llave.current !== null) h[CABECERA_DE_ASIENTO] = llave.current;
    return h;
  }, []);

  /**
   * Apuntar lo que ha pasado, sin repetir el último renglón.
   *
   * El sondeo pide «avisos desde la revisión que tengo», y los bordes de ese
   * intervalo no son de este lado: dos vueltas seguidas pueden traer el mismo
   * aviso. Aquí ponía que «en la app eso no se veía porque allí los avisos son un
   * rótulo que pasa», y era peor: la app los TIRABA —casteaba la respuesta a
   * `{ mesa }` y los descartaba en silencio—. Ya no: tiene su crónica, con este
   * mismo descarte de repetidos, porque un renglón repetido se lee como que ha
   * pasado dos veces.
   */
  const anotar = useCallback((nuevos: AvisoDeMesa[]): void => {
    if (nuevos.length === 0) return;
    ponerCronica((antes) => {
      const juntos = [...nuevos].reverse().concat(antes);
      const limpios: AvisoDeMesa[] = [];
      for (const a of juntos) {
        const ultimo = limpios[limpios.length - 1];
        if (ultimo !== undefined && ultimo.clave === a.clave && ultimo.texto === a.texto) continue;
        limpios.push(a);
      }
      return limpios.slice(0, TOPE_DE_CRONICA);
    });
  }, []);

  // -------------------------------------------------------------------------
  // Volver a la mesa que había, si la había
  // -------------------------------------------------------------------------

  useEffect(() => {
    const sitio = elSitioGuardado(arcade, silla);
    /* De la mesa de la que uno acaba de levantarse no se vuelve solo. */
    if (sitio !== null && salidasDeEstaPestana.has(`${arcade}:${silla}:${sitio.codigo}`)) return;
    if (sitio === null) return;
    if (codigo.current !== null) return;

    ponerFase('yendo');
    void (async () => {
      try {
        /*
         * `desde=-1` para que conteste con la mesa en el acto en vez de aparcar
         * la petición: aquí no se está esperando un cambio, se está preguntando
         * si el asiento sigue valiendo.
         */
        const r = await fetch(ruta(`/mesas/${sitio.codigo}?desde=-1`), {
          headers: { [CABECERA_DE_ASIENTO]: sitio.llave },
        });
        const datos = r.ok ? ((await r.json()) as { mesa?: MesaVista }) : { mesa: undefined };
        if (!vivo.current || codigo.current !== null) return;

        if (datos.mesa !== undefined && datos.mesa.yo !== null) {
          codigo.current = datos.mesa.codigo;
          llave.current = sitio.llave;
          ponerMesa(datos.mesa);
          ponerFase('dentro');
          return;
        }

        /*
         * ═══ AQUÍ ESTÁ LA REGLA 1, Y ES LA LÍNEA MÁS IMPORTANTE DEL FICHERO ═══
         *
         * Solo se olvida el asiento si el servidor lo NIEGA: un 404 —la mesa ya
         * no existe— o un 200 que trae la mesa y dice `yo: null`, o sea «esa
         * llave no está sentada aquí». Cualquier otra cosa —un 500, un 502 del
         * balanceador, el servidor reiniciándose, el túnel caído— NO borra nada:
         * el asiento se queda en el bolsillo y se vuelve a intentar al recargar.
         *
         * Al revés cuesta partidas: borrar por no haber podido preguntar es
         * exactamente perder una mesa de tres días por diez segundos de red.
         */
        const loNiegaElServidor = r.status === 404 || (r.ok && datos.mesa !== undefined);
        if (loNiegaElServidor) {
          olvidarElSitio(arcade, silla);
          ponerAviso({
            texto: 'Ese asiento ya no vale. Abre una mesa o entra con un código.',
            de: 'la-red',
          });
        } else {
          ponerAviso({
            texto:
              `No se ha podido volver a la mesa ${sitio.codigo}: el servidor contestó ` +
              `${String(r.status)}. El asiento sigue guardado.`,
            de: 'la-red',
          });
        }
        ponerFase('fuera');
      } catch (error) {
        if (!vivo.current) return;
        ponerAviso({
          texto:
            `No se ha podido volver a la mesa ${sitio.codigo}: ${textoDelFallo(error)}. ` +
            'El asiento sigue guardado.',
          de: 'la-red',
        });
        ponerFase('fuera');
      }
    })();
  }, [arcade, silla]);

  // -------------------------------------------------------------------------
  // El sondeo
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (fase !== 'dentro') return;
    let parado = false;
    const corte = new AbortController();

    const sondear = async (): Promise<void> => {
      while (!parado && vivo.current) {
        const donde = codigo.current;
        if (donde === null) return;
        try {
          const desde = mesa?.rev ?? -1;
          const r = await fetch(ruta(`/mesas/${donde}?desde=${String(desde)}`), {
            headers: cabeceras(false),
            signal: corte.signal,
          });
          if (parado) return;

          if (r.status === 204) {
            /*
             * `204` es «he tenido tu petición aparcada veinticinco segundos y no
             * ha pasado nada». Solo entonces se pausa, y la pausa cabe en la
             * ventana de presencia del servidor: ver `relojes.ts` para por qué
             * ese tope no es un número redondo elegido a ojo.
             */
            const turno = turnoDeLaVista(mesa?.vista);
            const pausa = pausaAntesDeVolverAPreguntar(
              mesa?.venceEn ?? null,
              mesa?.terminada ?? false,
              turno.declarado && turno.de !== null,
              Date.now(),
            );
            if (pausa > 0) await esperar(pausa);
            if (parado) return;
            continue;
          }
          /*
           * ═══ UN 404 NO ES UN FALLO DE RED: ES QUE LA MESA YA NO ESTÁ ═══
           *
           * Y confundirlos encerraba a la gente. Cuando alguien tira la mesa —o
           * cuando caduca— el servidor la olvida y avisa por el canal, así que las
           * peticiones aparcadas de los demás se sueltan EN EL ACTO y reciben 404.
           * Cayéndose al `catch` genérico, eso se pintaba como «reintentando» y el
           * bucle volvía a preguntar cada dos segundos PARA SIEMPRE, con el tablero
           * viejo delante y sin ninguna forma de salir.
           *
           * Y desde que la lectura lleva contador de códigos, además se
           * autobloqueaba: cada 404 cuenta, así que sobre la petición treinta el
           * «reintentando» se convertía en un 429 que tampoco dice nada.
           *
           * La regla del fichero —«un asiento solo se olvida si el servidor lo
           * NIEGA»— no se rompe: se cumple. Un 404 es exactamente el servidor
           * negando esa mesa, que es distinto de no haber podido preguntar.
           */
          if (r.status === 404) {
            parado = true;
            salir();
            ponerAviso({ texto: 'Esa mesa ya no existe: la han tirado o ha caducado.', de: 'la-red' });
            return;
          }
          if (!r.ok) throw new Error(`el servidor contestó ${String(r.status)}`);
          const datos = (await r.json()) as { mesa: MesaVista; avisos?: AvisoDeMesa[] };
          if (parado) return;
          ponerMesa(datos.mesa);
          anotar(datos.avisos ?? []);
          /*
           * SE BORRA LO QUE PUSO LA RED, Y SOLO ESO. Que esta respuesta haya
           * llegado es información nueva sobre la conexión y sobre nada más: no
           * dice nada de si tu último movimiento entró. Borrar aquí el renglón
           * del rechazo era quitar de la pantalla la única señal que hay de que
           * no entró, justo cuando además cambia el tablero por la jugada de
           * otro — o sea en el instante en que más se parece a que sí.
           */
          ponerAviso(loQueQuedaTrasElSondeo);
        } catch (error) {
          if (parado) return;
          /*
           * Un fallo de sondeo NO saca a nadie de la mesa: se dice y se reintenta.
           * La corrección no depende de que los avisos lleguen —si se pierde uno,
           * la siguiente petición trae el estado completo— así que reintentar es
           * literalmente recuperarse.
           */
          ponerAviso({
            texto: `Se ha perdido la mesa: ${textoDelFallo(error)}. Reintentando.`,
            de: 'la-red',
          });
          await esperar(ESPERA_TRAS_FALLO_MS);
        }
      }
    };

    void sondear();
    return () => {
      parado = true;
      corte.abort();
    };
    /*
     * Depende de `mesa.rev` a propósito: cada vuelta del sondeo pide «desde la
     * revisión que tengo», así que el efecto se rehace con cada revisión nueva.
     * Es un bucle de una vuelta por revisión y no un bucle vivo, y por eso puede
     * leer `mesa` del render sin quedarse con uno viejo.
     */
  }, [fase, mesa?.rev, mesa?.venceEn, mesa?.terminada, mesa?.vista, cabeceras, anotar]);

  // -------------------------------------------------------------------------
  // Sentarse
  // -------------------------------------------------------------------------

  const sentarse = useCallback(
    (donde: string, cuerpo: unknown, queSalioMal: string) => {
      void (async () => {
        ponerQuieto(true);
        ponerFase('yendo');
        try {
          const r = await fetch(ruta(donde), {
            method: 'POST',
            headers: cabeceras(true),
            body: JSON.stringify(cuerpo),
          });
          const datos = (await r.json()) as { error?: string; llave?: string; mesa?: MesaVista };
          if (!r.ok || datos.mesa === undefined) throw new Error(datos.error ?? queSalioMal);
          codigo.current = datos.mesa.codigo;
          llave.current = datos.llave ?? null;
          if (datos.llave !== undefined) {
            guardarElSitio(arcade, silla, { codigo: datos.mesa.codigo, llave: datos.llave });
          }
          ponerMesa(datos.mesa);
          ponerCronica([]);
          ponerFase('dentro');
          /* Mesa nueva: lo que se dijera de la anterior ya no habla de nada. */
          ponerAviso(SIN_AVISO);
        } catch (error) {
          ponerFase('fuera');
          ponerAviso({ texto: `${queSalioMal}: ${textoDelFallo(error)}`, de: 'la-red' });
        } finally {
          ponerQuieto(false);
        }
      })();
    },
    [arcade, silla, cabeceras],
  );

  const abrir = useCallback(
    (nombre: string, plazoSegundos?: number) => {
      sentarse(
        '/mesas',
        { arcade, nombre, ...(plazoSegundos === undefined ? {} : { plazoSegundos }) },
        'No se ha podido abrir la mesa',
      );
    },
    [arcade, sentarse],
  );

  const entrar = useCallback(
    (elCodigo: string, nombre: string) => {
      const limpio = elCodigo.trim().toUpperCase();
      /*
       * ═══ SE MANDA A QUE JUEGO CREEMOS ESTAR ENTRANDO, Y ESA ES LA MITAD ═══
       *
       * El servidor tiene desde hoy una guarda que compara este `arcade` con el de
       * la mesa y contesta 409 si no coinciden. Sin esta línea esa guarda es CODIGO
       * MUERTO: está envuelta en `if (typeof cuerpo.arcade === 'string')`, así que
       * no mandarlo la salta entera.
       *
       * Y el caso que cierra es de todos los días: el código son cinco letras y no
       * dice de qué juego es; el producto las reparte por un chat. Quien esté en la
       * pantalla de Riberas y teclee el código de una mesa de La Ronda se sentaba
       * —el servidor sólo leía el nombre— y a partir de ahí el cliente pintaba la
       * mesa bajo el juego equivocado y guardaba la llave en el cajón de otro
       * arcade.
       */
      /*
       * ═══ SI ESE CÓDIGO YA ES EL NUESTRO, SE VUELVE; NO SE ENTRA ═══
       *
       * Entrar crea un asiento NUEVO, y el bolsillo puede tener ya una llave de
       * ESTA misma mesa: es el caso de quien pulsa «Levantarse» y quiere volver, y
       * también el de quien teclea el código de la mesa en la que ya está sentado.
       * Se lee con la llave, igual que hace la recuperación al montar.
       *
       * Si el servidor NIEGA esa llave —mesa cerrada, asiento caducado— no se
       * corta: se sigue por la puerta de siempre y se pide asiento. Lo que no puede
       * volver a pasar es que con la llave buena en el bolsillo se pidiera silla
       * nueva y el servidor contestara 409 con la partida en marcha, dejando fuera
       * de su propia mesa a quien ya jugaba.
       */
      const guardado = elSitioGuardado(arcade, silla);
      if (guardado !== null && guardado.codigo === limpio) {
        void (async () => {
          ponerQuieto(true);
          ponerFase('yendo');
          try {
            const r = await fetch(ruta(`/mesas/${limpio}?desde=-1`), {
              headers: { [CABECERA_DE_ASIENTO]: guardado.llave },
            });
            if (r.ok) {
              const loSuyo = (await r.json()) as { mesa?: MesaVista };
              if (loSuyo.mesa !== undefined && loSuyo.mesa.yo !== null) {
                salidasDeEstaPestana.delete(`${arcade}:${silla}:${limpio}`);
                codigo.current = loSuyo.mesa.codigo;
                llave.current = guardado.llave;
                ponerMesa(loSuyo.mesa);
                ponerFase('dentro');
                ponerAviso(SIN_AVISO);
                return;
              }
            }
            sentarse(`/mesas/${limpio}/asientos`, { nombre, arcade }, 'No se ha podido entrar');
          } catch {
            sentarse(`/mesas/${limpio}/asientos`, { nombre, arcade }, 'No se ha podido entrar');
          } finally {
            ponerQuieto(false);
          }
        })();
        return;
      }
      sentarse(`/mesas/${limpio}/asientos`, { nombre, arcade }, 'No se ha podido entrar');
    },
    [arcade, silla, sentarse],
  );

  // -------------------------------------------------------------------------
  // Mover
  // -------------------------------------------------------------------------

  const mover = useCallback(
    (movimiento: MovimientoDeclarado) => {
      void (async () => {
        const donde = codigo.current;
        const rev = mesa?.rev;
        if (donde === null || rev === undefined) return;
        ponerQuieto(true);
        try {
          const r = await fetch(ruta(`/mesas/${donde}/movimientos`), {
            method: 'POST',
            headers: cabeceras(true),
            /*
             * `rev` viaja SIEMPRE: es sobre qué revisión creías estar jugando. Sin
             * ella el servidor no puede distinguir un movimiento pensado de uno
             * hecho mirando una pantalla de hace tres turnos.
             */
            body: JSON.stringify({ rev, tipo: movimiento.tipo, carga: movimiento.carga }),
          });
          const datos = (await r.json()) as { error?: string; mesa?: MesaVista };
          if (datos.mesa !== undefined) ponerMesa(datos.mesa);

          /*
           * ═══ LA REGLA 2: EL RECHAZO SILENCIOSO ═══
           *
           * Con el «sólo si» del §5 bis, que un movimiento se rechace es el camino
           * NORMAL y no una rareza: `opciones()` no puede ofrecer nada que la vista
           * de este observador no permitiera, pero el reductor sigue validando con
           * todo lo que hay —el contraejemplo del diseño es aceptar un trueque cuyo
           * oferente ya no tiene la mercancía, que no está en la vista de quien
           * acepta—. Y un rechazo devuelve EL MISMO estado, así que llega aquí como
           * un `200` con la mesa igual.
           *
           * O sea que «no ha pasado nada» NO se lee del código HTTP: se lee de que
           * `rev` no subió. Sin esta comparación, un movimiento rechazado se pinta
           * como un movimiento hecho, y quien juega se queda esperando su turno.
           *
           * Y si el juego dijo POR QUÉ —`rechazar()` en el motor pone su texto en
           * `motivo`— manda su frase, que sabe de qué habla, sobre la nuestra, que
           * solo sabe que la mesa está igual.
           */
          const loQueDijoElJuego = r.ok ? (datos.mesa?.motivo ?? '') : '';
          const seIgnoro = r.ok && datos.mesa !== undefined && datos.mesa.rev === rev;
          ponerAviso({
            texto: r.ok
              ? loQueDijoElJuego.length > 0
                ? loQueDijoElJuego
                : seIgnoro
                  ? 'Ese movimiento no se ha podido hacer ahora mismo: la mesa está igual que estaba.'
                  : ''
              : (datos.error ?? 'ese movimiento no se ha podido hacer'),
            /*
             * `tu-jugada`, y con esa palabra este renglón deja de ser borrable
             * por el sondeo. Lo sustituye tu siguiente movimiento —incluido el
             * que sale bien, que lo deja vacío— y nada más.
             */
            de: 'tu-jugada',
          });
        } catch (error) {
          ponerAviso({ texto: `No ha salido el movimiento: ${textoDelFallo(error)}`, de: 'tu-jugada' });
        } finally {
          ponerQuieto(false);
        }
      })();
    },
    [mesa?.rev, cabeceras],
  );

  /**
   * Levantarse: CIERRA LA PANTALLA Y SE QUEDA EL ASIENTO.
   *
   * Lo único que se apunta es que de esta mesa no se vuelve solo mientras dure la
   * pestaña —ver el registro de arriba—, que era todo lo que el olvido conseguía
   * de útil. Olvidar la llave costaba el asiento entero, y desde la guarda de
   * «partida empezada» costaba la partida.
   */
  const salir = useCallback(() => {
    if (codigo.current !== null) {
      salidasDeEstaPestana.add(`${arcade}:${silla}:${codigo.current}`);
    }
    codigo.current = null;
    llave.current = null;
    ponerMesa(null);
    ponerCronica([]);
    ponerAviso(SIN_AVISO);
    ponerFase('fuera');
  }, [arcade, silla]);

  /**
   * TIRAR LA MESA, que es lo que faltaba y deja a la gente sin salida.
   *
   * ═══ POR QUÉ NO BASTA CON LEVANTARSE ═══
   *
   * `salir` borra la llave de ESTE navegador y nada más: el asiento sigue en la
   * mesa del servidor, porque un asiento no se libera nunca. Con el plazo «Sin
   * prisa» —que los dos clientes ofrecen— eso no es un detalle: cuatro personas
   * abren una mesa de La Ronda, una tiene que irse antes de repartir y pulsa
   * «Levantarse», los otros tres reparten porque el servidor sigue contando
   * cuatro, y se le dan cinco cartas a alguien que no está. A partir de ahí no
   * hay plazo que venza, nadie puede jugar por él, y la mesa se queda congelada
   * PARA SIEMPRE sin que nadie pueda hacer nada.
   *
   * `DELETE /arcade/mesas/:codigo` existe desde la fase 2, comprueba que quien lo
   * pide está sentado y no lo llamaba ningún cliente: sólo lo ejercitaba
   * `verify:mesa`. Éste es exactamente su caso de uso.
   *
   * ═══ Y NO SE PREGUNTA «¿SEGURO?» AQUÍ ═══
   *
   * La confirmación es de la pantalla, no de esto. Aquí vive lo que hace, y
   * mezclarlo obligaría a que este fichero supiera pintar un diálogo.
   *
   * Se olvida el sitio pase lo que pase: si el borrado falla —la mesa ya no
   * existe, la red se fue— quien pulsó igualmente quiere irse, y dejarle dentro
   * de una mesa que cree haber tirado es el peor de los dos resultados.
   */
  const tirar = useCallback(async (): Promise<void> => {
    const donde = codigo.current;
    const mia = llave.current;
    if (donde === null || mia === null) return;
    try {
      await fetch(ruta(`/mesas/${donde}`), {
        method: 'DELETE',
        headers: { 'x-asiento': mia },
      });
    } catch {
      /* Da igual por qué no se pudo: quien pulsó se va de todas formas. */
    }
    /*
     * Y AQUÍ SÍ SE OLVIDA, que es la diferencia con levantarse: tras tirarla no
     * queda mesa a la que volver, y guardar la llave de una mesa borrada sólo
     * sirve para que la Sala te intente devolver a ella y te diga que no existe.
     */
    olvidarElSitio(arcade, silla);
    salir();
  }, [arcade, silla, salir]);

  /*
   * Hacia fuera sigue siendo UNA CADENA. De dónde salió el renglón es cosa de
   * este fichero: la pantalla lo pinta igual venga de donde venga, y darle el
   * origen la invitaría a pintar dos avisos distintos, que es cómo se acaba
   * teniendo dos sitios donde mirar cuando algo va mal.
   */
  return { fase, mesa, aviso: aviso.texto, cronica, quieto, abrir, entrar, mover, salir, tirar };
}

function textoDelFallo(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function esperar(ms: number): Promise<void> {
  return new Promise((suelta) => setTimeout(suelta, ms));
}
