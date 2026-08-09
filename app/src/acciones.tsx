/**
 * Lo que se puede hacer ahora mismo, pintado sin saber a qué se juega.
 *
 * El servidor manda en `vista.acciones` el repertorio disponible —ya filtrado
 * por la fase, por si te toca y por las veces que ya lo has hecho— con las
 * opciones de cada campo resueltas. Esta pantalla las recorre.
 *
 * POR QUÉ NO SUSTITUYE A LA LISTA DE SALAS. La elección de sala de CLUEDO tiene
 * su propia interfaz, con foto, cuánta gente hay dentro y el plano tocable, y
 * eso es mejor que cualquier renderizador general. Así que aquí se pintan las
 * acciones que NO tienen pantalla propia: es lo que permite que un juego nuevo
 * sea jugable el primer día, y que después pueda ganarse una interfaz a medida
 * si le merece la pena.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as api from './api';
import {
  Boton,
  Cuerpo,
  Error as AvisoError,
  Etiqueta,
  Marco,
  Seccion,
  color,
  espacio,
  radio,
} from './ui';
import type { VistaJugador } from '../../shared/live';

type Accion = VistaJugador['acciones'][number];

export function PanelDeAcciones({
  acciones,
  alHacer,
}: {
  acciones: Accion[];
  /** Se llama con la vista nueva para que la pantalla se refresque. */
  alHacer: (vista: VistaJugador) => void;
}): JSX.Element | null {
  const [elegido, setElegido] = useState<Record<string, Record<string, string>>>({});
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (acciones.length === 0) return null;

  const hacer = async (accion: Accion): Promise<void> => {
    const datos = elegido[accion.id] ?? {};
    if (accion.campos.some((c) => !datos[c.campo])) {
      setError('Te falta elegir algo.');
      return;
    }
    setError(null);
    setEnviando(accion.id);
    try {
      const r = await api.hacerAccion(accion.id, datos);
      alHacer(r.vista);
      setElegido((e) => ({ ...e, [accion.id]: {} }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo hacer eso.');
    } finally {
      setEnviando(null);
    }
  };

  return (
    <View style={{ marginTop: espacio.lg }}>
      <Seccion>Puedes</Seccion>
      <AvisoError>{error}</AvisoError>

      {acciones.map((accion) => (
        <Marco key={accion.id}>
          <Etiqueta>{accion.rotulo}</Etiqueta>

          {accion.campos.map((campo) => (
            <View key={campo.campo} style={{ marginTop: espacio.md }}>
              <Cuerpo tenue style={{ fontSize: 15 }}>
                {campo.rotulo}
              </Cuerpo>
              <View style={estilos.opciones}>
                {campo.opciones.map((o) => {
                  const activo = elegido[accion.id]?.[campo.campo] === o.id;
                  return (
                    <Pressable
                      key={o.id}
                      accessibilityRole="button"
                      accessibilityState={activo ? { selected: true } : {}}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setElegido((e) => ({
                          ...e,
                          [accion.id]: { ...(e[accion.id] ?? {}), [campo.campo]: o.id },
                        }));
                      }}
                      style={({ pressed }) => [
                        estilos.opcion,
                        activo && estilos.opcionActiva,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Cuerpo
                        style={{
                          fontSize: 16,
                          color: activo ? color.caoba900 : color.pergamino,
                        }}
                      >
                        {o.nombre}
                      </Cuerpo>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Boton
            variante="primario"
            cargando={enviando === accion.id}
            onPress={() => void hacer(accion)}
            style={{ marginTop: espacio.lg }}
          >
            {accion.rotulo}
          </Boton>
        </Marco>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.sm },
  opcion: {
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.32)',
    backgroundColor: 'rgba(31,18,12,0.5)',
    borderRadius: radio.md,
    paddingVertical: 9,
    paddingHorizontal: espacio.md,
  },
  opcionActiva: { backgroundColor: color.oro400, borderColor: color.oro300 },
});
