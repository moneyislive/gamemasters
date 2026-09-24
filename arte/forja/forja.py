"""Punto de entrada de Blender. Cuatro fases (rehacer.ps1 / rehacer.sh las encadenan):

  1) figura:   blender -b --factory-startup --python forja.py -- fig=desvelado-hombre-gabardina pasos=construir
  2) clips:    blender -b --factory-startup --python forja.py -- fig=clips sexo=m        (o sexo=f; clips=andar+cierre)
  3) piezas:   blender -b --factory-startup --python forja.py -- fig=piezas              (pistola y paraguas)
  4) capturas: blender -b --factory-startup --python forja.py -- fig=<figura> pasos=hoja,cara,lod,manos,tiras [clips=...]

Todo lo que fabrica va a `obra/` (fuera de git): `obra/figuras/<figura>{,-lod1,-lod2}.glb` y su
`.json`, `obra/clips-<sexo>.glb` y su `.json`, `obra/piezas/*.glb`, y en `obra/tmp/` los `.blend` y
las nubes de puntos que la fase 2 necesita (`obra/tmp/<figura>/nube.npz`). Las capturas van a
`capturas/`. El empaquetado para el juego (cuantizar, juntar variantes por familia, manifiesto) no
es de Blender: `empaquetar.py`.
"""
import sys
import os
import json
import time

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)

import bpy  # noqa: E402

import construir  # noqa: E402
import reparto  # noqa: E402

args = dict(a.split('=', 1) for a in (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []))
FIG = args.get('fig', 'desvelado-hombre-gabardina')
PASOS = args.get('pasos', 'construir').split(',')
OBRA = os.path.join(DIR, 'obra')
FIGS = os.path.join(OBRA, 'figuras')
CAPT = os.path.join(DIR, 'capturas')
etiqueta = FIG if FIG != 'clips' else 'clips-' + args.get('sexo', 'm')
TMP = os.path.join(OBRA, 'tmp', etiqueta)
for d in (FIGS, CAPT, TMP, os.path.join(OBRA, 'piezas')):
    os.makedirs(d, exist_ok=True)
LOG = open(os.path.join(OBRA, 'tmp', 'log_%s_%s.txt' % (etiqueta, '-'.join(PASOS) if FIG not in ('clips', 'piezas') else 'hornear')),
           'w', encoding='utf-8')


def log(*a):
    s = ' '.join(str(x) for x in a)
    print('[forja]', s, flush=True)
    LOG.write(s + '\n')
    LOG.flush()


def fase_figura():
    arm, obs, info = construir.construir(FIG, log=log)
    nombres = [FIG + ('-lod%d' % n if n else '') + '.glb' for n in range(len(obs))]
    for n, (ob, nombre) in enumerate(zip(obs, nombres)):
        construir.exportar_glb(os.path.join(FIGS, nombre), [arm, ob], atributos=(n > 0))
    info['bytes'] = [os.path.getsize(os.path.join(FIGS, n)) for n in nombres]
    json.dump(info, open(os.path.join(FIGS, FIG + '.json'), 'w'), indent=1)
    # la nube del horneado: el LOD0 y, para el suelo, también el LOD2 (se aparta hasta 3 cm del LOD0, y
    # tumbado atravesaba el suelo aunque el LOD0 no)
    construir.guardar_nube(obs[0], arm, os.path.join(TMP, 'nube.npz'), extra=obs[2])
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(TMP, FIG + '.blend'))


