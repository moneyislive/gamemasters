#!/bin/bash
# EL PROTOCOLO DE FOTOS DE LA CIUDAD (plan del detalle de la ciudad, §8): las posiciones fijas de `POSICIONES.md`
# en los niveles y las luces de la tanda, siempre igual, para comparar tandas con `hoja.mjs`.
#
#   PUERTO=5315 bash escritorio/scripts/fotos/protocolo.sh SALIDA [--solo A,C,E] [--edge 3] [--tomas 2]
#                                                                  [--juego] [--lista]
#
#   --solo A,C,E   sólo esas posiciones (cada paquete saca las de su ficha);
#   --edge N       N Edge a la vez, cada uno con su perfil (por omisión 3; con otros agentes en la máquina, 2);
#   --tomas N      N tomas iguales, en SALIDA/toma1 … SALIDA/tomaN (el ruido: `hoja.mjs toma1 toma2`);
#   --juego        todas con `camino=juego` (posproceso y DPR del nivel), con `-juego` en el nombre;
#   --lista        dice qué fotos sacaría y cuántas, sin sacar ninguna.
#
# LA TANDA COMPLETA son 76 fotos (§8), más 3 máscaras de profundidad de la P:
#   · A-O (15 posiciones) en N1 y N3, de madrugada y al alba: 60;
#   · N0 de madrugada en A, B, E y L; N2 de madrugada en C y E: 6;
#   · móvil apaisado (844 × 390, N1, madrugada) en A y E: 2;
#   · P (el recentrado), de madrugada, en N0, N1 y N3, con la ventana de antes y la de después del cruce: 6, y
#     su máscara de lo que está a menos de 40 m (`mascara=40`) en cada nivel: 3 ficheros `-mascara40` que la hoja
#     usa con `--profundidad` y no compara;
#   · R (el vado con lluvia), de madrugada, en N1 y N3: 2.
#
# Nombres: `<letra>-<nombre>-n<nivel>-<luz>[-<variante>][-movil][-juego].png`, los mismos en todas las tandas.
# El árbol se comprueba UNA vez por tanda (`foto.sh --arbol`) y cada foto vuelve a mirarlo en su DOM. Sale con 0 si
# están todas; 1 si falta alguna; 2 o 3 si no se puede mirar o el puerto sirve otro árbol (lo de `foto.sh`).
set -u

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FOTO="$AQUI/foto.sh"
POSICIONES_MD="$AQUI/POSICIONES.md"

decir() { echo "protocolo.sh: $*" >&2; }

SALIDA=""
SOLO=""
EDGES=3
TOMAS=1
JUEGO=0
LISTA=0
# Una opción con valor que llega la última no lo trae, y `shift 2` con un solo argumento no quita NADA (bash lo
# rechaza entero): el bucle se quedaba para siempre en ella. Por eso `[ $# -ge 2 ]` antes de cada `shift 2`.
while [ $# -gt 0 ]; do
  case "$1" in
    --solo) [ $# -ge 2 ] || { decir "--solo necesita las letras (p. ej. --solo A,C,E)"; exit 2; }; SOLO="$2"; shift 2 ;;
    --edge) [ $# -ge 2 ] || { decir "--edge necesita un número (p. ej. --edge 2)"; exit 2; }; EDGES="$2"; shift 2 ;;
    --tomas) [ $# -ge 2 ] || { decir "--tomas necesita un número (p. ej. --tomas 2)"; exit 2; }; TOMAS="$2"; shift 2 ;;
    --juego) JUEGO=1; shift ;;
    --lista) LISTA=1; shift ;;
    -*) decir "opción desconocida: $1"; exit 2 ;;
    *) SALIDA="$1"; shift ;;
  esac
done
if [ -z "$SALIDA" ]; then decir "falta la carpeta de la tanda (p. ej. …/scratchpad/detalle/fotos/antes)"; exit 2; fi
case "$EDGES" in ''|*[!0-9]*|0) decir "--edge tiene que ser un número ≥ 1"; exit 2 ;; esac
case "$TOMAS" in ''|*[!0-9]*|0) decir "--tomas tiene que ser un número ≥ 1"; exit 2 ;; esac

# La base (§8), sin el nivel, la luz ni la posición, que pone cada foto.
BASE="$(sed -n 's/^BASE=//p' "$POSICIONES_MD" | head -1)"
if [ -z "$BASE" ]; then decir "no encuentro la línea BASE= en $POSICIONES_MD"; exit 2; fi

# Las posiciones: el bloque entre las dos marcas de POSICIONES.md, una por línea: LETRA|nombre|pos|extra|variantes.
declare -A NOMBRE POS EXTRA VARIANTES
LETRAS=()
while IFS='|' read -r letra nombre pos extra variantes; do
  NOMBRE[$letra]="$nombre"
  POS[$letra]="$pos"
  EXTRA[$letra]="$extra"
  VARIANTES[$letra]="$variantes"
  LETRAS+=("$letra")
done < <(sed -n '/<!-- protocolo:inicio -->/,/<!-- protocolo:fin -->/p' "$POSICIONES_MD" | grep -E '^[A-Z]\|')
if [ "${#LETRAS[@]}" -ne 17 ]; then decir "POSICIONES.md trae ${#LETRAS[@]} posiciones y el protocolo tiene 17"; exit 2; fi

