# Lo que me limitó y NO he tocado

**Escrito la noche en que entró el tercer juego.** Todo lo de aquí es código
COMÚN que afecta a CLUEDO o a El Misterio de la Momia, que están en producción.
La instrucción era explícita —«si encuentras algo que te limite no quiero que lo
implementes tú, quiero que lo dejes pendiente»— así que aquí está, con el fichero,
lo que impide y lo que costaría.

Está ordenado por lo que impide, no por cuánto código toca.

---

## 1. La fase `sellado` tiene el anuncio escrito a mano · ⬤ bloqueante para el tercero

**Dónde:** `server/src/routes/live.ts`, en `router.post('/games/:id/live/sellado')`,
y `client/src/components/live/LivePanel.tsx`, en el botón «Abrir El Sellado».

**Qué pasa:** las dos cadenas están escritas a mano en código de plataforma:

```
'Se abre El Sellado. Cinco ritos, un solo orden bueno.'   // routes/live.ts
'Abrir El Sellado'                                        // LivePanel.tsx
```

Cualquier juego que declare la transición a `sellado` anuncia a toda la mesa —por
el móvil de cada persona— las reglas de El Misterio de la Momia. Y el botón de
quien dirige dice lo mismo.

**Cómo me limitó:** El Paso de las Sombras termina en un acto colectivo que
encaja exactamente en esa fase. **No la he usado.** Su consejo del alba es la
fase `acusaciones`, cuyo aviso SÍ se puede escribir desde el manifiesto
(`avisos.acusaciones`). Funciona bien y no es un apaño feo —el consejo es
literalmente un momento de señalar— pero es una fase eligiéndose por lo que se
puede rotular, no por lo que significa.

**Qué costaría:** añadir `sellado` a `ManifiestoDeJuego.avisos` y una entrada a
`palabras.vivo` para el rótulo del botón. Media hora, y toca dos ficheros que
CLUEDO y la Momia usan.

---

## 2. `AvisoClave` no tiene claves por juego · ⬤ pendiente

**Dónde:** `shared/live.ts:696` (la unión `AvisoClave`).

Las claves son `ronda-abierta`, `ronda-cerrada`, `giro`, `ayuda`, `acusaciones`,
`sellado`, `desenlace`, `ganador`. Un juego con un momento propio —«los cazadores
estaban aquí», que en El Paso de las Sombras es el instante que más pesa de cada
hora— tiene que reutilizar una de esas o quedarse sin anuncio.

**Cómo me limitó:** el cierre de cada hora se anuncia con `rondaCerrada`, que es
lo correcto pero no permite que la app le dé un tratamiento distinto (vibración,
color, animación) al momento en que se revela dónde estaban los cazadores.

---

## 3. `DefinicionCategoria` no sabe decir «exactamente N» · ⬤ pendiente

**Dónde:** `shared/juegos/tipos.ts` (`DefinicionCategoria`) y la tabla
`CUENTA_EXACTA` de `client/src/juegos/reglas.ts`.

Una categoría solo puede declarar `minimo`. «Exactamente cinco ritos» vive en una
tabla aparte del taller, con la clave `momia:ritos` escrita a mano.

**Cómo me limitó:** poco, por suerte — este juego no tiene ninguna categoría de
cuenta exacta. Pero sí tiene un mínimo que NO es el del manifiesto: la senda son
cuatro tramos y hacen falta al menos seis pasos para que averiguar *cuáles* sea un
problema, y eso se declara con `minimo: 6` y se repite en `sombras-senda.ts`.
Con `maximo` en la definición, `CUENTA_EXACTA` desaparecería.

---

## 4. `ronda.accionSobre` y `ronda.cambiosPermitidos` los declaran los tres juegos y no los lee nadie · ⬤ pendiente

**Dónde:** `shared/juegos/tipos.ts` (`DefinicionDeRonda`).

Lo dice el propio manual de la plataforma. Este juego los declara —`pasos` y
`0`— y hace cumplir la regla por su cuenta con `vecesPorTurno: 1` en la acción.
Una regla que se cree escrita en dos sitios y solo está en uno es de las que se
rompen al mover cualquier otra cosa.

---

## 5. Una acción con `eligeVarias` o `eligeLibre` NO se puede jugar sin pantalla propia · ⬤ pendiente

**Dónde:** `server/src/live/proyeccion.ts` (compone `vista.acciones` a partir de
`a.eligeDe` **y solo de eso**) y `app/src/acciones.tsx`, que pinta esos campos.

