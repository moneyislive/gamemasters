/**
 * LOS `.glb` PEDIDOS COMO DIRECCIÓN, no como módulo.
 *
 * `?url` le dice a Vite que copie el fichero a los recursos y devuelva su
 * dirección en vez de intentar interpretarlo. Sin esta declaración TypeScript no
 * conoce ese sufijo y el `import` no compila; con ella, el modelo entra en la
 * compilación como un recurso más y no como una ruta escrita a mano que se
 * rompería el día que cambie `base`.
 */
declare module '*.glb?url' {
  const direccion: string;
  export default direccion;
}
