/**
 * Cuentas que nacen de un proveedor de identidad.
 *
 * LA REGLA MÁS IMPORTANTE DE TODO EL FICHERO: LAS CUENTAS NO SE FUSIONAN
 * SOLAS. Nunca. Ni Google y Apple con el mismo correo, ni un correo verificado
 * que coincida con una cuenta que ya existe.
 *
 * Cuesta explicarlo porque la tentación es enorme y suena razonable: «entra con
 * Google, su correo está verificado, y existe una cuenta con ese correo — pues
 * es suya». No lo es. Esa cuenta pudo nacer de `aceptarGuardar` con el correo
 * que TECLEÓ QUIEN ORGANIZA, y ahí caben una errata o la dirección de un
 * conocido reutilizada. Adoptarla automáticamente sería entregarle a alguien el
 * historial de otra persona por haber acertado una cadena de texto.
 *
 * Y la fusión es irreversible en la práctica: `Account.partidas` es un array
 * plano sin traza de origen, y borrar la cuenta se lo lleva entero. Si dos
 * personas quedaran unidas por error, el día que una ejerza su derecho de
 * supresión se llevaría por delante el historial de la otra — y el comprobador
 * diría que todo fue bien.
 *
 * Vincular un segundo proveedor SÍ se puede, pero solo desde dentro de una
 * sesión ya iniciada: ahí la persona demuestra que controla las dos identidades.
 */
import { nanoid } from 'nanoid';
import { getStore } from '../db/store';
import { normalizarEmail } from '../../../shared/live';
import type { Account } from '../../../shared/live';
import type { CorreoDeCuenta, IdentidadDeProveedor, ProveedorId } from '../../../shared/identidad';

/** Lo que devuelve `verificarIdToken`, sin las fechas que pone el servidor. */
export type IdentidadVerificada = Omit<IdentidadDeProveedor, 'vinculadaEl' | 'vistaEl'>;

export class ConflictoDeIdentidad extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ConflictoDeIdentidad';
  }
}

/** ¿Esta cuenta lleva esta identidad de proveedor? */
function tieneIdentidad(cuenta: Account, proveedor: ProveedorId, sub: string): boolean {
  return (cuenta.identidades ?? []).some((i) => i.proveedor === proveedor && i.sub === sub);
}

/** Apunta un correo en la cuenta con el nivel de prueba que le corresponde. */
function anotarCorreo(cuenta: Account, identidad: IdentidadVerificada): void {
  if (!identidad.correo) return;
  const correo = normalizarEmail(identidad.correo);
  const correos = cuenta.correos ?? [];
  const existente = correos.find((c) => c.correo === correo);
  const nivel: CorreoDeCuenta['nivel'] = identidad.correoVerificado ? 'buzon' : 'invitacion';

  if (existente) {
    // El nivel solo SUBE. Que un proveedor deje de afirmar la verificación en
    // una respuesta suelta no puede degradar lo que ya se demostró.
    if (existente.nivel === 'invitacion' && nivel === 'buzon') {
      existente.nivel = 'buzon';
      existente.origen = identidad.proveedor;
      existente.esRelay = identidad.esRelay;
    }
  } else {
    correos.push({
      correo,
      nivel,
      origen: identidad.proveedor,
      esRelay: identidad.esRelay,
      anadidoEl: new Date().toISOString(),
    });
  }
  cuenta.correos = correos;
}

/**
 * Entra con un proveedor: recupera la cuenta de esa identidad, o crea una.
 *
 * NO adopta cuentas existentes por coincidencia de correo. Si alguien ya tenía
 * un perfil creado por el camino del consentimiento y ahora entra con Google,
 * se le crea una cuenta NUEVA y limpia. Unirlas es cosa suya, desde dentro, con
 * `vincularIdentidad`.
 */
