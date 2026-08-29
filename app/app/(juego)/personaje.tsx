/**
 * Tu dosier: QUIÉN ERES. Nada más.
 *
 * Aquí cabía todo. La pantalla arrancaba con el retrato y a partir de ahí
 * encadenaba, sin jerarquía, tu papel, tu secreto, tu coartada, cómo
 * interpretarte, lo que sabes de los demás, los giros que te habían entregado,
 * el caso, las doce reglas del juego, la lista de objetos y la lista de gente
 * sentada a la mesa. Quien abría el dosier por primera vez —de pie, con una copa
 * en la mano y doce personas hablando— tenía que leerse una pantalla entera
 * antes de poder contestar a la única pregunta que se estaba haciendo: «¿y yo
 * quién soy?».
 *
 * Ahora esa pregunta se contesta en el primer golpe de vista y con dos líneas:
 * qué eres, y si fuiste tú. Lo demás se reparte por donde le toca:
 *
 *   · la trama y las reglas .......... a la pestaña de Ronda, que es por donde
 *     se entra a la partida y donde se leen una vez
 *   · lo que sabes, lo que encuentras
 *     y los giros ................... a la pestaña de Pistas, que es la que se
 *     consulta veinte veces por velada
 *   · los objetos y quién está en la
 *     mesa .......................... a Pistas también: son el material con el
 *     que se acusa, no parte de tu papel
 *
 * Lo que queda aquí es lo que no cambia en toda la noche, y por eso se puede
 * leer una vez y no volver: tu papel, tu secreto, tu motivo, tu coartada y qué
 * hacías tú mientras ocurría todo.
 *
 * ═══ Y LOS JUEGOS QUE NO TIENEN DÓNDE MUDARLO ═══
 *
 * Esta pantalla la comparten los tres juegos, pero el reparto de arriba solo
 * existe en CLUEDO: El Misterio de la Momia y El Paso de las Sombras no declaran
 * en su barra ni `cuaderno` ni `tablon`, y su pestaña de ronda es otra pantalla
 * entera —`Vigilia` y `Hora`— que no enseña la trama ni las reglas. Si a ellos se
 * les quitara lo mismo, esa información no quedaría en NINGÚN sitio de la app.
 *
 * Así que la pregunta no es «¿a qué se juega?» sino «¿existe la pestaña adonde
 * lo he mudado?». Se mira la barra del manifiesto, y quien no la tenga conserva
 * el dosier completo de siempre. La consecuencia importante es la dirección del
 * respaldo: un juego nuevo que no diga nada se queda con TODO en el dosier
 * —feo, pero íntegro— en vez de estrenarse perdiendo la mitad de su material
 * sin que nadie se entere hasta la noche de la partida.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { usePartida } from '../../src/estado';
import {
  Cargando,
  Cuerpo,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Sello,
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
} from '../../src/ui';
import { Foto } from '../../src/foto';
import { conAlfa, useTema } from '../../src/tema-juego';
import { TarjetaDon } from '../../src/momia/vigilia';
import { leerEstadoMomia } from '../../src/momia/vista';
import { leerEstadoSombras } from '../../src/sombras/vista';
import { Mon, TarjetaDisfraz } from '../../src/sombras/piezas';
import { manifiestoDe } from '../../../shared/juegos';

/**
 * Cada apartado del dosier va en su propia hoja.
 *
 * Todo seguido en un solo bloque, en una pantalla de móvil, se lee como un
 * muro: no se distingue dónde acaba tu coartada y empieza tu secreto. Separado
 * en hojas, cada cosa se lee como lo que es —una ficha aparte— y además se
 * puede volver a una concreta de un vistazo.
 */
function Hoja({
  etiqueta,
  valor,
  retardo = 0,
}: {
  etiqueta: string;
  valor: string;
  retardo?: number;
}): JSX.Element | null {
  if (!valor) return null;
  return (
    <Animated.View entering={FadeInUp.delay(retardo).duration(460)}>
      <Marco tono="papel" style={{ marginBottom: espacio.md }}>
        <Etiqueta style={{ color: color.burdeos700 }}>{etiqueta}</Etiqueta>
        <Cuerpo style={{ color: color.caoba700, marginTop: espacio.sm }}>{valor}</Cuerpo>
      </Marco>
    </Animated.View>
  );
}