def fase_clips():
    import animacion
    import rig
    sexo = args.get('sexo', 'm')
    construir.limpiar()
    arm = rig.crear_esqueleto(sexo=sexo)
    nubes = [os.path.join(OBRA, 'tmp', f, 'nube.npz') for f in reparto.NUBES_DEL_HORNEADO[sexo]]
    faltan = [n for n in nubes if not os.path.exists(n)]
    if faltan:
        log('AVISO: faltan nubes (se hornea sin pasada de suelo sobre ellas): %s' % faltan)
    nubes = [n for n in nubes if os.path.exists(n)]
    info = animacion.hornear_todo(arm, nubes=nubes, log=log, clips=args.get('clips'))
    import clips
    info['_gestos'] = clips.GESTOS
    info['_por_direccion'] = clips.POR_DIRECCION
    info['_por_clase'] = clips.POR_CLASE
    info['_entra_con'] = clips.ENTRA_CON
    info['_marcha'] = clips.MARCHA
    nombre = 'clips-%s.glb' % sexo
    construir.exportar_glb(os.path.join(OBRA, nombre), [arm], animaciones=True)
    json.dump(info, open(os.path.join(OBRA, nombre.replace('.glb', '.json')), 'w'), indent=1, ensure_ascii=False)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OBRA, 'tmp', 'clips_%s.blend' % sexo))
    log(nombre, os.path.getsize(os.path.join(OBRA, nombre)))


def fase_piezas():
    import piezas
    construir.limpiar()
    info = piezas.construir_todas(os.path.join(OBRA, 'piezas'), log=log)
    json.dump(info, open(os.path.join(OBRA, 'piezas', 'piezas.json'), 'w'), indent=1)


def fase_capturas():
    import escena
    import malla
    import anatomia
    import animacion
    ruta = os.path.join(TMP, FIG + '.blend')
    bpy.ops.wm.open_mainfile(filepath=ruta)
    ficha = reparto.FIGURAS[FIG]
    arm = bpy.data.objects['esqueleto']
    var = ficha['variante']
    ob0 = bpy.data.objects[var]
    ob1 = bpy.data.objects[var + '_lod1']
    ob2 = bpy.data.objects[var + '_lod2']
    ob3 = bpy.data.objects.get(var + '_lod3')
    sexo = ficha['sexo']
    anatomia.configurar(sexo)
    esc = anatomia.ESC * ficha.get('escala', 1.0)
    # la silueta alta (y la mayor) se escala entera en el cliente: aqui tambien
    arm.scale = (ficha.get('escala', 1.0),) * 3
    blend_anim = os.path.join(OBRA, 'tmp', 'clips_%s.blend' % sexo)
    hay_anim = os.path.exists(blend_anim)
    if hay_anim:
        animacion.cargar_acciones(arm, blend_anim)
    lejos = [o for o in (ob1, ob2, ob3) if o is not None]
    todos = list(ob0.data.materials) + [m for o in lejos for m in o.data.materials]
    malla.usar_color_en_render(todos)
    for ob in lejos:
        ob.hide_render = True
    cam = escena.preparar(luz='noche')
    escena.bloom(True)
    if hay_anim:
        animacion.poner_accion(arm, 'reposo', 0)
    zc = (anatomia.CABEZA_C[2] - 0.01) * esc
    if 'hoja' in PASOS:
        escena.hoja_contacto(arm, cam, os.path.join(CAPT, 'hoja_%s.png' % FIG), TMP, esc)
    if 'cara' in PASOS:
        escena.primer_plano(arm, cam, os.path.join(CAPT, 'cara_%s.png' % FIG), TMP, zc)
    if 'lod' in PASOS:
        for n, ob in [(1, ob1), (2, ob2)] + ([(3, ob3)] if ob3 is not None else []):
            ob0.hide_render = True
            ob.hide_render = False
            escena.hoja_contacto(arm, cam, os.path.join(CAPT, 'lod%d_%s.png' % (n, FIG)), TMP, esc)
            ob0.hide_render = False
            ob.hide_render = True
    if ('tiras' in PASOS or 'manos' in PASOS) and hay_anim:
        escena.bloom(False)
        import tiras
        if 'manos' in PASOS:
            tiras.manos(arm, cam, FIG, CAPT, TMP, log=log)
        if 'tiras' in PASOS:
            tiras.todas(arm, cam, FIG, CAPT, TMP, clips=args.get('clips'), log=log)


def main():
    t0 = time.time()
    if FIG == 'clips':
        fase_clips()
    elif FIG == 'piezas':
        fase_piezas()
    elif 'construir' in PASOS:
        fase_figura()
    else:
        fase_capturas()
    log('total %.1fs' % (time.time() - t0))


try:
    main()
except Exception:
    import traceback
    log(traceback.format_exc())
    raise
