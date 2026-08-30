/**
 * EL PUESTO: la pestaña donde se trabaja, y la primera pantalla de toda la
 * plataforma que lleva minijuegos dentro.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUÉ SE HACE AQUÍ
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * En El Nudo de Valdehierro las órdenes se pagan con CONFORMIDADES, y las
 * conformidades no se regalan: se ganan resolviendo el instrumento de un puesto.
 * O sea que esta pestaña es la fábrica de todo lo demás. Si no funciona, la
 * estación se queda sin poder cursar nada y la noche se para.
 *
 * Tiene dos estados y no dos pantallas, y eso es deliberado. Estás en un puesto
 * o no lo estás; son el antes y el después del mismo gesto, así que partirlos en
 * dos pestañas obligaría a cambiar de pestaña para hacer lo único que se puede
 * hacer desde la primera. Con dos estados, el móvil enseña siempre lo que toca
 * hacer AHORA y no hay nada que buscar.
 *
 *   A) SIN PUESTO → la lista de puestos de la estación.
 *   B) CON PUESTO → el instrumento de ese puesto, y su minijuego.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ESTO MANDA A LA GENTE A LEVANTARSE, Y HAY QUE DECIRLO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Ocupar un puesto no es pulsar un botón: es ponerse de pie e ir hasta esa
 * habitación de la casa. La app no puede comprobarlo —ni quiere: no es una
 * carrera de orientación— así que lo único que puede hacer es DECIRLO, arriba y
 * antes de la lista, donde no se puede leer por encima.
 *
 * Y el aviso NO va en un marco rojo. En esta estación el rojo de señal significa
 * exactamente una cosa —retraso, alarma, el enclavamiento que no da paso— y es
 * la doctrina que sostiene `src/nudo/piezas.tsx`: en cuanto se usa para adornar
 * o para subrayar, deja de significarla. El aviso de andar es importante, no es
 * una alarma.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL PLANTEAMIENTO LLEGA COMO `unknown`, Y SE LEE COMO TAL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `instrumento.planteamiento` es `unknown` en el contrato y tiene que serlo: el
 * motor transporta el planteamiento de un instrumento que no conoce. Aquí hay
 * una función de lectura POR INSTRUMENTO —`leerManiobra`, `leerParte`,
 * `leerEnclavamiento`, `leerCargue`— que comprueba la forma y devuelve
 * `undefined` si no encaja, exactamente igual que `leerEstadoNudo` en
 * `src/nudo/vista.ts` y por la misma razón: un móvil puede llevar una versión
 * más vieja que el servidor, y un campo que aún no existe tiene que dar una
 * tarjeta que dice «este instrumento no lo entiende tu versión» y no un
 * «undefined is not an object» delante de ocho personas a las dos de la mañana.
 *
 * Con un `as` cualquiera de las cuatro se lo tragaría todo y reventaría al
 * primer `.map`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA APP NO CORRIGE NADA, Y ESO ES LA MITAD DEL DISEÑO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Ninguno de los cuatro minijuegos conoce su solución: no llega, a propósito
 * (ver la cabecera de `src/nudo/vista.ts`). Lo que la pantalla comprueba es otra
 * cosa: si lo que has montado es ENTREGABLE —la salida coincide con el objetivo,
 * no hay ningún bloqueo incumplido, no queda ningún bulto en el muelle—, y eso
 * solo sirve para habilitar el botón y para no hacerte gastar un viaje al
 * servidor en algo que ya se ve que no está. Quien dice si vale es
 * `nudo-instrumentos.ts`, que sí guarda la solución.
 *
 * De ahí sale lo que está escrito debajo de los cuatro botones de entrega:
 * FALLAR NO CUESTA NADA. El motor apunta la acción después de que el reductor
 * devuelva, así que una entrega equivocada no gasta ni retraso, ni conformidad,
 * ni el cupo de la acción. Es cierto, y hay que escribirlo en pantalla: sin
 * decirlo, la gente no se atreve a probar y el minijuego se convierte en un
 * examen. Con ello escrito, se prueba, y probar es jugar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOS CUATRO EN EL MISMO FICHERO, Y CADA UNO CON SU LLAVE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Van juntos porque los cuatro son la misma pantalla vista desde cuatro puestos:
 * comparten cabecera, botón de entrega, mensajes de error y el aviso de que
 * fallar sale gratis. Repartidos en cuatro ficheros, esas cinco cosas serían
 * cinco copias y la sexta se olvidaría.
 *
 * Y el despachador les pone `key={puesto:franja}`. Sin esa llave, cambiar de
 * puesto entre dos garitas de agujas —o pasar de la franja 3 a la 4 en el mismo
 * puesto— dejaría en pantalla el estado de la maniobra ANTERIOR: los vagones
 * puestos donde ya no van, la respuesta a medio montar de un problema que ya no
 * es ese. Es el fallo silencioso de esta pantalla, y la llave lo hace imposible.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import { AvisoDeLaPartida } from '../../src/conexion';
import { useMenosMovimiento } from '../../src/vivo';
import {
  Boton,
  Cargando,
  Cuerpo,
  Error as AvisoError,
  Etiqueta,
  Marco,
  Ornamento,
  Pantalla,
  Plegable,
  Seccion,
  Sello,
  Titulo,
  espacio,
  radio,
  texto,
} from '../../src/ui';
import { conAlfa } from '../../src/tema-juego';
import { COLOR_NUDO as C, NUDO as N } from '../../src/tema-nudo';
import { Contador } from '../../src/nudo/piezas';
import {
  codificarCargue,
  codificarManiobra,
  codificarPalancas,
  leerEstadoNudo,
} from '../../src/nudo/vista';
import type { InstrumentoVisible } from '../../src/nudo/vista';
import { MORSE } from '../../../shared/juegos';
import type {
  CarguePlanteado,
  EnclavamientoPlanteado,
  ManiobraPlanteada,
  MovimientoDeManiobra,
  PartePlanteado,
} from '../../../shared/juegos';

// ---------------------------------------------------------------------------
// La lectura del planteamiento, a la defensiva. Una por instrumento.
// ---------------------------------------------------------------------------

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cadenas(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x !== '') : [];
}

function enteros(v: unknown): number[] {
  return Array.isArray(v)
    ? v.filter((x): x is number => typeof x === 'number' && Number.isInteger(x))
    : [];
}

/** `[[2,5],[3,7]]` sin fiarse de que lo sea. Lo que no es un par, fuera. */
function paresDeNumeros(v: unknown): Array<[number, number]> {
  if (!Array.isArray(v)) return [];
  const salida: Array<[number, number]> = [];
  for (const par of v) {
    if (!Array.isArray(par)) continue;
    const [a, b] = par;
    if (typeof a === 'number' && typeof b === 'number') salida.push([a, b]);
  }
  return salida;
}

function paresDeTexto(v: unknown): Array<[string, string]> {
  if (!Array.isArray(v)) return [];
  const salida: Array<[string, string]> = [];
  for (const par of v) {
    if (!Array.isArray(par)) continue;
    const [a, b] = par;
    if (typeof a === 'string' && typeof b === 'string' && a && b) salida.push([a, b]);
  }
  return salida;
}

