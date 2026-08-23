/**
 * El sello de cuenta de la portada: quién eres, de un vistazo y a un toque.
 *
 * EL PROBLEMA QUE RESUELVE. Iniciar sesión vivía al final de la portada, dentro
 * de la sección «Tu leyenda», detrás de un enlace que decía «Saber más». Para
 * encontrarlo había que bajar por todo el catálogo de juegos sin ningún motivo
 * para sospechar que estaba allí: parecía escondido porque, a efectos
 * prácticos, lo estaba. Y lo que hay detrás no es un extra — es lo que hace que
 * tus veladas, tus trofeos y tus invitaciones sobrevivan al teléfono.
 *
 * DÓNDE VA Y POR QUÉ CON ESTA FORMA. En la botonera de arriba, junto a «Código»
 * y «Crear», que es el sitio donde la gente ya busca las acciones. Pero NO como
 * un tercer botón fantasma: esos son verbos, y esto es una persona. Por eso es
 * un disco con tu propia figura dentro y un anillo que cambia de color según
 * estés dentro o fuera — se lee como «tú» y no como «otra cosa que pulsar».
 *
 * ES UNA HOJA Y NO UN DESPLEGABLE. En un móvil, un menú colgando de una esquina
 * queda pegado al borde y se toca mal con el pulgar; la hoja sube desde abajo,
 * que es donde está la mano.
 */
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as api from './api';
import { Figura } from './figura';
import { SinProveedor, disponibles, entrarConApple, entrarConGoogle } from './entrar-con';
import type { Proveedores } from './entrar-con';
import type { Avatar } from './avatar';
import { Pulsable } from './vivo';

const ORO = '#e8cf7f';
const ORO_TENUE = 'rgba(232,207,127,0.35)';

/** Cómo se llama cada proveedor cuando hay que escribirlo en un botón. */
const NOMBRES: Record<string, string> = { google: 'Google', apple: 'Apple' };

export function SelloDeCuenta({
  avatar,
  nombre,
  correo,
  onCambio,
}: {
  avatar: Avatar;
  /** El nombre de la cuenta, o `null` si no hay sesión. */
  nombre: string | null;
  correo: string | null;
  /** Se llama al entrar o al salir, para que la portada se rehaga. */
  onCambio: () => void;
}): JSX.Element {
  const [abierto, setAbierto] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedores | null>(null);
  const [entrando, setEntrando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const dentro = Boolean(nombre);

  /*
   * Se pregunta al ABRIR y no al montar la portada. Preguntar al montar cuesta
   * una llamada en cada arranque para algo que la mayoría de las veces nadie va
   * a mirar, y encima se queda vieja: si el servidor estaba dormido, la
   * respuesta de hace diez minutos diría que no hay proveedores.
   */
  const preguntar = useCallback(() => {
    setProveedores(null);
    void disponibles().then(setProveedores);
  }, []);

  useEffect(() => {
    if (abierto) preguntar();
  }, [abierto, preguntar]);

  const entrarCon = useCallback(
    async (cual: 'google' | 'apple'): Promise<void> => {
      setEntrando(cual);
      setAviso(null);
      try {
        await (cual === 'google' ? entrarConGoogle() : entrarConApple());
        onCambio();
        setAbierto(false);
      } catch (e) {
        // Cancelar no es un error y no dice nada; lo demás sí se cuenta.
        setAviso(
          e instanceof SinProveedor
            ? e.message
            : e instanceof Error
              ? e.message
              : 'No se pudo entrar.',
        );
      } finally {
        setEntrando(null);
      }
    },
    [onCambio],
  );

  const salir = useCallback(async (): Promise<void> => {
    await api.cerrarSesionDeCuenta();
    onCambio();
    setAbierto(false);
  }, [onCambio]);

  /*
   * QUÉ SE OFRECE, Y NO ES LA MISMA PREGUNTA PARA CADA UNO:
   *
   *   · Google pasa por el NAVEGADOR también en la app —abre una página del
   *     servidor, porque Google no admite esquemas propios— así que necesita
   *     que esa ruta exista: se mira `navegador`.
   *   · Apple en iPhone usa el DIÁLOGO NATIVO del sistema: no necesita ninguna
   *     ruta, le basta con estar configurado. Fuera de iOS no se ofrece, porque
   *     ahí haría falta el flujo web que todavía no existe.
   */
  const listo = proveedores?.estado === 'listo' ? proveedores : null;
  const ofrecidos: string[] = listo
    ? [
        ...(listo.navegador ?? []).filter((p) => p !== 'apple'),
        ...(listo.apple && Platform.OS === 'ios' ? ['apple'] : []),
      ]
    : [];

  return (
    <>
      <View style={{ alignItems: 'center' }}>
        <Pulsable
          onPress={() => setAbierto(true)}
          accessibilityLabel={dentro ? `Tu cuenta: ${nombre}` : 'Iniciar sesión'}
        >
          <View style={[estilos.disco, dentro && estilos.discoDentro]}>
            <Figura avatar={avatar} tamano={38} conFondo={false} />
            {/*
              El punto de estado. Es lo que hace que el sello INFORME y no solo
              abra: sin él, estar dentro y estar fuera se ven exactamente igual,
              y habría que abrir la hoja para saberlo.
            */}
            <View style={[estilos.punto, dentro ? estilos.puntoDentro : estilos.puntoFuera]} />
          </View>
        </Pulsable>
        <Text style={estilos.etiqueta} numberOfLines={1}>
          {dentro ? (nombre ?? '').split(' ')[0]?.toUpperCase() : 'ENTRAR'}
        </Text>
      </View>

      <Modal
        visible={abierto}
        transparent
        animationType="fade"
        onRequestClose={() => setAbierto(false)}
      >
        {/* El velo cierra al tocarlo: en una hoja es lo que todo el mundo intenta. */}
        <Pressable style={estilos.velo} onPress={() => setAbierto(false)}>
          <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }} />
        </Pressable>

        <Animated.View entering={FadeInUp.duration(260)} style={estilos.hoja}>
          <View style={estilos.asa} />

          <View style={estilos.ficha}>
            <View style={estilos.retrato}>
              <Figura avatar={avatar} tamano={56} conFondo={false} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={estilos.nombre} numberOfLines={1}>
                {dentro ? nombre : 'Sin cuenta'}
              </Text>
              <Text style={estilos.correo} numberOfLines={1}>
                {dentro ? (correo ?? '') : 'Tu progreso vive solo en este teléfono'}
              </Text>
            </View>
          </View>

          <View style={estilos.filete} />

          {dentro ? (
            <>
              <Fila
                texto="Tu leyenda, trofeos y crónica"
                onPress={() => {
                  setAbierto(false);
                  router.push('/cuenta');
                }}
              />
              <Fila texto="Cerrar sesión" peligro onPress={() => void salir()} />
            </>
          ) : (
            <>
              <Text style={estilos.parrafo}>
                Con una cuenta se guardan tus veladas, tus trofeos y tu rango, y las invitaciones
                te aparecen aquí sin tener que pedirle el código a nadie.
              </Text>

              {proveedores === null && <Text style={estilos.menudo}>Comprobando…</Text>}

              {proveedores?.estado === 'sin-servidor' && (
                <View>
                  <Text style={estilos.menudo}>
                    No se llega al servidor. Puede ser la conexión, o que esté despertando.
                  </Text>
                  <Fila texto="Reintentar" onPress={preguntar} />
                </View>
              )}

              {ofrecidos.map((p) => (
                <Pulsable key={p} onPress={() => void entrarCon(p as 'google' | 'apple')}>
                  <View style={estilos.botonProveedor}>
                    <Text style={estilos.botonProveedorTexto}>
                      {entrando === p ? 'ABRIENDO…' : `CONTINUAR CON ${(NOMBRES[p] ?? p).toUpperCase()}`}
                    </Text>
                  </View>
                </Pulsable>
              ))}

              {listo && ofrecidos.length === 0 && (
                <Text style={estilos.menudo}>
                  Este servidor todavía no ofrece iniciar sesión. Los códigos de partida siguen
                  funcionando igual.
                </Text>
              )}

              {aviso && <Text style={[estilos.menudo, { color: '#e8a0a0' }]}>{aviso}</Text>}

              <Text style={estilos.menudo}>
                Entrar no hace falta para jugar: con tu código entras igual.
              </Text>
            </>
          )}
        </Animated.View>
      </Modal>
    </>
  );
}

