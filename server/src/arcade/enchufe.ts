/**
 * Por dónde entra un ARCADE que NO viene dentro del binario.
 *
 *   ARCADES_EXTERNOS=@harkania/arcade-tal,/opt/arcades/otro.mjs
 *
 * ═══ ESTO ES EL GEMELO DE `server/src/juegos/enchufe.ts` ═══
 *
 * Y lo es a propósito, hasta en el orden de los apartados: aquel fichero ya
 * resolvió el mismo problema para las veladas, ya tiene sus pruebas y ya tiene
 * escrito lo que NO hace. Escribir aquí otra solución distinta para el mismo
 * problema habría dejado dos maneras de instalar código de fuera en el mismo
 * proceso, que es la clase de duplicidad que acaba con una de las dos sin
 * mantener.
 *
 * ═══ QUÉ PROBLEMA RESUELVE ═══
 *
 * Mientras un arcade tenga que estar dentro del binario, «añadir un arcade»
 * significa tocar este repositorio, compilar y desplegar. Y aquí duele más que en
 * las veladas, porque un arcade es pequeño: la promesa entera del §7 —que un
 * juego de reglas se pinte con un mueble genérico y no cueste una publicación en
 * dos tiendas— no significa nada si para instalarlo hay que recompilar.
 *
 * ═══ POR QUÉ HACE FALTA UN ENCHUFE Y NO BASTA CON IMPORTAR ═══
 *
 * El servidor se compila con `esbuild --packages=external`, así que lo que viva en
 * `node_modules` NO entra en el paquete y se puede importar en ejecución. La
 * capacidad estaba. Lo que falta es que un módulo de fuera no tiene forma de
 * llamar a `instalarArcade`: esa función vive DENTRO del paquete, y un `import`
 * desde fuera resolvería a otra copia del código.
 *
 * Las tablas están ancladas con `Symbol.for`, así que en la práctica se
 * compartirían — pero apoyarse en eso sería pedirle a cada arcade que conozca los
 * nombres de tres símbolos y escriba en las estructuras a pelo, sin validación y
 * sin contrato. Así que se le PASA lo que necesita.
 *
 * ═══ LA MISMA SUPERFICIE PARA DENTRO Y PARA FUERA ═══
 *
 * `instalarArcade` es literalmente la misma función que llama `juegos/index.ts`
 * para dar de alta Riberas. No hay una API de segunda: si un arcade externo no
 * pudiera hacer lo que hace Riberas, el contrato estaría mintiendo sobre lo que es
 * un arcade. Lo que se le pasa además son las piezas que un juego necesita LEER o
 * USAR y que no puede reimplementar sin romper el determinismo —el azar sembrado,
 * la forma canónica, el reloj— y las de `mecanicas/`, que existen justo para eso.
 *
 * ═══ LO QUE ESTE FICHERO NO HACE, Y CONVIENE SABERLO ═══
 *
 * **NO AÍSLA.** Un arcade cargado así corre en el mismo proceso, con los mismos
 * permisos, y si su reductor entra en un bucle infinito se lleva el servidor por
 * delante — y con él todas las veladas en curso, que no tienen nada que ver.
 * Instalar un arcade es una decisión de quien administra el servidor, del mismo
 * orden que instalar un módulo de nginx; no es una tienda de extensiones abierta a
 * cualquiera.
 *
 * Lo único que se ha hecho al respecto, y hay que decir exactamente cuánto vale,
 * es `presupuesto.ts`: EXIGE un tope de tiempo síncrono y de tamaño de estado, y
 * pone en cuarentena al arcade que se pase. Eso NO impide que el PRIMER movimiento
 * pasado de rosca bloquee el bucle de eventos —Node es de un solo hilo y no hay
 * forma de interrumpir código síncrono sin sacarlo a otro proceso—; lo que impide
 * es que ocurra dos veces. La cabecera de aquel fichero lo cuenta con todas las
 * letras.
 *
 * ═══ Y DÓNDE SE ENGANCHA, QUE IMPORTA MÁS DE LO QUE PARECE ═══
 *
 * `server/src/index.ts` lo llama ANTES de `comprobarArranque()`, y no después
 * como hace con las veladas. La razón es concreta: ahí dentro están
 * `exigirSecretosTapados()` y `exigirQueAguantenVacio()`, que son las dos
 * garantías que impiden arrancar con un arcade que filtra o que revienta con la
 * mesa recién abierta. Instalar los de fuera después las dejaría cubriendo sólo a
 * los de dentro — o sea, a los únicos que alguien ya ha revisado.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  aplicar,
  aplicarConMotivo,
  arcadeInstalado,
  arcadesInstalados,
  cabenEnLaMesa,
  comoSeLlama,
  ESPECTADOR,
  esRechazo,
  esTic,
  instalarArcade,
  manifiestoDeArcadeSiExiste,
  movimientoDeTic,
  NADIE_SENTADO,
  NUNCA,
  plazoDentroDe,
  quedanTics,
  rechazar,
  reejecutar,
  registrarPuntuacion,
  segundosDe,
  TIC,
  ticsPara,
  vencido,
} from '../../../shared/arcade';
import {
  avanzarTiradas,
  barajar,
  elegir,
  enteroEntre,
  rebobinar,
  sembrar,
  siguiente,
  sinElAzar,
} from '../../../shared/mecanicas/azar';
import { canonico } from '../../../shared/mecanicas/canonico';

/**
 * LO QUE UN ARCADE DE FUERA RECIBE PARA DARSE DE ALTA Y PARA PODER JUGAR.
 *
 * Está partido en tres bloques y el orden dice lo que son: darse de alta, escribir
 * reglas que se puedan reejecutar, y leer el reloj. Nada más — y en particular NADA
 * de Express, de la base de datos, de las mesas ni del canal. Un arcade son reglas;
 * la autoridad es del servidor y no se presta.
 */