function leerManiobra(v: unknown): ManiobraPlanteada | undefined {
  if (!esObjeto(v)) return undefined;
  const entrada = cadenas(v.entrada);
  const objetivo = cadenas(v.objetivo);
  /*
   * Las dos listas tienen que tener los mismos vagones. No se comprueba que
   * sean los MISMOS —eso es cosa del servidor, que la generó— pero sí que haya
   * tantos como hay que colocar: con distinta longitud la maniobra no se puede
   * terminar nunca y la pantalla sería una trampa sin salida.
   */
  if (entrada.length === 0 || entrada.length !== objetivo.length) return undefined;
  return {
    entrada,
    objetivo,
    optimo: typeof v.optimo === 'number' && v.optimo > 0 ? Math.trunc(v.optimo) : 0,
  };
}

function leerParte(v: unknown): PartePlanteado | undefined {
  if (!esObjeto(v)) return undefined;
  const morse = cadenas(v.morse);
  if (morse.length === 0) return undefined;
  return {
    morse,
    letras: typeof v.letras === 'number' && v.letras > 0 ? Math.trunc(v.letras) : morse.length,
    pista: typeof v.pista === 'string' ? v.pista : '',
  };
}

function leerEnclavamiento(v: unknown): EnclavamientoPlanteado | undefined {
  if (!esObjeto(v)) return undefined;
  const palancas = typeof v.palancas === 'number' ? Math.trunc(v.palancas) : 0;
  /* Un cuadro de veinticuatro palancas no lo ha planteado este juego. */
  if (palancas < 1 || palancas > 24) return undefined;
  const existe = (n: number): boolean => n >= 1 && n <= palancas;
  return {
    palancas,
    exigidas: enteros(v.exigidas).filter(existe),
    incompatibles: paresDeNumeros(v.incompatibles).filter(([a, b]) => existe(a) && existe(b)),
    arrastres: paresDeNumeros(v.arrastres).filter(([a, b]) => existe(a) && existe(b)),
    itinerario: typeof v.itinerario === 'string' ? v.itinerario : '',
  };
}

interface BultoVisible {
  id: string;
  nombre: string;
  peso: number;
}
interface VagonVisible {
  id: string;
  nombre: string;
  tope: number;
}

function leerCargue(v: unknown): CarguePlanteado | undefined {
  if (!esObjeto(v)) return undefined;

  const bultos = (Array.isArray(v.bultos) ? v.bultos : [])
    .map((b): BultoVisible | undefined =>
      esObjeto(b) && typeof b.id === 'string' && b.id
        ? {
            id: b.id,
            nombre: typeof b.nombre === 'string' && b.nombre ? b.nombre : b.id,
            peso: typeof b.peso === 'number' ? b.peso : 0,
          }
        : undefined,
    )
    .filter((b): b is BultoVisible => b !== undefined);

  const vagones = (Array.isArray(v.vagones) ? v.vagones : [])
    .map((w): VagonVisible | undefined =>
      esObjeto(w) && typeof w.id === 'string' && w.id
        ? {
            id: w.id,
            nombre: typeof w.nombre === 'string' && w.nombre ? w.nombre : w.id,
            tope: typeof w.tope === 'number' ? w.tope : 0,
          }
        : undefined,
    )
    .filter((w): w is VagonVisible => w !== undefined);

  if (bultos.length === 0 || vagones.length === 0) return undefined;

  /* Una incompatibilidad entre bultos que no existen no se puede pintar y no se
     puede incumplir: se tira aquí en vez de dejarla dando la lata abajo. */
  const hay = new Set(bultos.map((b) => b.id));
  return {
    bultos,
    vagones,
    incompatibles: paresDeTexto(v.incompatibles).filter(([a, b]) => hay.has(a) && hay.has(b)),
  };
}

/** Lo que contesta el servidor al rendir un instrumento, escrito para la mesa. */
function leerLogro(v: unknown): string {
  if (!esObjeto(v)) return 'Instrumento resuelto.';
  const margen = typeof v.margen === 'number' ? v.margen : 0;
  const conformidades = typeof v.conformidades === 'number' ? v.conformidades : undefined;
  const enOficio = v.enSuOficio === true;
  const nueva = v.conformidadNueva === true;

  const loTuyo = `+${margen} de margen${enOficio ? ', que es tu oficio' : ''}`;
  const loDeLaEstacion = nueva
    ? `conformidad nueva${conformidades === undefined ? '' : `: la estación tiene ${conformidades}`}`
    : 'este puesto ya estaba rendido, así que no da conformidad nueva';
  return `${loTuyo} · ${loDeLaEstacion}.`;
}

// ---------------------------------------------------------------------------
// Piezas comunes a los cuatro minijuegos
// ---------------------------------------------------------------------------

/**
 * El pie de todos los instrumentos: el botón y la frase que hace que se pulse.
 *
 * Es una pieza y no cuatro copias porque la frase de abajo es la misma en los
 * cuatro y es la que decide si la gente prueba o se queda mirando. Cuatro copias
 * son cuatro sitios donde puede quedarse desactualizada, y la que se quedara
 * atrás mentiría sobre lo que cuesta fallar.
 *
 * `aviso` dice POR QUÉ no está habilitado. Un botón apagado sin explicación es
 * el peor estado posible de una pantalla a media luz: parece rota.
 */
function Entrega({
  rotulo,
  listo,
  aviso,
  entregando,
  bloqueado,
  onPress,
}: {
  rotulo: string;
  listo: boolean;
  aviso?: string;
  entregando: boolean;
  bloqueado: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <View style={{ marginTop: espacio.lg }}>
      {!listo && aviso ? (
        <Cuerpo tenue style={{ fontSize: 14, marginBottom: espacio.sm, textAlign: 'center' }}>
          {aviso}
        </Cuerpo>
      ) : null}
      <Boton
        variante="primario"
        disabled={!listo || bloqueado}
        cargando={entregando}
        onPress={onPress}
      >
        {rotulo}
      </Boton>
      <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.sm, textAlign: 'center' }}>
        Fallar no cuesta nada: ni retraso, ni conformidad, ni el turno. Prueba.
      </Cuerpo>
    </View>
  );
}

/** Un vagón, o un bulto, o cualquier cosa que se coge y se deja: una ficha. */
function Ficha({
  children,
  tono = 'hierro',
}: {
  children: React.ReactNode;
  tono?: 'hierro' | 'meta' | 'vivo';
}): JSX.Element {
  const paleta =
    tono === 'meta'
      ? { borde: C.oro500, fondo: conAlfa(C.oro500, 0.18), tinta: C.oro300 }
      : tono === 'vivo'
        ? { borde: C.oro400, fondo: conAlfa(C.oro500, 0.3), tinta: C.pergamino }
        : { borde: conAlfa(C.laton, 0.45), fondo: conAlfa(C.caoba900, 0.8), tinta: C.pergamino };
  return (
    <View style={[estilos.ficha, { borderColor: paleta.borde, backgroundColor: paleta.fondo }]}>
      <Text style={[texto.titulo, { color: paleta.tinta, fontSize: 20 }]}>{children}</Text>
    </View>
  );
}

