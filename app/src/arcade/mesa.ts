/**
 * HABLAR CON UNA MESA DE ARCADE, sin saber a qué se juega.
 *
 * ═══ POR QUÉ ESTE FICHERO NO ES `api.ts` ═══
 *
 * `app/src/api.ts` es el cliente de las VELADAS: sabe de testigos, de partidas,
 * de `VistaJugador` y de `joinCode`. La regla de la que cuelga todo esto es que
 * los dos motores no se conocen, y un cliente compartido sería la primera de las
 * cien banderas que acaban deshaciendo la separación — empezando por el día que
 * alguien meta un `if (esArcade)` dentro de un reintento.
 *
 * Lo único que se le pide prestado es LA DIRECCIÓN DEL SERVIDOR, que no es
 * vocabulario de nadie: la app entera habla con UN servidor y guardar la dirección
 * dos veces sería tener dos respuestas a «¿dónde estamos jugando?» que se
 * desincronizan en cuanto alguien la cambia en los ajustes.
 *
 * Y se piden las DOS mitades de ese mismo dato: `servidorActual()`, que la da, y
 * `cargarSesionGuardada()`, que es la promesa de que ya está leída del disco. No
 * son dos préstamos: `servidorActual()` sin esperar a la lectura devuelve el valor
 * compilado por defecto, o sea media respuesta, y eso ya costó una recuperación de
 * asiento que se iba al servidor equivocado. Ver el efecto de volver a la mesa.
 *
 * ═══ QUÉ SABE Y QUÉ NO SABE ═══
 *
 * NO sabe qué es una choza, ni un turno, ni un bien. Lo que viaja es `vista:
 * unknown` —el motor no interpreta el estado, y por eso `vistaDeAsiento` devuelve
 * `unknown`— y quien lo pinta decide qué hacer con ello. Este fichero sirve a
 * cualquier arcade con `sede: 'servidor'`.
 *
 * ═══ EL SONDEO LARGO, Y POR QUÉ NO HAY WEBSOCKET ═══
 *
 * Es el mismo transporte que el resto del repositorio, y la razón que hay que
 * conservar con las dos manos es la tercera de las de `hub.ts`: la corrección no
 * depende del reparto de avisos, porque SI SE PIERDE UN AVISO LA SIGUIENTE
 * PETICIÓN TRAE EL ESTADO COMPLETO. Aquí eso se nota en que no hay ninguna lógica
 * de reconciliación: cada respuesta es la verdad entera.
 *
 * Y hay un detalle que sí es del arcade y no de las veladas: el servidor contesta
 * `204` cuando pasaron los veinticinco segundos y no cambió nada. No es un error
 * ni un tiempo agotado: es la respuesta normal, y hay que volver a preguntar sin
 * contar un fallo. Tratarla como fallo haría que una mesa quieta pareciera una
 * mesa caída al minuto de abrirla.
 *
 * ═══ EL SITIO SE GUARDA, Y ESO NO ES UNA COMODIDAD ═══
 *
 * El código de la mesa y la llave del asiento van al `bolsillo`, y al abrirse la
 * pantalla se intenta volver. Sin eso, recargar la web o que el sistema mate la app
 * —lo normal en una partida por turnos— no era «hay que volver a entrar»: era crear
 * un asiento NUEVO que en una partida ya repartida no juega, y quedarse de
 * espectador de la propia partida sin un solo mensaje. El porqué entero está en
 * `bolsillo.ts`, incluido por qué no se usa el almacén de `api.ts`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cargarSesionGuardada, servidorActual } from '../api';
import type { MovimientoDeclarado } from '../../../shared/mecanicas/tablero-declarado';
import type { ArcadeId } from '../../../shared/arcade';
import { elSitioGuardado, guardarElSitio, olvidarElSitio } from './bolsillo';
import { pausaAntesDeVolverAPreguntar } from './relojes';
import { turnoDeLaVista } from '../../../shared/mecanicas/turno-declarado';

/** Lo que el servidor cuenta de una mesa. El campo `vista` es del juego. */
export interface MesaVista {
  codigo: string;
  arcade: ArcadeId;
  rev: number;
  tic: number;
  terminada: boolean;
  venceEn: number | null;
  /** Desde cuándo se espera al que tiene el turno, en epoch ms. Ver `mesas.ts`. */
  turnoDesde: number;
  asientos: Array<{ id: string; nombre: string; presente: boolean }>;
  yo: string | null;
  vista: unknown;
  /**
   * POR QUÉ NO PASÓ NADA, dicho por el juego. Sólo llega al mover, y sólo a quien
   * movió. `null` en toda lectura. Ver `VistaDeMesa.motivo` en el servidor.
   *
   * Opcional en el tipo a propósito: una app publicada puede estar hablando con un
   * servidor más viejo que ella —o al revés— y un campo que falta no puede ser un
   * fallo. Lo que hace la pantalla cuando no viene es exactamente lo que hacía
   * antes de que existiera.
   */
  motivo?: string | null;
  /**
   * QUÉ SE PUEDE HACER AHORA MISMO, dicho por el juego y traído por el servidor.
   *
   * Es lo que hace que un mueble genérico pueda pintar los botones de un juego que
   * este binario NO conoce: la pregunta se la hace el servidor —que es el único
   * proceso donde vive el código de un arcade de fuera— y la respuesta viaja con la
   * vista. Ver `VistaDeMesa.opciones` en `server/src/arcade/mesas.ts`.
   *
   * Opcional por lo mismo que `motivo`: una app publicada puede estar hablando con
   * un servidor más viejo que ella, y un campo que falta no puede ser un fallo.
   */
  opciones?: OpcionDeMesa[];
}

