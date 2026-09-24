// LO QUE VERÁ EL JUEGO: carga lo que hay en escritorio/src/quiebro/recursos/ con el GLTFLoader de three
// del repositorio (sólo lectura), como hará el cliente, y mide:
//   · que cada pista de cada clip enlaza con un hueso por su nombre en CADA figura (una pista sin nodo
//     no avisa: el hueso se queda quieto);
//   · que el cargador no se queja (cuantización, extensiones) y que las mallas traen color por vértice
//     y los atributos que el reparto promete (`_zona` en LOD1 y LOD2);
//   · el punto más bajo de la malla deformada (applyBoneTransform, el skinning de three) en poses
//     críticas: tumbado, de rodillas, en el vuelo del quiebro, en la patada;
//   · que la pistola colgada de agarre_R apunta al frente desde la mano y que el paraguas queda sobre
//     la cabeza con la caña vertical.
//
//   node arte/forja/en_three.mjs      (escribe arte/forja/obra/en_three.json; sale con 1 si algo falla)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(AQUI, '..', '..');
const T3 = path.join(REPO, 'node_modules', 'three');
const THREE = await import(pathToFileURL(path.join(T3, 'build/three.module.js')).href);
const { GLTFLoader } = await import(pathToFileURL(path.join(T3, 'examples/jsm/loaders/GLTFLoader.js')).href);
// el MISMO descodificador que tiene que registrar el cliente (va dentro de three: WebAssembly en base64)
const { MeshoptDecoder } = await import(pathToFileURL(path.join(T3, 'examples/jsm/libs/meshopt_decoder.module.js')).href);
await MeshoptDecoder.ready;
const REC = process.env.REPARTO_SALIDA || path.join(REPO, 'escritorio', 'src', 'quiebro', 'recursos');
const OBRA = process.env.REPARTO_INFORMES || path.join(AQUI, 'obra');
fs.mkdirSync(OBRA, { recursive: true });

const avisos = [];
const w0 = console.warn;
console.warn = (...a) => { avisos.push(a.join(' ')); };
const e0 = console.error;
console.error = (...a) => { avisos.push('ERROR ' + a.join(' ')); };

function cargar(f) {
  const buf = fs.readFileSync(path.join(REC, f));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((ok, mal) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(ab, '', ok, mal));
}

const man = JSON.parse(fs.readFileSync(path.join(REC, 'reparto.json'), 'utf8'));
const fallos = [];
const out = { three: THREE.REVISION, figuras: {}, piezas: {} };

function minY(raiz, malla) {
  raiz.updateMatrixWorld(true);
  let y = 1e9;
  const v = new THREE.Vector3();
  malla.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 2) {
      v.fromBufferAttribute(pos, i);
      o.applyBoneTransform(i, v);
      v.applyMatrix4(o.matrixWorld);
      if (v.y < y) y = v.y;
    }
  });
  return +y.toFixed(4);
}

function poner(mixer, clips, nombre, t) {
  mixer.stopAllAction();
  const c = THREE.AnimationClip.findByName(clips, nombre);
  if (!c) return null;
  const a = mixer.clipAction(c);
  a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.play();
  mixer.setTime(Math.min(t, c.duration - 1e-4));
  return c;
}

const clips = {};
for (const [sexo, e] of Object.entries(man.esqueletos)) {
  avisos.length = 0;
  clips[sexo] = (await cargar(e.clips)).animations;
  if (avisos.length) fallos.push(`${e.clips}: avisos del cargador: ${avisos[0]}`);
  out[e.clips] = clips[sexo].map((c) => [c.name, +c.duration.toFixed(3), c.tracks.length]);
}

// poses donde la malla más se acerca al suelo: [clip, segundos]
const POSES = [['reposo', 0], ['caer', 0.6], ['derribado', 0.6], ['derribado-espalda', 0.5], ['desconectado', 0.5],
  ['levantarse', 0.1], ['desalojable', 0.5], ['absorber', 0.2], ['rescatar', 0.5], ['correr', 0.2], ['cierre', 0.34],
  ['quiebro-izquierda', 0.17], ['quiebro-delante', 0.2], ['entrada', 0.3], ['avance', 0.3], ['replica', 0.2]];

