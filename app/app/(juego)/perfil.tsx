/**
 * Tu cuenta: las veladas que llevas, lo que has ganado, y qué se guarda de ti.
 *
 * Esta pantalla es la ventanilla de todo lo que la ley te reconoce, y por eso
 * están aquí las tres cosas y separadas: aceptar que se guarde, dejar de
 * guardar, y borrarlo todo. Antes no había ninguna de las tres — el «sí» lo
 * daba quien organiza con solo teclear tu correo al montar la partida, y no
 * existía forma de deshacerlo.
 */
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import { TROFEOS, TROFEOS_DE_LA_CASA } from '../../../shared/live';
import { manifiestoDe } from '../../../shared/juegos';
import { conAlfa, useTema } from '../../src/tema-juego';
import type { TrofeoInfo } from '../../../shared/live';
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

/**
 * Los trofeos que se ganan por las REGLAS de este juego.
 *
 * SE CALCULA POR DIFERENCIA con los de la casa, en vez de escribir «si es la
 * Momia, estos cinco»: el día que entre un juego más, sus trofeos aparecen solos.
 *
 * ANTES LA DIFERENCIA SE HACÍA CONTRA `TROFEOS` ENTERO, que son los seis de
 * CLUEDO, y eso daba dos resultados equivocados a la vez. Para CLUEDO, lista
 * vacía y sección oculta; para la Momia, sus cinco arriba y los SEIS de CLUEDO
 * debajo, incluidos tres que desde que cada juego reparte los suyos allí ya no se
 * pueden ganar: tres huecos permanentemente vacíos, sin explicación, de otro
 * juego.
 *
 * Ahora la diferencia es contra `TROFEOS_DE_LA_CASA`, que son los tres que no
 * dependen de las reglas de nadie. CLUEDO enseña sus tres —«Quien lo resolvió»,
 * «Sabueso», «Crimen perfecto»— bajo su nombre y los tres de la casa debajo: los
 * mismos seis de siempre, repartidos en dos rejillas y cada uno bajo el rótulo
 * que le corresponde.
 */
function trofeosPropiosDe(juego: string | undefined): TrofeoInfo[] {
  const deLaCasa = new Set<string>(TROFEOS_DE_LA_CASA);
  return manifiestoDe(juego as never).trofeos.filter((t) => !deLaCasa.has(t.id));
}