/**
 * Lo que se le dice a quien lleva el papel que gana perdiendo.
 *
 * El texto era el de CLUEDO y lo leian los tres juegos, porque `soyCulpable` sale
 * de resolver el eje de jugadores de CUALQUIER manifiesto. Al saqueador de la
 * Momia se le explicaba que su partida es «que no te acierten» y que no señale a
 * nadie el primero: las dos cosas son falsas ahi —gana si la tumba no se sella
 * bien, y que le señalen no se lo quita—, asi que el consejo no solo no ayuda,
 * dirige mal. En El Paso de las Sombras, igual.
 *
 * CLUEDO se queda en el respaldo y sin entrada propia, para que su texto no pueda
 * moverse por descuido al tocar los otros.
 */
const CONSEJO_DE_CLUEDO =
  'Nadie más lo sabe. Tu partida no es acertar: es que no te acierten. Miente con ' +
  'cuidado, ofrece coartadas verificables y no seas el primero en señalar a nadie.';

const CONSEJO_DE_CULPABLE: Record<string, string> = {
  momia:
    'Nadie más lo sabe. Rompiste el sello, y ganas si la tumba NO se cierra en el orden ' +
    'bueno: que te señalen no te lo quita. Tienes una mentira por vigilia y nadie sabe que ' +
    'la tienes.',
  sombras:
    'Nadie más lo sabe. Ganas si la senda no se recorre como debe, no si nadie te señala. ' +
    'Siembra dudas donde más se decida y no defiendas demasiado pronto.',
};

/**
 * El veredicto, dicho en las palabras del juego que se juega.
 *
 * Es la segunda línea del dosier y la que más se busca, así que no puede decir
 * «asesino» en una expedición arqueológica. Va por juego y no por eje: el
 * manifiesto sabe qué eje señala a alguien de la mesa, pero su rótulo es
 * «Quién», que como veredicto no dice nada.
 *
 * CLUEDO en el respaldo y sin entrada propia, por lo mismo que el consejo de
 * arriba: para que su texto no se mueva al tocar los otros.
 */
const VEREDICTO_DE_CLUEDO = { si: 'Eres el asesino', no: 'No eres el asesino' };

const VEREDICTO: Record<string, { si: string; no: string }> = {
  momia: { si: 'Tú rompiste el sello', no: 'Tú no rompiste el sello' },
  sombras: { si: 'Tú eres quien traiciona', no: 'Tú no eres quien traiciona' },
};

