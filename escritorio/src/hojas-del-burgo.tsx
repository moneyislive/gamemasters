/**
 * LA HOJA DEL BURGO EN EL ESCRITORIO: las secciones que sirve `hojaEnTres`, pintadas
 * con `<section>` y `<button>` dentro del cajón que abre la cinta.
 *
 * ═══ AQUÍ NO SE DECIDE NADA Y NO SE REDACTA NADA ═══
 *
 * Cada sección llega con su título, sus renglones YA ESCRITOS y sus opciones ENTERAS
 * desde `shared/arcade/juegos/burgo-en-tres.ts`, que es donde `verify:burgo-en-tres` las
 * ejercita con partidas de verdad desde Node. Este fichero pone widgets. Si aquí
 * apareciera un `if` sobre una casilla, un precio o un turno, habría dos traducciones
 * —la de la app y la de esta pantalla— y un día dirían cosas distintas.
 *
 * Lo que se manda es LA OPCIÓN ENTERA: `{ tipo: o.tipo, carga: o.carga }` tal cual vino.
 * Las DOS excepciones son las dos puertas del juego —la puja libre y el trato, que
 * llegan con `declaracion: true` y no son un movimiento—, y para ellas se llama a
 * `montar()`, que compone la carga con EXACTAMENTE los campos que la puerta declara y
 * devuelve `null` cuando lo pedido no cabe. Escribir aquí la forma de una carga sería un
 * segundo sitio que nadie comprueba.
 *
 * ═══ POR QUÉ SON SEIS SECCIONES Y NO OCHO ═══
 *
 * `ORDEN_DE_LA_HOJA` trae ocho y las dos primeras ya están en pantalla antes de abrir
 * nada, que es justo lo que el §6.3 pide de ellas:
 *
 *   · LA CINTA vive sobre el lienzo, con el aviso en la ÚNICA región viva
 *     (`aria-live="polite"`) de esta pantalla. Repetirla aquí dentro sería una segunda
 *     región con el mismo texto: dos anuncios por jugada, y el segundo pisando al
 *     primero. Su lista de opciones es vacía, así que no se pierde ni un movimiento.
 *   · EL MARCADOR lo pinta `MarcadorDelBurgo` en el raíl, y el raíl entero entra en este
 *     mismo cajón. Pintarlo dos veces serían dos listas de seis jugadores, una encima de
 *     la otra, con la fila del turno destacada en las dos. Sus opciones también son
 *     vacías.
 *
 * Las otras seis van en el ORDEN del §6.3 y ninguna se salta: una sección sin nada que
 * enseñar (`hayAlgo` falso) se pliega, y con ella no se pliega ninguna opción, porque
 * `hojaEnTres` no pone opciones en una sección que declara vacía. `verify:escritorio` lo
 * compra contando cada opción del juego una sola vez entre la escena, la hoja y los
 * botones sueltos.
 *
 * ═══ LA QUE HAY QUE MIRAR AHORA SE MARCA, NO SE ABRE ═══
 *
 * En el móvil la hoja tiene UNA sección abierta y las demás plegadas, y `hoja.abre` dice
 * cuál. Aquí el cajón se ve entero y rueda por dentro, así que plegarlas sería esconder
 * lo que ya cabe: la de `abre` se marca con su filo en el acento y con `aria-current`, y
 * las demás siguen a la vista. Es la misma información dicha con lo que esta pantalla
 * tiene y el móvil no: sitio.
 */
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import type { Opcion } from '../../shared/arcade';
import type { MovimientoDeclarado } from '../../shared/mecanicas/tablero-declarado';
import {
  fichaDeCasilla,
  maravedies,
  ORDEN_DE_LA_HOJA,
} from '../../shared/arcade/juegos/burgo-en-tres';
import type {
  FichaDeCasilla,
  HojaDelBurgo,
  IdDeSeccion,
  LadoQueSePinta,
  PujaComponible,
  SeccionDeLaHoja,
  TratoComponible,
} from '../../shared/arcade/juegos/burgo-en-tres';