/** Una fila rotulada de fichas: «entrada», «vía muerta I», «salida»… */
function Playa({
  rotulo,
  vagones,
  tono,
  vacio,
}: {
  rotulo: string;
  vagones: string[];
  tono?: 'hierro' | 'meta' | 'vivo';
  vacio: string;
}): JSX.Element {
  return (
    <View style={{ marginBottom: espacio.md }}>
      <Etiqueta>{rotulo}</Etiqueta>
      <View style={estilos.playa}>
        {vagones.length === 0 ? (
          <Cuerpo tenue style={{ fontSize: 14 }}>{vacio}</Cuerpo>
        ) : (
          vagones.map((v, i) => (
            <Ficha key={`${v}:${i}`} tono={tono}>
              {v}
            </Ficha>
          ))
        )}
      </View>
    </View>
  );
}

/** Una línea de bloqueo o de regla, en rojo cuando es la que se incumple. */
function Regla({ texto: cuerpo, rota }: { texto: string; rota: boolean }): JSX.Element {
  return (
    <View
      style={[
        estilos.regla,
        {
          borderColor: rota ? C.burdeos600 : conAlfa(C.laton, 0.28),
          backgroundColor: rota ? conAlfa(C.burdeos700, 0.3) : 'transparent',
        },
      ]}
    >
      <Text style={{ color: rota ? C.peligro : C.laton, fontSize: 15, width: 18 }}>
        {rota ? N.marca : '·'}
      </Text>
      <Text
        style={[
          texto.cuerpo,
          { color: rota ? C.pergamino : C.pergaminoTenue, fontSize: 15, lineHeight: 21, flex: 1 },
        ]}
      >
        {cuerpo}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 1 · LA MANIOBRA — garita de agujas
// ---------------------------------------------------------------------------

interface EstadoDePlaya {
  restante: string[];
  via1: string[];
  via2: string[];
  salida: string[];
}

/**
 * La maniobra se REPRODUCE desde la lista de movimientos, no se guarda montada.
 *
 * Podrían llevarse cuatro listas en `useState` y moverlas a mano. Se hace al
 * revés —el estado es la lista de movimientos y las cuatro vías se recalculan
 * enteras en cada pintado— por tres cosas que salen gratis y que a mano no:
 *
 *  · «Deshacer» es quitar el último de la lista. Con cuatro listas montadas hay
 *    que saber deshacer cada tipo de movimiento, que es donde vive el fallo de
 *    devolver un vagón a la vía que no era.
 *  · «Empezar de nuevo» es vaciar la lista.
 *  · Lo que se ENTREGA es exactamente lo que se ha simulado, porque es la misma
 *    lista. No hay forma de que la pantalla enseñe una maniobra y mande otra.
 *
 * Son cinco vagones y treinta movimientos como mucho: recalcularlo entero es
 * más barato que el propio pintado.
 */
function simularManiobra(entrada: string[], movimientos: MovimientoDeManiobra[]): EstadoDePlaya {
  const restante = [...entrada];
  const via1: string[] = [];
  const via2: string[] = [];
  const salida: string[] = [];

  for (const m of movimientos) {
    if (m.hacer === 'sacar') {
      const vagon = (m.via === 1 ? via1 : via2).pop();
      if (vagon !== undefined) salida.push(vagon);
      continue;
    }
    const cabeza = restante.shift();
    if (cabeza === undefined) continue;
    if (m.hacer === 'pasar') salida.push(cabeza);
    else (m.via === 1 ? via1 : via2).push(cabeza);
  }

  return { restante, via1, via2, salida };
}

function Maniobra({
  p,
  onEntregar,
  entregando,
  bloqueado,
}: {
  p: ManiobraPlanteada;
  onEntregar: (respuesta: string) => void;
  entregando: boolean;
  bloqueado: boolean;
}): JSX.Element {
  const [movimientos, setMovimientos] = useState<MovimientoDeManiobra[]>([]);
  const playa = useMemo(() => simularManiobra(p.entrada, movimientos), [p.entrada, movimientos]);

  const hayTren = playa.restante.length > 0;
  const vaciasLasVias = playa.via1.length === 0 && playa.via2.length === 0;
  const listo = !hayTren && vaciasLasVias && playa.salida.join('') === p.objetivo.join('');

  const mover = (m: MovimientoDeManiobra): void => {
    void Haptics.selectionAsync();
    setMovimientos((previos) => [...previos, m]);
  };

  return (
    <View>
      {/* El objetivo, arriba y en grande: es lo que se mira veinte veces. */}
      <Marco style={{ marginBottom: espacio.md }}>
        <Etiqueta>El tren tiene que salir así</Etiqueta>
        <View style={[estilos.playa, { marginTop: espacio.sm }]}>
          {p.objetivo.map((v, i) => (
            <Ficha key={`meta:${v}:${i}`} tono="meta">
              {v}
            </Ficha>
          ))}
        </View>
      </Marco>

      <Marco>
        <Playa
          rotulo="Entrada · el de la izquierda es el de cabeza"
          vagones={playa.restante}
          vacio="Ya no queda tren por meter."
        />
        <Playa rotulo="Vía muerta I" vagones={playa.via1} vacio="Vacía." />
        <Playa rotulo="Vía muerta II" vagones={playa.via2} vacio="Vacía." />
        <Playa
          rotulo="Salida"
          vagones={playa.salida}
          tono={listo ? 'meta' : 'vivo'}
          vacio="Todavía no ha salido nada."
        />

        <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.xs }}>
          Una vía muerta es una pila: sale el último que entró. Solo se toca el vagón de cabeza de
          la entrada.
        </Cuerpo>
      </Marco>

      {/* Los mandos. En dos por fila: se pulsan de pie y sin apuntar. */}
      <View style={estilos.mandos}>
        <View style={estilos.mandoFila}>
          <Boton
            style={estilos.mando}
            disabled={!hayTren || bloqueado}
            onPress={() => mover({ hacer: 'apartar', via: 1 })}
          >
            Apartar a la I
          </Boton>
          <Boton
            style={estilos.mando}
            disabled={!hayTren || bloqueado}
            onPress={() => mover({ hacer: 'apartar', via: 2 })}
          >
            Apartar a la II
          </Boton>
        </View>
        <Boton
          disabled={!hayTren || bloqueado}
          onPress={() => mover({ hacer: 'pasar' })}
          style={{ marginTop: espacio.sm }}
        >
          Pasar de largo
        </Boton>
        <View style={[estilos.mandoFila, { marginTop: espacio.sm }]}>
          <Boton
            style={estilos.mando}
            disabled={playa.via1.length === 0 || bloqueado}
            onPress={() => mover({ hacer: 'sacar', via: 1 })}
          >
            Sacar de la I
          </Boton>
          <Boton
            style={estilos.mando}
            disabled={playa.via2.length === 0 || bloqueado}
            onPress={() => mover({ hacer: 'sacar', via: 2 })}
          >
            Sacar de la II
          </Boton>
        </View>
        <View style={[estilos.mandoFila, { marginTop: espacio.sm }]}>
          <Boton
            style={estilos.mando}
            disabled={movimientos.length === 0}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMovimientos((previos) => previos.slice(0, -1));
            }}
          >
            Deshacer
          </Boton>
          <Boton
            style={estilos.mando}
            disabled={movimientos.length === 0}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setMovimientos([]);
            }}
          >
            Empezar de nuevo
          </Boton>
        </View>
      </View>

      <View style={estilos.cuenta}>
        <Etiqueta>
          {movimientos.length} {movimientos.length === 1 ? 'movimiento' : 'movimientos'}
        </Etiqueta>
        {p.optimo > 0 ? (
          <Etiqueta style={{ color: movimientos.length <= p.optimo ? C.oro300 : C.pergaminoTenue }}>
            se puede en {p.optimo}
          </Etiqueta>
        ) : null}
      </View>

      <Entrega
        rotulo="Entregar la maniobra"
        listo={listo}
        aviso={
          hayTren
            ? 'Queda tren sin maniobrar.'
            : !vaciasLasVias
              ? 'Han quedado vagones en una vía muerta.'
              : 'El tren no queda todavía en el orden pedido.'
        }
        entregando={entregando}
        bloqueado={bloqueado}
        onPress={() => onEntregar(codificarManiobra(movimientos))}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 2 · EL PARTE — cuarto del telégrafo
