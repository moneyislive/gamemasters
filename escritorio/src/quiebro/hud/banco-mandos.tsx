/**
 * EL BANCO DE LOS MANDOS (`banco-mandos.html`): los botones de la pelea y la mira del rayo, pintados con los
 * componentes DE VERDAD (`MandosTactiles`, `MiraDelRayo`, `RayoDePC`) sobre una partida de mentira que dice lo
 * que pide la dirección. Para las fotos y el ojo; lo que decide cada estado lo prueba `verify:quiebro-juego`.
 *
 * En la dirección (todo opcional):
 *   ?nivel=0..3               el `data-nivel` de la raíz (N0 sin sombras ni halos)
 *   ?zurdo=1                  los mandos en espejo
 *   ?pc=1                     el HUD de PC (el rayo abajo a la izquierda y la ayuda de teclas), sin táctil
 *   ?pulsados=golpe,rayo      esos botones hundidos; ?onda=MS congela su onda en ese instante (110)
 *   ?apagados=empellon        esos botones apagados (no se puede ahora)
 *   ?recarga=empellon:0.6,rayo:0.35   la parte de la recarga que falta (3 s el Empellón, 5 s el rayo)
 *   ?amenaza=0.7              un golpe viene hacia mí: QUIEBRO encendido (por dónde va el anillo, 0..1)
 *   ?ruptura=1                QUIEBRO con la ruptura (tocado y con Foco)
 *   ?tanda=2&ventana=1        el paso de la Tanda en GOLPE, y el siguiente latiendo
 *   ?usar=rematar&usarProgreso=0.4   USAR visible, con su rótulo y su anillo
 *   ?carga=0.5                el rayo cargando (la mira sale con él)
 *   ?area=2&dist=10           el área del nivel (m) y a qué distancia está lo apuntado (m)
 *   ?blanco=1&blancoEn=MS     con un blanco enganchado, que se fija a los MS de abrir (su tensión)
 *   ?sinRayo=1                un asiento sin tiro (el botón no está)
 *   ?fondo=calle|oscuro       lo que se ve detrás (una calle de noche sugerida, o negro)
 *   ?letra=ancha              los rótulos con una letra de reserva ANCHA (Arial, como un teléfono sin letra
 *                             estrecha): para ver que `ajustarElRotulo` los deja dentro del aro
 */
import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { EstadoDeLosMandos } from '../mandos/estado';
import { MandosTactiles } from '../mandos/Tactil';
import { estadoDelRayoApagado } from '../rayo/contrato';
import { botonesNuevos } from '../red/partida';
import type { Partida } from '../red/partida';
import { MiraDelRayo } from './MiraDelRayo';
import { RayoDePC } from './RayoDePC';
import './hud.css';

declare const __ARBOL_DEL_QUIEBRO__: string;

const q = new URLSearchParams(window.location.search);
const numero = (clave: string, siNo: number): number => {
  const v = Number(q.get(clave));
  return q.has(clave) && Number.isFinite(v) ? v : siNo;
};
const lista = (clave: string): string[] => (q.get(clave) ?? '').split(',').filter((x) => x.length > 0);

const nivel = Math.max(0, Math.min(3, Math.round(numero('nivel', 2))));
const zurdo = q.get('zurdo') === '1';
const pc = q.get('pc') === '1';
const conRayo = q.get('sinRayo') !== '1';
const carga = q.has('carga') ? Math.max(0, Math.min(1, numero('carga', 0))) : null;
/* Las `c` de los niveles del tiro de juguete (0, 300, 750 y 1.300 ms de 1.300). */
const UMBRALES = [0, 300 / 1300, 750 / 1300, 1] as const;
const nivelDeC = (c: number): number => {
  let n = 1;
  for (let i = 0; i < UMBRALES.length; i++) if (c >= (UMBRALES[i] as number)) n = i + 1;
  return n;
};

const botones = botonesNuevos();
botones.activos = true;
botones.golpe.listo = true;
botones.golpe.de = 4;
botones.golpe.paso = Math.max(0, Math.min(4, Math.round(numero('tanda', 0))));
botones.golpe.ventana = q.get('ventana') === '1';
botones.quiebro.listo = true;
botones.quiebro.ruptura = q.get('ruptura') === '1';
botones.quiebro.amenaza = q.has('amenaza') ? Math.max(0, Math.min(1, numero('amenaza', 0))) : -1;
botones.empellon.listo = true;
botones.rayo.hay = conRayo;
botones.rayo.listo = true;
botones.rayo.umbrales = UMBRALES;
for (const par of lista('recarga')) {
  const [quien, cuanto] = par.split(':');
  const f = Math.max(0, Math.min(1, Number(cuanto)));
  if (quien === 'empellon') {
    botones.empellon.recarga = f;
    botones.empellon.quedaMs = f * 3000;
    botones.empellon.listo = f <= 0;
  }
  if (quien === 'rayo') {
    botones.rayo.recarga = f;
    botones.rayo.quedaMs = f * 5000;
    botones.rayo.listo = f <= 0;
  }
}
for (const quien of lista('apagados')) {
  if (quien === 'golpe') botones.golpe.listo = false;
  if (quien === 'quiebro') botones.quiebro.listo = false;
  if (quien === 'empellon') botones.empellon.listo = false;
  if (quien === 'rayo') botones.rayo.listo = false;
}
if (carga !== null) {
  botones.rayo.cargando = true;
  botones.rayo.c = carga;
  botones.rayo.nivel = nivelDeC(carga);
}