El motor valida perfectamente las cuatro formas de pedir datos. El panel genérico
de la app solo sabe pintar una. Así que una acción declarada con `eligeVarias`
—la senda de cuatro pasos— o con `eligeLibre` —la contraseña de la puerta—
aparece en el panel genérico **sin sus campos**, y quien la pulse recibe un error
correcto y desconcertante.

**Cómo me limitó:** este juego tiene DOS acciones así, que son precisamente sus
dos mecánicas propias. Están resueltas con pantallas propias (`camino`,
`consejo`, y la bifurcación de `ronda`), que es lo que ya hizo la Momia. Un juego
que no quiera escribir pantallas no puede usar esas dos formas.

**Además**, y esto sí lo he arreglado porque era una línea y era generalizable:
`app/app/(juego)/mapa.tsx` invitaba a tocar una habitación para entrar en ella
aunque la acción de entrar necesitara datos que el plano no puede dar. Ahora
`seEntra` se deduce de que la acción **no tenga campos `eligeLibre`**, así que
cualquier juego futuro con la misma forma se comporta bien sin tocar esa
pantalla. No cambia ni una letra de CLUEDO ni de la Momia.

---

## 6. Los ids de trofeo no llevan prefijo de juego · ⬤ pendiente

**Dónde:** `shared/live.ts` (`TrofeoId`).

Ya son dieciséis en una unión plana. Dos juegos pueden usar el mismo id sin que
nada avise, y entonces el trofeo de uno sale en la vitrina con el nombre del
otro. Lo vigila `trofeosQueChocan()`, que compara nombres, pero no lo impide.

**Cómo me limitó:** el trofeo del traidor de este juego se habría llamado
`sombra` con toda naturalidad, y ese id ya es de la Momia. Se llama
`sombra-de-akechi`. Los cinco están elegidos para no poder chocar con nadie, que
es una precaución que no debería hacer falta tomar a mano.

---

## 7. Las cinco uniones cerradas que hay que ampliar para añadir un juego · ⬤ deuda benigna

| Qué | Dónde | Cuánto ha costado esta vez |
|---|---|---|
| `TrofeoId` | `shared/live.ts` | 5 ids |
| `PrintableDocId` | `shared/documents.ts` | 8 ids |
| `DocumentSectionId` | `shared/types.ts` | 5 ids |
| `IconoId` | `shared/juegos/tipos.ts` | 2 (`torii`, `abanico`) |
| `PantallaDeApp` | `shared/juegos/tipos.ts` | 2 (`camino`, `consejo`) |

Es deuda **benigna**: si te olvidas de una, no compila. Pero son cinco ficheros
compartidos tocados para añadir contenido de un solo juego. El manual ya lo
señala y el informe de arquitectura propone abrirlas a cadenas.

---

## 8. La app es un binario: dos pantallas nuevas = versión nueva · ⬤ asumido

Y hay un detalle operativo que hay que saber **hoy**:

> **`app/.expo/types/router.d.ts` está parcheado a mano.** Lo genera Expo a
> partir de los ficheros de `app/app/`, y las dos pantallas nuevas (`camino` y
> `consejo`) no estaban en él, así que el `tsc` de la app fallaba. Lo he ampliado
> a mano para que compile. **Se regenera solo** en cuanto se ejecute
> `npx expo start` o `npx expo export`, así que no hay que hacer nada — pero si
> alguien mira ese fichero y ve una edición manual, esta es la razón.

---

## 9. La tercera imprenta es la tercera copia · ⬤ pendiente

**Dónde:** `server/src/docs/estilosImprenta.ts` (CLUEDO),
`docs/imprimibles/momia/estilo.ts` y ahora `docs/imprimibles/sombras/estilo.ts`.

La cabecera de la de la Momia decía: «el día que entre un tercer juego, dos hojas
casi iguales sí serán argumento suficiente para extraer la geometría común». Ese
día es hoy y **no lo he hecho**, por dos razones:

1. El maestro de oro compara los documentos de CLUEDO **byte a byte**. Extraer la
   geometría cambia cómo se compone su hoja; aunque saliera el mismo CSS,
   cualquier descuido pone en rojo la red que protege el juego en producción, y
   habría que recapturarla justo la noche en que se toca todo lo demás.
2. La geometría común real son unas treinta líneas (A4, márgenes, saltos de
   página). Lo específico —el cartel de página entera con la contraseña, las
   tiras que se doblan— no se comparte.

Cuando alguien pueda recapturar el oro con calma, se saca a un módulo y arriba
quedan solo paleta y ornamentos.

