/**
 * Escritor de ZIP mínimo, en streaming y sin dependencias.
 *
 * Se podría usar `archiver`, pero para lo que hace falta aquí —meter una
 * veintena de ficheros ya generados en un contenedor— son unas 120 líneas de
 * formato bien documentado frente a un árbol de dependencias nuevo. Y el
 * paquete completo de una partida ronda los 70 MB, así que interesa escribir
 * según se genera y no acumularlo todo en memoria.
 *
 * Formato: ZIP clásico (sin ZIP64). Suficiente de sobra: el límite son 65.535
 * ficheros y 4 GB, y aquí hablamos de decenas de ficheros y megabytes.
 */
import zlib from 'node:zlib';

const TABLA_CRC = (() => {
  const tabla = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabla[i] = c;
  }
  return tabla;
})();

function crc32(datos: Buffer): number {
  let c = -1;
  for (let i = 0; i < datos.length; i++) {
    c = TABLA_CRC[(c ^ datos[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

/** Fecha y hora en el formato de MS-DOS que exige el ZIP. */
function fechaDos(fecha: Date): { hora: number; dia: number } {
  return {
    hora: (fecha.getHours() << 11) | (fecha.getMinutes() << 5) | (Math.floor(fecha.getSeconds() / 2) & 0x1f),
    dia: ((fecha.getFullYear() - 1980) << 9) | ((fecha.getMonth() + 1) << 5) | fecha.getDate(),
  };
}

interface EntradaCentral {
  nombre: Buffer;
  crc: number;
  comprimido: number;
  original: number;
  metodo: number;
  hora: number;
  dia: number;
  desplazamiento: number;
}

export class EscritorZip {
  private readonly escribir: (trozo: Buffer) => void;
  private readonly entradas: EntradaCentral[] = [];
  private posicion = 0;
  private readonly fecha = new Date();

  constructor(escribir: (trozo: Buffer) => void) {
    this.escribir = escribir;
  }

  private emitir(trozo: Buffer): void {
    this.escribir(trozo);
    this.posicion += trozo.length;
  }

  /**
   * Añade un fichero.
   *
   * Los PDF y las imágenes ya vienen comprimidos: volver a comprimirlos gasta
   * tiempo y no baja el tamaño, así que se guardan tal cual.
   */
  añadir(nombre: string, contenido: Buffer | string, comprimir = true): void {
    const datos = Buffer.isBuffer(contenido) ? contenido : Buffer.from(contenido, 'utf8');
    const nombreBuf = Buffer.from(nombre, 'utf8');
    const crc = crc32(datos);
    const cuerpo = comprimir ? zlib.deflateRawSync(datos, { level: 6 }) : datos;
    const metodo = comprimir ? 8 : 0;
    const { hora, dia } = fechaDos(this.fecha);

    this.entradas.push({
      nombre: nombreBuf,
      crc,
      comprimido: cuerpo.length,
      original: datos.length,
      metodo,
      hora,
      dia,
      desplazamiento: this.posicion,
    });

    const cabecera = Buffer.alloc(30);
    cabecera.writeUInt32LE(0x04034b50, 0); // firma de cabecera local
    cabecera.writeUInt16LE(20, 4); // versión necesaria
    cabecera.writeUInt16LE(0x0800, 6); // nombres en UTF-8
    cabecera.writeUInt16LE(metodo, 8);
    cabecera.writeUInt16LE(hora, 10);
    cabecera.writeUInt16LE(dia, 12);
    cabecera.writeUInt32LE(crc, 14);
    cabecera.writeUInt32LE(cuerpo.length, 18);
    cabecera.writeUInt32LE(datos.length, 22);
    cabecera.writeUInt16LE(nombreBuf.length, 26);
    cabecera.writeUInt16LE(0, 28);

    this.emitir(cabecera);
    this.emitir(nombreBuf);
    this.emitir(cuerpo);
  }

  /** Cierra el archivo escribiendo el directorio central. Hay que llamarlo. */
  cerrar(): void {
    const inicioDirectorio = this.posicion;

    for (const e of this.entradas) {
      const registro = Buffer.alloc(46);
      registro.writeUInt32LE(0x02014b50, 0); // firma de entrada del directorio
      registro.writeUInt16LE(20, 4); // versión que lo creó
      registro.writeUInt16LE(20, 6); // versión necesaria
      registro.writeUInt16LE(0x0800, 8);
      registro.writeUInt16LE(e.metodo, 10);
      registro.writeUInt16LE(e.hora, 12);
      registro.writeUInt16LE(e.dia, 14);
      registro.writeUInt32LE(e.crc, 16);
      registro.writeUInt32LE(e.comprimido, 20);
      registro.writeUInt32LE(e.original, 24);
      registro.writeUInt16LE(e.nombre.length, 28);
      registro.writeUInt16LE(0, 30); // extra
      registro.writeUInt16LE(0, 32); // comentario
      registro.writeUInt16LE(0, 34); // disco
      registro.writeUInt16LE(0, 36); // atributos internos
      registro.writeUInt32LE(0, 38); // atributos externos
      registro.writeUInt32LE(e.desplazamiento, 42);
      this.emitir(registro);
      this.emitir(e.nombre);
    }

    const tamanoDirectorio = this.posicion - inicioDirectorio;
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0); // firma de fin de directorio
    fin.writeUInt16LE(0, 4);
    fin.writeUInt16LE(0, 6);
    fin.writeUInt16LE(this.entradas.length, 8);
    fin.writeUInt16LE(this.entradas.length, 10);
    fin.writeUInt32LE(tamanoDirectorio, 12);
    fin.writeUInt32LE(inicioDirectorio, 16);
    fin.writeUInt16LE(0, 20);
    this.emitir(fin);
  }
}
