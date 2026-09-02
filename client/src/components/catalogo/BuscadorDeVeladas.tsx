/**
 * El buscador de la portada.
 *
 * ═══ TIENE QUE PODER NO VERSE ═══
 *
 * La portada es un cartel: rayos dorados, un logotipo de cine mudo y seis cajas
 * en una estantería. Un buscador con su caja gris, su borde y su botón azul de
 * «Buscar» la convierte en un panel de administración, y eso es exactamente lo
 * que no se quiere.
 *
 * Así que aquí no hay ninguna caja. Hay UN RENGLÓN —un filete de oro con una
 * lupa delante—, que es un objeto que ya existe en esta estética: es la línea
 * sobre la que se escribe a mano en una ficha de archivo. El campo no tiene
 * fondo ni borde; lo único que dice que se puede escribir ahí es el cursor y el
 * texto en cursiva de la invitación.
 *
 * ═══ Y LOS FILTROS, GUARDADOS ═══
 *
 * Cinco desplegables siempre a la vista son cinco cosas que decidir antes de
 * mirar los juegos, y con seis cajas en la estantería nadie los necesita
 * todavía. Viven detrás de «Afinar», que es una palabra y una punta de flecha.
 * Quien no los abra no sabrá que están; quien los abra los encuentra enteros.
 *
 * El día que haya treinta juegos, lo único que cambia es que convendrá abrirlos
 * por defecto. Está en una línea.
 *
 * ═══ POR QUÉ DESPLEGABLES DEL SISTEMA Y NO UNOS PROPIOS ═══
 *
 * Porque un `<select>` de verdad ya sabe abrirse con el teclado, leerse en voz
 * alta, funcionar en un móvil con la rueda nativa y cerrarse al tocar fuera.
 * Reescribir eso para poder pintarlo es la clase de trabajo que sale mal en el
 * caso que nadie prueba. Lo que sí se hace es quitarle TODA la pintura del
 * sistema —`appearance: none`— y dejarlo como lo que parece: una palabra dorada
 * subrayada. Se ve como texto y se comporta como un control.
 */
import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NOMBRE_DE_DIFICULTAD, NOMBRE_DE_MODO } from '../../../../shared/juegos';
import type { ModoDePartida, NivelDeDificultad } from '../../../../shared/juegos';
import type { Catalogable, Criterios } from '../../lib/catalogo';
import { algunoCumple, cuantosCriterios } from '../../lib/catalogo';

/** La lupa. Trazo fino y `currentColor`, como todo el arte de la portada. */
function Lupa() {
  return (
    <svg viewBox="0 0 24 24" className="buscador-lupa" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5L21 21" />
      </g>
    </svg>
  );
}

interface CampoProps {
  etiqueta: string;
  /**
   * El nombre con el que se anuncia, cuando el rótulo de la pantalla se queda
   * corto fuera de su sitio.
   *
   * «Seremos» tiene sentido leído en una fila junto a «Duración» y «Dónde»; a
   * secas, en la lista de controles de un lector de pantalla, no dice nada. Y
   * hace falta decírselo al control a mano porque el nombre que se calcula solo
   * acaba siendo el VALOR —los cinco desplegables se anunciaban «Cualquiera»,
   * los cinco iguales—, que es indistinguible.
   *
   * Empieza siempre por el rótulo visible: quien maneja la página por voz dice
   * lo que ve, y el nombre tiene que contener eso para que le responda.
   */
  descripcion?: string;
  valor: string;
  onCambio: (valor: string) => void;
  opciones: Array<{ valor: string; texto: string }>;
}