function Fila({
  texto,
  onPress,
  peligro,
}: {
  texto: string;
  onPress: () => void;
  peligro?: boolean;
}): JSX.Element {
  return (
    <Pulsable onPress={onPress}>
      <View style={estilos.fila}>
        <Text style={[estilos.filaTexto, peligro && { color: '#e8a0a0' }]}>{texto}</Text>
        <Text style={estilos.filaFlecha}>›</Text>
      </View>
    </Pulsable>
  );
}

const estilos = StyleSheet.create({
  disco: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: ORO_TENUE,
    backgroundColor: 'rgba(5,13,9,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /* Dentro, el anillo se enciende: el estado se ve sin abrir nada. */
  discoDentro: { borderColor: ORO },
  punto: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#050d09',
  },
  puntoDentro: { backgroundColor: '#4fbf7b' },
  puntoFuera: { backgroundColor: 'rgba(232,207,127,0.45)' },
  etiqueta: {
    marginTop: 4,
    fontSize: 9,
    letterSpacing: 1.1,
    color: 'rgba(232,207,127,0.75)',
    maxWidth: 62,
    textAlign: 'center',
  },

  velo: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.62)' },
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#0c1a12',
    borderTopWidth: 1,
    borderColor: 'rgba(232,207,127,0.28)',
  },
  asa: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(232,207,127,0.3)',
    marginBottom: 16,
  },

  ficha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  retrato: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: ORO_TENUE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  nombre: { fontSize: 18, color: ORO, letterSpacing: 0.3 },
  correo: { fontSize: 13, color: '#d9c9a3', opacity: 0.7, marginTop: 2 },

  filete: {
    height: 1,
    marginVertical: 14,
    backgroundColor: 'rgba(232,207,127,0.18)',
  },

  parrafo: { fontSize: 14.5, lineHeight: 21, color: '#d9c9a3', marginBottom: 14 },
  menudo: { fontSize: 12.5, lineHeight: 18, color: '#d9c9a3', opacity: 0.66, marginTop: 10 },

  botonProveedor: {
    borderWidth: 1,
    borderColor: ORO,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(232,207,127,0.08)',
  },
  botonProveedorTexto: { fontSize: 12.5, letterSpacing: 1.2, color: ORO },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  filaTexto: { fontSize: 15, color: '#f0e6cd' },
  filaFlecha: { fontSize: 20, color: 'rgba(232,207,127,0.55)' },
});
