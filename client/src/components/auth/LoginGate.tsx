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

  useEffect(() => {
    let vigente = true;
    getAuthStatus()
      .then((estadoAuth) => {
        if (!vigente) return;
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
      await login(password);
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
        <p className="gate-subtitle">
          Esta mansión está cerrada con llave. Diga la contraseña de la casa.
        </p>

        <input
          className="input gate-input"
          type="password"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          placeholder="Contraseña"
          aria-label="Contraseña de acceso"
          autoFocus
          autoComplete="current-password"
        />

        {error && (
          <p className="gate-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn--primary gate-btn" type="submit" disabled={entrando}>
          {entrando ? 'Abriendo…' : 'Entrar'}
        </button>
      </motion.form>
    </div>
  );
}
