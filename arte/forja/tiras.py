"""Tiras de fotogramas por clip para juzgar las animaciones, y primeros planos de las manos.

═══ CÓMO SE MIRA CADA CLIP ═══

  · Locomoción: de perfil y en tres cuartos, en el sitio.
  · Golpes y guardia: desde la CÁMARA DE HOMBRO del juego (detrás y a la derecha, a 1,62 m) y en
    tres cuartos: el golpe tiene que leerse desde donde lo ve quien juega.
  · Lo que viaja (quiebros, Entrada, vuelo, Réplica): la cámara SIGUE a la cadera fotograma a
    fotograma, como la del juego, porque encuadrada en el centro del trayecto el cuerpo se sale.
  · Tumbado y de rodillas: de perfil y en tres cuartos, desde más lejos.

Las piezas aparte (pistola, paraguas, el auricular de la cabina) se cuelgan de agarre_R igual que
en el cliente, para ver que el puño las sujeta.
"""
import math
import os
import bpy
import bmesh
from mathutils import Vector, Matrix

import animacion
import escena
import imagen

LOCOMOCION = ('pasear', 'andar', 'trotar', 'correr', 'andar-paraguas')
LEJOS = ('caer', 'derribado', 'derribado-espalda', 'levantarse', 'desconectado', 'desalojable', 'absorber', 'rescatar')
COMBATE = ('guardia', 'guardia-celador', 'seguida-1', 'seguida-2', 'cierre', 'tocado', 'tocado-espalda', 'respuesta',
           'golpe-de-prestado', 'descolocado', 'apuntar', 'disparar', 'rematar', 'empellon', 'replica')
VIAJE = ('quiebro-izquierda', 'quiebro-derecha', 'quiebro-atras', 'quiebro-delante', 'quiebro-torpe', 'quiebro-torpe-derecha',
         'quiebro-torpe-atras', 'quiebro-torpe-delante', 'entrada', 'avance')
PIEZA_DE = {'apuntar': 'pistola', 'disparar': 'pistola', 'andar-paraguas': 'paraguas', 'descolgar': 'auricular',
            'salir': 'auricular'}

# qué clips se tiran por figura: todos en la gabardina del hombre (la que se mira entera); en el resto,
# lo propio de su clase (las tiras de las 18 figuras con los 46 clips eran dos horas de render)
TIRAS_DE = {
    'desvelado': ('guardia', 'correr', 'quiebro-izquierda', 'quiebro-delante', 'entrada', 'seguida-1', 'seguida-2', 'cierre',
                  'empellon', 'replica', 'derribado', 'rescatar', 'descolgar'),
    'celador': ('guardia-celador', 'seguida-1', 'respuesta', 'apuntar', 'disparar', 'imprimirse', 'desalojable', 'absorber',
                'trotar', 'derribado'),
    'durmiente': ('pasear', 'andar-paraguas', 'golpe-de-prestado', 'trotar', 'tocado', 'derribado', 'caer'),
}
TODAS_EN = ('desvelado-hombre-gabardina',)


