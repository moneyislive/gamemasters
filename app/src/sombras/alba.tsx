/**
 * El alba: cómo acabó la noche.
 *
 * ES LA ÚNICA PANTALLA POR LA QUE SALE LA SENDA VERDADERA, y por eso está
 * escrita al revés que las demás: aquí no se esconde nada, se cuenta todo y se
 * cuenta bien. Lo primero que hay que leer es si se llegó a la barca; después,
 * quién cobraba de Akechi; y al final, la cuenta de por qué se anduvo lo que se
 * anduvo.
 *
 * POR QUÉ NO VALE EL DESENLACE GENÉRICO. El de la plataforma está escrito para
 * CLUEDO: abre un sobre, dice quién ganó por haber acertado antes y ordena a la
 * mesa por aciertos. Aquí no gana una persona, gana un BANDO; se puede perder
 * habiendo acertado la senda —si el rastro llegó al tope— y el señalamiento no
 * decide quién gana sino cuánto pesó cada voto. Contar eso con la pantalla de
 * otro juego no es un adorno mal puesto: es contar otra partida.
 */
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { usePartida } from '../estado';
import {
  Boton,
  Cargando,
  Cuerpo,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Seccion,
  Sello,
  Titulo,
  espacio,
  radio,
  texto,
} from '../ui';
import { conAlfa } from '../tema-juego';
import { COLOR_SOMBRAS as C, SOMBRAS as S } from '../tema-sombras';
import { BarraDelRastro, TarjetaHito } from './piezas';
import { leerEstadoSombras } from './vista';

/** Los trofeos de este juego, dichos para leerlos en el móvil. */
const TROFEOS: Record<string, { nombre: string; glifo: string }> = {
  'paso-abierto': { nombre: 'El que abrió el paso', glifo: '✦' },
  'ojo-de-hanzo': { nombre: 'El ojo de Hanzō', glifo: '◎' },
  'sin-rastro': { nombre: 'Sin rastro', glifo: '◇' },
  'palabra-dada': { nombre: 'Palabra dada', glifo: '▣' },
  'sombra-de-akechi': { nombre: 'La sombra de Akechi', glifo: '✾' },
};