export interface EnchufeDeArcade {
  // ── Darse de alta ────────────────────────────────────────────────────────
  /**
   * LA PUERTA. Manifiesto, reductor, proyección, `loSecreto`, `opciones` y la cifra.
   *
   * Es la misma función, sin envolver, que usan los cuatro arcades de dentro. Que
   * `opciones` quepa aquí es de la fase 5 y es lo que hace que un arcade de fuera
   * pueda usar un mueble genérico de verdad: sin ella, la plataforma no tiene a
   * quién preguntarle qué se puede hacer ahora mismo. Y `puntuacion` también cabe
   * ya: es lo que permite que un arcade de fuera tenga récord verificable.
   */
  instalarArcade: typeof instalarArcade;
  /**
   * Cómo se le lee la cifra a este arcade, en una llamada aparte del alta.
   *
   * ═══ SIGUE ESTANDO, Y AHORA ES UNA COMODIDAD Y NO UN RODEO ═══
   *
   * Aquí ponía que iba aparte «porque el alta del núcleo todavía no tiene hueco
   * para ella», y ahora lo tiene: `instalarArcade({ …, puntuacion })` es el camino
   * recomendado, y el que deja el alta de un juego completa en un solo sitio.
   *
   * Esto se queda porque un arcade de fuera puede querer registrarla en otra línea
   * —o cambiarla sin volver a instalarse entero— y porque quitarlo rompería a un
   * arcade ya escrito sin ganar nada. Lo que sí cambió es dónde escribe: en la
   * misma tabla `INSTALADOS`, anclada con `Symbol.for`, y no en la tabla llana de
   * `juegos/` que no sobrevivía a una doble carga de módulo.
   */
  registrarPuntuacion: typeof registrarPuntuacion;

