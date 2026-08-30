/**
 * Los bloques con los que se arma un dosier, y la tabla que los nombra.
 *
 * ═══ QUÉ ES ESTO ═══
 *
 * `app/app/(juego)/personaje.tsx` es UNA pantalla que comparten todos los
 * juegos. Antes decidía ella qué pintar, y por eso pintaba lo mismo para todos:
 * el dosier de CLUEDO, con las palabras de CLUEDO, en el orden de CLUEDO. Al
 * reorganizarlo para CLUEDO hubo que meter un booleano para que la Momia y las
 * Sombras no perdieran la mitad de su material, y ese booleano ya eran dos
 * juegos compartiendo una rama.
 *
 * Ahora la pantalla no decide nada: recorre `manifiesto.dosier` y pide el bloque
 * que toca. Quien decide es cada juego, en su fichero, y su lista no puede
 * afectar a la de nadie más.
 *
 * ═══ LA TABLA ES UN `Record` CERRADO A PROPÓSITO ═══
 *
 * `BLOQUES` es un `Record<BloqueDeDosier, …>`, así que añadir un bloque a la
 * unión y olvidarse de escribirlo NO COMPILA. Es la misma disciplina que
 * `PANTALLAS` en `_layout.tsx` y `ICONOS` en `iconos.tsx`, y por la misma razón:
 * la app es un binario, y un bloque que no existe saldría en blanco en el móvil
 * sin dar ningún error, la noche de la partida.
 *
 * ═══ CÓMO SE AÑADE UN BLOQUE PARA UN JUEGO NUEVO ═══
 *
 * Se escribe el componente en la carpeta de ESE juego —`app/src/momia/`,
 * `app/src/sombras/`…—, se añade su id a `BloqueDeDosier` y se registra aquí.
 * No hay que tocar los bloques de los demás ni el orden de nadie.
 *
 * ═══ TODOS DEVUELVEN `null` CUANDO NO HAY NADA ═══
 *
 * Un juego puede declarar `'giros'` aunque esta partida no tenga ninguno
 * todavía. El bloque decide si se pinta; la pantalla solo los ordena.
 */
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Cuerpo,
  Etiqueta,
  Marco,
  Ornamento,
  Seccion,
  Titulo,
  color,
  espacio,
  radio,
} from '../ui';
import { TarjetaDon } from '../momia/vigilia';
import { leerEstadoMomia } from '../momia/vista';
import { leerEstadoSombras } from '../sombras/vista';
import { Mon, TarjetaDisfraz } from '../sombras/piezas';
import type { BloqueDeDosier, ManifiestoDeJuego } from '../../../shared/juegos';
import type { VistaJugador } from '../../../shared/live';

export interface PropsDeBloque {
  vista: VistaJugador;
  manifiesto: ManifiestoDeJuego;
}

export type Bloque = (p: PropsDeBloque) => JSX.Element | null;

// ---------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------

/**
 * Cada apartado del dosier va en su propia hoja.
 *
 * Todo seguido en un solo bloque, en una pantalla de móvil, se lee como un
 * muro: no se distingue dónde acaba tu coartada y empieza tu secreto. Separado
 * en hojas, cada cosa se lee como lo que es —una ficha aparte— y además se
 * puede volver a una concreta de un vistazo.
 */
