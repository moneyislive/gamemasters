"""Escena de noche para capturas: luz verdosa, luces de borde, suelo mojado, neon y bloom."""
import math
import os
import bpy
from mathutils import Vector

import imagen


def _luz(nombre, tipo, color, energia, loc, mira, tam=1.0, spot=None):
    ld = bpy.data.lights.new(nombre, tipo)
    ld.color = color
    ld.energy = energia
    if tipo == 'AREA':
        ld.size = tam
    if tipo == 'SPOT' and spot:
        ld.spot_size = math.radians(spot)
        ld.spot_blend = 0.4
    ob = bpy.data.objects.new(nombre, ld)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    d = Vector(mira) - Vector(loc)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob


def luces(luz):
    for o in [o for o in bpy.data.objects if o.type == 'LIGHT' or o.name.startswith('neon')]:
        bpy.data.objects.remove(o, do_unlink=True)
    w = bpy.context.scene.world
    bg = w.node_tree.nodes['Background']
    if luz == 'noche':
        bg.inputs['Color'].default_value = (0.004, 0.009, 0.007, 1)
        _luz('clave', 'AREA', (0.72, 1.0, 0.76), 230, (-1.9, -3.0, 3.1), (0, 0, 1.2), tam=2.2)
        _luz('borde_d', 'SPOT', (0.65, 0.95, 1.0), 900, (2.0, 2.6, 2.9), (0, 0, 1.3), spot=40)
        _luz('borde_i', 'SPOT', (0.5, 1.0, 0.7), 500, (-2.2, 2.4, 2.2), (0, 0, 1.1), spot=40)
        _luz('relleno', 'AREA', (0.35, 0.45, 0.55), 35, (2.5, -2.5, 1.2), (0, 0, 1.0), tam=3)
        neon()
    elif luz == 'estudio':
        bg.inputs['Color'].default_value = (0.02, 0.025, 0.03, 1)
        _luz('clave', 'AREA', (1.0, 0.97, 0.92), 60, (-1.2, -2.0, 2.2), (0, 0, 1.65), tam=1.5)
        _luz('relleno', 'AREA', (0.8, 0.9, 1.0), 25, (1.6, -1.6, 1.7), (0, 0, 1.65), tam=2.0)
        _luz('borde', 'AREA', (0.8, 1.0, 0.9), 60, (0.8, 1.8, 2.2), (0, 0, 1.65), tam=1.0)
    else:  # tiras: legible, sigue siendo nocturna
        bg.inputs['Color'].default_value = (0.03, 0.045, 0.04, 1)
        _luz('clave', 'AREA', (0.85, 1.0, 0.88), 900, (-2.0, -2.5, 4.5), (0, 0, 1.0), tam=3.0)
        _luz('cenital', 'AREA', (0.8, 0.95, 0.9), 400, (0.5, 1.0, 5.0), (0, 0, 0.8), tam=4.0)
        _luz('borde_d', 'SPOT', (0.65, 0.95, 1.0), 1200, (2.0, 2.8, 3.0), (0, 0, 1.1), spot=60)
        _luz('relleno', 'AREA', (0.55, 0.65, 0.75), 300, (3.0, -2.0, 1.5), (0, 0, 1.0), tam=4)


def neon():
    """Tubo de neon verde detras del personaje: da el brillo (bloom) y el reflejo en el suelo mojado."""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.9, location=(1.3, 3.6, 2.2), rotation=(0, 0, 0))
    ob = bpy.context.active_object
    ob.name = 'neon'
    m = bpy.data.materials.get('neon') or bpy.data.materials.new('neon')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (0.2, 1.0, 0.35, 1)
    em.inputs['Strength'].default_value = 30.0
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(em.outputs[0], out.inputs[0])
    ob.data.materials.append(m)
    ob.visible_shadow = False
    return ob


def bloom(activar=True):
    sc = bpy.context.scene
    sc.use_nodes = activar
    if not activar:
        return
    nt = sc.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new('CompositorNodeRLayers')
    gl = nt.nodes.new('CompositorNodeGlare')
    gl.glare_type = 'BLOOM'
    gl.quality = 'HIGH'
    gl.threshold = 1.2
    gl.size = 6
    comp = nt.nodes.new('CompositorNodeComposite')
    nt.links.new(rl.outputs['Image'], gl.inputs['Image'])
    nt.links.new(gl.outputs['Image'], comp.inputs['Image'])


