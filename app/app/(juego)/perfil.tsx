/**
 * Tu cuenta: las veladas que llevas y lo que has ganado en ellas.
 *
 * La cuenta es el correo que puso quien organiza. Si no puso ninguno, se juega
 * igual pero la partida no se guarda, y eso se dice claramente en vez de
 * mostrar una pantalla vacía sin explicación.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import { TROFEOS } from '../../../shared/live';
import {
  Boton,
  Cargando,
  Cuerpo,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Seccion,
  Titulo,
  color,
  espacio,
} from '../../src/ui';
import type { Account } from '../../../shared/live';

export default function Perfil(): JSX.Element {
  const { vista, desconectar } = usePartida();
  const [cuenta, setCuenta] = useState<Account | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api
      .pedirPerfil()
      .then((r) => setCuenta(r.cuenta))
      .catch(() => setCuenta(null))
      .finally(() => setCargando(false));
  }, [vista?.sesion.phase]);

  const salir = async (): Promise<void> => {
    await desconectar();
    router.replace('/');
  };

  return (
    <Pantalla>
      <Titulo style={{ fontSize: 24, marginTop: espacio.md }}>
        {cuenta?.displayName ?? vista?.yo.displayName ?? 'Tu perfil'}
      </Titulo>
      {cuenta && (
        <Cuerpo tenue style={{ marginBottom: espacio.lg }}>{cuenta.email}</Cuerpo>
      )}

      {cargando ? (
        <Cargando texto="Buscando tus veladas…" />
      ) : !cuenta ? (
        <Marco>
          <Cuerpo>
            Esta partida no está asociada a ningún correo, así que no se guardará en un perfil.
            Pídele a quien organiza que añada tu correo al montar la próxima.
          </Cuerpo>
        </Marco>
      ) : (
        <>
          <Seccion>Trofeos</Seccion>
          <View style={estilos.rejilla}>
            {TROFEOS.map((t, i) => {
              const ganado = cuenta.trofeos.includes(t.id);
              return (
                <Animated.View
                  key={t.id}
                  entering={FadeInUp.delay(50 * i).duration(400)}
                  style={[estilos.trofeo, ganado ? estilos.trofeoGanado : estilos.trofeoVacio]}
                >
                  <Cuerpo style={{ fontSize: 26, opacity: ganado ? 1 : 0.25 }}>{t.glifo}</Cuerpo>
                  <Etiqueta style={{ color: ganado ? color.oro300 : 'rgba(217,201,163,0.35)', textAlign: 'center', marginTop: 4 }}>
                    {t.nombre}
                  </Etiqueta>
                  <Cuerpo
                    tenue
                    style={{ fontSize: 13, textAlign: 'center', marginTop: 2, opacity: ganado ? 1 : 0.5 }}
                  >
                    {t.descripcion}
                  </Cuerpo>
                </Animated.View>
              );
            })}
          </View>

          <Ornamento />

          <Seccion>Tus veladas</Seccion>
          {cuenta.partidas.length === 0 ? (
            <Marco>
              <Cuerpo tenue>Todavía ninguna terminada. Esta será la primera.</Cuerpo>
            </Marco>
          ) : (
            [...cuenta.partidas].reverse().map((p) => (
              <Marco key={p.gameId}>
                <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 17 }}>
                  {p.titulo}
                </Cuerpo>
                <Cuerpo tenue style={{ fontSize: 15, marginTop: 2 }}>
                  Interpretaste a {p.personaje}
                </Cuerpo>
                <View style={estilos.medallas}>
                  {p.gano && <Insignia texto="Ganaste" tono={color.oro300} />}
                  {!p.gano && p.acerto && <Insignia texto="Acertaste" tono={color.oro400} />}
                  {p.eraCulpable && <Insignia texto="Eras el culpable" tono="#e8a0a0" />}
                  {!p.acerto && !p.eraCulpable && <Insignia texto="No diste con ello" tono="rgba(217,201,163,0.6)" />}
                </View>
              </Marco>
            ))
          )}
        </>
      )}

      <Ornamento />
      <Boton onPress={() => void salir()}>Salir de la partida</Boton>
    </Pantalla>
  );
}

function Insignia({ texto, tono }: { texto: string; tono: string }): JSX.Element {
  return (
    <View style={[estilos.insignia, { borderColor: tono }]}>
      <Etiqueta style={{ color: tono }}>{texto}</Etiqueta>
    </View>
  );
}

const estilos = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  trofeo: {
    width: '31%',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: espacio.md,
    paddingHorizontal: 6,
  },
  trofeoGanado: {
    borderColor: 'rgba(201,162,39,0.55)',
    backgroundColor: 'rgba(201,162,39,0.1)',
  },
  trofeoVacio: {
    borderColor: 'rgba(201,162,39,0.16)',
    backgroundColor: 'rgba(11,23,16,0.4)',
  },
  medallas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: espacio.sm },
  insignia: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
