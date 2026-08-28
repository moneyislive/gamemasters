/**
 * La vigilia: la pantalla donde se juega El Misterio de la Momia.
 *
 * ═══ POR QUÉ ESTO ESTÁ AQUÍ Y NO DENTRO DE `ronda.tsx` ═══
 *
 * `ronda.tsx` es de CLUEDO y no puede cambiar de comportamiento: es la regla que
 * manda. Podría haberse ramificado por juego allí mismo, y el resultado habría
 * sido un fichero de mil líneas con dos juegos entrelazados en el que cualquier
 * arreglo de uno pisa al otro sin querer —que es exactamente el fallo que la
 * regla intenta evitar, solo que más difícil de ver—.
 *
 * Así que `ronda.tsx` se queda como estaba y gana UNA línea: si la partida es de
 * la Momia, esto. Dos ficheros, cada uno legible entero, y la frontera puesta en
 * el único sitio donde de verdad hay una: qué juego es.
 *
 * ═══ QUÉ TIENE QUE RESOLVER ESTA PANTALLA ═══
 *
 * La vigilia es una decisión con precio, y la pantalla tiene que ponerla
 * delante en ese orden:
 *
 *   1. QUÉ CÁMARA ESTÁ PROFANADA. Es la decisión de la ronda —información
 *      contra salud— y sin ese dato la elección no significa nada.
 *   2. CÓMO ESTÁS. Con dos marcas, entrar en la profanada te deja tocado y sin
 *      voz en la votación. Si hay que buscarlo, se entra sin mirarlo.
 *   3. DÓNDE ENTRAS.
 *   4. Y LO QUE PUEDES DAR O INVOCAR, que es lo que obliga a hablar.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as api from '../api';
import { usePartida } from '../estado';
import { Reloj } from '../reloj';
import { AvisoDeLaPartida } from '../conexion';
import { Foto } from '../foto';
import { PanelDeAcciones } from '../acciones';
import {
  Boton,
  Cargando,
  Cuerpo,
  Error as AvisoError,
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
import { ALTO_BARRA_TOTAL } from '../tema';
import { conAlfa } from '../tema-juego';
import { COLOR_MOMIA as C, MOMIA } from '../tema-momia';
import { Cartucho, Maldicion } from './piezas';
import { GlifoDeDon, Grieta, Puerta } from './glifos';
import { DONES } from './dones';
import type { DonId } from '../../../shared/juegos/momia-tipos';
import { codificarObjetivo, leerEstadoMomia, type EstadoMomiaVisible } from './vista';
import type { SalaVista, VistaJugador } from '../../../shared/live';

/** Lo que la barra de señalar ocupa por encima de las pestañas. */
const ALTO_SENALAR = 78;


/**
 * Lo que se cuenta después de entrar en una cámara.
 *
 * El servidor devuelve cuántos fragmentos había y si la cámara estaba
 * profanada, y la pantalla lo tiraba: entrar era la decisión más cara de la
 * vigilia y no daba ninguna respuesta. Se lee con cuidado porque viene de la
 * red: cualquier forma rara se traduce a «no ha pasado nada que contar».
 */
function leerLoEncontrado(crudo: unknown): string | null {
  if (typeof crudo !== 'object' || crudo === null) return null;
  const r = crudo as { fragmentos?: unknown; profanada?: unknown };
  const cuantos = Array.isArray(r.fragmentos) ? r.fragmentos.length : 0;
  const marcado = r.profanada === true;
  if (cuantos === 0 && !marcado) return 'Esa cámara estaba vacía.';
  const trozos: string[] = [];
  if (cuantos === 1) trozos.push('Sales con un fragmento');
  else if (cuantos > 1) trozos.push(`Sales con ${cuantos} fragmentos`);
  if (marcado) trozos.push(trozos.length > 0 ? 'y con una marca' : 'Sales con una marca');
  return `${trozos.join(' ')}.`;
}