  // ── Lo que necesita para escribir un reductor que se pueda reejecutar ────
  /**
   * EL AZAR SEMBRADO, que no se puede reimplementar sin romperlo todo.
   *
   * Un arcade que use `Math.random()` deja de ser reejecutable, y con eso se caen
   * la verificación del marcador, la repetición y la autoridad barata de servidor.
   * `verify:pureza` lo caza dentro del repositorio y NO puede cazarlo fuera, así
   * que la única defensa real es que lo correcto esté a mano.
   */
  sembrar: typeof sembrar;
  siguiente: typeof siguiente;
  enteroEntre: typeof enteroEntre;
  barajar: typeof barajar;
  elegir: typeof elegir;
  rebobinar: typeof rebobinar;
  avanzarTiradas: typeof avanzarTiradas;
  sinElAzar: typeof sinElAzar;
  /**
   * LA FORMA CANÓNICA. La misma con la que se compara todo lo demás.
   *
   * Un arcade que serialice a su manera para comparar dos estados obtendrá
   * resultados distintos de los que obtiene `oro:arcade`, y la divergencia
   * aparecerá como un récord honrado rechazado.
   */
  canonico: typeof canonico;
  /**
   * RECHAZAR CON MOTIVO. La factura del «sólo si», pagada en la fase 5.
   *
   * Un arcade de fuera que ejerza la regla del espejo —ofrecer de más y validar
   * con todo lo que hay— produce rechazos como camino normal. Sin esto, lo único
   * que su pantalla podría decir es «la mesa está igual que estaba».
   */
  rechazar: typeof rechazar;
  esRechazo: typeof esRechazo;
  /** Aplicar un movimiento por la puerta de la plataforma, para quien quiera probarse. */
  aplicar: typeof aplicar;
  aplicarConMotivo: typeof aplicarConMotivo;
  reejecutar: typeof reejecutar;

  // ── El reloj y la mesa, que son vocabulario y no servicio ────────────────
  esTic: typeof esTic;
  movimientoDeTic: typeof movimientoDeTic;
  TIC: typeof TIC;
  NUNCA: typeof NUNCA;
  plazoDentroDe: typeof plazoDentroDe;
  quedanTics: typeof quedanTics;
  segundosDe: typeof segundosDe;
  ticsPara: typeof ticsPara;
  vencido: typeof vencido;
  /** Quién mira sin asiento, y la mesa sin nombres. Ver `QuienMira` y `LosSentados`. */
  ESPECTADOR: typeof ESPECTADOR;
  NADIE_SENTADO: typeof NADIE_SENTADO;
  /** Cómo se llama un asiento, con la degradación al identificador ya escrita. */
  comoSeLlama: typeof comoSeLlama;
  cabenEnLaMesa: typeof cabenEnLaMesa;

  // ── Y lo poco que necesita saber del reparto de este servidor ────────────
  /**
   * Qué hay instalado aquí.
   *
   * Un arcade puede querer no darse de alta dos veces, o comprobar que no está
   * pisando el identificador de otro. Sin esto tendría que fallar en el alta para
   * enterarse, y `instalarArcade` no falla por eso: SOBRESCRIBE, que es lo que hace
   * falta para las pruebas y lo que aquí sería una sustitución silenciosa.
   */
  arcadesInstalados: typeof arcadesInstalados;
  arcadeInstalado: typeof arcadeInstalado;
  manifiestoDeArcadeSiExiste: typeof manifiestoDeArcadeSiExiste;
}

/** El enchufe, montado. */
export function elEnchufeDeArcade(): EnchufeDeArcade {
  return {
    instalarArcade,
    registrarPuntuacion,
    sembrar,
    siguiente,
    enteroEntre,
    barajar,
    elegir,
    rebobinar,
    avanzarTiradas,
    sinElAzar,
    canonico,
    rechazar,
    esRechazo,
    aplicar,
    aplicarConMotivo,
    reejecutar,
    esTic,
    movimientoDeTic,
    TIC,
    NUNCA,
    plazoDentroDe,
    quedanTics,
    segundosDe,
    ticsPara,
    vencido,
    ESPECTADOR,
    NADIE_SENTADO,
    comoSeLlama,
    cabenEnLaMesa,
    arcadesInstalados,
    arcadeInstalado,
    manifiestoDeArcadeSiExiste,
  };
}

