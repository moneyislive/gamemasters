/**
 * A PIE, EL TELÉFONO DE LADO, EN LA SALA: el gancho que montan los tres pintores que se andan —El
 * Burgo, Riberas y Las Lindes— y el aviso «Gira el teléfono».
 *
 * ═══ POR QUÉ (27-sep-2026) ═══
 *
 * Con el teléfono de pie, a pie, la palanca y «Correr» se comen el tercio de abajo y la calle se ve por
 * una rendija. Al bajar a andar —«Al hombro» es el gesto que el navegador pide— se intenta ponerlo de
 * lado: pantalla completa y `screen.orientation.lock('landscape')` (`escenas/paseo/apaisado.ts`, donde
 * está contado lo que deja cada navegador). Donde no se puede —el iPhone, o un Chrome que dice que
 * no— sale el aviso, que NO atrapa: «Seguir de pie» lo quita, y se va solo en cuanto se gira. Al volver
 * a la mesa se suelta el bloqueo, y la pantalla completa sólo si la puso esto.
 *
 * Sólo CON EL DEDO (`usarAparatoTactil`, el almacén único) y sólo en un TELÉFONO de pie
 * (`hayQueGirar`): un ordenador o una tableta de pie tienen sitio de sobra y no se les pide nada.
 */
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { GIRA_EL_TELEFONO, hayQueGirar, pedirDeLado, POR_QUE_GIRARLO, SEGUIR_DE_PIE, soltarElLado } from '../../escenas/paseo/apaisado';
import { usarAparatoTactil } from './mandos-tactiles';

/** El ancho y el alto de la ventana, y cambian al girar. En Node, cero: no hay a quién girar. */
function usarLaVentana(): { readonly ancho: number; readonly alto: number } {
  const leer = (): { ancho: number; alto: number } =>
    typeof window === 'undefined' ? { ancho: 0, alto: 0 } : { ancho: window.innerWidth, alto: window.innerHeight };
  const [v, ponerV] = useState(leer);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mirar = (): void => ponerV(leer());
    window.addEventListener('resize', mirar);
    window.addEventListener('orientationchange', mirar);
    return () => {
      window.removeEventListener('resize', mirar);
      window.removeEventListener('orientationchange', mirar);
    };
  }, []);
  return v;
}

/**
 * EL GANCHO: con `aPie`, pide el teléfono de lado una vez por bajada; al subir lo suelta. Devuelve el
 * aviso para pintar encima del lienzo (o `null`).
 */
export function usarAPieApaisado(aPie: boolean): JSX.Element | null {
  const tactil = usarAparatoTactil();
  const { ancho, alto } = usarLaVentana();
  const [seguirDePie, ponerSeguirDePie] = useState(false);
  const puso = useRef(false);
  const activo = aPie && tactil;
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    if (typeof window !== 'undefined' && hayQueGirar(window.innerWidth, window.innerHeight, true)) {
      void pedirDeLado().then((r) => {
        if (vivo) puso.current = r.pusoLaPantallaCompleta;
        else soltarElLado(r.pusoLaPantallaCompleta);
      });
    }
    return () => {
      vivo = false;
      soltarElLado(puso.current);
      puso.current = false;
      ponerSeguirDePie(false);
    };
  }, [activo]);
  if (!activo || seguirDePie || !hayQueGirar(ancho, alto, tactil)) return null;
  return <AvisoDeGirar alSeguirDePie={() => ponerSeguirDePie(true)} />;
}

/**
 * EL AVISO: un teléfono que se tumba, dos frases y «Seguir de pie». Una tarjeta en medio con un velo
 * que deja ver la calle detrás, no un telón negro: quien no puede girar el teléfono sigue jugando.
 */
export function AvisoDeGirar({ alSeguirDePie }: { readonly alSeguirDePie: () => void }): JSX.Element {
  return (
    <div className="a-pie-gira" role="dialog" aria-modal="false" aria-labelledby="a-pie-gira-titulo">
      <div className="a-pie-gira-tarjeta">
        <span className="a-pie-gira-telefono" aria-hidden="true" />
        <p id="a-pie-gira-titulo" className="a-pie-gira-titulo">
          {GIRA_EL_TELEFONO}
        </p>
        <p className="a-pie-gira-porque">{POR_QUE_GIRARLO}</p>
        <button type="button" className="a-pie-gira-seguir" onClick={alSeguirDePie}>
          {SEGUIR_DE_PIE}
        </button>
      </div>
    </div>
  );
}
