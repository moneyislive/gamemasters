/**
 * La llamada al servidor que usan los mandos de la partida en vivo.
 *
 * Estaba dentro de `LivePanel` y ha salido aquí porque ahora la usan dos: el
 * panel general y el de la Momia. Importarla del panel habría creado un ciclo
 * —el panel importa el de la Momia y el de la Momia importaría el panel— y los
 * ciclos entre módulos son de las cosas que fallan raro y tarde.
 *
 * Devuelve el `error` del servidor tal cual, que viene en español y escrito
 * para quien lo va a leer, en vez de un código HTTP.
 */
const BASE = '/api';

export async function llamar<T>(ruta: string, metodo = 'POST', cuerpo?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await res.text();
  const datos = texto ? JSON.parse(texto) : {};
  if (!res.ok) {
    /*
     * EL ESTADO VIAJA CON EL ERROR. Sin el, quien llama no puede distinguir «esta
     * partida ya no esta en juego» (404, legitimo) de «el servidor tuvo un mal
     * momento» (500, 503), y el puesto de mando trataba los dos igual: se
     * vaciaba y ofrecia abrir la sala en mitad de una velada. Y 503 no es
     * hipotetico — es lo que responde el guardian de acceso cuando no puede
     * comprobar la admision, que falla cerrado a proposito.
     */
    const fallo = new Error(datos.error ?? `Error ${res.status}`) as Error & { estado?: number };
    fallo.estado = res.status;
    throw fallo;
  }
  return datos as T;
}
