/**
 * Los tipos del simplificador de meshoptimizer que trae three en sus añadidos (sólo el decodificador trae
 * los suyos en `@types/three`). Sólo lo que usa `malla.ts`.
 */
declare module 'three/examples/jsm/libs/meshopt_simplifier.module.js' {
  export const MeshoptSimplifier: {
    readonly supported: boolean;
    readonly ready: Promise<void>;
    simplify(
      indices: Uint32Array,
      posiciones: Float32Array,
      paso: number,
      indicesObjetivo: number,
      errorObjetivo: number,
      opciones?: readonly string[],
    ): [Uint32Array, number];
  };
}
