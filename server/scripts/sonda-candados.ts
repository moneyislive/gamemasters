/**
 * Sonda del candado por partida. La lanza `verificar-aguante.ts`; no se usa a
 * mano.
 *
 * POR QUÉ ES UN PROCESO APARTE. Lo que hay que mirar —cuántos candados quedan
 * vivos en el mapa de `live/sesion.ts`— no se ve por HTTP: es memoria del
 * servidor. Y para llamar a `mutar` hace falta un almacén inicializado, lo que
 * significa `initStore()`, lo que significa que si esto corriera en el proceso
 * del comprobador, con su cwd, cargaría el `.env` de verdad y se conectaría al
 * Atlas de producción. Aquí no: se arranca con cwd en una carpeta temporal y un
 * entorno explícito, y el almacén acaba siendo el fichero JSON sembrado.
 *
 * Escribe una línea de JSON por la salida estándar y termina.
 */
import { initStore } from '../src/db/store';
import { candadosVivos, mutar } from '../src/live/sesion';

const PARTIDA = 'aguante';

await initStore();

const antes = candadosVivos();

// Doce mutaciones a la vez sobre la misma partida: es lo que pasa cuando la
// mesa entera toca el móvil en el mismo segundo.
const orden: number[] = [];
await Promise.all(
  Array.from({ length: 12 }, (_, i) =>
    mutar(PARTIDA, async (s) => {
      // Un respiro en mitad de la mutación. Sin candado, las doce leerían el
      // mismo estado y once escrituras se perderían; con él, cada una ve lo
      // que dejó la anterior.
      const visto = s.round;
      await new Promise((r) => setTimeout(r, 5));
      s.round = visto + 1;
      orden.push(i);
    }),
  ),
);

const { sesion } = await mutar(PARTIDA, (s) => s, { silenciosa: true });

// El mapa debe quedar como estaba: ni un candado suelto por partida jugada.
const despues = candadosVivos();

// Una silenciosa más, para confirmar que no sube la revisión.
const revAntes = sesion.rev ?? 0;
const { sesion: tras } = await mutar(PARTIDA, () => undefined, { silenciosa: true });

console.log(
  JSON.stringify({
    antes,
    despues,
    ronda: sesion.round,
    mutaciones: orden.length,
    revAntes,
    revTrasSilenciosa: tras.rev ?? 0,
  }),
);
process.exit(0);