export function Hoja({
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
 */
const VEREDICTO_DE_CLUEDO = { si: 'Eres el asesino', no: 'No eres el asesino' };

const VEREDICTO: Record<string, { si: string; no: string }> = {
  momia: { si: 'Tú rompiste el sello', no: 'Tú no rompiste el sello' },
  sombras: { si: 'Tú eres quien traiciona', no: 'Tú no eres quien traiciona' },
};

/**
 * Cómo llama este juego a sus cosas y a su gente.
 *
 * Sale del manifiesto y no de una constante: el bloque de las cosas decía «Los
 * objetos» y el de la gente «En la mesa» en los tres juegos, así que una
 * expedición leía «Los objetos» donde tiene reliquias y una columna que cruza un
 * monte de noche leía «En la mesa».
 */
function rotuloDeCosas(m: ManifiestoDeJuego): string {
  const cat = m.categorias.find((c) => c.almacenHeredado === 'weapons');
  return cat?.presentacion?.titulo ?? capitalizar(cat?.plural ?? 'objetos');
}

function rotuloDeGente(m: ManifiestoDeJuego): string {
  const cat = m.categorias.find((c) => c.sonJugadores);
  return capitalizar(cat?.plural ?? 'los demás');
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ---------------------------------------------------------------------------
// Los bloques
// ---------------------------------------------------------------------------

/**
 * LA IDENTIDAD, EN UN SOLO GOLPE DE VISTA.
 *
 * Estas dos líneas —qué eres y si fuiste tú— estaban repartidas: el papel iba en
 * gris pequeño bajo el retrato, como un subtítulo, y lo de ser culpable aparecía
 * en un marco rojo cinco bloques más abajo. Quien NO era el culpable no veía
 * nada: la ausencia del marco rojo era toda la respuesta, y una ausencia no se
 * lee, se deduce. Bastaba con no llegar a bajar para quedarse sin saberlo.
 *
 * Ahora las dos van juntas, arriba, y la inocencia se dice en voz alta igual que
 * la culpa.
 */
const Identidad: Bloque = ({ vista, manifiesto }) => {
  const { yo } = vista;
  const veredicto = VEREDICTO[manifiesto.id] ?? VEREDICTO_DE_CLUEDO;
  return (
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
            style={[estilos.veredictoTexto, { color: yo.soyCulpable ? '#f0c9c0' : color.oro300 }]}
          >
            {yo.soyCulpable ? veredicto.si : veredicto.no}
          </Cuerpo>
        </View>
      </Marco>
    </Animated.View>
  );
};

const Senalado: Bloque = ({ vista, manifiesto }) => {
  if (!vista.yo.soyCulpable) return null;
  const consejo = CONSEJO_DE_CULPABLE[manifiesto.id] ?? CONSEJO_DE_CLUEDO;
  return (
    <Animated.View entering={FadeInUp.delay(120).duration(500)}>
      <Marco tono="peligro">
        <Etiqueta style={{ color: '#f0c9c0' }}>Solo para ti</Etiqueta>
        <Cuerpo style={{ marginTop: espacio.sm }}>{consejo}</Cuerpo>
      </Marco>
    </Animated.View>
  );
};

/**
 * EL DON DE LA MOMIA. Es una sección obligatoria de su dosier —`SECCIONES_MOMIA`
 * lo declara así— y la que más se consulta durante la noche: dice qué puedes
 * hacer tú y nadie más.
 *
 * SE PREGUNTA PRIMERO A QUÉ SE JUEGA, y no basta con mirar el estado.
 * `leerEstadoMomia` solo exige que el estado sea un objeto con un `yo` dentro
 * —no mira ni una clave propia de la Momia— y El Paso de las Sombras manda
 * exactamente eso, así que devolvía un estado bueno con el don caído al de
 * respaldo y pintaba «Tu don · Epigrafista» encima del disfraz.
 *
 * Con el dosier declarado esto ya no puede pasar —solo la Momia declara el
 * bloque `don`— pero la guarda se queda: cuesta una línea y cierra la puerta.
 */
const Don: Bloque = ({ vista, manifiesto }) => {
  if (manifiesto.id !== 'momia') return null;
  const momia = leerEstadoMomia(vista.estadoDelJuego);
  if (!momia) return null;
  return (
    <Animated.View entering={FadeInUp.delay(150).duration(500)}>
      <TarjetaDon estado={momia} compacta />
    </Animated.View>
  );
};

/**
 * EL DISFRAZ DE LAS SOMBRAS, con el ESTANDARTE dentro. El estandarte es público
 * —sirve para que la gente se llame a gritos por un sendero a oscuras— y si no
 * se lee en el dosier no se lee en ninguna parte.
 */
const Disfraz: Bloque = ({ vista, manifiesto }) => {
  if (manifiesto.id !== 'sombras') return null;
  const sombras = leerEstadoSombras(vista.estadoDelJuego);
  if (!sombras) return null;
  return (
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
  );
};

const PersonaPublica: Bloque = ({ vista }) => (
  <Hoja etiqueta="Quién crees ser ante los demás" valor={vista.yo.publicPersona} retardo={160} />
);

const Secreto: Bloque = ({ vista }) => (
  <Hoja etiqueta="Tu secreto" valor={vista.yo.secret} retardo={220} />
);

const Motivo: Bloque = ({ vista }) => (
  <Hoja etiqueta="Tu motivo" valor={vista.yo.motive} retardo={280} />
);

const Coartada: Bloque = ({ vista }) => (
  <Hoja etiqueta="Tu coartada" valor={vista.yo.alibi} retardo={340} />
);

const Gancho: Bloque = ({ vista }) => (
  <Hoja etiqueta="Cómo interpretarlo" valor={vista.yo.personalHook} retardo={400} />
);

/**
 * TU NOCHE, HORA A HORA.
 *
 * La coartada dice lo que tu personaje CUENTA que hizo. Esto dice lo que hizo de
 * verdad, y no es lo mismo: la gracia de la mitad de los papeles está justo en la
 * distancia entre las dos. Sin esta lista, sostener una coartada durante dos
 * horas obligaba a reconstruir mentalmente la noche a partir de un párrafo, y en
 * mitad de un interrogatorio eso no se hace.
 *
 * Solo salen los momentos en los que figura tu personaje, y el servidor retira
 * además los que ocurrieron a puerta cerrada con el culpable delante:
 * `proyeccion.ts` explica por qué.
 */
const CronologiaPropia: Bloque = ({ vista }) => {
  const momentos = vista.yo.cronologiaPropia;
  if (momentos.length === 0) return null;
  return (
    <>
      <Ornamento />
      <Seccion>Tu noche, hora a hora</Seccion>
      <Cuerpo tenue style={{ fontSize: 15, marginBottom: espacio.md }}>
        Lo que hizo tu personaje de verdad. Tu coartada es lo que cuentas; esto es lo que pasó.
      </Cuerpo>
      <Marco tono="papel">
        {momentos.map((m, i) => (
          <Animated.View
            key={`${m.time}-${i}`}
            entering={FadeInUp.delay(50 * i).duration(420)}
            style={[estilos.momento, i === momentos.length - 1 && estilos.momentoUltimo]}
          >
            <Cuerpo style={estilos.hora}>{m.time}</Cuerpo>
            <Cuerpo style={{ color: color.caoba700, flex: 1 }}>{m.description}</Cuerpo>
          </Animated.View>
        ))}
      </Marco>
    </>
  );
};

const Conocimiento: Bloque = ({ vista, manifiesto }) => {
  const { yo } = vista;
  return (
    <>
      <Ornamento />
      <Seccion>Lo que sabes de {articuloDe(manifiesto)}</Seccion>
      {yo.conocimiento.length === 0 ? (
        <Marco>
          <Cuerpo tenue>Todavía nada. Irás recordando cosas según avance la velada.</Cuerpo>
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
    </>
  );
};

/** «los demás» dicho con la palabra del juego: los expedicionarios, la columna. */
function articuloDe(m: ManifiestoDeJuego): string {
  const cat = m.categorias.find((c) => c.sonJugadores);
  return cat ? `los ${cat.plural}` : 'los demás';
}

const Giros: Bloque = ({ vista }) => {
  if (vista.yo.giros.length === 0) return null;
  return (
    <>
      <Ornamento />
      <Seccion>Lo que acabas de descubrir</Seccion>
      {vista.yo.giros.map((g) => (
        <Animated.View key={g.id} entering={FadeInUp.duration(520)}>
          <Marco tono="peligro">
            <Etiqueta style={{ color: '#f0c9c0' }}>Ronda {g.round}</Etiqueta>
            <Cuerpo style={{ marginTop: espacio.sm }}>{g.instruction}</Cuerpo>
          </Marco>
        </Animated.View>
      ))}
    </>
  );
};

const Caso: Bloque = ({ vista }) => (
  <>
    <Ornamento />
    <Seccion>El caso</Seccion>
    <Hoja etiqueta="Qué ha ocurrido" valor={vista.caso.sinopsis} />
    {/* Sin victima no hay bloque. Antes salia «La victima · —». */}
    {vista.caso.victima ? (
      <Hoja
        etiqueta={`La víctima · ${vista.caso.victima.nombre}`}
        valor={vista.caso.victima.descripcion}
      />
    ) : null}
    <Hoja etiqueta="Dónde estáis" valor={vista.caso.ambientacion} />
  </>
);

const Reglas: Bloque = ({ vista }) => (
  <>
    <Ornamento />
    <Seccion>Cómo se juega</Seccion>
    <Cuerpo tenue style={{ fontSize: 15, marginBottom: espacio.md }}>
      Aunque nunca hayas jugado, con esto te basta.
    </Cuerpo>
    {vista.caso.reglas.map((regla, i) => {
      const punto = regla.indexOf('. ');
      const titulo = punto > 0 ? regla.slice(0, punto) : `Regla ${i + 1}`;
      const cuerpo = punto > 0 ? regla.slice(punto + 2) : regla;
      return <Hoja key={i} etiqueta={titulo} valor={cuerpo} retardo={Math.min(i * 40, 320)} />;
    })}
  </>
);

const Cosas: Bloque = ({ vista, manifiesto }) => {
  if (vista.objetos.length === 0) return null;
  return (
    <>
      <Ornamento />
      <Seccion>{rotuloDeCosas(manifiesto)}</Seccion>
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
    </>
  );
};

const Mesa: Bloque = ({ vista, manifiesto }) => (
  <>
    <Ornamento />
    <Seccion>{rotuloDeGente(manifiesto)}</Seccion>
    {vista.jugadores.map((j) => (
      <View key={j.participanteId} style={estilos.fila}>
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
);

/**
 * La tabla. Un `Record` cerrado sobre la unión: añadir un bloque a
 * `BloqueDeDosier` y no escribirlo aquí NO COMPILA.
 */
export const BLOQUES: Record<BloqueDeDosier, Bloque> = {
  identidad: Identidad,
  senalado: Senalado,
  'persona-publica': PersonaPublica,
  secreto: Secreto,
  motivo: Motivo,
  coartada: Coartada,
  gancho: Gancho,
  'cronologia-propia': CronologiaPropia,
  conocimiento: Conocimiento,
  giros: Giros,
  caso: Caso,
  reglas: Reglas,
  cosas: Cosas,
  mesa: Mesa,
  don: Don,
  disfraz: Disfraz,
};

const estilos = StyleSheet.create({
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
  hora: {
    fontFamily: 'Cinzel_600SemiBold',
    color: color.burdeos700,
    fontSize: 15,
    width: 58,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: espacio.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201,162,39,0.15)',
  },
  punto: { width: 8, height: 8, borderRadius: radio.redondo },
});
