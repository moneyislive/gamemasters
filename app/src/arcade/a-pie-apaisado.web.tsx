/**
 * A PIE, EL TELÉFONO DE LADO, EN `/jugar`: la mitad del navegador de `a-pie-apaisado.tsx`.
 *
 * El navegador sólo deja bloquear la orientación a pantalla completa (Chrome de Android sí; el iPhone,
 * no). Así que al bajar a andar con el dedo en un teléfono de pie se pide la pantalla completa y el
 * bloqueo (`escenas/paseo/apaisado.ts`, lo mismo que la Sala), y si no se deja, sale el aviso «Gira el
 * teléfono», como el de El Quiebro pero SIN atrapar: «Seguir de pie» lo quita, y se va solo al girar.
 * En un ordenador (`aparato-tactil.web.ts`) no se pide nada.
 */
import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GIRA_EL_TELEFONO, hayQueGirar, pedirDeLado, POR_QUE_GIRARLO, SEGUIR_DE_PIE, soltarElLado } from '../../../escenas/paseo/apaisado';
import { conAlfa } from '../tema';
import { usarAparatoTactil } from './aparato-tactil';
import { LETRA, RADIO, SALA } from './muebles';

export function usarAPieApaisado(aPie: boolean): JSX.Element | null {
  const tactil = usarAparatoTactil();
  const ventana = useWindowDimensions();
  const [seguirDePie, ponerSeguirDePie] = useState(false);
  const puso = useRef(false);
  const activo = aPie && tactil;
  useEffect(() => {
    if (!activo) return undefined;
    let vivo = true;
    if (typeof window !== 'undefined' && hayQueGirar(window.innerWidth, window.innerHeight, true)) {
      void pedirDeLado().then((r) => {
        if (vivo) puso.current = r.pusoLaPantallaCompleta;
        else soltarElLado(r.pusoLaPantallaCompleta);
      });
    }
    return () => {
      vivo = false;
      soltarElLado(puso.current);
      puso.current = false;
      ponerSeguirDePie(false);
    };
  }, [activo]);
  if (!activo || seguirDePie || !hayQueGirar(ventana.width, ventana.height, tactil)) return null;
  return (
    <View style={estilos.velo} accessibilityViewIsModal={false}>
      <View style={estilos.tarjeta}>
        <View style={estilos.telefono} />
        <Text style={estilos.titulo} accessibilityRole="header">
          {GIRA_EL_TELEFONO}
        </Text>
        <Text style={estilos.porque}>{POR_QUE_GIRARLO}</Text>
        <Pressable style={estilos.seguir} accessibilityRole="button" onPress={() => ponerSeguirDePie(true)}>
          <Text style={estilos.seguirTexto}>{SEGUIR_DE_PIE}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  velo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(8, 10, 14, 0.55)',
  },
  tarjeta: {
    maxWidth: 320,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.3),
    backgroundColor: SALA.teja,
  },
  /* El teléfono ya tumbado: dice hacia dónde, sin animación que cueste un hilo. */
  telefono: { width: 58, height: 34, borderRadius: 7, borderWidth: 2, borderColor: SALA.acento },
  titulo: { ...LETRA.rotuloChico, color: SALA.blanco, fontSize: 18, textAlign: 'center' },
  porque: { color: conAlfa(SALA.blanco, 0.75), fontSize: 13, textAlign: 'center' },
  seguir: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: RADIO.mando,
    borderWidth: 1,
    borderColor: conAlfa(SALA.blanco, 0.4),
  },
  seguirTexto: { ...LETRA.rotuloChico, color: SALA.blanco, fontSize: 13 },
});
