#!/bin/bash
# UNA FOTO DE LA CIUDAD ABIERTA, SIN VENTANA: Edge sin ventana pinta el banco de la ciudad abierta con WebGL de
# verdad (ANGLE sobre D3D11) y guarda un PNG. No usa el panel del navegador, que es uno y compartido.
#
#   PUERTO=5315 bash escritorio/scripts/fotos/foto.sh SALIDA.png "CONSULTA" [ANCHO] [ALTO]
#   PUERTO=5315 bash escritorio/scripts/fotos/foto.sh --arbol
#
# p. ej. CONSULTA = "ciudad=abierta&traza=0&codigo=K7M2P&noche=1&montar=1&lluvia=0&panel=0&nivel=3&luz=madrugada&pos=17.5,1.7,9.5,1.0,-0.15"
#
# `pos=x,y,z,rumbo,cabeceo` en metros y radianes (rumbo 0 = norte, -z, y crece hacia el este; cabeceo negativo
# mira abajo). `camara=libre` deja volar; con `hombro` (lo de siempre) la cámara va 3,2 m detrás de `pos` y a
# 1,7 m. `luz=madrugada|alba`, `nivel=0..3`, `traza=0..31`, `noche=N`. Lo que añade el banco para las fotos
# (`panel=0`, `lluvia=0`, `camino=juego`, `ventana=cx,cz`, `mascara=M`, `reloj=T`) está en la cabecera de
# `escritorio/src/quiebro/ciudad/banco-abierto.tsx`. Las posiciones del protocolo, en `POSICIONES.md`.
#
# OJO CON `ventana=` EN N2: su ventana es de 4 × 4 celdas y, con un lado par, el centro cae en una RAYA entre
# celdas (48k + 24), no en el centro de una (48k). `ventana=0,0` en N2 se montaría en (24, 24), y la foto no sería
# la pedida: este guion se niega antes de abrir Edge (sale con 2). En N2 se piden centros 48k + 24, y en los demás
# niveles, 48k. Por eso la P del protocolo va en N0, N1 y N3.
#
# ═══ EL ÁRBOL ═══
#
# Con varios worktrees sirviendo a la vez, un puerto equivocado fotografía OTRO árbol y lo da por bueno (pasó:
# «un comprobador con puerto por defecto mide otro worktree»). Por eso:
#   · PUERTO es OBLIGATORIO: no hay puerto por defecto;
#   · antes de la primera foto se pregunta al banco de ese puerto de qué carpeta sale (`--dump-dom` con
#     `arbol=1`, menos de un segundo) y tiene que ser la de ESTE guion (o `ARBOL`, si se da). protocolo.sh lo
#     pregunta una vez por tanda y se lo dice a cada foto con `ARBOL_COMPROBADO`;
#   · y cada foto saca además el DOM de su propia página (en la misma pasada de Edge, sin coste) y vuelve a
#     mirar el árbol, el nivel, que la ciudad está construida, que la ventana NO se está montando ni
#     recentrando (una foto de un estado de paso) y, si la consulta lleva `ventana=`, que la pintada es la
#     pedida: si la cámara se aleja más de 30 m de su centro, la ventana se recentra sola. Una foto que no casa
#     se borra, para que ninguna tanda la cuente.
#
# Variables: PUERTO (obligatoria); PERFIL (el perfil de Edge; por omisión `perfil-edge/` junto a la salida: dos
# Edge con el mismo perfil se pisan); ARBOL (la carpeta esperada; por omisión la de este guion); PRESUPUESTO (ms
# de tiempo virtual que se le da a la página, por omisión 25000); ARBOL_COMPROBADO (la pone protocolo.sh).
#
# Sale con 0 si hay foto y todo casa; 1 si no hay foto o su DOM no casa con lo pedido; 2 si no se puede mirar
# (sin PUERTO, sin servidor, sin Edge, un parámetro repetido, un nivel que no existe, una `ventana=` que no es un
# centro de ventana en ese nivel); 3 si el puerto sirve OTRO
# árbol, o uno que no dice cuál.
set -u

EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARBOL="${ARBOL:-$(cygpath -m "$(cd "$AQUI/../../.." && pwd)")}"
PRESUPUESTO="${PRESUPUESTO:-25000}"

decir() { echo "foto.sh: $*" >&2; }

if [ -z "${PUERTO:-}" ]; then
  decir "falta PUERTO. No hay puerto por defecto: cada worktree tiene su vite, y el de otro fotografía OTRO árbol."
  decir "uso: PUERTO=53xx bash foto.sh SALIDA.png \"CONSULTA\" [ANCHO] [ALTO]   (en PowerShell, VAR=x no pone nada: usa bash)"
  exit 2
fi
case "$PUERTO" in
  *[!0-9]*) decir "PUERTO=«$PUERTO» no es un número de puerto"; exit 2 ;;
esac
if [ ! -x "$EDGE" ]; then decir "no encuentro Edge en $EDGE"; exit 2; fi

PAGINA="http://localhost:$PUERTO/sala/banco-quiebro-ciudad.html"

# Edge sin ventana con un perfil propio. Los avisos de Edge van a la papelera: la salida útil es el DOM.
edge() {
  local perfil="$1"
  shift
  mkdir -p "$perfil"
  "$EDGE" --headless=new --disable-gpu-sandbox --use-angle=d3d11 --enable-unsafe-swiftshader \
    --user-data-dir="$(cygpath -w "$perfil")" --hide-scrollbars "$@" 2>/dev/null
}

# El valor de un `data-…` de la marca del banco (`<div id="banco-arbol">`), leído del DOM por la entrada.
marca() {
  grep -o "data-$1=\"[^\"]*\"" | head -1 | sed -e "s/^data-$1=\"//" -e 's/"$//'
}

minusculas() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

# ¿Sirve el puerto ESTE árbol? 0 sí; 2 sin servidor; 3 otro árbol o uno que no lo dice.
comprobar_arbol() {
  local perfil="$1" codigo dom servido
  codigo="$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$PAGINA")"
  if [ "$codigo" != "200" ]; then
    decir "no contesta el banco en el puerto $PUERTO (HTTP «$codigo»): ¿está levantado el vite de $ARBOL?"
    return 2
  fi
  dom="$(edge "$perfil" --virtual-time-budget=10000 --dump-dom "$PAGINA?ciudad=abierta&arbol=1")"
  servido="$(printf '%s' "$dom" | marca arbol)"
  if [ -z "$servido" ] || [ "$servido" = "?" ]; then
    decir "el banco del puerto $PUERTO no dice de qué árbol sale (un árbol sin la marca de O1-FOTOS, u otra cosa en ese puerto)"
    return 3
  fi
  if [ "$(minusculas "$servido")" != "$(minusculas "$ARBOL")" ]; then
    decir "el puerto $PUERTO sirve $servido, y estas fotos son de $ARBOL: sería fotografiar OTRO árbol"
    return 3
  fi
  echo "árbol: $servido (puerto $PUERTO)"
}

if [ "${1:-}" = "--arbol" ]; then
  comprobar_arbol "${PERFIL:-$(cygpath -m "${TMPDIR:-/tmp}")/perfil-edge-arbol-$PUERTO}"
  exit $?
fi

if [ $# -lt 2 ]; then
  decir "uso: PUERTO=53xx bash foto.sh SALIDA.png \"CONSULTA\" [ANCHO] [ALTO]"
  exit 2
fi
salida="$1"
consulta="$2"
ancho="${3:-1280}"
alto="${4:-720}"
# Un parámetro repetido no hace lo que parece: el banco lee el PRIMERO (`URLSearchParams.get`), y
# «…&lluvia=0…&lluvia=1» sale sin lluvia. Pasó al fijar la R.
repetidos="$(printf '%s' "$consulta" | tr '&' '\n' | sed -n 's/^\([^=]*\)=.*/\1/p' | sort | uniq -d | tr '\n' ' ')"
if [ -n "$repetidos" ]; then
  decir "parámetros repetidos en la consulta: $repetidos(el banco lee el primero; quita el de la base)"
  exit 2
fi
nivel_pedido="$(printf '%s' "&$consulta" | sed -n 's/.*&nivel=\([^&]*\).*/\1/p')"
case "${nivel_pedido:-0}" in
  0|1|2|3) ;;
  *) decir "nivel=«$nivel_pedido» no es un nivel (0..3): el banco pintaría N0 sin decirlo"; exit 2 ;;
