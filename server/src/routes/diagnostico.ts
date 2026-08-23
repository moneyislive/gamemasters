/**
 * Qué hay de verdad en el disco de las subidas, y cómo es.
 *
 * POR QUÉ EXISTE. Un avatar 3D que no se ve tiene al menos cuatro causas
 * posibles, y desde fuera todas producen exactamente el mismo síntoma —un hueco
 * donde debería haber alguien—:
 *
 *   1. El fichero no está: el disco no es persistente y se borró.
 *   2. El fichero está pero llega comprimido, y el teléfono no puede abrirlo
 *      porque su motor de JavaScript no ejecuta WebAssembly.
 *   3. El fichero está y es válido, pero la escena falla por otra cosa.
 *   4. La ruta firmada no cuadra y el servidor responde 404.
 *
 * Distinguirlas a ciegas cuesta días —ya ha costado— y montar un emulador para
 * verlo cuesta varios gigas y una tarde. Esto lo responde en una petición: dice
 * si el fichero existe, cuánto pesa, si es un GLB de verdad y si declara
 * geometría comprimida.
 *
 * VA DETRÁS DEL GUARDIÁN DEL TALLER. Enumera lo que hay en el disco: no es
 * información secreta, pero tampoco tiene por qué verla cualquiera que pase.
 */
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config';
import { crearRouter } from '../rutas';

const router = crearRouter();

/**
 * Mira las tripas de un GLB sin abrirlo entero.
 *
 * Un GLB empieza por la palabra mágica `glTF`, la versión y el tamaño total, y
 * a continuación un trozo de JSON con la escena. Ahí es donde se declaran las
 * extensiones — entre ellas las de geometría comprimida, que son las que un
 * teléfono sin WebAssembly no puede descomprimir. Se leen los primeros
 * kilobytes y basta: no hace falta cargar veinte megas para saber esto.
 */
function mirarDentro(ruta: string): Record<string, unknown> {
  const tam = fs.statSync(ruta).size;
  const trozo = Buffer.alloc(Math.min(tam, 256 * 1024));
  const fd = fs.openSync(ruta, 'r');
  try {
    fs.readSync(fd, trozo, 0, trozo.length, 0);
  } finally {
    fs.closeSync(fd);
  }

  const magia = trozo.subarray(0, 4).toString('ascii');
  const texto = trozo.toString('utf8');
  const extensiones = [...texto.matchAll(/"(KHR_[A-Za-z_]+|EXT_[A-Za-z_]+)"/g)].map((m) => m[1]);

  return {
    tamano: `${(tam / 1024 / 1024).toFixed(2)} MB`,
    esGlb: magia === 'glTF',
    magia,
    /*
     * LO QUE DE VERDAD SE VIENE A MIRAR. Si aparece cualquiera de estas dos, el
     * modelo NO se puede abrir en el móvil: los dos descodificadores están
     * compilados a WebAssembly y Hermes no lo ejecuta.
     */
    comprimido:
      texto.includes('EXT_meshopt_compression') || texto.includes('KHR_draco_mesh_compression'),
    extensiones: [...new Set(extensiones)],
  };
}

router.get('/diagnostico/modelos', (_req, res) => {
  const carpeta = path.join(env.uploadsDir, 'modelos');

  if (!fs.existsSync(carpeta)) {
    res.json({
      uploadsDir: env.uploadsDir,
      carpeta,
      existe: false,
      /*
       * Que la carpeta no exista es en sí un dato: o no se ha generado nunca
       * nada, o el disco se borró y con él todo lo que había.
       */
      pista: 'La carpeta no existe: o no se ha generado ningún modelo, o el disco se borró.',
    });
    return;
  }

  const ficheros = fs
    .readdirSync(carpeta)
    .filter((n) => n.toLowerCase().endsWith('.glb'))
    .map((nombre) => {
      const ruta = path.join(carpeta, nombre);
      try {
        return { nombre, ...mirarDentro(ruta) };
      } catch (fallo) {
        return { nombre, error: String(fallo).slice(0, 200) };
      }
    })
    // El más reciente primero: es el que se acaba de generar y el que interesa.
    .sort((a, b) => b.nombre.localeCompare(a.nombre));

  res.json({ uploadsDir: env.uploadsDir, carpeta, existe: true, cuantos: ficheros.length, ficheros });
});

export default router;
