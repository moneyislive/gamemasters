/**
 * Quién eres en el taller, y cómo dejar de ser anónimo.
 *
 * EL CALLEJÓN SIN SALIDA QUE ESTO ARREGLA. La puerta (`LoginGate`) solo se
 * dibuja cuando NO estás dentro. Así que quien entraba con la contraseña de la
 * casa —que es como se ha entrado siempre— pasaba de largo y **no volvía a ver
 * el botón de Google nunca más**. No es un detalle de comodidad: su progreso,
 * sus partidas y sus trofeos quedaban atados a una contraseña compartida en vez
 * de a una persona, y no había forma de mudarlos.
 *
 * Por eso este control vive FUERA de la puerta y por encima de las páginas: se
 * ve estés como estés, y ofrece iniciar sesión mientras no la tengas.
 *
 * SE OFRECEN TODOS LOS PROVEEDORES QUE HAYA, no solo Google. El servidor dice
 * cuáles tiene configurados y aquí se pintan los que sean; el día que se
 * encienda Apple aparecerá solo, sin tocar este fichero.
 *
 * Y NO SE PINTA NADA CUANDO NO HAY NADA QUE OFRECER: sin proveedores y sin
 * cuenta, este control sería un adorno que ocupa una esquina para decir que no
 * puedes hacer nada.
 */
import { useCallback, useEffect, useState } from 'react';
import './barradecuenta.css';

interface Cuenta {
  id: string;
  displayName: string;
  email: string;
  taller: boolean;
  via: string[];
}

/**
 * `navegador` es la lista que importa AQUÍ, y no `google`/`apple` a secas.
 *
 * Que un proveedor esté configurado significa que el servidor sabe verificar
 * sus testigos — lo cual basta para la app, que los consigue por su cuenta.
 * Pero el taller solo puede entrar por navegador, y eso exige una ruta de ida
 * que no todos tienen: la de Apple necesita un Services ID y el dominio
 * verificado, y todavía no existe. Pintar un botón mirando `apple` daría un 404
 * a quien lo pulsara.
 */
type Proveedores = { google: boolean; apple: boolean; navegador?: string[] };

/** Cómo se llama cada proveedor cuando hay que escribirlo en un botón. */
const NOMBRES: Record<string, string> = { google: 'Google', apple: 'Apple' };

export default function BarraDeCuenta(): JSX.Element | null {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [proveedores, setProveedores] = useState<Proveedores | null>(null);
  const [abierto, setAbierto] = useState(false);

  const preguntar = useCallback(() => {
    /*
     * `/cuenta/yo` NO responde 401 cuando no hay sesión: devuelve `null`. Es
     * deliberado — preguntar quién eres no es entrar, y un 401 aquí llenaría la
     * consola de errores en el caso más normal de todos, que es no tener cuenta
     * todavía.
     */
    fetch('/api/cuenta/yo')
      .then((r) => (r.ok ? r.json() : { cuenta: null }))
      .then((d: { cuenta: Cuenta | null }) => setCuenta(d.cuenta))
      .catch(() => setCuenta(null));

    fetch('/api/cuenta/proveedores')
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Proveedores | null) => setProveedores(p))
      .catch(() => setProveedores(null));
  }, []);

  useEffect(preguntar, [preguntar]);

  const salir = async (): Promise<void> => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    // Recarga entera y no un `setCuenta(null)`: al salir cambia también lo que
    // el taller puede enseñar, y dejar la pantalla como estaba mostraría
    // partidas que ya no se pueden abrir.
    window.location.reload();
  };

  const porNavegador = proveedores?.navegador ?? [];
  const hayProveedor = porNavegador.length > 0;

  // Nada que decir y nada que ofrecer: no se ocupa la esquina para nada.
  if (!cuenta && !hayProveedor) return null;

  if (!cuenta) {
    return (
      <div className="cuentabarra">
        <span className="cuentabarra-anon">Sin cuenta</span>
        {porNavegador.map((p) => (
          <a key={p} className="btn cuentabarra-btn" href={`/api/cuenta/entrar/${p}`}>
            Entrar con {NOMBRES[p] ?? p}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="cuentabarra">
      <button
        type="button"
        className="cuentabarra-quien"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <span className="cuentabarra-inicial" aria-hidden="true">
          {(cuenta.displayName || '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="cuentabarra-nombre">{cuenta.displayName}</span>
      </button>

      {abierto && (
        <div className="cuentabarra-menu deco-frame">
          <p className="cuentabarra-correo text-dim">{cuenta.email}</p>
          {/*
            Se dice si esta cuenta abre el taller o no. Sin esto, quien inicia
            sesión y no está en la lista ve el taller igual —porque conserva la
            contraseña de la casa— y se lleva la sorpresa el día que la quiten.
          */}
          {!cuenta.taller && (
            <p className="cuentabarra-aviso">
              Esta cuenta todavía no tiene permiso para dirigir veladas. Estás dentro por la
              contraseña de la casa.
            </p>
          )}
          <button type="button" className="btn cuentabarra-salir" onClick={() => void salir()}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
