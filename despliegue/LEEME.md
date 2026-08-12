# Poner GameMasters en producción, en una EC2, bajo harkania.com

Los comandos están en el orden en que hay que darlos. **El orden importa**: casi
todo lo que sale mal la primera noche es un paso hecho antes de tiempo.

Supuestos: Ubuntu 24.04 LTS en una instancia `t3.small` o mayor (con 1 GB la
compilación del cliente se queda sin memoria), y una IP elástica ya asociada.

---

## 0. Antes de tocar la máquina

Estas tres cosas se hacen en la consola de AWS y en Namecheap, y **bloquean todo
lo demás**:

1. **Grupo de seguridad**: abrir `80/tcp` y `443/tcp` desde `0.0.0.0/0`, y dejar
   `22/tcp` **solo desde tu IP**. Una instancia recién creada trae únicamente el
   22 abierto, y sin el 80 el reto de Let's Encrypt falla con «Timeout during
   connect (likely firewall problem)», que no dice nada de grupos de seguridad.
2. **IP elástica**: asociarla. Sin ella la IP cambia en cada parada y el DNS
   apunta al vacío.
3. **DNS en Namecheap** (*Advanced DNS*): registro `A` para `@` y otro para
   `www`, los dos a la IP elástica. Borra el registro de aparcamiento
   (`192.64.119.242`) y la redirección `URL Redirect` si está puesta.

Comprueba la propagación **desde tu portátil**, no desde la instancia:

```bash
nslookup harkania.com
```

Hasta que eso devuelva tu IP elástica, no sigas: certbot fallará.

---

## 1. Sistema, usuario y Node

```bash
sudo apt update && sudo apt install -y nginx git curl
```

Node 20 (los repositorios de Ubuntu traen una versión demasiado vieja):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
```

Comprueba que es la que crees, y **apunta la ruta**: la unidad de systemd la
clava en `ExecStart`.

```bash
node -v && command -v node
```

El usuario del servicio, sin shell y sin poder iniciar sesión:

```bash
sudo useradd --system --home-dir /opt/gamemasters --shell /usr/sbin/nologin gamemasters
```

---

## 2. El disco de las fotos

Las fotos de los invitados **no pueden vivir en el disco raíz**: se pierden al
recrear la instancia. Con un volumen EBS aparte ya conectado:

```bash
lsblk
```

El nombre que enseña la consola de AWS (`/dev/sdf`) **no** es el que ve la
instancia: ahí suele ser `/dev/nvme1n1`. Usa el que salga en `lsblk`, y solo si
la columna `FSTYPE` está vacía (si no, ya tiene datos y lo formatearías):

```bash
sudo mkfs -t xfs /dev/nvme1n1
```

```bash
sudo mkdir -p /var/lib/gamemasters && sudo blkid /dev/nvme1n1
```

Añade a `/etc/fstab` una línea con el UUID que acaba de salir. El `nofail` es
importante: sin él, un disco que no monte deja la máquina sin arrancar y sin
consola.

```
UUID=<el-que-salga>  /var/lib/gamemasters  xfs  defaults,nofail  0  2
```

```bash
sudo mount -a && findmnt /var/lib/gamemasters && sudo chown -R gamemasters:gamemasters /var/lib/gamemasters
```

Si `findmnt` no devuelve nada, **para aquí**: el servidor crearía la carpeta en
el disco raíz y las fotos se perderían sin avisar.

---

## 3. El código

```bash
sudo git clone https://github.com/<tu-usuario>/GameMasters.git /opt/gamemasters
```

```bash
cd /opt/gamemasters && sudo npm ci && sudo npm run build
```

`npm ci` y no `npm install`: hacen falta las dependencias de desarrollo para
compilar, y `ci` respeta el `package-lock.json` en vez de resolver versiones
nuevas la noche del despliegue.

```bash
sudo chown -R gamemasters:gamemasters /opt/gamemasters
```

---

## 4. Los secretos

```bash
sudo mkdir -p /etc/gamemasters && sudo cp /opt/gamemasters/.env.example /etc/gamemasters/entorno
```

Edítalo (`sudo nano /etc/gamemasters/entorno`) y rellena al menos:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `PUBLIC_ORIGIN` | `https://harkania.com` — sin barra final |
| `UPLOADS_DIR` | `/var/lib/gamemasters/uploads` |
| `APP_PASSWORD` | la contraseña de la casa |
| `PLAYER_TOKEN_SECRET` | 32+ caracteres al azar |
| `ANTHROPIC_API_KEY`, `MONGODB_URI` | los de siempre |
| `GM_ADMITIDOS` | tu correo, o tu cuenta de Google no abrirá el taller |