def fotogramas(nombre, n=6):
    c = animacion.CLIPS[nombre]
    N = c['frames']
    if c['bucle']:
        return [round(i * N / n) for i in range(n)]
    imp = c.get('impacto')
    frs = [round(i * N / (n - 1)) for i in range(n)]
    if imp:
        frs[len(frs) // 2 - 1] = imp[0]
        frs = sorted(set(frs))
    return frs


def _cadera(arm, nombre, fr):
    animacion.poner_accion(arm, nombre, fr)
    p = arm.matrix_world @ arm.pose.bones['caderas'].head
    return (p.x, p.y)


def camara_hombro(cam, cx, cy, esc=1.0):
    """La cámara del juego (escena.camara_juego), abierta a 4 m como en una pelea."""
    escena.camara_juego(cam, cx, cy, 0.0, 4.0, esc)


def _al_agarre(arm, ob):
    """Cuelga `ob` (en coordenadas glTF del marco del agarre, ya importado a Blender) de agarre_R:
    el espacio del hueso hijo empieza en su cola, y el importador giró Y arriba a Z arriba."""
    ob.parent = arm
    ob.parent_type = 'BONE'
    ob.parent_bone = 'agarre_R'
    ob.location = (0.0, -arm.data.bones['agarre_R'].length, 0.0)
    ob.rotation_euler = (math.radians(-90.0), 0.0, 0.0)
    return ob


def pieza(arm, nombre):
    """La pieza aparte importada de obra/piezas (o el auricular de atrezo), colgada del agarre."""
    ob = bpy.data.objects.get('pieza_' + nombre)
    if ob:
        return ob
    if nombre == 'auricular':
        bm = bmesh.new()
        # eje largo en +Y del agarre; como las piezas de verdad, escrito en Blender tal como lo
        # dejaria el importador (Y glTF -> Z Blender)
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.016, radius2=0.016, depth=0.15)
        for y in (-0.085, 0.085):
            bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.026,
                                      matrix=Matrix.Translation((0.0, 0.012, y)) @ Matrix.Diagonal((1.0, 0.8, 0.9, 1)))
        me = bpy.data.meshes.new('pieza_auricular')
        bm.to_mesh(me)
        bm.free()
        m = bpy.data.materials.new('atrezo_ambar')
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.05, 0.03, 0.01, 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.35
        me.materials.append(m)
        ob = bpy.data.objects.new('pieza_auricular', me)
        bpy.context.scene.collection.objects.link(ob)
        for p in ob.data.polygons:
            p.use_smooth = True
        return _al_agarre(arm, ob)
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'obra', 'piezas', 'pieza-%s.glb' % nombre)
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ruta)
    nuevos = [o for o in bpy.data.objects if o not in antes and o.type == 'MESH']
    ob = nuevos[0]
    ob.name = 'pieza_' + nombre
    ob.rotation_mode = 'XYZ'
    ob.matrix_world = Matrix.Identity(4)
    return _al_agarre(arm, ob)


def _mostrar_piezas(arm, clip):
    for n in ('pistola', 'paraguas', 'auricular'):
        ob = bpy.data.objects.get('pieza_' + n)
        if ob:
            ob.hide_render = PIEZA_DE.get(clip) != n
    if clip in PIEZA_DE:
        pieza(arm, PIEZA_DE[clip]).hide_render = False


