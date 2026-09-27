/**
 * LA BARRA DE CARGA DE LA NOCHE: encima del documento de El Quiebro mientras carga, en el teléfono y en `/jugar`.
 *
 * ═══ POR QUÉ UNA BARRA, Y POR QUÉ SIN PLAZO ═══
 *
 * Encargo de Miguel del 27-sep, tras ver en su teléfono el menú del Quiebro aparecer y cerrarse a los 25 s
 * («el documento de la noche no se ha puesto en marcha en 25 s»): «lo ideal tanto en web como en la app sería
 * que apareciera una barra de carga para ver el progreso […] en la app no debería terminar a los 25 s ni en un
 * periodo de tiempo concreto, el usuario esperará y si vemos que se demora mucho, 3 minutos, en la pantalla
 * debería aparecer algún mensaje». Así que:
 *
 *   · La barra dice el porcentaje y qué se está cargando, con lo que CUENTA EL DOCUMENTO (`carga`): la página,
 *     el código byte a byte, la mesa, la ciudad, los personajes, los gráficos. Antes de que hable, lo que el
 *     WebView sabe de la página (`onLoadProgress`).
 *   · Se quita con `jugable`, no con `listo`: `listo` ya sale del guion de arranque, al leer la página.
 *   · A los tres minutos (`AVISO_DE_TARDANZA_MS`) —o en cuanto el documento dice que algo ha FALLADO al
 *     arrancar— sale el aviso con la razón probable (`razonProbable`) y tres salidas: seguir esperando,
 *     reintentar (una superficie nueva) o jugar sobre el plano del barrio. Ninguna la toma la app sola.
 *
 * Los colores son los de la casa de El Quiebro (`escritorio/src/quiebro/hud/hud.css`): la barra tapa su
 * documento, y lo que se ve al quitarla es su noche, no la Sala.
 *
 * Qué significa cada suceso es de `quiebro-puente.ts` (`cargaTras`), puro y comprobado en Node; esto sólo pinta.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NOMBRES_DEL_QUIEBRO } from '../../../shared/arcade/juegos/quiebro-nombres';
import { razonProbable } from './quiebro-puente';
import type { CargaDeLaNoche } from './quiebro-puente';

/** La casa de El Quiebro, copiada de `hud.css` (Metro no ve `escritorio/`). */
const NOCHE = {
  suelo: '#020605',
  neon: '#FFE3F2',
  halo: 'rgba(255, 63, 164, 0.75)',
  codigo: '#3FF2C2',
  carril: 'rgba(63, 242, 194, 0.14)',
  filo: 'rgba(63, 242, 194, 0.28)',
  texto: '#EEF7F3',
  tenue: 'rgba(222, 240, 232, 0.62)',
  ambar: '#FFD28A',
  ambarFilo: 'rgba(255, 171, 64, 0.55)',
  ambarFondo: 'rgba(255, 171, 64, 0.12)',
  rojo: '#FF4D6D',
} as const;

export interface PropsDeLaCarga {
  readonly carga: CargaDeLaNoche;
  /** Seguir esperando: se quita el aviso y se vuelven a contar tres minutos. */
  readonly alSeguir: () => void;
  /** Una superficie nueva, con su documento. */
  readonly alReintentar: () => void;
  /** Dejar la noche y jugar sobre el plano del barrio. */
  readonly alPlano: () => void;
}

function Boton({ rotulo, ayuda, alPulsar }: { readonly rotulo: string; readonly ayuda: string; readonly alPulsar: () => void }): JSX.Element {
  return (
    <Pressable onPress={alPulsar} style={({ pressed }) => [estilos.boton, pressed ? estilos.botonPulsado : null]} accessibilityRole="button" accessibilityLabel={rotulo} accessibilityHint={ayuda}>
      <Text style={estilos.botonRotulo}>{rotulo}</Text>
    </Pressable>
  );
}

export function LaCargaDeLaNoche({ carga, alSeguir, alReintentar, alPlano }: PropsDeLaCarga): JSX.Element {
  const cien = Math.floor(carga.fraccion * 100);
  return (
    <View style={estilos.velo} accessibilityRole="progressbar" accessibilityLabel={`Cargando ${NOMBRES_DEL_QUIEBRO.juego.nombre}`} accessibilityValue={{ min: 0, max: 100, now: cien }}>
      <Text style={estilos.nombre}>{NOMBRES_DEL_QUIEBRO.juego.nombre.toUpperCase()}</Text>
      <View style={estilos.carril}>
        <View style={[estilos.barra, { width: `${Math.round(carga.fraccion * 1000) / 10}%` as `${number}%` }]} />
      </View>
      <Text style={estilos.cifra}>{`${String(cien)} %`}</Text>
      <Text style={estilos.que} numberOfLines={1}>{`Cargando ${carga.que}…`}</Text>
      {carga.fallo !== null && carga.aviso === null ? (
        <Text style={estilos.fallo} numberOfLines={2}>{`Ha fallado algo al arrancar: ${carga.fallo}`}</Text>
      ) : null}
      {carga.aviso !== null ? (
        <View style={estilos.aviso}>
          <Text style={estilos.titulo}>{carga.aviso === 'fallo' ? 'Algo ha fallado al abrir la noche' : 'Está tardando más de lo normal…'}</Text>
          <Text style={estilos.razon} numberOfLines={3}>{razonProbable(carga)}</Text>
          <View style={estilos.botones}>
            <Boton rotulo="Seguir esperando" ayuda="Sigue cargando la noche; si vuelve a tardar, se dirá otra vez" alPulsar={alSeguir} />
            <Boton rotulo="Reintentar" ayuda="Vuelve a abrir la noche desde el principio" alPulsar={alReintentar} />
            <Boton rotulo="Jugar sobre el plano" ayuda="Deja la noche en tres dimensiones y juega sobre el plano del barrio" alPulsar={alPlano} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  /* Encima del documento entero: lo que haya debajo no se toca hasta que se pueda jugar. */
  velo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: NOCHE.suelo,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nombre: {
    color: NOCHE.neon,
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: 8,
    marginBottom: 14,
    textShadowColor: NOCHE.halo,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  carril: {
    width: '72%',
    maxWidth: 420,
    height: 6,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: NOCHE.filo,
    backgroundColor: NOCHE.carril,
    overflow: 'hidden',
  },
  barra: { height: '100%', backgroundColor: NOCHE.codigo },
  cifra: { color: NOCHE.codigo, fontSize: 20, fontWeight: '600', marginTop: 10, fontVariant: ['tabular-nums'] },
  que: { color: NOCHE.tenue, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginTop: 6, maxWidth: '92%' },
  fallo: { color: NOCHE.rojo, fontSize: 13, marginTop: 8, maxWidth: 560, textAlign: 'center' },
  aviso: { marginTop: 14, maxWidth: 620, alignItems: 'center' },
  titulo: { color: NOCHE.ambar, fontSize: 16, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  razon: { color: NOCHE.texto, fontSize: 13, lineHeight: 18, marginTop: 4, textAlign: 'center' },
  botones: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 10, gap: 10 },
  boton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: NOCHE.ambarFilo,
    backgroundColor: NOCHE.ambarFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPulsado: { opacity: 0.7 },
  botonRotulo: { color: NOCHE.ambar, fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
});
