/**
 * A qué juego se parece el taller ahora mismo.
 *
 * El usuario lo pidió con estas palabras: «las UIs propias de este juego deben
 * estar tematizadas, sobre todo en la web de game masters». Y tiene razón por
 * un motivo que no es de gusto: quien prepara una partida está haciendo un
 * esfuerzo de imaginación —convertir su pasillo en una tumba— y una pantalla
 * que le habla en burdeos y art déco mientras él escribe «Cámara del Barquero»
 * está tirando en dirección contraria.
 *
 * CÓMO FUNCIONA. Se pone `data-juego` en `<html>` y el CSS hace el resto
 * (`client/src/styles/temas.css`). No hay estado en React, no hay proveedor de
 * contexto y ningún componente tiene que preguntar de qué color va: el tema es
 * una propiedad del documento, que es exactamente lo que es.
 *
 * POR QUÉ EN `<html>` Y NO EN UN `<div>`. Porque los alias de `theme.css`
 * (`--gold-500: rgb(var(--acento-rgb))`) se resuelven en el elemento donde se
 * declaran, que es `:root`. Colgando el tema de un div de dentro, esos alias ya
 * llegarían resueltos en dorado y solo cambiaría de color lo poco que usa los
 * tokens nuevos directamente. Está probado: se veía a medias.
 *
 * Y ADEMÁS: los overlays a pantalla completa —la transición de entrada, el velo
 * de generación, los avisos flotantes— cuelgan del `<body>`, no del árbol de la
 * página. Colgado de `<html>`, el tema los alcanza sin que nadie haga nada.
 */
import { useEffect } from 'react';

/**
 * Las tipografías propias de cada juego.
 *
 * NO VAN EN `index.html` a propósito. Las de CLUEDO sí están ahí, porque son
 * las de la casa y se usan en el catálogo antes de saber a qué se va a jugar.
 * Las de un juego concreto se piden solo si alguien entra en ese juego: quien
 * nunca abra una partida de la Momia no descarga tres familias de letras que no
 * va a ver. Con dos juegos es un detalle; con diez, es la portada entera.
 *
 * La hoja se queda cargada para el resto de la sesión aunque se salga del
 * juego. Quitarla al salir daría un parpadeo feísimo al volver a entrar, y una
 * hoja de estilos que ya está en la caché no cuesta nada.
 */
const FUENTES_DE_JUEGO: Record<string, string> = {
  momia:
    'https://fonts.googleapis.com/css2?family=Limelight&family=Marcellus+SC&family=Spectral:ital,wght@0,300;0,400;0,600;1,400&display=swap',
};

/** Marca en el `<link>` para no pedir dos veces la misma hoja. */
const MARCA = 'data-fuentes-de-juego';

function asegurarFuentes(juego: string): void {
  const url = FUENTES_DE_JUEGO[juego];
  if (!url) return;
  if (document.head.querySelector(`link[${MARCA}='${juego}']`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.setAttribute(MARCA, juego);
  document.head.appendChild(link);
}

/**
 * Viste el documento con el tema de un juego mientras el componente esté vivo.
 *
 * Con `undefined` —el catálogo, donde todavía no se ha elegido nada— se quita
 * el atributo y vuelve el tema de la casa. Eso importa: si el atributo se
 * quedara pegado, volver al catálogo desde una partida de la Momia dejaría la
 * portada de GameMasters pintada de otro juego.
 */
export function useTemaDeJuego(juego: string | undefined): void {
  useEffect(() => {
    const raiz = document.documentElement;
    if (!juego) {
      delete raiz.dataset.juego;
      return;
    }
    raiz.dataset.juego = juego;
    asegurarFuentes(juego);
    return () => {
      delete raiz.dataset.juego;
    };
  }, [juego]);
}
