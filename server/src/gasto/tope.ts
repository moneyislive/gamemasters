/**
 * El tope diario de lo que cuesta dinero.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL AGUJERO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Había un tope, y estaba puesto en la ruta BARATA. `/generacion/*` —avatares y
 * fondos— llevaba ocho al día por identidad. Las caras no llevaban ninguno:
 *
 *   · generar una trama cuesta entre 0,48 € y 0,82 € MEDIDOS, cada vez;
 *   · el chat del taller da hasta doce vueltas por turno reenviando la
 *     conversación entera, y no tiene fondo: crece con lo que se hable.
 *
 * `generacionEnCurso` impide dos generaciones a la vez SOBRE LA MISMA PARTIDA,
 * que es otra cosa: crear veinte partidas y generarlas seguidas no lo paraba
 * nada. Con una sesión de taller válida —o con la contraseña de la casa
 * filtrada— la factura la escribe otro.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CÓMO ESTÁ CALIBRADO, Y CÓMO SE CAMBIA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Los topes son GENEROSOS a propósito. Un tope que muerde a quien está
 * preparando su velada es peor que no tenerlo: su trabajo es cortar un bucle,
 * no racionar el producto. Quien dirige de verdad genera una vez, actualiza dos
 * o tres y quizá regenera si no le gusta; ocho al día le sobran y son unos seis
 * euros de techo por identidad.
 *
 * Se cambian sin tocar código, en las variables del servicio:
 *
 *   TOPE_DIARIO_TRAMAS    tramas, ampliaciones y material   (por defecto 8)
 *   TOPE_DIARIO_CHARLA    turnos del chat del taller        (por defecto 250)
 *   TOPE_DIARIO_ESTUDIO   avatares y fondos                 (por defecto 8)
 *
 * Un 0 quita el tope de esa familia. Es una salida de emergencia de verdad: si
 * el tope resulta estar mal calibrado un sábado por la noche, se pone a 0 y se
 * recalibra el lunes, en vez de dejar a doce personas sentadas a la mesa.
 *
 * LA CASA VA APARTE. La contraseña de la casa la comparte todo el mundo que la
 * tenga, así que su cubo es uno solo para todos y se agotaría enseguida. Se le
 * da un múltiplo — y sigue teniendo techo, porque si esa contraseña se filtra,
 * es justo la identidad por la que entraría el abuso.
 *
 * EN MEMORIA, y se pierde al reiniciar. No importa: esto no es contabilidad
 * —de eso se encarga `contador.ts`— es un cortacircuitos.
 */

/** Las familias que se cuentan por separado. */
export type FamiliaDeGasto = 'tramas' | 'charla' | 'estudio';

function leerTope(crudo: string | undefined, porDefecto: number): number {
  const limpio = crudo?.trim();
  if (limpio === undefined || limpio === '') return porDefecto;
  const n = Number(limpio);
  // Un valor ilegible no puede desactivar el tope en silencio.
  if (!Number.isFinite(n) || n < 0) return porDefecto;
  return Math.floor(n);
}

/*
 * Cada una escrita ENTERA, no `process.env[variable]` con la clave calculada.
 *
 * Lo segundo es más corto y lo caza el comprobador de entorno: repasa qué
 * variables se declaran en `render.yaml` y cuáles lee alguien, y una clave
 * calculada es invisible para él. Habría dicho que estas tres están declaradas
 * y no las lee nadie — y esa es exactamente la clase de aviso que hay que
 * poder creerse.
 */
const TOPES: Record<FamiliaDeGasto, number> = {
  tramas: leerTope(process.env.TOPE_DIARIO_TRAMAS, 8),
  charla: leerTope(process.env.TOPE_DIARIO_CHARLA, 250),
  estudio: leerTope(process.env.TOPE_DIARIO_ESTUDIO, 8),
};

/** Cuánto más se le consiente a la contraseña compartida de la casa. */
const HOLGURA_DE_LA_CASA = 5;

/** quien|familia → el día y cuántas van. */
const cubos = new Map<string, { dia: string; usos: number }>();

/** El día natural en UTC. Basta: el tope no es un contrato, es un freno. */
function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function topeDe(quien: string, familia: FamiliaDeGasto): number {
  const base = TOPES[familia];
  if (base === 0) return 0;
  return quien === 'casa' || quien === 'abierto' ? base * HOLGURA_DE_LA_CASA : base;
}

/**
 * Apunta un uso y dice si cabía.
 *
 * Devuelve `false` SIN apuntar cuando ya no cabe: quien está pasado de vueltas
 * no puede empujar su propio techo hacia arriba a base de reintentar.
 */
export function cabeHoy(quien: string, familia: FamiliaDeGasto): boolean {
  const tope = topeDe(quien, familia);
  if (tope === 0) return true;

  const clave = `${quien}|${familia}`;
  const dia = hoy();
  const cubo = cubos.get(clave);

  if (!cubo || cubo.dia !== dia) {
    cubos.set(clave, { dia, usos: 1 });
    // De paso se barre lo de días anteriores: sin esto el mapa crece una entrada
    // por identidad y día, y crecer sin fin es la fuga que ya hemos tenido dos
    // veces en mapas como este.
    for (const [otra, valor] of cubos) {
      if (valor.dia !== dia) cubos.delete(otra);
    }
    return true;
  }

  if (cubo.usos >= tope) return false;
  cubo.usos += 1;
  return true;
}

/** Lo que se le dice a quien se ha pasado. Sin cifras internas ni reproches. */
export function mensajeDeTope(familia: FamiliaDeGasto): string {
  if (familia === 'charla')
    return 'Has hablado mucho con el asistente hoy. Vuelve mañana o escríbenos si necesitas más.';
  if (familia === 'estudio')
    return 'Has generado bastantes imágenes hoy. Vuelve mañana o escríbenos si necesitas más.';
  return 'Has generado bastantes partidas hoy. Vuelve mañana o escríbenos si necesitas más.';
}

/** Lo configurado, para poder comprobarlo y para el arranque. */
export function topesConfigurados(): Record<FamiliaDeGasto, number> {
  return { ...TOPES };
}

/** Cuántos cubos hay vivos. Solo para comprobar que no hay fuga. */
export function cubosVivos(): number {
  return cubos.size;
}
