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
import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NOMBRE_DE_DIFICULTAD, NOMBRE_DE_MODO } from '../../../../shared/juegos';
import type { ModoDePartida, NivelDeDificultad } from '../../../../shared/juegos';
import type { Criterios } from '../../lib/catalogo';
import { cuantosCriterios } from '../../lib/catalogo';

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

const HORAS = [
  { valor: '', texto: 'Cualquiera' },
  { valor: '1', texto: '1 hora o menos' },
  { valor: '2', texto: '2 horas o menos' },
  { valor: '3', texto: '3 horas o menos' },
  { valor: '4', texto: '4 horas o menos' },
];

/*
 * EMPIEZA EN CATORCE, Y NO ES UN RECORTE ESTÉTICO.
 *
 * Ofrecía 6, 8, 10 y 12. Los términos que esta plataforma publica dicen que «no
 * está dirigida a menores de catorce años», así que preguntar por el más joven de
 * la mesa y sugerir «seis años» era invitar a una mesa que el propio servicio no
 * admite —y además no devolvía nada, porque ninguna ficha puede bajar de catorce:
 * el suelo está explicado en `FichaDeJuego.edadMinima`—.
 *
 * Un desplegable con cuatro opciones que no pueden dar resultado no es una
 * comodidad: es una pregunta que promete algo que no hay.
 */
const EDADES = [
  { valor: '', texto: 'Cualquiera' },
  ...[14, 16, 18].map((e) => ({ valor: String(e), texto: `${e} años` })),
];

const DIFICULTADES = [
  { valor: '', texto: 'Cualquiera' },
  ...([1, 2, 3, 4] as NivelDeDificultad[]).map((n) => ({
    valor: String(n),
    texto: NOMBRE_DE_DIFICULTAD[n],
  })),
];

const CUANTOS = [
  { valor: '', texto: 'Cualquiera' },
  ...Array.from({ length: 19 }, (_, i) => i + 2).map((n) => ({
    valor: String(n),
    texto: `${n} personas`,
  })),
];

const MODOS = [
  { valor: '', texto: 'Cualquiera' },
  ...(['en-vivo', 'en-vivo-y-online', 'online'] as ModoDePartida[]).map((m) => ({
    valor: m,
    texto: NOMBRE_DE_MODO[m],
  })),
];

interface Props {
  criterios: Criterios;
  onCambio: (criterios: Criterios) => void;
  /** Cuántos encajan y cuántos hay, solo para decírselo a quien no ve la pantalla. */
  encajan: number;
  total: number;
}

export default function BuscadorDeVeladas({ criterios, onCambio, encajan, total }: Props) {
  const [abierto, setAbierto] = useState(false);
  const idFiltros = useId();

  const puestos = cuantosCriterios(criterios);
  const cambiar = (parte: Partial<Criterios>) => onCambio({ ...criterios, ...parte });
  /** Un desplegable vacío es «no lo he pedido», no «cero». */
  const num = (v: string) => (v === '' ? undefined : Number(v));

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
              <Campo
                etiqueta="Duración"
                descripcion="Duración de la velada"
                valor={criterios.horas === undefined ? '' : String(criterios.horas)}
                onCambio={(v) => cambiar({ horas: num(v) })}
                opciones={HORAS}
              />
              <Campo
                etiqueta="El más joven"
                descripcion="El más joven de la mesa"
                valor={criterios.edad === undefined ? '' : String(criterios.edad)}
                onCambio={(v) => cambiar({ edad: num(v) })}
                opciones={EDADES}
              />
              <Campo
                etiqueta="Dificultad"
                valor={criterios.dificultad === undefined ? '' : String(criterios.dificultad)}
                onCambio={(v) => cambiar({ dificultad: num(v) as NivelDeDificultad | undefined })}
                opciones={DIFICULTADES}
              />
              <Campo
                etiqueta="Seremos"
                descripcion="Seremos cuántas personas"
                valor={criterios.jugadores === undefined ? '' : String(criterios.jugadores)}
                onCambio={(v) => cambiar({ jugadores: num(v) })}
                opciones={CUANTOS}
              />
              <Campo
                etiqueta="Dónde"
                descripcion="Dónde se juega"
                valor={criterios.modo ?? ''}
                onCambio={(v) => cambiar({ modo: v === '' ? undefined : (v as ModoDePartida) })}
                opciones={MODOS}
              />
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