def todas(arm, cam, fig, capt, tmp, clips=None, log=print):
    import reparto
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 380, 560
    sc.eevee.taa_render_samples = 24
    escena.luces('tiras')
    suelo = bpy.data.objects.get('suelo')
    if suelo:
        suelo.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.6
    salida = os.path.join(capt, 'tiras')
    os.makedirs(salida, exist_ok=True)
    por_clase = None if fig in TODAS_EN else TIRAS_DE.get(reparto.FIGURAS[fig]['clase'])
    lista = clips.split('+') if clips else list(por_clase or animacion.ORDEN)
    lista = [n for n in lista if n in bpy.data.actions]
    esc = arm.scale[0]
    resumen = []
    for nombre in lista:
        _mostrar_piezas(arm, nombre)
        n = 8 if nombre in LOCOMOCION or nombre in COMBATE or nombre in VIAJE else 7
        frs = fotogramas(nombre, n)
        filas = []
        if nombre in LOCOMOCION:
            vistas = [('perfil', 90, 3.5), ('tresq', 35, 3.5)]
        elif nombre in LEJOS:
            vistas = [('perfil', 90, 4.6), ('tresq', 35, 4.6)]
        elif nombre in COMBATE or nombre in VIAJE:
            vistas = [('hombro', None, None), ('tresq', 35, 3.8)]
        else:
            vistas = [('tresq', 35, 3.7), ('perfil', 90, 3.4)]
        centros = [_cadera(arm, nombre, fr) for fr in frs]
        fijo = (sum(c[0] for c in centros) / len(centros), sum(c[1] for c in centros) / len(centros))
        for vn, lado, dist in vistas:
            fila = []
            for fr, c in zip(frs, centros):
                cx, cy = c if nombre in VIAJE else fijo
                if vn == 'hombro':
                    # la vista del juego: el teléfono apaisado; se recorta el centro para la tira
                    camara_hombro(cam, c[0] if nombre in VIAJE else fijo[0], c[1] if nombre in VIAJE else fijo[1], esc)
                else:
                    cam.data.sensor_fit = 'AUTO'
                    escena.encuadrar(cam, centro=(cx, cy + (0.2 if nombre in LEJOS else 0.0), 0.85 * esc),
                                     dist=dist * esc, alto_cam=1.25 * esc, lente=50, lado=lado)
                animacion.poner_accion(arm, nombre, fr)
                p = os.path.join(tmp, '_t_%s_%s_%d.png' % (nombre, vn, fr))
                sc.render.resolution_x, sc.render.resolution_y = (640, 360) if vn == 'hombro' else (380, 560)
                im = escena.render(p)
                fila.append(im[20:340, 160:480] if vn == 'hombro' else im)
            filas.append(fila)
        imagen.guardar(imagen.mosaico(filas), os.path.join(salida, '%s_%s.png' % (fig, nombre)))
        log('tira', nombre, frs)
        for fila in filas:
            resumen.append([f[::3, ::3] for f in fila])
    _mostrar_piezas(arm, None)
    if not clips and resumen:
        imagen.guardar(imagen.mosaico(resumen, sep=2), os.path.join(capt, 'tiras_%s.png' % fig))


# primeros planos: (clip, fotograma, mano, direccion de la camara desde la mano)
MANOS = [('guardia', 0, 'mano_L', (0.9, -1.0, 0.3)), ('guardia', 0, 'mano_R', (-0.9, -1.0, 0.3)),
         ('seguida-1', 6, 'mano_L', (0.8, -0.6, 0.4)), ('seguida-2', 9, 'mano_R', (-0.8, -0.6, 0.4)),
         ('empellon', 15, 'mano_R', (-0.6, -1.0, 0.2)), ('apuntar', 10, 'mano_R', (-1.0, -0.2, 0.3)),
         ('andar-paraguas', 0, 'mano_R', (-1.0, -0.6, 0.2)), ('descolgar', 30, 'mano_R', (-1.0, -0.6, 0.1))]


def manos(arm, cam, fig, capt, tmp, log=print):
    sc = bpy.context.scene
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    sc.render.resolution_x, sc.render.resolution_y = 420, 420
    sc.eevee.taa_render_samples = 32
    escena.luces('tiras')
    fila = []
    for clip, fr, hueso, d in MANOS:
        if clip not in bpy.data.actions:
            continue
        _mostrar_piezas(arm, clip)
        animacion.poner_accion(arm, clip, fr)
        pb = arm.pose.bones[hueso]
        c = arm.matrix_world @ (pb.head + (pb.tail - pb.head) * 0.9)
        d = Vector(d).normalized()
        cam.data.lens = 70
        paraguas = clip == 'andar-paraguas'
        mira = c + (Vector((0, 0, 0.35)) if paraguas else Vector())
        cam.location = mira + d * (2.0 if paraguas else 0.75)
        cam.rotation_euler = (mira - cam.location).to_track_quat('-Z', 'Y').to_euler()
        fila.append(escena.render(os.path.join(tmp, '_m_%s_%d_%s.png' % (clip, fr, hueso))))
    _mostrar_piezas(arm, None)
    if fila:
        imagen.guardar(imagen.mosaico([fila[:4], fila[4:]]), os.path.join(capt, 'manos_%s.png' % fig))
    sc.render.resolution_x, sc.render.resolution_y = rx, ry
    log('manos', len(fila))
