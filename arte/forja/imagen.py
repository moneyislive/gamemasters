"""Leer, componer y guardar PNG con bpy + numpy."""
import os
import numpy as np
import bpy


def leer(path):
    im = bpy.data.images.load(path, check_existing=False)
    w, h = im.size
    a = np.empty(w * h * 4, np.float32)
    im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(h, w, 4)[::-1]  # fila 0 = arriba


def guardar(arr, path):
    h, w = arr.shape[:2]
    im = bpy.data.images.new(os.path.basename(path), w, h, alpha=True)
    im.pixels.foreach_set(np.ascontiguousarray(arr[::-1]).astype(np.float32).ravel())
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    bpy.data.images.remove(im)


def mosaico(filas, fondo=(0.02, 0.02, 0.025, 1.0), sep=4):
    """filas: lista de listas de arrays (h, w, 4). Devuelve un array."""
    alto = [max(a.shape[0] for a in f) for f in filas]
    ancho = [sum(a.shape[1] for a in f) + sep * (len(f) - 1) for f in filas]
    H = sum(alto) + sep * (len(filas) - 1)
    W = max(ancho)
    out = np.empty((H, W, 4), np.float32)
    out[:] = fondo
    y = 0
    for f, h in zip(filas, alto):
        x = 0
        for a in f:
            out[y:y + a.shape[0], x:x + a.shape[1]] = a
            x += a.shape[1] + sep
        y += h + sep
    return out
