/**
 * El Sellado: ordenar los cinco ritos y entregar tu propuesta.
 *
 * ═══ POR QUÉ BOTONES Y NO ARRASTRAR ═══
 *
 * Arrastrar y soltar es lo que pide el cuerpo al ver una lista ordenable, y aquí
 * se ha descartado a conciencia. La condición real de uso es esta: de pie, en el
 * pasillo de una casa, con media luz, con gente hablando, con prisa y con una
 * sola mano. En esas condiciones un `drag` falla de tres formas que no se pueden
 * arreglar del todo:
 *
 *   · Compite con el desplazamiento vertical de la pantalla. El gesto es el
 *     mismo —dedo abajo, arrastrar— y hay que desambiguarlo con una pulsación
 *     larga, que nadie descubre solo y que se rompe si mueves el dedo un pelo
 *     antes de tiempo.
 *   · Si se suelta fuera de sitio, la fila vuelve, y no queda claro si es que
 *     no se puede o es que has fallado.
 *   · En la web —y esta app se exporta a web y se juega en el navegador— el
 *     mismo código tiene que servir para ratón y para dedo, y ahí el número de
 *     casos raros se multiplica.
 *
 * Dos botones de subir y bajar no fallan nunca, se entienden sin explicación,
 * funcionan con teclado y con lector de pantalla, y se pueden hacer grandes. La
 * ganancia de arrastrar era la elegancia; el coste era entregar mal el orden la
 * única noche que importa. Lo que sí se conserva de la elegancia es el
 * MOVIMIENTO: las filas se deslizan a su sitio nuevo con `Layout`, así que se ve
 * lo que ha pasado en vez de aparecer la lista ya cambiada.
 *
 * ═══ Y POR QUÉ SE CONFIRMA ANTES DE ENTREGAR ═══
 *
 * Porque no se puede cambiar. Un botón que hace algo irreversible al primer
 * toque, en una pantalla donde acabas de estar tocando botones pequeños de subir
 * y bajar, se pulsa sin querer. El paso de confirmación enseña el orden completo
 * escrito de otra manera —en línea, numerado— que además es la última ocasión de
 * ver un fallo de bulto.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
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
} from '../../src/ui';
import { conAlfa } from '../../src/tema-juego';
import { COLOR_MOMIA as C, MOMIA } from '../../src/tema-momia';
import { Cartucho } from '../../src/momia/piezas';
import { codificarOrden, leerEstadoMomia, type RitoVisible } from '../../src/momia/vista';

export default function Sellado(): JSX.Element {
  const { vista, cargando, aplicarVista } = usePartida();
  const estado = useMemo(() => leerEstadoMomia(vista?.estadoDelJuego), [vista?.estadoDelJuego]);

  const [orden, setOrden] = useState<RitoVisible[]>([]);
  /*
   * Si has vuelto a abrir tu propuesta para cambiarla.
   *
   * Vive solo en el movil: el servidor no distingue «entregada» de «entregada y
   * la estoy repensando», y no tiene por que. Lo que el servidor dice es si
   * admite otra, y eso llega en `vista.acciones`.
   */
  const [reabierto, setReabierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * El orden de trabajo arranca en el que declara la partida, y se siembra en un
   * efecto y no en el `useState` porque los ritos llegan del servidor: al montar
   * la pantalla la lista suele estar vacía todavía. La condición mira `length`
   * para no pisar lo que ya hayas movido cada vez que llegue una vista nueva
   * —que llega cada vez que alguien hace cualquier cosa en la partida— y es de
   * esos fallos que solo aparecen con más gente jugando.
   */
  useEffect(() => {
    if (estado && estado.ritos.length > 0 && orden.length === 0) setOrden(estado.ritos);
  }, [estado, orden.length]);

  if (cargando && !vista) return <Pantalla><Cargando texto="Buscando el sellado…" /></Pantalla>;

  if (!estado) {
    return (
      <Pantalla>
        <Titulo>El Sellado</Titulo>
        <Marco>
          <Cuerpo tenue>
            Todavía no hay ritos que ordenar. Aparecerán en cuanto la partida esté en marcha.
          </Cuerpo>
        </Marco>
      </Pantalla>
    );
  }

  const nombreDe = (id: string): string => estado.ritos.find((r) => r.id === id)?.nombre ?? id;

  // ---- Ya se ha ejecutado el sellado ----
  if (estado.sellado) {
    const { correcto, ordenEjecutado } = estado.sellado;
    return (
      <Pantalla>
        <Animated.View entering={FadeIn.duration(600)} style={estilos.centro}>
          <Sello>{correcto ? 'La tumba está sellada' : 'Amaneció abierta'}</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.lg }}>
            {correcto ? 'Gana la expedición' : 'Gana el saqueador'}
          </Titulo>
        </Animated.View>
        <Ornamento />
        <Seccion>El orden que se ejecutó</Seccion>
        {ordenEjecutado.map((id, i) => (
          <FilaEjecutada key={id} numero={i + 1} nombre={nombreDe(id)} bien={correcto} />
        ))}
        <Boton variante="primario" onPress={() => router.push('/desenlace')} style={{ marginTop: espacio.lg }}>
          Ver cómo acabó
        </Boton>
      </Pantalla>
    );
  }

  /*
   * Que el servidor siga admitiendo propuestas. Se calcula ANTES de la rama de
   * abajo: estaba despues, y como la rama devolvia siempre, esta linea era
   * inalcanzable en cuanto entregabas una vez.
   */
  const puedeProponer = vista?.acciones.some((a) => a.id === 'proponer-orden') ?? false;

  /*
   * ---- Ya entregada ----
   *
   * ENTREGAR NO ES CERRAR, y la pantalla lo daba por cerrado para siempre. El
   * servidor admite una propuesta nueva en cada vigilia —la ultima que entregas
   * es la que cuenta— pero aqui se devolvia una vista de solo lectura que decia
   * «Ya no se puede cambiar» desde la primera vez. Quien se lo creia jugaba las
   * vigilias restantes con un orden que ya no defendia, y la unica salida era
   * no entregar hasta el final, que es lo contrario de lo que pide el juego.
   */
  if (estado.miPropuesta && !reabierto) {
    // Capturada aqui: dentro del callback del boton, TypeScript ya no puede dar
    // por hecho que sigue definida.
    const entregada = estado.miPropuesta;
    return (
      <Pantalla>
        <Animated.View entering={FadeInDown.duration(480)} style={estilos.centro}>
          <Sello>Entregado</Sello>
          <Titulo style={{ textAlign: 'center', marginTop: espacio.md }}>Tu sellado</Titulo>
          <Cuerpo tenue style={{ textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
            {puedeProponer
              ? 'Se ejecutará el orden que más apoyos reúna. Puedes cambiarlo mientras la vigilia siga abierta.'
              : 'Ya no se puede cambiar. Se ejecutará el orden que más apoyos reúna.'}
          </Cuerpo>
        </Animated.View>

        <Ornamento />

        {entregada.orden.map((id, i) => (
          <Animated.View key={id} entering={FadeInUp.delay(60 * i).duration(420)}>
            <View style={[estilos.fila, estilos.filaEntregada]}>
              <Numero n={i + 1} />
              <Cartucho style={{ flex: 1 }}>{nombreDe(id)}</Cartucho>
            </View>
          </Animated.View>
        ))}

        {estado.yo.tocado && (
          <Marco tono="peligro" style={{ marginTop: espacio.lg }}>
            <Etiqueta style={{ color: '#ffd9c9' }}>Estás tocado</Etiqueta>
            <Cuerpo style={{ marginTop: 6 }}>
              Tres marcas. Tu propuesta ya no cuenta en la votación, pero sigues en la mesa y
              sigues pudiendo señalar. Convence a alguien que sí cuente.
            </Cuerpo>
          </Marco>
        )}

        {puedeProponer && (
          <Boton
            onPress={() => {
              // Se siembra con lo que entregaste, no con el orden de partida:
              // vuelves a donde lo dejaste y mueves desde ahi.
              const entregado = entregada.orden
                .map((id) => estado.ritos.find((r) => r.id === id))
                .filter((r): r is RitoVisible => Boolean(r));
              setOrden(entregado.length === estado.ritos.length ? entregado : estado.ritos);
              setReabierto(true);
            }}
            style={{ marginTop: espacio.lg }}
          >
            Cambiar mi orden
          </Boton>
        )}

        <PanelSenalar />
        <Recuento entregadas={estado.propuestasEntregadas} />
      </Pantalla>
    );
  }

  // ---- Ordenar y entregar ----

  const mover = (desde: number, hacia: number): void => {
    if (hacia < 0 || hacia >= orden.length) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOrden((antes) => {
      const copia = [...antes];
      const [pieza] = copia.splice(desde, 1);
      if (pieza) copia.splice(hacia, 0, pieza);
      return copia;
    });
  };

  const entregar = async (): Promise<void> => {
    setError(null);
    setEnviando(true);
    try {
      const r = await api.hacerAccion('proponer-orden', codificarOrden(orden.map((x) => x.id)));
      aplicarVista(r.vista);
      /*
       * Y SE VUELVE A LA VISTA DE ENTREGADO.
       *
       * Antes de que se pudiera reabrir la propuesta esto no hacia falta: en
       * cuanto `miPropuesta` existia, el componente salia por la rama de solo
       * lectura y daba igual como quedaran las banderas. Con `reabierto` puesto
       * esa rama ya no se toma, asi que al volver a entregar la pantalla se
       * quedaba en modo edicion —con la lista arrastrable y el dialogo de
       * confirmar colgado— como si no hubieras entregado nada.
       */
      setReabierto(false);
      setConfirmando(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo entregar el sellado.');
      setConfirmando(false);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <Animated.View entering={FadeInDown.duration(480)} style={estilos.centro}>
        <Sello>Antes del amanecer</Sello>
        <Titulo style={{ textAlign: 'center', marginTop: espacio.md }}>El Sellado</Titulo>
        <Cuerpo tenue style={{ textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
          Cinco ritos, un solo orden bueno. Se ejecuta el que más apoyos reúna.
        </Cuerpo>
      </Animated.View>

      <Ornamento />

      <AvisoError>{error}</AvisoError>

      {estado.yo.tocado && (
        <Marco tono="peligro">
          <Etiqueta style={{ color: '#ffd9c9' }}>Estás tocado</Etiqueta>
          <Cuerpo style={{ marginTop: 6 }}>
            Con tres marcas tu propuesta ya no cuenta en la votación. Puedes entregarla igual, pero
            lo que de verdad te queda es convencer a quien sí cuenta.
          </Cuerpo>
        </Marco>
      )}

      <Seccion>Ponlos en orden</Seccion>
      <Cuerpo tenue style={{ fontSize: 16, marginBottom: espacio.md }}>
        El primero arriba. Mira el papiro si necesitas repasar los fragmentos.
      </Cuerpo>

      {orden.map((rito, i) => (
        <Animated.View key={rito.id} layout={Layout.springify().damping(18)}>
          <View style={estilos.fila}>
            <Numero n={i + 1} />
            <View style={{ flex: 1 }}>
              <Cartucho tono="oro">{rito.nombre}</Cartucho>
              {rito.descripcion ? (
                <Cuerpo tenue style={{ fontSize: 14, lineHeight: 19, marginTop: 4 }}>
                  {rito.descripcion}
                </Cuerpo>
              ) : null}
            </View>
            <View style={estilos.flechas}>
              <Flecha
                arriba
                inactiva={i === 0}
                etiqueta={`Subir ${rito.nombre}`}
                onPress={() => mover(i, i - 1)}
              />
              <Flecha
                arriba={false}
                inactiva={i === orden.length - 1}
                etiqueta={`Bajar ${rito.nombre}`}
                onPress={() => mover(i, i + 1)}
              />
            </View>
          </View>
        </Animated.View>
      ))}

      <Ornamento />

      {!puedeProponer ? (
        <Marco>
          <Etiqueta>Todavía no</Etiqueta>
          <Cuerpo tenue style={{ marginTop: 6 }}>
            Quien dirige aún no ha abierto el momento de entregar el sellado. Puedes ir dejando el
            orden preparado aquí: se queda como lo dejes.
          </Cuerpo>
        </Marco>
      ) : !confirmando ? (
        <Boton variante="primario" onPress={() => setConfirmando(true)}>
          Entregar este orden
        </Boton>
      ) : (
        <Animated.View entering={FadeInUp.duration(380)}>
          <Marco tono="peligro">
            <Etiqueta style={{ color: '#ffd9c9' }}>Una sola vez</Etiqueta>
            <Cuerpo style={{ marginTop: 6 }}>Vas a entregar, y esto no se puede cambiar:</Cuerpo>
            <View style={estilos.tira}>
              {orden.map((r, i) => (
                <Cuerpo key={r.id} style={{ fontSize: 16 }}>
                  <Cuerpo style={{ color: C.oro300 }}>{i + 1}. </Cuerpo>
                  {r.nombre}
                </Cuerpo>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: espacio.sm, marginTop: espacio.lg }}>
              <Boton style={{ flex: 1 }} onPress={() => setConfirmando(false)}>
                Volver
              </Boton>
              <Boton
                style={{ flex: 1.4 }}
                variante="primario"
                cargando={enviando}
                onPress={() => void entregar()}
              >
                Sellar así
              </Boton>
            </View>
          </Marco>
        </Animated.View>
      )}

      <PanelSenalar />
      <Recuento entregadas={estado.propuestasEntregadas} />
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------
// Piezas de la pantalla
// ---------------------------------------------------------------------------

/**
 * Señalar al saqueador.
 *
 * NO SE VUELVE A IMPLEMENTAR AQUÍ, y es lo que hay que entender de este panel:
 * el diseño dice que `senalar` va con la maquinaria de acusación que ya existe,
 * y esa maquinaria ya es genérica —la pantalla de acusar recorre `vista.ejes`,
 * sean uno o cinco—. De ahí salen gratis, sin escribir una línea, las cuatro
 * reglas que el juego pide: una por persona, para toda la partida, no se puede
 * cambiar, y no se te dice si acertaste.
 *
 * Escribir aquí un selector propio habría sido más rápido de leer y habría
 * duplicado esas cuatro reglas en un sitio donde nadie las mantendría.
 */
function PanelSenalar(): JSX.Element {
  const { vista } = usePartida();
  const yaSenalo = Boolean(vista?.miRespuesta);
  const eje = vista?.ejes[0];

  return (
    <>
      <Ornamento />
      <Seccion>El saqueador</Seccion>
      <Marco tono={yaSenalo ? 'oscuro' : 'peligro'}>
        <Etiqueta style={{ color: yaSenalo ? C.laton : '#ffd9c9' }}>
          {yaSenalo ? 'Ya has señalado' : eje?.pregunta ?? '¿Quién rompió el sello?'}
        </Etiqueta>
        <Cuerpo style={{ marginTop: 6 }}>
          {yaSenalo
            ? 'Tu dedo ya está puesto y no se mueve. No sabrás si acertaste hasta el desenlace.'
            : 'Alguien de la expedición abrió el sello por encargo. Señalarlo va aparte del orden: puedes sellar bien y aun así no verlo.'}
        </Cuerpo>
        {!yaSenalo && (
          <Boton variante="peligro" onPress={() => router.push('/responder')} style={{ marginTop: espacio.lg }}>
            Señalar a alguien
          </Boton>
        )}
      </Marco>
    </>
  );
}

/**
 * Cuántas propuestas hay ya.
 *
 * El número y nada más: ni de quién ni cuáles. Saber que van seis de ocho mete
 * la prisa que tiene que haber; saber QUÉ ha propuesto cada cual convertiría la
 * votación en un recuento a la vista, y entonces nadie se molestaría en hablar.
 */
function Recuento({ entregadas }: { entregadas: number }): JSX.Element | null {
  if (entregadas <= 0) return null;
  return (
    <Cuerpo tenue style={{ textAlign: 'center', marginTop: espacio.lg, fontStyle: 'italic' }}>
      {entregadas === 1
        ? 'Hay una propuesta entregada.'
        : `Hay ${entregadas} propuestas entregadas.`}
    </Cuerpo>
  );
}

/** El número de lugar, dentro de un disco de piedra. */
function Numero({ n }: { n: number }): JSX.Element {
  return (
    <View style={estilos.numero}>
      <Cuerpo style={[texto.titulo, { color: C.oro300, fontSize: 17 }]}>{n}</Cuerpo>
    </View>
  );
}

/**
 * Subir o bajar.
 *
 * 46 de lado, por encima del mínimo de 44 que se puede pulsar sin apuntar: es
 * justo el control que hay que usar con una mano, de pie y sin mirar mucho. El
 * triángulo de dentro es pequeño a propósito —lo que hay que acertar es la zona,
 * no el dibujo— y la inactiva se queda puesta y apagada en vez de desaparecer,
 * porque una fila con un solo botón desalinea la columna entera y hace dudar de
 * si se ha roto algo.
 */
function Flecha({
  arriba,
  inactiva,
  etiqueta,
  onPress,
}: {
  arriba: boolean;
  inactiva: boolean;
  etiqueta: string;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: inactiva }}
      disabled={inactiva}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.flecha,
        inactiva && { opacity: 0.25 },
        pressed && !inactiva && { backgroundColor: conAlfa(C.oro500, 0.22), transform: [{ scale: 0.94 }] },
      ]}
    >
      <Cuerpo style={{ color: C.oro300, fontSize: 15, lineHeight: 18 }}>
        {arriba ? '▲' : '▼'}
      </Cuerpo>
    </Pressable>
  );
}

function FilaEjecutada({
  numero,
  nombre,
  bien,
}: {
  numero: number;
  nombre: string;
  bien: boolean;
}): JSX.Element {
  return (
    <View style={estilos.fila}>
      <Numero n={numero} />
      <Cartucho tono={bien ? 'oro' : 'apagado'} style={{ flex: 1 }}>
        {nombre}
      </Cartucho>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingTop: espacio.lg },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    marginBottom: espacio.sm,
    padding: espacio.sm,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: conAlfa(C.laton, 0.22),
    backgroundColor: conAlfa(C.caoba900, 0.55),
  },
  filaEntregada: {
    borderColor: conAlfa(MOMIA.amuleto, 0.45),
    backgroundColor: conAlfa(MOMIA.lapis, 0.35),
  },

  numero: {
    width: 34,
    height: 34,
    borderRadius: radio.redondo,
    borderWidth: 1,
    borderColor: conAlfa(C.oro500, 0.5),
    backgroundColor: conAlfa(C.oro500, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },

  flechas: { gap: 4 },
  flecha: {
    width: 46,
    height: 46,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: conAlfa(C.oro500, 0.4),
    backgroundColor: conAlfa(C.oro500, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },

  tira: {
    marginTop: espacio.md,
    gap: 2,
    paddingLeft: espacio.sm,
    borderLeftWidth: 2,
    borderLeftColor: conAlfa(C.oro500, 0.5),
  },
});