pedida() { # ¿entra esta letra con --solo?
  [ -z "$SOLO" ] && return 0
  case ",$SOLO," in *",$1,"*) return 0 ;; esac
  return 1
}
if [ -n "$SOLO" ]; then
  for l in $(printf '%s' "$SOLO" | tr ',' ' '); do
    if [ -z "${NOMBRE[$l]:-}" ]; then decir "--solo: no hay posición «$l»"; exit 2; fi
  done
fi

# La consulta: la base sin los parámetros que la foto vuelve a dar (el banco lee el PRIMERO de dos iguales), y los suyos.
consulta() {
  local extra="$1" q="$BASE" clave
  for clave in $(printf '%s' "$extra" | tr '&' '\n' | sed -n 's/^\([^=]*\)=.*/\1/p'); do
    q="$(printf '%s' "&$q" | sed -e "s/&$clave=[^&]*//g" -e 's/^&//')"
  done
  printf '%s%s' "$q" "$extra"
}

# Una foto a la lista: fichero|consulta|ancho|alto
TRABAJOS=()
anadir() { # letra nivel luz [variante] [ancho alto]
  local l="$1" n="$2" luz="$3" var="${4:-}" ancho="${5:-1280}" alto="${6:-720}" extra nombre
  extra="&nivel=$n&luz=$luz&pos=${POS[$l]}${EXTRA[$l]}"
  nombre="$l-${NOMBRE[$l]}-n$n-$luz"
  if [ -n "$var" ]; then
    local v="${VARIANTES[$l]}" trozo
    trozo="$(printf '%s' "$v" | tr ';' '\n' | sed -n "s/^$var://p")"
    extra="$extra$trozo"
    nombre="$nombre-$var"
  fi
  if [ "$ancho" != "1280" ]; then nombre="$nombre-movil"; fi
  if [ "$JUEGO" = "1" ] && [ "${var#mascara}" = "$var" ]; then
    extra="$extra&camino=juego"
    nombre="$nombre-juego"
  fi
  TRABAJOS+=("$nombre.png|$(consulta "$extra")|$ancho|$alto")
}

for l in A B C D E F G H I J K L M N O; do
  pedida "$l" || continue
  for n in 1 3; do for luz in madrugada alba; do anadir "$l" "$n" "$luz"; done; done
done
for l in A B E L; do pedida "$l" && anadir "$l" 0 madrugada; done
for l in C E; do pedida "$l" && anadir "$l" 2 madrugada; done
for l in A E; do pedida "$l" && anadir "$l" 1 madrugada "" 844 390; done
if pedida P; then
  for n in 0 1 3; do
    anadir P "$n" madrugada antes
    anadir P "$n" madrugada despues
    anadir P "$n" madrugada mascara40
  done
fi
if pedida R; then for n in 1 3; do anadir R "$n" madrugada; done; fi

if [ "$LISTA" = "1" ]; then
  for t in "${TRABAJOS[@]}"; do
    IFS='|' read -r f q an al <<< "$t"
    echo "$f  ($an×$al)  $q"
  done
  fotos=$(printf '%s\n' "${TRABAJOS[@]}" | grep -vc -- '-mascara')
  echo "fotos: $fotos (+ $(( ${#TRABAJOS[@]} - fotos )) máscaras) por toma, $TOMAS toma(s)"
  exit 0
fi

if [ -z "${PUERTO:-}" ]; then decir "falta PUERTO: el vite de ESTE árbol (lo explica foto.sh)"; exit 2; fi
mkdir -p "$SALIDA"
SALIDA="$(cygpath -m "$(cd "$SALIDA" && pwd)")"

# El árbol, una vez por tanda.
PERFIL="$SALIDA/.perfil-edge-0" bash "$FOTO" --arbol || exit $?
export ARBOL="${ARBOL:-$(cygpath -m "$(cd "$AQUI/../../.." && pwd)")}"
export ARBOL_COMPROBADO="$PUERTO|$ARBOL"

trabajador() { # k carpeta
  local k="$1" dir="$2" i=0 t f q an al
  for t in "${TRABAJOS[@]}"; do
    if [ $((i % EDGES)) -eq "$k" ]; then
      IFS='|' read -r f q an al <<< "$t"
      PERFIL="$SALIDA/.perfil-edge-$k" bash "$FOTO" "$dir/$f" "$q" "$an" "$al" >/dev/null || echo "FALLO $dir/$f" >&2
    fi
    i=$((i + 1))
  done
}

faltan=0
total=0
for toma in $(seq 1 "$TOMAS"); do
  dir="$SALIDA"
  [ "$TOMAS" -gt 1 ] && dir="$SALIDA/toma$toma"
  mkdir -p "$dir"
  for k in $(seq 0 $((EDGES - 1))); do trabajador "$k" "$dir" & done
  wait
  for t in "${TRABAJOS[@]}"; do
    f="${t%%|*}"
    total=$((total + 1))
    if [ ! -s "$dir/$f" ]; then
      faltan=$((faltan + 1))
      decir "falta $dir/$f"
    fi
  done
done
echo "tanda en $SALIDA: $((total - faltan)) de $total ficheros ($TOMAS toma(s), ${#TRABAJOS[@]} por toma)"
[ "$faltan" -eq 0 ] || exit 1
