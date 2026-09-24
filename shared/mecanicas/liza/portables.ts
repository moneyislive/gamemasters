/**
 * LO QUE SE LLEVA (declaración N): montones en el suelo, recoger pasando, soltarlo todo al caer y
 * cobrarlo al salir. Es una pieza de `sala.ts`.
 *
 * ═══ NADA SE CREA NI SE DESTRUYE SIN DECIRLO ═══
 *
 * Un portable sólo NACE cuando una entidad rematada suelta su `suelta` en un montón, y sólo se VA de
 * cuatro maneras: cobrado al salir, en un montón que caduca, en un montón que el aforo echa, o disuelto
 * al acabar el encuentro. Entre medias pasa de montón a asiento (`recoge`) y de asiento a montón (al
 * caer), siempre entero. Así `verify:liza` puede sumar en cada tic lo que hay en los asientos, en los
 * montones, lo cobrado y lo perdido, y exigir que dé lo soltado: una esquirla que aparece o desaparece
 * sin suceso es una esquirla que un aparato pinta y otro no.
 */
import type { CargaDePortable, ReglasDeAsiento } from './declaracion';
import { pagoDelPortable } from './declaracion';
import { dentroDelRadio } from './geometria';
import { aCentesimas, MOTIVO_DE_IRSE } from './protocolo';
import type { MontonDeLaSala } from './tipos-de-la-sala';
import { contar, ensuciarCarga, ensuciarCuenta, nuevoNumero } from './paso-en-curso';
import type { AsientoEnCurso, PasoEnCurso } from './paso-en-curso';
import { por } from '../fijo';

/** Cuántos lleva un asiento de un portable. */
export function llevaDe(a: AsientoEnCurso, portable: number): number {
  for (const c of a.lleva) if (c.portable === portable) return c.n;
  return 0;
}

/** Pone lo que lleva un asiento de un portable (copiando la lista: la del estado de antes no se toca). */
export function ponerLleva(p: PasoEnCurso, a: AsientoEnCurso, portable: number, n: number): void {
  const nueva: CargaDePortable[] = [];
  let puesto = false;
  for (const c of a.lleva) {
    if (c.portable === portable) {
      nueva.push({ portable, n });
      puesto = true;
    } else nueva.push(c);
  }
  if (!puesto) nueva.push({ portable, n });
  a.lleva = nueva;
  ensuciarCarga(p, a.numero);
}

/**
 * SUELTA UN MONTÓN de `n` del portable en `(x, z)`. Si ya no caben más montones (el aforo), se va antes
 * el que caducaba antes —empate, el de número menor—: el aforo es un tope, no una sugerencia.
 */
export function soltarMonton(p: PasoEnCurso, portable: number, n: number, x: number, z: number): void {
  if (n <= 0) return;
  const po = p.indices.portables[portable];
  if (po === undefined) return;
  if (p.declaracion.aforo.montones <= 0) return;
  while (p.montones.length >= p.declaracion.aforo.montones) {
    let echar = 0;
    for (let i = 1; i < p.montones.length; i++) {
      const m = p.montones[i] as MontonDeLaSala;
      const e = p.montones[echar] as MontonDeLaSala;
      if (m.hastaTic < e.hastaTic || (m.hastaTic === e.hastaTic && m.numero < e.numero)) echar = i;
    }
    const fuera = p.montones[echar] as MontonDeLaSala;
    contar(p, 0, { e: 'seva', id: fuera.numero, por: MOTIVO_DE_IRSE.caduca, quien: 0 });
    p.montones.splice(echar, 1);
  }
  const numero = nuevoNumero(p);
  const m: MontonDeLaSala = { numero, portable, n, x, z, hastaTic: p.k + po.montonTics };
  p.montones.push(m);
  contar(p, 0, { e: 'monton', id: numero, p: portable, n, x: aCentesimas(x), z: aCentesimas(z) });
}

/** Los montones que llegaron a su tic se van (al EMPEZAR ese tic: ver `MontonDeLaSala.hastaTic`). */
export function caducarMontones(p: PasoEnCurso): void {
  let i = 0;
  while (i < p.montones.length) {
    const m = p.montones[i] as MontonDeLaSala;
    if (p.k >= m.hastaTic) {
      contar(p, 0, { e: 'seva', id: m.numero, por: MOTIVO_DE_IRSE.caduca, quien: 0 });
      p.montones.splice(i, 1);
    } else i++;
  }
}

