/**
 * Entrada: la puerta de la mansión.
 *
 * Dos códigos y dentro. Ninguna contraseña, ningún correo de verificación,
 * ningún registro: con doce personas esperando a cenar, cada paso de más es
 * alguien que se rinde y se pone a mirar el móvil por su cuenta.
 */
import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as api from '../src/api';
import { usePartida } from '../src/estado';
import {
  Boton,
  Cuerpo,
  Error as AvisoError,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Sello,
  Titulo,
  color,
  espacio,
  radio,
  texto,
} from '../src/ui';

export default function Entrada(): JSX.Element {
  const { vista, refrescar } = usePartida();
  const [codigo, setCodigo] = useState('');
  const [personal, setPersonal] = useState('');
  const [servidor, setServidor] = useState('');
  const [verServidor, setVerServidor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [listo, setListo] = useState(false);

  // La credencial ya la carga el proveedor; aquí solo se lee la dirección del
  // servidor para poder mostrarla y editarla.
  useEffect(() => {
    void (async () => {
      const { servidor: guardado } = await api.cargarSesionGuardada();
      setServidor(guardado);
      setListo(true);
    })();
  }, []);

  useEffect(() => {
    if (vista) router.replace('/(juego)/ronda');
  }, [vista]);

  const entrar = async (): Promise<void> => {
    Keyboard.dismiss();
    setError(null);
    setEntrando(true);
    try {
      if (servidor.trim()) await api.fijarServidor(servidor);
      await api.entrar(codigo, personal);
      await refrescar();
      router.replace('/(juego)/ronda');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo entrar.');
    } finally {
      setEntrando(false);
    }
  };

  return (
    <Pantalla barra={false}>
      <Animated.View entering={FadeInDown.duration(600)} style={estilos.cabecera}>
        <Sello>Juegos reales</Sello>
        <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>GameMasters</Titulo>
        <Cuerpo tenue style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 6 }}>
          Alguien de esta casa miente.
        </Cuerpo>
      </Animated.View>

      <Ornamento />

      <Animated.View entering={FadeInUp.delay(180).duration(600)}>
        <Marco>
          <Etiqueta>Código de la partida</Etiqueta>
          <Cuerpo tenue style={{ fontSize: 15, marginTop: 2, marginBottom: espacio.sm }}>
            Lo dicta en voz alta quien dirige la velada.
          </Cuerpo>
          <TextInput
            value={codigo}
            onChangeText={(t) => setCodigo(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            placeholder="—————"
            placeholderTextColor="rgba(217,201,163,0.3)"
            style={[estilos.campo, estilos.campoCodigo]}
          />

          <View style={{ height: espacio.lg }} />

          <Etiqueta>Tu código personal</Etiqueta>
          <Cuerpo tenue style={{ fontSize: 15, marginTop: 2, marginBottom: espacio.sm }}>
            Te lo entrega solo a ti. No se lo enseñes a nadie.
          </Cuerpo>
          <TextInput
            value={personal}
            onChangeText={(t) => setPersonal(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            placeholder="——————"
            placeholderTextColor="rgba(217,201,163,0.3)"
            style={[estilos.campo, estilos.campoCodigo]}
          />

          <View style={{ height: espacio.lg }} />
          <AvisoError>{error}</AvisoError>

          <Boton
            variante="primario"
            onPress={() => void entrar()}
            disabled={!listo || codigo.length < 4 || personal.length < 4}
            cargando={entrando}
          >
            Entrar en la partida
          </Boton>
        </Marco>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(320).duration(600)}>
        {verServidor ? (
          <Marco>
            <Etiqueta>Servidor</Etiqueta>
            <Cuerpo tenue style={{ fontSize: 15, marginTop: 2, marginBottom: espacio.sm }}>
              Solo si quien organiza te ha dado una dirección distinta.
            </Cuerpo>
            <TextInput
              value={servidor}
              onChangeText={setServidor}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="https://…"
              placeholderTextColor="rgba(217,201,163,0.3)"
              style={estilos.campo}
            />
          </Marco>
        ) : (
          <Boton onPress={() => setVerServidor(true)} style={{ marginTop: espacio.sm }}>
            Cambiar de servidor
          </Boton>
        )}
      </Animated.View>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  cabecera: { alignItems: 'center', paddingTop: espacio.xxl },
  campo: {
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.4)',
    borderRadius: radio.md,
    backgroundColor: 'rgba(11,23,16,0.6)',
    color: color.pergamino,
    paddingVertical: 14,
    paddingHorizontal: espacio.md,
    ...texto.cuerpo,
  },
  campoCodigo: {
    fontFamily: 'Cinzel_700Bold',
    fontSize: 26,
    letterSpacing: 8,
    textAlign: 'center',
  },
});