for (const [fam, ficha] of Object.entries(man.figuras)) {
  const sexo = ficha.esqueleto;
  for (const lod of ficha.lods) {
    avisos.length = 0;
    const g = await cargar(lod.archivo);
    const escena = g.scene;
    const r = { variantes: {} };
    if (avisos.length) fallos.push(`${lod.archivo}: avisos del cargador: ${avisos[0]}`);
    const conZona = !lod.archivo.endsWith(`${fam}.glb`);
    for (const v of Object.keys(ficha.variantes)) {
      const malla = escena.getObjectByName(v);
      if (!malla) { fallos.push(`${lod.archivo}: no hay malla ${v}`); continue; }
      // sólo la variante visible, como en el cliente
      for (const w of Object.keys(ficha.variantes)) { const o = escena.getObjectByName(w); if (o) o.visible = w === v; }
      const pieles = [];
      malla.traverse((o) => { if (o.isSkinnedMesh) pieles.push(o); });
      if (!pieles.length) { fallos.push(`${lod.archivo}/${v}: sin SkinnedMesh`); continue; }
      const rv = { primitivas: pieles.length, materiales: pieles.map((p) => [p.material.name, p.material.vertexColors]) };
      for (const p of pieles) {
        const at = p.geometry.attributes;
        if (!at.color || !p.material.vertexColors) fallos.push(`${lod.archivo}/${v}: ${p.material.name} sin color por vertice`);
        if (!at.normal || !at.skinIndex || !at.skinWeight) fallos.push(`${lod.archivo}/${v}: faltan atributos`);
        if (conZona && !at._zona) fallos.push(`${lod.archivo}/${v}: falta _zona`);
      }
      rv.agarre = !!escena.getObjectByName('agarre_R');
      if (!rv.agarre) fallos.push(`${lod.archivo}: sin agarre_R`);
      // enlace por nombre: todas las pistas de todos los clips
      const mixer = new THREE.AnimationMixer(escena);
      let enl = 0, tot = 0;
      for (const c of clips[sexo]) {
        const ac = mixer.clipAction(c);
        for (const b of ac._propertyBindings) { tot++; if (b.binding.node) enl++; }
      }
      rv.pistas = `${enl}/${tot}`;
      if (enl !== tot) fallos.push(`${lod.archivo}/${v}: ${tot - enl} pistas sin hueso`);
      // suelo en las poses críticas (en el LOD0 y en el LOD2, que es el que más se aparta)
      if (!lod.archivo.includes('-lod1')) {
        rv.minY = {};
        for (const [clip, t] of POSES) {
          if (!poner(mixer, clips[sexo], clip, t)) { fallos.push(`${sexo}: no esta el clip ${clip}`); continue; }
          const y = minY(escena, malla);
          rv.minY[`${clip}@${t}`] = y;
          // el LOD2 (1.000 triangulos) se aparta hasta 3 cm de la superficie del LOD0 (el horneado lo deja
          // bajar eso: ver animacion._suelo) y el maniquí LOD3 (400) algo más: sus topes son de 3,2 y 4 cm;
          // el del LOD0, de 1,2
          const tope = lod.archivo.includes('-lod3') ? -0.04 : (lod.archivo.includes('-lod2') ? -0.032 : -0.012);
          if (y < tope) fallos.push(`${lod.archivo}/${v}: ${clip}@${t} la malla baja a ${(100 * y).toFixed(1)} cm`);
        }
      }
      mixer.stopAllAction();
      r.variantes[v] = rv;
    }
    out.figuras[lod.archivo] = r;
  }
}