export async function entrarConProveedor(identidad: IdentidadVerificada): Promise<Account> {
  const store = getStore();
  const ahora = new Date().toISOString();

  const existente = await store.getAccountPorIdentidad(identidad.proveedor, identidad.sub);
  if (existente) {
    /*
     * Apple SOLO manda el correo y el nombre la PRIMERA vez. A partir de la
     * segunda llegan vacíos, así que aquí se conserva lo que ya se sabía en
     * lugar de pisarlo con `undefined` — pisarlo es cómo se pierde para
     * siempre el correo de alguien que entró hace meses.
     */
    const idents = existente.identidades ?? [];
    const suya = idents.find((i) => i.proveedor === identidad.proveedor && i.sub === identidad.sub);
    if (suya) {
      suya.vistaEl = ahora;
      if (identidad.correo) suya.correo = normalizarEmail(identidad.correo);
      if (identidad.nombre) suya.nombre = identidad.nombre;
      suya.correoVerificado = suya.correoVerificado || identidad.correoVerificado;
    }
    existente.identidades = idents;
    anotarCorreo(existente, identidad);
    return store.saveAccount(existente);
  }

  const correo = identidad.correo ? normalizarEmail(identidad.correo) : '';
  const nueva: Account = {
    id: nanoid(12),
    /*
     * Sin correo —Apple con «Ocultar mi correo» revocado, por ejemplo— se pone
     * uno interno en un dominio reservado. El correo NO es la identidad de esta
     * cuenta; el `sub` lo es. Pero el almacén lo usa de índice y no puede estar
     * vacío, y dos cuentas con la cadena vacía se pisarían entre sí.
     */
    email: correo || `${identidad.proveedor}-${identidad.sub}@proveedor.gamemasters.invalid`,
    displayName: identidad.nombre?.trim() || 'Invitado',
    createdAt: ahora,
    partidas: [],
    trofeos: [],
    identidades: [{ ...identidad, correo: correo || undefined, vinculadaEl: ahora, vistaEl: ahora }],
    correos: [],
  };
  anotarCorreo(nueva, identidad);
  return store.saveAccount(nueva);
}

/**
 * Vincula un SEGUNDO proveedor a una cuenta ya iniciada.
 *
 * Es el único puente entre identidades, y exige estar dentro: quien lo pide ya
 * demostró controlar la primera, y al presentar el testigo demuestra la
 * segunda. Si esa identidad pertenece ya a otra cuenta, se corta con un
 * conflicto en vez de fusionar — ver la cabecera del fichero.
 */
export async function vincularIdentidad(
  cuenta: Account,
  identidad: IdentidadVerificada,
): Promise<Account> {
  const store = getStore();
  const ahora = new Date().toISOString();

  const duena = await store.getAccountPorIdentidad(identidad.proveedor, identidad.sub);
  if (duena && duena.id !== cuenta.id) {
    throw new ConflictoDeIdentidad(
      `Esa cuenta de ${identidad.proveedor} ya está vinculada a otro perfil de GameMasters. ` +
        'Entra con ella, o bórrala antes de vincularla aquí.',
    );
  }

  if (!tieneIdentidad(cuenta, identidad.proveedor, identidad.sub)) {
    cuenta.identidades = [
      ...(cuenta.identidades ?? []),
      { ...identidad, vinculadaEl: ahora, vistaEl: ahora },
    ];
  }
  anotarCorreo(cuenta, identidad);

  /*
   * Cortar las sesiones anteriores al vincular un proveedor de VERDAD.
   *
   * Mientras no hubo proveedores, una cuenta de taller se reclamaba escribiendo
   * un nombre junto a la contraseña de la casa —organización, no seguridad—. En
   * cuanto esta cuenta tiene identidad verificada eso deja de valer, y las
   * sesiones repartidas por aquel camino tienen que morir. Sin esto, teclear
   * «Miguel» seguiría siendo una puerta trasera permanente a una cuenta ya
   * verificada.
   */
  cuenta.sesionesValidasDesde = ahora;
  return store.saveAccount(cuenta);
}

/**
 * ¿Puede esta cuenta abrir el taller?
 *
 * La lista blanca vive en el entorno (`GM_ADMITIDOS`, correos separados por
 * comas) y se compara contra los correos VERIFICADOS de la cuenta. Con la lista
 * vacía no se concede a nadie por proveedor: es una decisión de quien
 * administra la instalación, no algo que se gane iniciando sesión.
 */
export function admitidoEnElTaller(cuenta: Account): boolean {
  const admitidos = (process.env.GM_ADMITIDOS ?? '')
    .split(',')
    .map((c) => normalizarEmail(c))
    .filter(Boolean);
  if (admitidos.length === 0) return false;
  return (cuenta.correos ?? []).some((c) => c.nivel === 'buzon' && admitidos.includes(c.correo));
}
