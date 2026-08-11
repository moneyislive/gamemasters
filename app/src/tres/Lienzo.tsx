/**
 * El lienzo 3D en la web: el `Canvas` de fibra sobre WebGL del navegador.
 *
 * Este fichero tiene un gemelo `.native.tsx` que Metro elige automáticamente al
 * compilar para iOS o Android; allí el mismo `Canvas` sale de la entrada nativa
 * de la librería, que pinta sobre `expo-gl`. Quien importa `./tres/Lienzo` no
 * sabe ni necesita saber en qué plataforma está.
 */
export { Canvas } from '@react-three/fiber';
