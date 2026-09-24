"""El resumen de la batería: junta obra/comprobacion_<figura>.json, obra/validacion.json, obra/movimiento_{m,f}.json
y obra/en_three.json en obra/resumen_bateria.json y decide el código de salida (1 si algo falla).

Una parte que no se escribió cuenta como fallo: una batería a la que le falta un trozo no está en
verde, está sin mirar.
"""
import json
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import reparto  # noqa: E402

SAL = os.path.join(AQUI, 'obra')


def cargar(n):
    p = os.path.join(SAL, n)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


fallos = []
tabla = {}
for f in reparto.FIGURAS:
    d = cargar('comprobacion_%s.json' % f)
    if d is None:
        fallos.append('%s: no hay comprobacion' % f)
        continue
    fallos += ['%s: %s' % (f, x) for x in d['fallos']]
    tabla[f] = dict(reposo=d['reposo'], fallos=len(d['fallos']),
                    faldon={k: v.get('faldon_fotogramas_atravesado_pct') for k, v in d['clips'].items()
                            if v.get('faldon_fotogramas_atravesado_pct')},
                    zmin={k: v['zmin'] for k, v in d['clips'].items()})
v = cargar('validacion.json')
if v is None:
    fallos.append('no hay validacion.json')
else:
    fallos += ['validar: %s' % x for x in v['errores']]
for s_ in ('m', 'f'):
    mv = cargar('movimiento_%s.json' % s_)
    if mv is None:
        fallos.append('no hay movimiento_%s.json' % s_)
    else:
        fallos += ['movimiento (%s): %s' % (s_, x) for x in mv['fallos']]
t = cargar('en_three.json')
if t is None:
    fallos.append('no hay en_three.json')
else:
    fallos += ['three.js: %s' % x for x in t['fallos']]
json.dump(dict(fallos=fallos, figuras=tabla), open(os.path.join(SAL, 'resumen_bateria.json'), 'w', encoding='utf-8'),
          indent=1, ensure_ascii=False)
for f, d in tabla.items():
    peor = sorted(d['faldon'].items(), key=lambda kv: -kv[1])[:3]
    print('%-28s fallos %2d  altura %.3f  cabezas %.2f  faldon peor %s  zmin %.3f' % (
        f, d['fallos'], d['reposo']['altura'], d['reposo']['cabezas'], peor, min(d['zmin'].values())))
print('FALLOS EN TOTAL: %d' % len(fallos))
for x in fallos:
    print('  -', x)
sys.exit(1 if fallos else 0)
