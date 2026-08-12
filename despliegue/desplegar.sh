#!/usr/bin/env bash
#
# Actualizar GameMasters en la instancia. Se ejecuta con sudo.
#
#   sudo /opt/gamemasters/despliegue/desplegar.sh
#
# LO QUE HACE Y EN QUÉ ORDEN importa: se compila ANTES de parar nada, para que un
# fallo de compilación deje el servicio viejo funcionando en vez de tumbarlo y
# dejar la casa sin servidor a mitad de una velada.

set -euo pipefail

RAIZ=/opt/gamemasters
DOMINIO=https://harkania.com

cd "$RAIZ"

echo "· Trayendo los cambios"
sudo -u gamemasters git pull --ff-only

echo "· Instalando dependencias"
npm ci

echo "· Compilando (el servicio viejo sigue en pie)"
npm run build

chown -R gamemasters:gamemasters "$RAIZ"

echo "· Actualizando nginx desde el repositorio"
cp "$RAIZ/despliegue/nginx-harkania.conf" /etc/nginx/sites-available/harkania
# `nginx -t` antes de recargar: una recarga con la configuración rota deja el
# sitio caído, y con `set -e` este script pararía aquí, que es lo que se quiere.
nginx -t
systemctl reload nginx

echo "· Reiniciando el servicio"
systemctl restart gamemasters

echo "· Esperando a que responda"
for intento in $(seq 1 30); do
  if curl -fsS "$DOMINIO/api/salud" >/dev/null 2>&1; then
    echo "✔ En pie: $DOMINIO"
    exit 0
  fi
  sleep 2
done

# Si no responde, se dice y se enseña el porqué. Terminar en silencio con un
# servicio caído es la peor manera de acabar un despliegue.
echo "✘ No responde después de 60 segundos. Últimas líneas del registro:" >&2
journalctl -u gamemasters -n 40 --no-pager >&2
exit 1
