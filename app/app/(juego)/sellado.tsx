/**
 * ANDAMIO. La pantalla «sellado» de El Misterio de la Momia.
 *
 * Existe para que el paquete compile: `PANTALLAS` en `_layout.tsx` es un
 * `Record` sobre `PantallaDeApp` y no admite huecos —lo cual es correcto: una
 * pestaña declarada sin pantalla saldría en blanco la noche de la partida y
 * nadie se enteraría antes.
 *
 * La de verdad se escribe en la tarea de la app. Mientras tanto, esto DICE que
 * está sin escribir en vez de fingir que funciona.
 */
import { Cargando, Cuerpo, Etiqueta, Marco, Pantalla, Titulo, espacio } from '../../src/ui';
import { usePartida } from '../../src/estado';

export default function Pendiente(): JSX.Element {
  const { vista } = usePartida();
  if (!vista) return <Pantalla><Cargando /></Pantalla>;
  return (
    <Pantalla>
      <Titulo>En obras</Titulo>
      <Marco>
        <Etiqueta>sellado</Etiqueta>
        <Cuerpo style={{ marginTop: espacio.sm }}>
          Esta pantalla forma parte de El Misterio de la Momia y todavía no está
          escrita.
        </Cuerpo>
      </Marco>
    </Pantalla>
  );
}
