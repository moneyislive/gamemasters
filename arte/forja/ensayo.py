"""EL ENSAYO: hornear unos pocos clips sobre UNA figura y mirarlos, sin tocar lo que baja el juego.

    blender -b --factory-startup --python ensayo.py -- fig=desvelado-hombre-gabardina clips=seguida-1+cierre
            [vistas=juego,perfil,frente] [n=8] [fr=12-19] [salida=capturas/ensayo] [medir=1]

Abre el .blend de la figura (obra/tmp/<figura>/<figura>.blend, que deja la fase de figuras), hornea los
clips pedidos con la maquinaria de siempre (pasada de suelo sobre las nubes de su sexo, raíz, faldón) y
saca una tira por clip. Las vistas:

  · `juego`: la cámara del juego tal como la pone `escritorio/src/quiebro/camara/encuadre.ts` (3,2 m
    detrás, 1,7 m de alto, pivote en el pecho 0,45 m a la derecha, 75° de campo vertical, abierta a 4 m
    con enemigos cerca). Es desde donde se juzga un golpe: si no se lee aquí, no se lee.
  · `perfil`, `frente`, `tresq`: de lado, de frente y en tres cuartos, siguiendo a la cadera.

Con un blanco de 1,75 m a 1,1 m (el alcance de los golpes, `GOLPES.alcanceMetros`) delante de donde
acaba la raíz del clip: el golpe tiene que llegar a él. Con `medir=1` escribe además, por fotograma, la
posición del puño o el pie que golpea, las alturas de los pies y la de la cadera (json en la salida).

═══ POR QUÉ EXISTE ═══ Un horneado entero son dos minutos y una fase de capturas, cinco; ajustar una
guardia a ojo con ese ciclo son horas. Esto tarda lo que tarden los clips pedidos.
"""
import json
import math
import os
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import reparto  # noqa: E402

args = dict(a.split('=', 1) for a in (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []))
FIG = args.get('fig', 'desvelado-hombre-gabardina')
CLIPS = args.get('clips', 'guardia').split('+')
VISTAS = args.get('vistas', 'juego,perfil').split(',')
N = int(args.get('n', '8'))
# `ampliar=2`: las tiras al doble de resolución (para mirar de cerca una pose de la captura)
K = float(args.get('ampliar', '1'))
SAL = os.path.abspath(args.get('salida') or os.path.join(DIR, 'capturas', 'ensayo'))
os.makedirs(SAL, exist_ok=True)
OBRA = os.path.join(DIR, 'obra')

# Los golpes: qué hueso golpea (la cola del hueso: nudillos o punta del pie)
EFECTOR = {'entrada': 'mano_R', 'seguida-1': 'mano_L', 'seguida-2': 'mano_R', 'cierre': 'pie_R', 'empellon': 'mano_R',
           'replica': 'mano_R', 'respuesta': 'mano_R', 'golpe-de-prestado': 'mano_R', 'avance': 'mano_R',
           'rematar': 'mano_R', 'disparar': 'mano_R'}


def blanco(x, y):
    """Un maniquí de 1,75 m (el cuerpo del blanco: 0,2 m de radio) en (x, y)."""
    ob = bpy.data.objects.get('blanco')
    if ob is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.19, depth=1.3, location=(0, 0, 0.65))
        ob = bpy.context.active_object
        ob.name = 'blanco'
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(0, 0, 1.58))
        cab = bpy.context.active_object
        cab.parent = ob
        m = bpy.data.materials.new('blanco')
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.25, 0.08, 0.08, 1)
        ob.data.materials.append(m)
        cab.data.materials.append(m)
    ob.location = (x, y, 0.0)
    return ob