export default function Perfil(): JSX.Element {
  const { vista, desconectar } = usePartida();
  const propios = trofeosPropiosDe(vista?.sesion.juego);
  const [cuenta, setCuenta] = useState<Account | null>(null);
  const [cargando, setCargando] = useState(true);
  /**
   * Un fallo de red NO es «no tienes cuenta».
   *
   * Antes ambos casos caían en `setCuenta(null)` y la pantalla soltaba
   * «pídele a quien organiza que añada tu correo» a alguien que sí lo tenía
   * puesto: la app culpaba al organizador de que la wifi fuera mal.
   */
  const [fallo, setFallo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [borrada, setBorrada] = useState(false);
  /** El correo que escribió quien organiza. Una invitación, no una cuenta. */
  const [invitacion, setInvitacion] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  const cargarPerfil = (): void => {
    setCargando(true);
    setFallo(false);
    // Igual que en las demás: sin esperar al disco, la credencial todavía no
    // está en memoria y el perfil se pide sin ella. Sale «no se ha podido
    // consultar tu perfil» con la sesión perfectamente guardada.
    api
      .cargarSesionGuardada()
      .then(() => api.pedirPerfil())
      .then((r) => {
        setCuenta(r.cuenta);
        setInvitacion(r.invitacion);
        setGuardando(r.guardando);
      })
      .catch(() => setFallo(true))
      .finally(() => setCargando(false));
  };

  /** Acepta o retira que las partidas se guarden. */
  const cambiarGuardado = async (quiero: boolean): Promise<void> => {
    setCambiando(true);
    try {
      const r = await api.guardarEnPerfil(quiero);
      setGuardando(r.guardando);
      cargarPerfil();
    } catch {
      setFallo(true);
    } finally {
      setCambiando(false);
    }
  };

  useEffect(cargarPerfil, [vista?.sesion.phase]);

  const salir = async (): Promise<void> => {
    await desconectar();
    router.replace('/');
  };

  const borrar = async (): Promise<void> => {
    setBorrando(true);
    try {
      await api.borrarCuenta();
      setCuenta(null);
      setBorrada(true);
      setConfirmando(false);
    } catch {
      setFallo(true);
    } finally {
      setBorrando(false);
    }
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
      ) : fallo ? (
        <Marco>
          <Cuerpo>No se ha podido consultar tu perfil. Puede ser cosa de la conexión.</Cuerpo>
          <Boton onPress={cargarPerfil} style={{ marginTop: espacio.md }}>
            Volver a intentarlo
          </Boton>
        </Marco>
      ) : borrada ? (
        <Marco>
          <Cuerpo>
            Cuenta borrada. Tu correo ya no está en ninguna partida, y con él se han ido tu
            historial y tus trofeos. Puedes seguir jugando esta velada con normalidad.
          </Cuerpo>
        </Marco>
      ) : !cuenta ? (
        /*
          Ni cuenta ni nada guardado. Dos casos distintos, y decirlos como si
          fueran uno era el fallo: si quien organiza puso tu correo, ANTES se te
          creaba un perfil sin preguntarte. Ahora se te ofrece, que no es lo
          mismo, y la pantalla lo explica en esos términos.
        */
        <Marco>
          {invitacion ? (
            <>
              <Etiqueta>Guardar tus veladas</Etiqueta>
              <Cuerpo style={{ marginTop: espacio.sm }}>
                Quien organiza te ha apuntado como {invitacion}. Si quieres, guardamos ahí las
                partidas que juegues, con su historial y sus trofeos, para que los tengas la
                próxima vez.
              </Cuerpo>
              <Cuerpo tenue style={{ marginTop: espacio.sm, fontSize: 15 }}>
                No hace falta para jugar, y puedes cambiar de idea cuando quieras.
              </Cuerpo>
              <Boton
                variante="primario"
                cargando={cambiando}
                onPress={() => void cambiarGuardado(true)}
                style={{ marginTop: espacio.lg }}
              >
                Guardar mis partidas
              </Boton>
            </>
          ) : (
            <Cuerpo>
              Esta partida no está asociada a ningún correo, así que no se guardará en un perfil.
              Pídele a quien organiza que añada tu correo al montar la próxima.
            </Cuerpo>
          )}
        </Marco>
      ) : (
        <>
          {/*
            * Los del juego de esta noche van PRIMERO y con su propio rótulo.
            * Mezclarlos con los comunes en una sola rejilla los habría dejado
            * indistinguibles, y son los únicos que se pueden ganar hoy: verlos
            * juntos es lo que le dice a alguien qué merece la pena intentar.
            */}
          {propios.length > 0 && (
            <>
              <Seccion>{manifiestoDe(vista?.sesion.juego).nombre}</Seccion>
              <View style={estilos.rejilla}>
                {propios.map((t, i) => (
                  <Vitrina key={t.id} trofeo={t} ganado={cuenta.trofeos.includes(t.id)} orden={i} />
                ))}
              </View>
              <Ornamento />
            </>
          )}

          {/*
            LOS DE LA CASA, que son los tres que se ganan en cualquier juego.

            Aquí se pintaba `TROFEOS` entero, o sea los SEIS de CLUEDO, en
            cualquier partida. En una expedición a una tumba la vitrina enseñaba
            «Quien lo resolvió», «Sabueso» y «Crimen perfecto — fuiste el culpable
            y nadie te descubrió» junto a los de la Momia, y desde que cada juego
            reparte los suyos esos tres ya no se pueden ganar allí: eran tres
            huecos permanentemente vacíos, sin explicación, de otro juego.

            Ahora arriba van los del juego que se juega y aquí solo los tres de la
            plataforma. Para CLUEDO la suma es exactamente la misma lista de
            siempre, repartida en dos rejillas.
          */}
          <Seccion>De la casa</Seccion>
          <View style={estilos.rejilla}>
            {TROFEOS.filter((t) => (TROFEOS_DE_LA_CASA as string[]).includes(t.id)).map((trofeo, i) => (
              <Vitrina
                key={trofeo.id}
                trofeo={trofeo}
                ganado={cuenta.trofeos.includes(trofeo.id)}
                orden={i}
              />
            ))}
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

      {/*
        Confirmación EN LA PANTALLA, no con `Alert`.
        `Alert.alert` no hace nada en react-native-web, y esta app también se
        juega desde el navegador: el botón de borrar habría quedado mudo justo
        allí donde más fácil es pulsarlo sin querer.
      */}
      {/*
        Dejar de guardar NO es borrar la cuenta, y por eso son dos botones
        separados. Uno dice «a partir de ahora, no»; el otro, «y lo de antes,
        tampoco». Meterlos en el mismo sitio haría que quien solo quiere lo
        primero acabe haciendo lo segundo sin querer.
      */}
      {cuenta && !borrada && guardando && (
        <Marco>
          <Cuerpo tenue style={{ fontSize: 15 }}>
            Tus partidas se están guardando en este perfil.
          </Cuerpo>
          <Boton
            cargando={cambiando}
            onPress={() => void cambiarGuardado(false)}
            style={{ marginTop: espacio.md }}
          >
            Dejar de guardar mis partidas
          </Boton>
        </Marco>
      )}

      {cuenta && !borrada && (
        confirmando ? (
          <Marco>
            <Cuerpo>
              Se borrará tu cuenta ({cuenta.email}), tu historial y tus trofeos, y tu correo se
              quitará de todas las partidas. No se puede deshacer. La velada de hoy sigue igual:
              no te echa de la mesa.
            </Cuerpo>
            <Boton
              variante="peligro"
              cargando={borrando}
              onPress={() => void borrar()}
              style={{ marginTop: espacio.md }}
            >
              Sí, bórralo todo
            </Boton>
            <Boton onPress={() => setConfirmando(false)} style={{ marginTop: espacio.sm }}>
              Mejor no
            </Boton>
          </Marco>
        ) : (
          <Boton variante="peligro" onPress={() => setConfirmando(true)}>
            Borrar mi cuenta y mis datos
          </Boton>
        )
      )}

      <Boton onPress={() => void salir()} style={{ marginTop: espacio.sm }}>
        Salir de la partida
      </Boton>

      {/*
        El enlace a la política no es un adorno legal: Apple exige (5.1.1(i))
        que sea accesible DESDE DENTRO de la app, no solo en la ficha de la
        tienda. Y este es su sitio natural: la pantalla donde se decide qué se
        guarda y qué se borra.
      */}
      <Pressable
        onPress={() => void Linking.openURL(api.urlDePrivacidad())}
        hitSlop={10}
        accessibilityRole="link"
        style={{ alignSelf: 'center', marginTop: espacio.lg, paddingVertical: espacio.sm }}
      >
        <Etiqueta style={{ color: 'rgba(217,201,163,0.6)' }}>Política de privacidad</Etiqueta>
      </Pressable>
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

/** Una casilla de la vitrina. Misma forma que las de siempre, con su juego. */
function Vitrina({
  trofeo,
  ganado,
  orden,
}: {
  trofeo: TrofeoInfo;
  ganado: boolean;
  orden: number;
}): JSX.Element {
  const t = useTema();
  return (
    <Animated.View
      entering={FadeInUp.delay(50 * orden).duration(400)}
      style={[
        estilos.trofeo,
        /*
         * El fondo de la casilla apagada era `rgba(11,23,16,0.4)`: el fieltro
         * verde de CLUEDO, cosido en el `StyleSheet` de modulo. En la vitrina de
         * la Momia salian once recuadros verdosos sobre arena.
         */
        ganado
          ? { borderColor: conAlfa(t.oro500, 0.55), backgroundColor: conAlfa(t.oro500, 0.1) }
          : { borderColor: conAlfa(t.oro500, 0.16), backgroundColor: conAlfa(t.feltoscuro, 0.4) },
      ]}
    >
      <Cuerpo style={{ fontSize: 26, opacity: ganado ? 1 : 0.25 }}>{trofeo.glifo}</Cuerpo>
      <Etiqueta
        style={{
          color: ganado ? t.oro300 : conAlfa(t.pergaminoTenue, 0.35),
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {trofeo.nombre}
      </Etiqueta>
      <Cuerpo
        tenue
        style={{ fontSize: 13, textAlign: 'center', marginTop: 2, opacity: ganado ? 1 : 0.5 }}
      >
        {trofeo.descripcion}
      </Cuerpo>
    </Animated.View>
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
  medallas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: espacio.sm },
  insignia: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});
