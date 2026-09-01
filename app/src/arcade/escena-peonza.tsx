/**
 * «LA PEONZA» EN TRES DIMENSIONES. La puerta del mueble `escena`, abierta.
 *
 * ═══ LO QUE ESTE FICHERO DEMUESTRA, QUE ES LO ÚNICO QUE PRETENDE ═══
 *
 * Que el 3D entra por `app/src/tres/Lienzo` y por ningún otro sitio, y que un
 * arcade que se pinta con él se escribe exactamente igual que uno de sprites: un
 * manifiesto, un reductor puro y `usarArcadeLocal`. El juego no sabe que es 3D; la
 * pantalla no sabe qué es una peonza. Lo que hay en medio es un ángulo entero.
 *
 * ═══ EL `Canvas` SALE DE `../tres/Lienzo` Y NO DE `@react-three/fiber` ═══
 *
 * Y esto es la regla entera del §7: «tres dimensiones, única y exclusivamente a
 * través de `app/src/tres/Lienzo.tsx` y `Lienzo.native.tsx`. Ningún arcade importa
 * `three` ni `@react-three/fiber` directamente».
 *
 * La razón no es de orden. Aquel fichero tiene un gemelo `.native.tsx` que Metro
 * elige al compilar para iOS o Android, porque el `Canvas` de web pinta sobre
 * WebGL del navegador y el nativo sobre `expo-gl`. Un arcade que importara la
 * librería a pelo funcionaría en web y saldría en negro en el móvil, sin un error
 * en ninguna consola — el fallo mudo de siempre.
 *
 * Y hay una segunda razón que es la que de verdad la sostiene: `@react-three/fiber`
 * está CONGELADO en la 9.7 porque la v10 sacó React Native del núcleo y ya no
 * exporta `./native`. El día que haya relevo —un `@react-three/native` publicado,
 * o `react-native-webgpu`— la mudanza es de dos ficheros si todos los arcades
 * entran por esta puerta, y de tantos ficheros como arcades si no.
 *
 * `three` sí se importa aquí, y no es una excepción a lo anterior: lo que la regla
 * protege es el `Canvas` —quién crea el contexto de dibujo—, no el vocabulario de
 * geometrías. La malla y el material son datos, y una escena sin ellos sería una
 * escena vacía.
 *
 * ═══ LA TRIGONOMETRÍA VIVE AQUÍ Y NO EN LAS REGLAS ═══
 *
 * El reductor lleva el ángulo en MILÉSIMAS DE VUELTA, con enteros, porque
 * `verify:pureza` prohíbe `Math.sin` y compañía en `shared/arcade/`: la
 * especificación las deja *implementation-approximated* y Hermes y V8 redondean
 * distinto, así que la misma partida daría dos resultados en dos móviles.
 *
 * Aquí abajo, en cambio, `Math.PI` es perfectamente legítimo: nadie sincroniza una
 * rotación con nadie, y si un móvil la dibuja medio grado desviada, no pasa
 * absolutamente nada. La frontera es la misma que ordena el árbol entero:
 * `shared/` son las reglas, y lo que se ve es consecuencia.
 *
 * ═══ LO QUE FALTA ANTES DE PROMETER 3D EN PRODUCCIÓN, DICHO AQUÍ ═══
 *
 * El §7 lo tiene apuntado y sigue pendiente: **probar una escena en un iPhone
 * FÍSICO**. La documentación de r3f advierte de cierres `EXC_BAD_ACCESS` en el
 * simulador, y el comentario de `escena-avatar.tsx` —la otra escena de esta casa—
 * admite que esa prueba nunca se hizo. No hay comprobador que pueda cubrir esto:
 * un guion de Node no abre un contexto de GL. Queda escrito donde lo va a leer
 * quien escriba el segundo arcade de escena, que es el único sitio donde sirve.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as THREE from 'three';
import { Canvas } from '../tres/Lienzo';
import {
  EMPUJAR,
  estaGirando,
  GIRO_MAXIMO,
  partidaNuevaDeLaPeonza,
  PEONZA,
  VUELTA,
} from '../../../shared/arcade/juegos';
import type { EstadoDeLaPeonza } from '../../../shared/arcade/juegos';
import { usarArcadeLocal } from './local';
import { SALA } from './muebles';

/**
 * La semilla, aunque este juego no use el azar.
 *
 * `usarArcadeLocal` la exige porque viaja en el contexto de cada movimiento y un
 * arcade de dispositivo la elige él —no hay a quién engañar—. Aquí es una
 * constante y no `Date.now()` a propósito: un número que cambia sin que nadie lo
 * use sería exactamente la clase de impureza que luego cuesta una tarde encontrar.
 */
