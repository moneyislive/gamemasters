/**
 * LA FIGURA DE ESTE APARATO: qué aventurero soy en el Muelle, y dónde se guarda.
 *
 * ═══ DOS SITIOS, Y CUÁL MANDA ═══
 *
 * Sin cuenta, la figura se sortea una vez por aparato y se guarda como el
 * bolsillo: `SecureStore` en el móvil, `localStorage` en la web. Es el mismo
 * trato que `avatar.ts` da al personaje de estreno, y por la misma razón: si
 * sólo se devolviera al azar, cada pantalla que preguntara sacaría un aventurero
 * distinto y la identidad cambiaría sola al navegar.
 *
 * Con cuenta, ADEMÁS se guarda en la cuenta (`PUT /api/cuenta/figura`) y se lee
 * al llegar (`GET /api/cuenta/yo`), así que sigue a la persona de un aparato a
 * otro. Cuando las dos dicen cosas distintas manda la de la cuenta, y se copia
 * al aparato: la cuenta es lo que la persona lleva encima; el aparato es donde
 * está sentada ahora.
 *
 * ═══ LA RED NUNCA PIERDE LA ELECCIÓN ═══
 *
 * Se guarda en el aparato ANTES de hablar con el servidor, y un fallo del
 * servidor —sin cobertura, servidor viejo sin esa ruta, sesión caducada— no
 * deshace nada. Quien elige a La Maga en el metro tiene que seguir siendo La
 * Maga al salir del túnel. Lo que se pierde es la sincronía con la cuenta, y eso
 * se recupera solo la siguiente vez que la cuenta se lea y no traiga figura.
 *
 * ═══ LO QUE LLEGA POR LA RED SE MIRA ═══
 *
 * `esFigura` antes de creerse nada: el servidor guarda la figura como cadena
 * opaca y una cuenta puede traer una que este binario no conozca —elegida desde
 * una versión más nueva de la app—. Una figura desconocida no se adopta ni se
 * borra: se deja la del aparato y la cuenta se queda como estaba, que es lo que
 * hace que dos versiones de la app no se pisen la elección la una a la otra.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { cargarSesionGuardada, guardarMiFigura, hayCuenta, quienSoy } from '../api';
import { esFigura, FIGURAS } from '../../../escenas/embarcadero/figuras';
import type { FiguraId } from '../../../escenas/embarcadero/figuras';

/** La llave del almacén. Con el mismo prefijo que el bolsillo: es del arcade. */
const CLAVE = 'arcade.figura';

/*
 * El almacén, con `try/catch` en las dos direcciones: modo privado, almacén
 * lleno o un aparato sin llavero no pueden impedir elegir figura. Sin poder
 * recordar, se vuelve al sorteo en el siguiente arranque, y no pasa nada.
 */
const almacen = {
  async get(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return globalThis.localStorage?.getItem(CLAVE) ?? null;
      return await SecureStore.getItemAsync(CLAVE);
    } catch {
      return null;
    }
  },
  async set(valor: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        globalThis.localStorage?.setItem(CLAVE, valor);
        return;
      }
      await SecureStore.setItemAsync(CLAVE, valor);
    } catch {
      /* Se pierde al cerrar, y se vuelve a sortear. No se puede hacer más. */
    }
  },
};

/** La figura guardada en este aparato, o `null` si no hay ninguna o no vale. */
export async function figuraGuardada(): Promise<FiguraId | null> {
  const cruda = await almacen.get();
  return esFigura(cruda) ? cruda : null;
}

/**
 * Guarda la elección: en el aparato siempre, y en la cuenta si la hay.
 *
 * La llamada a la cuenta no se espera y su fallo se traga a propósito: ver la
 * cabecera. Quien llama ya tiene la figura puesta en pantalla y sentada en la
 * mesa si estaba sentado (`mesa.vestir`); esto sólo asegura que mañana, en otro
 * aparato, siga siendo la misma.
 */
export async function guardarFigura(id: FiguraId): Promise<void> {
  await almacen.set(id);
  if (!hayCuenta()) return;
  try {
    await guardarMiFigura(id);
  } catch {
    /* Sin red o sin esa ruta en el servidor: la elección de hoy ya está guardada. */
  }
}

/**
 * Una figura al azar, para el primer arranque.
 *
 * AL AZAR Y NO SIEMPRE LA PRIMERA, por lo mismo que el elenco de `avatar.ts`: si
 * todo el mundo empezara siendo El Caballero, en una mesa de seis habría seis
 * caballeros idénticos y la figura dejaría de distinguir a nadie, que es para lo
 * único que está.
 */
function sortearFigura(): FiguraId {
  const elegida = FIGURAS[Math.floor(Math.random() * FIGURAS.length)] ?? FIGURAS[0];
  return (elegida as (typeof FIGURAS)[number]).id;
}

/**
 * La figura de este aparato: la guardada o, la primera vez, una sorteada QUE SE
 * GUARDA. Devolverla sin guardarla haría que cada visita al Muelle trajera un
 * aventurero distinto.
 */
export async function figuraDeEstreno(): Promise<FiguraId> {
  const guardada = await figuraGuardada();
  if (guardada !== null) return guardada;
  const estreno = sortearFigura();
  await almacen.set(estreno);
  return estreno;
}

/**
 * La figura CON la cuenta delante: la del aparato, salvo que haya cuenta y la
 * cuenta traiga una válida, que entonces manda y se copia al aparato.
 *
 * ═══ SE ESPERA A LA LECTURA DEL DISCO, Y NO ES OPCIONAL ═══
 *
 * `hayCuenta()` contesta con lo que haya en memoria, y en el arranque —o abriendo
 * el Muelle por un enlace directo— la memoria está vacía hasta que
 * `cargarSesionGuardada()` termina. Sin esperar, aquí se diría «no hay cuenta»
 * teniendo cuenta, y la figura de la cuenta no se leería nunca en frío. Es la
 * misma carrera que `api.ts` cuenta en su cabecera de la lectura compartida.
 *
 * ═══ SI LA CUENTA NO TRAE FIGURA, SE LE MANDA LA DEL APARATO ═══
 *
 * No estaba escrito y se decide aquí: una cuenta sin figura es una persona que
 * eligió antes de tener cuenta, o que nunca eligió. Mandarle la del aparato es lo
 * que hace que el siguiente aparato la vea, que es la promesa entera de guardarla
 * en la cuenta. Sin esto, la cuenta sólo se enteraría de las elecciones
 * posteriores a este momento. Es de mejor esfuerzo, como todo lo que habla con
 * la cuenta desde aquí.
 */
export async function figuraConCuenta(): Promise<FiguraId> {
  await cargarSesionGuardada();
  const delAparato = await figuraDeEstreno();
  if (!hayCuenta()) return delAparato;
  try {
    const { cuenta } = await quienSoy();
    if (cuenta === null) return delAparato;
    if (esFigura(cuenta.figura)) {
      if (cuenta.figura !== delAparato) await almacen.set(cuenta.figura);
      return cuenta.figura;
    }
    if (cuenta.figura === null || cuenta.figura === undefined) {
      void guardarMiFigura(delAparato).catch(() => undefined);
    }
    return delAparato;
  } catch {
    /* Sin red: la del aparato es la única verdad que hay a mano. */
    return delAparato;
  }
}
