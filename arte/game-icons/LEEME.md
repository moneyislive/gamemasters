# Arte PROVISIONAL de las cartas de recurso

> **Esta carpeta ya no es todo el arte de los iconos, y conviene saberlo antes de leer
> nada más.** Los nueve dibujos de las cartas del mazo —La Guardia, El Año Bueno, El
> Acaparamiento, Las Dos Veredas y los cinco títulos— NO están aquí ni en ningún `.svg`:
> son de la casa y se dibujan en coordenadas dentro de
> `escenas/scripts/compilar-iconos.ts`. No tienen licencia que cumplir ni atribución que
> dar. Todo lo que sigue —la deuda, los dos finales, la sustitución— es sólo de los
> iconos de los BIENES. El reparto completo está al final, en **De dónde sale cada
> dibujo**.

**Estos cinco iconos no son los definitivos.** Están aquí para poder probar la interfaz
de la mano —la baraja del lateral, el imán, las áreas de trueque— con algo que se lea
como una carta, mientras se dibujan los nuestros.

## Qué son y de quién

Cinco iconos de **Delapouite**, de [game-icons.net](https://game-icons.net), bajo
**CC BY 3.0**. El fichero `license.txt` de al lado es el canónico del repositorio de
origen, copiado tal cual.

| Fichero | Bien |
| --- | --- |
| `wood-pile.svg` | madera |
| `brick-pile.svg` | ladrillo |
| `sheep.svg` | lana |
| `grain-bundle.svg` | grano |
| `stone-pile.svg` | mineral |

Se eligieron entre quince candidatos porque son los únicos que cubren los cinco bienes
con una sola licencia que aguanta un proyecto comercial. Los descartados y el porqué de
cada uno están en el mensaje del commit que los trajo.

## Lo que hay que saber antes de que se queden

CC BY 3.0 permite el uso comercial, pero **obliga a atribuir**: nombrar a Delapouite y a
game-icons.net en un sitio alcanzable desde la aplicación —no basta con este fichero,
que sólo lo ve quien abre el repositorio— y declarar que se modificaron, porque se les
quita el rectángulo de fondo y se recolorean.

Esa obligación **no se ha asumido**. Se decidió que serían provisionales y que se
dibujarían unos propios. Así que hay dos finales posibles y sólo dos:

1. **Se sustituyen** por arte propio antes de publicar. Es el plan.
2. **Se quedan** — y entonces hay que crear el aviso de terceros y hacerlo alcanzable
   desde la app, antes de publicar y no después.

Lo que no puede pasar es el tercer final, que es el que pasa siempre: que se queden sin
que nadie se acuerde de la condición. De ahí este fichero.

## Cómo se sustituyen

La tubería no conoce a Delapouite. `escenas/scripts/compilar-iconos.ts` lee los `.svg`
de esta carpeta por su nombre de fichero, les quita el rectángulo de fondo y escribe
`escenas/iconos.ts`. Para cambiar el arte:

1. Deja cinco SVG con los mismos nombres en esta carpeta.
2. `npx tsx escenas/scripts/compilar-iconos.ts`
3. Borra este fichero y `license.txt`.

No hay que tocar la escena. Se hizo así a propósito: un arte provisional del que dependa
código es un arte que ya no es provisional.

## Qué tiene que cumplir el arte que los sustituya

Medido sobre éstos, que es lo que la tubería y la carta dan por hecho:

- **Un solo trazo** por icono, o unos pocos: se rellenan de un color plano, no llevan
  degradados ni trazos de contorno.
- **Lienzo cuadrado** declarado en el `viewBox`. Éstos son `0 0 512 512`.
- **Silueta maciza**, no de línea fina. La carta los pinta a un tamaño pequeño sobre un
  fondo de color, y un trazo de dos píxeles desaparece.
- **Los cinco del mismo pulso.** Es lo que más se nota y lo que más cuesta: cinco iconos
  buenos de cinco manos distintas se ven peor que cinco regulares de la misma.

## Al día: ahora se dibujan los bienes de RIBERAS, y falta uno

Estos iconos se eligieron con los nombres del catán, antes de que el tablero hablara con
el motor. Los bienes que reparte el juego son otros —`limo`, `junco`, `sal`, `piedra`,
`grano`— y **no se traducen en ningún sitio**: se dibuja el vocabulario que hay.

Cuatro tienen una lectura defendible y se usan así:

| bien de Riberas | sale de | icono provisional |
|---|---|---|
| `limo` | marisma | `brick-pile.svg` (terrones de barro) |
| `junco` | carrizal | `wood-pile.svg` (haz de tallos) |
| `piedra` | cantil | `stone-pile.svg` |
| `grano` | vega | `grain-bundle.svg` |

**`sal` se queda sin icono**, y es a propósito: ninguno de los cinco significa sal. Su
carta sale con su color y sin dibujo, que se lee como «falta el dibujo». La alternativa
que se descartó era emparejarle la oveja —traducir `sal` a `lana`—, y eso no es un
provisional: en un juego de trueques, ver una oveja cuando tienes sal es enseñar un bien
que no tienes, justo en la pantalla con la que se decide qué ofrecer.

`sheep.svg` queda SIN USAR por eso mismo. Se conserva porque el conjunto se descargó
entero y su licencia va con él, no porque haga falta.

Cuando llegue el arte propio: son **cinco** dibujos con los nombres de Riberas, y el
quinto —la sal— es el que hoy no existe.

## De dónde sale cada dibujo

Ahora hay **dos** orígenes, y no se mezclan. Ésta es la tabla entera de lo que la escena
puede pintar, para que nadie tenga que deducirlo abriendo `escenas/iconos.ts`:

| Dibujo | De dónde sale | Licencia | Dónde vive el original |
|---|---|---|---|
| `limo`, `junco`, `piedra`, `grano` | Delapouite, game-icons.net | CC BY 3.0, **con atribución pendiente** | los `.svg` de esta carpeta |
| Las nueve cartas del mazo | de la casa, dibujadas para Riberas | ninguna, es nuestro | `escenas/scripts/compilar-iconos.ts` |
| `sal` | de la casa, dibujada y **sin activar** | ninguna, es nuestro | `escenas/scripts/compilar-iconos.ts` |

Los nueve dibujos de las cartas se escribieron en coordenadas y no como `.svg` a
propósito, y el porqué está en la cabecera del compilador: un `.svg` suelto en una
carpeta no dice de dónde salió ni quién lo hizo, que es exactamente el agujero por el que
estos cinco iconos ajenos llevan meses camino de producción sin su aviso. Un dibujo
escrito en código, con su cabecera al lado contando qué se ve y por qué, no admite esa
duda.

Son diez: nueve para el mazo y uno más, la sal, que es el bien que se quedó sin dibujo.

### La sal: dibujada, y por qué sigue apagada

Está dibujada —cuatro eras de evaporación en perspectiva y el montón recogido delante—,
pero **fuera de `CONTORNOS_DEL_BIEN`**, en su propia constante `CONTORNOS_DE_LA_SAL`. Se
puede ver, no se pinta. No es un olvido; son tres cosas:

1. `escenas/scripts/verificar-escena.ts` **afirma hoy que la sal no tiene icono**, y esa
   línea existe para que nadie «arregle» la sal emparejándole la oveja. Meter la sal en
   el mapa sin cambiarla pone la batería en rojo.
2. Encenderla son dos pasos y hay que darlos juntos: mover la entrada al mapa de los
   bienes (una línea en el compilador) y dar la vuelta a esa comprobación, que es lo que
   su propio comentario pide que se haga a mano.
3. Y hay un motivo de arte que pesa más que los dos anteriores. Los otros cuatro bienes
   siguen siendo de Delapouite. Una sal de la casa entre cuatro ajenos son **cinco iconos
   de dos manos distintas** en la misma fila de la pantalla, que es justo lo que este
   fichero avisa arriba que se nota más que ninguna otra cosa. La sal está lista para el
   día en que se dibujen los otros cuatro; no para adelantar uno solo.

Con eso, la deuda de esta carpeta queda dicha entera: **faltan cuatro**, no cinco.
