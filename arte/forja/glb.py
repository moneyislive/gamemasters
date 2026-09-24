"""LEER Y ESCRIBIR GLB A MANO, sin Blender y sin dependencias (numpy sólo donde se pide).

═══ POR QUÉ A MANO ═══

Lo que sale del exportador de Blender no es lo que se empaqueta: se le quitan las UV (no hay
texturas), se cuantizan las mallas y las animaciones y se renombran los clips. Hacerlo leyendo el
GLB como lo que es —un JSON y un bloque binario— deja la transformación a la vista, determinista y
comprobable, y la misma lectura sirve a la batería (`validar.py`) y al manifiesto (`manifiesto.py`),
que miden el fichero que baja el teléfono y no el `.blend` del que salió.
"""
import json
import struct

TIPO_COMPONENTE = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
BYTES_COMPONENTE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
COMPONENTES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def leer(ruta):
    """Devuelve (gltf, bin) de un .glb."""
    with open(ruta, 'rb') as f:
        datos = f.read()
    magia, version, largo = struct.unpack_from('<III', datos, 0)
    if magia != 0x46546C67 or version != 2:
        raise ValueError('%s no es un GLB 2.0' % ruta)
    pos = 12
    gltf = None
    binario = b''
    while pos < largo:
        n, tipo = struct.unpack_from('<II', datos, pos)
        trozo = datos[pos + 8:pos + 8 + n]
        if tipo == 0x4E4F534A:
            gltf = json.loads(trozo.decode('utf-8'))
        elif tipo == 0x004E4942:
            binario = trozo
        pos += 8 + n
    return gltf, binario


def escribir(ruta, gltf, binario):
    """Escribe un .glb con el JSON compacto y el binario alineados a 4 bytes."""
    if gltf.get('buffers'):
        gltf['buffers'][0]['byteLength'] = len(binario)
    js = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    binario = bytes(binario) + b'\0' * ((4 - len(binario) % 4) % 4)
    largo = 12 + 8 + len(js) + (8 + len(binario) if binario else 0)
    with open(ruta, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, largo))
        f.write(struct.pack('<II', len(js), 0x4E4F534A))
        f.write(js)
        if binario:
            f.write(struct.pack('<II', len(binario), 0x004E4942))
            f.write(binario)


def accesor(gltf, binario, i, np=None):
    """Lee el accesor i. Con numpy devuelve un array (n, componentes); sin él, una lista de tuplas."""
    a = gltf['accessors'][i]
    ncomp = COMPONENTES[a['type']]
    ct = a['componentType']
    n = a['count']
    if 'bufferView' not in a:
        if np is not None:
            return np.zeros((n, ncomp), dtype=np.float32)
        return [(0,) * ncomp] * n
    bv = gltf['bufferViews'][a['bufferView']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    tam = BYTES_COMPONENTE[ct] * ncomp
    paso = bv.get('byteStride', tam)
    if np is not None:
        dt = np.dtype('<' + TIPO_COMPONENTE[ct])
        if paso == tam:
            arr = np.frombuffer(binario, dtype=dt, count=n * ncomp, offset=off).reshape(n, ncomp)
        else:
            filas = [np.frombuffer(binario, dtype=dt, count=ncomp, offset=off + k * paso) for k in range(n)]
            arr = np.stack(filas) if filas else np.zeros((0, ncomp), dtype=dt)
        return arr.copy()
    fmt = '<' + TIPO_COMPONENTE[ct] * ncomp
    return [struct.unpack_from(fmt, binario, off + k * paso) for k in range(n)]


def triangulos_de_malla(gltf, i_malla):
    """Triángulos de una malla (todas sus primitivas de triángulos)."""
    t = 0
    for p in gltf['meshes'][i_malla]['primitives']:
        if p.get('mode', 4) != 4:
            continue
        if 'indices' in p:
            t += gltf['accessors'][p['indices']]['count'] // 3
        else:
            t += gltf['accessors'][p['attributes']['POSITION']]['count'] // 3
    return t


class Constructor:
    """Va juntando vistas y accesores en un binario nuevo, alineados a 4 bytes."""

    def __init__(self):
        self.binario = bytearray()
        self.vistas = []
        self.accesores = []

    def vista(self, datos, objetivo=None):
        while len(self.binario) % 4:
            self.binario.append(0)
        v = {'buffer': 0, 'byteOffset': len(self.binario), 'byteLength': len(datos)}
        if objetivo is not None:
            v['target'] = objetivo
        self.binario.extend(datos)
        self.vistas.append(v)
        return len(self.vistas) - 1

    def accesor(self, arr, tipo, componente, normalizado=False, objetivo=None, minmax=False):
        """`arr` es un array de numpy ya del tipo final; devuelve el índice del accesor nuevo."""
        import numpy as np
        ncomp = COMPONENTES[tipo]
        a2 = arr.reshape(-1, ncomp)
        tam = BYTES_COMPONENTE[componente] * ncomp
        if tam % 4 and objetivo == 34962:
            # Los atributos de vértice van alineados a 4 bytes por elemento: se rellena cada fila.
            relleno = (4 - tam % 4) // BYTES_COMPONENTE[componente]
            a2 = np.concatenate([a2, np.zeros((a2.shape[0], relleno), dtype=a2.dtype)], axis=1)
            iv = self.vista(a2.tobytes(), objetivo)
            self.vistas[iv]['byteStride'] = tam + relleno * BYTES_COMPONENTE[componente]
        else:
            iv = self.vista(a2.tobytes(), objetivo)
        acc = {'bufferView': iv, 'componentType': componente, 'count': int(a2.shape[0]), 'type': tipo}
        if normalizado:
            acc['normalized'] = True
        if minmax:
            base = arr.reshape(-1, ncomp)
            acc['min'] = [int(x) if componente != 5126 else float(x) for x in base.min(axis=0)]
            acc['max'] = [int(x) if componente != 5126 else float(x) for x in base.max(axis=0)]
        self.accesores.append(acc)
        return len(self.accesores) - 1