export default function Personaje(): JSX.Element {
  const { vista } = usePartida();
  /*
   * El tema va ANTES del `return` de abajo. Es un hook, y React los identifica
   * por su orden de llamada: dejarlo detrás haría que en el primer renderizado
   * —sin vista todavía— se llamara uno y en el siguiente dos, y React tira la
   * pantalla con «rendered more hooks than during the previous render». Y no es
   * un caso raro: ese primer renderizado sin vista es el que ve TODO el mundo al
   * abrir el dosier, porque la vista llega del servidor.
   */
  const t = useTema();
  if (!vista) return <Pantalla><Cargando /></Pantalla>;
  const { yo, sesion } = vista;
  /*
   * EL DON VA EN EL DOSIER, y va aquí y no en una pantalla propia porque es lo
   * que es: una sección más de tu papel, la que dice qué puedes hacer tú y nadie
   * más. El manifiesto de la Momia lo declara así —`SECCIONES_MOMIA` tiene una
   * sección `don` marcada como obligatoria— y es también la que más se consulta
   * durante la noche, de ahí que vaya arriba del todo y no al final.
   *
   * SE PREGUNTA PRIMERO A QUÉ SE JUEGA, y no basta con mirar el estado. Era
   * `leerEstadoMomia(vista.estadoDelJuego)` a secas, y esa función solo exige que
   * el estado sea un objeto con un `yo` dentro —no mira ni una clave propia de la
   * Momia—. El Paso de las Sombras manda exactamente eso, así que devolvía un
   * estado bueno con el don caído al de respaldo y la pantalla pintaba «Tu don ·
   * Epigrafista», con la vigilia y los colores de la tumba, encima del disfraz.
   *
   * Para CLUEDO sigue siendo `null` y la pantalla queda exactamente como estaba:
   * ni un elemento de más en el árbol. Para la Momia se lee igual que siempre.
   */
  const consejoDeCulpable = CONSEJO_DE_CULPABLE[sesion.juego ?? ''] ?? CONSEJO_DE_CLUEDO;
  const veredicto = VEREDICTO[sesion.juego ?? ''] ?? VEREDICTO_DE_CLUEDO;
  const momia = sesion.juego === 'momia' ? leerEstadoMomia(vista.estadoDelJuego) : null;
  /*
   * Lo mismo para El Paso de las Sombras: el DISFRAZ es una sección obligatoria
   * de su dosier —`SECCIONES_SOMBRAS` la declara así— y es lo que más se
   * consulta durante la noche. Y va aquí también el ESTANDARTE, que en aquel
   * juego no existe: es público, sirve para que la gente se llame a gritos por
   * un pasillo a oscuras, y si no se lee en el dosier no se lee en ninguna parte.
   */
  const sombras = sesion.juego === 'sombras' ? leerEstadoSombras(vista.estadoDelJuego) : null;

  /*
   * ¿EXISTE LA PESTAÑA ADONDE SE HA MUDADO TODO LO DEMÁS?
   *
   * `cuaderno` es la de Pistas, que es la que recoge lo que sabes de los demás,
   * lo que encuentras, los giros, los objetos y quién está en la mesa. Un juego
   * que no la declare en su barra no tiene dónde leerlo, así que su dosier se
   * queda como estaba: entero. Se pregunta por la barra y no por el nombre del
   * juego a propósito —un cuarto juego no puede estrenarse perdiendo material
   * porque nadie se acordara de añadirlo a una lista de excepciones.
   */
  const manifiesto = manifiestoDe(sesion.juego);
  const dosierEntero = !manifiesto.barra.some((p) => p.pantalla === 'cuaderno');

  return (
    <Pantalla>
      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
        <Sello>Confidencial · solo para ti</Sello>
        <Foto
          url={yo.photoUrl}
          style={estilos.retrato}
          respaldo={
            <View
              style={[
                estilos.retrato,
                estilos.retratoVacio,
                // El verde fieltro estaba cosido aquí abajo, y era lo PRIMERO
                // que se veía del dosier: un disco verde de casino coronando una
                // pantalla de arena y lapislázuli.
                { backgroundColor: conAlfa(t.felt700, 0.6) },
              ]}
            >
              <Titulo style={{ fontSize: 32 }}>
                {yo.characterName.slice(0, 1).toUpperCase()}
              </Titulo>
            </View>
          }
        />
        <Titulo style={{ textAlign: 'center', fontSize: 26 }}>{yo.characterName}</Titulo>
      </Animated.View>

      {/*
        LA IDENTIDAD, EN UN SOLO GOLPE DE VISTA.

        Estas dos líneas —qué eres y si fuiste tú— estaban antes repartidas: el
        papel iba en gris pequeño bajo el retrato, como un subtítulo, y lo de ser
        culpable aparecía en un marco rojo cinco bloques más abajo, después de
        dos tarjetas que solo salen en otros juegos. Quien no era el culpable no
        veía NADA: la ausencia del marco rojo era toda la respuesta, y una
        ausencia no se lee, se deduce. Bastaba con no llegar a bajar para
        quedarse sin saberlo.

        Ahora las dos van juntas, arriba y grandes, y la inocencia se dice en voz
        alta igual que la culpa.
      */}
      <Animated.View entering={FadeInUp.delay(80).duration(500)}>
        <Marco style={estilos.identidad}>
          <Etiqueta style={{ textAlign: 'center' }}>Eres</Etiqueta>
          <Titulo style={estilos.papel}>{yo.role}</Titulo>
          <View
            style={[
              estilos.veredicto,
              yo.soyCulpable ? estilos.veredictoCulpable : estilos.veredictoInocente,
            ]}
          >
            <Cuerpo
              style={[
                estilos.veredictoTexto,
                { color: yo.soyCulpable ? '#f0c9c0' : color.oro300 },
              ]}
            >
              {yo.soyCulpable ? veredicto.si : veredicto.no}
            </Cuerpo>
          </View>
        </Marco>
      </Animated.View>

      {yo.soyCulpable && (
        <Animated.View entering={FadeInUp.delay(120).duration(500)}>
          <Marco tono="peligro">
            <Etiqueta style={{ color: '#f0c9c0' }}>Solo para ti</Etiqueta>
            <Cuerpo style={{ marginTop: espacio.sm }}>{consejoDeCulpable}</Cuerpo>
          </Marco>
        </Animated.View>
      )}

      {momia && (
        <Animated.View entering={FadeInUp.delay(150).duration(500)}>
          <TarjetaDon estado={momia} compacta />
        </Animated.View>
      )}

      {sombras && (
        <Animated.View entering={FadeInUp.delay(150).duration(500)}>
          <Marco>
            <TarjetaDisfraz
              rol={sombras.yo.papelRol}
              kanji={sombras.yo.papelKanji}
              queHace={sombras.yo.papelQueHace}
              usado={sombras.yo.papelUsado}
            />
            {sombras.yo.estandarteNombre ? (
              <View style={{ marginTop: espacio.md }}>
                <Etiqueta>Cruzas bajo el blasón de</Etiqueta>
                <View style={{ height: espacio.xs }} />
                <Mon>{sombras.yo.estandarteNombre}</Mon>
                <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.xs }}>
                  Es público: los demás lo saben y te llamarán por él.
                </Cuerpo>
              </View>
            ) : null}
          </Marco>
        </Animated.View>
      )}

      <Ornamento />

      <Hoja etiqueta="Quién crees ser ante los demás" valor={yo.publicPersona} retardo={160} />
      <Hoja etiqueta="Tu secreto" valor={yo.secret} retardo={220} />
      <Hoja etiqueta="Tu motivo" valor={yo.motive} retardo={280} />
      <Hoja etiqueta="Tu coartada" valor={yo.alibi} retardo={340} />

      {/*
        TU NOCHE, HORA A HORA.

        La coartada dice lo que tu personaje CUENTA que hizo. Esto dice lo que
        hizo de verdad, y no es lo mismo: la gracia de la mitad de los papeles
        está justo en la distancia entre las dos. Sin esta lista, sostener una
        coartada durante dos horas obligaba a reconstruir mentalmente la noche a
        partir de un párrafo, y en mitad de un interrogatorio eso no se hace.

        Solo salen los momentos en los que figura tu personaje, y el servidor
        retira además los que ocurrieron a puerta cerrada con el culpable
        delante: `proyeccion.ts` explica por qué.
      */}
      {yo.cronologiaPropia.length > 0 && (
        <>
          <Ornamento />
          <Seccion>Tu noche, hora a hora</Seccion>
          <Cuerpo tenue style={{ fontSize: 15, marginBottom: espacio.md }}>
            Lo que hizo tu personaje de verdad. Tu coartada es lo que cuentas; esto es lo que pasó.
          </Cuerpo>
          <Marco tono="papel">
            {yo.cronologiaPropia.map((m, i) => (
              <Animated.View
                key={`${m.time}-${i}`}
                entering={FadeInUp.delay(50 * i).duration(420)}
                style={[
                  estilos.momento,
                  i === yo.cronologiaPropia.length - 1 && estilos.momentoUltimo,
                ]}
              >
                <Cuerpo style={estilos.hora}>{m.time}</Cuerpo>
                <Cuerpo style={{ color: color.caoba700, flex: 1 }}>{m.description}</Cuerpo>
              </Animated.View>
            ))}
          </Marco>
        </>
      )}

      {/*
        ═══ EL DOSIER COMPLETO, PARA QUIEN NO TIENE PESTAÑA DE PISTAS ═══

        Todo lo de aquí abajo es exactamente lo que había antes, en el mismo
        orden y con los mismos rótulos. No es contenido nuevo ni una versión
        recortada: es el dosier de siempre, que se sigue pintando entero en los
        juegos cuya barra no declara `cuaderno`. En CLUEDO no se pinta nada de
        esto porque cada cosa tiene ya su sitio —la trama y las reglas en Ronda,
        lo demás en Pistas— y repetirlo aquí sería volver al muro que se ha
        deshecho.
      */}
      {dosierEntero && (
        <>
          <Hoja etiqueta="Cómo interpretarlo" valor={yo.personalHook} retardo={400} />

          <Seccion>Lo que sabes de los demás</Seccion>
          {yo.conocimiento.length === 0 ? (
            <Marco>
              <Cuerpo tenue>
                Todavía nada. Irás recordando cosas según avance la velada.
              </Cuerpo>
            </Marco>
          ) : (
            yo.conocimiento.map((k, i) => (
              <Animated.View key={i} entering={FadeInUp.delay(60 * i).duration(420)}>
                <Marco tono="papel">
                  <Cuerpo style={{ color: color.caoba700 }}>{k}</Cuerpo>
                </Marco>
              </Animated.View>
            ))
          )}
          {yo.conocimientoPendiente > 0 && (
            <Cuerpo tenue style={{ fontStyle: 'italic', fontSize: 15 }}>
              Aún recordarás {yo.conocimientoPendiente}{' '}
              {yo.conocimientoPendiente === 1 ? 'cosa más' : 'cosas más'} en próximas rondas.
            </Cuerpo>
          )}

          {yo.giros.length > 0 && (
            <>
              <Ornamento />
              <Seccion>Lo que acabas de descubrir</Seccion>
              {yo.giros.map((g) => (
                <Animated.View key={g.id} entering={FadeInUp.duration(520)}>
                  <Marco tono="peligro">
                    <Etiqueta style={{ color: '#f0c9c0' }}>Ronda {g.round}</Etiqueta>
                    <Cuerpo style={{ marginTop: espacio.sm }}>{g.instruction}</Cuerpo>
                  </Marco>
                </Animated.View>
              ))}
            </>
          )}

          <Ornamento />
          <Seccion>El caso</Seccion>
          <Hoja etiqueta="Qué ha ocurrido" valor={vista.caso.sinopsis} />
          <Hoja
            etiqueta={`La víctima · ${vista.caso.victima.nombre}`}
            valor={vista.caso.victima.descripcion}
          />
          <Hoja etiqueta="Dónde estáis" valor={vista.caso.ambientacion} />

          <Ornamento />
          <Seccion>Cómo se juega</Seccion>
          <Cuerpo tenue style={{ fontSize: 15, marginBottom: espacio.md }}>
            Aunque nunca hayas jugado, con esto te basta.
          </Cuerpo>
          {vista.caso.reglas.map((regla, i) => {
            const punto = regla.indexOf('. ');
            const titulo = punto > 0 ? regla.slice(0, punto) : `Regla ${i + 1}`;
            const cuerpo = punto > 0 ? regla.slice(punto + 2) : regla;
            return (
              <Hoja key={i} etiqueta={titulo} valor={cuerpo} retardo={Math.min(i * 40, 320)} />
            );
          })}

          <Ornamento />
          <Seccion>Los objetos</Seccion>
          <Marco>
            {vista.objetos.map((o) => (
              <View key={o.id} style={estilos.fila}>
                <Cuerpo style={{ flex: 1, fontSize: 16 }}>{o.name}</Cuerpo>
                {o.description ? (
                  <Cuerpo tenue style={{ flex: 1, fontSize: 14 }}>{o.description}</Cuerpo>
                ) : null}
              </View>
            ))}
          </Marco>

          <Ornamento />
          <Seccion>En la mesa</Seccion>
          {vista.jugadores.map((j) => (
            <View key={j.suspectId} style={estilos.fila}>
              <View
                style={[
                  estilos.punto,
                  { backgroundColor: j.conectado ? color.oro400 : 'rgba(217,201,163,0.25)' },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Cuerpo style={{ fontFamily: 'Cinzel_600SemiBold', fontSize: 16 }}>
                  {j.characterName}
                </Cuerpo>
                <Cuerpo tenue style={{ fontSize: 14 }}>
                  {j.displayName}
                  {j.salaActual ? ` · en ${j.salaActual}` : ''}
                  {j.yaAcuso ? ' · ya acusó' : ''}
                </Cuerpo>
              </View>
            </View>
          ))}
        </>
      )}

      {/*
        El código de la partida, que es lo que se teclea para volver a emparejar
        un móvil. No se enseña en ninguna otra pantalla de la app, así que si se
        va de aquí se va del todo: quien cierre la app a mitad de velada se queda
        fuera sin nadie a quien preguntar.
      */}
      <Cuerpo tenue style={{ fontSize: 14, marginTop: espacio.lg, textAlign: 'center' }}>
        Código de la partida: {sesion.code}
      </Cuerpo>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  retrato: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: color.oro500,
    marginVertical: espacio.lg,
  },
  retratoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  identidad: {
    alignItems: 'stretch',
    borderColor: color.oro400,
  },
  papel: {
    textAlign: 'center',
    fontSize: 22,
    marginTop: 2,
    marginBottom: espacio.md,
  },
  veredicto: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,162,39,0.28)',
    paddingTop: espacio.md,
    alignItems: 'center',
  },
  veredictoCulpable: { borderTopColor: color.burdeos600 },
  veredictoInocente: {},
  veredictoTexto: {
    fontFamily: 'Cinzel_600SemiBold',
    fontSize: 18,
    letterSpacing: 1,
    textAlign: 'center',
  },
  momento: {
    flexDirection: 'row',
    gap: espacio.md,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(62,39,35,0.18)',
  },
  momentoUltimo: { borderBottomWidth: 0 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.15)',
  },
  punto: { width: 8, height: 8, borderRadius: radio.redondo },
  hora: {
    fontFamily: 'Cinzel_600SemiBold',
    color: color.burdeos700,
    fontSize: 15,
    width: 58,
  },
});