/**
 * RECOGER PASANDO: cada asiento en pie a `radioDeRecogida` o menos de un montón coge lo que le quepa
 * hasta su tope, por orden de número; lo que no cabe se queda en el montón. Un montón vacío ya no está
 * (`recoge` con `queda` 0 lo dice).
 */
export function recogerMontones(p: PasoEnCurso): void {
  let i = 0;
  while (i < p.montones.length) {
    let m = p.montones[i] as MontonDeLaSala;
    const po = p.indices.portables[m.portable];
    if (po === undefined) {
      i++;
      continue;
    }
    for (const a of p.asientos) {
      if (m.n <= 0) break;
      if (!a.conCuerpo || a.vida <= 0) continue;
      if (!dentroDelRadio(a.x - m.x, a.z - m.z, po.radioDeRecogida)) continue;
      const lleva = llevaDe(a, m.portable);
      const cabe = po.tope - lleva;
      if (cabe <= 0) continue;
      const coge = cabe < m.n ? cabe : m.n;
      ponerLleva(p, a, m.portable, lleva + coge);
      m = { ...m, n: m.n - coge };
      contar(p, 0, { e: 'recoge', id: m.numero, a: a.numero, n: coge, queda: m.n });
    }
    if (m.n <= 0) p.montones.splice(i, 1);
    else {
      p.montones[i] = m;
      i++;
    }
  }
}

/** AL QUEDARSE SIN VIDA se le cae todo lo que lleva, un montón por portable, donde está. */
export function dejarCaerLoQueLleva(p: PasoEnCurso, a: AsientoEnCurso): void {
  for (const c of a.lleva) {
    if (c.n <= 0) continue;
    soltarMonton(p, c.portable, c.n, a.x, a.z);
  }
  let habia = false;
  for (const c of a.lleva) if (c.n > 0) habia = true;
  if (!habia) return;
  const vacia: CargaDePortable[] = [];
  for (const c of a.lleva) vacia.push({ portable: c.portable, n: 0 });
  a.lleva = vacia;
  ensuciarCarga(p, a.numero);
}

/**
 * AL SALIR SE COBRA: cada portable vale su pago (`pagoDelPortable`) por el factor y el multiplicador
 * del asiento, como cualquier otra suma de puntos; se apunta en `cobrado` y quien sale se queda sin él.
 */
export function cobrarAlSalir(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento): void {
  let cobrado = a.contadores.cobrado;
  let algo = false;
  for (const c of a.lleva) {
    if (c.n <= 0) continue;
    const po = p.indices.portables[c.portable];
    if (po === undefined) continue;
    sumarPuntos(p, a, reglas, pagoDelPortable(po, c.n));
    const nuevo: CargaDePortable[] = [];
    let puesto = false;
    for (const k of cobrado) {
      if (k.portable === c.portable) {
        nuevo.push({ portable: c.portable, n: k.n + c.n });
        puesto = true;
      } else nuevo.push(k);
    }
    if (!puesto) nuevo.push({ portable: c.portable, n: c.n });
    cobrado = nuevo;
    algo = true;
  }
  if (!algo) return;
  a.contadores.cobrado = cobrado;
  const vacia: CargaDePortable[] = [];
  for (const c of a.lleva) vacia.push({ portable: c.portable, n: 0 });
  a.lleva = vacia;
  ensuciarCarga(p, a.numero);
}

/**
 * SUMA PUNTOS A UN ASIENTO: `por(por(base, factor), multiplicador)` —dos truncados, en ese orden, los
 * de `PuntosDeclarados`—.
 */
export function sumarPuntos(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, base: number): void {
  if (base <= 0) return;
  a.puntos += por(por(base, reglas.puntos.factor), a.multiplicador);
  ensuciarCuenta(p, a.numero);
}

/** Suma medidor, sin pasar de su tope. */
export function sumarMedidor(p: PasoEnCurso, a: AsientoEnCurso, reglas: ReglasDeAsiento, n: number): void {
  if (n <= 0) return;
  const lleno = a.medidor + n;
  a.medidor = lleno > reglas.medidor.tope ? reglas.medidor.tope : lleno;
  ensuciarCuenta(p, a.numero);
}