def main():
    import animacion
    import escena
    import imagen
    import malla
    ruta = os.path.join(OBRA, 'tmp', FIG, FIG + '.blend')
    bpy.ops.wm.open_mainfile(filepath=ruta)
    ficha = reparto.FIGURAS[FIG]
    arm = bpy.data.objects['esqueleto']
    var = ficha['variante']
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.name != var:
            o.hide_render = True
    ob0 = bpy.data.objects[var]
    malla.usar_color_en_render(list(ob0.data.materials))
    nubes = [os.path.join(OBRA, 'tmp', f, 'nube.npz') for f in reparto.NUBES_DEL_HORNEADO[ficha['sexo']]]
    nubes = [n for n in nubes if os.path.exists(n)]
    info = animacion.hornear_todo(arm, nubes=nubes, clips='+'.join(CLIPS), log=print)
    cam = escena.preparar(res=(360, 520), muestras=16, luz='tiras')
    escena.luces('tiras')
    # suelo mate: el mojado de las capturas reflejaba la luz de área como un panel blanco en la vista de juego
    suelo = bpy.data.objects.get('suelo')
    if suelo:
        suelo.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.8
    esc = ficha.get('escala', 1.0)
    arm.scale = (esc,) * 3
    medidas = {}
    for nombre in CLIPS:
        c = animacion.CLIPS[nombre]
        n_fr = c['frames']
        act = bpy.data.actions[nombre]
        arm.animation_data.action = act
        fin = info[nombre].get('raiz_final_blender', [0.0, 0.0])
        bl = blanco(fin[0] * esc, fin[1] * esc - 1.1)
        for o in [bl] + list(bl.children):
            o.hide_render = nombre not in EFECTOR
        imp = c.get('impacto')
        frs = sorted(set([round(i * n_fr / (N - 1)) for i in range(N)] + ([imp[0]] if imp else [])))
        if args.get('fr'):
            # un tramo concreto, fotograma a fotograma (fr=12-19): para ver de cerca un choque que marca la batería
            f0, f1 = [int(x) for x in args['fr'].split('-')]
            frs = list(range(max(0, f0), min(n_fr, f1) + 1))
        filas = []
        serie = []
        for fr in range(n_fr + 1):
            bpy.context.scene.frame_set(fr)
            pb = arm.pose.bones
            M = arm.matrix_world
            d = {'raiz': list(M @ pb['raiz'].head), 'caderas': list(M @ pb['caderas'].head), 'cabeza': list(M @ pb['cabeza'].head)}
            for s in 'LR':
                d['mano_' + s] = list(M @ pb['mano_' + s].tail)
                d['pie_' + s] = list(M @ pb['pie_' + s].head)
                d['punta_' + s] = list(M @ pb['punta_' + s].tail)
            if nombre in EFECTOR:
                d['efector'] = list(M @ pb[EFECTOR[nombre]].tail)
            serie.append({k: [round(x, 4) for x in v] for k, v in d.items()})
        medidas[nombre] = dict(info=info[nombre], serie=serie)
        for vista in VISTAS:
            fila = []
            for fr in frs:
                bpy.context.scene.frame_set(fr)
                h = arm.matrix_world @ arm.pose.bones['caderas'].head
                r = arm.matrix_world @ arm.pose.bones['raiz'].head
                sc = bpy.context.scene
                if vista == 'juego':
                    # el teléfono va apaisado: 16:9 con 75° de campo VERTICAL (el de three)
                    sc.render.resolution_x, sc.render.resolution_y = int(640 * K), int(360 * K)
                    escena.camara_juego(cam, r.x, r.y, 0.0, 3.2 if nombre not in EFECTOR else 4.0, esc)
                else:
                    sc.render.resolution_x, sc.render.resolution_y = int(360 * K), int(520 * K)
                    cam.data.sensor_fit = 'AUTO'
                    lado = {'perfil': 90, 'frente': 0, 'tresq': 35, 'espalda': 180}[vista]
                    escena.encuadrar(cam, centro=(h.x, h.y, 0.9 * esc), dist=4.2 * esc, alto_cam=1.2 * esc, lente=40, lado=lado)
                p = os.path.join(SAL, '_e_%s_%s_%d.png' % (nombre, vista, fr))
                im = escena.render(p)
                if vista == 'juego':
                    im = im[int(40 * K):int(340 * K), int(170 * K):int(470 * K)]   # el centro del encuadre: el cuerpo y el blanco
                fila.append(im)
                if not args.get('guardar'):
                    os.remove(p)
            filas.append(fila)
        imagen.guardar(imagen.mosaico(filas), os.path.join(SAL, '%s_%s.png' % (FIG, nombre)))
        print('ENSAYO', nombre, frs)
    if args.get('medir'):
        json.dump(medidas, open(os.path.join(SAL, 'medidas_%s.json' % FIG), 'w'), indent=1)


main()
