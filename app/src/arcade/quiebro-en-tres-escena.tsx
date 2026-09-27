/**
 * EL QUIEBRO EN LA APP, POR DENTRO: la mesa de la plataforma y, sentados, la noche en un documento
 * apaisado que recibe la mesa por el puente.
 *
 * ═══ QUÉ ES ESTA PANTALLA, Y QUÉ NO ═══
 *
 * El juego no está aquí. Está en `escritorio/src/quiebro/` y se pinta con el motor del navegador en
 * todas partes (`docs/quiebro/ARQUITECTURA.md` §0.2): en el teléfono, dentro de un WebView que carga el
 * documento suelto `quiebro.html`; en `/jugar`, dentro de un `iframe` al mismo documento. Lo que esta
 * pantalla hace es lo que sólo puede hacer la app, que es la ANFITRIONA de la mesa:
 *
 *   · la mesa de la plataforma —vestíbulo, latido, barra— con `LaMesaDeUnPintor`, como cualquier
 *     pintor del contrato (`pintor-propio.tsx`);
 *   · el teléfono de lado mientras dura la noche, y la pantalla encendida;
 *   · EL PUENTE: le da al documento la mesa entera en cada cambio y mueve en su nombre;
 *   · y el respaldo, que es el plano del barrio sobre el retablo de siempre.
 *
 * La superficie —WebView o `iframe`— es de `quiebro-documento(.web).tsx`: aquí no hay ni una pregunta
 * por la plataforma.
 *
 * ═══ EL PUENTE, DE ESTE LADO ═══
 *
 * El contrato es `escritorio/src/quiebro/contrato.ts`. De aquí sale, en cada cambio de la mesa y en
 * cuanto el documento dice `listo`, un `mesa {codigo, yo, llave, servidor, vista, opciones, rev}`; y
 * cuando el documento pide `mover`, se mueve con `mesa.mover` —la misma puerta que un botón de la barra—
 * y se le contesta `movido` con cómo acabó. `salir` saca de la noche sin levantar a nadie; `medida`
 * guarda el veredicto del aparato, que es lo que la compuerta de Boots on Board lee para otros juegos.
 *
 *   · LA LLAVE NUNCA VA EN LA DIRECCIÓN del documento: va dentro del mensaje, y el mensaje sólo le llega
 *     a la página que el WebView deja cargar (la del documento) o al `iframe` por su origen.
 *   · `servidor` va VACÍO: el documento lo sirve el mismo servidor que la API (`/sala` y `/api` son el
 *     mismo servicio), así que su propio origen ya es la respuesta, y ninguna dirección que la app tenga
 *     guardada puede mandar al documento a jugar contra otro sitio.
 *   · Sin asiento no hay llave, y con asiento sí: si falta una de las dos se mandan las dos vacías. El
 *     lector del documento tira un mensaje con una sola, y con razón: una llave sin asiento es de otro.
 *   · Las opciones van con SUS cinco claves y nada más: el lector del documento es estricto con las
 *     claves, y una opción que el servidor mandara con una de más dejaría la mesa entera sin leer.
 *
 * Lo que se escribe y se lee, con su forma exacta, es de `quiebro-puente.ts`: puro, sin React Native,
 * para que se pueda comprobar en Node contra el lector del contrato. Ahí está también por qué este lado
 * del puente no se importa del contrato mismo.
 *
 * ═══ SI EL DOCUMENTO NO CONTESTA, SE JUEGA IGUAL ═══
 *
 * Un `iframe` no avisa de un 404 y un WebView no avisa de un documento que revienta al arrancar. Lo que
 * sí se sabe es si dice `listo`, así que se le dan `ESPERA_DEL_DOCUMENTO_MS`; si no lo dice, se juega
 * sobre el plano del barrio con la nota de por qué, y un botón vuelve a intentarlo. Lo mismo si la
 * superficie falla (`alFallar`) o si algo revienta al pintarla (`RedDelLienzo`, que además lo apunta en
 * el parte).
 *
 * ═══ SALIR DE LA NOCHE NO ES LEVANTARSE ═══
 *
 * El documento ofrece salir, y el botón «atrás» de Android hace lo mismo: se suelta el apaisado y queda
 * la mesa de siempre —la barra con el código, «Salir» y «Tirar», el plano, lo que se puede hacer y la
 * crónica— con «Volver a la noche» debajo de la barra. El asiento sigue, y la noche sigue para los demás.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
/*
 * Del fichero del juego, que aquí sólo hace falta el identificador. Quien instala los arcades
 * del binario —por si se llega por enlace directo— es el contrato de pintor.
 */
