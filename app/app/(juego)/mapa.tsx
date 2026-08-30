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
import { conAlfa, useTablero, useTema } from '../../src/tema-juego';
import { MOMIA } from '../../src/tema-momia';
import { leerEstadoMomia } from '../../src/momia/vista';
import { accionDeEntrarEnLugar, categoriasDeLugar, manifiestoDe } from '../../../shared/juegos';
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
import type { LugarVista } from '../../../shared/live';

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
  /*
   * ARRIBA DEL TODO, ANTES DEL PRIMER `return`.
   *
   * Estaba cien lineas mas abajo, detras de la salida temprana de «no hay
   * vista todavia»: en la primera pintada no se llamaba y en la siguiente si.
   * Hoy no rompe nada —`useTema` es un `useContext` y esos no ocupan sitio en
   * la lista de hooks— pero es una trampa puesta y armada: el dia que a
   * `useTema` se le añada un `useMemo` dentro, esta pantalla revienta con el
   * error 300 de React en el movil de alguien, a mitad de partida, y el fichero
   * que se toco no sera este.
   *
   * Todas las llamadas a hooks van antes de cualquier `return`. Sin excepciones
   * y sin razonar cual es inofensiva.
   */
  const t = useTema();

  if (!vista) return <Pantalla><Cargando texto="Desdoblando el plano…" /></Pantalla>;

  const { tablero, lugares: salas, miLugar, sesion } = vista;
  const ancho = Math.max(240, width - espacio.lg * 2);
  const abierta = sesion.phase === 'ronda-abierta';

  // Una partida puede tener las dos caras: el plano trazado y la foto cenital
  // del sitio de verdad. Si están las dos, se puede pasar de una a otra.
  const hayPlano = (tablero?.plano?.lugares.length ?? 0) > 0;
  const hayFoto = Boolean(tablero?.imagenUrl);
  const porDefecto: Cara | null =
    tablero?.modo === 'aerial' && hayFoto ? 'foto' : hayPlano ? 'plano' : hayFoto ? 'foto' : null;
  const cara = (elegida && (elegida === 'foto' ? hayFoto : hayPlano) ? elegida : porDefecto);
  const conChincheta = salas.filter((s) => s.pin).length;

  /*
   * Salas en las que YO he encontrado algo. Antes eran las salas de las que
   * había salido algo al tablón común —o sea, las de cualquiera—, y con eso el
   * plano acababa marcado entero para todo el mundo por igual. Ahora las pistas
   * son de quien las encuentra, así que esto marca tu propio recorrido: dónde
   * has estado y qué te dio algo. No es información nueva, la tienes en Pistas;
   * aquí solo se ve de un vistazo y sobre el plano.
   */
  const conHallazgo = new Set(vista.misHallazgos.map((p) => p.lugarId));

  /*
   * LAS PALABRAS DEL SITIO SALEN DEL MANIFIESTO. Esta pantalla decía «la casa»
   * y «las estancias», que en El Misterio de la Momia no existen: allí son
   * cámaras, y lo que hay es una tumba. El plano es de los sitios donde más se
   * nota, porque se mira mucho y se lee entero.
   */
  const manifiesto = manifiestoDe(sesion.juego);
  const lugar = categoriasDeLugar(manifiesto)[0];
  const unLugar = lugar?.singular ?? 'estancia';
  const losLugares = lugar?.plural ?? 'estancias';
  /*
   * Si el juego no tiene acción de entrar, el plano se mira pero no se toca.
   *
   * Y TAMPOCO SE TOCA SI ESA ACCIÓN PIDE ALGO QUE ESTE PLANO NO PUEDE DAR. En
   * El Paso de las Sombras, reconocer un paso exige además la palabra escrita en
   * la puerta —un campo `eligeLibre`— y este plano solo sabe mandar el id del
   * sitio: la petición saldría, el reductor la rechazaría con razón, y la
   * pantalla habría invitado a hacer algo imposible. Se deduce de la acción en
   * vez de escribir el nombre del juego aquí: cualquier juego futuro cuya acción
   * de entrar necesite datos propios se comporta igual sin tocar esta pantalla.
   */
  const entrada = accionDeEntrarEnLugar(manifiesto);
  const seEntra = Boolean(entrada) && (entrada?.accion.eligeLibre ?? []).length === 0;

  /*
   * «Las salas», «las cámaras»… y «los pasos». El manifiesto no declara el
   * género de una categoría —está anotado como pendiente en el informe— así que
   * se deduce de la terminación del singular, que es la misma heurística que ya
   * usa `agent/momia-herramientas.ts` para «un/una». Con las tres categorías de
   * lugar que existen acierta; el día que alguien registre «los mapas», habrá
   * que declararlo de verdad.
   */
  const losLas = /a$/i.test(unLugar) ? 'Las' : 'Los';

  /*
   * La cámara profanada de esta vigilia, marcada también aquí.
   *
   * Es pública —quien dirige la anuncia en voz alta al abrir— y es LO QUE MÁS
   * pesa al decidir dónde entrar: quien pise ahí sale con una marca. Tenerla en
   * el plano, y no solo en la primera pestaña, es la diferencia entre un plano
   * que sirve para decidir y un plano decorativo.
   */
  const profanada = leerEstadoMomia(vista.estadoDelJuego)?.profanada;

  const elegir = async (salaId: string): Promise<void> => {
    if (!abierta || !seEntra || salaId === miLugar || eligiendo) return;
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
        <Titulo style={{ fontSize: 24 }}>{cara === 'foto' ? 'El sitio' : 'El plano'}</Titulo>
        <Cuerpo tenue>
          {abierta
            ? seEntra
              ? `Toca una ${unLugar} para entrar en ella.`
              : `${losLas} ${losLugares} de esta partida.`
            : cara === 'foto'
              ? 'El sitio de verdad, visto desde arriba.'
              : `La planta y por dónde se comunican ${losLas.toLowerCase()} ${losLugares}.`}
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
            subir una foto aérea del sitio y clavar una chincheta en cada {unLugar}.
          </Cuerpo>
        </Marco>
      ) : cara === 'foto' ? (
        <PlanoAereo
          imagenUrl={tablero?.imagenUrl}
          salas={salas}
          miLugar={miLugar}
          conHallazgo={conHallazgo}
          ancho={ancho}
          alPulsar={elegir}
          activo={abierta}
        />
      ) : (
        <PlanoDibujado
          plano={tablero?.plano}
          salas={salas}
          miLugar={miLugar}
          conHallazgo={conHallazgo}
          profanada={profanada}
          ancho={ancho}
          alPulsar={elegir}
          activo={abierta}
        />
      )}

      {cara === 'foto' && conChincheta < salas.length && (
        <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15, marginTop: espacio.sm }}>
          {conChincheta === 0
            ? `Sobre esta foto todavía no hay ninguna ${unLugar} señalada.`
            : `Sobre la foto hay ${conChincheta} de ${salas.length} ${losLugares} señaladas; las demás están en la lista de abajo.`}
        </Cuerpo>
      )}

      {cara && (
        <Leyenda
          cara={cara}
          nombreProfanada={salas.find((s) => s.id === profanada)?.name}
          hayPasadizos={(tablero?.plano?.pasadizos.length ?? 0) > 0}
        />
      )}

      <Ornamento />

      <Seccion>{`Las ${losLugares}`}</Seccion>
      {salas.map((sala, i) => (
        <Animated.View key={sala.id} entering={FadeInUp.delay(40 * i).duration(360)}>
          <Pressable
            onPress={() => void elegir(sala.id)}
            disabled={!abierta || sala.id === miLugar}
            style={({ pressed }) => [
              estilos.fila,
              sala.id === miLugar && estilos.filaDentro,
              sala.id === profanada && estilos.filaProfanada,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 16 }}>
                {sala.name}
              </Cuerpo>
              <Cuerpo tenue style={{ fontSize: 15 }}>
                {[
                  sala.id === miLugar ? 'Estás aquí' : null,
                  sala.ocupantes > 0 && sala.id !== miLugar
                    ? sala.ocupantes === 1
                      ? 'Hay alguien'
                      : `${sala.ocupantes} personas`
                    : null,
                  conHallazgo.has(sala.id) ? 'Aquí encontraste algo' : null,
                  // Lo primero de la lista si toca: entrar ahí cuesta una marca.
                  sala.id === profanada ? 'Profanada esta noche' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Sin novedades'}
              </Cuerpo>
            </View>
            {sala.id === miLugar && <Cuerpo style={{ color: t.oro300, fontSize: 19 }}>✓</Cuerpo>}
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
  salas: LugarVista[];
  miLugar?: string;
  conHallazgo: Set<string>;
  /**
   * La que cuesta una marca esta noche, si el juego tiene una.
   *
   * Se dibuja EN EL PLANO y no solo en la lista de abajo: el plano es lo que se
   * mira para decidir dónde entrar, y esto es lo que más pesa en esa decisión.
   * Tenerlo solo en la lista obligaba a bajar, recordar cuál era y volver a
   * subir a buscarla.
   */
  profanada?: string;
  ancho: number;
  alPulsar: (salaId: string) => void | Promise<void>;
  activo: boolean;
}

function PlanoDibujado({
  plano,
  ...resto
}: PropsPlano & { plano?: BoardLayout }): JSX.Element | null {
  const t = useTema();
  /*
   * El tapete y el bloque central del plano. Estaban escritos a mano aquí abajo
   * —tres verdes de mesa de casino— y se pintaban igual en los tres juegos: la
   * Tumba y los Pasos se dibujaban sobre el fieltro de la mansión. Es de los
   * sitios donde más se nota, porque el plano se mira mucho y además se imprime.
   */
  const tablero = useTablero();
  const { salas, miLugar, conHallazgo, profanada, ancho, alPulsar, activo } = resto;
  if (!plano || plano.lugares.length === 0) return null;

  const lado = plano.grid.cols * CELDA;
  const alto = plano.grid.rows * CELDA;
  const nombrePorId = new Map(salas.map((s) => [s.id, s.name]));
  const salaPorId = new Map(salas.map((s) => [s.id, s]));

  const centros = new Map<string, { cx: number; cy: number }>();
  for (const c of plano.lugares) {
    centros.set(c.lugarId, { cx: (c.x + c.w / 2) * CELDA, cy: (c.y + c.h / 2) * CELDA });
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
            <Stop offset="0%" stopColor={tablero.tapete[0]} />
            <Stop offset="70%" stopColor={tablero.tapete[1]} />
            <Stop offset="100%" stopColor={tablero.tapete[2]} />
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
          stroke={t.oro500}
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
              stroke={t.oro300}
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
              stroke={t.oro300}
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
            fill={tablero.centro}
            stroke={t.oro500}
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
            fill={t.oro300}
          >
            {plano.centerLabel}
          </SvgText>
        </G>

        {/* Pasadizos secretos */}
        {plano.pasadizos.map((p, i) => {
          const a = centros.get(p.desdeLugarId);
          const b = centros.get(p.hastaLugarId);
          if (!a || !b) return null;
          return (
            <G key={`p${i}`}>
              <Line
                x1={a.cx}
                y1={a.cy}
                x2={b.cx}
                y2={b.cy}
                stroke={t.oro400}
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
        {plano.lugares.map((c) => {
          const x = c.x * CELDA;
          const y = c.y * CELDA;
          const w = c.w * CELDA;
          const h = c.h * CELDA;
          const cx = x + w / 2;
          const cy = y + h / 2;
          const sala = salaPorId.get(c.lugarId);
          const nombre = (nombrePorId.get(c.lugarId) ?? 'Sala').toUpperCase();
          const dentro = miLugar === c.lugarId;
          const dioAlgo = conHallazgo.has(c.lugarId);
          const marcada = c.lugarId === profanada;
          const lineas = partirNombre(nombre);
          const tam = tamanoDeLetra(lineas, w - 30);
          const haciaDerecha = cx < lado / 2;
          const puertaX = haciaDerecha ? x + w - 4 : x + 4;

          return (
            <G key={c.lugarId}>
              {/* El parquet de la web no se porta: sus baldosas de 26 unidades
                  quedarían en 9 píxeles y solo aportarían ruido. Un caoba plano
                  con doble filete lee mucho mejor a este tamaño. */}
              <Rect
                x={x + 5}
                y={y + 5}
                width={w - 10}
                height={h - 10}
                rx={6}
                fill={
                  dentro
                    ? 'rgba(201,162,39,0.20)'
                    : marcada
                      ? conAlfa(MOMIA.profanada, 0.22)
                      : t.caoba800
                }
                stroke={dentro ? t.oro300 : marcada ? MOMIA.profanada : t.oro500}
                strokeWidth={dentro ? 4 : marcada ? 3.5 : 2.5}
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
              <Rect x={puertaX - 3} y={cy - 16} width={8} height={32} fill={tablero.tapete[1]} />

              <SvgText
                x={cx}
                y={cy + (lineas.length === 1 ? tam * 0.34 : -tam * 0.18)}
                textAnchor="middle"
                fontSize={tam}
                fontFamily="Cinzel_600SemiBold"
                fill={dentro ? t.oro300 : t.pergamino}
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
                      fill={t.oro300}
                    />
                  ))}
                </G>
              )}

              {/* Sello de lacre: aquí encontraste algo tú. */}
              {dioAlgo && (
                <G>
                  <Circle
                    cx={x + w - 26}
                    cy={y + 26}
                    r={11}
                    fill={t.burdeos700}
                    stroke={t.oro400}
                    strokeWidth={1.6}
                  />
                  <Path
                    d={`M ${x + w - 26} ${y + 20.5} l 2.6 5.2 -2.6 5.2 -2.6 -5.2 z`}
                    fill={t.oro300}
                  />
                </G>
              )}
            </G>
          );
        })}
      </Svg>

      {activo &&
        plano.lugares.map((c) => (
          <Pressable
            key={`toque-${c.lugarId}`}
            accessibilityRole="button"
            accessibilityLabel={`Entrar en ${nombrePorId.get(c.lugarId) ?? 'la sala'}`}
            disabled={miLugar === c.lugarId}
            onPress={() => void alPulsar(c.lugarId)}
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
  const t = useTema();
  return (
    <G>
      <Circle cx={cx} cy={cy} r={11} fill={t.caoba900} stroke={t.oro500} strokeWidth={2} />
      <Path
        d={`M ${cx} ${cy - 6} A 6 6 0 1 1 ${cx - 6} ${cy} A 3.6 3.6 0 1 0 ${cx} ${cy + 3.6}`}
        fill="none"
        stroke={t.oro300}
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
  miLugar,
  conHallazgo,
  ancho,
  alPulsar,
  activo,
}: PropsPlano & { imagenUrl?: string }): JSX.Element {
  const t = useTema();
  const [proporcion, setProporcion] = useState(4 / 3);
  // Si la foto no llega, se dice. Antes quedaba un rectángulo negro con las
  // chinchetas flotando encima de nada, que es peor que no enseñar el mapa.
  const [fallo, setFallo] = useState(false);
  const uri = imagenUrl && !fallo ? `${api.servidorActual()}${imagenUrl}` : undefined;

  // La foto la sube quien prepara la partida, así que su proporción es
  // imprevisible. Sin medirla, las chinchetas caen donde no es.
  useEffect(() => {
    if (!uri) return;
    Image.getSize(
      uri,
      (w, h) => {
        if (h > 0) setProporcion(w / h);
      },
      // Medir es lo primero que se hace con la foto, así que si falla aquí es
      // que no va a cargar: se pasa al mensaje en vez de esperar al `onError`
      // de una imagen que no llegará.
      () => setFallo(true),
    );
  }, [uri]);

  if (!uri) {
    return (
      <Marco>
        <Cuerpo tenue>
          {fallo
            ? 'No se ha podido cargar la foto del plano. Usa la lista de abajo.'
            : 'Esta partida se juega sobre el espacio real, pero todavía no hay foto del plano.'}
        </Cuerpo>
      </Marco>
    );
  }

  const conChincheta = salas.filter((s) => s.pin);

  return (
    <Animated.View entering={FadeIn.duration(600)} style={estilos.lienzo}>
      <View style={{ width: ancho, height: ancho / proporcion }}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFallo(true)}
        />
        {conChincheta.map((sala) => {
          const dentro = sala.id === miLugar;
          return (
            /*
              La caja que centra NO recibe toques, y esto importa mucho más de
              lo que parece. Mide 150 px de ancho —los necesita para centrar la
              chincheta sobre su punto pase lo que pase con el rótulo— y antes
              era ella misma el `Pressable`: en un móvil normal eso es casi la
              mitad del ancho del mapa, invisible, y la chincheta pintada
              después se tragaba el toque de la anterior.

              Con `box-none` la caja deja pasar los toques y solo responde la
              cabeza. Y el rótulo, `none`, para que tampoco estorbe.

              No era un fallo cosmético: solo se puede cambiar de sala UNA vez
              por ronda, así que tocar la chincheta equivocada no se deshace.
            */
            <View
              key={sala.id}
              pointerEvents="box-none"
              style={[
                estilos.chincheta,
                {
                  left: `${(sala.pin!.x ?? 0) * 100}%`,
                  top: `${(sala.pin!.y ?? 0) * 100}%`,
                },
              ]}
            >
              <Pressable
                onPress={() => void alPulsar(sala.id)}
                disabled={!activo || dentro}
                // La cabeza mide 34: con esto la zona de toque llega a 50, por
                // encima del mínimo que piden tanto Apple (44) como Android (48).
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${sala.name}${dentro ? ', estás aquí' : ''}`}
                style={[estilos.chinchetaCabeza, dentro && estilos.chinchetaDentro]}
              >
                <Cuerpo style={{ fontSize: 13, color: t.tinta }}>
                  {conHallazgo.has(sala.id) ? '✦' : sala.ocupantes > 0 ? String(sala.ocupantes) : '·'}
                </Cuerpo>
              </Pressable>
              <View style={estilos.chinchetaEtiqueta} pointerEvents="none">
                <Etiqueta style={{ fontSize: 10 }}>{sala.name}</Etiqueta>
              </View>
            </View>
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
  const t = useTema();
  const opcion = (valor: Cara, rotulo: string): JSX.Element => (
    <Pressable
      key={valor}
      accessibilityRole="button"
      accessibilityState={cara === valor ? { selected: true } : {}}
      onPress={() => alCambiar(valor)}
      style={[estilos.pestanaMapa, cara === valor && estilos.pestanaMapaActiva]}
    >
      <Etiqueta style={{ color: cara === valor ? t.oro300 : 'rgba(217,201,163,0.5)' }}>
        {rotulo}
      </Etiqueta>
    </Pressable>
  );
  return (
    <View style={estilos.alternador}>
      {opcion('plano', 'El plano')}
      {opcion('foto', 'El sitio')}
    </View>
  );
}

function Leyenda({
  cara,
  hayPasadizos,
  nombreProfanada,
}: {
  cara: Cara;
  hayPasadizos: boolean;
  nombreProfanada?: string;
}): JSX.Element {
  return (
    <View style={estilos.leyenda}>
      <Renglon
        glifo={cara === 'foto' ? '◉' : '▣'}
        texto="La iluminada es donde estás."
      />
      <Renglon glifo="●" texto="Cada punto es alguien que ha entrado ahí esta ronda." />
      <Renglon glifo="✦" texto="El lacre marca las que ya dieron algo." />
      {/* Solo si la hay. Con palabra y no solo con color: en una mesa de ocho
          hay siempre alguien que no distingue el rojo, y esto cuesta una marca. */}
      {nombreProfanada && (
        <Renglon
          glifo="▨"
          texto={`${nombreProfanada} está profanada esta noche: quien entre sale con una marca.`}
        />
      )}
      {cara === 'plano' && hayPasadizos && (
        <Renglon glifo="╌" texto="Los trazos discontinuos son pasadizos: cruzan de un lado a otro sin pasillo." />
      )}
    </View>
  );
}

function Renglon({ glifo, texto }: { glifo: string; texto: string }): JSX.Element {
  const t = useTema();
  return (
    <View style={estilos.renglon}>
      <Cuerpo style={{ color: t.oro400, width: 20, fontSize: 15 }}>{glifo}</Cuerpo>
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
  /*
   * La profanada. Con borde y con PALABRA —«Profanada esta noche» va en la
   * línea de abajo—, no solo con color: en una mesa de ocho hay siempre alguien
   * que no distingue el rojo, y un dato que solo se dice con un tono es un dato
   * que esa persona no puede leer. Y este cuesta una marca.
   */
  filaProfanada: {
    borderColor: MOMIA.profanada,
    backgroundColor: conAlfa(MOMIA.profanada, 0.12),
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
