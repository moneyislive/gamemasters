"""Construye una figura del reparto: cuerpo SDF, piezas, esqueleto, pesos, oclusion y tres LOD.

═══ LOS NIVELES (segunda pasada: lo que dice el diseño, §8) ═══

  LOD0 (~8k triángulos): el propio. Cara y manos con el doble de densidad.
  LOD1 (~4k): compañeros y NPC.
  LOD2 (~1k): la multitud cercana (el VAT de N1 es de 1.500).
  LOD3 (~400, sólo durmientes): el maniquí de la multitud en N0.

La primera entrega llevaba el LOD0 a 12-16k: con seis jugadores en N0 los personajes solos se comían
el tope de 150k triángulos. Los niveles salen del MISMO remallado (el LOD2 diezmando el LOD1, el LOD3
el LOD2), con los pesos transferidos, así que se deforman igual y el cambio de nivel no salta.

═══ LOS MATERIALES: LA CONVENCIÓN QUE LEE EL CLIENTE ═══

El LOD0 lleva un material por zona (`mat_piel`, `mat_abrigo`, `mat_forro`…) con su color, y en
COLOR_0 la oclusión horneada (y el iris pintado en los ojos). El LOD1 y el LOD2 funden las zonas en
dos materiales (`mat_lod_mate`, `mat_lod_brillo`) con el color de la zona × oclusión en el rgb, la
oclusión sola en el alfa y la zona en `_ZONA`. Es la convención del prototipo, y el frente de
personajes ya la lee: funde cada figura en UNA geometría y UNA llamada con un color por zona en
uniformes (así tiñe el forro del asiento o el traje de cada Celador), de modo que el número de
materiales del fichero no llega a la pantalla.
"""
import json
import os
import time
import numpy as np
import bpy

import malla
import accesorios
import rig
import anatomia
import reparto


def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _unir(objs, nombre):
    malla.activar(objs[0])
    for o in objs[1:]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = nombre
    ob.data.name = nombre
    ca = ob.data.color_attributes.get(malla.ATTR)
    if ca is not None:
        ob.data.color_attributes.active_color = ca
    return ob


def _pesos_cabeza(P):
    return {'cabeza': np.ones(len(P))}