---

## 10. El índice del paquete habla en CLUEDO para todos los juegos · ⬤ pendiente (viejo)

**Dónde:** `server/src/docs/imprimibles/indicePaquete.ts`, en `parteDosieres`.

La hoja «Empieza por aquí» se compone desde el catálogo del juego y desde
`manifiesto.preparacion` —eso ya está generalizado— pero dos filas siguen escritas
a mano: «Dosieres de los jugadores» y «Dosier del Game Master» / «Guía de la
velada». En una noche de Iga esas dos filas hablan de otra cosa.

Es una herida vieja que ya tenía la Momia. La he heredado tal cual: reutilizo el
mismo documento, como hace ella.

---

## 11. El techo de la gramática compilada NO se puede comprobar sin llamar a la API · ⬤ hay que probarlo

**Dónde:** `server/src/plot/sombras-esquema.ts` (y su gemelo de la Momia).

Con `output_config.format`, la API compila el esquema JSON a una gramática y, si
sale demasiado grande, **rechaza la petición entera con un 400** antes de escribir
una palabra. A la Momia le pasó, y no se vio porque sin clave se cae al modo
demostración y porque ninguna prueba de la suite sale a la red.

He escrito el esquema de este juego **con ese techo delante**: tiene diecisiete
campos de primer nivel frente a los dieciocho de la Momia, y uno de sus objetos
anidados es aquí una cadena suelta. `verify:sombras-trama` vigila que no crezca
—hay un tope sobre su tamaño serializado— pero **eso no demuestra que compile**.

**Lo que hay que hacer mañana, y es un minuto:** generar una partida de El Paso de
las Sombras con clave de API. Si el 400 llega, llega en la validación y no cuesta
tokens. Todo lo demás está probado sin red.

---

## 12. `verify:puertas` enumera los juegos a mano · ⬤ pendiente

**Dónde:** `server/scripts/verificar-puertas.ts`, línea ~734:

```ts
for (const juego of ['cluedo', 'momia'] as const) { … }
```

El tercer juego no entra en esa comprobación cruzada. No rompe nada —sigue en
verde— pero tampoco comprueba nada del juego nuevo. Sus equivalentes están en
`verify:sombras`, que juega una noche entera por HTTP.

---

## 13. `numeroDeRondas` deduce las rondas de `plot.clues` · ⬤ pendiente (viejo)

**Dónde:** `server/src/docs/datos.ts:27`.

Los dos juegos nuevos dejan `clues` vacío a propósito —sus hallazgos no son
pistas de sala— así que la función devuelve su valor por defecto, **cuatro**, que
resulta ser justo el número de horas que este juego genera. Son dos números que
coinciden sin que nadie los haya atado, exactamente como ya avisaba la Momia. En
cuanto alguien genere una noche de tres o de cinco horas, dejan de coincidir.

Este juego lo tapa por dentro: `pasoBatido()` consulta la lista **en círculo**,
así que una quinta hora repite el paso de la primera y el peligro no se apaga.

---

## 14. El género de una categoría no se declara · ⬤ pendiente menor

**Dónde:** `shared/juegos/tipos.ts` (`DefinicionCategoria`) y
`client/src/juegos/palabras.ts` (`articulos`).

El taller ya lo resuelve con una tabla de artículos por juego. La app no la
tiene, y `mapa.tsx` escribía «Las salas de esta partida» a fuego: con una
categoría masculina salía «Las pasos». Lo he arreglado ahí con la misma
heurística que ya usa `agent/momia-herramientas.ts` (`termina en -a → femenino`),
que acierta con las siete categorías que existen y fallará el día que alguien
registre «los mapas».

---

## 17. `mapa.tsx` llama un hook DESPUÉS de un `return` temprano · ⬤ pendiente · afecta a CLUEDO y a la Momia HOY

**Dónde**: `app/app/(juego)/mapa.tsx`. El componente `Mapa` llama cinco hooks
(`usePartida`, `useWindowDimensions` y tres `useState`), corta en la línea 71 con
`if (!vista) return <Pantalla><Cargando texto="Desdoblando el plano…" /></Pantalla>;`
y en la **línea 96** llama un sexto: `const t = useTema();`.