const SEMILLA = 1;

export default function EscenaDeLaPeonza(): JSX.Element {
  const mesa = usarArcadeLocal<EstadoDeLaPeonza>({
    arcade: PEONZA,
    partidaNueva: partidaNuevaDeLaPeonza,
    semilla: SEMILLA,
    /*
     * Mientras gira hay que repintar en cada tic; parada, no. El estado es OPACO
     * para `local.ts` —no puede saber si hay algo moviéndose ahí dentro— así que la
     * pregunta la contesta quien pinta. Sin esto, una peonza quieta repintaría una
     * escena 3D treinta veces por segundo para siempre, que en un móvil es la
     * batería.
     */
    necesitaElReloj: estaGirando,
  });

  /* De milésimas de vuelta a radianes. La única línea de trigonometría que hay. */
  const giroEnRadianes = (mesa.estado.angulo / VUELTA) * 2 * Math.PI;

  /*
   * La geometría y el material se crean UNA VEZ. Sin esto se construyen en cada
   * fotograma y el recolector de basura acaba marcando el ritmo de la escena, que
   * se ve como un tirón periódico que nadie sabe de dónde sale.
   */
  const cuerpo = useMemo(() => new THREE.ConeGeometry(0.6, 1.2, 6), []);
  const pincho = useMemo(() => new THREE.CylinderGeometry(0.05, 0.02, 0.5, 8), []);
  const materialDelCuerpo = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SALA.neon, metalness: 0.2, roughness: 0.5 }),
    [],
  );
  const materialDelPincho = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SALA.neonTenue, metalness: 0.6, roughness: 0.3 }),
    [],
  );

  return (
    <View style={estilos.todo}>
      <Canvas style={estilos.lienzo} camera={{ position: [0, 1.6, 3], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} />
        <group rotation={[0, giroEnRadianes, 0]}>
          {/* La punta hacia abajo: un cono girado media vuelta sobre el eje X. */}
          <mesh geometry={cuerpo} material={materialDelCuerpo} rotation={[Math.PI, 0, 0]} position={[0, 0.6, 0]} />
          <mesh geometry={pincho} material={materialDelPincho} position={[0, 1.35, 0]} />
        </group>
      </Canvas>

      <View style={estilos.abajo}>
        <Text style={estilos.rotulo}>LA PEONZA</Text>
        <Text style={estilos.texto}>
          {mesa.estado.giro === 0
            ? 'Está parada. Empújala.'
            : `Girando a ${String(Math.round((mesa.estado.giro / GIRO_MAXIMO) * 100))} %.`}
        </Text>
        <Pressable
          onPress={() => mesa.mover(EMPUJAR)}
          style={estilos.boton}
          accessibilityRole="button"
          accessibilityLabel="Empujar la peonza"
        >
          <Text style={estilos.botonRotulo}>EMPUJAR</Text>
        </Pressable>
        <Text style={estilos.pie}>{mesa.estado.empujones} empujones</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.fondo },
  lienzo: { flex: 1 },
  abajo: { padding: 24, gap: 10, alignItems: 'center' },
  rotulo: { color: SALA.neonTenue, fontSize: 13, fontWeight: '800', letterSpacing: 4 },
  texto: { color: SALA.palabra, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  boton: {
    marginTop: 6,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    backgroundColor: SALA.panel,
    borderWidth: 1,
    borderColor: SALA.neon,
  },
  botonRotulo: { color: SALA.neon, fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  pie: { color: SALA.neonTenue, fontSize: 13 },
});
