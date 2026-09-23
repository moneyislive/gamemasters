/**
 * UNA LOSA, LEVANTADA — AHORA ES UNA FACHADA.
 *
 * El reparto de piezas de una losa vive en `shared/arcade/juegos/lindes-reparto.ts` desde
 * que dejó de ser decorado: de él sale con qué se choca al andar (`lindes-mundo.ts`), y eso
 * lo tienen que derivar igual el aparato y el servidor, en V8 y en Hermes. Allí está TODO
 * lo que había aquí —el suelo, las murallas, las parcelas, `montarLaLosa`— con su historia
 * y con los dos únicos cambios que costó la mudanza (la dirección de los trastos de la
 * plaza y el rumbo de las vallas, sin trigonometría).
 *
 * Este fichero se queda para que sus consumidores —`Lindes.tsx`, `suelo.ts` (que además
 * reexporta `alturaDe` desde aquí), `paseo.ts`, `desierto.ts` y `verify:lindes-escena`— no
 * tengan que cambiar una importación el mismo día. Quien quiera importar de `shared/`
 * directamente puede hacerlo: es la misma función, no una copia.
 *
 * AQUÍ NO SE ESCRIBE NADA NUEVO. Una función del reparto escrita en `escenas/` volvería a
 * ser algo que el servidor no ve, y una copia de una de `shared/` sería el día que las dos
 * dejan de coincidir.
 */
export * from '../../shared/arcade/juegos/lindes-reparto';