/**
 * LAS DOS QUE YA ESTÁN EN PANTALLA ANTES DE ABRIR EL CAJÓN. Ver la cabecera: la cinta es
 * la única región viva de esta pantalla y el marcador lo pinta el raíl, que entra aquí
 * dentro. Ninguna de las dos declara opciones, así que saltárselas no esconde un
 * movimiento.
 */
const YA_ESTAN_FUERA: readonly IdDeSeccion[] = ['cinta', 'marcador'];

/** El paso del campo de la puja y del dinero de un trato: de diez en diez (reglamento §7). */
const DE_DIEZ_EN_DIEZ = 10;

export interface LoQueVeLaHoja {
  hoja: HojaDelBurgo<Opcion>;
  /** La vista entera: hace falta para poner nombre a una casilla ajena en el componedor. */
  vista: unknown;
  yo: string | null;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
}

/** Lo que se manda al pulsar una opción: la opción ENTERA, sin tocarle nada. */
function comoSeManda(o: Opcion): MovimientoDeclarado {
  return { tipo: o.tipo, carga: o.carga };
}

/**
 * UN BOTÓN DE OPCIÓN, con el rótulo y la ayuda que escribió el juego.
 *
 * Apagado con `aria-disabled` y NUNCA con `disabled`: un `<button>` al que se le pone
 * `disabled` teniendo el foco lo pierde, y aquí dentro —una caja modal con su trampa de
 * foco— eso es escaparse de la trampa. Quien ignora el clic es este `onClick`.
 */
function BotonDeOpcion({
  opcion,
  quieto,
  alElegir,
}: {
  opcion: Opcion;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={quieto ? 'opcion opcion-quieta' : 'opcion opcion-secundaria'}
      aria-disabled={quieto}
      title={opcion.ayuda}
      onClick={() => {
        if (quieto) return;
        alElegir(comoSeManda(opcion));
      }}
    >
      <span className="opcion-texto">
        <span className="opcion-rotulo">{opcion.rotulo}</span>
        {opcion.ayuda.length > 0 ? <span className="opcion-ayuda">{opcion.ayuda}</span> : null}
      </span>
    </button>
  );
}

