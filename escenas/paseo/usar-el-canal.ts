/**
 * EL CANAL MONTADO EN UNA ESCENA: el gancho fino que abre el canal de la mesa, le da los tics del
 * paseo y le deja corregir a quien pasea.
 *
 * ═══ POR QUÉ ES FINO ═══
 *
 * Todo lo que decide algo —qué se manda, cuándo se reconecta, dónde se pinta a los demás— está en
 * `canal-de-botas.ts`, sin React, porque es lo único que se puede probar en Node. Aquí sólo se ata
 * su vida a la de la escena: se abre al montar, se cierra al desmontar, y se vuelve a abrir si
 * cambia la dirección, la llave o el asiento. Nada más cambia la conexión: los asientos con su
 * nombre y su color llegan en cada vuelta del sondeo de la mesa, y reabrir el socket por eso sería
 * desalojarse a uno mismo diez veces por minuto.
 *
 * ═══ EL PASEO Y EL CANAL SE NECESITAN EL UNO AL OTRO, Y NINGUNO VA PRIMERO ═══
 *
 * El paseo necesita el `alDarUnTic` del canal para darle los tics, y el canal necesita el
 * `corregir` del paseo para colocar a quien pasea. Uno de los dos tiene que llegar por una
 * referencia: es `corregir`, porque sólo se llama desde el socket —después de montar, siempre— y
 * porque el `corregir` del paseo es estable. `alDarUnTic` sale de aquí estable también, y reenvía
 * al canal que esté abierto en ese momento.
 *
 * Sin canal —una mesa `normal`— no se abre nada y `alDarUnTic` es `undefined`: el paseo no paga ni
 * una llamada por tic.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Andante } from '../../shared/mecanicas/mundo';
import { abrirElCanal } from './canal-de-botas';
import type { ClienteDelCanal, EstadoDelCanal, FabricaDeSockets, RelojDelCanal } from './canal-de-botas';
import type { EntradaDelTic } from './mandos';
import type { CanalDeBotas } from './mesa-de-botas';

export interface ElCanal {
  /** Para `usarElPaseo`: la costura (a). `undefined` sin canal. */
  readonly alDarUnTic: ((entrada: EntradaDelTic, sitio: Andante) => void) | undefined;
  /** El canal abierto, para leer dónde están los demás en cada fotograma. */
  readonly cliente: { readonly current: ClienteDelCanal | null };
  /** Quién sale en las fotos. Cambia cuando alguien llega o se va, no cuando se mueve. */
  readonly presentes: readonly string[];
  /** Lo último que dijo el canal de sí mismo. `null` sin canal. */
  readonly estado: EstadoDelCanal | null;
}

export function usarElCanal(
  canal: CanalDeBotas | undefined,
  corregir: { readonly current: (sitio: Andante) => void },
  inyectado?: { readonly WebSocket?: FabricaDeSockets; readonly reloj?: RelojDelCanal },
): ElCanal {
  const cliente = useRef<ClienteDelCanal | null>(null);
  const [presentes, ponerPresentes] = useState<readonly string[]>([]);
  const [estado, ponerEstado] = useState<EstadoDelCanal | null>(null);
  /* El aviso de fuera, siempre el de la última vuelta: puede llegar una función nueva en cada una. */
  const alCambiar = useRef(canal?.alCambiar);
  useEffect(() => {
    alCambiar.current = canal?.alCambiar;
  });

  const url = canal?.url ?? null;
  const llave = canal?.llave ?? null;
  const yo = canal?.yo ?? null;
  const fabrica = inyectado?.WebSocket;
  const reloj = inyectado?.reloj;

  useEffect(() => {
    if (url === null || llave === null) return;
    const abierto = abrirElCanal({
      url,
      llave,
      yo,
      corregir: (sitio) => corregir.current(sitio),
      alCambiar: (e) => {
        ponerEstado(e);
        alCambiar.current?.(e);
      },
      alCambiarLosPresentes: ponerPresentes,
      ...(fabrica === undefined ? {} : { WebSocket: fabrica }),
      ...(reloj === undefined ? {} : { reloj }),
    });
    cliente.current = abierto;
    return () => {
      abierto.cerrar();
      if (cliente.current === abierto) cliente.current = null;
      ponerPresentes([]);
      ponerEstado(null);
    };
  }, [url, llave, yo, corregir, fabrica, reloj]);

  const alDarUnTic = useCallback((entrada: EntradaDelTic, sitio: Andante): void => {
    cliente.current?.alDarUnTic(entrada, sitio);
  }, []);

  const conCanal = url !== null && llave !== null;
  return useMemo(
    () => ({ alDarUnTic: conCanal ? alDarUnTic : undefined, cliente, presentes, estado: conCanal ? estado : null }),
    [alDarUnTic, conCanal, estado, presentes],
  );
}