def construir(fig, log=print):
    t0 = time.time()
    limpiar()
    ficha = reparto.FIGURAS[fig]
    tris0, tris1, tris2 = ficha['presupuesto'][:3]
    tris3 = ficha['presupuesto'][3] if len(ficha['presupuesto']) > 3 else None
    alto, grid, F, grupos, extra = malla.malla_sdf(fig, log=log)
    cu = extra['cuerpo']
    sexo = extra['sexo']
    malla.remallar(alto, log=log)
    niveles = []
    for n, (tris, previo) in enumerate(((tris0, 1.8), (tris1, 1.6))):
        log('LOD%d del cuerpo' % n)
        ob = malla.copiar(alto, 'cuerpo%d' % n)
        malla.procesar_forma(ob, grupos, tris, log, previo=previo)
        niveles.append(ob)
    bpy.data.objects.remove(alto, do_unlink=True)
    arm = rig.crear_esqueleto(sexo=sexo, plantilla=True)
    if rig.pesos_cuerpo(niveles[0], arm, log):
        rig.transferir_pesos(niveles[0], niveles[1], arm)
    else:
        # ═══ EL CALOR A VECES NO CONVERGE ═══ («Bone Heat Weighting: failed to find solution»: le
        # pasó a la Celadora con 6.300 vértices sin peso).
        #
        # ═══ SEGUNDA PASADA: UN SUSTITUTO ANTES QUE EL LOD1 ═══ Pesar el LOD1 (3.800 triángulos) y copiarlo
        # dejaba la entrepierna del Celador mayor y de la Celadora con picos de hasta 30 cm (la revisión). El
        # calor falla por las piezas finas (el ala del sombrero, las solapas): se pesa un SUSTITUTO, el LOD0
        # remallado en vóxeles de 7 mm (cerrado y sin láminas), y se copia por vecinos de su mismo lado.
        log('  el calor no convergio en el LOD0: se pesa un sustituto remallado y se transfiere')
        for g in list(niveles[0].vertex_groups):
            niveles[0].vertex_groups.remove(g)
        sust = malla.copiar(niveles[0], 'sustituto')
        malla.remallar(sust, voxel=0.007, log=log)
        if rig.pesos_cuerpo(sust, arm, log):
            rig.transferir_pesos(sust, niveles[0], arm, k=6)
            rig.transferir_pesos(sust, niveles[1], arm, k=6)
        else:
            log('  tampoco en el sustituto: se pesa el LOD1 y se transfiere')
            for g in list(niveles[0].vertex_groups):
                niveles[0].vertex_groups.remove(g)
            if not rig.pesos_cuerpo(niveles[1], arm, log):
                raise RuntimeError('%s: el calor no converge ni en el LOD0, ni en el sustituto, ni en el LOD1' % fig)
            rig.transferir_pesos(niveles[1], niveles[0], arm)
        bpy.data.objects.remove(sust, do_unlink=True)
    log('bordes de material')
    for ob in niveles:
        malla.procesar_bordes(ob, grupos, log)
    log('LOD2 del cuerpo (desde el LOD1)')
    niveles.append(malla.lod_desde(niveles[1], 'cuerpo2', tris2, log))
    W, nombres = rig.pesos_array(niveles[2], arm)
    rig.escribir_pesos(niveles[2], W, nombres)
    if tris3:
        log('LOD3 del cuerpo: el maniqui de la multitud (desde el LOD2)')
        niveles.append(malla.lod_desde(niveles[2], 'cuerpo3', tris3, log))
        W, nombres = rig.pesos_array(niveles[3], arm)
        rig.escribir_pesos(niveles[3], W, nombres)
    for ob in niveles:
        malla.color_vertices(ob)
    if extra.get('chaqueta'):
        z0, z1 = extra.get('chaqueta_z', (1.0, 0.87))
        for ob in niveles:
            n = rig.pesos_chaqueta(ob, arm, mat_nombre=extra['chaqueta'], hueco=extra.get('chaqueta_grupo'), z0=z0, z1=z1)
        log('  chaqueta: %d vertices siguen al faldon' % n)

    piezas = [[ob] for ob in niveles]
    for n, ojos in enumerate((accesorios.ojos(fig, cu), accesorios.ojos_lod(fig, cu))):
        rig.pesos_rigidos(ojos, arm, _pesos_cabeza)
        piezas[n].append(ojos)
    cejas = accesorios.cejas(fig, cu)
    rig.pesos_rigidos(cejas, arm, _pesos_cabeza)
    piezas[0].append(cejas)
    if 'gafas' in extra:
        for n, simple in ((0, False), (1, True), (2, True)):
            g = accesorios.gafas(fig, cu, dict(extra['gafas'], simple=simple, lados=18 if n < 2 else 8))
            rig.pesos_rigidos(g, arm, _pesos_cabeza)
            piezas[n].append(g)
    if 'corbata' in extra:
        # la corbata copia los pesos del cuerpo de su nivel (sigue a la camisa que tiene debajo)
        for n, simple in ((0, False), (1, True)):
            c = accesorios.corbata(fig, cu, extra['corbata']['material'], simple=simple)
            rig.transferir_pesos(niveles[n], c, arm, k=6)
            piezas[n].append(c)
    if 'faldon' in extra:
        sp = extra['faldon']
        for n, (n_an, n_seg) in enumerate(((10, 26), (6, 16), (4, 10))):
            f = accesorios.faldon(fig, grupos, sp, sexo, n_anillos=n_an, n_seg=n_seg, log=log if n == 0 else (lambda *a: None))
            rig.pesos_faldon(f, arm, sexo, z_raja=sp.get('z_raja', 0.66), z_lat=sp.get('z_lat', 0.0))
            piezas[n].append(f)
    for grupo in piezas:
        for o in grupo:
            if o.name.startswith(('gafas', 'cejas')):
                continue          # lentes y cejas con caras planas (normales partidas)
            malla.suavizar(o)
    var = ficha['variante']
    obs = [_unir(p, var + ('_lod%d' % n if n else '')) for n, p in enumerate(piezas)]
    for ob in obs:
        if not any(m.type == 'ARMATURE' for m in ob.modifiers):
            m = ob.modifiers.new('esqueleto', 'ARMATURE')
            m.object = arm
        ob.parent = arm
    log('oclusion')
    aos = [malla.oclusion(ob, log=log) for ob in obs]
    zonas = sorted({m.name for m in obs[0].data.materials})
    for ob, ao in zip(obs[1:], aos[1:]):
        malla.fundir_materiales(ob, fig, ao, log=log)
    rig.escalar_figura(arm, obs, anatomia.ESC)
    info = dict(fig=fig, familia=ficha['familia'], variante=var, sexo=sexo,
                tris=[malla.contar_tris(o) for o in obs], verts=[len(o.data.vertices) for o in obs],
                materiales=[sorted({m.name for m in o.data.materials}) for o in obs], zonas=zonas,
                escala_plantilla=anatomia.ESC, huesos=len(arm.data.bones), segundos=round(time.time() - t0, 1))
    log('%s: LOD0 %d, LOD1 %d, LOD2 %d triangulos (%.1fs)' % (fig, info['tris'][0], info['tris'][1], info['tris'][2],
                                                           info['segundos']))
    return arm, obs, info


