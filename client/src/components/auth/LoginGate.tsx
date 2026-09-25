/**
 * Puerta de acceso: si la instancia está protegida con contraseña
 * (APP_PASSWORD en el servidor), no se muestra la aplicación hasta entrar.
 *
 * Cuando no hay contraseña configurada —el caso del desarrollo en local— este
 * componente es transparente: comprueba el estado y deja pasar.
 */
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { getAuthStatus, login } from '../../api/client';
import './logingate.css';

type Estado = 'comprobando' | 'bloqueado' | 'dentro' | 'sin-servidor';

export default function LoginGate({ children }: { children: ReactNode }): JSX.Element {
  const [estado, setEstado] = useState<Estado>('comprobando');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [conGoogle, setConGoogle] = useState(false);
  // Con el taller abierto a cualquier cuenta, la puerta invita a entrar con ella.
  const [publico, setPublico] = useState(false);

  /*
   * ¿Ofrece este servidor entrar con Google? Se pregunta, no se adivina: un
   * botón que no lleva a ningún sitio es peor que no tenerlo.
   */
  useEffect(() => {
    let vigente = true;
    fetch('/api/cuenta/proveedores')
      .then((r) => r.json())
      .then((p: { google?: boolean }) => {
        if (vigente) setConGoogle(Boolean(p.google));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    getAuthStatus()
      .then((estadoAuth) => {
        if (!vigente) return;
        setPublico(estadoAuth.publico === true);
        setEstado(!estadoAuth.required || estadoAuth.authenticated ? 'dentro' : 'bloqueado');
      })
      .catch(() => {
        // Sin respuesta del servidor no se puede saber: se deja pasar y que sea
        // la propia aplicación la que muestre su error de conexión.
        if (vigente) setEstado('sin-servidor');
      });
    return () => {
      vigente = false;
    };
  }, []);

  const entrar = async (evento: FormEvent): Promise<void> => {
    evento.preventDefault();
    if (!password.trim()) return;
    setEntrando(true);
    setError(null);
    try {
      await login(password, nombre.trim() || undefined);
      setEstado('dentro');
    } catch (fallo) {
      setError(
        fallo instanceof Error && fallo.message
          ? fallo.message
          : 'No se pudo comprobar la contraseña.',
      );
      setPassword('');
    } finally {
      setEntrando(false);
    }
  };

  if (estado === 'dentro' || estado === 'sin-servidor') return <>{children}</>;

  if (estado === 'comprobando') {
    return (
      <div className="gate">
        <p className="gate-cargando text-italic">Comprobando la puerta…</p>
      </div>
    );
  }

  return (
    <div className="gate">
      <motion.form
        className="deco-frame deco-corners gate-card"
        onSubmit={(evento) => void entrar(evento)}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <span className="gate-glyph" aria-hidden="true">
          ⚿
        </span>
        <h1 className="gate-title">GameMasters</h1>
        {publico && conGoogle ? (
          <>
            <p className="gate-subtitle">
              Entra con tu cuenta para preparar tus veladas: tus partidas, tu monedero y tu suscripción van con ella.
            </p>
            <a className="btn btn--primary gate-btn" href="/api/cuenta/entrar/google">
              Entrar con Google
            </a>
            <div className="gate-o">
              <span>o, si eres de la casa</span>
            </div>
          </>
        ) : (
          <p className="gate-subtitle">
            Esta mansión está cerrada con llave. Diga la contraseña de la casa.
          </p>
        )}

        <input
          className="input gate-input"
          type="password"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          placeholder={publico ? 'Contraseña de la casa' : 'Contraseña'}
          aria-label="Contraseña de acceso"
          autoFocus={!publico}
          autoComplete="current-password"
        />

        {/*
          El nombre es OPCIONAL y sirve para que las partidas que crees lleven
          tu firma y no salgan huérfanas. Es organización, no seguridad: quien
          tiene la contraseña puede escribir cualquier nombre, y está dicho así
          en el servidor. En cuanto tu cuenta vincule un proveedor de verdad,
          este atajo deja de abrirla.
        */}
        <input
          className="input gate-input gate-input--nombre"
          type="text"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          placeholder="Tu nombre (opcional)"
          aria-label="Tu nombre, para firmar las partidas que crees"
          autoComplete="nickname"
        />

        {error && (
          <p className="gate-error" role="alert">
            {error}
          </p>
        )}

        <button className={`btn gate-btn${publico && conGoogle ? '' : ' btn--primary'}`} type="submit" disabled={entrando}>
          {entrando ? 'Abriendo…' : 'Entrar'}
        </button>

        {/*
          Es un enlace y no un botón porque NO es una llamada desde la página: es
          una navegación de verdad, el navegador entero se va a Google y vuelve.
          Un `fetch` no podría hacerlo —Google no deja que su pantalla se cargue
          dentro de otra— y disfrazarlo de botón solo escondería lo que pasa.
        */}
        {conGoogle && !publico && (
          <>
            <div className="gate-o">
              <span>o</span>
            </div>
            <a className="btn gate-google" href="/api/cuenta/entrar/google">
              Entrar con Google
            </a>
            <p className="gate-nota text-dim">
              Solo abren el taller las cuentas que quien administra haya autorizado.
            </p>
          </>
        )}

        {/*
          Aquí, en la puerta, y no dentro: quien organiza introduce en esta
          herramienta los nombres, los correos y las fotos de sus invitados, así
          que tiene que poder leer qué se hace con ellos ANTES de teclear nada.
          La ruta va por delante del guardián, de modo que se abre sin entrar.
        */}
        <a className="gate-privacidad text-dim" href="/privacidad" target="_blank" rel="noopener">
          Política de privacidad
        </a>
        {publico && (
          <a className="gate-privacidad text-dim" href="/terminos" target="_blank" rel="noopener">
            Términos y condiciones de compra
          </a>
        )}
      </motion.form>
    </div>
  );
}
