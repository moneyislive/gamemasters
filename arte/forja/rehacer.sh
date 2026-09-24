#!/usr/bin/env bash
# LA ORDEN ÚNICA de la forja (Git Bash). Rehace el reparto entero y lo deja en el juego:
#
#   bash arte/forja/rehacer.sh                 todo: figuras, piezas, clips, empaquetado, capturas y batería
#   bash arte/forja/rehacer.sh sin-capturas    lo mismo sin las capturas (lo que hace falta para el juego)
#   bash arte/forja/rehacer.sh figuras|clips|piezas|empaquetar|capturas|bateria     una fase suelta
#   FIGS="celador-hombre-alto" bash arte/forja/rehacer.sh figuras                   sólo esas figuras
#
# Sale con código distinto de 0 si falla un Blender, el empaquetado o la batería. Los registros de
# cada Blender quedan en arte/forja/obra/tmp/out_*.txt.
#
# ═══ POR QUÉ UN REINTENTO ═══ OpenVDB (el remallado por vóxeles) revienta de vez en cuando con
# varios Blender a la vez (~1 de cada 8 en el prototipo). Un reintento lo cura; dos fallos seguidos
# son un fallo de verdad.
set -u
cd "$(dirname "$0")"
B="${BLENDER:-C:/Program Files/Blender Foundation/Blender 4.2/blender.exe}"
PY="${BLENDER_PY:-C:/Program Files/Blender Foundation/Blender 4.2/4.2/python/bin/python.exe}"
TODAS=$("$PY" -c "import reparto; print(' '.join(reparto.FIGURAS))")
FIGS="${FIGS:-$TODAS}"
PARALELO="${PARALELO:-5}"
mkdir -p obra/tmp obra/figuras obra/piezas capturas
MODO="${1:-todo}"

correr() {   # correr <registro> <args...>: lanza Blender y reintenta una vez (el primer registro queda en .1)
  local log="$1"; shift
  "$B" -b --factory-startup --python-exit-code 1 "$@" > "$log" 2>&1 && return 0
  echo "  reintento: $*" >&2
  mv -f "$log" "$log.1"
  "$B" -b --factory-startup --python-exit-code 1 "$@" > "$log" 2>&1
}

en_paralelo() {   # en_paralelo <funcion> <elementos...>: como mucho $PARALELO a la vez
  # (con `wait -n`: en cuanto acaba uno entra otro; esperar al mas viejo dejaba la cola parada
  # detras de la figura lenta)
  local fn="$1"; shift
  local fallo=0 vivos=0
  for x in "$@"; do
    "$fn" "$x" &
    vivos=$((vivos + 1))
    if [ "$vivos" -ge "$PARALELO" ]; then
      wait -n || fallo=1
      vivos=$((vivos - 1))
    fi
  done
  while [ "$vivos" -gt 0 ]; do
    wait -n || fallo=1
    vivos=$((vivos - 1))
  done
  return $fallo
}

una_figura() { correr "obra/tmp/out_$1.txt" --python forja.py -- fig="$1" pasos=construir; }
unas_capturas() { correr "obra/tmp/out_capt_$1.txt" --python forja.py -- fig="$1" pasos=hoja,cara,lod,manos,tiras; }
un_sexo() { correr "obra/tmp/out_clips_$1.txt" --python forja.py -- fig=clips sexo="$1"; }
una_comprobacion() { "$B" -b --factory-startup --python-exit-code 1 --python comprobar.py -- fig="$1" > "obra/tmp/comp_$1.txt" 2>&1; }

fase_figuras() { echo "== figuras ($(echo $FIGS | wc -w))"; en_paralelo una_figura $FIGS; }
fase_clips() { echo "== clips"; en_paralelo un_sexo m f; }
fase_piezas() { echo "== piezas"; correr obra/tmp/out_piezas.txt --python forja.py -- fig=piezas; }
fase_empaquetar() { echo "== empaquetar"; "$PY" empaquetar.py; }
fase_capturas() { echo "== capturas"; en_paralelo unas_capturas $FIGS; "$B" -b --factory-startup --python-exit-code 1 --python mosaico.py > obra/tmp/out_mosaico.txt 2>&1; }
fase_bateria() {
  echo "== bateria"
  local fallo=0
  en_paralelo una_comprobacion $FIGS || fallo=1
  "$PY" validar.py > obra/tmp/validacion.txt 2>&1 || fallo=1
  node en_three.mjs > obra/tmp/en_three.txt 2>&1 || fallo=1
  "$PY" resumen.py || fallo=1
  return $fallo
}

estado=0
case "$MODO" in
  figuras) fase_figuras || estado=1 ;;
  clips) fase_clips || estado=1 ;;
  piezas) fase_piezas || estado=1 ;;
  empaquetar) fase_empaquetar || estado=1 ;;
  capturas) fase_capturas || estado=1 ;;
  bateria) fase_bateria || estado=1 ;;
  todo|sin-capturas)
    fase_figuras || { echo "Fallo alguna figura: mira obra/tmp/out_*.txt"; exit 1; }
    fase_piezas || { echo "Fallo las piezas: mira obra/tmp/out_piezas.txt"; exit 1; }
    fase_clips || { echo "Fallo el horneado: mira obra/tmp/out_clips_*.txt"; exit 1; }
    fase_empaquetar || { echo "Fallo el empaquetado"; exit 1; }
    if [ "$MODO" = "todo" ]; then fase_capturas || estado=1; fi
    fase_bateria || estado=1
    ;;
  *) echo "fase desconocida: $MODO"; exit 2 ;;
esac
if [ $estado -eq 0 ]; then echo "Hecho: escritorio/src/quiebro/recursos/ y arte/forja/obra/"; else echo "Terminado CON FALLOS (mira obra/tmp/comp_*.txt, validacion.txt, en_three.txt)"; fi
exit $estado
