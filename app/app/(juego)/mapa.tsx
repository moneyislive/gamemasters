/**
 * El mapa: la planta de la casa, con la partida encima.
 *
 * El tablero que viene del servidor es solo geometría —qué salas hay y dónde
 * están— porque se genera desde la lista de salas y no sabe nada del caso. Todo
 * lo que hace útil a esta pantalla se pinta aquí encima, con lo que el jugador
 * ya tenía en su vista: dónde estoy, cuánta gente hay en cada sala y en cuáles
 * se encontró algo que ya es de dominio público.
 *
 * Y se puede tocar: con la ronda abierta, elegir sala desde el plano es mucho
 * más natural que buscarla en una lista. Es la misma llamada que hace la
 * pantalla de la ronda.
 */
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import {
  Cargando,
  Cuerpo,
  Error as AvisoError,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
} from '../../src/ui';
import type { BoardLayout } from '../../../shared/types';
import type { SalaVista } from '../../../shared/live';

/** Lado de celda en unidades del viewBox. El mismo que usa la web. */
const CELDA = 40;

/** Las dos caras del mismo sitio: la planta dibujada y la foto de verdad. */
type Cara = 'plano' | 'foto';

/** Medidas de la chincheta sobre la foto. Se usan para centrarla en su punto. */
const ANCHO_CHINCHETA = 150;
const ALTO_CABEZA = 34;