/**
 * Un filtro: su rótulo en versalitas y su valor en oro, sobre una línea de
 * puntos.
 *
 * ═══ EL `<select>` ES LO QUE SE VE, Y ESO COSTÓ UN INTENTO ═══
 *
 * La primera versión escondía el control con `opacity: 0` y pintaba su valor en
 * un `span` gemelo debajo, para que el ancho lo mandara el texto. Se veía
 * perfecto y estaba roto por donde no se ve: el `<label>` envuelve al control,
 * así que su nombre accesible se calcula con TODO lo que hay dentro, gemelo
 * incluido. Un lector de pantalla anunciaba literalmente
 * «DuraciónCualquiera▾Cualquiera1 hora o menos2 horas o menos…».
 *
 * Aquí no hay gemelo. El `<select>` de verdad se queda a la vista con
 * `appearance: none`, que le quita al sistema toda la pintura y no le quita
 * nada del comportamiento: sigue abriéndose con el teclado, sigue sacando la
 * rueda nativa en un móvil y sigue anunciándose como lo que es. Lo único que se
 * le añade es la punta de flecha, y va marcada como decoración para que no
 * entre en el nombre.
 *
 * El precio es que el control mide lo que mida su opción más larga en vez de
 * ajustarse a la elegida. Es un precio bueno: la fila deja de moverse cada vez
 * que se cambia un valor.
 */