/**
 * UNA COSA QUE SE PUEDE HACER, tal como llega por la red.
 *
 * Se declara aquí y no se importa de `shared/arcade/opciones.ts` a propósito: esto
 * es lo que la app RECIBE, y lo que recibe puede venir de un servidor con otra
 * versión. Importar el tipo del contrato haría creer al compilador que lo que llega
 * está garantizado, y lo único garantizado es lo que se comprueba al pintarlo.
 */
export interface OpcionDeMesa {
  id: string;
  tipo: string;
  carga: unknown;
  rotulo: string;
  ayuda: string;
}

/** En qué punto está esta pantalla. */
export type FaseDeLaMesa =
  /** Todavía no hay mesa: hay que abrir una o entrar con un código. */
  | 'fuera'
  /** Hablando con el servidor. */
  | 'yendo'
  /** Sentado y sondeando. */
  | 'dentro';

/** Lo que la pantalla necesita para pintar y para actuar. */
export interface LaMesa {
  fase: FaseDeLaMesa;
  mesa: MesaVista | null;
  /** Qué ha pasado, en una línea que se puede enseñar. Vacío si nada. */
  aviso: string;
  /** Hay algo en vuelo: no se toca nada más hasta que vuelva. */
  quieto: boolean;
  /**
   * Abre una mesa. `plazoSegundos` es de quien abre y no del juego.
   *
   * «Veinticuatro horas por turno» es una decisión de producto de quien monta la
   * partida, no una regla de Riberas — está escrito así en la cabecera de
   * `mesas.ts` y es el eje entero de la fase 4 bis. Sin este parámetro, la app
   * sólo sabría abrir mesas del plazo por defecto, o sea que una partida de días
   * existiría en el servidor y no habría forma de empezarla desde el móvil.
   */
  abrir: (nombre: string, plazoSegundos?: number) => void;
  entrar: (codigo: string, nombre: string) => void;
  mover: (movimiento: MovimientoDeclarado) => void;
  salir: () => void;
}

/** La cabecera con la que un asiento demuestra que es él. Ver `routes/arcade.ts`. */
const CABECERA_DE_ASIENTO = 'x-asiento';

