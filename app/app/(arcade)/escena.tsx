/**
 * El mueble `escena`, que todavía no se pinta. Ver `app/src/arcade/pendiente.tsx`
 * para por qué esta ruta existe y por qué hoy no se puede llegar a ella.
 */
import { MueblePendiente } from '../../src/arcade/pendiente';

export default function Mueble(): JSX.Element {
  return <MueblePendiente mueble="escena" />;
}
