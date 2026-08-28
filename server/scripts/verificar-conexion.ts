/**
 * El aviso de desconexión avisa de lo que es, y solo mientras es verdad.
 *
 * QUÉ SE PROTEGE. La app tenía una sola franja a lo ancho de la pantalla para
 * cualquier problema, y se quedaba puesta. Dos cosas estaban mal:
 *
 *  · MENTÍA SOBRE EL ALCANCE. «Tu sesión ha caducado» es de UNA partida —se
 *    pueden perder los hilos de una velada y seguir teniendo los de las demás—
 *    y se anunciaba como si no funcionara la app entera.
 *  · SE QUEDABA. Solo la retiraba una respuesta con datos nuevos, así que en
 *    una partida tranquila, que contesta 204 una y otra vez, la franja seguía
 *    ahí con el móvil perfectamente conectado. Y peor: una partida que responde
 *    404 la sostenía indefinidamente, cuando cada 404 es la prueba de que la
 *    conexión va fina.
 *
 * Aquí se comprueba el reparto, que es la decisión de la que cuelga todo lo
 * demás. Lo que la franja y el panel hacen con él se ve en la app.
 *
 * Se importa `app/src/conexion-reglas.ts` directamente: no trae nada de React
 * Native precisamente para poder comprobarse desde aquí.
 */
import { repartirFallo } from '../../app/src/conexion-reglas';

let hechas = 0;
function digo(que: boolean, queCosa: string): void {
  hechas += 1;
  if (!que) {
    console.error(`✘ ${queCosa}`);
    process.exit(1);
  }
}

// ---- De la partida: el servidor contestó, y contestó que no. ----
for (const estado of [401, 403, 404]) {
  const r = repartirFallo(estado);
  digo(r.deLaPartida, `${estado} es cosa de la partida`);
  digo(
    !r.sinRed,
    `${estado} NO puede pintar la franja global: el servidor ha contestado, ` +
      `así que de red no falta nada`,
  );
}

// ---- De la plataforma: no hay respuesta, o no hay servicio. ----
for (const estado of [0, 500, 502, 503]) {
  const r = repartirFallo(estado);
  digo(r.sinRed, `${estado} es de la plataforma y sí puede pintar la franja`);
  digo(!r.deLaPartida, `${estado} no se puede colgar de la fila de una partida`);
}

/*
 * Y NUNCA LAS DOS A LA VEZ. Si un fallo pudiera ser de las dos clases, la misma
 * caída saldría dos veces —franja arriba y aviso en la fila— diciendo cosas
 * distintas del mismo problema.
 */
for (const estado of [0, 401, 403, 404, 418, 500, 503]) {
  const r = repartirFallo(estado);
  digo(r.sinRed !== r.deLaPartida, `${estado} cae en un lado y solo en uno`);
}

console.log(`\n${hechas} comprobaciones`);
console.log('Perder una partida no es perder la app, y ninguna de las dos avisa de más.');
