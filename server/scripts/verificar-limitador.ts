/**
 * ¿EL LIMITADOR FRENA DE VERDAD A QUIEN ENUMERA?
 *
 * ═══ POR QUÉ ESTE COMPROBADOR NO EXISTÍA, Y QUÉ COSTÓ ═══
 *
 * La regla del perdón —«un acierto borra lo anterior»— llevaba escrita desde el
 * principio, con su razonamiento, y NADIE la ejercitaba: el único guión que toca
 * el limitador es `verify:aguante`, que es la prueba de carga y está fuera de la
 * batería a propósito. Así que una regla de seguridad vivía en un comentario.
 *
 * El agujero que tenía dentro: el acierto borraba TAMBIÉN el cubo por dirección,
 * que es el único que ve una enumeración. Con eso, quien quisiera adivinar
 * códigos de mesa metía una lectura de su propia mesa cada cincuenta y nueve
 * intentos y el contador volvía a cero para siempre. El razonamiento escrito
 * justifica perdonar ESA credencial —acertar dice algo sobre ella— y no dice nada
 * de las otras cincuenta y nueve contra las que se falló.
 *
 * Se prueba el middleware DIRECTAMENTE, con peticiones y respuestas de mentira:
 * no hace falta servidor, y así la comprobación habla del limitador y no de una
 * ruta que lo usa.
 */
import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { limitarIntentos } from '../src/puerta/limitador';

let hechas = 0;
const fallos: string[] = [];

function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(`${que}${detalle === undefined ? '' : ` — ${JSON.stringify(detalle)}`}`);
}

function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

/** Una respuesta de mentira que sabe lo justo: el estado y el `finish`. */
class RespuestaDeMentira extends EventEmitter {
  statusCode = 200;
  cabeceras = new Map<string, string>();
  setHeader(nombre: string, valor: string): this {
    this.cabeceras.set(nombre, valor);
    return this;
  }
  cuerpo: unknown = null;
  status(codigo: number): this {
    this.statusCode = codigo;
    return this;
  }
  json(datos: unknown): this {
    this.cuerpo = datos;
    /* Express termina la respuesta al serializar: aqui es donde salta `finish`. */
    this.emit('finish');
    return this;
  }
  /** Lo que hace Express al terminar de escribir. */
  terminar(codigo: number): void {
    this.statusCode = codigo;
    this.emit('finish');
  }
}

interface Resultado {
  /** ¿Le dejó pasar? */
  paso: boolean;
  /** Lo que tardó en dejarle pasar, en milisegundos de reloj de este proceso. */
  espera: number;
  estado: number;
}

/**
 * Una petición contra el limitador. `ip` viaja por la cabecera porque el
 * comprobador corre con el valor por defecto de `PROXY_DE_CONFIANZA`, donde el
 * peer manda: se finge un peer que no es el bucle local.
 */
async function pedir(
  puerta: ReturnType<typeof limitarIntentos>,
  ip: string,
  credencial: string,
  comoTermina: number,
): Promise<Resultado> {
  const req = {
    params: { codigo: credencial },
    headers: {},
    ips: [],
    ip,
    socket: { remoteAddress: ip },
  } as unknown as Request;
  const res = new RespuestaDeMentira();
  const empezó = Date.now();
  const dejo = await new Promise<boolean>((resolver) => {
    let contestado = false;
    res.on('finish', () => {
      if (!contestado) {
        contestado = true;
        resolver(false);
      }
    });
    puerta(req, res as unknown as Response, () => {
      contestado = true;
      resolver(true);
    });
  });
  const espera = Date.now() - empezó;
  if (dejo) res.terminar(comoTermina);
  return { paso: dejo, espera, estado: res.statusCode };
}

const puertaDeCodigos = (): ReturnType<typeof limitarIntentos> =>
  limitarIntentos({
    nombre: 'prueba de códigos',
    credencial: (req) => String((req.params as { codigo?: string }).codigo ?? ''),
    porCredencial: 30,
    porIp: 60,
    esFallo: (estado) => estado === 404,
  });

paso('Enumerar códigos distintos llena el cubo de la dirección');
{
  const puerta = puertaDeCodigos();
  let bloqueado = 0;
  for (let i = 0; i < 70; i++) {
    const r = await pedir(puerta, '203.0.113.7', `NOEXISTE${String(i)}`, 404);
    if (!r.paso) bloqueado++;
  }
  comprobar(
    'a los sesenta fallos contra códigos DISTINTOS, la puerta se cierra',
    bloqueado > 0,
    { bloqueadas: bloqueado },
  );
}

paso('Y un acierto propio NO lava lo que se falló contra otros');
{
  const puerta = puertaDeCodigos();
  /*
   * El ataque, tal cual: cincuenta y nueve inventados y una lectura de la mesa
   * propia, en bucle. Antes esto no llegaba nunca al tope.
   */
  let bloqueado = 0;
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    for (let i = 0; i < 25; i++) {
      const r = await pedir(puerta, '203.0.113.8', `INVENT${String(vuelta)}${String(i)}`, 404);
      if (!r.paso) bloqueado++;
    }
    await pedir(puerta, '203.0.113.8', 'LAMIA', 200);
  }
  comprobar(
    'EL ACIERTO NO BORRA EL CUBO DE LA DIRECCIÓN: enumerar sigue costando',
    bloqueado > 0,
    { bloqueadas: bloqueado },
  );
}

paso('Pero sí perdona la credencial propia, que es lo que el perdón promete');
{
  const puerta = puertaDeCodigos();
  /* Se falla contra el MISMO código casi hasta el tope, y luego se acierta. */
  for (let i = 0; i < 25; i++) await pedir(puerta, '198.51.100.3', 'MIMESA', 404);
  await pedir(puerta, '198.51.100.3', 'MIMESA', 200);
  /* Tras el acierto, ese mismo código vuelve a tener su cuenta a cero. */
  let paso5 = 0;
  for (let i = 0; i < 5; i++) {
    const r = await pedir(puerta, '198.51.100.3', 'MIMESA', 404);
    if (r.paso) paso5++;
  }
  comprobar(
    'quien teclea mal su código y acierta no arrastra nada de ESE código',
    paso5 === 5,
    { pasaron: paso5 },
  );
}

paso('Y a quien juega no le estorba: los aciertos no cuentan');
{
  const puerta = puertaDeCodigos();
  let todas = true;
  for (let i = 0; i < 200; i++) {
    const r = await pedir(puerta, '198.51.100.9', 'SUMESA', 200);
    if (!r.paso) todas = false;
  }
  comprobar('doscientas lecturas buenas seguidas pasan todas', todas);
}

console.log('');
if (fallos.length > 0) {
  console.log(`${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
  for (const f of fallos) console.log(`  ✗ ${f}`);
  console.log('');
}
if (hechas < 4) {
  console.error('Se han hecho menos comprobaciones de las que este guión tiene escritas.');
  process.exit(2);
}
if (fallos.length === 0) {
  console.log(`${hechas} comprobaciones`);
  console.log(
    '\nEl limitador frena a quien enumera y no estorba a quien juega: el cubo por' +
      ' dirección cuenta los fallos contra códigos distintos y NO se vacía con un' +
      ' acierto, que era por donde se colaba el oráculo de qué códigos existen.',
  );
  process.exit(0);
}
process.exit(1);