const dist = Math.max(1, numero('dist', 10));
const rayo = estadoDelRayoApagado();
if (carga !== null) {
  rayo.activo = true;
  rayo.desdeMs = 0;
  rayo.c = carga;
  rayo.nivel = nivelDeC(carga);
  rayo.area = Math.max(0, numero('area', [3, 2, 1, 0][rayo.nivel - 1] ?? 0));
  rayo.alcance = 45;
  rayo.apuntado.x = 0;
  rayo.apuntado.y = 1.25;
  rayo.apuntado.z = -dist;
}
const conBlanco = q.get('blanco') === '1';
if (conBlanco && !q.has('blancoEn')) rayo.blanco = 99;
if (conBlanco && q.has('blancoEn')) {
  setTimeout(() => {
    rayo.blanco = 99;
  }, numero('blancoEn', 0));
}
const uso = q.has('usar') ? { que: (q.get('usar') ?? 'rematar') as 'rematar' | 'rescatar' | 'descolgar', accion: 1, blanco: 0, mantenerMs: 1000 } : null;

const falsa = {
  rayo,
  seHaMovido: true,
  ultimoDisparo: null,
  leerLosBotones: () => botones,
  usoPosible: () => uso,
  progresoDeUsar: () => (uso === null ? null : Math.max(0, Math.min(1, numero('usarProgreso', 0)))),
  pintadoDe: (n: number) => (n === 99 ? { x: 0, z: -dist } : null),
  tiroPropio: () => (conRayo ? {} : null),
} as unknown as Partida;

if (q.get('letra') === 'ancha') {
  const hoja = document.createElement('style');
  hoja.textContent = '.q-tecla .rotulo { font-family: Arial, sans-serif !important; font-stretch: 100% !important; }';
  document.head.appendChild(hoja);
}

const mandos = new EstadoDeLosMandos();
mandos.tipo = pc ? 'teclado' : 'tactil';
if (carga !== null) mandos.rayoDesde = 0;

function Banco(): JSX.Element {
  const ojo = useRef<THREE.Camera | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  /* La cámara del banco: en el ojo del jugador, mirando de frente a lo apuntado, con el zoom de la carga. */
  if (ojo.current === null) {
    const cam = new THREE.PerspectiveCamera(75 - 10 * (carga === null ? 0 : 0.25 + 0.75 * carga ** 1.5), window.innerWidth / Math.max(1, window.innerHeight), 0.1, 900);
    cam.position.set(0, 1.25, 0);
    cam.lookAt(0, 1.25, -10);
    cam.updateMatrixWorld();
    ojo.current = cam;
  }
  useEffect(() => {
    for (const quien of lista('pulsados')) raiz.current?.querySelector(`.q-tecla.${quien}`)?.classList.add('pulsada');
    /* La onda del pulsado, congelada en su instante (una foto no ve una animación de 340 ms). */
    const onda = numero('onda', 110);
    const id = setTimeout(() => {
      for (const a of document.getAnimations()) {
        const nombre = (a as CSSAnimation).animationName ?? '';
        if (nombre === 'q-onda') {
          a.pause();
          a.currentTime = onda;
        }
      }
    }, 60);
    return () => clearTimeout(id);
  }, []);
  const fondo = q.get('fondo') ?? 'calle';
  const arbol = typeof __ARBOL_DEL_QUIEBRO__ === 'string' ? __ARBOL_DEL_QUIEBRO__ : '?';
  return (
    <div ref={raiz} className="quiebro-raiz" data-nivel={nivel}>
      <div
        className="quiebro-lienzo"
        style={{
          background:
            fondo === 'oscuro'
              ? '#020605'
              : 'radial-gradient(60% 45% at 22% 38%, rgba(255,160,60,0.22), rgba(255,160,60,0) 70%), radial-gradient(40% 30% at 78% 30%, rgba(63,242,194,0.10), rgba(63,242,194,0) 70%), linear-gradient(180deg, #0b1418 0%, #0a1113 48%, #161a17 49%, #0d100f 100%)',
        }}
      />
      <div className="quiebro-hud">
        {pc ? null : <MandosTactiles mandos={mandos} partida={falsa} zurdo={zurdo} />}
        <MiraDelRayo partida={falsa} ojo={ojo} />
        {pc ? (
          <>
            <RayoDePC partida={falsa} />
            <div className="q-teclas">
              <kbd>WASD</kbd> moverse · <kbd>⇧</kbd> correr
              <br />
              <kbd>R</kbd> mantén: rayo · suelta: dispara
            </div>
          </>
        ) : null}
      </div>
      <div id="banco-arbol" data-arbol={arbol} data-listo="1" style={{ display: 'none' }} />
    </div>
  );
}

const donde = document.getElementById('raiz');
if (donde !== null) createRoot(donde).render(<Banco />);