export default function Mapa(): JSX.Element {
  const { vista, aplicarVista } = usePartida();
  const { width } = useWindowDimensions();
  const [eligiendo, setEligiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Null mientras el jugador no elija: así manda lo que preparó quien dirige,
  // pero en cuanto toca una pestaña, manda él.
  const [elegida, setElegida] = useState<Cara | null>(null);

  if (!vista) return <Pantalla><Cargando texto="Desdoblando el plano…" /></Pantalla>;

  const { tablero, salas, miSala, sesion } = vista;
  const ancho = Math.max(240, width - espacio.lg * 2);
  const abierta = sesion.phase === 'ronda-abierta';

  // Una partida puede tener las dos caras: el plano trazado y la foto cenital
  // del sitio de verdad. Si están las dos, se puede pasar de una a otra.
  const hayPlano = (tablero?.plano?.rooms.length ?? 0) > 0;
  const hayFoto = Boolean(tablero?.imagenUrl);
  const porDefecto: Cara | null =
    tablero?.modo === 'aerial' && hayFoto ? 'foto' : hayPlano ? 'plano' : hayFoto ? 'foto' : null;
  const cara = (elegida && (elegida === 'foto' ? hayFoto : hayPlano) ? elegida : porDefecto);
  const conChincheta = salas.filter((s) => s.pin).length;

  // Salas de las que ya salió algo al tablón común. No es información nueva:
  // el jugador la tiene en la pestaña del tablón, aquí solo se ve de un vistazo.
  const conHallazgo = new Set(vista.tablon.map((p) => p.roomId));

  const elegir = async (salaId: string): Promise<void> => {
    if (!abierta || salaId === miSala || eligiendo) return;
    setError(null);
    setEligiendo(salaId);
    try {
      const r = await api.elegirSala(salaId);
      aplicarVista(r.vista);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo entrar en esa sala.');
    } finally {
      setEligiendo(null);
    }
  };

  return (
    <Pantalla>
      <View style={{ marginTop: espacio.md, marginBottom: espacio.lg }}>
        <Titulo style={{ fontSize: 24 }}>{cara === 'foto' ? 'La casa' : 'El plano'}</Titulo>
        <Cuerpo tenue>
          {abierta
            ? 'Toca una estancia para entrar en ella.'
            : cara === 'foto'
              ? 'El sitio de verdad, visto desde arriba.'
              : 'La planta de la casa y por dónde se comunica.'}
        </Cuerpo>
      </View>

      <AvisoError>{error}</AvisoError>

      {hayPlano && hayFoto && (
        <Alternador cara={cara} alCambiar={setElegida} />
      )}

      {!cara ? (
        <Marco>
          <Cuerpo tenue>
            Esta partida todavía no tiene plano. Quien la dirige puede trazarlo desde el taller, o
            subir una foto aérea del sitio y clavar una chincheta en cada estancia.
          </Cuerpo>
        </Marco>
      ) : cara === 'foto' ? (
        <PlanoAereo
          imagenUrl={tablero?.imagenUrl}
          salas={salas}
          miSala={miSala}
          conHallazgo={conHallazgo}
          ancho={ancho}
          alPulsar={elegir}
          activo={abierta}
        />
      ) : (
        <PlanoDibujado
          plano={tablero?.plano}
          salas={salas}
          miSala={miSala}
          conHallazgo={conHallazgo}
          ancho={ancho}
          alPulsar={elegir}
          activo={abierta}
        />
      )}

      {cara === 'foto' && conChincheta < salas.length && (
        <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15, marginTop: espacio.sm }}>
          {conChincheta === 0
            ? 'Sobre esta foto todavía no hay ninguna estancia señalada.'
            : `Sobre la foto hay ${conChincheta} de ${salas.length} estancias señaladas; las demás están en la lista de abajo.`}
        </Cuerpo>
      )}

      {cara && (
        <Leyenda
          cara={cara}
          hayPasadizos={(tablero?.plano?.passages.length ?? 0) > 0}
        />
      )}

      <Ornamento />

      <Seccion>Las estancias</Seccion>
      {salas.map((sala, i) => (
        <Animated.View key={sala.id} entering={FadeInUp.delay(40 * i).duration(360)}>
          <Pressable
            onPress={() => void elegir(sala.id)}
            disabled={!abierta || sala.id === miSala}
            style={({ pressed }) => [
              estilos.fila,
              sala.id === miSala && estilos.filaDentro,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 16 }}>
                {sala.name}
              </Cuerpo>
              <Cuerpo tenue style={{ fontSize: 15 }}>
                {[
                  sala.id === miSala ? 'Estás aquí' : null,
                  sala.ocupantes > 0 && sala.id !== miSala
                    ? sala.ocupantes === 1
                      ? 'Hay alguien'
                      : `${sala.ocupantes} personas`
                    : null,
                  conHallazgo.has(sala.id) ? 'Ya dio algo' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Sin novedades'}
              </Cuerpo>
            </View>
            {sala.id === miSala && <Cuerpo style={{ color: color.oro300, fontSize: 19 }}>✓</Cuerpo>}
          </Pressable>
        </Animated.View>
      ))}
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------
// El plano generado
// ---------------------------------------------------------------------------

interface PropsPlano {
  salas: SalaVista[];
  miSala?: string;
  conHallazgo: Set<string>;
  ancho: number;
  alPulsar: (salaId: string) => void | Promise<void>;
  activo: boolean;
}

function PlanoDibujado({
  plano,
  ...resto
}: PropsPlano & { plano?: BoardLayout }): JSX.Element | null {
  const { salas, miSala, conHallazgo, ancho, alPulsar, activo } = resto;
  if (!plano || plano.rooms.length === 0) return null;

  const lado = plano.grid.cols * CELDA;
  const alto = plano.grid.rows * CELDA;
  const nombrePorId = new Map(salas.map((s) => [s.id, s.name]));
  const salaPorId = new Map(salas.map((s) => [s.id, s]));

  const centros = new Map<string, { cx: number; cy: number }>();
  for (const c of plano.rooms) {
    centros.set(c.roomId, { cx: (c.x + c.w / 2) * CELDA, cy: (c.y + c.h / 2) * CELDA });
  }

  const centro = {
    x: Math.round(plano.grid.cols * 0.29) * CELDA,
    y: Math.round(plano.grid.rows * 0.33) * CELDA,
    w: Math.round(plano.grid.cols * 0.42) * CELDA,
    h: Math.round(plano.grid.rows * 0.34) * CELDA,
  };

  // Las zonas pulsables van en Pressables por encima del dibujo, no en el
  // propio SVG. `<G onPress>` funciona en el móvil pero en web react-native-svg
  // le cuelga al nodo del DOM las props de gesto de React Native, que el
  // navegador no entiende: el toque se pierde y la consola se llena de
  // «Unknown event handler property». Con la escala del viewBox, colocar los
  // rectángulos encima es trivial y funciona igual en las tres plataformas.
  const escala = ancho / lado;

  return (
    <Animated.View entering={FadeIn.duration(600)} style={estilos.lienzo}>
      <View style={{ width: ancho, height: (ancho * alto) / lado }}>
      <Svg
        width={ancho}
        height={(ancho * alto) / lado}
        viewBox={`0 0 ${lado} ${alto}`}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient id="tapete" cx="50%" cy="44%" r="74%">
            <Stop offset="0%" stopColor="#1d4a32" />
            <Stop offset="70%" stopColor="#123122" />
            <Stop offset="100%" stopColor="#0a1c13" />
          </RadialGradient>
        </Defs>

        {/* Tapete y marco art-decó */}
        <Rect width={lado} height={alto} fill="url(#tapete)" />
        <Rect
          x={9}
          y={9}
          width={lado - 18}
          height={alto - 18}
          fill="none"
          stroke={color.oro500}
          strokeWidth={3}
        />
        <Rect
          x={20}
          y={20}
          width={lado - 40}
          height={alto - 40}
          fill="none"
          stroke="rgba(201,162,39,0.35)"
          strokeWidth={1.2}
        />

        {/* Rejilla del pasillo. Más tenue que en la web: a este tamaño, la de
            allí se convierte en una trama que ensucia. */}
        <G opacity={0.1}>
          {Array.from({ length: plano.grid.cols - 1 }, (_, i) => (
            <Line
              key={`v${i}`}
              x1={(i + 1) * CELDA}
              y1={20}
              x2={(i + 1) * CELDA}
              y2={alto - 20}
              stroke={color.oro300}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: plano.grid.rows - 1 }, (_, i) => (
            <Line
              key={`h${i}`}
              x1={20}
              y1={(i + 1) * CELDA}
              x2={lado - 20}
              y2={(i + 1) * CELDA}
              stroke={color.oro300}
              strokeWidth={1}
            />
          ))}
        </G>

        {/* Bloque central */}
        <G>
          <Rect
            x={centro.x}
            y={centro.y}
            width={centro.w}
            height={centro.h}
            rx={7}
            fill="#4a1622"
            stroke={color.oro500}
            strokeWidth={2.5}
          />
          <Rect
            x={centro.x + 10}
            y={centro.y + 10}
            width={centro.w - 20}
            height={centro.h - 20}
            rx={4}
            fill="none"
            stroke="rgba(232,207,127,0.4)"
            strokeWidth={1}
          />
          <SvgText
            x={centro.x + centro.w / 2}
            y={centro.y + centro.h / 2 + 12}
            textAnchor="middle"
            fontSize={34}
            fontFamily="Cinzel_700Bold"
            fill={color.oro300}
          >
            {plano.centerLabel}
          </SvgText>
        </G>

        {/* Pasadizos secretos */}
        {plano.passages.map((p, i) => {
          const a = centros.get(p.fromRoomId);
          const b = centros.get(p.toRoomId);
          if (!a || !b) return null;
          return (
            <G key={`p${i}`}>
              <Line
                x1={a.cx}
                y1={a.cy}
                x2={b.cx}
                y2={b.cy}
                stroke={color.oro400}
                strokeWidth={3}
                strokeDasharray="14 11"
                strokeLinecap="round"
                opacity={0.85}
              />
              <BocaDePasadizo cx={a.cx} cy={a.cy} />
              <BocaDePasadizo cx={b.cx} cy={b.cy} />
            </G>
          );
        })}

        {/* Salas */}
        {plano.rooms.map((c) => {
          const x = c.x * CELDA;
          const y = c.y * CELDA;
          const w = c.w * CELDA;
          const h = c.h * CELDA;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const sala = salaPorId.get(c.roomId);
          const nombre = (nombrePorId.get(c.roomId) ?? 'Sala').toUpperCase();
          const dentro = miSala === c.roomId;
          const dioAlgo = conHallazgo.has(c.roomId);
          const lineas = partirNombre(nombre);
          const tam = tamanoDeLetra(lineas, w - 30);
          const haciaDerecha = cx < lado / 2;
          const puertaX = haciaDerecha ? x + w - 4 : x + 4;

          return (
            <G key={c.roomId}>
              {/* El parquet de la web no se porta: sus baldosas de 26 unidades
                  quedarían en 9 píxeles y solo aportarían ruido. Un caoba plano
                  con doble filete lee mucho mejor a este tamaño. */}
              <Rect
                x={x + 5}
                y={y + 5}
                width={w - 10}
                height={h - 10}
                rx={6}
                fill={dentro ? 'rgba(201,162,39,0.20)' : '#2b1a12'}
                stroke={dentro ? color.oro300 : color.oro500}
                strokeWidth={dentro ? 4 : 2.5}
              />
              <Rect
                x={x + 12}
                y={y + 12}
                width={w - 24}
                height={h - 24}
                rx={3}
                fill="none"
                stroke="rgba(201,162,39,0.3)"
                strokeWidth={1}
              />
              {/* Hueco de la puerta, hacia el centro del tablero */}
              <Rect x={puertaX - 3} y={cy - 16} width={8} height={32} fill="#123122" />

              <SvgText
                x={cx}
                y={cy + (lineas.length === 1 ? tam * 0.34 : -tam * 0.18)}
                textAnchor="middle"
                fontSize={tam}
                fontFamily="Cinzel_600SemiBold"
                fill={dentro ? color.oro300 : color.pergamino}
              >
                {lineas.map((linea, i) => (
                  <TSpan key={i} x={cx} dy={i === 0 ? 0 : tam * 1.06}>
                    {linea}
                  </TSpan>
                ))}
              </SvgText>

              {/* Quién hay dentro: un punto por persona, hasta cuatro. */}
              {(sala?.ocupantes ?? 0) > 0 && (
                <G>
                  {Array.from({ length: Math.min(4, sala!.ocupantes) }, (_, i) => (
                    <Circle
                      key={i}
                      cx={cx - (Math.min(4, sala!.ocupantes) - 1) * 9 + i * 18}
                      cy={y + h - 26}
                      r={5}
                      fill={color.oro300}
                    />
                  ))}
                </G>
              )}

              {/* Sello de lacre: de aquí ya salió algo al tablón común. */}
              {dioAlgo && (
                <G>
                  <Circle
                    cx={x + w - 26}
                    cy={y + 26}
                    r={11}
                    fill={color.burdeos700}
                    stroke={color.oro400}
                    strokeWidth={1.6}
                  />
                  <Path
                    d={`M ${x + w - 26} ${y + 20.5} l 2.6 5.2 -2.6 5.2 -2.6 -5.2 z`}
                    fill={color.oro300}
                  />
                </G>
              )}
            </G>
          );
        })}
      </Svg>

      {activo &&
        plano.rooms.map((c) => (
          <Pressable
            key={`toque-${c.roomId}`}
            accessibilityRole="button"
            accessibilityLabel={`Entrar en ${nombrePorId.get(c.roomId) ?? 'la sala'}`}
            disabled={miSala === c.roomId}
            onPress={() => void alPulsar(c.roomId)}
            style={({ pressed }) => [
              {
                position: 'absolute',
                left: c.x * CELDA * escala,
                top: c.y * CELDA * escala,
                width: c.w * CELDA * escala,
                height: c.h * CELDA * escala,
                borderRadius: 6,
              },
              pressed && { backgroundColor: 'rgba(232,207,127,0.18)' },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

/** Espiral en cada boca de pasadizo, como en el tablero de la web. */
function BocaDePasadizo({ cx, cy }: { cx: number; cy: number }): JSX.Element {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={11} fill={color.caoba900} stroke={color.oro500} strokeWidth={2} />
      <Path
        d={`M ${cx} ${cy - 6} A 6 6 0 1 1 ${cx - 6} ${cy} A 3.6 3.6 0 1 0 ${cx} ${cy + 3.6}`}
        fill="none"
        stroke={color.oro300}
        strokeWidth={2}
      />
    </G>
  );
}

// ---------------------------------------------------------------------------
// El plano aéreo: la foto del sitio real
// ---------------------------------------------------------------------------

function PlanoAereo({
  imagenUrl,
  salas,
  miSala,
  conHallazgo,
  ancho,
  alPulsar,
  activo,
}: PropsPlano & { imagenUrl?: string }): JSX.Element {
  const [proporcion, setProporcion] = useState(4 / 3);
  const uri = imagenUrl ? `${api.servidorActual()}${imagenUrl}` : undefined;

  // La foto la sube quien prepara la partida, así que su proporción es
  // imprevisible. Sin medirla, las chinchetas caen donde no es.
  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => {
        if (h > 0) setProporcion(w / h);
      },
      () => undefined,
    );
  }, [uri]);

  if (!uri) {
    return (
      <Marco>
        <Cuerpo tenue>
          Esta partida se juega sobre el espacio real, pero todavía no hay foto del plano.
        </Cuerpo>
      </Marco>
    );
  }

  const conChincheta = salas.filter((s) => s.pin);

  return (
    <Animated.View entering={FadeIn.duration(600)} style={estilos.lienzo}>
      <View style={{ width: ancho, height: ancho / proporcion }}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {conChincheta.map((sala) => {
          const dentro = sala.id === miSala;
          return (
            <Pressable
              key={sala.id}
              onPress={() => void alPulsar(sala.id)}
              disabled={!activo || dentro}
              style={[
                estilos.chincheta,
                {
                  left: `${(sala.pin!.x ?? 0) * 100}%`,
                  top: `${(sala.pin!.y ?? 0) * 100}%`,
                },
              ]}
            >
              <View style={[estilos.chinchetaCabeza, dentro && estilos.chinchetaDentro]}>
                <Cuerpo style={{ fontSize: 13, color: color.tinta }}>
                  {conHallazgo.has(sala.id) ? '✦' : sala.ocupantes > 0 ? String(sala.ocupantes) : '·'}
                </Cuerpo>
              </View>
              <View style={estilos.chinchetaEtiqueta}>
                <Etiqueta style={{ fontSize: 10 }}>{sala.name}</Etiqueta>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Leyenda y utilidades
// ---------------------------------------------------------------------------

/**
 * El paso de una cara a otra.
 *
 * Solo aparece cuando la partida tiene las dos. Con una sola sobra el mando, y
 * un botón que no lleva a ningún sitio es peor que no tenerlo.
 */
function Alternador({
  cara,
  alCambiar,
}: {
  cara: Cara | null;
  alCambiar: (c: Cara) => void;
}): JSX.Element {
  const opcion = (valor: Cara, rotulo: string): JSX.Element => (
    <Pressable
      key={valor}
      accessibilityRole="button"
      accessibilityState={cara === valor ? { selected: true } : {}}
      onPress={() => alCambiar(valor)}
      style={[estilos.pestanaMapa, cara === valor && estilos.pestanaMapaActiva]}
    >
      <Etiqueta style={{ color: cara === valor ? color.oro300 : 'rgba(217,201,163,0.5)' }}>
        {rotulo}
      </Etiqueta>
    </Pressable>
  );
  return (
    <View style={estilos.alternador}>
      {opcion('plano', 'El plano')}
      {opcion('foto', 'La casa')}
    </View>
  );
}

function Leyenda({ cara, hayPasadizos }: { cara: Cara; hayPasadizos: boolean }): JSX.Element {
  return (
    <View style={estilos.leyenda}>
      <Renglon
        glifo={cara === 'foto' ? '◉' : '▣'}
        texto="La estancia iluminada es en la que estás."
      />
      <Renglon glifo="●" texto="Cada punto es alguien que ha entrado ahí esta ronda." />
      <Renglon glifo="✦" texto="El lacre marca las salas que ya dieron algo al tablón." />
      {cara === 'plano' && hayPasadizos && (
        <Renglon glifo="╌" texto="Los trazos discontinuos son pasadizos: cruzan la casa sin pasillo." />
      )}
    </View>
  );
}

function Renglon({ glifo, texto }: { glifo: string; texto: string }): JSX.Element {
  return (
    <View style={estilos.renglon}>
      <Cuerpo style={{ color: color.oro400, width: 20, fontSize: 15 }}>{glifo}</Cuerpo>
      <Cuerpo tenue style={{ flex: 1, fontSize: 15 }}>
        {texto}
      </Cuerpo>
    </View>
  );
}

/**
 * Parte el nombre en dos líneas si conviene.
 *
 * Las salas miden unos setenta píxeles en la pantalla de un móvil. «Sala de
 * billar» en una sola línea sale a cuerpo cuatro y no se lee; partida por
 * palabras, entra holgada.
 */
function partirNombre(nombre: string): string[] {
  const palabras = nombre.split(/\s+/).filter(Boolean);
  if (nombre.length <= 9 || palabras.length < 2) return [nombre];

  // Corte más equilibrado posible.
  let mejor = { corte: 1, desviacion: Infinity };
  for (let i = 1; i < palabras.length; i++) {
    const a = palabras.slice(0, i).join(' ').length;
    const b = palabras.slice(i).join(' ').length;
    const desviacion = Math.abs(a - b);
    if (desviacion < mejor.desviacion) mejor = { corte: i, desviacion };
  }
  return [
    palabras.slice(0, mejor.corte).join(' '),
    palabras.slice(mejor.corte).join(' '),
  ];
}

/** Cuerpo de letra que hace caber la línea más larga en el ancho disponible. */
function tamanoDeLetra(lineas: string[], disponible: number): number {
  const masLarga = Math.max(...lineas.map((l) => l.length), 1);
  // Cinzel en versales ocupa ~0.62 em por carácter contando el interletraje.
  return Math.max(17, Math.min(34, disponible / (masLarga * 0.62)));
}

const estilos = StyleSheet.create({
  lienzo: {
    alignItems: 'center',
    borderRadius: radio.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.35)',
  },
  leyenda: { marginTop: espacio.md },
  alternador: {
    flexDirection: 'row',
    gap: espacio.sm,
    marginBottom: espacio.md,
  },
  pestanaMapa: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.3)',
    borderRadius: radio.md,
    backgroundColor: 'rgba(31,18,12,0.5)',
  },
  pestanaMapaActiva: {
    borderColor: color.oro400,
    backgroundColor: 'rgba(201,162,39,0.14)',
  },
  renglon: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.sm, marginBottom: 4 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.24)',
    backgroundColor: 'rgba(31,18,12,0.5)',
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  filaDentro: {
    borderColor: color.oro400,
    backgroundColor: 'rgba(201,162,39,0.13)',
  },
  chincheta: {
    // La chincheta tiene que quedar centrada EXACTAMENTE sobre el punto que
    // marcó quien preparó la partida. Por eso la caja lleva ancho fijo y se
    // desplaza media caja: si se dejara que la anchura la fijase el rótulo,
    // cada estancia se descolocaría en proporción a lo largo que sea su
    // nombre, que es justo lo que pasaba antes.
    position: 'absolute',
    width: ANCHO_CHINCHETA,
    marginLeft: -ANCHO_CHINCHETA / 2,
    marginTop: -ALTO_CABEZA / 2,
    alignItems: 'center',
  },
  chinchetaCabeza: {
    width: ALTO_CABEZA,
    height: ALTO_CABEZA,
    borderRadius: ALTO_CABEZA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.oro300,
    borderWidth: 2,
    borderColor: 'rgba(31,18,12,0.7)',
  },
  chinchetaDentro: { backgroundColor: color.oro500, borderColor: color.pergamino },
  chinchetaEtiqueta: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radio.sm,
    backgroundColor: 'rgba(20,12,8,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,39,0.5)',
  },
});