Y ciérralo a cal y canto, porque ahí dentro hay claves de pago:

```bash
sudo chown root:root /etc/gamemasters/entorno && sudo chmod 600 /etc/gamemasters/entorno
```

En **Atlas**, añade la IP elástica a la lista de direcciones permitidas. No uses
`0.0.0.0/0`: con la IP fija ya no hace falta, y esa entrada abre la base de datos
a internet entero.

---

## 5. El servicio

```bash
sudo cp /opt/gamemasters/despliegue/gamemasters.service /etc/systemd/system/
```

Si `command -v node` del paso 1 no dijo `/usr/bin/node`, corrige `ExecStart`
antes de seguir.

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now gamemasters && sudo systemctl status gamemasters --no-pager
```

Tiene que responder en local **antes** de tocar nginx:

```bash
curl -fsS http://127.0.0.1:5174/api/salud
```

Si falla, el porqué está aquí:

```bash
sudo journalctl -u gamemasters -n 50 --no-pager
```

---

## 6. nginx y el certificado

Aquí está el paso donde se pierde la noche si se hace al revés. **Primero el
fichero sin cifrado**, porque el definitivo apunta a un certificado que todavía
no existe y nginx se niega a arrancar sin él.

```bash
sudo mkdir -p /var/www/certbot && sudo cp /opt/gamemasters/despliegue/nginx-harkania-http.conf /etc/nginx/sites-available/harkania
```

```bash
sudo ln -sf /etc/nginx/sites-available/harkania /etc/nginx/sites-enabled/harkania && sudo rm -f /etc/nginx/sites-enabled/default
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Comprueba el reto **desde tu portátil, no desde la instancia** — desde dentro
funciona aunque el grupo de seguridad esté cerrado, que es la trampa:

```bash
echo hola | sudo tee /var/www/certbot/.well-known/acme-challenge/prueba
```

```bash
curl http://harkania.com/.well-known/acme-challenge/prueba
```

Si eso no dice `hola`, el problema es el paso 0. Cuando lo diga:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d harkania.com -d www.harkania.com --agree-tos -m tu-correo@ejemplo.com --no-eff-email
```

Y **ahora** el fichero definitivo:

```bash
sudo cp /opt/gamemasters/despliegue/nginx-harkania.conf /etc/nginx/sites-available/harkania && sudo nginx -t && sudo systemctl reload nginx
```

```bash
curl -fsS https://harkania.com/api/salud
```

La renovación es automática; compruébala en seco:

```bash
sudo certbot renew --dry-run
```

---

## 7. Comprobar que el dominio quedó bien atado

```bash
curl -sI https://harkania.com | grep -i strict-transport
```

```bash
curl -s https://harkania.com/.well-known/apple-app-site-association | head -c 200
```

Este último devuelve `404` mientras `APPLE_TEAM_ID` esté vacío, **y así tiene que
ser**: un fichero de asociación a medias lo cachea Apple durante días y deja la
aplicación desvinculada del dominio.

---

## Actualizar, a partir de aquí

```bash
sudo /opt/gamemasters/despliegue/desplegar.sh
```

## Copias de seguridad

Ni Atlas ni el volumen EBS se copian solos. Activa las copias de Atlas en su
panel, y una política de instantáneas para el volumen en AWS Backup. Las fotos de
los invitados son datos personales de otras personas: perderlas no es solo una
molestia.
