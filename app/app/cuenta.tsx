/**
 * Tu cuenta, fuera de ninguna partida.
 *
 * POR QUÉ EXISTE ESTA PANTALLA APARTE de la de perfil. Aquella vive dentro de
 * las pestañas de una velada, así que solo se alcanza estando invitado a algo.
 * Eso convertía el derecho a borrar tus datos en un trámite que dependía de que
 * alguien te invitara — y las dos tiendas piden que la cuenta se pueda borrar
 * desde la app, sin condiciones.
 *
 * Aquí está lo que es TUYO y sobrevive a las veladas: tu rango, tus trofeos, la
 * crónica de lo jugado, tu avatar, y las dos salidas —cerrar sesión y borrarlo
 * todo—, que son cosas distintas y por eso están separadas.
 */
import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as api from '../src/api';
import { Pulsable } from '../src/vivo';
import { cargarAvatar, guardarAvatar, AVATAR_POR_DEFECTO } from '../src/avatar';
import { TROFEOS } from '../../shared/live';
import { color, espacio, fuente, radio } from '../src/tema';
import { SinProveedor, disponibles, entrarConApple, entrarConGoogle } from '../src/entrar-con';
import type { Proveedores } from '../src/entrar-con';

/** Los mismos rangos que pinta la portada: una sola escalera para todo. */
const RANGOS: Array<{ desde: number; titulo: string }> = [
  { desde: 0, titulo: 'Recién llegado' },
  { desde: 1, titulo: 'Invitado habitual' },
  { desde: 3, titulo: 'Sabueso de salón' },
  { desde: 6, titulo: 'Maestro de ceremonias' },
  { desde: 10, titulo: 'Leyenda de la mesa' },
];

function rangoDe(jugadas: number): string {
  let titulo = RANGOS[0]!.titulo;
  for (const r of RANGOS) if (jugadas >= r.desde) titulo = r.titulo;
  return titulo;
}

