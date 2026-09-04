# Arte PROVISIONAL de las cartas de recurso

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