function Campo({ etiqueta, descripcion, valor, onCambio, opciones }: CampoProps) {
  return (
    <label className="buscador-campo">
      <span className="buscador-campo-rotulo mono-caps">{etiqueta}</span>
      <span className="buscador-campo-caja">
        <select
          className={valor ? 'es-puesto' : undefined}
          aria-label={descripcion ?? etiqueta}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
        >
          {opciones.map((o) => (
            <option key={o.valor || 'cualquiera'} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
        <span className="buscador-campo-punta" aria-hidden="true">
          ▾
        </span>
      </span>
    </label>
  );
}

/*
 * LOS CANDIDATOS, que no son las opciones.
 *
 * Esto es todo lo que la portada SABRIA preguntar. Lo que de verdad se pinta
 * sale de cruzar esta lista con la estanteria, ahi abajo en `vivas`: una opcion
 * que ninguna caja puede cumplir no llega a la pantalla.
 *
 * Los numeros de aqui son el vocabulario, no una promesa. Que exista «1 hora o
 * menos» no dice que haya veladas de una hora; dice que el dia que la haya, el
 * desplegable sabra ofrecerla sin que nadie toque este fichero.
 */
const HORAS_POSIBLES = [1, 2, 3, 4];

/*
 * EMPIEZA EN CATORCE, Y NO ES UN RECORTE ESTETICO.
 *
 * Ofrecia 6, 8, 10 y 12. Los terminos que esta plataforma publica dicen que «no
 * esta dirigida a menores de catorce anos», asi que preguntar por el mas joven
 * de la mesa y sugerir «seis anos» era invitar a una mesa que el propio
 * servicio no admite. El suelo esta explicado en `FichaDeJuego.edadMinima`.
 */
const EDADES_POSIBLES = [14, 16, 18];

const DIFICULTADES_POSIBLES: NivelDeDificultad[] = [1, 2, 3, 4];

const CUANTOS_POSIBLES = Array.from({ length: 19 }, (_, i) => i + 2);

const MODOS_POSIBLES: ModoDePartida[] = ['en-vivo', 'en-vivo-y-online', 'online'];

const CUALQUIERA = { valor: '', texto: 'Cualquiera' };

/**
 * Las opciones que la estanteria puede cumplir de verdad, y solo esas.
 *
 * ═══ POR QUE SE CALCULA Y NO SE ESCRIBE ═══
 *
 * Escritas a mano, las listas se separaban de los datos en cuanto alguien tocaba
 * una ficha, y no avisaba nadie. Con las seis cajas de hoy habia SEIS opciones
 * muertas —«1 hora o menos», «2 horas o menos», «Media», «2 personas», «En vivo
 * y online» y «Online»—: seis preguntas cuya respuesta ya se sabia antes de
 * hacerlas. Es la misma averia que la linea «3 – 8 jugadores» de CLUEDO, que
 * llevaba anos contradiciendo a la realidad porque estaba escrita aparte.
 *
 * Ahora la lista es una CONSECUENCIA de la estanteria. El dia que un juego
 * declare que se puede jugar a distancia, «Online» aparece sola; el dia que
 * ninguno lo declare, se va sola. Nadie tiene que acordarse.
 *
 * ═══ EL VALOR PUESTO NO SE CAE NUNCA ═══
 *
 * Se conserva aunque deje de estar entre las vivas. Sin esto, un criterio en
 * vigor podria quedarse sin su opcion —y el desplegable ensenaria otra cosa
 * mientras el filtro sigue aplicandose—, que es la peor forma de mentir: la que
 * no se ve.
 */
function vivas<V>(
  juegos: readonly Catalogable[],
  candidatos: readonly V[],
  comoCriterio: (v: V) => Partial<Criterios>,
  comoTexto: (v: V) => string,
  puesto: string,
): Array<{ valor: string; texto: string }> {
  const utiles = candidatos.filter(
    (v) => String(v) === puesto || algunoCumple(juegos, comoCriterio(v)),
  );
  return [CUALQUIERA, ...utiles.map((v) => ({ valor: String(v), texto: comoTexto(v) }))];
}

interface Props {
  /**
   * La estanteria entera, para saber que se puede preguntar.
   *
   * Llega la lista y no un resumen ya masticado a proposito: la pregunta «¿hay
   * algun juego que cumpla esto?» se contesta con la MISMA funcion que puntua,
   * y para eso hacen falta los juegos.
   */
  juegos: readonly Catalogable[];
  criterios: Criterios;
  onCambio: (criterios: Criterios) => void;
  /** Cuántos encajan y cuántos hay, solo para decírselo a quien no ve la pantalla. */
  encajan: number;
  total: number;
}

export default function BuscadorDeVeladas({ juegos, criterios, onCambio, encajan, total }: Props) {
  const [abierto, setAbierto] = useState(false);
  const idFiltros = useId();

  const puestos = cuantosCriterios(criterios);
  const cambiar = (parte: Partial<Criterios>) => onCambio({ ...criterios, ...parte });
  /** Un desplegable vacío es «no lo he pedido», no «cero». */
  const num = (v: string) => (v === '' ? undefined : Number(v));

  /*
   * Las cuatro listas salen de la estantería, no de una constante. `useMemo`
   * porque `algunoCumple` recorre los juegos una vez por candidato —treinta y
   * ocho preguntas— y rehacerlo en cada tecleo del buscador sería trabajo
   * tirado: lo que se escribe arriba no cambia lo que la estantería puede
   * cumplir.
   */
  const opciones = useMemo(
    () => ({
      horas: vivas(
        juegos,
        HORAS_POSIBLES,
        (h) => ({ horas: h }),
        (h) => (h === 1 ? '1 hora o menos' : `${h} horas o menos`),
        criterios.horas === undefined ? '' : String(criterios.horas),
      ),
      edad: vivas(
        juegos,
        EDADES_POSIBLES,
        (e) => ({ edad: e }),
        (e) => `${e} años`,
        criterios.edad === undefined ? '' : String(criterios.edad),
      ),
      dificultad: vivas(
        juegos,
        DIFICULTADES_POSIBLES,
        (d) => ({ dificultad: d }),
        (d) => NOMBRE_DE_DIFICULTAD[d],
        criterios.dificultad === undefined ? '' : String(criterios.dificultad),
      ),
      jugadores: vivas(
        juegos,
        CUANTOS_POSIBLES,
        (n) => ({ jugadores: n }),
        (n) => `${n} personas`,
        criterios.jugadores === undefined ? '' : String(criterios.jugadores),
      ),
      modo: vivas(
        juegos,
        MODOS_POSIBLES,
        (m) => ({ modo: m }),
        (m) => NOMBRE_DE_MODO[m],
        criterios.modo ?? '',
      ),
    }),
    [juegos, criterios.horas, criterios.edad, criterios.dificultad, criterios.jugadores, criterios.modo],
  );

  /*
   * UN FILTRO CON UNA SOLA RESPUESTA NO ES UN FILTRO.
   *
   * `opciones.x` siempre trae «Cualquiera» delante, así que con menos de dos
   * entradas detrás no hay nada que elegir: preguntar «¿dónde?» cuando todas
   * las veladas son en vivo es hacerle perder el tiempo a quien abre el panel.
   * Hoy eso deja fuera «Dónde»; el día que un juego se declare online, vuelve
   * él solo.
   */
  const seElige = (lista: Array<{ valor: string }>) => lista.length > 2;
  const hayAlgoQueAfinar = Object.values(opciones).some(seElige);

  return (
    <search className="buscador">
      <div className="buscador-linea">
        <Lupa />
        <input
          type="search"
          className="buscador-campo-texto"
          value={criterios.texto}
          onChange={(e) => cambiar({ texto: e.target.value })}
          placeholder="Buscar una velada por nombre o por asunto…"
          aria-label="Buscar una velada por nombre o por asunto"
        />
        {criterios.texto !== '' && (
          <button
            type="button"
            className="buscador-borrar"
            onClick={() => cambiar({ texto: '' })}
            aria-label="Borrar la búsqueda"
          >
            ✕
          </button>
        )}
        {/*
          Sin ningún filtro con elección real, «Afinar» abriría un panel vacío.
          Hoy no pasa —hay cuatro—, pero una estantería de un solo juego lo
          dejaría así, y un botón que no lleva a ninguna parte es peor que no
          tenerlo.
        */}
        {hayAlgoQueAfinar && (
        <button
          type="button"
          className="buscador-afinar mono-caps"
          onClick={() => setAbierto((x) => !x)}
          aria-expanded={abierto}
          aria-controls={idFiltros}
        >
          Afinar
          {puestos > 0 && <span className="buscador-marca">{puestos}</span>}
          <span className={`buscador-punta${abierto ? ' es-abierta' : ''}`} aria-hidden="true">
            ▾
          </span>
        </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            id={idFiltros}
            className="buscador-filtros"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="buscador-filtros-fila">
              {seElige(opciones.horas) && (
                <Campo
                  etiqueta="Duración"
                  descripcion="Duración de la velada"
                  valor={criterios.horas === undefined ? '' : String(criterios.horas)}
                  onCambio={(v) => cambiar({ horas: num(v) })}
                  opciones={opciones.horas}
                />
              )}
              {seElige(opciones.edad) && (
                <Campo
                  etiqueta="El más joven"
                  descripcion="El más joven de la mesa"
                  valor={criterios.edad === undefined ? '' : String(criterios.edad)}
                  onCambio={(v) => cambiar({ edad: num(v) })}
                  opciones={opciones.edad}
                />
              )}
              {seElige(opciones.dificultad) && (
                <Campo
                  etiqueta="Dificultad"
                  valor={criterios.dificultad === undefined ? '' : String(criterios.dificultad)}
                  onCambio={(v) => cambiar({ dificultad: num(v) as NivelDeDificultad | undefined })}
                  opciones={opciones.dificultad}
                />
              )}
              {seElige(opciones.jugadores) && (
                <Campo
                  etiqueta="Seremos"
                  descripcion="Seremos cuántas personas"
                  valor={criterios.jugadores === undefined ? '' : String(criterios.jugadores)}
                  onCambio={(v) => cambiar({ jugadores: num(v) })}
                  opciones={opciones.jugadores}
                />
              )}
              {seElige(opciones.modo) && (
                <Campo
                  etiqueta="Dónde"
                  descripcion="Dónde se juega"
                  valor={criterios.modo ?? ''}
                  onCambio={(v) => cambiar({ modo: v === '' ? undefined : (v as ModoDePartida) })}
                  opciones={opciones.modo}
                />
              )}
              {puestos > 0 && (
                <button
                  type="button"
                  className="buscador-limpiar mono-caps"
                  onClick={() => onCambio({ texto: '' })}
                >
                  Limpiar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        Lo que se ve es el ORDEN de las tarjetas, y un orden no se oye. Esto es
        lo único que hay aquí pensado solo para quien navega con lector: dice en
        una frase lo que la estantería acaba de hacer.
      */}
      <p className="solo-para-lectores" role="status">
        {puestos === 0
          ? `${total} veladas en la estantería.`
          : `${encajan} de ${total} veladas encajan con lo que ha pedido; las demás siguen debajo.`}
      </p>
    </search>
  );
}