export default function Cuenta(): JSX.Element {
  /**
   * El sobre de una invitación, cuando se ha llegado por
   * `harkania.com/i/<sobre>` y todavía no hay cuenta con la que verla.
   *
   * NO SE ABRE NI SE CANJEA AQUÍ: viaja firmado y solo el servidor sabe leerlo,
   * y un enlace que llega por correo lo reenvía cualquiera. Se usa únicamente
   * como señal de POR QUÉ has llegado, para que esta pantalla no parezca una
   * cuenta cualquiera cuando en realidad vienes de un sobre con tu nombre. Sin
   * esto, el desvío entregaba el parámetro a una pantalla que lo tiraba, y
   * quien pulsaba la invitación aterrizaba en un sitio que no la mencionaba.
   */
  const { invitacion } = useLocalSearchParams<{ invitacion?: string }>();
  const [portada, setPortada] = useState<api.Portada | null>(null);
  const [vistaAvatar, setVistaAvatar] = useState<string | undefined>();
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [borrada, setBorrada] = useState(false);
  const [fallo, setFallo] = useState(false);
  /*
   * `null` mientras se pregunta. Los tres casos —preguntando, servidor
   * inalcanzable, y respuesta buena— se cuentan distinto: dar por hecho «no hay
   * proveedores» mientras aún no ha contestado nadie enseña durante un segundo
   * un mensaje que puede ser falso.
   */
  const [proveedores, setProveedores] = useState<Proveedores | null>(null);
  const [entrando, setEntrando] = useState<'google' | 'apple' | null>(null);
  const [avisoProveedor, setAvisoProveedor] = useState<string | null>(null);

  const cargar = useCallback(() => {
    void cargarAvatar().then((a) => setVistaAvatar(a.vistaPrevia));
    if (!api.hayCuenta()) {
      setPortada(null);
      return;
    }
    api
      .pedirPortada()
      .then(setPortada)
      .catch(() => setFallo(true));
  }, []);

  useEffect(cargar, [cargar]);
  useFocusEffect(cargar);

  const preguntarProveedores = useCallback(() => {
    setProveedores(null);
    void disponibles().then(setProveedores);
  }, []);
  useEffect(preguntarProveedores, [preguntarProveedores]);

  /** Entrar con un proveedor. Cancelar no es un error y no dice nada. */
  const entrarCon = useCallback(
    (cual: 'google' | 'apple') => {
      void (async () => {
        setEntrando(cual);
        setAvisoProveedor(null);
        try {
          await (cual === 'google' ? entrarConGoogle() : entrarConApple());
          cargar();
        } catch (e) {
          setAvisoProveedor(
            e instanceof SinProveedor
              ? e.message
              : e instanceof Error
                ? e.message
                : 'No se pudo completar la entrada.',
          );
        } finally {
          setEntrando(null);
        }
      })();
    },
    [cargar],
  );

  /*
   * Cerrar esta pantalla, incluso cuando debajo no hay nada.
   *
   * Aquí se llega también desde `harkania.com/i/<sobre>`, y ese desvío entra
   * con `replace`: la pila queda con una sola pantalla y `router.back()` no
   * hace nada. Al ser además una pantalla modal, quien llega por el enlace de
   * una invitación se quedaba encerrado en ella sin más salida que matar la app.
   */
  const cerrar = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  const cerrarSesion = useCallback(async () => {
    await api.cerrarSesionDeCuenta();
    router.replace('/');
  }, []);

  const borrarTodo = useCallback(async () => {
    setBorrando(true);
    try {
      await api.borrarCuentaDeLaPlataforma();
      // El avatar es tuyo y vive en este aparato: se va con lo demás.
      await guardarAvatar(AVATAR_POR_DEFECTO);
      await api.cerrarSesionDeCuenta();
      setBorrada(true);
      setConfirmando(false);
    } catch {
      setFallo(true);
    } finally {
      setBorrando(false);
    }
  }, []);

  const jugadas = portada?.cuenta.partidas ?? [];
  const trofeos = portada?.cuenta.trofeos ?? [];

  return (
    <View style={estilos.raiz}>
      <LinearGradient colors={['#1a0b12', '#0c0508']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View style={estilos.cabecera}>
          <Text style={estilos.rotulo}>TU CUENTA</Text>
          <Pressable
            onPress={cerrar}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={estilos.cerrar}
          >
            <Text style={{ color: color.oro300, fontSize: 17 }}>✕</Text>
          </Pressable>
        </View>

        {borrada ? (
          <Animated.View entering={FadeIn.duration(400)} style={estilos.marco}>
            <Text style={estilos.titulo}>Se ha ido todo</Text>
            <Text style={estilos.parrafo}>
              Tu cuenta, tu historial, tus trofeos y tu avatar ya no están. Tu correo se ha
              retirado de todas las partidas donde estuviera apuntado. Puedes seguir jugando con
              códigos cuando quieras.
            </Text>
            <Pulsable onPress={() => router.replace('/')}>
              <View style={estilos.botonHumo}>
                <Text style={estilos.botonHumoTexto}>VOLVER A LA PORTADA</Text>
              </View>
            </Pulsable>
          </Animated.View>
        ) : !portada ? (
          /* Sin cuenta: se explica qué es y para qué sirve, sin muro de texto. */
          <Animated.View entering={FadeInUp.duration(500)}>
            <Text style={estilos.titulo}>
              {invitacion ? 'Te han invitado a una velada' : 'Todavía no tienes cuenta'}
            </Text>
            <Text style={estilos.parrafo}>
              {invitacion
                ? 'Tu invitación está guardada a nombre de un correo. Entra con ese mismo correo y te aparecerá en la portada, sin tener que pedirle el código a nadie.'
                : 'Con una cuenta se guardan tus veladas, tus trofeos y tu rango, y las invitaciones te aparecen en la portada sin tener que pedirle el código a nadie.'}
            </Text>
            {proveedores?.estado === 'listo' && (proveedores.google || proveedores.apple) ? (
              <View style={{ marginTop: espacio.lg }}>
                {proveedores.estado === 'listo' && proveedores.google && (
                  <Pulsable onPress={() => entrarCon('google')}>
                    <View style={estilos.botonProveedor}>
                      <Text style={estilos.botonProveedorTexto}>
                        {entrando === 'google' ? 'ABRIENDO…' : 'CONTINUAR CON GOOGLE'}
                      </Text>
                    </View>
                  </Pulsable>
                )}
                {/*
                  Apple se ofrece SOLO en iOS: el diálogo nativo no existe en
                  Android ni en la web, y ofrecer un botón que no lleva a
                  ninguna parte es peor que no ofrecerlo.
                */}
                {proveedores.estado === 'listo' && proveedores.apple && Platform.OS === 'ios' && (
                  <Pulsable onPress={() => entrarCon('apple')}>
                    <View style={[estilos.botonProveedor, estilos.botonApple]}>
                      <Text style={[estilos.botonProveedorTexto, { color: '#0c0508' }]}>
                        {entrando === 'apple' ? 'ABRIENDO…' : ' CONTINUAR CON APPLE'}
                      </Text>
                    </View>
                  </Pulsable>
                )}
                {avisoProveedor && (
                  <Text style={[estilos.menudo, { color: '#e8a0a0' }]}>{avisoProveedor}</Text>
                )}
                <Text style={estilos.menudo}>
                  Entrar con una cuenta no hace falta para jugar: los códigos siguen funcionando
                  igual.
                </Text>
              </View>
            ) : proveedores === null ? (
              <View style={estilos.marco}>
                <Text style={estilos.parrafo}>Comprobando cómo se puede entrar…</Text>
              </View>
            ) : proveedores.estado === 'sin-servidor' ? (
              /*
               * NO SE DICE «no hay proveedores», porque no se sabe. Antes sí se
               * decía: el fallo de red se atrapaba y se devolvía «ninguno», así
               * que un servidor dormido o una dirección mal compilada se
               * disfrazaban de «esto no está configurado» y se buscaba el fallo
               * donde no estaba.
               */
              <View style={estilos.marco}>
                <Text style={estilos.subtitulo}>No se llega al servidor</Text>
                <Text style={estilos.parrafo}>
                  No se ha podido comprobar cómo entrar. Puede ser la conexión, o que el servidor
                  esté despertando — los primeros segundos tarda. Vuelve a intentarlo.
                </Text>
                <Pulsable onPress={preguntarProveedores}>
                  <View style={estilos.botonProveedor}>
                    <Text style={estilos.botonProveedorTexto}>REINTENTAR</Text>
                  </View>
                </Pulsable>
              </View>
            ) : (
              <View style={estilos.marco}>
                <Text style={estilos.subtitulo}>Cómo se consigue hoy</Text>
                <Text style={estilos.parrafo}>
                  Juega una velada y, en «Tu perfil», acepta guardar tus partidas. Entrar con
                  Google o con Apple llegará en cuanto quien administra el servidor lo configure.
                </Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <>
            {/* ---- Quién eres ---- */}
            <Animated.View entering={FadeInUp.duration(500)} style={estilos.filaIdentidad}>
              {vistaAvatar ? (
                <Image source={{ uri: vistaAvatar }} style={estilos.retrato} resizeMode="cover" />
              ) : (
                <View style={[estilos.retrato, estilos.retratoVacio]}>
                  <Text style={{ fontSize: 26, color: color.oro400 }}>✦</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={estilos.nombre}>{portada.cuenta.displayName}</Text>
                <Text style={estilos.menudo}>{portada.cuenta.email}</Text>
                <Text style={estilos.rango}>{rangoDe(jugadas.length)}</Text>
              </View>
            </Animated.View>

            <Pulsable onPress={() => router.push('/avatar')}>
              <View style={estilos.botonHumo}>
                <Text style={estilos.botonHumoTexto}>
                  {vistaAvatar ? 'CAMBIAR MI AVATAR' : 'FORJAR MI AVATAR'}
                </Text>
              </View>
            </Pulsable>

            {/* ---- Trofeos ---- */}
            <Text style={estilos.subtitulo}>Trofeos</Text>
            <View style={estilos.estante}>
              {TROFEOS.map((t) => {
                const ganado = trofeos.includes(t.id);
                return (
                  <View
                    key={t.id}
                    style={[estilos.trofeo, ganado ? estilos.trofeoGanado : estilos.trofeoVacio]}
                  >
                    <Text style={{ fontSize: 20, opacity: ganado ? 1 : 0.18 }}>{t.glifo}</Text>
                    <Text
                      style={[
                        estilos.trofeoNombre,
                        { color: ganado ? color.oro300 : 'rgba(217,201,163,0.3)' },
                      ]}
                      numberOfLines={1}
                    >
                      {t.nombre}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* ---- La crónica ---- */}
            <Text style={estilos.subtitulo}>Tus veladas</Text>
            {jugadas.length === 0 ? (
              <View style={estilos.marco}>
                <Text style={estilos.menudo}>Todavía ninguna terminada. La próxima será.</Text>
              </View>
            ) : (
              [...jugadas].reverse().map((p) => (
                <View key={p.gameId} style={estilos.velada}>
                  <Text style={estilos.veladaTitulo}>{p.titulo}</Text>
                  <Text style={estilos.menudo}>Interpretaste a {p.personaje}</Text>
                  <View style={estilos.medallas}>
                    {p.gano && <Insignia texto="Ganaste" tono={color.oro300} />}
                    {!p.gano && p.acerto && <Insignia texto="Acertaste" tono={color.oro400} />}
                    {p.eraCulpable && <Insignia texto="Eras el culpable" tono="#e8a0a0" />}
                  </View>
                </View>
              ))
            )}

            {fallo && (
              <Text style={[estilos.menudo, { color: '#e8a0a0' }]}>
                Algo ha fallado al hablar con el servidor. Puede ser cosa de la conexión.
              </Text>
            )}

            {/* ---- Las dos salidas, separadas a propósito ---- */}
            <View style={estilos.separador} />

            <Pulsable onPress={() => void cerrarSesion()}>
              <View style={estilos.botonHumo}>
                <Text style={estilos.botonHumoTexto}>CERRAR SESIÓN</Text>
              </View>
            </Pulsable>
            <Text style={estilos.menudo}>
              Solo cierra la sesión en este aparato. Tus veladas y tus trofeos siguen ahí.
            </Text>

            {confirmando ? (
              <View style={[estilos.marco, estilos.marcoPeligro]}>
                <Text style={estilos.parrafo}>
                  Se borrará tu cuenta ({portada.cuenta.email}), tu historial, tus trofeos y tu
                  avatar, y tu correo se quitará de todas las partidas. No se puede deshacer.
                </Text>
                <Pulsable onPress={() => void borrarTodo()}>
                  <View style={[estilos.botonPeligro, borrando && { opacity: 0.5 }]}>
                    <Text style={estilos.botonPeligroTexto}>
                      {borrando ? 'BORRANDO…' : 'SÍ, BÓRRALO TODO'}
                    </Text>
                  </View>
                </Pulsable>
                <Pressable onPress={() => setConfirmando(false)} style={{ paddingVertical: 10 }}>
                  <Text style={estilos.enlace}>Mejor no</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmando(true)} style={{ paddingVertical: 12 }}>
                <Text style={estilos.enlacePeligro}>Borrar mi cuenta y todos mis datos</Text>
              </Pressable>
            )}
          </>
        )}

        <Pressable
          onPress={() => void Linking.openURL(api.urlDePrivacidad())}
          hitSlop={10}
          accessibilityRole="link"
          style={{ alignSelf: 'center', marginTop: espacio.xl, paddingVertical: espacio.md }}
        >
          <Text style={estilos.privacidad}>POLÍTICA DE PRIVACIDAD</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Insignia({ texto, tono }: { texto: string; tono: string }): JSX.Element {
  return (
    <View style={[estilos.insignia, { borderColor: tono }]}>
      <Text style={[estilos.insigniaTexto, { color: tono }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#0c0508' },
  contenido: { padding: espacio.lg, paddingBottom: espacio.xxl },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: espacio.lg,
  },
  rotulo: { fontFamily: fuente.titulo, fontSize: 12, letterSpacing: 2.6, color: 'rgba(232,207,127,0.75)' },
  cerrar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.35)',
    backgroundColor: 'rgba(5,13,9,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  titulo: { fontFamily: fuente.display, fontSize: 26, lineHeight: 33, color: color.pergamino },
  subtitulo: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 2.2,
    color: color.oro300,
    marginTop: espacio.xl,
    marginBottom: espacio.sm,
  },
  parrafo: {
    fontFamily: fuente.cuerpo,
    fontSize: 16.5,
    lineHeight: 24,
    color: color.pergaminoTenue,
    marginTop: espacio.sm,
  },
  menudo: {
    fontFamily: fuente.cuerpo,
    fontSize: 14.5,
    lineHeight: 20,
    color: color.pergaminoTenue,
    opacity: 0.65,
    marginTop: 4,
  },

  filaIdentidad: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  retrato: {
    width: 76,
    height: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.45)',
  },
  retratoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  nombre: { fontFamily: fuente.display, fontSize: 23, color: color.pergamino },
  rango: { fontFamily: fuente.titulo, fontSize: 13, letterSpacing: 1.2, color: color.oro300, marginTop: 4 },

  marco: {
    marginTop: espacio.md,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.3)',
    backgroundColor: 'rgba(31,18,12,0.55)',
    padding: espacio.lg,
  },
  marcoPeligro: { borderColor: 'rgba(232,160,160,0.5)' },

  estante: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  trofeo: {
    width: '31%',
    alignItems: 'center',
    borderRadius: radio.md,
    borderWidth: 1,
    paddingVertical: espacio.md,
    paddingHorizontal: 4,
  },
  trofeoGanado: { borderColor: 'rgba(232,207,127,0.55)', backgroundColor: 'rgba(201,162,39,0.12)' },
  trofeoVacio: { borderColor: 'rgba(201,162,39,0.14)', backgroundColor: 'rgba(11,23,16,0.45)' },
  trofeoNombre: { fontFamily: fuente.titulo, fontSize: 10, letterSpacing: 0.6, marginTop: 4 },

  velada: {
    marginTop: espacio.sm,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.22)',
    padding: espacio.md,
  },
  veladaTitulo: { fontFamily: fuente.titulo, fontSize: 16.5, color: color.pergamino },
  medallas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: espacio.sm },
  insignia: { borderWidth: 1, borderRadius: radio.redondo, paddingHorizontal: 9, paddingVertical: 3 },
  insigniaTexto: { fontFamily: fuente.titulo, fontSize: 10.5, letterSpacing: 0.8 },

  separador: {
    height: 1,
    backgroundColor: 'rgba(201,162,39,0.22)',
    marginTop: espacio.xl,
    marginBottom: espacio.lg,
  },
  botonProveedor: {
    borderRadius: radio.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: espacio.sm,
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.55)',
    backgroundColor: 'rgba(232,207,127,0.08)',
  },
  botonApple: { backgroundColor: '#f1e5c9', borderColor: '#f1e5c9' },
  botonProveedorTexto: {
    fontFamily: fuente.titulo,
    fontSize: 13,
    letterSpacing: 1.4,
    color: color.oro300,
  },
  botonHumo: {
    borderRadius: radio.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: espacio.md,
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.5)',
  },
  botonHumoTexto: { fontFamily: fuente.titulo, fontSize: 12.5, letterSpacing: 1.6, color: color.oro300 },
  botonPeligro: {
    borderRadius: radio.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: espacio.md,
    backgroundColor: '#8c2337',
  },
  botonPeligroTexto: { fontFamily: fuente.titulo, fontSize: 12.5, letterSpacing: 1.6, color: '#f0c9c0' },
  enlace: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 1.2,
    color: color.oro300,
    textAlign: 'center',
  },
  enlacePeligro: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 1.2,
    color: 'rgba(232,160,160,0.85)',
    textAlign: 'center',
  },
  privacidad: {
    fontFamily: fuente.titulo,
    fontSize: 10.5,
    letterSpacing: 2,
    color: 'rgba(217,201,163,0.4)',
  },
});