// ---------------------------------------------------------------------------

/* Duraciones de la emisión, en milisegundos. Un telégrafo de verdad hace la
   raya tres veces más larga que el punto, y el hueco entre letras el triple que
   el hueco entre signos: sin esa proporción no se distingue de oído ni de tacto,
   que es justo lo que se está pidiendo hacer. */
const PUNTO_MS = 150;
const RAYA_MS = 450;
const HUECO_MS = 130;
const HUECO_DE_LETRA_MS = 470;

function Parte({
  p,
  onEntregar,
  entregando,
  bloqueado,
}: {
  p: PartePlanteado;
  onEntregar: (respuesta: string) => void;
  entregando: boolean;
  bloqueado: boolean;
}): JSX.Element {
  const menosMovimiento = useMenosMovimiento();
  const [transcrito, setTranscrito] = useState('');
  const [sonando, setSonando] = useState<{ letra: number; signo: number } | null>(null);
  const relojes = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  /*
   * Los temporizadores se apagan al desmontar SIEMPRE. Sin esto, tocar «Repetir»
   * y salirse de la pestaña deja media docena de `setTimeout` vivos que siguen
   * llamando a `setSonando` sobre un componente que ya no existe —aviso de fuga
   * en consola— y, lo que de verdad se nota, siguen vibrando el móvil en otra
   * pantalla.
   */
  useEffect(
    () => () => {
      for (const r of relojes.current) clearTimeout(r);
      relojes.current = [];
    },
    [],
  );

  const repetir = (): void => {
    for (const r of relojes.current) clearTimeout(r);
    const nuevos: Array<ReturnType<typeof setTimeout>> = [];
    let cuando = 0;

    p.morse.forEach((letra, i) => {
      letra.split('').forEach((signo, j) => {
        const esRaya = signo === '-';
        nuevos.push(
          setTimeout(() => {
            setSonando({ letra: i, signo: j });
            void Haptics.impactAsync(
              esRaya ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
            );
          }, cuando),
        );
        cuando += (esRaya ? RAYA_MS : PUNTO_MS) + HUECO_MS;
      });
      cuando += HUECO_DE_LETRA_MS - HUECO_MS;
    });

    nuevos.push(setTimeout(() => setSonando(null), cuando));
    relojes.current = nuevos;
  };

  /* Para alinear lo escrito debajo de cada grupo de signos hay que quitar lo que
     no es letra: un espacio de más correría toda la columna y parecería que la
     transcripción está mal cuando lo que está mal es el hueco. */
  const escritas = transcrito.replace(/[^A-Za-zÑñ0-9]/g, '').toUpperCase();

  return (
    <View>
      <Marco>
        <Etiqueta>Lo que entra por la línea</Etiqueta>
        <Cuerpo tenue style={{ fontSize: 14, marginTop: 2 }}>
          {p.letras} letras. {p.pista}
        </Cuerpo>

        <View style={estilos.morse}>
          {p.morse.map((letra, i) => (
            <View key={`letra:${i}`} style={estilos.morseGrupo}>
              <View style={estilos.morseSignos}>
                {letra.split('').map((signo, j) => (
                  <View
                    key={`signo:${i}:${j}`}
                    style={[
                      signo === '-' ? estilos.raya : estilos.punto,
                      {
                        backgroundColor:
                          sonando?.letra === i && sonando.signo === j ? C.pergamino : C.oro400,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[texto.titulo, { color: C.oro300, fontSize: 18, marginTop: 4 }]}>
                {escritas[i] ?? '_'}
              </Text>
            </View>
          ))}
        </View>

        {menosMovimiento ? (
          /*
           * Con «menos movimiento» puesto no se emite nada y no se pierde nada:
           * los signos están todos en pantalla desde el principio, que es la
           * versión completa del problema. La emisión es ambiente —y vibración,
           * que también marea— así que se apaga entera en vez de recortarla.
           */
          <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.sm }}>
            Tienes el parte entero escrito arriba. No se emite porque tu móvil pide menos
            movimiento.
          </Cuerpo>
        ) : (
          <Boton onPress={repetir} style={{ marginTop: espacio.md }}>
            Repetir el parte
          </Boton>
        )}
      </Marco>

      <Marco>
        <Etiqueta>Transcríbelo</Etiqueta>
        <TextInput
          value={transcrito}
          onChangeText={setTranscrito}
          placeholder="LETRA A LETRA"
          placeholderTextColor={conAlfa(C.pergaminoTenue, 0.4)}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          style={[
            estilos.entrada,
            {
              borderColor: conAlfa(C.oro500, 0.5),
              backgroundColor: conAlfa(C.caoba900, 0.75),
              color: C.oro300,
            },
          ]}
        />
        <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.xs }}>
          Da igual la tilde, la eñe y las mayúsculas: el telegrafista de 1927 tampoco las mandaba.
        </Cuerpo>
      </Marco>

      {/*
       * LA CHULETA NO ES UNA AYUDA, ES EL JUEGO. Sin ella esto no es transcribir
       * un parte: es un examen de memoria de un alfabeto que nadie de la mesa se
       * sabe, y el puesto del telégrafo se quedaría sin visitar toda la noche.
       * Con ella, lo difícil vuelve a ser lo que tiene que serlo —separar los
       * signos de oído y no perder la cuenta de las letras— que es lo que se
       * hace de pie y con ruido.
       */}
      <Plegable
        etiqueta="Chuleta del alfabeto Morse"
        resumen="Ábrela sin remordimiento: en el cuarto del telégrafo había una clavada en la pared."
      >
        <Marco>
          <View style={estilos.chuleta}>
            {Object.entries(MORSE).map(([letra, signos]) => (
              <View key={letra} style={estilos.chuletaCasilla}>
                <Text style={[texto.titulo, { color: C.oro300, fontSize: 15 }]}>{letra}</Text>
                <Text style={{ color: C.pergaminoTenue, fontSize: 13, letterSpacing: 1 }}>
                  {signos.replace(/\./g, '·').replace(/-/g, '—')}
                </Text>
              </View>
            ))}
          </View>
        </Marco>
      </Plegable>

      <Entrega
        rotulo="Dar el parte"
        listo={transcrito.trim().length > 0}
        aviso="Escribe lo que has entendido, aunque no estés seguro."
        entregando={entregando}
        bloqueado={bloqueado}
        onPress={() => onEntregar(transcrito)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3 · EL ENCLAVAMIENTO — cuadro de palancas
// ---------------------------------------------------------------------------

function Enclavamiento({
  p,
  onEntregar,
  entregando,
  bloqueado,
}: {
  p: EnclavamientoPlanteado;
  onEntregar: (respuesta: string) => void;
  entregando: boolean;
  bloqueado: boolean;
}): JSX.Element {
  /*
   * Se arranca con las exigidas bajadas porque el itinerario las exige y no se
   * pueden subir: empezar con el cuadro entero arriba obligaría a bajar a mano
   * lo que no se puede tocar, que es dar trabajo sin dar decisión.
   */
  const [bajadas, setBajadas] = useState<number[]>(() => [...p.exigidas]);
  const abajo = useMemo(() => new Set(bajadas), [bajadas]);
  const exigidas = useMemo(() => new Set(p.exigidas), [p.exigidas]);

  /*
   * SE MARCA EN ROJO EL BLOQUEO QUE ESTÁ INCUMPLIDO, y esa línea es la que
   * convierte esto en un puzle. Sin ella, el cuadro contesta «no da paso» sin
   * decir por dónde, y probar combinaciones a ciegas con ocho palancas son 256
   * intentos: eso no es pensar, es esperar. Con el bloqueo señalado, cada
   * palanca que bajas dice inmediatamente a qué obliga y qué prohíbe, y el
   * problema pasa a resolverse razonando hacia atrás.
   *
   * Y no se da NADA más: no se dice cuántas son las mínimas, ni cuáles. El
   * mínimo lo sabe el servidor, y encontrarlo es el instrumento.
   */
  const bloqueos = useMemo(() => {
    const lista: Array<{ clave: string; texto: string; rota: boolean }> = [];
    for (const [a, b] of p.incompatibles) {
      lista.push({
        clave: `no:${a}:${b}`,
        texto: `La ${a} y la ${b} no pueden estar bajadas a la vez.`,
        rota: abajo.has(a) && abajo.has(b),
      });
    }
    for (const [a, b] of p.arrastres) {
      lista.push({
        clave: `si:${a}:${b}`,
        texto: `Si bajas la ${a}, la ${b} también.`,
        rota: abajo.has(a) && !abajo.has(b),
      });
    }
    return lista;
  }, [p.incompatibles, p.arrastres, abajo]);

  const rotos = bloqueos.filter((b) => b.rota).length;

  const alternar = (numero: number): void => {
    if (exigidas.has(numero)) {
      /* Vibración de aviso y nada más: no es un error de quien juega, es que esa
         palanca la exige el itinerario y no hay nada que decidir ahí. */
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    void Haptics.selectionAsync();
    setBajadas((previas) =>
      previas.includes(numero) ? previas.filter((n) => n !== numero) : [...previas, numero],
    );
  };

  return (
    <View>
      <Marco>
        <Etiqueta>Se pide itinerario para</Etiqueta>
        <Cuerpo style={{ marginTop: 2 }}>{p.itinerario || 'una vía de la estación'}</Cuerpo>

        <View style={estilos.cuadro}>
          {Array.from({ length: p.palancas }, (_, i) => i + 1).map((numero) => {
            const baja = abajo.has(numero);
            const fija = exigidas.has(numero);
            const filo = fija ? C.oro500 : baja ? C.oro400 : conAlfa(C.laton, 0.4);
            return (
              <Pressable
                key={numero}
                onPress={() => alternar(numero)}
                accessibilityRole="switch"
                accessibilityState={{ checked: baja, disabled: fija }}
                accessibilityLabel={`Palanca ${numero}, ${baja ? 'bajada' : 'subida'}${
                  fija ? ', la exige el itinerario' : ''
                }`}
                style={({ pressed }) => [estilos.palanca, pressed && { opacity: 0.75 }]}
              >
                <View
                  style={[
                    estilos.palancaCarril,
                    {
                      borderColor: filo,
                      backgroundColor: conAlfa(C.caoba900, 0.85),
                      justifyContent: baja ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  <View
                    style={[
                      estilos.palancaPuno,
                      { backgroundColor: baja ? (fija ? C.oro500 : C.oro400) : C.laton },
                    ]}
                  />
                </View>
                <Text style={[texto.titulo, { color: baja ? C.oro300 : C.pergaminoTenue, fontSize: 16 }]}>
                  {numero}
                </Text>
                <Text style={[texto.microCaps, { color: C.laton, fontSize: 8, letterSpacing: 0.8 }]}>
                  {fija ? 'fija' : baja ? 'baja' : 'alta'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={estilos.cuenta}>
          <Etiqueta>
            {bajadas.length} {bajadas.length === 1 ? 'bajada' : 'bajadas'}
          </Etiqueta>
          <Etiqueta style={{ color: rotos > 0 ? C.peligro : C.pergaminoTenue }}>
            {rotos > 0 ? `${rotos} sin cumplir` : 'cuadro legal'}
          </Etiqueta>
        </View>
        <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.xs }}>
          Las marcadas «fija» las exige el itinerario y no se pueden subir. Hay que dar paso con las
          MÍNIMAS: una palanca de más y el enclavamiento no lo acepta.
        </Cuerpo>
      </Marco>

      <Seccion>Bloqueos del cuadro</Seccion>
      <Marco>
        {bloqueos.length === 0 ? (
          <Cuerpo tenue>Este cuadro no tiene bloqueos. Basta con las exigidas.</Cuerpo>
        ) : (
          bloqueos.map((b) => <Regla key={b.clave} texto={b.texto} rota={b.rota} />)
        )}
      </Marco>

      <Entrega
        rotulo="Dar el itinerario"
        listo={rotos === 0}
        aviso="Hay un bloqueo del cuadro sin cumplir: está marcado en rojo abajo."
        entregando={entregando}
        bloqueado={bloqueado}
        onPress={() => onEntregar(codificarPalancas(bajadas))}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 4 · EL CARGUE — muelle de carga
// ---------------------------------------------------------------------------

function Cargue({
  p,
  onEntregar,
  entregando,
  bloqueado,
}: {
  p: CarguePlanteado;
  onEntregar: (respuesta: string) => void;
  entregando: boolean;
  bloqueado: boolean;
}): JSX.Element {
  const [reparto, setReparto] = useState<Record<string, string>>({});
  const [elegido, setElegido] = useState<string | null>(null);

  const enElMuelle = p.bultos.filter((b) => !reparto[b.id]);
  const cargaDe = (vagonId: string): number =>
    p.bultos.filter((b) => reparto[b.id] === vagonId).reduce((total, b) => total + b.peso, 0);
  const pasados = p.vagones.filter((v) => cargaDe(v.id) > v.tope);

  const choques = p.incompatibles.map(([a, b]) => {
    const na = p.bultos.find((x) => x.id === a)?.nombre ?? a;
    const nb = p.bultos.find((x) => x.id === b)?.nombre ?? b;
    const donde = reparto[a];
    return {
      clave: `${a}~${b}`,
      texto: `«${na}» y «${nb}» no pueden ir en el mismo vagón.`,
      rota: Boolean(donde) && donde === reparto[b],
    };
  });
  const chocan = choques.filter((c) => c.rota).length;

  const listo = enElMuelle.length === 0 && pasados.length === 0 && chocan === 0;

  const colocar = (vagonId: string): void => {
    if (!elegido) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReparto((previo) => ({ ...previo, [elegido]: vagonId }));
    setElegido(null);
  };

  const sacar = (bultoId: string): void => {
    void Haptics.selectionAsync();
    setReparto((previo) => {
      const copia = { ...previo };
      delete copia[bultoId];
      return copia;
    });
  };

  return (
    <View>
      <Marco>
        <Etiqueta>En el muelle · toca uno y luego su vagón</Etiqueta>
        {enElMuelle.length === 0 ? (
          <Cuerpo tenue style={{ marginTop: espacio.sm }}>
            El muelle está vacío: todo está cargado.
          </Cuerpo>
        ) : (
          <View style={[estilos.bultos, { marginTop: espacio.sm }]}>
            {enElMuelle.map((b) => {
              const activo = elegido === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setElegido(activo ? null : b.id);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={`${b.nombre}, ${b.peso} de peso`}
                  style={({ pressed }) => [
                    estilos.bulto,
                    {
                      borderColor: activo ? C.oro400 : conAlfa(C.laton, 0.45),
                      backgroundColor: activo
                        ? conAlfa(C.oro500, 0.22)
                        : conAlfa(C.caoba900, 0.75),
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[texto.cuerpo, { color: C.pergamino, fontSize: 15, flexShrink: 1 }]}
                  >
                    {b.nombre}
                  </Text>
                  <Text style={[texto.titulo, { color: C.oro300, fontSize: 16 }]}>{b.peso}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Marco>

      {p.vagones.map((v) => {
        const carga = cargaDe(v.id);
        const pasado = carga > v.tope;
        const dentro = p.bultos.filter((b) => reparto[b.id] === v.id);
        return (
          <Pressable
            key={v.id}
            onPress={() => colocar(v.id)}
            disabled={!elegido || bloqueado}
            accessibilityRole="button"
            accessibilityLabel={`${v.nombre}, lleva ${carga} de ${v.tope}`}
            style={({ pressed }) => [
              estilos.vagon,
              {
                borderColor: pasado ? C.burdeos600 : elegido ? C.oro400 : conAlfa(C.laton, 0.4),
                backgroundColor: pasado
                  ? conAlfa(C.burdeos700, 0.28)
                  : conAlfa(C.caoba900, 0.72),
              },
              pressed && elegido ? { opacity: 0.85 } : undefined,
            ]}
          >
            <View style={estilos.vagonCabecera}>
              <Text
                numberOfLines={1}
                style={[texto.titulo, { color: C.pergamino, fontSize: 17, flex: 1 }]}
              >
                {v.nombre}
              </Text>
              <Text
                style={[
                  texto.titulo,
                  { color: pasado ? C.peligro : C.oro300, fontSize: 18, letterSpacing: 0 },
                ]}
              >
                {carga} / {v.tope}
              </Text>
            </View>

            {dentro.length === 0 ? (
              <Cuerpo tenue style={{ fontSize: 14, marginTop: espacio.xs }}>
                {elegido ? 'Toca aquí para cargarlo.' : 'Vacío.'}
              </Cuerpo>
            ) : (
              <View style={[estilos.bultos, { marginTop: espacio.sm }]}>
                {dentro.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => sacar(b.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Sacar ${b.nombre} del ${v.nombre}`}
                    style={({ pressed }) => [
                      estilos.bulto,
                      {
                        borderColor: conAlfa(C.oro500, 0.5),
                        backgroundColor: conAlfa(C.oro500, 0.12),
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[texto.cuerpo, { color: C.pergamino, fontSize: 15, flexShrink: 1 }]}
                    >
                      {b.nombre}
                    </Text>
                    <Text style={[texto.titulo, { color: C.oro300, fontSize: 16 }]}>{b.peso}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Pressable>
        );
      })}

      {choques.length > 0 && (
        <>
          <Seccion style={{ marginTop: espacio.md }}>Lo que no viaja junto</Seccion>
          <Marco>
            {choques.map((c) => (
              <Regla key={c.clave} texto={c.texto} rota={c.rota} />
            ))}
          </Marco>
        </>
      )}

      <Entrega
        rotulo="Cerrar el cargue"
        listo={listo}
        aviso={
          enElMuelle.length > 0
            ? `Quedan ${enElMuelle.length} en el muelle.`
            : pasados.length > 0
              ? 'Hay un vagón por encima de su tope.'
              : 'Hay dos bultos que no pueden viajar juntos.'
        }
        entregando={entregando}
        bloqueado={bloqueado}
        onPress={() => onEntregar(codificarCargue(reparto))}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// El despachador
// ---------------------------------------------------------------------------

/** Cuando el planteamiento no se entiende: se dice, y se puede seguir jugando. */
function NoSeEntiende(): JSX.Element {
  return (
    <Marco>
      <Etiqueta>Este instrumento no lo entiende tu versión</Etiqueta>
      <Cuerpo style={{ marginTop: espacio.xs }}>
        Actualiza la app cuando puedas. Mientras tanto ve a otro puesto: la estación tiene más
        instrumentos y cualquiera de ellos da la misma conformidad.
      </Cuerpo>
    </Marco>
  );
}

function Instrumento({
  instrumento,
  onEntregar,
  entregando,
  bloqueado,
}: {
  instrumento: InstrumentoVisible;
  onEntregar: (respuesta: string) => void;
  entregando: boolean;
  bloqueado: boolean;
}): JSX.Element {
  const comun = { onEntregar, entregando, bloqueado };

  switch (instrumento.cual) {
    case 'agujas': {
      const p = leerManiobra(instrumento.planteamiento);
      return p ? <Maniobra p={p} {...comun} /> : <NoSeEntiende />;
    }
    case 'telegrafo': {
      const p = leerParte(instrumento.planteamiento);
      return p ? <Parte p={p} {...comun} /> : <NoSeEntiende />;
    }
    case 'enclavamiento': {
      const p = leerEnclavamiento(instrumento.planteamiento);
      return p ? <Enclavamiento p={p} {...comun} /> : <NoSeEntiende />;
    }
    case 'muelle': {
      const p = leerCargue(instrumento.planteamiento);
      return p ? <Cargue p={p} {...comun} /> : <NoSeEntiende />;
    }
    default:
      /* Un instrumento que este binario no conoce. Ver la cabecera: el móvil
         puede ir por detrás del servidor y eso no puede tirar la pantalla. */
      return <NoSeEntiende />;
  }
}

// ---------------------------------------------------------------------------
// La pantalla
// ---------------------------------------------------------------------------

export default function PantallaPuesto(): JSX.Element {
  const { vista, cargando, error, refrescar } = usePartida();
  const [ocupando, setOcupando] = useState<string | null>(null);
  const [entregando, setEntregando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [logro, setLogro] = useState<string | null>(null);
  /*
   * «Cambiar de puesto» es SOLO de esta pantalla y no viaja a ninguna parte: en
   * el servidor sigues en el puesto que ocupaste hasta que ocupes otro, y así
   * tiene que ser —el plano y la ocupación que ven los demás cuelgan de ahí—. Lo
   * único que hace esta bandera es volver a enseñar la lista para poder elegir.
   */
  const [cambiando, setCambiando] = useState(false);

  /*
   * TODOS LOS HOOKS ANTES DE CUALQUIER `return`. React cuenta los hooks por su
   * orden de llamada, así que salir antes cambiaría cuántos hay entre la
   * pantalla de carga y la de partida, y React tiraría la pantalla entera.
   */
  if (cargando && !vista) {
    return (
      <Pantalla>
        <Cargando texto="Encendiendo la estación…" />
      </Pantalla>
    );
  }
  if (!vista) {
    return (
      <Pantalla>
        <AvisoError>{error ?? 'No hay ninguna partida activa.'}</AvisoError>
      </Pantalla>
    );
  }

  const n = leerEstadoNudo(vista.estadoDelJuego);
  if (!n) {
    return (
      <Pantalla>
        <AvisoDeLaPartida />
        <Cargando texto="El turno de noche todavía no ha entrado." />
      </Pantalla>
    );
  }

  const enFranja = vista.sesion.phase === 'ronda-abierta';

  /**
   * Todo lo que va al servidor pasa por aquí, y por eso está escrito una vez.
   *
   * `refrescar()` se llama SIEMPRE al terminar, también cuando la acción falla, y
   * eso no es por costumbre: un fallo suele significar que el estado se ha
   * movido por debajo —alguien rindió este puesto, quien dirige cerró la franja—
   * y volver a pedir la vista es justo lo que hace que la pantalla deje de
   * enseñar la estación de hace un minuto.
   */
  const hacer = async (
    accion: string,
    datos: Record<string, string>,
    alSalirBien: (resultado: unknown) => void,
  ): Promise<void> => {
    setFallo(null);
    try {
      const r = await api.hacerAccion(accion, datos);
      alSalirBien(r.resultado);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setLogro(null);
      setFallo(e instanceof Error ? e.message : 'No se pudo hacer eso.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      await refrescar();
    }
  };

  const ocupar = async (puestoId: string): Promise<void> => {
    setOcupando(puestoId);
    setLogro(null);
    await hacer('ocupar-puesto', { puesto: puestoId }, () => setCambiando(false));
    setOcupando(null);
  };

  const entregar = async (respuesta: string): Promise<void> => {
    setEntregando(true);
    await hacer('rendir-instrumento', { respuesta }, (resultado) =>
      setLogro(leerLogro(resultado)),
    );
    setEntregando(false);
  };

  // ---- Cabecera común a los dos estados ----
  const cabecera = (
    <Animated.View entering={FadeInDown.duration(400)}>
      <View style={estilos.cabecera}>
        <View style={{ flex: 1 }}>
          <Etiqueta>
            Franja {n.franja} de {n.franjas}
            {n.hora ? ` · ${n.hora}` : ''}
          </Etiqueta>
          <Titulo style={{ fontSize: 26 }}>El puesto</Titulo>
        </View>
      </View>
      <View style={estilos.contadores}>
        <View style={{ flex: 1 }}>
          <Contador etiqueta="tu margen" valor={n.yo.margen} />
        </View>
        <View style={{ flex: 1 }}>
          <Contador
            etiqueta="conformidades"
            valor={n.conformidades}
            tono={n.conformidades === 0 ? 'rojo' : 'oro'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Contador etiqueta="resueltos" valor={n.yo.instrumentosResueltos} tono="tenue" />
        </View>
      </View>
    </Animated.View>
  );

  const avisoDeFase = !enFranja ? (
    <Marco style={{ marginTop: espacio.md }}>
      <Etiqueta>La franja está cerrada</Etiqueta>
      <Cuerpo style={{ marginTop: espacio.xs }}>
        Puedes mirar el instrumento, pero no se entrega nada hasta que quien dirige abra la
        siguiente.
      </Cuerpo>
    </Marco>
  ) : null;

  // ---------------------------------------------------------------------------
  // ESTADO A · sin puesto (o cambiando)
  // ---------------------------------------------------------------------------
  if (!n.yo.puesto || cambiando) {
    return (
      <Pantalla>
        <AvisoDeLaPartida />
        {cabecera}

        {/*
         * ARRIBA DEL TODO Y ANTES DE LA LISTA. Es lo único de esta pantalla que
         * no se puede deducir mirándola, y si va debajo de seis tarjetas
         * pulsables no lo lee nadie: para cuando se llega ahí, ya se ha tocado
         * una.
         */}
        <Marco style={{ marginTop: espacio.md }}>
          <Etiqueta>Hay que ir hasta allí de verdad</Etiqueta>
          <Cuerpo style={{ marginTop: espacio.xs }}>
            Ocupar un puesto no es tocar un botón: es levantarse e ir a esa habitación de la casa.
            Ahí es donde se habla con quien ya está trabajando, y donde se resuelve el instrumento
            entre dos si hace falta.
          </Cuerpo>
        </Marco>

        {avisoDeFase}
        <AvisoError>{fallo}</AvisoError>

        <Ornamento />
        <Seccion>Los puestos de la estación</Seccion>
        <Cuerpo tenue style={{ marginBottom: espacio.sm, fontSize: 14 }}>
          El primero que resuelve un puesto en esta franja le da una conformidad a la estación. Los
          demás siguen ganando su margen.
        </Cuerpo>

        {n.puestos.length === 0 ? (
          <Marco>
            <Cuerpo tenue>Todavía no hay ningún puesto montado en esta franja.</Cuerpo>
          </Marco>
        ) : (
          n.puestos.map((p) => {
            const esMio = p.oficio !== undefined && p.oficio === n.yo.oficio;
            return (
              <Pressable
                key={p.id}
                onPress={() => void ocupar(p.id)}
                disabled={ocupando !== null || !enFranja}
                accessibilityRole="button"
                accessibilityLabel={`${p.nombre}${p.oficioNombre ? `, ${p.oficioNombre}` : ''}${
                  p.rendido ? ', ya rendido esta franja' : ''
                }${esMio ? ', es tu oficio' : ''}`}
                style={({ pressed }) => [
                  estilos.puesto,
                  {
                    borderColor: esMio ? C.oro500 : conAlfa(C.laton, 0.35),
                    borderLeftWidth: esMio ? 4 : 1,
                    backgroundColor: conAlfa(C.caoba900, 0.72),
                  },
                  (pressed || ocupando === p.id) && { opacity: 0.8 },
                  (ocupando !== null || !enFranja) && ocupando !== p.id && { opacity: 0.6 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={[texto.titulo, { color: C.pergamino, fontSize: 18 }]}
                  >
                    {p.nombre}
                  </Text>
                  <Cuerpo tenue style={{ fontSize: 14, marginTop: 2 }}>
                    {p.oficioNombre ?? 'sin instrumento montado'}
                  </Cuerpo>
                  {esMio ? (
                    <View style={{ marginTop: espacio.sm, alignSelf: 'flex-start' }}>
                      <View style={[estilos.selloOficio, { borderColor: C.oro500 }]}>
                        <Text
                          style={[
                            texto.microCaps,
                            { color: C.oro300, fontSize: 9, letterSpacing: 1.2 },
                          ]}
                        >
                          Tu oficio · rinde el doble
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={estilos.puestoMarca}>
                  <Text style={{ color: p.rendido ? C.oro300 : C.pergaminoTenue, fontSize: 20 }}>
                    {p.rendido ? '✓' : '·'}
                  </Text>
                  <Etiqueta
                    style={{
                      color: p.rendido ? C.laton : C.oro300,
                      fontSize: 9,
                      letterSpacing: 0.8,
                      textAlign: 'center',
                    }}
                  >
                    {p.rendido ? 'ya rendido' : 'da conformidad'}
                  </Etiqueta>
                </View>
              </Pressable>
            );
          })
        )}

        {cambiando && n.yo.puesto ? (
          <Boton onPress={() => setCambiando(false)} style={{ marginTop: espacio.md }}>
            Volver a {n.yo.puestoNombre ?? 'mi puesto'}
          </Boton>
        ) : null}
      </Pantalla>
    );
  }

  // ---------------------------------------------------------------------------
  // ESTADO B · en un puesto
  // ---------------------------------------------------------------------------
  const instrumento = n.instrumento;
  const esMiOficio = instrumento !== undefined && instrumento.cual === n.yo.oficio;

  return (
    <Pantalla>
      <AvisoDeLaPartida />
      {cabecera}

      <Animated.View entering={FadeIn.duration(360)}>
        <Marco style={{ marginTop: espacio.md }}>
          <Etiqueta>Estás en</Etiqueta>
          <Titulo style={{ fontSize: 22, marginTop: 2 }}>
            {n.yo.puestoNombre ?? 'un puesto de la estación'}
          </Titulo>
          {instrumento ? (
            <Cuerpo tenue style={{ marginTop: 2 }}>{instrumento.nombre}</Cuerpo>
          ) : null}

          {esMiOficio ? (
            <View style={{ marginTop: espacio.sm }}>
              <Sello>Tu oficio · rinde el doble</Sello>
            </View>
          ) : null}

          {instrumento ? (
            <Cuerpo
              tenue
              style={{ fontSize: 14, marginTop: espacio.sm }}
            >
              {instrumento.cuantosLoHanResuelto === 0
                ? 'Nadie lo ha sacado en esta franja: el primero le da una conformidad a la estación.'
                : `Ya lo han sacado ${instrumento.cuantosLoHanResuelto} ${
                    instrumento.cuantosLoHanResuelto === 1 ? 'persona' : 'personas'
                  }. La conformidad ya está dada; el margen se sigue ganando.`}
            </Cuerpo>
          ) : null}

          <Boton onPress={() => setCambiando(true)} style={{ marginTop: espacio.md }}>
            Cambiar de puesto
          </Boton>
        </Marco>
      </Animated.View>

      {avisoDeFase}

      {logro ? (
        <Animated.View entering={FadeInDown.duration(360)}>
          <Marco style={{ borderColor: C.oro500 }}>
            <Etiqueta style={{ color: C.oro300 }}>Instrumento resuelto</Etiqueta>
            <Cuerpo style={{ marginTop: espacio.xs }}>{logro}</Cuerpo>
          </Marco>
        </Animated.View>
      ) : null}

      <AvisoError>{fallo}</AvisoError>

      {!instrumento ? (
        <Marco>
          <Etiqueta>Aquí no hay nada montado</Etiqueta>
          <Cuerpo style={{ marginTop: espacio.xs }}>
            En este puesto no hay instrumento en esta franja. Vete a otro: cualquiera de ellos da la
            misma conformidad.
          </Cuerpo>
        </Marco>
      ) : instrumento.loHeResuelto ? (
        /*
         * Ya rendido POR TI: ni siquiera se pinta el minijuego. Volver a montarlo
         * es una entrega que el servidor rechaza con «ya lo has resuelto en esta
         * franja», o sea cinco minutos de trabajo para un mensaje de error. Lo
         * útil aquí es lo otro: mandar a otro puesto, que es lo que da algo.
         */
        <Marco>
          <Sello>Ya lo has sacado</Sello>
          <Cuerpo style={{ marginTop: espacio.md }}>
            Este instrumento ya lo has resuelto en esta franja y no cuenta dos veces. Si queda algún
            puesto sin rendir, ahí hay una conformidad esperando.
          </Cuerpo>
          <Boton
            variante="primario"
            onPress={() => setCambiando(true)}
            style={{ marginTop: espacio.md }}
          >
            Ir a otro puesto
          </Boton>
        </Marco>
      ) : (
        <Instrumento
          key={`${instrumento.puesto}:${instrumento.franja}`}
          instrumento={instrumento}
          onEntregar={(respuesta) => void entregar(respuesta)}
          entregando={entregando}
          bloqueado={!enFranja || entregando}
        />
      )}
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------
// Medidas y disposición. EL COLOR NO VIVE AQUÍ: `StyleSheet.create` se evalúa al
// importar el fichero —o sea antes de que haya partida— y congelaría la paleta,
// que es la advertencia de la cabecera de `ui.tsx`. Aquí abajo solo hay medidas.
//
// Todo lo pulsable llega a 44 puntos de alto: se juega de pie, con el móvil en
// una mano, y a esa hora nadie apunta.
// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center' },
  contadores: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.md },

  // ---- La lista de puestos ----
  puesto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.md,
    marginBottom: espacio.sm,
  },
  puestoMarca: { alignItems: 'center', width: 76 },
  selloOficio: {
    borderWidth: 1,
    borderRadius: radio.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  // ---- La maniobra ----
  playa: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espacio.sm,
    marginTop: espacio.xs,
    minHeight: 44,
  },
  ficha: {
    minWidth: 40,
    height: 44,
    borderWidth: 1.4,
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.sm,
  },
  mandos: { marginBottom: espacio.md },
  mandoFila: { flexDirection: 'row', gap: espacio.sm },
  mando: { flex: 1 },
  cuenta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espacio.sm,
  },

  // ---- El parte ----
  morse: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Los grupos van sueltos y con hueco ancho entre ellos: el hueco ENTRE
    // letras es la única separación que tiene el Morse, y si se pierde no hay
    // forma de saber dónde acaba una y empieza otra.
    gap: espacio.lg,
    marginTop: espacio.md,
  },
  morseGrupo: { alignItems: 'center' },
  morseSignos: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 16 },
  punto: { width: 13, height: 13, borderRadius: 7 },
  raya: { width: 34, height: 13, borderRadius: 4 },
  entrada: {
    marginTop: espacio.sm,
    borderWidth: 1.2,
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: 12,
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
  },
  chuleta: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  chuletaCasilla: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    minWidth: 62,
  },

  // ---- El enclavamiento ----
  cuadro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio.sm,
    marginTop: espacio.md,
  },
  palanca: { width: 62, alignItems: 'center', paddingVertical: espacio.xs },
  palancaCarril: {
    width: 24,
    height: 48,
    borderWidth: 1.4,
    borderRadius: radio.sm,
    padding: 2,
  },
  palancaPuno: { height: 18, borderRadius: 3 },
  regla: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.xs,
    borderWidth: 1,
    borderRadius: radio.sm,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.sm,
    marginBottom: espacio.xs,
  },

  // ---- El cargue ----
  bultos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  bulto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    minHeight: 44,
    maxWidth: '100%',
    borderWidth: 1.2,
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  vagon: {
    borderWidth: 1.4,
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  vagonCabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
});