import { QUIEBRO } from '../../../shared/arcade/juegos/quiebro';
import type { ResultadoDelMovimiento } from '../../../escritorio/src/quiebro/contrato';
import { servidorActual } from '../api';
import { usarPantallaCompleta } from '../pantalla-completa';
import { guardarElVeredicto } from './mesa';
import { BOTON, LETRA, RADIO, SALA } from './muebles';
import { ElRespaldo, LaMesaDeUnPintor, RedDelLienzo } from './pintor-propio';
import type { LoQueVeElPintor } from './pintor-propio';
import { ElDocumentoDelQuiebro } from './quiebro-documento';
import {
  direccionDelDocumento,
  ESPERA_DEL_DOCUMENTO_MS,
  leerLoQueDiceElDocumento,
  mesaParaElDocumento,
  origenDe,
  textoParaElDocumento,
  VERSION_DEL_PUENTE,
} from './quiebro-puente';

// ---------------------------------------------------------------------------
// El teléfono, mientras dura la noche
// ---------------------------------------------------------------------------

/**
 * DE LADO MIENTRAS SE JUEGA, Y EN VERTICAL AL SALIR.
 *
 * Se apunta el bloqueo que había ANTES. Si era uno de verdad (vertical, apaisado…), se devuelve ése. Si
 * no había ninguno —`DEFAULT`, que es como arranca la app—, se bloquea en VERTICAL (`PORTRAIT_UP`) y no
 * se suelta a ciegas con `unlockAsync`:
 *
 *   · Para que el WebView pueda ponerse de lado, `app.json` dice `"orientation": "default"`. En iOS el
 *     resto de la app sigue en vertical por `initialOrientation` del complemento de orientación, que es
 *     SÓLO de iOS (escribe `EXDefaultScreenOrientationMask` en el Info.plist). En Android `default` es
 *     `screenOrientation="unspecified"` en el manifiesto: la app entera gira con el sensor.
 *   · Soltar al salir de la noche dejaba ese giro a la vista justo al volver a la mesa. Bloquear en
 *     vertical deja la app como la dejó `"portrait"` hasta hoy. La Frente no lo nota: bloquea su vertical
 *     al entrar y lo suelta al salir, como siempre (`local.ts`).
 *
 * Lo que esto NO arregla: hasta que alguien entra en El Quiebro, en Android la app arranca sin bloqueo y
 * gira con el sensor. Eso se arregla al arrancar la app (`app/app/_layout.tsx`, que no es de esta
 * pantalla) o volviendo a `"portrait"` en `app.json` para Android con un complemento propio.
 *
 * Todo va envuelto en `catch` por lo que cuenta `local.ts`: en la web el bloqueo pide pantalla completa y
 * casi nunca se concede, y un fallo al pedir lo que no se puede tener no puede costar la noche. En
 * `/jugar` el documento dice «Gira el teléfono» si hace falta: en el iPhone no hay forma de bloquearlo.
 */
function usarLaNocheApaisada(activa: boolean): void {
  useEffect(() => {
    if (!activa) return undefined;
    let viva = true;
    let antes: ScreenOrientation.OrientationLock | null = null;
    void (async () => {
      try {
        antes = await ScreenOrientation.getOrientationLockAsync();
      } catch {
        antes = null;
      }
      if (!viva) return;
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);
    })();
    return () => {
      viva = false;
      const eraAsi = antes;
      void ScreenOrientation.lockAsync(bloqueoAlSalir(eraAsi)).catch(() => undefined);
    };
  }, [activa]);
}

/**
 * EL BLOQUEO AL SALIR DE LA NOCHE: el que había antes si era uno de verdad; si no había ninguno (o no se
 * supo), vertical. Nunca «suelto» (ver `usarLaNocheApaisada`).
 */
export function bloqueoAlSalir(antes: ScreenOrientation.OrientationLock | null): ScreenOrientation.OrientationLock {
  const libre =
    antes === null ||
    antes === ScreenOrientation.OrientationLock.DEFAULT ||
    antes === ScreenOrientation.OrientationLock.ALL ||
    antes === ScreenOrientation.OrientationLock.UNKNOWN ||
    antes === ScreenOrientation.OrientationLock.OTHER;
  return libre ? ScreenOrientation.OrientationLock.PORTRAIT_UP : antes;
}

/** La etiqueta del cerrojo de pantalla de la noche. */
const CERROJO_DE_LA_NOCHE = 'quiebro-noche';