/** El armazón de una sección: rótulo, renglones y lo que le cuelgue. */
function UnaSeccion({
  seccion,
  esLaQueAbre,
  quieto,
  alElegir,
  children,
}: {
  seccion: SeccionDeLaHoja<Opcion>;
  esLaQueAbre: boolean;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
  children?: ReactNode;
}): JSX.Element {
  return (
    <section
      className={esLaQueAbre ? 'panel burgo-seccion burgo-seccion-toca' : 'panel burgo-seccion'}
      aria-current={esLaQueAbre ? 'step' : undefined}
    >
      <h2 className="rotulo-de-panel">{seccion.titulo}</h2>
      {seccion.lineas.map((linea, i) => (
        <p className="letra-chica burgo-renglon" key={`${seccion.id}:${String(i)}`}>
          {linea}
        </p>
      ))}
      {seccion.opciones.length > 0 ? (
        <ul className="opciones">
          {seccion.opciones.map((o) => (
            <li key={o.id}>
              <BotonDeOpcion opcion={o} quieto={quieto} alElegir={alElegir} />
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </section>
  );
}

/**
 * LA PUJA LIBRE: un campo numérico entre el mínimo y lo que tengo, de escalón en
 * escalón.
 *
 * Los TRES botones fijos —el mínimo, «+50» y «+100»— ya salen arriba, con las opciones de
 * la sección, porque son opciones normales del juego y así el respaldo puede pujar sin
 * campo ninguno. Esto es la PUERTA: lo que el juego declara y no manda, y lo que permite
 * subir a una cifra que no es ninguna de las tres.
 *
 * `montar` devuelve `null` fuera de los límites o fuera del escalón, y entonces el botón
 * se apaga: la comprobación no está escrita aquí, se le pregunta a la puerta. Con el
 * campo vacío tampoco hay nada que mandar.
 */
function LaPujaLibre({
  puja,
  quieto,
  alElegir,
}: {
  puja: PujaComponible<Opcion>;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
}): JSX.Element | null {
  const campo = useId();
  const [escrito, ponerEscrito] = useState('');
  if (puja.puerta === null) return null;
  const cuanto = Number.parseInt(escrito, 10);
  const montado = Number.isInteger(cuanto) ? puja.montar(cuanto) : null;
  return (
    <div className="burgo-puja-libre">
      <label className="letra-chica" htmlFor={campo}>
        {`Pujar otra cifra (de ${String(puja.escalon)} en ${String(puja.escalon)}, hasta ${maravedies(puja.maximo)})`}
      </label>
      <input
        id={campo}
        className="campo burgo-campo"
        type="text"
        inputMode="numeric"
        value={escrito}
        placeholder={String(puja.minimo)}
        onChange={(e) => {
          ponerEscrito(e.target.value.replace(/[^0-9]/g, ''));
        }}
      />
      <button
        type="button"
        className={quieto || montado === null ? 'opcion opcion-quieta' : 'opcion opcion-secundaria'}
        aria-disabled={quieto || montado === null}
        onClick={() => {
          if (quieto || montado === null) return;
          ponerEscrito('');
          alElegir(montado);
        }}
      >
        <span className="opcion-texto">
          <span className="opcion-rotulo">Pujar</span>
        </span>
      </button>
    </div>
  );
}

/** Un lado del componedor, vacío. Se parte de aquí y se le va añadiendo. */
const LADO_VACIO: LadoQueSePinta = { mrs: 0, titulos: [], indultos: 0 };

function conTitulo(lado: LadoQueSePinta, casilla: number): LadoQueSePinta {
  const dentro = lado.titulos.indexOf(casilla) >= 0;
  return {
    ...lado,
    titulos: dentro ? lado.titulos.filter((c) => c !== casilla) : [...lado.titulos, casilla],
  };
}

/**
 * EL COMPONEDOR DE UN TRATO: con quién, lo que doy y lo que pido.
 *
 * Lo que se puede poner en cada lado lo declara LA PUERTA —mis títulos sin edificios, mi
 * tope de dinero, mis Salvoconductos; y de él, lo que la vista dice que tiene—, y `montar`
 * devuelve `null` en cuanto algo no cabe. El reductor lo vuelve a validar entero: aquí no
 * se comprueba una regla, se compone una carga con los campos exactos.
 *
 * El dinero va de diez en diez, como la puja, y el tope es el que la puerta declara. Un
 * trato sin nada por ninguno de los dos lados no se monta, y el botón se apaga solo
 * porque `montar` devuelve `null`.
 */
function ElComponedorDelTrato({
  trato,
  vista,
  yo,
  quieto,
  alElegir,
}: {
  trato: TratoComponible<Opcion>;
  vista: unknown;
  yo: string | null;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
}): JSX.Element | null {
  const campoDoy = useId();
  const campoPido = useId();
  const [aQuien, ponerAQuien] = useState<string | null>(null);
  const [doy, ponerDoy] = useState<LadoQueSePinta>(LADO_VACIO);
  const [pido, ponerPido] = useState<LadoQueSePinta>(LADO_VACIO);
  const puerta = trato.puerta;
  if (puerta === null || puerta.a.length === 0) return null;
  const destino = puerta.a.find((d) => d.asiento === aQuien) ?? null;
  const montado = destino === null ? null : trato.montar(destino.asiento, doy, pido);
  const nombreDe = (casilla: number): string => fichaDeCasilla(vista, casilla, yo, []).nombre;
  return (
    <div className="burgo-componedor">
      <h3 className="letra-chica burgo-componedor-rotulo">{puerta.rotulo}</h3>
      <p className="letra-chica">{puerta.ayuda}</p>
      <ul className="opciones burgo-con-quien">
        {puerta.a.map((d) => (
          <li key={d.asiento}>
            <button
              type="button"
              className={d.asiento === aQuien ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
              aria-pressed={d.asiento === aQuien}
              onClick={() => {
                ponerAQuien(d.asiento === aQuien ? null : d.asiento);
                ponerPido(LADO_VACIO);
              }}
            >
              <span className="opcion-texto">
                <span className="mota-de-color" style={{ background: d.color }} aria-hidden="true" />
                <span className="opcion-rotulo">{d.nombre}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="burgo-lado">
        <label className="letra-chica" htmlFor={campoDoy}>
          {`Doy en euros (hasta ${maravedies(puerta.mrsMaximo)})`}
        </label>
        <input
          id={campoDoy}
          className="campo burgo-campo"
          type="text"
          inputMode="numeric"
          value={doy.mrs === 0 ? '' : String(doy.mrs)}
          placeholder="0"
          onChange={(e) => {
            const n = Number.parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
            ponerDoy((antes) => ({ ...antes, mrs: Number.isInteger(n) ? n : 0 }));
          }}
        />
        {puerta.indultos > 0 ? (
          <button
            type="button"
            className={doy.indultos > 0 ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
            aria-pressed={doy.indultos > 0}
            onClick={() => {
              ponerDoy((antes) => ({ ...antes, indultos: antes.indultos > 0 ? 0 : 1 }));
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Doy un Salvoconducto</span>
            </span>
          </button>
        ) : null}
        <ul className="opciones">
          {puerta.titulos.map((c) => (
            <li key={`doy:${String(c)}`}>
              <button
                type="button"
                className={doy.titulos.indexOf(c) >= 0 ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
                aria-pressed={doy.titulos.indexOf(c) >= 0}
                onClick={() => {
                  ponerDoy((antes) => conTitulo(antes, c));
                }}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">{nombreDe(c)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="burgo-lado">
        <label className="letra-chica" htmlFor={campoPido}>
          Pido en euros
        </label>
        <input
          id={campoPido}
          className="campo burgo-campo"
          type="text"
          inputMode="numeric"
          value={pido.mrs === 0 ? '' : String(pido.mrs)}
          placeholder="0"
          onChange={(e) => {
            const n = Number.parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
            ponerPido((antes) => ({ ...antes, mrs: Number.isInteger(n) ? n : 0 }));
          }}
        />
        {destino !== null && destino.indultos > 0 ? (
          <button
            type="button"
            className={pido.indultos > 0 ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
            aria-pressed={pido.indultos > 0}
            onClick={() => {
              ponerPido((antes) => ({ ...antes, indultos: antes.indultos > 0 ? 0 : 1 }));
            }}
          >
            <span className="opcion-texto">
              <span className="opcion-rotulo">Pido un Salvoconducto</span>
            </span>
          </button>
        ) : null}
        <ul className="opciones">
          {(destino?.titulos ?? []).map((c) => (
            <li key={`pido:${String(c)}`}>
              <button
                type="button"
                className={pido.titulos.indexOf(c) >= 0 ? 'opcion opcion-secundaria burgo-elegido' : 'opcion'}
                aria-pressed={pido.titulos.indexOf(c) >= 0}
                onClick={() => {
                  ponerPido((antes) => conTitulo(antes, c));
                }}
              >
                <span className="opcion-texto">
                  <span className="opcion-rotulo">{nombreDe(c)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="letra-chica burgo-renglon">
        {`El dinero va de ${String(DE_DIEZ_EN_DIEZ)} en ${String(DE_DIEZ_EN_DIEZ)}; un trato vacío por los dos lados no se propone.`}
      </p>
      <button
        type="button"
        className={quieto || montado === null ? 'opcion opcion-quieta' : 'opcion opcion-secundaria'}
        aria-disabled={quieto || montado === null}
        onClick={() => {
          if (quieto || montado === null) return;
          ponerDoy(LADO_VACIO);
          ponerPido(LADO_VACIO);
          ponerAQuien(null);
          alElegir(montado);
        }}
      >
        <span className="opcion-texto">
          <span className="opcion-rotulo">Proponer</span>
        </span>
      </button>
    </div>
  );
}

/**
 * LA FICHA DE UN TÍTULO MÍO: nombre, barrio, precio, la tabla de rentas con la fila de
 * hoy destacada, dueño y estado, y TODAS sus obras.
 *
 * Son LOS MISMOS objetos que la casilla tocable del anillo abre al tocarla —la traducción
 * los devuelve por identidad—, así que la obra tiene UN botón, el de esta ficha, y un
 * atajo, la casilla. La partición los cuenta como uno.
 */
function LaFichaDeUnTitulo({
  ficha,
  quieto,
  alElegir,
}: {
  ficha: FichaDeCasilla<Opcion>;
  quieto: boolean;
  alElegir: (movimiento: MovimientoDeclarado) => void;
}): JSX.Element {
  return (
    <article className="burgo-ficha">
      <h4 className="burgo-ficha-nombre">{ficha.nombre}</h4>
      {ficha.lineas.map((linea, i) => (
        <p className="letra-chica burgo-renglon" key={`${String(ficha.casilla)}:${String(i)}`}>
          {linea}
        </p>
      ))}
      {ficha.rentas.length > 0 ? (
        <ul className="burgo-rentas" role="list">
          {ficha.rentas.map((r) => (
            <li key={`${String(ficha.casilla)}:${r.rotulo}`} className={r.actual ? 'burgo-renta-hoy' : undefined}>
              <span className="burgo-renta-rotulo">{r.rotulo}</span>
              <span className="burgo-renta-cifra">{maravedies(r.cuanto)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {ficha.opciones.length > 0 ? (
        <ul className="opciones">
          {ficha.opciones.map((o) => (
            <li key={o.id}>
              <BotonDeOpcion opcion={o} quieto={quieto} alElegir={alElegir} />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

/** Las seis secciones de la hoja que no están ya en pantalla, en el orden del §6.3. */
export function LasHojasDelBurgo({ hoja, vista, yo, quieto, alElegir }: LoQueVeLaHoja): JSX.Element {
  const porId = new Map<IdDeSeccion, SeccionDeLaHoja<Opcion>>();
  for (const s of hoja.secciones) porId.set(s.id, s);
  return (
    <div className="burgo-hoja">
      {ORDEN_DE_LA_HOJA.filter((id) => YA_ESTAN_FUERA.indexOf(id) < 0).map((id) => {
        const seccion = porId.get(id);
        if (seccion === undefined || !seccion.hayAlgo) return null;
        const esLaQueAbre = hoja.abre === id;
        if (id === 'almoneda' && hoja.puja !== null) {
          return (
            <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} quieto={quieto} alElegir={alElegir}>
              <LaPujaLibre puja={hoja.puja} quieto={quieto} alElegir={alElegir} />
            </UnaSeccion>
          );
        }
        if (id === 'trato' && hoja.trato !== null) {
          return (
            <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} quieto={quieto} alElegir={alElegir}>
              <ElComponedorDelTrato
                trato={hoja.trato}
                vista={vista}
                yo={yo}
                quieto={quieto}
                alElegir={alElegir}
              />
            </UnaSeccion>
          );
        }
        if (id === 'mios') {
          return (
            <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} quieto={quieto} alElegir={alElegir}>
              {hoja.mios.map((barrio) => (
                <div className="burgo-barrio" key={barrio.id}>
                  <h3 className="letra-chica burgo-barrio-rotulo">
                    <span className="mota-de-color" style={{ background: barrio.color }} aria-hidden="true" />
                    {barrio.nombre}
                  </h3>
                  {barrio.fichas.map((ficha) => (
                    <LaFichaDeUnTitulo
                      key={ficha.casilla}
                      ficha={ficha}
                      quieto={quieto}
                      alElegir={alElegir}
                    />
                  ))}
                </div>
              ))}
            </UnaSeccion>
          );
        }
        return (
          <UnaSeccion key={id} seccion={seccion} esLaQueAbre={esLaQueAbre} quieto={quieto} alElegir={alElegir} />
        );
      })}
    </div>
  );
}
