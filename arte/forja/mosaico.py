"""El reparto de un vistazo: junta las hojas de todas las figuras (frente y tres cuartos, a un tercio
de tamaño) en capturas/reparto.png, por familias. Es la imagen que se mira primero después de una
vuelta: una silueta que se repite, un color que no es apagado o unas gafas donde no toca se ven aquí.

    blender -b --factory-startup --python mosaico.py
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import imagen  # noqa: E402
import reparto  # noqa: E402

CAPT = os.path.join(AQUI, 'capturas')
filas = []
for fam, f in reparto.FAMILIAS.items():
    fila = []
    for v in f['variantes']:
        p = os.path.join(CAPT, 'hoja_%s-%s.png' % (fam, v))
        if not os.path.exists(p):
            continue
        a = imagen.leer(p)
        w = a.shape[1] // 4
        for k in (0, 2):                       # frente y tres cuartos
            fila.append(a[::3, k * w:(k + 1) * w:3])
    if fila:
        filas.append(fila)
if filas:
    imagen.guardar(imagen.mosaico(filas, sep=3), os.path.join(CAPT, 'reparto.png'))
    print('[forja] mosaico: %d familias' % len(filas))