/**
 * LA PANTALLA ENCENDIDA, SÓLO MIENTRAS SE JUEGA. Quien espera en Vigía o descuelga no toca el cristal
 * durante segundos, y un teléfono que se apaga en mitad de la Llamada ha perdido la noche. Al salir se
 * suelta: un teléfono olvidado boca arriba con la pantalla clavada es de lo que cuenta `local.ts`.
 */
function usarLaPantallaEncendida(activa: boolean): void {
  useEffect(() => {
    if (!activa) return undefined;
    /*
     * CON SU ETIQUETA, Y SE SUELTA SÓLO SI SE LLEGÓ A COGER. `deactivateKeepAwake` devuelve una promesa
     * y en la web RECHAZA si el cerrojo nunca se activó —el navegador lo niega sin un gesto o con la
     * pestaña detrás—: un `try` alrededor no la ve, y salía como «Uncaught Error: The wake lock … has
     * not activated yet» al salir de la noche, medido en `/jugar`. La etiqueta propia es para no soltar
     * el cerrojo de otra pantalla que use el de por defecto.
     */
    const cogida = activateKeepAwakeAsync(CERROJO_DE_LA_NOCHE).then(
      () => true,
      () => false,
    );
    return () => {
      void cogida
        .then((si) => (si ? deactivateKeepAwake(CERROJO_DE_LA_NOCHE) : undefined))
        .catch(() => undefined /* No se pudo soltar: el sistema la suelta al cerrar la app. */);
    };
  }, [activa]);
}

// ---------------------------------------------------------------------------
// La pantalla
// ---------------------------------------------------------------------------

/**
 * Pinta la mesa de El Quiebro. La pantalla entera hasta que hay mesa —el vestíbulo con su plazo— y lo
 * que es de cualquier mesa —el latido, los nombres, la barra— es de la plataforma.
 */
export default function ElQuiebroPorDentro(): JSX.Element {
  return <LaMesaDeUnPintor arcade={QUIEBRO} Pintor={LaNocheEnLaMesa} />;
}

/**
 * EL PINTOR DE EL QUIEBRO: la noche en el documento, con lo que le da el contrato (`LoQueVeElPintor`).
 * Componente aparte para que sus ganchos no queden detrás de los `return` del vestíbulo.
 */
