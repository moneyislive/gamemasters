# LA CAPA ESPACIAL

Cómo entra IR Engine en esta casa: dónde vive, qué no puede tocar, cuánto cuesta y cómo lo
hereda el juego que venga.

> **Estado: DISEÑO.** Sustituye a `docs/TABLERO-RECORRIBLE.md`, que proponía un motor propio.
> Miguel decidió el 19 de septiembre de 2026 que IR Engine entra y que es innegociable. Este
> documento no discute esa decisión: la construye.
>
> Salió de una investigación de diecisiete agentes —cinco leyendo el árbol y la web, tres
> diseñando desde ángulos distintos, tres juzgando y **seis intentando romper la ganadora**—.
> Los seis la rompieron, cinco de forma mortal. Lo que sigue es la arquitectura que responde a
> los seis ataques, no la que ganó el panel.

---

## 0 · Las condiciones de Miguel

1. **IR Engine entra.** Innegociable.
2. **Sólo en los dispositivos que lo soporten.**
3. **Sólo cuando el usuario quiera ver el avatar sobre el tablero.**
4. **La verdad de la partida NO vive en IR.**
5. **Millones de usuarios sin gastar una fortuna en servidores.**
6. Modular: un juego nuevo lo hereda sin reimplementar colisiones ni red.

---

## 1 · Lo que la investigación encontró, con evidencia

Esto no cambia la decisión —es de Miguel— pero cambia el PLAN, y hay dos cosas que hay que
saber antes de empezar.

### IR Engine está parado, y se sabe por qué

| hecho | evidencia |
|---|---|
| El repo **no está archivado**, pero su último push a `dev` es del **17-jul-2025** | `api.github.com/repos/ir-engine/ir-engine` → `pushed_at: 2025-07-17`, `archived: false` |
| Es **todo el org**, no un repo: nada posterior en 61 repositorios | listado del org por `updated` |
| **69 pull requests abiertas** desde julio de 2025, sin fusionar | `open_issues_count: 69` |
| Infinite Reality se rebautizó **Napster Corporation** (may-2025) y despidió a ~100 personas, «mayormente desarrolladores», en **julio de 2025** — la misma semana del último commit | nota de prensa y cobertura |

### Y hay un detalle que afecta directamente a la obligación legal

**`ir-engine.org` no resuelve.** Y ése es exactamente el *Attribution URL* que el Exhibit B de
la propia licencia obliga a mostrar en cada arranque bajo CPAL §14. `docs.ir.world` tampoco
resuelve.

O sea: la obligación de atribución apunta hoy a un dominio muerto. Eso no la elimina —hay que
seguir mostrando el aviso— pero conviene que conste, porque es la clase de cosa que un
comprador o un auditor mira.

### npm es una vía muerta: hay que forkear el monorepo

`@ir-engine/ecs`, `@ir-engine/hyperflux` y `@ir-engine/spatial` tienen **una sola versión
publicada**, la `1.6.0`, las tres el 19-ago-2024 — mientras el código fuente va por la `1.0.3`.
npm lleva dos años sin reflejar el árbol. **La única vía real es forkear el monorepo de 6.645
commits**, con sus parches: el repo parchea el `scheduler` de React y parchea three 0.176 con
un diff de 726 kB.

### El acoplamiento con React no es por interfaz

`@ir-engine/hyperflux` declara `react@18.2.0` y `react-reconciler@0.29.0` como **dependencias
duras** —sin `peerDependencies`—, y no las usa para pintar: **construye un renderizador de
React propio** cuyo `HostConfig` lanza excepción en `createInstance` («Only logical components
are supported»). Usa el reconciliador como motor de lógica reactiva colgada de entidades ECS.

Eso importa mucho: **no se puede «quitar React» de hyperflux**, porque React ES su máquina de
estados. Y no hay vía React Native: el fork `callstack/react-native-ir-engine` se creó y se
empujó el mismo día (3-oct-2024) y **no tiene un solo commit propio**.

### Lo bueno, que es mucho

