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
  if (!res.ok) throw new Error(datos.error ?? `Error ${res.status}`);
  return datos as T;
}
