/**
 * LOS REMATES DE HUECO EN BULTO: el alféizar y el guardapolvo de cada hueco sin balcón, en geometría. Hoy no
 * escribe nada (el alféizar y el dintel los pinta el sombreador, `TRAMO_DEL_HUECO`): `fachadasPorPartes` lo
 * llama en cada cara de cada volumen, con relieve y sin él, para que quien lo rellene no tenga que tocar a
 * nadie más. Cuando escriba, que recorra los huecos con `recorrerLosHuecos` (`caras.ts`), que se salte los
 * que `tieneBalcon` (`balcones.ts`) da por balconera, y que ceda por tramo.
 */
import type { Molde } from '../geometria';
import type { EdificioDelPlano } from '../tipos';
import type { CaraDelVolumen, ObraDeLaFachada } from './tipos-de-cara';

/** LOS REMATES DE HUECO de la cara `c` de `e`. Hoy no escribe nada (ver la cabecera). */
export function* rematesDeHuecoDeLaCara(m: Molde, e: EdificioDelPlano, c: CaraDelVolumen, obra: ObraDeLaFachada): Generator<void, void, void> {
  /* Todavía nada: se llama y no escribe. */
}