esac
# `ventana=` tiene que ser un centro de ventana DE ESE NIVEL (ver arriba): 48k con lado impar (N0, N1, N3) y 48k + 24
# con lado par (N2). Otro se redondea al montarla, la página lo diría después de 25 s de Edge y la foto se tiraría:
# se dice antes, sin abrir Edge.
ventana_pedida="$(printf '%s' "&$consulta" | sed -n 's/.*&ventana=\([^&]*\).*/\1/p')"
if [ -n "$ventana_pedida" ]; then
  desfase=0
  [ "${nivel_pedido:-0}" = "2" ] && desfase=24
  if ! printf '%s' "$ventana_pedida" | awk -F, -v d="$desfase" '{ if (NF != 2) exit 1; for (i = 1; i <= 2; i++) { if ($i !~ /^-?[0-9]+(\.[0-9]+)?$/) exit 1; r = ($i - d) / 48; if (r != int(r)) exit 1 } }'; then
    decir "ventana=$ventana_pedida no es un centro de ventana en N${nivel_pedido:-0}: tiene que ser 48k$([ "$desfase" = 24 ] && echo ' + 24') en x y en z (en N2 el centro cae en una raya entre celdas)"
    exit 2
  fi
fi
carpeta="$(mkdir -p "$(dirname "$salida")" && cd "$(dirname "$salida")" && pwd)"
nombre="$(basename "$salida")"
perfil="${PERFIL:-$carpeta/perfil-edge}"

if [ "${ARBOL_COMPROBADO:-}" != "$PUERTO|$ARBOL" ]; then
  comprobar_arbol "$perfil" >/dev/null || exit $?
fi

rm -f "$carpeta/$nombre"
dom="$(edge "$perfil" --window-size="$ancho,$alto" --virtual-time-budget="$PRESUPUESTO" \
  --screenshot="$(cygpath -w "$carpeta")\\$nombre" --dump-dom "$PAGINA?$consulta")"
if [ ! -s "$carpeta/$nombre" ]; then
  decir "sin foto: $salida"
  exit 1
fi

# Lo que dice la página de la foto: el árbol, el nivel, la ciudad y la ventana.
servido="$(printf '%s' "$dom" | marca arbol)"
if [ "$(minusculas "$servido")" != "$(minusculas "$ARBOL")" ]; then
  decir "la foto $nombre sale de «$servido», no de $ARBOL"
  rm -f "$carpeta/$nombre"
  exit 3
fi
malo=""
nivel_pintado="$(printf '%s' "$dom" | marca nivel)"
if [ "${nivel_pedido:-0}" != "$nivel_pintado" ]; then malo="nivel N$nivel_pintado y no N${nivel_pedido:-0}"; fi
if [ "$(printf '%s' "$dom" | marca ciudad)" != "lista" ]; then malo="$malo la ciudad no estaba construida"; fi
# La ventana a medias: la cámara lejos de donde se montó (o de `ventana=`) y la ventana recentrándose. La foto
# sería de un estado de paso, y con `ventana=` no la pedida aunque la pintada aún lo pareciera.
if [ "$(printf '%s' "$dom" | marca ventana-ocupada)" = "1" ]; then malo="$malo la ventana se estaba montando o recentrando"; fi
pedida="$(printf '%s' "$dom" | marca ventana-pedida)"
if [ -n "$pedida" ]; then
  pintada="$(printf '%s' "$dom" | marca ventana)"
  if [ "$pedida" != "$pintada" ]; then malo="$malo ventana pedida en ($pedida) y pintada en (${pintada:-ninguna}): la cámara se ha alejado de más"; fi
fi
if [ -n "$malo" ]; then
  decir "la foto $nombre no es la pedida:$malo"
  # Fuera: una tanda que la contara por estar en el disco daría por buena una foto que no lo es.
  rm -f "$carpeta/$nombre"
  exit 1
fi
echo "foto: $salida"
