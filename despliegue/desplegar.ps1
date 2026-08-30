<#
.SYNOPSIS
  Despliega GameMasters en la instancia, desde Windows.

.DESCRIPTION
  ═══ QUE ES ESTO Y QUE NO ES ═══

  NO es una version para Windows de `desplegar.sh`. El servidor es una EC2 con
  Ubuntu: alli hay systemd, nginx y un usuario `gamemasters`, y el guion que
  hace el trabajo tiene que seguir siendo el de bash. Traducirlo a PowerShell no
  tendria donde correr.

  Esto es el MANDO desde aqui: entra por SSH, lanza aquel guion, y despues
  comprueba el sitio DESDE FUERA. Esa segunda parte es la que no puede hacer el
  guion de dentro y es la que de verdad importa: un despliegue que dice «✔ en
  pie» porque el servicio contesta en `localhost` puede haber dejado nginx
  sirviendo la version vieja, o el certificado caducado, o el dominio apuntando
  a otro sitio. Lo que decide si esta bien es lo que ve un movil desde la calle.

.PARAMETER Servidor
  usuario@maquina de la instancia. Por ejemplo: ubuntu@203.0.113.10

.PARAMETER Llave
  Ruta al .pem de AWS. Si tu ~/.ssh/config ya resuelve el destino, se omite.

.PARAMETER Dominio
  Que direccion comprobar al terminar. Por defecto https://harkania.com

.EXAMPLE
  .\desplegar.ps1 -Servidor ubuntu@203.0.113.10 -Llave C:\claves\harkania.pem

  La primera vez se dan los datos; se recuerdan en `destino.local.json`, que
  esta en .gitignore. A partir de ahi:

  .\desplegar.ps1
