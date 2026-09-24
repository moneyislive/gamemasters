"""LAS PIEZAS APARTE: la pistola del Celador tirador y el paraguas de los durmientes.

No van cosidas a ninguna figura: son GLB sin esqueleto que el cliente cuelga del hueso de agarre
(`figura.getObjectByName('agarre_R').add(pieza)`) con la transformación identidad. Por eso se
modelan YA en el marco del agarre, en coordenadas glTF:

    +X  hacia los nudillos: el cañón de la pistola
    +Y  por el lado del pulgar: arriba en el puño de la guardia; el eje del paraguas
    +Z  = X × Y
    el origen, en el hueco del puño cerrado

Así un Celador cualquiera se vuelve tirador sin otro modelo (el diseño: «celador con pistola como
pieza aparte»), y el mismo paraguas sirve a los ocho durmientes. Son pocas decenas de triángulos
porque se ven de lejos y a veces de cien en cien.
"""
import math
import os
import bmesh
import bpy
from mathutils import Matrix, Vector

import malla


def B(x, y, z):
    """glTF (Y arriba) -> Blender (Z arriba): el exportador hace (x, y, z)_B -> (x, z, -y)_glTF."""
    return Vector((x, -z, y))


def _caja(bm, c, half, rot=None, mat=0):
    """Caja en coordenadas glTF (centro, semiejes, giro 3x3 en glTF)."""
    rot = rot or Matrix.Identity(3)
    vs = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            for sz in (-1, 1):
                q = rot @ Vector((sx * half[0], sy * half[1], sz * half[2]))
                vs.append(bm.verts.new(B(c[0] + q.x, c[1] + q.y, c[2] + q.z)))
    caras = ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3))
    for f in caras:
        cara = bm.faces.new([vs[i] for i in f])
        cara.material_index = mat


def _cilindro(bm, a, b, r, lados=8, mat=0):
    """Cilindro cerrado de a a b (glTF)."""
    a, b = B(*a), B(*b)
    ret = bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=r, radius2=r, depth=(b - a).length)
    eje = (b - a).normalized()
    q = Vector((0, 0, 1)).rotation_difference(eje)
    M = Matrix.Translation((a + b) * 0.5) @ q.to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=ret['verts'])
    for f in {f for v in ret['verts'] for f in v.link_faces}:
        f.material_index = mat