export function Vigilia(): JSX.Element {
  const { vista, cargando, error, aplicarVista } = usePartida();
  const [entrando, setEntrando] = useState<string | null>(null);
  /** Lo que has sacado de la cámara, para decirlo donde acabas de pulsar. */
  const [loQueSaqué, setLoQueSaqué] = useState<string | null>(null);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [avisando, setAvisando] = useState(false);

  if (cargando && !vista) return <Pantalla><Cargando texto="Bajando a la tumba…" /></Pantalla>;
  if (!vista) {
    return (
      <Pantalla>
        <AvisoError>{error ?? 'No hay ninguna partida activa.'}</AvisoError>
        <Boton onPress={() => router.replace('/')}>Volver a entrar</Boton>
      </Pantalla>
    );
  }

  const estado = leerEstadoMomia(vista.estadoDelJuego);
  const { sesion, yo, salas, miSala, narracion } = vista;

  const avisar = async (listo: boolean): Promise<void> => {
    setErrorCamara(null);
    setAvisando(true);
    try {
      aplicarVista((await api.avisarListo(listo)).vista);
    } catch (e) {
      setErrorCamara(e instanceof Error ? e.message : 'No se pudo avisar.');
    } finally {
      setAvisando(false);
    }
  };

  /**
   * Entrar en una cámara.
   *
   * SE INTENTAN LOS DOS CAMINOS, y no es indecisión. El manifiesto declara la
   * acción `explorar` y a la vez declara `ronda.accionSobre: 'camaras'`, que es
   * la maquinaria genérica de rondas —la misma que usa CLUEDO con `elegirSala`—.
   * Cuál de las dos acaba implementando el servidor es suyo, no mío, y esto se
   * escribió antes que aquello. Preguntándole a la vista qué acciones ofrece se
   * acierta en los dos casos, y el día que solo quede una, esta rama sobra y se
   * borra sin que nadie tenga que acordarse de nada.
   */
  const entrar = async (camara: SalaVista): Promise<void> => {
    setErrorCamara(null);
    setEntrando(camara.id);
    try {
      const hayExplorar = vista.acciones.some((a) => a.id === 'explorar');
      const r = hayExplorar
        ? await api.hacerAccion('explorar', { camara: camara.id })
        : await api.elegirSala(camara.id);
      aplicarVista(r.vista);
      /*
       * CON QUÉ HAS SALIDO, dicho aquí mismo. El servidor lo devuelve —cuántos
       * fragmentos y si la cámara estaba profanada— y se tiraba a la basura, así
       * que entrar en una cámara no daba ninguna respuesta: había que irse a la
       * pestaña del Papiro a ver si había algo nuevo. Es el momento de la
       * vigilia en el que más se juega uno algo, y era el más callado.
       */
      const salida = 'resultado' in r ? (r as { resultado?: unknown }).resultado : undefined;
      setLoQueSaqué(leerLoEncontrado(salida));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      setErrorCamara(e instanceof Error ? e.message : 'No se pudo entrar en esa cámara.');
    } finally {
      setEntrando(null);
    }
  };

  // ---- Antes de bajar ----
  if (sesion.phase === 'lobby') {
    return (
      <Pantalla>
        <Animated.View entering={FadeInDown.duration(520)} style={estilos.centro}>
          <Sello>El sello está roto</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            {sesion.tituloPartida}
          </Titulo>
          <Cuerpo tenue style={{ textAlign: 'center', fontStyle: 'italic', marginTop: 4 }}>
            {sesion.lema}
          </Cuerpo>
        </Animated.View>

        <Ornamento />

        <Animated.View entering={FadeInUp.delay(160).duration(500)}>
          <Marco>
            <Etiqueta>Vas como</Etiqueta>
            <Titulo style={{ fontSize: 24, marginTop: 4 }}>{yo.characterName}</Titulo>
            <Cuerpo tenue style={{ marginTop: 4 }}>{yo.role}</Cuerpo>
            {estado && <TarjetaDon estado={estado} compacta />}
            <Boton
              variante="primario"
              onPress={() => router.push('/(juego)/personaje')}
              style={{ marginTop: espacio.lg }}
            >
              Leer tu dosier
            </Boton>
          </Marco>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(240).duration(500)}>
          <Marco tono="papel">
            <Etiqueta style={{ color: C.burdeos700 }}>Lo que ha pasado</Etiqueta>
            <Cuerpo style={{ color: C.caoba700, marginTop: espacio.sm }}>
              {vista.caso.sinopsis}
            </Cuerpo>
          </Marco>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(320).duration(500)}>
          <Marco style={yo.pediEmpezar ? estilos.marcoListo : undefined}>
            <Etiqueta style={{ textAlign: 'center' }}>
              {sesion.listos} de {sesion.total} ya están abajo
            </Etiqueta>
            <Cuerpo tenue style={{ textAlign: 'center', marginTop: 6, fontSize: 16 }}>
              {yo.pediEmpezar
                ? 'Has avisado. La primera vigilia empieza cuando quien dirige la abra.'
                : 'Avisa cuando te hayas leído el papel y estés en la mesa.'}
            </Cuerpo>
            <Boton
              variante={yo.pediEmpezar ? 'secundario' : 'primario'}
              cargando={avisando}
              onPress={() => void avisar(!yo.pediEmpezar)}
              style={{ marginTop: espacio.lg }}
            >
              {yo.pediEmpezar ? 'Todavía no, espera' : 'Estoy listo · que empiece'}
            </Boton>
          </Marco>
        </Animated.View>

        <AvisoError>{errorCamara}</AvisoError>
      </Pantalla>
    );
  }

  // ---- El sellado, y el desenlace ----
  if (sesion.phase === 'sellado' || sesion.phase === 'desenlace') {
    const sellando = sesion.phase === 'sellado';
    return (
      <Pantalla>
        <Animated.View entering={FadeIn.duration(600)} style={estilos.centro}>
          <Sello>{sellando ? 'Antes del amanecer' : 'Ha amanecido'}</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            {sellando ? 'Se abre el Sellado' : 'El desenlace'}
          </Titulo>
          <Cuerpo tenue style={{ textAlign: 'center', marginTop: espacio.sm }}>
            {sellando
              ? 'Cinco ritos y un solo orden bueno. Se ejecuta el que más apoyos reúna.'
              : 'Se sabe quién rompió el sello, y si la tumba quedó cerrada.'}
          </Cuerpo>
        </Animated.View>
        <Ornamento />
        <Boton
          variante="primario"
          onPress={() => router.push(sellando ? '/(juego)/sellado' : '/desenlace')}
        >
          {sellando ? 'Ir al Sellado' : 'Ver cómo acabó'}
        </Boton>
      </Pantalla>
    );
  }

  // ---- Fases que la Momia no usa, por si acaso llega a ellas ----
  if (sesion.phase !== 'ronda-abierta' && sesion.phase !== 'ronda-cerrada') {
    return (
      <Pantalla>
        <Titulo>La expedición espera</Titulo>
        <Marco>
          <Cuerpo tenue>Quien dirige tiene la palabra. La velada sigue en cuanto la retome.</Cuerpo>
        </Marco>
        <PanelDeAcciones acciones={vista.acciones} alHacer={aplicarVista} />
      </Pantalla>
    );
  }

  // ---- La vigilia ----
  const abierta = sesion.phase === 'ronda-abierta';
  const profanada = estado?.profanada;
  // El nombre lo resuelve el servidor; la lista de salas es el respaldo por si
  // una version vieja del servidor todavia no lo mandara.
  const nombreProfanada =
    estado?.profanadaNombre ?? salas.find((s) => s.id === profanada)?.name;

  return (
    <>
      <Pantalla reserva={ALTO_SENALAR}>
        <AvisoDeLaPartida />
        <View style={estilos.cabecera}>
          <View style={{ flex: 1 }}>
            <Etiqueta>
              Vigilia {sesion.round} de {sesion.totalRounds}
            </Etiqueta>
            <Titulo style={{ fontSize: 24, marginTop: 2 }}>
              {abierta ? (miSala ? 'Estás dentro' : 'Elige cámara') : 'Vigilia cerrada'}
            </Titulo>
          </View>
          {abierta && <Reloj terminaEn={sesion.roundEndsAt} ahoraServidor={sesion.ahora} />}
        </View>

        {/* 1. La cámara profanada, lo primero y en grande. */}
        <Profanacion nombre={nombreProfanada} siguiente={estado?.profanadaSiguienteNombre} />

        {/* 2. Cómo estás. */}
        {estado && (
          <Animated.View entering={FadeInUp.delay(80).duration(460)}>
            <Marco style={estado.yo.tocado ? estilos.marcoTocado : undefined}>
              <Maldicion
                marcas={estado.yo.marcas}
                amuletos={estado.yo.amuletos}
                tocado={estado.yo.tocado}
              />
              {estado.yo.tocado ? (
                <Cuerpo style={{ color: '#ffd9c9', marginTop: espacio.md, fontSize: 16 }}>
                  Tres marcas. Tu propuesta ya no cuenta en la votación del sellado. Sigues en la
                  mesa, sigues hablando y sigues pudiendo señalar.
                </Cuerpo>
              ) : estado.yo.marcas === 2 ? (
                <Cuerpo style={{ color: MOMIA.profanada, marginTop: espacio.md, fontSize: 16 }}>
                  Una marca más y pierdes la voz en el sellado. Piensa muy bien dónde entras.
                </Cuerpo>
              ) : null}
            </Marco>
          </Animated.View>
        )}

        {narracion && (
          <Animated.View entering={FadeInDown.duration(500)}>
            <Marco tono="papel">
              <Etiqueta style={{ color: C.burdeos700 }}>{narracion.title}</Etiqueta>
              <Cuerpo style={{ color: C.caoba700, marginTop: espacio.sm }}>{narracion.text}</Cuerpo>
            </Marco>
          </Animated.View>
        )}

        <AvisoError>{errorCamara}</AvisoError>

        {/* Con qué has salido, dicho donde acabas de pulsar y no en otra pestaña. */}
        {loQueSaqué && miSala && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Marco style={estilos.loQueSaque}>
              <Cuerpo style={{ fontSize: 16 }}>{loQueSaqué}</Cuerpo>
              <Cuerpo tenue style={{ fontSize: 13.5, marginTop: 2 }}>
                Lo tienes en el Papiro. Nadie sabe qué te ha tocado.
              </Cuerpo>
            </Marco>
          </Animated.View>
        )}

        {abierta ? (
          <>
            <Ornamento />
            <Seccion>{miSala ? 'Has entrado aquí' : 'Las cámaras'}</Seccion>
            {salas.map((camara, i) => (
              <Animated.View
                key={camara.id}
                entering={FadeInUp.delay(50 * i).duration(400)}
                layout={Layout.springify()}
              >
                <FilaDeCamara
                  camara={camara}
                  dentro={miSala === camara.id}
                  profanada={camara.id === profanada}
                  bloqueada={Boolean(miSala) || entrando !== null}
                  onPress={() => void entrar(camara)}
                />
              </Animated.View>
            ))}
            {!miSala && (
              <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15, marginTop: 4 }}>
                Una sola, y no se puede rectificar. Entrar en la profanada te deja una marca.
              </Cuerpo>
            )}

            {estado && <PanelDelDon estado={estado} vista={vista} alHacer={aplicarVista} />}
          </>
        ) : (
          <>
            <Ornamento />
            <Marco>
              <Etiqueta>Se cierra la vigilia</Etiqueta>
              <Cuerpo style={{ marginTop: 6 }}>
                Es el momento de hablar: nadie tiene fragmentos suficientes para sellar en
                solitario, así que lo que no se cuente no lo sabrá nadie. Y alguno de los que ya
                estén sobre la mesa puede ser falso.
              </Cuerpo>
              <Boton
                variante="primario"
                onPress={() => router.push('/(juego)/papiro')}
                style={{ marginTop: espacio.lg }}
              >
                Ver el papiro
              </Boton>
            </Marco>
          </>
        )}

        {/* Dar un amuleto vale con la vigilia abierta Y cerrada: la puesta en
            común es cuando se ve quién está a punto de quedar tocado. */}
        {estado && <PanelDeAmuleto estado={estado} vista={vista} alHacer={aplicarVista} />}

        {/* Lo que el juego permita y esta pantalla no haya pintado ya. */}
        <PanelDeAcciones
          acciones={vista.acciones.filter(
            (a) => !['explorar', 'invocar', 'ofrendar', 'senalar', 'proponer-orden'].includes(a.id),
          )}
          alHacer={aplicarVista}
        />
      </Pantalla>

      <BarraDeSenalar yaSenalo={Boolean(vista.miAcusacion)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// La cámara profanada
// ---------------------------------------------------------------------------

/**
 * El anuncio de la profanación.
 *
 * VA ARRIBA DEL TODO Y OCUPA SITIO A PROPÓSITO. Es el dato del que depende la
 * única decisión de la vigilia, y es público: se lee en voz alta en el presagio.
 * Enterarse por una etiqueta pequeña al lado de una cámara de la lista sería
 * enterarse tarde, cuando ya estás decidiendo dónde entrar en vez de decidiendo
 * si te compensa.
 */
function Profanacion({
  nombre,
  siguiente,
}: {
  nombre?: string;
  /** Ya viene como NOMBRE, no como id: lo resuelve la proyeccion. */
  siguiente?: string;
}): JSX.Element | null {
  if (!nombre) return null;
  const nombreSiguiente = siguiente;
  return (
    <Animated.View entering={FadeInDown.duration(520)}>
      <View style={estilos.profanada}>
        <View style={estilos.profanadaFila}>
          <Grieta size={22} color={MOMIA.profanada} />
          <Etiqueta style={{ color: '#ffd9c9', flex: 1 }}>Esta noche está profanada</Etiqueta>
        </View>
        <Cuerpo
          style={[texto.titulo, { color: '#ffe6da', fontSize: 22, marginTop: 6, lineHeight: 28 }]}
        >
          {nombre}
        </Cuerpo>
        <Cuerpo tenue style={{ marginTop: 6, fontSize: 15 }}>
          Quien entre saldrá con un fragmento y con una marca.
        </Cuerpo>

        {/* Lo que ve el mecenas y nadie más. */}
        {nombreSiguiente && (
          <View style={estilos.soborno}>
            <Etiqueta style={{ color: MOMIA.amuleto }}>Lo que te han contado</Etiqueta>
            <Cuerpo style={{ marginTop: 4, fontSize: 16 }}>
              La próxima será <Cuerpo style={{ color: C.oro300 }}>{nombreSiguiente}</Cuerpo>. Nadie
              más lo sabe.
            </Cuerpo>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function FilaDeCamara({
  camara,
  dentro,
  profanada,
  bloqueada,
  onPress,
}: {
  camara: SalaVista;
  dentro: boolean;
  profanada: boolean;
  bloqueada: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${camara.name}${profanada ? ', profanada esta vigilia' : ''}`}
      accessibilityState={{ selected: dentro, disabled: bloqueada && !dentro }}
      onPress={onPress}
      disabled={bloqueada}
      style={({ pressed }) => [
        estilos.camara,
        profanada && estilos.camaraProfanada,
        dentro && estilos.camaraDentro,
        bloqueada && !dentro && { opacity: 0.45 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Foto
        url={camara.photoUrl}
        style={estilos.camaraFoto}
        respaldo={
          <View style={[estilos.camaraFoto, estilos.camaraFotoVacia]}>
            <Puerta size={24} color={conAlfa(C.pergaminoTenue, 0.5)} />
          </View>
        }
      />
      <View style={{ flex: 1 }}>
        <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 17 }}>{camara.name}</Cuerpo>
        <Cuerpo tenue style={{ fontSize: 15 }}>
          {camara.ocupantes === 0
            ? 'Vacía'
            : camara.ocupantes === 1
              ? 'Hay alguien dentro'
              : `${camara.ocupantes} personas dentro`}
        </Cuerpo>
      </View>
      {profanada && (
        <View style={estilos.marcaProfanada}>
          <Cuerpo style={{ color: '#ffd9c9', fontSize: 11, letterSpacing: 1 }}>MARCA</Cuerpo>
        </View>
      )}
      {dentro && <Cuerpo style={{ color: C.oro300, fontSize: 20 }}>✓</Cuerpo>}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// El don
// ---------------------------------------------------------------------------

/** Tu don, sin selector: para el vestíbulo y para el dosier. */
export function TarjetaDon({
  estado,
  compacta = false,
}: {
  estado: EstadoMomiaVisible;
  compacta?: boolean;
}): JSX.Element {
  /*
   * El rotulo y la frase salen del SERVIDOR cuando los manda, y de la tabla de
   * `dones.ts` cuando no. No es duplicar por duplicar: el servidor tiene la
   * redaccion canonica —la misma que va al dosier impreso— y la tabla de aqui
   * tiene ademas QUE HAY QUE ELEGIR, que el servidor no manda porque anunciarlo
   * seria anunciar quien tiene que don.
   */
  const don = DONES[estado.yo.don];
  const usado = estado.yo.donUsado;
  return (
    <View style={[estilos.don, compacta && { marginTop: espacio.md }]}>
      <View style={estilos.donFila}>
        <GlifoDeDon don={estado.yo.don} size={28} color={C.oro300} />
        <View style={{ flex: 1 }}>
          <Etiqueta style={{ color: MOMIA.amuleto }}>
            Tu don · {estado.yo.donRol || don.rol}
          </Etiqueta>
          <Cuerpo style={[texto.titulo, { color: C.oro300, fontSize: 19, marginTop: 2 }]}>
            {don.nombre}
          </Cuerpo>
        </View>
        {usado && <Cartucho tono="apagado">Usado</Cartucho>}
      </View>
      <Cuerpo tenue style={{ marginTop: espacio.sm, fontSize: 16 }}>
        {estado.yo.donQueHace || don.que}
      </Cuerpo>
      <Cuerpo tenue style={{ marginTop: 4, fontSize: 14, fontStyle: 'italic' }}>
        Una vez por vigilia. Nadie sabe cuál te ha tocado.
      </Cuerpo>
    </View>
  );
}

/**
 * Invocar el don, con el selector que corresponda.
 *
 * EL SELECTOR DEPENDE DEL DON, y por eso esto no lo puede pintar el panel
 * genérico de acciones: `invocar` se declara SIN `eligeDe` en el manifiesto
 * (a propósito), porque anunciar qué hay que elegir sería anunciar quién tiene
 * qué don. Cada persona ve el suyo y solo el suyo.
 */
function PanelDelDon({
  estado,
  vista,
  alHacer,
}: {
  estado: EstadoMomiaVisible;
  vista: VistaJugador;
  alHacer: (v: VistaJugador) => void;
}): JSX.Element | null {
  const [elegido, setElegido] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puede = vista.acciones.some((a) => a.id === 'invocar');
  const usado = estado.yo.donUsado;

  /*
   * CUÁL DE TUS DONES USAS, y para casi todo el mundo esto no existe: tienen
   * uno y este selector no se pinta. Para el saqueador son dos, y elegir es
   * exactamente la jugada del traidor —falsificar un fragmento y ponerlo sobre
   * la mesa como si lo hubiera encontrado—. Antes no había forma de decirlo: la
   * app mandaba siempre el don aparente y la mecánica central del juego no se
   * podía usar en ninguna parte.
   */
  const disponibles = estado.yo.donesDisponibles ?? [estado.yo.don];
  const [conCual, setConCual] = useState<DonId>(estado.yo.don);
  const activo: DonId = disponibles.includes(conCual) ? conCual : estado.yo.don;
  const don = DONES[activo];

  const opciones: Array<{ id: string; nombre: string }> =
    don.elige === 'persona'
      ? vista.jugadores
          .filter((j) => j.suspectId !== vista.yo.suspectId)
          .map((j) => ({ id: j.suspectId, nombre: j.characterName || j.displayName }))
      : don.elige === 'camara'
        ? vista.salas.map((s) => ({ id: s.id, nombre: s.name }))
        : don.elige === 'fragmento-propio'
          ? estado.yo.fragmentos
              .filter((f) => !f.publico)
              .map((f) => ({ id: f.id, nombre: f.texto }))
          : don.elige === 'fragmento-falso'
            ? (estado.yo.falsasOfrecidas ?? []).map((f) => ({ id: f.id, nombre: f.texto }))
            : [];

  const invocar = async (): Promise<void> => {
    if (don.elige !== 'nada' && !elegido) {
      setError('Te falta elegir.');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      /*
       * `don` va SIEMPRE, aunque solo haya uno: mandarlo solo cuando hay
       * elección haría que el caso raro fuese el único probado en la mesa.
       */
      const r = await api.hacerAccion('invocar', {
        ...codificarObjetivo(don.elige, elegido),
        don: activo,
      });
      alHacer(r.vista);
      setElegido(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo invocar el don.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Ornamento />
      <Seccion>Tu don</Seccion>
      <Marco style={estado.yo.don === 'falsificar' ? estilos.marcoSaqueador : undefined}>
        <TarjetaDon estado={estado} />
        <AvisoError>{error}</AvisoError>

        {!usado && puede && disponibles.length > 1 && (
          <View style={{ marginTop: espacio.lg }}>
            <Cuerpo tenue style={{ fontSize: 15 }}>¿Con cuál invocas esta vigilia?</Cuerpo>
            <View style={estilos.dones}>
              {disponibles.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => {
                    setConCual(d);
                    setElegido(null);
                    setError(null);
                  }}
                  style={[estilos.donOpcion, d === activo && estilos.donElegido]}
                >
                  <Cuerpo style={{ fontSize: 15 }}>{DONES[d].nombre}</Cuerpo>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {usado ? (
          <Cuerpo tenue style={{ marginTop: espacio.md, fontStyle: 'italic' }}>
            Ya lo has usado esta vigilia. Vuelve en la siguiente.
          </Cuerpo>
        ) : !puede ? (
          <Cuerpo tenue style={{ marginTop: espacio.md, fontStyle: 'italic' }}>
            Se invoca con la vigilia abierta.
          </Cuerpo>
        ) : (
          <>
            {don.elige !== 'nada' && (
              <View style={{ marginTop: espacio.lg }}>
                <Cuerpo tenue style={{ fontSize: 15 }}>{don.pregunta}</Cuerpo>
                {opciones.length === 0 ? (
                  <Cuerpo tenue style={{ marginTop: 6, fontStyle: 'italic' }}>
                    No hay nada que elegir todavía.
                  </Cuerpo>
                ) : (
                  <View style={estilos.opciones}>
                    {opciones.map((o) => {
                      const activo = elegido === o.id;
                      return (
                        <Pressable
                          key={o.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: activo }}
                          onPress={() => {
                            void Haptics.selectionAsync();
                            setElegido(activo ? null : o.id);
                          }}
                          style={({ pressed }) => [
                            estilos.opcion,
                            activo && estilos.opcionActiva,
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Cuerpo style={{ fontSize: 16, color: activo ? C.caoba900 : C.pergamino }}>
                            {o.nombre}
                          </Cuerpo>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
            <Boton
              variante="primario"
              cargando={enviando}
              disabled={don.elige !== 'nada' && opciones.length === 0}
              onPress={() => void invocar()}
              style={{ marginTop: espacio.lg }}
            >
              Invocar {don.nombre.toLowerCase()}
            </Boton>
          </>
        )}
      </Marco>
    </>
  );
}

// ---------------------------------------------------------------------------
// Los amuletos
// ---------------------------------------------------------------------------

/**
 * Dar un amuleto.
 *
 * NO PUEDES GASTARLO EN TI, y esa regla es el motor social del juego: si
 * pudieras, la mesa jugaría en silencio. Por eso la lista se pinta con la cuenta
 * de marcas de cada cual al lado —quien está a dos es a quien hay que ayudar— y
 * uno mismo no sale.
 */
function PanelDeAmuleto({
  estado,
  vista,
  alHacer,
}: {
  estado: EstadoMomiaVisible;
  vista: VistaJugador;
  alHacer: (v: VistaJugador) => void;
}): JSX.Element | null {
  const [aQuien, setAQuien] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!vista.acciones.some((a) => a.id === 'ofrendar')) return null;

  const dar = async (): Promise<void> => {
    if (!aQuien) {
      setError('Elige a quién se lo das.');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      alHacer((await api.hacerAccion('ofrendar', { aQuien })).vista);
      setAQuien(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo dar el amuleto.');
    } finally {
      setEnviando(false);
    }
  };

  const otros = vista.jugadores.filter((j) => j.suspectId !== vista.yo.suspectId);

  return (
    <>
      <Ornamento />
      <Seccion>Ofrendar</Seccion>
      <Marco>
        <Etiqueta>Te quedan {estado.yo.amuletos}</Etiqueta>
        <Cuerpo style={{ marginTop: 6 }}>
          Un amuleto quita una marca. <Cuerpo style={{ color: C.oro300 }}>No puedes gastarlo en ti</Cuerpo>
          , así que hay que pedirlo en voz alta.
        </Cuerpo>
        <AvisoError>{error}</AvisoError>

        {estado.yo.amuletos === 0 ? (
          <Cuerpo tenue style={{ marginTop: espacio.md, fontStyle: 'italic' }}>
            Ya has dado los dos. Eso te vale el trofeo de la Mano Abierta.
          </Cuerpo>
        ) : (
          <>
            <View style={{ marginTop: espacio.md, gap: espacio.sm }}>
              {otros.map((j) => {
                const suyo = estado.gente.find((g) => g.suspectId === j.suspectId);
                const activo = aQuien === j.suspectId;
                return (
                  <Pressable
                    key={j.suspectId}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setAQuien(activo ? null : j.suspectId);
                    }}
                    style={({ pressed }) => [
                      estilos.persona,
                      activo && estilos.personaActiva,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Cuerpo style={{ fontSize: 16 }}>{j.characterName || j.displayName}</Cuerpo>
                      {suyo && (
                        <Cuerpo
                          tenue
                          style={{
                            fontSize: 14,
                            color: suyo.tocado
                              ? MOMIA.profanada
                              : suyo.marcas >= 2
                                ? MOMIA.maldicion
                                : undefined,
                          }}
                        >
                          {suyo.tocado
                            ? 'Tocado · sin voz en el sellado'
                            : suyo.marcas === 0
                              ? 'Sin una marca'
                              : suyo.marcas === 1
                                ? 'Una marca'
                                : `${suyo.marcas} marcas · a una de quedar tocado`}
                        </Cuerpo>
                      )}
                    </View>
                    {activo && <Cuerpo style={{ color: C.oro300, fontSize: 18 }}>✓</Cuerpo>}
                  </Pressable>
                );
              })}
            </View>
            <Boton
              variante="primario"
              cargando={enviando}
              onPress={() => void dar()}
              style={{ marginTop: espacio.lg }}
            >
              Dar un amuleto
            </Boton>
          </>
        )}
      </Marco>
    </>
  );
}

// ---------------------------------------------------------------------------
// Señalar
// ---------------------------------------------------------------------------

/**
 * Señalar al saqueador, siempre a la vista.
 *
 * Es la misma decisión que se tomó en CLUEDO con acusar y por el mismo motivo,
 * traducida: si hay que esperar a que alguien abra un momento para señalar, la
 * decisión deja de tener precio. Aquí además hay una vuelta de tuerca propia —el
 * saqueador también señala, y le conviene señalar a otro— que solo funciona si
 * la puerta está abierta todo el rato.
 *
 * Anclada por encima de las pestañas contando `ALTO_BARRA_TOTAL`, que incluye el
 * saliente del botón del asistente: restando solo el alto de la barra se
 * solaparía justo con el botón más pulsado de la app.
 */
function BarraDeSenalar({ yaSenalo }: { yaSenalo: boolean }): JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInUp.duration(400)}
      style={[estilos.barraSenalar, { bottom: ALTO_BARRA_TOTAL + insets.bottom }]}
    >
      <View style={{ flex: 1 }}>
        <Etiqueta style={{ color: yaSenalo ? C.laton : '#ffd9c9' }}>
          {yaSenalo ? 'Tu dedo está puesto' : 'Alguien abrió el sello'}
        </Etiqueta>
        <Cuerpo tenue style={{ fontSize: 13, marginTop: 2 }}>
          {yaSenalo ? 'Señalado. Ya no se puede cambiar.' : 'Una sola vez, y para toda la noche.'}
        </Cuerpo>
      </View>
      {!yaSenalo && (
        <Boton variante="peligro" onPress={() => router.push('/acusar')}>
          Señalar
        </Boton>
      )}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingTop: espacio.xl },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    marginBottom: espacio.lg,
  },
  marcoListo: {
    borderColor: C.oro400,
    backgroundColor: conAlfa(C.oro500, 0.12),
  },
  marcoTocado: {
    borderColor: MOMIA.profanada,
    backgroundColor: conAlfa(MOMIA.profanada, 0.14),
  },
  /* Lo que sacas de la cámara: discreto, es un dato, no una alarma. */
  loQueSaque: {
    borderColor: conAlfa(MOMIA.fayenza, 0.55),
    backgroundColor: conAlfa(MOMIA.fayenza, 0.1),
  },

  /* Los dos dones del saqueador, uno al lado del otro. */
  dones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.sm },
  donOpcion: {
    borderWidth: 1,
    borderColor: conAlfa(MOMIA.lapis, 0.9),
    borderRadius: radio.sm,
    paddingHorizontal: espacio.md,
    paddingVertical: 8,
  },
  donElegido: {
    borderColor: MOMIA.profanada,
    backgroundColor: conAlfa(MOMIA.profanada, 0.14),
  },

  /* Al saqueador se le tiñe el panel de su don: es el único que ve este borde. */
  marcoSaqueador: {
    borderColor: conAlfa(MOMIA.profanada, 0.7),
    backgroundColor: conAlfa(MOMIA.profanada, 0.1),
  },

  profanada: {
    borderWidth: 1,
    borderColor: MOMIA.profanada,
    backgroundColor: conAlfa(MOMIA.profanada, 0.2),
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginBottom: espacio.md,
  },
  profanadaFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  soborno: {
    marginTop: espacio.md,
    paddingTop: espacio.md,
    borderTopWidth: 1,
    borderTopColor: conAlfa(MOMIA.amuleto, 0.4),
  },

  camara: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderWidth: 1,
    borderColor: conAlfa(C.laton, 0.25),
    backgroundColor: conAlfa(C.caoba900, 0.55),
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  camaraProfanada: {
    borderColor: conAlfa(MOMIA.profanada, 0.75),
    backgroundColor: conAlfa(MOMIA.profanada, 0.13),
  },
  camaraDentro: {
    borderColor: C.oro400,
    backgroundColor: conAlfa(C.oro500, 0.14),
  },
  camaraFoto: { width: 52, height: 52, borderRadius: radio.sm },
  camaraFotoVacia: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: conAlfa(C.feltoscuro, 0.7),
  },
  marcaProfanada: {
    borderWidth: 1,
    borderColor: MOMIA.profanada,
    borderRadius: radio.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  don: {
    borderWidth: 1,
    borderColor: conAlfa(MOMIA.amuleto, 0.35),
    backgroundColor: conAlfa(MOMIA.lapis, 0.3),
    borderRadius: radio.md,
    padding: espacio.md,
  },
  donFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },

  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.sm },
  opcion: {
    borderWidth: 1,
    borderColor: conAlfa(C.oro500, 0.32),
    backgroundColor: conAlfa(C.caoba900, 0.5),
    borderRadius: radio.md,
    paddingVertical: 9,
    paddingHorizontal: espacio.md,
  },
  opcionActiva: { backgroundColor: C.oro400, borderColor: C.oro300 },

  persona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderWidth: 1,
    borderColor: conAlfa(C.laton, 0.25),
    backgroundColor: conAlfa(C.caoba900, 0.5),
    borderRadius: radio.md,
    paddingVertical: 11,
    paddingHorizontal: espacio.md,
  },
  personaActiva: {
    borderColor: MOMIA.amuleto,
    backgroundColor: conAlfa(MOMIA.amuleto, 0.14),
  },

  barraSenalar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ALTO_SENALAR,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingHorizontal: espacio.lg,
    borderTopWidth: 1,
    borderTopColor: MOMIA.profanada,
    // Opaca a propósito: debajo pasa el scroll de las cámaras.
    backgroundColor: '#2a1108',
  },
});
