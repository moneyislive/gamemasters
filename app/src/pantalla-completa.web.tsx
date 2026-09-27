/**
 * LA PANTALLA COMPLETA MIENTRAS SE JUEGA, EN `/jugar`: la Fullscreen API del navegador.
 *
 * El mismo trato que `pantalla-completa.tsx` —una línea en el pintor de cada juego— con lo que la
 * web tiene. Metro elige este fichero en el navegador y aquel en el teléfono; la pantalla de juego
 * no pregunta en qué plataforma está (`verify:sala` no admite un `Platform.OS` en ellas).
 *
 * ═══ LAS TRES PIEZAS DE LA WEB (`docs/PANTALLAS.md` §5) ═══
 *
 *   1. AL PRIMER TOQUE, sólo en un aparato táctil. Un navegador no deja pedir pantalla completa sin
 *      un gesto de quien juega, así que se pide en el primer toque dentro de la partida —o en el
 *      acto, si el toque que la abrió («Zarpar», «Sentarse») es todavía reciente:
 *      `navigator.userActivation.isActive`—. En un ordenador no: allí la ventana ya es grande y
 *      quitarle a alguien sus pestañas sin preguntar es de mala educación.
 *   2. UN BOTÓN DISCRETO en la barra de la mesa (`BotonDePantallaCompleta`), para entrar y salir a
 *      mano en cualquier aparato. Si la API no existe —el iPhone: Safari no la da a las páginas—
 *      no se pinta: un botón que no hace nada es peor que ninguno.
 *   3. EL IPHONE, POR LA PANTALLA DE INICIO. Allí sirven el manifiesto (`display: fullscreen`) y
 *      las metas `apple-mobile-web-app-*` de `public/index.html`: añadida a la pantalla de inicio,
 *      `/jugar` se abre sin barras del navegador. No es de este fichero, pero es la misma pieza.
 *
 * ═══ AL SALIR DE LA PARTIDA SE DEVUELVE, SI LA PUSO EL JUEGO ═══
 *
 * La cuenta de pantallas que la piden es la misma que en el teléfono (el `fade` monta la que entra
 * antes de desmontar la que sale). Al volver a cero se sale de la pantalla completa sólo si la puso
 * esto: si quien juega la había puesto antes con F11 o con el botón, se respeta.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { conAlfa } from './tema';
import { RADIO, SALA } from './arcade/muebles';

/* Lo que Safari del iPad sigue llamando con prefijo. */
type ConPrefijo = {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type ElementoConPrefijo = { webkitRequestFullscreen?: (o?: FullscreenOptions) => Promise<void> | void };

function documento(): (Document & ConPrefijo) | null {
  return typeof document === 'undefined' ? null : (document as Document & ConPrefijo);
}

/** ¿Deja este navegador poner la página a pantalla completa? En el iPhone, no. */
export function hayPantallaCompleta(): boolean {
  const d = documento();
  if (d === null) return false;
  const raiz = d.documentElement as HTMLElement & ElementoConPrefijo;
  const puede = d.fullscreenEnabled === true || d.webkitFullscreenEnabled === true;
  return puede && (typeof raiz.requestFullscreen === 'function' || typeof raiz.webkitRequestFullscreen === 'function');
}

function enPantallaCompleta(): boolean {
  const d = documento();
  return d !== null && (d.fullscreenElement ?? d.webkitFullscreenElement ?? null) !== null;
}

/** Pide la pantalla completa. Si el navegador dice que no —sin gesto, o por política—, se calla. */
function pedir(): Promise<boolean> {
  const d = documento();
  if (d === null || !hayPantallaCompleta() || enPantallaCompleta()) return Promise.resolve(false);
  const raiz = d.documentElement as HTMLElement & ElementoConPrefijo;
  try {
    const hecho =
      typeof raiz.requestFullscreen === 'function'
        ? raiz.requestFullscreen({ navigationUI: 'hide' })
        : raiz.webkitRequestFullscreen?.({ navigationUI: 'hide' });
    return Promise.resolve(hecho).then(
      () => enPantallaCompleta(),
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

function soltar(): void {
  const d = documento();
  if (d === null || !enPantallaCompleta()) return;
  try {
    const hecho = typeof d.exitFullscreen === 'function' ? d.exitFullscreen() : d.webkitExitFullscreen?.();
    void Promise.resolve(hecho).catch(() => undefined);
  } catch {
    /* Ya no lo estaba: nada que devolver. */
  }
}

/** ¿Se juega con el dedo? Sólo ahí se pide sola. */
function esTactil(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

/** ¿Hay un gesto reciente con el que el navegador deje pedirla ya? */
function gestoReciente(): boolean {
  const n = typeof navigator === 'undefined' ? null : (navigator as Navigator & { userActivation?: { isActive: boolean } });
  return n?.userActivation?.isActive === true;
}

let pedidas = 0;
/** La puso esto (y no quien juega): sólo entonces se quita al salir de la partida. */
let laPusoElJuego = false;
/** Quita la espera del primer toque, si está puesta. */
let dejarDeEsperar: (() => void) | null = null;

/*
 * `pointerup` y `touchend` porque son los que el navegador cuenta como gesto para un dedo
 * (`pointerdown` sólo cuenta con ratón). En captura, para llegar antes que nadie que corte la
 * propagación —el lienzo de la escena, por ejemplo—.
 */
const GESTOS = ['pointerup', 'touchend'] as const;

function esperarAlPrimerToque(): void {
  if (dejarDeEsperar !== null) return;
  const alTocar = (): void => {
    dejarDeEsperar?.();
    void pedir().then((si) => {
      if (si) laPusoElJuego = true;
    });
  };
  for (const g of GESTOS) window.addEventListener(g, alTocar, { capture: true, passive: true });
  dejarDeEsperar = () => {
    for (const g of GESTOS) window.removeEventListener(g, alTocar, { capture: true });
    dejarDeEsperar = null;
  };
}

function entrarEnLaPartida(): void {
  pedidas += 1;
  if (pedidas > 1 || !esTactil() || !hayPantallaCompleta() || enPantallaCompleta()) return;
  if (gestoReciente()) {
    void pedir().then((si) => {
      if (si) laPusoElJuego = true;
      else if (pedidas > 0) esperarAlPrimerToque();
    });
    return;
  }
  esperarAlPrimerToque();
}

function salirDeLaPartida(): void {
  pedidas = Math.max(0, pedidas - 1);
  if (pedidas > 0) return;
  dejarDeEsperar?.();
  if (laPusoElJuego) soltar();
  laPusoElJuego = false;
}

/**
 * Pide la pantalla completa al primer toque mientras la pantalla que lo llama esté montada, y la
 * devuelve al desmontarse. Una línea al principio del pintor de cada juego.
 */
export function usarPantallaCompleta(): void {
  useEffect(() => {
    entrarEnLaPartida();
    return salirDeLaPartida;
  }, []);
}

/** Sigue si la página está a pantalla completa, sea quien sea quien la puso o la quitó. */
function usarEstaEnCompleta(): boolean {
  const [esta, poner] = useState(enPantallaCompleta);
  useEffect(() => {
    const d = documento();
    if (d === null) return undefined;
    const mirar = (): void => poner(enPantallaCompleta());
    d.addEventListener('fullscreenchange', mirar);
    d.addEventListener('webkitfullscreenchange', mirar);
    return () => {
      d.removeEventListener('fullscreenchange', mirar);
      d.removeEventListener('webkitfullscreenchange', mirar);
    };
  }, []);
  return esta;
}

/**
 * EL BOTÓN DISCRETO: cuatro esquinas, en la barra de la mesa junto a «Salir» y «Tirar». 44 × 44,
 * con el mismo contorno que ellos y sin acento —no es una jugada—. Oculto donde la API no está.
 */
export function BotonDePantallaCompleta(): JSX.Element | null {
  const esta = usarEstaEnCompleta();
  const [hay] = useState(hayPantallaCompleta);
  if (!hay) return null;
  return (
    <Pressable
      onPress={() => {
        if (esta) {
          laPusoElJuego = false;
          soltar();
        } else {
          dejarDeEsperar?.();
          /* Pedida a mano: es de quien juega, y no se quita sola al salir. */
          void pedir();
        }
      }}
      style={estilos.boton}
      accessibilityRole="button"
      accessibilityLabel={esta ? 'Salir de la pantalla completa' : 'Jugar a pantalla completa'}
    >
      <View pointerEvents="none">
        <Svg width={18} height={18} viewBox="0 0 18 18">
          <Path
            d={
              esta
                ? 'M6 1v5H1M12 1v5h5M6 17v-5H1M12 17v-5h5'
                : 'M1 6V1h5M17 6V1h-5M1 12v5h5M17 12v5h-5'
            }
            stroke={SALA.tenue}
            strokeWidth={2}
            fill="none"
          />
        </Svg>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  /* El mismo mando que «Salir» de la barra: 44 de dedo y el contorno de 3,57 sobre el suelo. */
  boton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: conAlfa(SALA.blanco, 0.4),
    borderWidth: 1,
    borderRadius: RADIO.mando,
  },
});