// ═══ LAS PIEZAS EN LA MANO ═══
async function enLaMano(fam, clip, t, pieza) {
  const g = await cargar(man.figuras[fam].lods[0].archivo);
  const p = (await cargar(man.piezas[pieza].archivo)).scene;
  const esc = g.scene;
  const sexo = man.figuras[fam].esqueleto;
  const mixer = new THREE.AnimationMixer(esc);
  poner(mixer, clips[sexo], clip, t);
  esc.getObjectByName('agarre_R').add(p);
  esc.updateMatrixWorld(true);
  const cabeza = new THREE.Vector3();
  esc.getObjectByName('cabeza').getWorldPosition(cabeza);
  // la geometria de verdad en el mundo (con lo que el fichero de la pieza traiga dentro): los extremos
  // de la malla a lo largo de un eje del agarre, no unos puntos supuestos
  const vs = [];
  p.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const loc = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      vs.push(loc);
    }
  });
  const inv = new THREE.Matrix4().copy(esc.getObjectByName('agarre_R').matrixWorld).invert();
  const extremo = (eje, signo) => {
    let mejor = null, mv = -1e9;
    for (const w of vs) {
      const l = w.clone().applyMatrix4(inv);
      const val = signo * l.getComponent(eje);
      if (val > mv) { mv = val; mejor = w; }
    }
    return mejor;
  };
  const mano = new THREE.Vector3();
  esc.getObjectByName('agarre_R').getWorldPosition(mano);
  return { cabeza, extremo, mano };
}
const r3 = (v) => v.toArray().map((x) => +x.toFixed(3));
{
  const { cabeza, extremo, mano } = await enLaMano('celador-hombre', 'apuntar', 0.3, 'pistola');
  // la boca es lo mas lejano de la pieza por el lado de los nudillos (+X del agarre), medido en su
  // geometria de verdad: de la mano a la boca va el canon
  const boca = extremo(0, 1);
  const dir = boca.clone().sub(mano).normalize();
  const delante = Math.hypot(boca.x - mano.x, boca.z - mano.z);
  out.piezas.pistola = { boca: r3(boca), mano: r3(mano), direccion: r3(dir), delanteDeLaMano: +delante.toFixed(3), cabeza: r3(cabeza) };
  // el personaje mira a +Z: el cañón al frente, a la altura del hombro y lejos del cuerpo
  if (dir.z < 0.8 || delante < 0.12) fallos.push(`pistola: el canon no sale de la mano hacia delante (direccion ${r3(dir)}, ${delante.toFixed(2)} m)`);
  if (boca.y < 1.25 || boca.y > 1.6) fallos.push(`pistola: la boca a ${boca.y.toFixed(2)} m (hombro 1,3-1,55)`);
  if (boca.z < 0.55) fallos.push(`pistola: la boca a ${boca.z.toFixed(2)} m delante (brazo estirado: mas de 0,55)`);
}
{
  const { cabeza, extremo, mano } = await enLaMano('durmiente-hombre', 'andar-paraguas', 0.2, 'paraguas');
  const punta = extremo(1, 1);
  const eje = punta.clone().sub(mano).normalize();
  const sobre = Math.hypot(punta.x - cabeza.x, punta.z - cabeza.z);
  out.piezas.paraguas = { punta: r3(punta), eje: r3(eje), cabeza: r3(cabeza), distanciaAlaCabeza: +sobre.toFixed(3) };
  if (eje.y < 0.9) fallos.push(`paraguas: la cana no va vertical (eje ${r3(eje)})`);
  if (punta.y < cabeza.y + 0.25) fallos.push(`paraguas: la tela no queda sobre la cabeza (punta a ${punta.y.toFixed(2)} m)`);
  if (sobre > 0.35) fallos.push(`paraguas: el centro queda a ${sobre.toFixed(2)} m de la cabeza (tela de 0,52 de radio)`);
}

console.warn = w0;
console.error = e0;
out.bytes = man.bytes;
out.fallos = fallos;
fs.writeFileSync(path.join(OBRA, 'en_three.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ three: out.three, piezas: out.piezas, pistas: Object.fromEntries(Object.entries(out.figuras).map(([k, v]) =>
  [k, Object.fromEntries(Object.entries(v.variantes).map(([vv, x]) => [vv, x.pistas]))])), fallos }, null, 1));
process.exit(fallos.length ? 1 : 0);