**Qué pasa**: React identifica los hooks por su orden de llamada. Un render sin
vista ejecuta cinco y el siguiente, ya con vista, seis: «Rendered more hooks than
during the previous render», el error 300, y se cae la pestaña entera. Los dos
caminos que lo alcanzan sin inventar nada: en web, recargar o entrar por enlace
directo en `/mapa`; y en cualquier plataforma, `setVista(null)` al caducar la
sesión (`app/src/estado.tsx:265`, y lo mismo en `desconectar()`), que no desmonta
la pantalla, así que un mapa ya pintado con seis hooks se vuelve a pintar con
cinco.

**ESTO NO LO TRAE EL JUEGO NUEVO.** `git show HEAD:app/app/(juego)/mapa.tsx` ya
tiene el `useTema()` en la 96 detrás del mismo `return`. Es de CLUEDO y de la
Momia, y lo es desde antes de esta entrega. Lo dejo anotado en vez de arreglarlo
porque la regla de esta noche era no tocar el comportamiento de los dos juegos
que ya funcionan, y aquí no hay ni una prueba automática que respalde el cambio.

**El arreglo**: subir `const t = useTema();` justo detrás del último `useState`,
antes del `return` de la 71. `t` solo se usa en la línea 251. Es mover una línea.
`app/app/(juego)/personaje.tsx:58-66` documenta este mismo fallo como ya
corregido allí, y `avisos.tsx` y `sombras/hora.tsx` lo evitan a propósito: de los
diez ficheros de `(juego)/`, `mapa.tsx` es el único que queda con el hook detrás
del portero.

**Coste**: cinco minutos y una comprobación a mano en las tres pestañas.

---

## 16. La hoja del consejo no cabe en una cara en partidas grandes · ⬤ pendiente

**Dónde**: `server/src/docs/imprimibles/sombras/hojaConsejo.ts`, y la declaración
en `shared/juegos/sombras.ts` (`copies: 'una-por-jugador'`, `sides: 'una'`).

**Qué pasa**: la hoja se rellena a mano y se entrega, así que quiere ser UNA
cara. Medida sobre A4 con seis escoltas y seis pasos da **1434 px de contenido
sobre los 1009 que caben**, es decir, hora y media de página. Y escala mal por
los dos lados a la vez: la rejilla de la senda tiene una fila por paso —con
dieciséis pasos son unos 800 px solo de rejilla— y la lista de «quién cobra de
Akechi» una fila por persona.

**Lo que sí he hecho**: juntar en un renglón el nombre del jugador y el del
personaje en la lista de personas (454 px → 320 px). Nada se pierde y se gana
una octava parte de la página.

**Lo que NO he hecho, y por qué**: para que entrara de verdad habría que quitar
la rejilla de casillas o el hueco para escribir la senda a mano, y son dos
formatos de respuesta para dos tamaños de mesa distintos —la rejilla es cómoda
con seis pasos e impracticable con dieciséis; el renglón escrito es al revés—.
Elegir uno es una decisión de diseño del juego, no una corrección de maquetación,
y no me toca tomarla de madrugada. Mientras tanto la hoja sale en dos caras, que
se imprimen a una cara y no rompen nada: no lleva secretos, así que aquí no hay
el problema de sobres que sí tenía el dosier.

**Coste**: una tarde de decidir formato y medio día de maquetar.

---

## 15. Lo que la Momia dejó a medias y he arreglado de paso

No es deuda pendiente; se anota porque toca ficheros comunes y conviene que se
vea en la revisión:

- **`app/src/tema-juego.ts` · `paletaDe` era un ternario contra `'momia'`.** El
  manual lo señalaba como trampa: «escribir tu paleta y olvidar esa rama deja la
  app entera con el tema de la casa sin un solo error». Ahora es una tabla.
  CLUEDO sigue recibiendo el mismo objeto **por identidad**.
- **`app/src/ui.tsx` · el glifo del `Ornamento` era otro ternario.** Ahora sale
  de `useOrnamento()`, con `❦` de respaldo. CLUEDO no cambia ni un píxel.
- **`app/app/(juego)/mapa.tsx` · el plano invitaba a tocar** aunque la acción de
  entrar necesitara datos que él no puede dar. Ver el punto 5.

---

## Cómo probarlo mañana

```bash
npm run typecheck
```

```bash
npm run verify:sombras -w server
```

```bash
npm run verify:senda-sombras -w server && npm run verify:sombras-trama -w server
```

Y lo que no se puede automatizar, que es lo que de verdad importa: **jugarlo**.
Monta una noche con seis habitaciones de tu casa, imprime los carteles, cuélgalos
y anda hasta uno a leer la palabra. La mitad de este juego está en ese paseo, y
ninguna aserción va a decirte si funciona.