def _objeto(nombre, bm, materiales):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me)
    bm.free()
    for m in materiales:
        me.materials.append(m)
    ob = bpy.data.objects.new(nombre, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def pistola():
    """Pistola compacta: corredera sobre el puño, empuñadura inclinada 18 grados que sale por abajo
    (el lado del meñique), guardamonte delante de la empuñadura."""
    bm = bmesh.new()
    inclina = Matrix.Rotation(math.radians(18.0), 3, 'Z')     # el pie de la culata va hacia atras
    _caja(bm, (0.045, 0.043, 0.0), (0.090, 0.014, 0.0125))                    # corredera
    _caja(bm, (0.050, 0.022, 0.0), (0.070, 0.008, 0.0105))                    # armazon
    _caja(bm, (-0.020, -0.022, 0.0), (0.0155, 0.052, 0.0125), rot=inclina)    # empunadura
    _caja(bm, (0.036, -0.012, 0.0), (0.024, 0.0025, 0.0045))                  # guardamonte (abajo)
    _caja(bm, (0.058, 0.004, 0.0), (0.0025, 0.016, 0.0045))                   # guardamonte (delante)
    _cilindro(bm, (0.134, 0.043, 0.0), (0.142, 0.043, 0.0), 0.0065, lados=8)  # boca
    m = malla.material('mat_arma', (0.028, 0.029, 0.032), 0.34, 0.85)
    return _objeto('pistola', bm, [m])


def paraguas(radio=0.52, alto=0.80, varillas=8):
    """Paraguas abierto: puño de madera bajo la mano, cana hasta 0,80 m sobre el puño y una tela de
    ocho paños que se comba entre varillas. La tela tiene grosor (sin doble cara)."""
    bm = bmesh.new()
    _cilindro(bm, (0.0, -0.11, 0.0), (0.0, 0.035, 0.0), 0.0135, lados=8, mat=2)      # puno
    _cilindro(bm, (0.0, 0.035, 0.0), (0.0, alto + 0.05, 0.0), 0.0055, lados=6, mat=1)  # cana
    # tela: anillos desde el vertice; entre varillas el pano se comba hacia dentro y el borde cae
    anillos = 4
    lados = varillas * 2
    bt = bmesh.new()
    filas = []
    for i in range(1, anillos + 1):
        t = i / anillos
        fila = []
        for k in range(lados):
            ang = 2 * math.pi * k / lados
            entre = k % 2 == 1
            r = radio * t * (0.94 if entre else 1.0)
            y = alto - 0.21 * t ** 1.5 - (0.018 * t if entre else 0.0)
            fila.append(bt.verts.new(B(r * math.cos(ang), y, r * math.sin(ang))))
        filas.append(fila)
    cima = bt.verts.new(B(0.0, alto + 0.01, 0.0))
    for k in range(lados):
        bt.faces.new((cima, filas[0][(k + 1) % lados], filas[0][k]))
    for i in range(anillos - 1):
        A_, C_ = filas[i], filas[i + 1]
        for k in range(lados):
            bt.faces.new((A_[k], A_[(k + 1) % lados], C_[(k + 1) % lados], C_[k]))
    ob_tela = _objeto('tela', bt, [])
    mod = ob_tela.modifiers.new('grosor', 'SOLIDIFY')
    mod.thickness = 0.004
    mod.offset = 0.0
    mod.use_rim = True
    malla.aplicar_mods(ob_tela)
    bm2 = bmesh.new()
    bm2.from_mesh(ob_tela.data)
    bpy.data.objects.remove(ob_tela, do_unlink=True)
    # puntas de las varillas
    for k in range(0, lados, 2):
        ang = 2 * math.pi * k / lados
        p = (radio * math.cos(ang), alto - 0.21 - 0.004, radio * math.sin(ang))
        _cilindro(bm2, p, (p[0] * 1.03, p[1] - 0.012, p[2] * 1.03), 0.0035, lados=4, mat=1)
    me_tela = bpy.data.meshes.new('paraguas_tela')
    bm2.to_mesh(me_tela)
    bm2.free()
    # juntar tela, cana y puno en un objeto
    ob = _objeto('paraguas', bm, [])
    mats = [malla.material('mat_paraguas', (0.020, 0.022, 0.030), 0.62, 0.0),
            malla.material('mat_varilla', (0.30, 0.30, 0.31), 0.32, 1.0),
            malla.material('mat_mango', (0.060, 0.030, 0.016), 0.45, 0.0)]
    for m in mats:
        ob.data.materials.append(m)
    tela = bpy.data.objects.new('paraguas_tela', me_tela)
    bpy.context.scene.collection.objects.link(tela)
    for m in mats:
        tela.data.materials.append(m)
    malla.activar(ob)
    tela.select_set(True)
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = 'paraguas'
    ob.data.name = 'paraguas'
    return ob


def construir_todas(carpeta, log=print):
    import construir
    info = {}
    for nombre, fn in (('pistola', pistola), ('paraguas', paraguas)):
        construir.limpiar()
        ob = fn()
        if nombre == 'paraguas':
            malla.suavizar(ob)
        ruta = os.path.join(carpeta, 'pieza-%s.glb' % nombre)
        for o in bpy.context.view_layer.objects:
            o.select_set(False)
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.export_scene.gltf(filepath=ruta, export_format='GLB', use_selection=True, export_yup=True,
                                  export_texcoords=False, export_normals=True, export_materials='EXPORT',
                                  export_vertex_color='NONE', export_animations=False, export_skins=False)
        tris = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        info[nombre] = dict(archivo=os.path.basename(ruta), triangulos=tris, bytes=os.path.getsize(ruta),
                            materiales=[m.name for m in ob.data.materials])
        log('pieza %s: %d triangulos, %d bytes' % (nombre, tris, info[nombre]['bytes']))
    return info
