# Modelos 3D generados

Aquí caen los `.glb` de personajes y atrezo generados con Hunyuan3D / Tripo.

El contrato con el código:

- Un fichero por personaje: `personaje-<id>.glb`, mirando a +Z, con los pies
  en y=0 y una altura aproximada de 1,6 unidades.
- Se registran en `app/src/modelos.ts`. Mientras un personaje no tenga `.glb`,
  el escenario pinta el maniquí provisional con los colores elegidos por el
  usuario: nada se rompe por que falte un fichero.