/**
 * Cuánto se espera antes de volver a sondear cuando algo falla.
 *
 * No es un reintento con espera creciente y no hace falta que lo sea: el sondeo
 * largo ya duerme veinticinco segundos por su cuenta cuando no pasa nada, así que
 * la única razón de esta espera es no machacar un servidor caído a mil peticiones
 * por segundo mientras la pantalla está abierta.
 */
const ESPERA_TRAS_FALLO_MS = 2000;

/*
 * LA PAUSA DEL SONDEO SE FUE A `relojes.ts`, con su porqué entero.
 *
 * Estaba aquí, exportada y sin que la mirara ningún comprobador. Se ha movido a un
 * fichero SIN NINGÚN `import` —igual que `conexion-reglas.ts`— para que
 * `verificar-relojes.mjs` pueda llamarla de verdad con números en vez de leer su
 * texto. Los tres defectos que esa red caza ahora estaban los tres aquí dentro.
 */

/** Se conecta a una mesa de un arcade y la mantiene al día. */
export function usarMesaDeArcade(arcade: ArcadeId): LaMesa {
  const [fase, ponerFase] = useState<FaseDeLaMesa>('fuera');
  const [mesa, ponerMesa] = useState<MesaVista | null>(null);
  const [aviso, ponerAviso] = useState('');
  const [quieto, ponerQuieto] = useState(false);

  /*
   * El código y la llave viven en referencias y no en estado, y no es un atajo: el
   * bucle de sondeo se monta UNA vez y tiene que leer los valores de AHORA. Con
   * estado, el bucle capturaría los de su primer repintado y seguiría preguntando
   * por la mesa de la que ya salimos — el fallo clásico de un efecto con un bucle
   * dentro.
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

  /*
   * ═══ VOLVER A LA MESA QUE YA ERA NUESTRA ═══
   *
   * Al abrirse la pantalla se mira el bolsillo y, si hay un sitio guardado, se LEE
   * la mesa con esa llave. Se lee y no se «entra»: entrar con el código crea un
   * asiento NUEVO, y en una partida ya empezada ese asiento no juega —el juego no
   * le ofrece nada— y encima ocupa aforo. Leer con la llave devuelve la mesa desde
   * el sitio que ya era nuestro.
   *
   * `desde=-1` porque nunca es la revisión de la mesa, así que la lectura contesta
   * en el acto en vez de aparcarse veinticinco segundos en el sondeo largo.
   *
   * Y `mesa.yo !== null` es la comprobación que importa: dice que el servidor
   * reconoció la llave. Una llave caducada, una mesa borrada o un servidor
   * cambiado en los ajustes dan `null`, y entonces se olvida el sitio y se enseña
   * la pantalla de entrar, que es la verdad. Guardar una llave muerta y fingir que
   * estamos dentro sería el fallo mudo de siempre.
   */
  useEffect(() => {
    void (async () => {
      const sitio = await elSitioGuardado(arcade);
      if (!vivo.current || sitio === null) return;
      /* Si mientras se leía el bolsillo alguien ya abrió mesa, manda lo de ahora. */
      if (codigo.current !== null) return;

      /*
       * ═══ SE ESPERA A SABER CONTRA QUÉ SERVIDOR SE PREGUNTA ═══
       *
       * `servidorActual()` devuelve el COMPILADO POR DEFECTO hasta que la app ha
       * leído del disco la dirección elegida, y esa lectura es asíncrona. Un efecto
       * que corre al montar llega antes, así que sin esta línea la recuperación
       * salía hacia la dirección equivocada.
       *
       * No es teórico y costó descubrirlo mirando la red: en la web el defecto es
       * `location.origin`, o sea el propio servidor de desarrollo, que contesta 200
       * con la página de la app. Un 200 con HTML dentro no es un fallo de red: es
       * una respuesta que parece buena, y el asiento se daba por perdido contra un
       * servidor al que nunca se le preguntó.
       *
       * Es el mismo dato que ya se le pide prestado a `api.ts` —dónde estamos
       * jugando— y no vocabulario de nadie: pedir la dirección sin esperar a que
       * esté leída es tener media respuesta.
       */
      await cargarSesionGuardada();
      if (!vivo.current || codigo.current !== null) return;

      ponerFase('yendo');
      try {
        const r = await fetch(`${servidorActual()}/api/arcade/mesas/${sitio.codigo}?desde=-1`, {
          headers: { 'x-asiento': sitio.llave },
        });
        const datos = r.ok ? ((await r.json()) as { mesa?: MesaVista }) : { mesa: undefined };
        /* Si mientras se preguntaba alguien abrió o entró en una mesa, manda eso. */
        if (!vivo.current || codigo.current !== null) return;

        if (datos.mesa !== undefined && datos.mesa.yo !== null) {
          codigo.current = datos.mesa.codigo;
          llave.current = sitio.llave;
          ponerMesa(datos.mesa);
          ponerFase('dentro');
          return;
        }

        /*
         * ═══ CUÁNDO SE OLVIDA EL SITIO, Y CUÁNDO NO ═══
         *
         * Sólo cuando el servidor DICE que ese sitio ya no existe: un 404 —la mesa se
         * cerró y se olvidó— o una respuesta buena en la que la llave no reconoce a
         * nadie (`yo === null`), que es un asiento caducado.
         *
         * Todo lo demás —el servidor apagado, el móvil sin cobertura, un 500, una
         * respuesta que no es la que se esperaba— NO borra nada. Un olvido es
         * irreversible y devuelve a la persona a la pantalla de entrar sin su
         * asiento, así que el listón tiene que ser «me han dicho que no está», nunca
         * «no he podido preguntar». La primera versión de esto borraba ante cualquier
         * fallo y perdía el asiento por una respuesta del servidor equivocado.
         */
        const loNiegaElServidor = r.status === 404 || (r.ok && datos.mesa !== undefined);
        if (loNiegaElServidor) {
          await olvidarElSitio(arcade);
          if (!vivo.current) return;
          ponerAviso('Ese asiento ya no vale. Abre una mesa o entra con un código.');
        } else {
          if (!vivo.current) return;
          ponerAviso(
            `No se ha podido volver a la mesa ${sitio.codigo}: el servidor contestó ` +
              `${String(r.status)}. El asiento sigue guardado.`,
          );
        }
        ponerFase('fuera');
      } catch (error) {
        /* Ni una excepción de red borra un asiento: ver el bloque de arriba. */
        if (!vivo.current) return;
        ponerAviso(
          `No se ha podido volver a la mesa ${sitio.codigo}: ${textoDelFallo(error)}. ` +
            'El asiento sigue guardado.',
        );
        ponerFase('fuera');
      }
    })();
    /*
     * Sólo al montar y sólo por arcade: es una recuperación, no un sondeo. Volver a
     * dispararla al cambiar cualquier otra cosa pisaría la mesa que ya tenemos.
     */
  }, [arcade]);

  const cabeceras = useCallback((conJson: boolean): Record<string, string> => {
    const h: Record<string, string> = {};
    if (conJson) h['content-type'] = 'application/json';
    if (llave.current !== null) h[CABECERA_DE_ASIENTO] = llave.current;
    return h;
  }, []);

  /** El sondeo largo. Se rearma solo mientras la pantalla siga abierta. */
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
          const r = await fetch(
            `${servidorActual()}/api/arcade/mesas/${donde}?desde=${String(desde)}`,
            { headers: cabeceras(false), signal: corte.signal },
          );
          if (parado) return;
          /*
           * 204 ES LA RESPUESTA NORMAL de una mesa quieta: pasaron los
           * veinticinco segundos del sondeo y nadie movió. Se vuelve a preguntar
           * y no se cuenta como fallo.
           */
          if (r.status === 204) {
            /*
             * El servidor acaba de decir que no ha pasado nada en veinticinco
             * segundos. Si el plazo está lejos —una mesa de días— se espera un poco
             * antes de volver a aparcarse. Ver `pausaAntesDeVolverAPreguntar`, que
             * cuenta qué se paga y qué se ahorra.
             */
            const turno = turnoDeLaVista(mesa?.vista);
            const pausa = pausaAntesDeVolverAPreguntar(
              mesa?.venceEn ?? null,
              mesa?.terminada ?? false,
              /*
               * MIENTRAS NO LE TOQUE A NADIE NO SE PAUSA: la mesa se está
               * reuniendo y es el único rato en que dos personas se esperan
               * mirando la pantalla. El porqué entero, y lo que costaba, está en
               * `pausaAntesDeVolverAPreguntar`.
               */
              turno.declarado && turno.de !== null,
              Date.now(),
            );
            if (pausa > 0) await esperar(pausa);
            if (parado) return;
            continue;
          }
          if (!r.ok) throw new Error(`el servidor contestó ${String(r.status)}`);
          const datos = (await r.json()) as { mesa: MesaVista };
          if (parado) return;
          ponerMesa(datos.mesa);
          ponerAviso('');
        } catch (error) {
          if (parado) return;
          ponerAviso(`Se ha perdido la mesa: ${textoDelFallo(error)}. Reintentando.`);
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
     * `mesa?.rev` está en las dependencias A PROPÓSITO: cada respuesta rearma el
     * sondeo pidiendo «desde la revisión que acabo de recibir», que es lo que
     * convierte el bucle en una cadena sin huecos. Sin ella, el segundo sondeo
     * volvería a preguntar desde la revisión vieja y el servidor contestaría al
     * instante con lo mismo, en bucle cerrado.
     *
     * Y `venceEn` y `terminada` están por lo mismo desde la fase 4 bis: la pausa
     * entre vueltas se calcula con ellos, así que un bucle que capturara los de su
     * primer repintado seguiría pausando como si el plazo estuviera donde estaba
     * hace tres turnos. Hoy los tres cambian a la vez —un vencimiento sube la
     * revisión— así que esto no añade ni un reinicio del sondeo; está para que siga
     * siendo cierto el día que dejen de cambiar juntos.
     */
  }, [fase, mesa?.rev, mesa?.venceEn, mesa?.terminada, cabeceras]);

  const abrir = useCallback(
    (nombre: string, plazoSegundos?: number) => {
      void (async () => {
        ponerQuieto(true);
        ponerFase('yendo');
        try {
          const r = await fetch(`${servidorActual()}/api/arcade/mesas`, {
            method: 'POST',
            headers: cabeceras(true),
            /*
             * El plazo sólo viaja si quien abre eligió uno: omitirlo deja que mande
             * el defecto del servidor, que es lo correcto —el número lo decide quien
             * hospeda— y evita que la app tenga una segunda copia de «dos minutos»
             * que se desincronice con la de `mesas.ts` el día que cambie.
             */
            body: JSON.stringify({
              arcade,
              nombre,
              ...(plazoSegundos === undefined ? {} : { plazoSegundos }),
            }),
          });
          const datos = (await r.json()) as {
            error?: string;
            codigo?: string;
            asiento?: string;
            llave?: string;
            mesa?: MesaVista;
          };
          if (!r.ok || datos.mesa === undefined) throw new Error(datos.error ?? 'no se pudo abrir');
          codigo.current = datos.mesa.codigo;
          llave.current = datos.llave ?? null;
          /* Al bolsillo, para que recargar o que el sistema mate la app no cueste el asiento. */
          if (datos.llave !== undefined) {
            await guardarElSitio(arcade, { codigo: datos.mesa.codigo, llave: datos.llave });
          }
          ponerMesa(datos.mesa);
          ponerFase('dentro');
          ponerAviso('');
        } catch (error) {
          ponerFase('fuera');
          ponerAviso(`No se ha podido abrir la mesa: ${textoDelFallo(error)}`);
        } finally {
          ponerQuieto(false);
        }
      })();
    },
    [arcade, cabeceras],
  );

  const entrar = useCallback(
    (elCodigo: string, nombre: string) => {
      void (async () => {
        ponerQuieto(true);
        ponerFase('yendo');
        try {
          const limpio = elCodigo.trim().toUpperCase();
          const r = await fetch(`${servidorActual()}/api/arcade/mesas/${limpio}/asientos`, {
            method: 'POST',
            headers: cabeceras(true),
            body: JSON.stringify({ nombre }),
          });
          const datos = (await r.json()) as { error?: string; llave?: string; mesa?: MesaVista };
          if (!r.ok || datos.mesa === undefined) throw new Error(datos.error ?? 'no se pudo entrar');
          codigo.current = datos.mesa.codigo;
          llave.current = datos.llave ?? null;
          if (datos.llave !== undefined) {
            await guardarElSitio(arcade, { codigo: datos.mesa.codigo, llave: datos.llave });
          }
          ponerMesa(datos.mesa);
          ponerFase('dentro');
          ponerAviso('');
        } catch (error) {
          ponerFase('fuera');
          ponerAviso(`No se ha podido entrar: ${textoDelFallo(error)}`);
        } finally {
          ponerQuieto(false);
        }
      })();
    },
    [arcade, cabeceras],
  );

  const mover = useCallback(
    (movimiento: MovimientoDeclarado) => {
      void (async () => {
        const donde = codigo.current;
        const rev = mesa?.rev;
        if (donde === null || rev === undefined) return;
        ponerQuieto(true);
        try {
          const r = await fetch(`${servidorActual()}/api/arcade/mesas/${donde}/movimientos`, {
            method: 'POST',
            headers: cabeceras(true),
            body: JSON.stringify({ rev, tipo: movimiento.tipo, carga: movimiento.carga }),
          });
          const datos = (await r.json()) as { error?: string; mesa?: MesaVista };
          /*
           * CON EL RECHAZO VIENE EL ESTADO COMPLETO, y por eso se pinta pase lo
           * que pase. Un 409 por revisión rancia —dos personas tocando a la vez, o
           * alguien que vuelve de segundo plano— se arregla solo: se acepta la
           * mesa que trae la respuesta y el siguiente toque va sobre la buena. Sin
           * esto haría falta un segundo viaje, y en ese hueco la mesa puede
           * cambiar otra vez.
           */
          if (datos.mesa !== undefined) ponerMesa(datos.mesa);

          /*
           * ═══ UN MOVIMIENTO QUE EL JUEGO IGNORA TIENE QUE DECIRSE ═══
           *
           * Antes aquí se ponía el aviso a cadena vacía siempre que la respuesta
           * fuera correcta, y eso convertía en BOTONES MUDOS todos los sitios donde
           * un juego ejerce el derecho que le da el «sólo si» del §5 bis: ofrecer
           * de más cuando no puede saber, con lo que tú sabes, si es legal. El
           * reductor rechaza devolviendo el MISMO objeto de estado, la revisión no
           * sube, `routes/arcade.ts` contesta 200 con la mesa igual, y la pantalla
           * se quedaba exactamente como estaba sin una línea que dijera por qué.
           *
           * El caso más visible no hacía falta buscarlo: con una sola persona
           * sentada, «Repartir el delta» es el PRIMER botón que se ve al abrir una
           * mesa —se ofrece a propósito, porque el aforo no está en la vista— y se
           * pulsaba sin que pasara nada ni se dijera nada.
           *
           * La señal es exacta y no hay que adivinarla: un movimiento aceptado que
           * cambia algo SIEMPRE sube la revisión —lo dice la propia ruta, que es
           * quien decide con esa misma comparación si avisar a los demás—, así que
           * misma revisión con respuesta correcta significa «el juego no lo tomó».
           *
           * ═══ Y DESDE LA FASE 5 EL TEXTO SÍ PUEDE DECIR POR QUÉ ═══
           *
           * Aquí ponía que no podía, y era verdad: el §5.2 obliga a que rechazar sea
           * devolver el mismo estado y nunca una excepción con un motivo, así que lo
           * único honrado que se podía escribir era «la mesa está igual que estaba».
           *
           * El motivo viaja ahora POR FUERA del estado —`rechazar()` en el núcleo,
           * `VistaDeMesa.motivo` en el servidor— y llega en la respuesta de ESTE
           * movimiento y de ningún otro. La frase de antes se queda como respaldo
           * para los juegos que rechazan sin decir nada, que siguen siendo
           * perfectamente válidos: un juego cuyo botón nunca se pinta cuando no se
           * puede pulsar no tiene nada que explicar.
           *
           * ═══ Y EL MOTIVO MANDA SOBRE LA COMPARACIÓN DE REVISIONES ═══
           *
           * El orden de estas dos condiciones estaba al revés —primero `seIgnoro`,
           * y sólo dentro se miraba el motivo— y eso ataba el canal nuevo a una
           * deducción que puede fallar. Falló: mientras el servidor contaba como
           * «cambio» un rechazo que devolvía otro objeto de estado, la revisión
           * subía, `seIgnoro` daba falso y el aviso se ponía a cadena VACÍA. Quien
           * movía no veía ni el motivo ni la frase de respaldo, que es peor que
           * antes de que existiera el canal.
           *
           * Aquello se ha arreglado donde tocaba —en el servidor, que ahora
           * descarta el rechazo entero— y aquí se quita la dependencia: si el juego
           * DIJO algo, se enseña, punto. Un motivo sólo puede venir de un rechazo y
           * sólo viaja en la respuesta de este movimiento, así que no hay ningún
           * caso en que enseñarlo sea mentira. La comparación de revisiones se
           * queda para lo único que sabe hacer: el respaldo de los juegos que
           * rechazan SIN decir por qué, que siguen siendo perfectamente válidos.
           */
          const loQueDijoElJuego = r.ok ? (datos.mesa?.motivo ?? '') : '';
          const seIgnoro = r.ok && datos.mesa !== undefined && datos.mesa.rev === rev;
          ponerAviso(
            r.ok
              ? loQueDijoElJuego.length > 0
                ? loQueDijoElJuego
                : seIgnoro
                  ? 'Ese movimiento no se ha podido hacer ahora mismo: la mesa está igual que estaba.'
                  : ''
              : (datos.error ?? 'ese movimiento no se ha podido hacer'),
          );
        } catch (error) {
          ponerAviso(`No ha salido el movimiento: ${textoDelFallo(error)}`);
        } finally {
          ponerQuieto(false);
        }
      })();
    },
    [mesa?.rev, cabeceras],
  );

  /*
   * Salir OLVIDA el sitio, y eso es lo que lo distingue de cerrar la app: al cerrar
   * se vuelve al mismo asiento, y al salir a propósito no. Sin el olvido, la
   * pantalla se reabriría sola en la mesa de la que uno acaba de irse.
   */
  const salir = useCallback(() => {
    codigo.current = null;
    llave.current = null;
    ponerMesa(null);
    ponerAviso('');
    ponerFase('fuera');
    void olvidarElSitio(arcade);
  }, [arcade]);

  return { fase, mesa, aviso, quieto, abrir, entrar, mover, salir };
}

/** Lo que se le puede enseñar a alguien de un fallo, sin pila ni jerga. */
function textoDelFallo(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Esperar sin bloquear. Aquí sí vale un temporizador: esto no es el reductor. */
function esperar(ms: number): Promise<void> {
  return new Promise((suelta) => setTimeout(suelta, ms));
}