/** Lo que un arcade de fuera tiene que exportar. */
export type ArcadeDeFuera = {
  instalar: (api: EnchufeDeArcade) => void | Promise<void>;
};

/**
 * Convierte una ruta de fichero en algo que `import()` acepte.
 *
 * ═══ ESTO LO ENCONTRÓ LA PRUEBA, Y SÓLO OCURRE EN WINDOWS ═══
 *
 * `import('/opt/arcades/tal.mjs')` funciona en Linux. En Windows,
 * `import('C:/arcades/tal.mjs')` NO: el cargador de módulos lee `C:` como un
 * esquema de URL y contesta «Only URLs with a scheme in: file, data, and node are
 * supported».
 *
 * Es el fallo perfecto para escaparse: el desarrollo es en Windows y el despliegue
 * en Linux, así que sin esto la función habría pasado todas las pruebas del
 * servidor de producción y habría sido imposible probarla en la máquina donde se
 * escribe. Está copiado —a propósito, y no factorizado— de
 * `server/src/juegos/enchufe.ts`: compartirlo obligaría a que el enchufe de
 * arcades importara del de veladas, y `verify:fronteras` existe para que eso no
 * pase. Doce líneas repetidas cuestan menos que una frontera rota.
 *
 * Un NOMBRE DE PAQUETE —`@harkania/arcade-tal`— se deja tal cual: eso lo resuelve
 * Node por `node_modules` y convertirlo en una ruta lo rompería.
 */
function comoEspecificador(donde: string): string {
  const esRuta = donde.startsWith('.') || donde.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(donde);
  return esRuta ? pathToFileURL(path.resolve(donde)).href : donde;
}

/**
 * Instala los arcades que no vienen dentro del binario.
 *
 * `ARCADES_EXTERNOS` acepta lo que acepte `import()`: el nombre de un paquete de
 * `node_modules` o una ruta de fichero, que es lo que sirve para montar un arcade
 * desde un disco al lado del servidor sin publicarlo en ningún registro.
 *
 * ═══ UN ARCADE QUE FALLA NO TUMBA EL SERVIDOR ═══
 *
 * Se anota y se sigue con los demás, igual que con las veladas y por el mismo
 * motivo: morir al arrancar deja sin partida también a los arcades que están bien,
 * y por un fallo que quien administra el servidor a lo mejor ni ha escrito. Lo que
 * NO se hace es disimularlo — el aviso lleva el nombre y el error entero.
 *
 * Y esto NO afloja las dos garantías de arranque. Un arcade de fuera que se instale
 * BIEN pero declare secretos sin taparlos, o que se caiga con la mesa vacía, sigue
 * impidiendo que el servidor arranque: eso lo deciden `exigirSecretosTapados()` y
 * `exigirQueAguantenVacio()` un momento después, y por eso esta función se llama
 * antes que ellas. La diferencia entre las dos cosas es exacta: un módulo que ni
 * siquiera carga no ha instalado nada y no puede hacer daño; uno que ha instalado
 * un arcade que filtra, sí.
 */
export async function instalarArcadesDeFuera(especificadores: string[]): Promise<string[]> {
  const puestos: string[] = [];
  for (const donde of especificadores) {
    try {
      const modulo = (await import(comoEspecificador(donde))) as Partial<ArcadeDeFuera>;
      if (typeof modulo.instalar !== 'function') {
        console.error(
          `[arcade] «${donde}» se cargó pero no exporta \`instalar(api)\`, así que no se ha dado de alta nada.`,
        );
        continue;
      }
      await modulo.instalar(elEnchufeDeArcade());
      puestos.push(donde);
    } catch (error) {
      console.error(`[arcade] no se ha podido instalar «${donde}»:`, error);
    }
  }
  return puestos;
}
