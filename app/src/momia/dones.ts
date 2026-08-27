/**
 * Los siete dones, dichos para quien juega.
 *
 * POR QUÉ ESTA TABLA VIVE EN LA APP Y NO EN `shared/`. Porque no es lógica: es
 * REDACCIÓN. Lo que `shared/juegos/momia-tipos.ts` declara es qué dones existen
 * —una unión de siete cadenas, que es lo que servidor y app tienen que entender
 * igual— y eso es todo lo que hace falta compartir. Cómo se le cuenta a alguien
 * lo que hace su don, en qué tono y con cuántas palabras, es cosa de la pantalla
 * que lo enseña; el imprimible lo dirá con otras palabras y estará bien.
 *
 * LO IMPORTANTE ES `elige`: es lo que hace que la acción `invocar` no necesite
 * `eligeDe` en el manifiesto. El don es secreto hasta que lo usas, así que el
 * servidor no puede anunciar de antemano qué hay que elegir sin decir de paso
 * quién tiene qué. La pantalla lo deduce del don que te ha tocado, que solo tú
 * conoces.
 */
import type { DonId } from '../../../shared/juegos';

/** Qué hay que elegir al invocar. */
export type QueElige =
  /** Nada: el don se invoca y ya. */
  | 'nada'
  /** Una persona de la expedición. */
  | 'persona'
  /** Una cámara de la tumba. */
  | 'camara'
  /** Uno de TUS fragmentos privados, para hacerlo público. */
  | 'fragmento-propio'
  /** Una de las falsificaciones que la casa tiene preparadas. */
  | 'fragmento-falso';

export interface Don {
  /** Cómo se llama el poder. */
  nombre: string;
  /** El oficio del que sale, para que el don tenga cara. */
  rol: string;
  /** Qué hace, en una frase que se pueda leer de pie. */
  que: string;
  elige: QueElige;
  /** El rótulo del selector, cuando lo hay. */
  pregunta?: string;
}

export const DONES: Record<DonId, Don> = {
  descifrar: {
    nombre: 'Descifrar',
    rol: 'Epigrafista',
    que: 'Sales de la vigilia con un fragmento más que nadie sabe que tienes.',
    elige: 'nada',
  },
  sanar: {
    nombre: 'Sanar',
    rol: 'Médico',
    que: 'Le quitas una marca a quien elijas sin gastar amuleto.',
    elige: 'persona',
    pregunta: '¿A quién curas?',
  },
  proteger: {
    nombre: 'Proteger',
    rol: 'Guardián',
    que: 'A quien elijas no le marcan esta vigilia, entre donde entre.',
    elige: 'persona',
    pregunta: '¿A quién proteges?',
  },
  sobornar: {
    nombre: 'Sobornar',
    rol: 'Mecenas',
    que: 'Averiguas qué cámara se profanará la vigilia siguiente.',
    elige: 'nada',
  },
  documentar: {
    nombre: 'Documentar',
    rol: 'Fotógrafo',
    que: 'Pones uno de tus fragmentos sobre la mesa, a la vista de todos.',
    elige: 'fragmento-propio',
    pregunta: '¿Cuál haces público?',
  },
  excavar: {
    nombre: 'Excavar',
    rol: 'Capataz',
    que: 'Entras en una segunda cámara. Te cuesta una marca, entre donde entres.',
    elige: 'camara',
    pregunta: '¿Dónde excavas además?',
  },
  falsificar: {
    /*
     * ESTE NO SE ANUNCIA EN NINGÚN SITIO MÁS. Aparece en la pantalla de quien lo
     * tiene, y solo ahí, porque en su dosier figura un rol normal con un don
     * normal: `falsificar` se le añade en secreto (diseño §3.3). El texto está
     * escrito para que quien lo lea entienda de golpe que juega a otra cosa que
     * el resto de la mesa.
     */
    nombre: 'Falsificar',
    rol: 'Solo tú',
    que: 'Fabricas un fragmento que no existió y lo pones sobre la mesa como si lo hubieras encontrado.',
    elige: 'fragmento-falso',
    pregunta: '¿Qué mentira pones sobre la mesa?',
  },
};