def guardar_nube(ob, arm, path, extra=None):
    """Malla LOD0 en reposo con sus pesos (4 por vertice): el horneado de animaciones la
    deforma igual que three.js (skinning lineal) para medir el suelo y los choques. `extra` (el LOD2)
    se guarda aparte (`P2`, `idx2`, `w2`, `falda2`): sólo cuenta para el suelo."""
    W, nombres = rig.pesos_array(ob, arm)
    orden = np.argsort(-W, axis=1)[:, :4]
    w4 = np.take_along_axis(W, orden, 1)
    w4 /= np.maximum(w4.sum(1, keepdims=True), 1e-9)
    P = malla._co(ob)
    otros = {}
    if extra is not None:
        W2, n2 = rig.pesos_array(extra, arm)
        assert n2 == nombres
        o2 = np.argsort(-W2, axis=1)[:, :4]
        w2 = np.take_along_axis(W2, o2, 1)
        w2 /= np.maximum(w2.sum(1, keepdims=True), 1e-9)
        f2 = np.zeros(len(W2), bool)
        for k, n in enumerate(nombres):
            if n.startswith('faldon'):
                f2 |= (W2[:, k] > 0.3)
        otros = dict(P2=malla._co(extra).astype(np.float32), idx2=o2.astype(np.int16), w2=w2.astype(np.float32), falda2=f2)
    me = ob.data
    mats = [m.name for m in me.materials]
    mat_v = np.zeros(len(P), np.int32)
    for p in me.polygons:
        for v in p.vertices:
            mat_v[v] = p.material_index
    falda = np.zeros(len(P), bool)
    for k, n in enumerate(nombres):
        if n.startswith('faldon'):
            falda |= (W[:, k] > 0.3)
    np.savez_compressed(path, P=P.astype(np.float32), idx=orden.astype(np.int16), w=w4.astype(np.float32),
                        nombres=np.array(nombres), mat=mat_v, mats=np.array(mats), falda=falda,
                        tris=malla._tris(ob).astype(np.int32), **otros)


def exportar_glb(path, objetos, animaciones=False, atributos=False):
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for o in objetos:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objetos[0]
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_yup=True,
              export_apply=False, export_skins=True, export_animations=animaciones,
              export_morph=False, export_materials='EXPORT', export_texcoords=False,
              export_normals=True, export_tangents=False, export_cameras=False, export_lights=False,
              export_def_bones=False, export_rest_position_armature=True,
              export_vertex_color='ACTIVE', export_attributes=atributos)
    if animaciones:
        kw.update(export_animation_mode='ACTIONS', export_force_sampling=True,
                  export_optimize_animation_size=False, export_anim_slide_to_zero=True,
                  export_optimize_animation_keep_anim_armature=True,
                  export_reset_pose_bones=True, export_bake_animation=False)
    bpy.ops.export_scene.gltf(**kw)
