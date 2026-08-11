/**
 * El estudio del avatar: de una foto tuya a tu personaje 3D.
 *
 * EL FLUJO, en cuatro actos que la pantalla cuenta tal cual:
 *
 *   1. ELEGIR. Una foto de la galería (o hecha al momento). Vale un retrato
 *      tuyo, un dibujo, un personaje que te guste: el generador esculpe lo que
 *      le des.
 *   2. ESCULPIR. La imagen viaja a tu servidor y de ahí al taller de esculpido
 *      (Tripo). Tarda un par de minutos; la pantalla cuenta el progreso por
 *      etapas y se puede dejar en segundo plano.
 *   3. VER. Cuando termina llega una vista previa renderizada.
 *   4. USAR. Un toque y el modelo pasa a ser TU avatar en la portada.
 *
 * SI EL SERVICIO NO ESTÁ CONECTADO se dice a la primera, con lo que falta y
 * dónde se consigue — nunca un error críptico tras subir la foto.
 *
 * PRIVACIDAD, dicho aquí porque es donde se decide: la foto va a tu servidor de
 * juego y de ahí al servicio de esculpido, solo para generar el modelo. El
 * enlace del modelo resultante se guarda en este dispositivo.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as api from '../src/api';
import { Pulsable } from '../src/vivo';
import { cargarAvatar, guardarAvatar } from '../src/avatar';
import { color, espacio, fuente, radio } from '../src/tema';

type Acto =
  | { paso: 'cargando' }
  | { paso: 'sin-servicio' }
  | { paso: 'elegir' }
  | { paso: 'subiendo' }
  | { paso: 'esculpiendo'; tarea: string; progreso: number }
  | { paso: 'listo'; modeloUrl: string; vistaPrevia?: string }
  | { paso: 'fallo'; motivo: string };

/** Lo que se le cuenta a quien espera, según por dónde va el esculpido. */
function rotuloDeProgreso(progreso: number): string {
  if (progreso < 15) return 'Estudiando tu imagen…';
  if (progreso < 45) return 'Esculpiendo la forma…';
  if (progreso < 80) return 'Pintando las texturas…';
  return 'Puliendo los detalles…';
}