#>
[CmdletBinding()]
param(
  [string]$Servidor,
  [string]$Llave,
  [string]$Dominio,
  # Solo comprueba el sitio. No toca la instancia.
  [switch]$SoloComprobar
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

<#
  LA CONSOLA, EN UTF-8, Y EL FICHERO CON BOM.

  Son dos cosas distintas y hacen falta las dos:

    · La SALIDA. Sin esta linea, Windows PowerShell 5.1 escribe en la pagina de
      codigos del sistema y un parte con acentos sale ilegible. Un parte
      ilegible se lee por encima, que es justo cuando se pasa por alto la linea
      que estaba en rojo.

    · El FICHERO. PowerShell 5.1 lee un .ps1 sin BOM como ANSI, asi que las
      tildes y las comillas angulares ESCRITAS AQUI DENTRO salen rotas aunque
      la consola este en UTF-8. Este fichero se guarda con BOM a proposito. Si
      alguien lo reescribe con un editor que lo quite, se nota enseguida: los
      mensajes empiezan a decir «AparcamiÃ©nto».
#>
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

# ---------------------------------------------------------------------------
# El destino, recordado
# ---------------------------------------------------------------------------

<#
  SE GUARDA PARA NO TENER QUE ACORDARSE, y esa no es una comodidad menor: un
  despliegue que exige recordar una IP se acaba haciendo con una IP copiada de
  un chat viejo. El fichero esta en .gitignore porque una direccion de servidor
  y una ruta de clave no son cosa del repositorio.
#>
$ficheroDestino = Join-Path $PSScriptRoot 'destino.local.json'
$recordado = if (Test-Path $ficheroDestino) {
  Get-Content $ficheroDestino -Raw | ConvertFrom-Json
} else { $null }

if (-not $Servidor -and $recordado) { $Servidor = $recordado.servidor }
if (-not $Llave -and $recordado) { $Llave = $recordado.llave }
if (-not $Dominio) { $Dominio = if ($recordado -and $recordado.dominio) { $recordado.dominio } else { 'https://harkania.com' } }

if (-not $SoloComprobar -and -not $Servidor) {
  Write-Host ''
  Write-Host 'No se a que maquina ir, y no me la voy a inventar.' -ForegroundColor Yellow
  Write-Host ''
  Write-Host '  .\desplegar.ps1 -Servidor ubuntu@LA.IP.DE.TU.EC2 -Llave C:\ruta\tu-clave.pem'
  Write-Host ''
  Write-Host 'Se recuerda para las siguientes veces. Si solo quieres mirar si el'
  Write-Host 'sitio esta en pie, sin desplegar:  .\desplegar.ps1 -SoloComprobar'
  Write-Host ''
  exit 2
}

# ---------------------------------------------------------------------------
# Comprobar el sitio desde fuera
# ---------------------------------------------------------------------------

function Probar-ElSitio {
  param([string]$Base)

  <#
    UNA SOLA FORMA DE PEDIR, y compatible con Windows PowerShell 5.1.

    Aqui se usaba `-SkipHttpErrorCheck`, que es de PowerShell 7 y en 5.1 —la
    que trae Windows de serie— ni siquiera es un parametro: no es que no
    funcione, es que la llamada no llega a hacerse. Las tres comprobaciones
    fallaban por el guion y no por el sitio, que es la peor clase de rojo:
    parece que el servidor esta mal.

    En 5.1 un codigo que no sea 2xx lanza excepcion, y el codigo de verdad esta
    dentro. Se saca de ahi, porque un 401 en el taller es CORRECTO —esta detras
    de contrasena— y darlo por caido seria mentir en la otra direccion.
  #>
  function Pedir([string]$url) {
    try {
      $r = Invoke-WebRequest -Uri $url -TimeoutSec 15 -UseBasicParsing
      return [pscustomobject]@{ Codigo = [int]$r.StatusCode; Cabeceras = $r.Headers; Fallo = $null }
    } catch {
      $resp = $_.Exception.Response
      if ($resp) {
        return [pscustomobject]@{ Codigo = [int]$resp.StatusCode; Cabeceras = $resp.Headers; Fallo = $null }
      }
      # Sin respuesta: no llego. DNS, cortafuegos, la maquina apagada.
      return [pscustomobject]@{ Codigo = 0; Cabeceras = $null; Fallo = $_.Exception.Message }
    }
  }

  $salud = Pedir "$Base/api/salud"
  $taller = Pedir $Base
  $app = Pedir "$Base/jugar"

  <#
    ═══ SI NO CONTESTA NADA, DECIR POR QUE ═══

    Cuatro lineas de «La operacion sobrepaso el tiempo de espera» no dicen si
    el servicio esta caido, si nginx no arranco o si el dominio ni siquiera
    apunta a la instancia. Son tres arreglos distintos.

    El caso real: `harkania.com` resolvia a 198.54.117.242 y contestaba en el
    puerto 80 con `Server: namecheap-web` — la pagina de aparcamiento del
    registrador. El sitio no estaba caido: nunca se habia apuntado. El LEEME lo
    pide en el paso 3 —«borra el registro de aparcamiento»— y es de las cosas
    que se quedan a medias sin que nada avise.
  #>
  if ($salud.Codigo -eq 0 -and $taller.Codigo -eq 0) {
    $maquina = ([Uri]$Base).Host
    try {
      $ip = (Resolve-DnsName $maquina -Type A -ErrorAction Stop | Select-Object -First 1).IPAddress
      Write-Host ''
      Write-Host "  El dominio $maquina resuelve a $ip y no contesta en 443." -ForegroundColor Yellow
      try {
        $r80 = Invoke-WebRequest -Uri "http://$maquina" -TimeoutSec 10 -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
        $quien = [string]$r80.Headers['Server']
      } catch {
        $resp80 = $_.Exception.Response
        $quien = if ($resp80) { [string]$resp80.Headers['Server'] } else { '' }
      }
      if ($quien) {
        Write-Host "  En el puerto 80 contesta: $quien" -ForegroundColor Yellow
        if ($quien -match 'namecheap|parking|sedo|godaddy') {
          Write-Host '  Eso es la pagina de APARCAMIENTO del registrador: el DNS' -ForegroundColor Yellow
          Write-Host '  todavia no apunta a la instancia. Paso 3 del LEEME.' -ForegroundColor Yellow
        }
      }
    } catch {
      Write-Host ''
      Write-Host "  $maquina ni siquiera resuelve. Mira el DNS antes que nada." -ForegroundColor Yellow
    }
  }

  $hsts = $null
  if ($taller.Cabeceras) {
    try { $hsts = $taller.Cabeceras['Strict-Transport-Security'] } catch { }
  }

  $resultados = @(
    [pscustomobject]@{
      Que = 'La senal de vida responde'
      Bien = $salud.Codigo -eq 200
      Detalle = if ($salud.Fallo) { $salud.Fallo } else { $salud.Codigo }
    },
    <#
      401 ES CORRECTO: el taller esta detras de APP_PASSWORD. Lo malo seria un
      502 —nginx en pie y el servicio caido— o un 404.
    #>
    [pscustomobject]@{
      Que = 'El taller contesta (200 o 401)'
      Bien = $taller.Codigo -in @(200, 401)
      Detalle = if ($taller.Fallo) { $taller.Fallo } else { $taller.Codigo }
    },
    <#
      LA APP SE COMPRUEBA APARTE del taller a proposito: la sirve otro
      `express.static` desde otra carpeta —`app/dist`— y se ha quedado sin
      desplegar mas de una vez sin que el taller se enterara de nada.
    #>
    [pscustomobject]@{
      Que = 'La app se sirve en /jugar'
      Bien = $app.Codigo -eq 200
      Detalle = if ($app.Fallo) { $app.Fallo } else { $app.Codigo }
    },
    [pscustomobject]@{
      Que = 'El certificado y HSTS estan puestos'
      Bien = [bool]$hsts
      Detalle = if ($hsts) { 'si' } else { 'sin cabecera' }
    }
  )

  Write-Host ''
  foreach ($r in $resultados) {
    $marca = if ($r.Bien) { 'OK  ' } else { 'MAL ' }
    $color = if ($r.Bien) { 'Green' } else { 'Red' }
    Write-Host ("  {0}{1,-36} {2}" -f $marca, $r.Que, $r.Detalle) -ForegroundColor $color
  }

  return ($resultados | Where-Object { -not $_.Bien }).Count
}

if ($SoloComprobar) {
  Write-Host "`nMirando $Dominio desde fuera" -ForegroundColor Cyan
  $mal = Probar-ElSitio -Base $Dominio
  Write-Host ''
  exit ($(if ($mal -eq 0) { 0 } else { 1 }))
}

# ---------------------------------------------------------------------------
# Desplegar
# ---------------------------------------------------------------------------

$argsSsh = @()
if ($Llave) {
  if (-not (Test-Path $Llave)) {
    Write-Host "No esta la clave: $Llave" -ForegroundColor Red
    exit 2
  }
  $argsSsh += @('-i', $Llave)
}
$argsSsh += @('-o', 'StrictHostKeyChecking=accept-new', $Servidor)

Write-Host "`nDesplegando en $Servidor" -ForegroundColor Cyan
Write-Host '  (el guion compila ANTES de parar nada: si falla, el servicio viejo sigue)' -ForegroundColor DarkGray
Write-Host ''

<#
  `-t` para que la salida vaya llegando segun ocurre. Un despliegue tarda
  minutos y mirar una consola muda no dice si esta compilando o colgada.
#>
& ssh @argsSsh -t 'sudo /opt/gamemasters/despliegue/desplegar.sh'
$codigo = $LASTEXITCODE

if ($codigo -ne 0) {
  Write-Host ''
  Write-Host "El despliegue termino con codigo $codigo. NO se da por bueno." -ForegroundColor Red
  Write-Host 'El propio guion imprime las ultimas lineas del registro cuando no levanta.' -ForegroundColor DarkGray
  exit $codigo
}

# ---------------------------------------------------------------------------
# Y ahora lo que el guion de dentro no puede comprobar
# ---------------------------------------------------------------------------

Write-Host ''
Write-Host "Comprobando $Dominio desde fuera" -ForegroundColor Cyan
$mal = Probar-ElSitio -Base $Dominio

if ($mal -eq 0) {
  # Solo se recuerda un destino que ha funcionado de punta a punta.
  @{ servidor = $Servidor; llave = $Llave; dominio = $Dominio } |
    ConvertTo-Json |
    Set-Content -Path $ficheroDestino -Encoding utf8
  Write-Host ''
  Write-Host "Desplegado y en pie: $Dominio" -ForegroundColor Green
  Write-Host ''
  exit 0
}

Write-Host ''
Write-Host "$mal comprobaciones en rojo. El servicio arranco pero desde fuera no se ve bien." -ForegroundColor Red
Write-Host 'Mira nginx y el certificado; el registro del servicio con:' -ForegroundColor DarkGray
Write-Host "  ssh $Servidor 'sudo journalctl -u gamemasters -n 60 --no-pager'" -ForegroundColor DarkGray
Write-Host ''
exit 1