function LaNocheEnLaMesa(pintor: LoQueVeElPintor): JSX.Element {
  const { mesa, juego, laBarra } = pintor;
  usarPantallaCompleta(); /* Sin barras del sistema mientras se juega; vuelven al salir. */
  const [enLaNoche, ponerEnLaNoche] = useState(true);
  const [cayo, ponerCayo] = useState<string | null>(null);
  /* Cada intento es una superficie nueva: la `key` la desmonta entera, con su documento. */
  const [intento, ponerIntento] = useState(0);
  const jugando = enLaNoche && cayo === null;

  usarLaNocheApaisada(jugando);
  usarLaPantallaEncendida(jugando);

  /* El «atrás» de Android saca de la noche, no de la mesa: ver la cabecera. */
  useEffect(() => {
    if (!jugando) return undefined;
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      ponerEnLaNoche(false);
      return true;
    });
    return () => suscripcion.remove();
  }, [jugando]);

  /*
   * La dirección se toma una vez: la mesa ya está sentada, así que la sesión del disco ya se leyó
   * (`LaMesaDeUnPintor` no pinta al pintor hasta entonces) y `servidorActual` es la de verdad.
   */
  const direccion = useMemo(() => direccionDelDocumento(servidorActual()), []);
  const origen = direccion === null ? null : origenDe(direccion);

  /*
   * ═══ LA ÚLTIMA MESA, Y SI EL DOCUMENTO YA ESCUCHA ═══
   *
   * En referencias y no en estado: no deciden qué se pinta, y el cartero las lee cuando llega un
   * mensaje, que es fuera de cualquier repintado. `laUltima` se apunta al pintar para que un `mover`
   * que llega justo detrás de un sondeo use la mesa de ese sondeo; `listo` vuelve a falso con cada
   * superficie nueva, porque un documento nuevo no ha dicho nada todavía.
   */
  const laUltima = useRef(mesa);
  laUltima.current = mesa;
  const listo = useRef(false);
  const buzon = useRef<((texto: string) => void) | null>(null);

  const mandarLaMesa = useCallback(() => {
    if (!listo.current) return;
    const m = mesaParaElDocumento(laUltima.current);
    if (m !== null) buzon.current?.(textoParaElDocumento(m));
  }, []);

  /* En cada cambio de la mesa o de la llave, la mesa entera otra vez. */
  const puesta = mesa.mesa;
  const llave = mesa.llave ?? null;
  useEffect(() => {
    mandarLaMesa();
  }, [mandarLaMesa, puesta, llave]);

  /* Sin dirección web no hay documento: se dice, y se juega sobre el plano. */
  useEffect(() => {
    if (direccion === null) ponerCayo(`el servidor de la app no es una dirección web (${servidorActual()})`);
  }, [direccion]);

  /* La espera del `listo`, por superficie. */
  useEffect(() => {
    if (!jugando || direccion === null) return undefined;
    listo.current = false;
    const reloj = setTimeout(() => {
      if (!listo.current) ponerCayo(`el documento de la noche no se ha puesto en marcha en ${String(ESPERA_DEL_DOCUMENTO_MS / 1000)} s`);
    }, ESPERA_DEL_DOCUMENTO_MS);
    return () => clearTimeout(reloj);
  }, [direccion, jugando, intento]);

  const alRecibir = useCallback(
    (dato: unknown) => {
      const m = leerLoQueDiceElDocumento(dato);
      if (m === null) return;
      switch (m.t) {
        case 'listo':
          listo.current = true;
          mandarLaMesa();
          return;
        case 'salir':
          ponerEnLaNoche(false);
          return;
        case 'medida':
          void guardarElVeredicto(m.calidad);
          return;
        case 'mover':
          void (async () => {
            let resultado: ResultadoDelMovimiento;
            try {
              resultado = await laUltima.current.mover(m.movimiento);
            } catch {
              resultado = 'sin-red';
            }
            /*
             * `motivo` vacío: `LaMesa.mover` dice CÓMO acabó y no POR QUÉ —el porqué lo pone en su aviso—.
             * El contrato ya cuenta con ello: quien decide si reintentar es la vista.
             */
            buzon.current?.(textoParaElDocumento({ t: 'movido', v: VERSION_DEL_PUENTE, id: m.id, resultado, motivo: '' }));
          })();
          return;
      }
    },
    [mandarLaMesa],
  );
  const alFallar = useCallback((motivo: string) => ponerCayo(motivo), []);

  /**
   * La barra de la mesa con un botón debajo: volver a la noche. La barra llega hecha del contrato y se
   * monta tal cual; el botón es lo único que esta pantalla le añade.
   */
  const conElBotonDeVolver = (rotulo: string, ayuda: string): LoQueVeElPintor => ({
    ...pintor,
    laBarra: (
      <View>
        {laBarra}
        <Pressable
          style={estilos.volver}
          onPress={() => {
            ponerCayo(null);
            ponerEnLaNoche(true);
            ponerIntento((n) => n + 1);
          }}
          accessibilityRole="button"
          accessibilityLabel={rotulo}
          accessibilityHint={ayuda}
        >
          <Text style={estilos.volverRotulo}>{rotulo}</Text>
        </Pressable>
      </View>
    ),
  });

  if (cayo !== null) {
    return (
      <ElRespaldo
        pintor={conElBotonDeVolver('Volver a intentarlo', 'Abre otra vez la noche en tres dimensiones')}
        nota={`La noche en tres dimensiones no se ha podido abrir (${cayo}). Se juega sobre el plano del barrio.`}
      />
    );
  }

  if (!enLaNoche) {
    return (
      <ElRespaldo
        pintor={conElBotonDeVolver('Volver a la noche', 'Vuelve a la ciudad sin perder el asiento')}
        nota="Estás fuera de la noche y sigues sentado: la mesa y la noche siguen para todos."
      />
    );
  }

  return (
    <View style={estilos.noche}>
      <StatusBar hidden />
      {direccion === null || origen === null ? null : (
        <RedDelLienzo juego={juego} alCaer={alFallar}>
          <ElDocumentoDelQuiebro
            key={intento}
            direccion={direccion}
            origen={origen}
            alRecibir={alRecibir}
            buzon={buzon}
            alFallar={alFallar}
          />
        </RedDelLienzo>
      )}
    </View>
  );
}

/*
 * Sólo lo que esta pantalla pinta con sus manos: el suelo de la noche y el botón de volver. La barra,
 * el respaldo y su nota son del contrato de pintor, con sus estilos.
 */
const estilos = StyleSheet.create({
  /* La noche entera: sin barra, sin márgenes; el área segura la cuenta el documento. */
  noche: { flex: 1, backgroundColor: SALA.suelo },
  volver: {
    marginHorizontal: 16,
    marginTop: 10,
    minHeight: 44,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: BOTON.primario.borde,
    backgroundColor: BOTON.primario.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  volverRotulo: { ...LETRA.rotulo, color: BOTON.primario.tinta, fontSize: 14 },
});
