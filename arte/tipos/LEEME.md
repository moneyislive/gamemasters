# El tipo de letra del tablero

`Cinzel_700Bold.ttf` — **Cinzel**, de The Cinzel Project Authors, bajo **SIL Open Font
License 1.1** (`OFL.txt`, al lado). Es la misma familia que la app usa para sus títulos, así
que el tablero habla con la misma voz que el resto del juego, y es una romana capital: lo que
pide un tablero de mesa.

## Qué se hace con ella, y qué NO

**No se carga en ejecución.** De este fichero se extraen, al compilar, los contornos de los
caracteres que el juego necesita, y lo que viaja a los dos clientes es `escenas/iconos.ts`: una
lista de puntos por glifo. El porqué es el mismo que el de los iconos de `game-icons/` y está
escrito en `escenas/scripts/compilar-iconos.ts`:

- **Metro no sabe traer un fichero como texto.** Vite tiene `?raw`; en la app, un `import` de
  un `.ttf` o un `.svg` pasa por el transformador de imágenes y devuelve otra cosa.
- **En React Native no existe `DOMParser`.** Cualquier análisis de trazos en caliente se vería
  bien en el escritorio y saldría VACÍO en la app, sin un error en ninguna consola.

Por eso el arte acaba siendo código. La fuente se queda aquí como ORIGEN, no como recurso.

## Cómo se cambia

Se deja otro `.ttf` en esta carpeta, se apunta a él en el compilador y se vuelve a ejecutar:

    npx tsx escenas/scripts/compilar-iconos.ts

Lo que sale se escribe entero, así que no hay nada que fusionar a mano. Si el tipo nuevo no
trae algún carácter del juego, el compilador se para y dice cuál: no se emite un glifo vacío.

## Y el idioma

Los rótulos del tablero son CADENAS en una tabla (`ROTULO_DE_LA_CASILLA`), no dibujos: cambiar
un nombre es cambiar una cadena. Lo que sí hay que hacer al añadir un idioma es declarar sus
caracteres en el charset del compilador y recompilar — con esta fuente están los del castellano
enteros, acentos y signos de apertura incluidos.

## Atribución

Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel), licencia SIL
Open Font License 1.1. El texto íntegro está en `OFL.txt` y hay que conservarlo: la OFL obliga a
mantener el aviso de copyright y la licencia con cualquier copia o derivado del tipo.
