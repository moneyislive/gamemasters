/**
 * LA FIRMA VISUAL DEL QUIEBRO, hacia fuera: lo que los otros frentes del cliente importan.
 *
 *   · `juego` (red, mandos, cámara): `usarElSistemaDeEfectos`, `EfectosDelQuiebro` y los métodos
 *     del sistema (`anillos.anunciar`, `balas.disparar`, `impacto`, `imprimir`, `reloj.remansar`…).
 *   · `personajes`: las líneas de tiempo (`impresionEn`, `desalojoEn`, `salidaEn`, `trasvaseEn`)
 *     dicen cuánto se ve el cuerpo en cada instante; y `reloj.presentado` / `reloj.ritmo` es el
 *     tiempo de sus mezcladores de animación para los cuerpos ajenos.
 *   · `posproceso`: `reloj.intensidad(t)` para desaturar y cerrar el campo en el Remanso, y
 *     `sistema.parpadeo()` para el fogonazo de pantalla de los impactos.
 *   · `ciudad` y `atmosfera`: `sistema.pantallas.poner(...)`, el atlas (`atlasDeLaGrafia`) y los
 *     trozos de GLSL (`GLSL_GRAFIA`, `GLSL_AZAR`) para las fachadas que se transparentan en glifos.
 *   · `calidad`: `PIEZAS`, `gastoDelNivel` y `topeDeLosEfectos` para su cuenta de la escena.
 */
export { EfectosDelQuiebro, usarElSistemaDeEfectos } from './Efectos';
export type { PropsDeLosEfectos } from './Efectos';
export { AnillosDelAnuncio } from './anillos';
export { ChispasDeImpacto, EsquirlasAmbar } from './chispas';
export { Hilos } from './hilos';
export { CieloDeGrafia, MarcoDelBis, MuroDelBis, PantallasDeGrafia, SiluetasDeGrafia } from './tapices';
export { Ondas, Trazos } from './trazos';

export { GRAFIA, GLIFOS_EN_LA_GRAFIA, pixelesDelAtlas } from './grafia';
export type { Glifo, OrigenDelGlifo } from './grafia';
export { atlasDeLaGrafia, soltarElAtlas } from './atlas';
export { GLSL_AZAR, GLSL_GRAFIA } from './glsl';

export { crearRelojDePresentacion, DURACION_DEL_REMANSO_MS, ESPACIO_ENTRE_REMANSOS_MS } from './reloj';
export type { RelojDePresentacion, TramoDelRemanso } from './reloj';

export { crearSistemaDeEfectos } from './sistema';
export { crearEfectosDelRayo } from './rayo';
export type {
  AnuncioDeEfecto,
  ApuntadoDeEfecto,
  ImpactoDeEfecto,
  Localizador,
  MontonDeEsquirlas,
  PantallaDeEfecto,
  Punto,
  SalidaDeEfecto,
  SiluetaDeEfecto,
  SistemaDeEfectos,
  Sitio,
  VeredictoDelAnillo,
} from './sistema';

export {
  AMENAZAS,
  COLORES,
  COLOR_DE_LA_AMENAZA,
  SILUETAS,
  desalojoEn,
  impresionEn,
  salidaEn,
  trasvaseEn,
  parpadeoDelImpacto,
} from './cuentas';
export type { Amenaza, BalaDeEfecto, Silueta } from './cuentas';

export { NIVELES, PIEZAS, gastoDelNivel, topeDeLosEfectos } from './presupuesto';
export type { Nivel, Pieza } from './presupuesto';
