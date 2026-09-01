/**
 * EL MUEBLE `tablero`, entero y sin saber a qué se juega.
 *
 * ═══ ESTA PANTALLA NO ES LA DE RIBERAS, Y ESO ES LA MITAD DE LA FASE 4 ═══
 *
 * Aquí no aparece la palabra «choza», ni «vereda», ni «hexágono», ni «trueque».
 * Lo que hace es: sentarse a una mesa del arcade que pida la ruta, sondear,
 * sacar el tablero declarado de la vista y dárselo al `Retablo`, que pinta
 * polígonos, líneas, nudos y botones. El movimiento que manda cada pieza viene
 * dentro de la pieza.
 *
 * Cualquier arcade con `mueble: 'tablero'` y `sede: 'servidor'` que proyecte un
 * `tablero` dentro de su vista se pinta con esto, incluido uno que viniera de
 * fuera del binario por el enchufe de la fase 5 — que es la condición que el §7
 * pone para llamar genérico a un mueble.
 *
 * ═══ Y CUANDO LA VISTA NO TRAE TABLERO, SE DICE ═══
 *
 * En vez de quedarse en blanco. Es la regla de la portada aplicada aquí: nada de
 * lo que se enseña es mentira, y una pantalla vacía es una forma educada de
 * mentir. El caso real que cubre es una app más vieja que el servidor, o un
 * arcade que declara el mueble y proyecta otra cosa.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
import { tableroConLosNombres, tableroDeLaVista } from '../../../shared/mecanicas/tablero-declarado';
import { usarMesaDeArcade } from './mesa';
import { SALA } from './muebles';
import { Retablo } from './retablo';

/** Pinta el arcade de tablero que pida la ruta. */
export function ElTableroEnLinea(): JSX.Element {
  const { arcade } = useLocalSearchParams<{ arcade?: string }>();
  const id = typeof arcade === 'string' ? arcade : '';
  const manifiesto = manifiestoDeArcadeSiExiste(id);
  const mesa = usarMesaDeArcade(id);
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState('');

  /*
   * ═══ QUIÉN ES QUIÉN, Y POR QUÉ LO PONE ESTA PANTALLA Y NO EL JUEGO ═══
   *
   * Los nombres son de la MESA, no de las reglas: un asiento es «un sitio en la
   * mesa, anónimo y efímero» (§5.7) y quien reparte sitios es la autoridad. El
   * juego escribe huecos con el identificador dentro y aquí se rellenan con lo que
   * ya viene en `mesa.asientos` — lo mismo que pinta la barra de arriba.
   *
   * Y esto NO le enseña a este mueble a qué se juega: «asiento» es vocabulario de
   * plataforma y está en el glosario del §1 bis. Sigue sin saber qué es una choza.
   */
  const nombres = useMemo(() => {
    const tabla = new Map<string, string>();
    for (const a of mesa.mesa?.asientos ?? []) tabla.set(a.id, a.nombre);
    return tabla;
  }, [mesa.mesa?.asientos]);

  if (mesa.fase === 'yendo') {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={SALA.neon} />
        <Text style={estilos.texto}>Hablando con la mesa…</Text>
      </View>
    );
  }

  if (mesa.fase === 'fuera' || mesa.mesa === null) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>{manifiesto?.nombre ?? id}</Text>
        <Text style={estilos.texto}>{manifiesto?.gancho ?? ''}</Text>
        <TextInput
          style={estilos.campo}
          placeholder="Tu nombre en la mesa"
          placeholderTextColor={SALA.neonTenue}
          value={nombre}
          onChangeText={ponerNombre}
          maxLength={24}
        />
        <Pressable
          style={estilos.boton}
          disabled={mesa.quieto || nombre.trim().length === 0}
          onPress={() => mesa.abrir(nombre.trim())}
        >
          <Text style={estilos.botonRotulo}>Abrir una mesa</Text>
        </Pressable>
        <Text style={estilos.o}>o entra con el código que te hayan dicho</Text>
        <TextInput
          style={estilos.campo}
          placeholder="CÓDIGO"
          placeholderTextColor={SALA.neonTenue}
          value={codigo}
          onChangeText={ponerCodigo}
          autoCapitalize="characters"
          maxLength={8}
        />
        <Pressable
          style={estilos.boton}
          disabled={mesa.quieto || nombre.trim().length === 0 || codigo.trim().length === 0}
          onPress={() => mesa.entrar(codigo, nombre.trim())}
        >
          <Text style={estilos.botonRotulo}>Sentarse</Text>
        </Pressable>
        {mesa.aviso.length > 0 ? <Text style={estilos.fallo}>{mesa.aviso}</Text> : null}
      </View>
    );
  }

  const tablero = tableroDeLaVista(mesa.mesa.vista);
  if (tablero === null) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>{manifiesto?.nombre ?? id}</Text>
        <Text style={estilos.texto}>
          Esta mesa está abierta y lo que manda no trae tablero, así que no hay nada que pintar
          aquí. Suele significar que esta versión de la app es más vieja que el servidor.
        </Text>
        <Pressable style={estilos.boton} onPress={mesa.salir}>
          <Text style={estilos.botonRotulo}>Salir de la mesa</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={estilos.todo}>
      <View style={estilos.barra}>
        <View style={estilos.barraFila}>
          <Text style={estilos.codigo}>Mesa {mesa.mesa.codigo}</Text>
          {/*
            SALIR TIENE QUE ESTAR AQUÍ Y NO SÓLO EN LA PANTALLA DE ERROR.

            Antes el único «Salir de la mesa» vivía en la rama de «esta vista no
            trae tablero», o sea que desde una partida en marcha no había ninguna
            forma de irse: ni para cambiar de juego, ni para dejarle el sitio a
            otro, ni para entrar con otro código. Salir no abandona la partida —el
            asiento sigue siendo tuyo y se recupera volviendo a entrar con el
            código—, sólo cierra esta pantalla.
          */}
          <Pressable onPress={mesa.salir} style={estilos.salir}>
            <Text style={estilos.salirRotulo}>Salir</Text>
          </Pressable>
        </View>
        <Text style={estilos.gente}>
          {mesa.mesa.asientos.map((a) => `${a.nombre}${a.presente ? '' : ' (fuera)'}`).join(' · ')}
        </Text>
      </View>
      {mesa.aviso.length > 0 ? <Text style={estilos.fallo}>{mesa.aviso}</Text> : null}
      <Retablo
        tablero={tableroConLosNombres(tablero, nombres)}
        alTocar={mesa.mover}
        quieto={mesa.quieto}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  todo: { flex: 1, backgroundColor: SALA.fondo },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
    backgroundColor: SALA.fondo,
  },
  titulo: { color: SALA.neon, fontSize: 20, fontWeight: '800', letterSpacing: 3 },
  texto: { color: SALA.palabra, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
  o: { color: SALA.neonTenue, fontSize: 13, marginTop: 8 },
  campo: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: SALA.panel,
    color: SALA.palabra,
    borderColor: SALA.neonTenue,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  boton: {
    backgroundColor: SALA.panel,
    borderColor: SALA.neon,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  botonRotulo: { color: SALA.palabra, fontSize: 15, fontWeight: '700' },
  barra: { paddingHorizontal: 16, paddingTop: 14, gap: 2 },
  barraFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codigo: { color: SALA.neon, fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  /* 44 de alto: el mismo mínimo de dedo que el retablo aplica a sus figuras. */
  salir: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderColor: SALA.neonTenue,
    borderWidth: 1,
    borderRadius: 8,
  },
  salirRotulo: { color: SALA.neonTenue, fontSize: 13, fontWeight: '700' },
  gente: { color: SALA.neonTenue, fontSize: 12 },
  fallo: { color: SALA.fallo, fontSize: 13, paddingHorizontal: 16, textAlign: 'center' },
});