| pieza | hallazgo |
|---|---|
| **La red de IR es sustituible** | `PeerTransport` es una interfaz de tres callbacks. `mediasoup` es una implementación, no el contrato. **El bloqueo operativo de los puertos UDP desaparece si no usamos su red.** |
| **Arranca sin canvas** | headless de facto: así corre su `instanceserver`. |
| **El «controlador de avatar con colisiones» no es invención de IR** | es literalmente el `KinematicCharacterController` de **Rapier** (`createCharacterController`, `ColliderDesc.capsule`, `computeColliderMovement`), **Apache-2.0**, usable suelto. |

**Consecuencia para el plan, y hay que decirla:** de las tres capacidades que Miguel señala
—ECS, control de avatar con colisiones, y que los avatares se vean—, las tres existen fuera de
IR con licencias limpias y al día (bitECS, Rapier, y un canal de presencia propio). Lo que IR
aporta de verdad es **el pegamento**, y ese pegamento es lo que está parado y lo que pina React
18.

Eso **no cambia la decisión**. Cambia una cosa del diseño, y a mejor: **la arquitectura de abajo
es idéntica se ponga dentro de la caja el fork de IR o sus propios ladrillos.** La frontera es
la misma. Así que se construye la caja, se mete IR dentro, y si el fork se pudre dentro de dos
años la misma caja acepta Rapier+bitECS sin tocar ni un juego. Nada de lo que se escriba se
tira.

---

## 2 · Los dos planos, que es la idea entera

| | **la verdad** | **la presencia** |
|---|---|---|
| qué es | quién puso qué losa, quién ganó | dónde está andando tu avatar |
| quién manda | el reductor sellado | nadie: es efímera |
| frecuencia | una revisión por jugada | 10 por segundo |
| se persiste | siempre | jamás |
| si se cae | la partida se rompe | no ves a los demás, y ya |
| dónde corre | servidor (`sede: 'servidor'`) | dispositivo + un canal barato |

**IR Engine vive ENTERO en el segundo plano.** Eso es lo que lo hace asumible: se puede apagar,
degradar o no cargar, y la partida no se entera.

---

## 3 · La arquitectura

```
EL DISPOSITIVO
 │
 ├── EL ANFITRIÓN  (app Expo / escritorio Vite) ── React 19
 │     · tiene la LLAVE DE ASIENTO y el CÓDIGO DE MESA
 │     · habla con /api/arcade  (espera larga, la verdad)
 │     · tiene el SOCKET DE PRESENCIA
 │     · el juego declara su MUNDO  (datos puros, sin saber de IR)
 │     │
 │     ├── MIRADOR LIGERO  (react-three-fiber, lo que ya tenemos)
 │     │     · por defecto, en todos los aparatos, siempre
 │     │
 │     └── EL REALM  ── iframe (escritorio) · WebView (app)
 │           · documento web APARTE, otro origen
 │           · CSP: connect-src 'none'   ← NO PUEDE hablar con ninguna API
 │           · dentro: el fork de IR, React 18, Rapier, three 0.176
 │           · entra y sale SÓLO por postMessage
 │
 └── (nada más: la presencia no la toca el realm)
```

### La decisión que resuelve dos problemas a la vez

**El realm es un documento web aparte.** Se tomó por seguridad —§4— y resulta que resuelve
también el bloqueo multiplataforma:

- En el escritorio es un **iframe**. IR pide Vite + react-dom: dentro del iframe lo tiene.
- En la app de Expo es un **WebView**. El mismo artefacto, el mismo bundle.
- Su **React 18 nunca se encuentra con el React 19** del anfitrión: son dos documentos, dos
  montones de memoria, dos árboles. El bloqueo técnico del reconciliador **desaparece por
  construcción**, no por parche.

Es decir: **el aislamiento que hace falta para que IR no pueda tocar la partida es el mismo que
hace que IR pueda correr en la app.** No hay que elegir.

---

## 4 · Por qué la verdad no puede vivir en IR, y por qué no basta con prometerlo

El panel ganó con seis pruebas de aislamiento **estáticas** —grafo de módulos, uniones cerradas
de tipos, qué se persiste—. Un escéptico las tumbó con una frase que hay que guardar:

> Un CVE no es un `import`: es **autoridad ambiental en tiempo de ejecución**.

Y encontró la cadena, comprobada en nuestro árbol:

1. `server/src/index.ts:92` → **`app.use(cors());` pelado**: `Access-Control-Allow-Origin: *`, y
   el preflight refleja las cabeceras pedidas, o sea que `x-asiento` pasa.
2. `POST /api/arcade/mesas/:codigo/asientos` **acuña credenciales**: devuelve `{asiento, llave}`
   a quien mande `{nombre, figura}`. Sin cuenta ni correo — que es el asiento anónimo que Miguel
   quiso, y está bien.
3. `POST /api/arcade/mesas/:codigo/movimientos` autentica **sólo** con la llave de la cabecera.

Y la casa ya lo tenía escrito, en `server/src/routes/arcade.ts:252`:

> «acertar un código NO es mirar: **es sentarse**, porque sentarse solo pide el código. Desde
> ese asiento se puede cerrar la partida de otros cuatro o borrarla entera.»

**El código de mesa ES una credencial.** Así que entregarle el código de mesa a código de
terceros dentro de nuestra página es entregarle la partida. Dos peticiones.

### Las tres reglas que lo cierran

1. **El realm no puede llegar a la red.** No «no abre conexiones»: **no puede**. Origen propio
   y `Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src 'none'`. Todo
   entra por `postMessage`. Es una restricción del navegador, no una promesa del código.
2. **Por el puente no cruza ninguna credencial.** `MundoDeclarado` NO lleva el código de mesa ni
   la llave: lleva un `sello` opaco, un identificador local a la sesión de paseo que no sirve en
   ninguna ruta. Con comprobador **y prueba de veneno**: meter el campo a mano y exigir que se
   ponga rojo.
3. **El realm no tiene el socket de presencia.** Lo tiene el anfitrión, que le pasa posiciones
   ajenas ya limpias. La red de IR no se usa: eso mata de paso el bloqueo de los puertos UDP.

### Y una deuda de seguridad que es nuestra, no de IR

`app.use(cors())` pelado es un problema **hoy**, sin IR de por medio: cualquier página puede
llamar a la API del arcade. Los limitadores (`contadorDeCodigos`) tapan el tanteo de códigos,
no el uso de un código conocido. **Esto hay que arreglarlo antes de embeber nada de terceros**,
y conviene arreglarlo igual.

---

## 5 · El coste, con la cuenta hecha

Un millón de mesas al mes, cinco asientos, diez minutos, 10 Hz, **adopción plena** (todo el
mundo enciende el avatar), sobre Cloudflare Durable Objects:

```
mensajes:   5 × 10 Hz × 600 s        = 30.000/mesa → /20 = 1.500 peticiones facturadas
peticiones: 1.505 M − 1 M incluido   = 1.504 M × 0,15 $/M  =   225,60 $
duración:   0,125 GB × 600 s = 75 GB-s/mesa
            75 M − 0,4 M incluido    =  74,6 M × 12,50 $/M =   932,50 $
Workers Paid                                               =     5,00 $
                                                       TOTAL 1.163 $/mes
                                              = 0,00116 $ por mesa · egreso 0 $
```

**Mil ciento sesenta y tres dólares al mes por un millón de mesas.** Escala lineal.

### Pero el 80 % de la factura es DURACIÓN, y la duración tiene una fuga

La duración no la fija la partida: la fija **cuándo se cierra el socket**. Y hay un zombi:

> Una pestaña de escritorio en segundo plano **no desmonta**, y el navegador no para
> `requestAnimationFrame`: lo baja a 1 Hz. Sigue mandando. Un corte por inactividad **de
> tráfico no dispara nunca**, porque parece un jugador vivo.

Dos líneas que hay que escribir en el contrato, o la duración es un grifo abierto:

- **Desalojo por CONTENIDO, no por tráfico**: si la posición de un paseante no cambia en 60 s,
  el servidor le cierra el socket.
- **El tic de bajada es `setInterval` dentro del objeto**, no `storage.setAlarm()`. Son ~900 $
  al mes de diferencia.

---

## 6 · La regla de la casa, que es decisión de Miguel