export function Alba(): JSX.Element {
  const { vista, cargando } = usePartida();

  if (cargando && !vista) {
    return (
      <Pantalla>
        <Cargando texto="Amanece…" />
      </Pantalla>
    );
  }
  const s = vista ? leerEstadoSombras(vista.estadoDelJuego) : null;
  if (!vista || !s?.desenlace) {
    return (
      <Pantalla>
        <Cargando texto="Todavía no ha amanecido." />
      </Pantalla>
    );
  }

  const d = s.desenlace;
  const yoGano = d.ganadores.includes(vista.yo.suspectId);
  const eresElKancho = d.kanchoId === vista.yo.suspectId;
  const nombreDe = (id: string) =>
    id === vista.yo.suspectId
      ? vista.yo.displayName
      : (vista.jugadores.find((j) => j.suspectId === id)?.displayName ?? 'alguien');
  const misTrofeos = d.trofeos[vista.yo.suspectId] ?? [];

  const titular = d.interceptada
    ? 'Os alcanzaron antes de llegar'
    : d.correcta
      ? 'El señor embarcó en Shirako'
      : 'Amaneció con la columna en el monte';

  return (
    <Pantalla>
      <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center' }}>
        <Sello>卯 · la hora de la Liebre</Sello>
        <Titulo style={{ textAlign: 'center', marginTop: espacio.lg, fontSize: 26 }}>
          {titular}
        </Titulo>
        <Cuerpo
          tenue
          style={{ textAlign: 'center', fontStyle: 'italic', marginTop: espacio.sm }}
        >
          {d.gana === 'columna'
            ? 'Gana la columna entera. Menos uno.'
            : 'Gana quien cobraba de Akechi.'}
        </Cuerpo>
        <Ornamento style={{ marginVertical: espacio.lg }} />
      </Animated.View>

      {/* ---- Tú ---- */}
      <Animated.View entering={FadeIn.duration(500).delay(200)}>
        <Marco tono={yoGano ? 'oscuro' : 'peligro'} style={{ marginBottom: espacio.md }}>
          <Etiqueta>{yoGano ? 'Tu noche' : 'Tu noche'}</Etiqueta>
          <Cuerpo style={{ marginTop: espacio.xs, fontSize: 18 }}>
            {eresElKancho
              ? d.gana === 'kancho'
                ? 'Cobrabas de Akechi, y amaneció sin barca. Cobra.'
                : 'Cobrabas de Akechi y la columna llegó igual. Devuelve la plata.'
              : yoGano
                ? 'Llegaste, y llegaste con los tuyos.'
                : 'No se llegó. Mañana lo contarás de otra manera.'}
          </Cuerpo>
          {misTrofeos.length > 0 && (
            <View style={estilos.trofeos}>
              {misTrofeos.map((id) => (
                <View key={id} style={estilos.trofeo}>
                  <Text style={{ color: C.oro300, fontSize: 20 }}>
                    {TROFEOS[id]?.glifo ?? '✦'}
                  </Text>
                  <Text style={[texto.microCaps, { color: C.pergaminoTenue, fontSize: 10, textAlign: 'center' }]}>
                    {TROFEOS[id]?.nombre ?? id}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Marco>
      </Animated.View>

      {/* ---- La senda ---- */}
      <Seccion>La senda que llevaba a la playa</Seccion>
      <Marco style={{ marginBottom: espacio.md }}>
        {d.sendaVerdadera.map((paso, i) => (
          <View key={paso.id} style={estilos.tramo}>
            <View style={[estilos.numero, { borderColor: S.bambu }]}>
              <Text style={{ color: S.bambu, fontSize: 14 }}>{i + 1}</Text>
            </View>
            <Text style={[texto.titulo, { color: C.pergamino, fontSize: 17, flex: 1 }]}>
              {paso.nombre}
            </Text>
          </View>
        ))}
      </Marco>

      <Seccion>La que se anduvo</Seccion>
      <Marco
        style={{
          marginBottom: espacio.md,
          borderColor: d.correcta ? conAlfa(S.bambu, 0.8) : conAlfa(C.burdeos600, 0.8),
        }}
      >
        {d.sendaAndada.length === 0 ? (
          <Cuerpo tenue>Nadie propuso un camino. La columna se quedó quieta.</Cuerpo>
        ) : (
          d.sendaAndada.map((paso, i) => {
            const bien = d.sendaVerdadera[i]?.id === paso.id;
            return (
              <View key={`${paso.id}-${i}`} style={estilos.tramo}>
                <View
                  style={[
                    estilos.numero,
                    { borderColor: bien ? S.bambu : C.burdeos600 },
                  ]}
                >
                  <Text style={{ color: bien ? S.bambu : C.burdeos600, fontSize: 14 }}>
                    {bien ? '✓' : '✕'}
                  </Text>
                </View>
                <Text style={[texto.titulo, { color: C.pergamino, fontSize: 17, flex: 1 }]}>
                  {paso.nombre}
                </Text>
              </View>
            );
          })
        )}
        {d.interceptada && (
          <Cuerpo style={{ marginTop: espacio.md, color: S.rastro }}>
            Y daba igual: el rastro había llegado al tope antes de echar a andar. Os estaban
            esperando.
          </Cuerpo>
        )}
      </Marco>

      <Marco style={{ marginBottom: espacio.md }}>
        <BarraDelRastro rastro={d.rastro} maximo={d.rastroMaximo} />
      </Marco>

      {/* ---- Quién cobraba ---- */}
      <Seccion>Quién cobraba de Akechi</Seccion>
      <Marco tono="peligro" style={{ marginBottom: espacio.md }}>
        <Titulo style={{ fontSize: 22 }}>{nombreDe(d.kanchoId)}</Titulo>
        <Cuerpo tenue style={{ marginTop: espacio.xs }}>
          {d.senalamientos.aciertos} de {d.senalamientos.total} señalamientos apuntaron bien.
          {d.desenmascarado
            ? ' La mesa lo vio: su voto no contó en el consejo.'
            : ' No hubo mayoría: su voto pesó como el de cualquiera.'}
        </Cuerpo>
        {vista.desenlace?.motive ? (
          <Cuerpo style={{ marginTop: espacio.md }}>{vista.desenlace.motive}</Cuerpo>
        ) : null}
      </Marco>

      {/* ---- El consejo ---- */}
      <Seccion>Cómo votó la mesa</Seccion>
      <Marco style={{ marginBottom: espacio.md }}>
        {d.votos.length === 0 ? (
          <Cuerpo tenue>No se entregó ninguna propuesta.</Cuerpo>
        ) : (
          d.votos.map((v, i) => (
            <View key={i} style={estilos.voto}>
              <View style={estilos.votoCabecera}>
                <Text style={[texto.etiqueta, { color: C.oro300, fontSize: 13 }]}>
                  peso {v.peso}
                </Text>
                <Text style={[texto.microCaps, { color: C.pergaminoTenue, fontSize: 11 }]}>
                  {v.apoyos.map(nombreDe).join(' · ')}
                </Text>
              </View>
              <Cuerpo style={{ fontSize: 15 }}>
                {v.senda.map((id) => s.pasos.find((p) => p.id === id)?.nombre ?? id).join('  →  ')}
              </Cuerpo>
            </View>
          ))
        )}
      </Marco>

      {/* ---- Los mojones, ahora con su verdad ---- */}
      {s.camino.length > 0 && (
        <>
          <Seccion>Lo que hubo sobre la mesa</Seccion>
          {s.camino.map((h) => (
            <TarjetaHito
              key={h.id}
              hito={h}
              nombreDePaso={(id) => s.pasos.find((p) => p.id === id)?.nombre ?? id}
            />
          ))}
        </>
      )}

      {/* ---- El relato ---- */}
      {vista.desenlace?.reconstruccion ? (
        <>
          <Ornamento />
          <Seccion>Qué pasó de verdad</Seccion>
          <Marco style={{ marginBottom: espacio.md }}>
            <Cuerpo>{vista.desenlace.reconstruccion}</Cuerpo>
          </Marco>
        </>
      ) : null}
      {vista.desenlace?.confesion ? (
        <Marco tono="peligro" style={{ marginBottom: espacio.md }}>
          <Etiqueta style={{ color: C.oro300 }}>La confesión</Etiqueta>
          <Cuerpo style={{ marginTop: espacio.xs, fontStyle: 'italic' }}>
            {vista.desenlace.confesion}
          </Cuerpo>
        </Marco>
      ) : null}
      {vista.desenlace?.epilogo ? (
        <Marco style={{ marginBottom: espacio.md }}>
          <Etiqueta>Lo que vino después</Etiqueta>
          <Cuerpo style={{ marginTop: espacio.xs }}>{vista.desenlace.epilogo}</Cuerpo>
        </Marco>
      ) : null}

      <Boton
        variante="primario"
        onPress={() => router.replace('/(juego)/perfil')}
        style={{ marginTop: espacio.lg }}
      >
        Ver mi vitrina
      </Boton>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  tramo: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, marginBottom: espacio.sm },
  numero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trofeos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.lg, marginTop: espacio.md },
  trofeo: { alignItems: 'center', width: 78, gap: 4 },
  voto: {
    borderTopWidth: 1,
    borderTopColor: conAlfa(C.laton, 0.25),
    paddingTop: espacio.sm,
    marginTop: espacio.sm,
  },
  votoCabecera: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});
