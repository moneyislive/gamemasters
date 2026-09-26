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
 *
 * ═══ Y LA REFRIEGA LLEGA POR LOS MISMOS SITIOS ═══
 *
 * `QuienAnda` y `LosDemas` le preguntan al canal en cada fotograma cómo va cada uno
 * (`refriegaDe`, por `cliente`), y el paseo pregunta si quien pasea está en el suelo por `caido`,
 * estable como `alDarUnTic`. El `renace` propio pasa por la costura de corregir con un rumbo, así
 * que ésta reenvía los dos. Sin canal, `caido` dice siempre que no.
 *
 * ═══ Y LOS HALLAZGOS, POR REACT PORQUE CAMBIAN POCO ═══
 *
 * La lista de brotes cambia unas pocas veces por minuto —uno recogido, uno que vuelve a brotar—,
 * así que va en estado de React como `presentes`, y quien la pinta (`los-hallazgos.tsx`) sólo lee
 * números en el fotograma. El aviso de recoger (`alRecoger`, la prop pública de las tres escenas)
 * se llama siempre con la función de la última vuelta, como `alCambiar`: puede llegar una nueva en
 * cada una sin reabrir nada.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Andante } from '../../shared/mecanicas/mundo';
import { abrirElCanal } from './canal-de-botas';
import type { Brote, ClienteDelCanal, EstadoDelCanal, FabricaDeSockets, Recogida, RelojDelCanal } from './canal-de-botas';
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
  /** Para `usarElPaseo`: si quien pasea está en el suelo en la refriega. Estable; sin canal, nunca. */
  readonly caido: () => boolean;
  /** Lo que hay brotado ahora. Cambia con cada `brotes` y cada `recoge`: pocas veces por minuto. */
  readonly brotes: readonly Brote[];
}

/** El aviso de recoger que reciben las escenas: la forma de la prop pública `alRecoger`. */
export type AvisoDeRecoger = (r: { readonly por: string; readonly clase: string; readonly mio: boolean }) => void;

export function usarElCanal(
  canal: CanalDeBotas | undefined,
  corregir: { readonly current: (sitio: Andante, rumbo?: number) => void },
  alRecoger?: AvisoDeRecoger,
  inyectado?: { readonly WebSocket?: FabricaDeSockets; readonly reloj?: RelojDelCanal },
): ElCanal {
  const cliente = useRef<ClienteDelCanal | null>(null);
  const [presentes, ponerPresentes] = useState<readonly string[]>([]);
  const [estado, ponerEstado] = useState<EstadoDelCanal | null>(null);
  const [brotes, ponerBrotes] = useState<readonly Brote[]>([]);
  /* Los avisos de fuera, siempre los de la última vuelta: puede llegar una función nueva en cada una. */
  const alCambiar = useRef(canal?.alCambiar);
  const avisoDeRecoger = useRef(alRecoger);
  useEffect(() => {
    alCambiar.current = canal?.alCambiar;
    avisoDeRecoger.current = alRecoger;
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
      corregir: (sitio, rumbo) => corregir.current(sitio, rumbo),
      alCambiar: (e) => {
        ponerEstado(e);
        alCambiar.current?.(e);
      },
      alCambiarLosPresentes: ponerPresentes,
      alCambiarLosBrotes: ponerBrotes,
      alRecoger: (r: Recogida) => avisoDeRecoger.current?.(r),
      ...(fabrica === undefined ? {} : { WebSocket: fabrica }),
      ...(reloj === undefined ? {} : { reloj }),
    });
    cliente.current = abierto;
    return () => {
      abierto.cerrar();
      if (cliente.current === abierto) cliente.current = null;
      ponerPresentes([]);
      ponerEstado(null);
      ponerBrotes([]);
    };
  }, [url, llave, yo, corregir, fabrica, reloj]);

  const alDarUnTic = useCallback((entrada: EntradaDelTic, sitio: Andante): void => {
    cliente.current?.alDarUnTic(entrada, sitio);
  }, []);

  const caido = useCallback((): boolean => cliente.current?.caido() === true, []);

  const conCanal = url !== null && llave !== null;
  return useMemo(
    () => ({ alDarUnTic: conCanal ? alDarUnTic : undefined, cliente, presentes, estado: conCanal ? estado : null, caido, brotes }),
    [alDarUnTic, brotes, caido, conCanal, estado, presentes],
  );
}