Hay un precedente y es vinculante. `docs/burgo/REGLAS-EL-BURGO.md:1031`:

> «ofrecer la variante sólo en el escritorio rompería la regla de que ningún juego es sólo para
> PC. Cuando se ofrezca, se ofrecerá en los dos sitios a la vez.»

El **tope de vueltas** del Burgo está **construido, probado de punta a punta y retenido** por
esa regla. «Ver mi avatar con IR» tiene exactamente la misma forma: opcional, construido,
ofrecible en el PC.

**Por eso la arquitectura del §3 pone el realm en un WebView en la app desde el primer día.** Si
el realm sólo corriera en escritorio, por el precedente **no se podría ofrecer en ninguna
plataforma**, y todo esto sería código que no se enciende nunca.

**PARA MIGUEL, y es lo único que bloquea el arranque:** ¿el WebView en la app es aceptable como
forma de cumplir la regla? Si lo es, el camino está abierto. Si no, hay que decidir si la regla
cede para una capa visual opcional — y eso se escribe en el reglamento y firmado, porque cambia
una regla de la casa.

---

## 7 · El contrato: el juego declara, dos miradores consumen

```ts
/** Cualquier cosa que ocupa sitio. Ni el motor ni el realm saben de qué juego es. */
export interface Cuerpo {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly radio: number;   // círculo: el que anda también lo es, y así no hay que rotar nada
  readonly alto: number;
  readonly que: 'firme' | 'suelto' | 'al paso';
}

/** Lo que un juego declara. Datos puros: ni three, ni IR, ni red. */
export interface MundoDeclarado {
  /** Identificador OPACO de la sesión de paseo. NO es el código de mesa. Ver §4. */
  readonly sello: string;
  readonly juego: string;
  readonly rev: number;
  readonly suelo: {
    /** Malla de alturas o predicado: dónde se puede estar de pie. */
    sePisa(x: number, z: number): boolean;
    /** Cota del agua, si la hay. Se vadea hasta `vadeable`; más hondo, frena. */
    readonly agua?: { cota(x: number, z: number): number; readonly vadeable: number };
  };
  readonly cuerpos: readonly Cuerpo[];
  readonly nace: { readonly x: number; readonly z: number; readonly rumbo: number };
  readonly modelos: readonly { readonly id: string; readonly url: string }[];
}
```

Un juego nuevo escribe **eso** y nada más. No ve IR, no ve Rapier, no ve el realm. Lo consumen
los dos miradores:

- **el ligero** (`react-three-fiber`), que es el de siempre y va en todos los aparatos;
- **el realm** (IR), cuando el aparato lo soporta y el usuario lo enciende.

Y la propiedad que hay que comprobar, no prometer: **los dos miradores tienen que comportarse
igual**. Misma declaración → mismo sitio donde se puede estar de pie, mismos choques. Eso se
mide con un comprobador que pasa la misma declaración a los dos y compara trayectorias.

---

## 8 · Lo que falta por decidir y por medir

**De Miguel:**
- El WebView en la app, §6. Es lo único que bloquea el arranque.
- La atribución CPAL §14 apunta a un dominio muerto: qué se muestra exactamente.

**Por medir antes de construir:**
- El peso del bundle del realm en un móvil de gama baja, con tope en la batería.
- WebGL en WKWebView y en el WebView de Android: cuántos fotogramas de verdad.
- Si el fork de 6.645 commits compila hoy con Node 20 y cuánto cuesta mantenerlo.

**Orden de trabajo:**
1. **Cerrar el CORS y el minado de asientos.** Es deuda propia y es previa a embeber nada.
2. El contrato `MundoDeclarado` y el mirador ligero sobre él, con colisiones (Rapier suelto).
   Las Lindes primero. **Esto ya entrega colisiones sin IR de por medio.**
3. El canal de presencia, con el desalojo por contenido del §5.
4. El realm: fork, bundle, iframe, CSP, WebView, puente.
5. El Burgo y Riberas declaran su mundo.

**Y esto no se hace en la rama `lindes`**: toca dos juegos en producción, el servidor y la capa
compartida. Pide su propio worktree.
