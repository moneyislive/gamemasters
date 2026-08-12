/**
 * Las tres puertas por las que se entra, con su contador de intentos puesto.
 *
 * Va aparte del mecanismo (`limitador.ts`) porque son dos cosas distintas: allí
 * está CÓMO se cuenta, y aquí CUÁNTO se aguanta en cada sitio. Los números de
 * abajo no son genéricos: cada uno sale de imaginar la velada.
 *
 * DÓNDE SE MONTA, Y POR QUÉ IMPORTA. Este router tiene que ir bajo `/api` y
 * DELANTE de los tres que atiende de verdad —`jugarRouter`, `cuentaRouter` y
 * `authRouter`—, porque un limitador que se monta detrás de la ruta que
 * protege no protege nada: para cuando le llega el turno, la contraseña ya se
 * ha comprobado. Como los tres se montan antes del guardián de la casa, con
 * ponerlo por delante de `jugarRouter` queda cubierto todo.
 *
 * Y NO LLEVA GUARDIÁN NINGUNO, a propósito: quien va a teclear su código
 * todavía no tiene credencial, y quien va a iniciar sesión tampoco. Un
 * limitador detrás de una puerta cerrada no cuenta a nadie.
 */
import { crearRouter } from '../rutas';
import { limitarIntentos } from './limitador';
import type { Request } from 'express';

const router = crearRouter();

/** Un campo del cuerpo, ya en texto, para usarlo como credencial. */
function campo(req: Request, nombre: string): string | undefined {
  const cuerpo = req.body as Record<string, unknown> | undefined;
  const valor = cuerpo?.[nombre];
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined;
}

/*
 * LA CONTRASEÑA DE LA CASA.
 *
 * La credencial es una constante porque contraseña solo hay una: aquí no hay
 * nada que separar, y el limitador se reduce a «cuántas veces puede fallar esta
 * conexión». Ocho es de sobra para quien la escribe de memoria en el móvil con
 * el teclado en mayúsculas, y ridículo para quien la está probando a lo bruto.
 *
 * El retardo de 600 ms que ya hay en `auth.ts` se queda donde está: encarece los
 * primeros ocho intentos, que son justo los que este contador deja pasar.
 */
router.post(
  '/auth/login',
  limitarIntentos({
    nombre: 'contraseña de la casa',
    credencial: () => 'casa',
    porCredencial: 8,
    porIp: 20,
  }),
);

/*
 * ENTRAR CON UNA CUENTA DE PROVEEDOR.
 *
 * Aquí no se adivina nada —un testigo de Google no se acierta probando— así que
 * lo que se limita no es el descubrimiento sino el abuso: cada intento fallido
 * se lleva por delante una consulta a las claves públicas del proveedor y, si
 * cuela, la creación de una cuenta. Por eso el tope es más alto que el de la
 * casa y aun así existe.
 *
 * La credencial es el proveedor, no el testigo: el testigo es distinto en cada
 * intento, y una clave que cambia sola no cuenta nada.
 */
router.post(
  '/cuenta/entrar',
  limitarIntentos({
    nombre: 'cuenta de proveedor',
    credencial: (req) => campo(req, 'proveedor') ?? 'sin-proveedor',
    porCredencial: 30,
    porIp: 60,
  }),
);

/*
 * EL CÓDIGO CON EL QUE SE ENTRA A JUGAR.
 *
 * Esta es la puerta delicada, y la que obliga a que los números sean generosos:
 * las doce personas de la mesa comparten la IP pública de la wifi de la casa y
 * teclean su código personal a la vez, con el móvil en una mano y la copa en la
 * otra. Varias se equivocan la primera vez —la I y la L no están en el alfabeto
 * precisamente por eso— y ninguna puede quedarse fuera de la cena por ello.
 *
 * Treinta fallos por partida y conexión dan margen a que se equivoque media
 * mesa dos veces, y siguen siendo nada contra un código de seis letras sobre el
 * alfabeto de veintinueve de `ALFABETO_CODIGO`: casi seiscientos millones de
 * combinaciones, a treinta cada diez minutos.
 *
 * La credencial es el código de la PARTIDA y no el personal, y eso es lo que
 * hace que el límite sirva: si fuera el personal, quien los probara al azar
 * estrenaría contador con cada intento y no gastaría nunca ninguno.
 */
router.post(
  '/jugar/entrar',
  limitarIntentos({
    nombre: 'código de la partida',
    credencial: (req) => campo(req, 'code')?.toUpperCase() ?? 'sin-codigo',
    porCredencial: 30,
    porIp: 60,
  }),
);

export default router;