def preparar(res=(600, 1000), muestras=48, suelo=True, luz='noche'):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.eevee.taa_render_samples = muestras
    try:
        sc.eevee.use_raytracing = True
        sc.eevee.ray_tracing_options.resolution_scale = '2'
    except Exception:
        pass
    sc.eevee.use_shadows = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    try:
        sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    sc.view_settings.exposure = 0.0
    w = bpy.data.worlds.new('noche')
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.004, 0.009, 0.007, 1)
    bg.inputs['Strength'].default_value = 1.0
    sc.world = w
    luces(luz)
    if suelo:
        bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
        pl = bpy.context.active_object
        pl.name = 'suelo'
        m = bpy.data.materials.new('suelo_mojado')
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (0.012, 0.016, 0.015, 1)
        b.inputs['Roughness'].default_value = 0.16
        pl.data.materials.append(m)
    cam = bpy.data.objects.new('camara', bpy.data.cameras.new('camara'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def encuadrar(cam, centro=(0, 0, 0.92), dist=5.2, alto_cam=1.25, lente=50, lado=0.0):
    """Camara a 'dist' del centro; lado = angulo alrededor del personaje (0 = de frente,
    90 = desde su izquierda, +X)."""
    cam.data.lens = lente
    a = math.radians(lado)
    cam.location = (centro[0] + dist * math.sin(a), centro[1] - dist * math.cos(a), alto_cam)
    d = Vector(centro) - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def camara_juego(cam, x, y, rumbo=0.0, distancia=3.2, esc=1.0):
    """La cámara al hombro del juego (`escritorio/src/quiebro/camara/encuadre.ts`) en el espacio de
    Blender (el personaje mira a -Y): 3,2 m detrás (4 con enemigos cerca), a 1,7 m, mirando al pivote del
    pecho (1,5 m) 0,45 m a la derecha, con 75° de campo VERTICAL (el de three). Es desde donde se juzga un
    golpe: si no se lee aquí, no se lee."""
    fwd = Vector((math.sin(rumbo), -math.cos(rumbo), 0.0))
    der = Vector((fwd.y, -fwd.x, 0.0))          # la derecha del personaje: -X de Blender si mira a -Y
    pivote = Vector((x, y, 1.5 * esc)) + der * 0.45
    cab = math.asin((1.7 - 1.5) / 3.2)
    cam.location = pivote - fwd * (distancia * math.cos(cab)) + Vector((0, 0, distancia * math.sin(cab)))
    cam.rotation_euler = (pivote - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.sensor_fit = 'VERTICAL'
    cam.data.angle_y = math.radians(75.0)


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return imagen.leer(path)


def hoja_contacto(arm, cam, path, tmp, esc=1.0):
    vistas = []
    encuadrar(cam, centro=(0, 0, 0.93 * esc), dist=3.35, alto_cam=1.3 * esc, lente=50)
    rot0 = arm.rotation_euler.z
    for nombre, ang in (('frente', 0), ('perfil', -90), ('tresq', -35), ('espalda', 180)):
        arm.rotation_euler.z = math.radians(ang)
        vistas.append(render(os.path.join(tmp, '_hoja_%s.png' % nombre)))
    arm.rotation_euler.z = rot0
    imagen.guardar(imagen.mosaico([vistas]), path)


def primer_plano(arm, cam, path, tmp, zc):
    sc = bpy.context.scene
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    sc.render.resolution_x, sc.render.resolution_y = 700, 700
    vistas = []
    encuadrar(cam, centro=(0, 0, zc - 0.02), dist=1.05, alto_cam=zc, lente=85)
    for ang in (0, -40, -90):
        arm.rotation_euler.z = math.radians(ang)
        vistas.append(render(os.path.join(tmp, '_pp_%d.png' % ang)))
    arm.rotation_euler.z = 0
    sc.render.resolution_x, sc.render.resolution_y = rx, ry
    imagen.guardar(imagen.mosaico([vistas]), path)