export default function EstudioDeAvatar(): JSX.Element {
  const [acto, setActo] = useState<Acto>({ paso: 'cargando' });
  const [actual, setActual] = useState<string | undefined>(undefined);
  const sondeo = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ¿Está conectado el taller de esculpido? Se pregunta, no se adivina.
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const avatar = await cargarAvatar();
      if (vivo) setActual(avatar.vistaPrevia);
      try {
        const r = await api.generacionDisponible();
        if (vivo) setActo(r.avatares ? { paso: 'elegir' } : { paso: 'sin-servicio' });
      } catch {
        if (vivo) setActo({ paso: 'sin-servicio' });
      }
    })();
    return () => {
      vivo = false;
      if (sondeo.current) clearTimeout(sondeo.current);
    };
  }, []);

  /** El bucle de sondeo: cada tres segundos hasta que el modelo esté. */
  const sondear = useCallback((tarea: string) => {
    void (async () => {
      try {
        const estado = await api.estadoAvatar3D(tarea);
        if (estado.estado === 'listo' && estado.modeloUrl) {
          setActo({ paso: 'listo', modeloUrl: estado.modeloUrl, vistaPrevia: estado.vistaPrevia });
          return;
        }
        if (estado.estado === 'fallo') {
          setActo({ paso: 'fallo', motivo: estado.detalle ?? 'El esculpido no pudo terminar.' });
          return;
        }
        setActo({ paso: 'esculpiendo', tarea, progreso: estado.progreso });
        sondeo.current = setTimeout(() => sondear(tarea), 3000);
      } catch (e) {
        // Un tropiezo de red no tira el trabajo: se reintenta con más calma.
        sondeo.current = setTimeout(() => sondear(tarea), 6000);
      }
    })();
  }, []);

  const elegirImagen = useCallback(async () => {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      base64: true,
      // Cuadrada: es lo que mejor digiere el esculpido de un solo sujeto.
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled) return;
    const foto = resultado.assets[0];
    if (!foto?.base64) {
      setActo({ paso: 'fallo', motivo: 'No se pudo leer la imagen elegida.' });
      return;
    }
    setActo({ paso: 'subiendo' });
    try {
      const { tarea } = await api.generarAvatar3D(foto.base64, foto.mimeType ?? 'image/jpeg');
      setActo({ paso: 'esculpiendo', tarea, progreso: 0 });
      sondear(tarea);
    } catch (e) {
      setActo({
        paso: 'fallo',
        motivo: e instanceof Error ? e.message : 'No se pudo empezar el esculpido.',
      });
    }
  }, [sondear]);

  const usarModelo = useCallback(async (modeloUrl: string, vistaPrevia?: string) => {
    const avatar = await cargarAvatar();
    await guardarAvatar({ ...avatar, modeloUrl, vistaPrevia });
    router.back();
  }, []);

  return (
    <View style={estilos.raiz}>
      <LinearGradient colors={['#1a0b12', '#0c0508']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <View style={estilos.cabecera}>
          <Text style={estilos.rotulo}>EL ESTUDIO</Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={estilos.cerrar}
          >
            <Text style={{ color: color.oro300, fontSize: 17 }}>✕</Text>
          </Pressable>
        </View>

        <Text style={estilos.titulo}>Tu avatar, esculpido desde una foto</Text>
        <Text style={estilos.parrafo}>
          Elige una imagen —un retrato tuyo, un dibujo, el personaje que quieras ser— y el estudio
          la convierte en tu figura 3D con texturas, la que te representa en cada sala.
        </Text>

        {actual && acto.paso !== 'listo' && (
          <View style={estilos.actual}>
            <Image source={{ uri: actual }} style={estilos.actualImagen} resizeMode="cover" />
            <Text style={estilos.menudo}>Tu avatar de ahora</Text>
          </View>
        )}

        {/* ---- Los actos ---- */}
        {acto.paso === 'cargando' && (
          <View style={estilos.marco}>
            <Text style={estilos.parrafo}>Abriendo el estudio…</Text>
          </View>
        )}

        {acto.paso === 'sin-servicio' && (
          <Animated.View entering={FadeIn.duration(400)} style={[estilos.marco, estilos.aviso]}>
            <Text style={estilos.avisoTitulo}>El taller de esculpido no está conectado</Text>
            <Text style={estilos.parrafo}>
              Para generar avatares, quien administra el servidor tiene que añadir una clave de
              Tripo (tripo3d.ai → API) como TRIPO_API_KEY. En cuanto esté, este botón cobra vida:
              no hay que actualizar la app.
            </Text>
          </Animated.View>
        )}

        {acto.paso === 'elegir' && (
          <Animated.View entering={FadeInUp.duration(500)}>
            <Pulsable onPress={() => void elegirImagen()}>
              <LinearGradient
                colors={['#e0b83a', '#b8901e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={estilos.botonOro}
              >
                <Text style={estilos.botonOroTexto}>ELEGIR UNA FOTO</Text>
              </LinearGradient>
            </Pulsable>
            <Text style={estilos.menudo}>
              La foto va a tu servidor y de ahí al servicio de esculpido, solo para generar el
              modelo. Mejor un retrato con el sujeto centrado y fondo simple.
            </Text>
          </Animated.View>
        )}

        {acto.paso === 'subiendo' && (
          <View style={estilos.marco}>
            <Text style={estilos.esculpiendoTitulo}>Enviando tu imagen…</Text>
            <BarraViva progreso={8} />
          </View>
        )}

        {acto.paso === 'esculpiendo' && (
          <Animated.View entering={FadeIn.duration(300)} style={estilos.marco}>
            <Text style={estilos.esculpiendoTitulo}>{rotuloDeProgreso(acto.progreso)}</Text>
            <BarraViva progreso={Math.max(acto.progreso, 4)} />
            <Text style={estilos.menudo}>
              Esto tarda un par de minutos. Puedes volver a la partida: el trabajo sigue solo.
            </Text>
          </Animated.View>
        )}

        {acto.paso === 'listo' && (
          <Animated.View entering={FadeInUp.duration(500)} style={estilos.marco}>
            {acto.vistaPrevia ? (
              <Image
                source={{ uri: acto.vistaPrevia }}
                style={estilos.vistaPrevia}
                resizeMode="contain"
              />
            ) : (
              <Text style={estilos.esculpiendoTitulo}>Tu figura está lista.</Text>
            )}
            <Pulsable onPress={() => void usarModelo(acto.modeloUrl, acto.vistaPrevia)}>
              <LinearGradient
                colors={['#e0b83a', '#b8901e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={estilos.botonOro}
              >
                <Text style={estilos.botonOroTexto}>USAR ESTE AVATAR</Text>
              </LinearGradient>
            </Pulsable>
            <Pressable onPress={() => setActo({ paso: 'elegir' })} style={{ marginTop: espacio.sm }}>
              <Text style={estilos.enlace}>Probar con otra foto</Text>
            </Pressable>
          </Animated.View>
        )}

        {acto.paso === 'fallo' && (
          <Animated.View entering={FadeIn.duration(300)} style={[estilos.marco, estilos.aviso]}>
            <Text style={estilos.avisoTitulo}>No ha podido ser</Text>
            <Text style={estilos.parrafo}>{acto.motivo}</Text>
            <Pulsable onPress={() => setActo({ paso: 'elegir' })}>
              <View style={estilos.botonHumo}>
                <Text style={estilos.botonHumoTexto}>VOLVER A INTENTARLO</Text>
              </View>
            </Pulsable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

/** Una barra de progreso con vida: relleno dorado y brillo en la punta. */
function BarraViva({ progreso }: { progreso: number }): JSX.Element {
  return (
    <View style={estilos.barraFondo}>
      <View style={[estilos.barraRelleno, { width: `${Math.min(progreso, 100)}%` }]}>
        <LinearGradient
          colors={['#b8901e', '#e8cf7f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, borderRadius: radio.redondo }}
        />
      </View>
      <Text style={estilos.barraTexto}>{Math.round(Math.min(progreso, 100))}%</Text>
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
  rotulo: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 2.6,
    color: 'rgba(232,207,127,0.75)',
  },
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
  titulo: {
    fontFamily: fuente.display,
    fontSize: 27,
    lineHeight: 34,
    color: color.pergamino,
  },
  parrafo: {
    fontFamily: fuente.cuerpo,
    fontSize: 16.5,
    lineHeight: 24,
    color: color.pergaminoTenue,
    marginTop: espacio.sm,
  },
  actual: { alignItems: 'center', marginTop: espacio.lg },
  actualImagen: {
    width: 128,
    height: 128,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
  },
  marco: {
    marginTop: espacio.lg,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.3)',
    backgroundColor: 'rgba(31,18,12,0.55)',
    padding: espacio.lg,
  },
  aviso: { borderColor: 'rgba(232,160,74,0.45)' },
  avisoTitulo: { fontFamily: fuente.titulo, fontSize: 16.5, color: '#e8a04a' },
  botonOro: {
    borderRadius: radio.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: espacio.lg,
  },
  botonOroTexto: {
    fontFamily: fuente.titulo,
    fontSize: 13.5,
    letterSpacing: 1.8,
    color: color.caoba900,
  },
  botonHumo: {
    borderRadius: radio.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: espacio.md,
    borderWidth: 1,
    borderColor: 'rgba(232,207,127,0.5)',
  },
  botonHumoTexto: {
    fontFamily: fuente.titulo,
    fontSize: 12.5,
    letterSpacing: 1.6,
    color: color.oro300,
  },
  esculpiendoTitulo: { fontFamily: fuente.titulo, fontSize: 17, color: color.pergamino },
  vistaPrevia: {
    width: '100%',
    height: 300,
    borderRadius: radio.md,
    backgroundColor: '#12060a',
  },
  enlace: {
    fontFamily: fuente.titulo,
    fontSize: 12,
    letterSpacing: 1.2,
    color: color.oro300,
    textAlign: 'center',
    paddingVertical: 8,
  },
  barraFondo: {
    height: 22,
    borderRadius: radio.redondo,
    backgroundColor: 'rgba(201,162,39,0.14)',
    overflow: 'hidden',
    marginTop: espacio.md,
    justifyContent: 'center',
  },
  barraRelleno: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  barraTexto: {
    fontFamily: fuente.titulo,
    fontSize: 11,
    color: color.pergamino,
    textAlign: 'center',
    letterSpacing: 1,
  },
  menudo: {
    fontFamily: fuente.cuerpo,
    fontSize: 14.5,
    lineHeight: 20,
    color: color.pergaminoTenue,
    opacity: 0.65,
    marginTop: espacio.sm,
    textAlign: 'center',
  },
});
