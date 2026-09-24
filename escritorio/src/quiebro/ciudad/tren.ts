/**
 * EL TREN ELEVADO que cruza la plaza cada ~40 s: sale de una fachada y se mete en la de enfrente.
 *
 * ═══ EL HORARIO NO ES DE AQUÍ ═══
 *
 * Dónde va el tren lo dice el barrio (`trenEn(barrio, tic)`, a 12 m/s con su desfase sembrado) y
 * llega aquí en `TrenDelPlano.enTic`: todos los aparatos ven pasar el mismo tren en el mismo tic.
 * Aquí sólo se pinta. El barrio recorta la cabeza y la cola a lo que se ve entre las dos fachadas;
 * el tren de verdad es más largo que lo recortado cuando está entrando o saliendo, así que se
 * reconstruye su frente (la cola + el largo, o la cabeza si no está recortada) y se pinta entero:
 * lo que queda dentro del edificio lo tapa la fachada, con la boca negra de la vía.
 *
 * Tres coches de 12 m, de aluminio, con la banda de ventanas encendida (la luz fría de un vagón de
 * madrugada), los faros delante y los pilotos rojos detrás. Dos mallas: la caja con el material del
 * mobiliario y las luces con el emisivo.
 */
import * as THREE from 'three';
import { Molde } from './geometria';
import { ACABADO, ATRIBUTOS_DE_LO_EMISIVO, ATRIBUTOS_DEL_MOBILIARIO, lineal } from './materiales';
import type { TrenDelPlano } from './tipos';

/** Lo que sube el coche sobre la cara de arriba de la viga (petos y carriles). */
const SOBRE_LA_VIGA = 1.02;
const COCHES = 3;

function geometrias(largo: number): { cuerpo: THREE.BufferGeometry; luces: THREE.BufferGeometry } {
  const mo = new Molde(ATRIBUTOS_DEL_MOBILIARIO, true);
  const em = new Molde(ATRIBUTOS_DE_LO_EMISIVO, true);
  const largoCoche = largo / COCHES;
  em.poner('aEmisor', 0, 0);
  for (let i = 0; i < COCHES; i++) {
    const x1 = -i * largoCoche - 0.25;
    const x0 = -(i + 1) * largoCoche + 0.25;
    const cabeza = i === 0;
    const cola = i === COCHES - 1;
    const aluminio = lineal(0x8e9396);
    mo.color(aluminio[0], aluminio[1], aluminio[2]);
    mo.poner('aAcabado', ACABADO.chapa[0], 0.8);
    const perfil: [number, number][] = [
      [x0, 0.4],
      [x1, 0.4],
      [x1, cabeza ? 2.2 : 2.95],
      [cabeza ? x1 - 0.9 : x1 - 0.2, 3.2],
      [cola ? x0 + 0.6 : x0 + 0.2, 3.2],
      [x0, cola ? 2.6 : 2.95],
    ];
    mo.perfil(perfil, -1.45, 1.45);
    /* Bogies y faldón. */
    const oscuro = lineal(0x151617);
    mo.color(oscuro[0], oscuro[1], oscuro[2]);
    mo.poner('aAcabado', ACABADO.hierroViejo[0], ACABADO.hierroViejo[1]);
    for (const b of [x0 + 2.2, x1 - 2.2]) mo.caja(b - 1.2, 0, -1.2, b + 1.2, 0.42, 1.2, 'nseoa');
    /* La banda de ventanas, por los dos lados, un milímetro fuera de la caja. */
    for (let x = x0 + 1.2; x + 1.3 < x1 - 0.8; x += 1.75) {
      em.color(1.25, 1.35, 1.2);
      for (const lado of [-1, 1]) {
        const z = lado * 1.452;
        if (lado > 0) em.quad([x, 1.35, z], [x + 1.3, 1.35, z], [x + 1.3, 2.3, z], [x, 2.3, z], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
        else em.quad([x + 1.3, 1.35, z], [x, 1.35, z], [x, 2.3, z], [x + 1.3, 2.3, z], [0, 0, -1], [0, 0, 1, 0, 1, 1, 0, 1]);
      }
    }
    /* La tira de luz baja, de lado a lado. */
    em.color(0.2, 1.4, 1.1);
    em.caja(x0 + 0.3, 0.55, -1.455, x1 - 0.3, 0.6, 1.455, 'ns');
    if (cabeza) {
      em.color(5, 5, 4.6);
      for (const lado of [-0.8, 0.8]) em.caja(x1, 0.9, lado - 0.15, x1 + 0.02, 1.1, lado + 0.15, 'e');
    }
    if (cola) {
      em.color(3, 0.1, 0.05);
      for (const lado of [-0.8, 0.8]) em.caja(x0 - 0.02, 0.9, lado - 0.12, x0, 1.05, lado + 0.12, 'o');
    }
  }
  return { cuerpo: mo.geometria(), luces: em.geometria() };
}

export class Tren {
  readonly mallas: THREE.Mesh[];
  private readonly grupo: THREE.Mesh[];
  private readonly plano: TrenDelPlano;

  constructor(plano: TrenDelPlano, materialCuerpo: THREE.Material, materialLuces: THREE.Material, sombras: boolean) {
    this.plano = plano;
    const g = geometrias(plano.largo);
    const cuerpo = new THREE.Mesh(g.cuerpo, materialCuerpo);
    cuerpo.name = 'coches';
    cuerpo.castShadow = sombras;
    const luces = new THREE.Mesh(g.luces, materialLuces);
    luces.name = 'ventanas';
    this.mallas = [cuerpo, luces];
    this.grupo = [cuerpo, luces];
    for (const m of this.grupo) {
      m.visible = false;
      m.matrixAutoUpdate = false;
    }
  }

  /** Coloca el tren en el tic del barrio (20 Hz). */
  actualizar(tic: number): void {
    const t = this.plano;
    const donde = t.enTic(tic);
    if (donde === null || Math.abs(donde.cabeza - donde.cola) < 0.01) {
      for (const m of this.grupo) m.visible = false;
      return;
    }
    const sentido = donde.cabeza > donde.cola ? 1 : -1;
    const frente =
      sentido > 0
        ? donde.cabeza < t.hasta - 1e-6
          ? donde.cabeza
          : donde.cola + t.largo
        : donde.cabeza > t.desde + 1e-6
          ? donde.cabeza
          : donde.cola - t.largo;
    const y = t.alto + SOBRE_LA_VIGA;
    const m = new THREE.Matrix4();
    if (t.eje === 'x') {
      m.makeRotationY(sentido > 0 ? 0 : Math.PI).setPosition(frente, y, t.linea);
    } else {
      m.makeRotationY(sentido > 0 ? -Math.PI / 2 : Math.PI / 2).setPosition(t.linea, y, frente);
    }
    for (const malla of this.grupo) {
      malla.visible = true;
      malla.matrix.copy(m);
      malla.matrixWorldNeedsUpdate = true;
    }
  }

  liberar(): void {
    for (const m of this.grupo) m.geometry.dispose();
  }
}
