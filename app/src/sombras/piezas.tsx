/**
 * Las piezas visuales de El Paso de las Sombras.
 *
 * Viven aparte de `ui.tsx` porque `ui.tsx` es de la PLATAFORMA —el marco, el
 * botón, el sello: lo que tiene cualquier juego— y esto es de un juego concreto:
 * un mon en su círculo, la barra del rastro, una tira de mojón. Meterlo allí
 * habría sido el error de siempre: que lo común empiece a saber de qué se juega.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA LÍNEA QUE EL TABLERO DE DEDUCCIÓN NO CRUZA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * El tablero tacha lo que cada hito deja imposible **él solo**, y NO cruza unos
 * con otros. Es la misma línea que trazó el papiro de la Momia y merece
 * repetirse, porque la tentación de cruzarlos es enorme y arruinaría el juego:
 * con inferencia completa, la app resuelve la senda por ti en cuanto tienes
 * cuatro hitos, y entonces poner en común deja de ser una conversación y pasa a
 * ser copiar una pantalla.
 *
 * Lo que sí hace, y no es lo mismo, es avisar de una CONTRADICCIÓN: si con todo
 * lo que hay sobre la mesa no queda ninguna senda posible, alguien miente. Eso
 * no resuelve nada —no dice quién ni cuál— y es exactamente la información que
 * el juego quiere que circule.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Cuerpo, Etiqueta, espacio, radio, texto } from '../ui';
import { conAlfa } from '../tema-juego';
import { COLOR_SOMBRAS as C, SOMBRAS as S } from '../tema-sombras';
import { cumpleCondicion, variaciones, type Condicion } from '../../../shared/juegos';
import type { HitoVisible, PasoVisible } from './vista';

// ---------------------------------------------------------------------------
// El mon
// ---------------------------------------------------------------------------

/**
 * Un mon: el blasón dentro de su círculo.
 *
 * Es la pieza de identidad de este juego, y hace aquí lo que el `Sello` hace en
 * CLUEDO o el cartucho en la Momia. Se usa para los estandartes y para nada más:
 * si se usara para cualquier rótulo dejaría de significar «esto es una casa» y
 * pasaría a significar «esto es un recuadro».
 */
export function Mon({
  children,
  glifo = '紋',
  tono = 'acero',
  style,
}: {
  children: React.ReactNode;
  glifo?: string;
  tono?: 'acero' | 'anil' | 'apagado';
  style?: object;
}): JSX.Element {
  const paleta =
    tono === 'anil'
      ? { borde: S.anil, tinta: C.pergamino }
      : tono === 'apagado'
        ? { borde: conAlfa(C.laton, 0.3), tinta: conAlfa(C.pergaminoTenue, 0.55) }
        : { borde: C.oro500, tinta: C.oro300 };
  return (
    <View style={[estilos.monFila, style]}>
      <View style={[estilos.monCirculo, { borderColor: paleta.borde }]}>
        <Text style={{ color: paleta.tinta, fontSize: 13 }}>{glifo}</Text>
      </View>
      <Text
        numberOfLines={1}
        style={[texto.etiqueta, { color: paleta.tinta, fontSize: 13, letterSpacing: 0.6, flex: 1 }]}
      >
        {children}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// El rastro
// ---------------------------------------------------------------------------

/**
 * El reloj de la noche, y es COLECTIVO.
 *
 * En la Momia cada cual llevaba sus marcas y las miraba en su móvil; aquí el
 * contador es de la columna entera y todo el mundo ve el mismo número. Esa
 * diferencia es la mitad del juego —lo que uno hace lo paga la mesa— así que
 * esta barra tiene que estar en las tres pantallas y siempre igual.
 *
 * Se pinta con casillas y no con un porcentaje por lo mismo que en el papel: un
 * número que sube no se ve; una fila que se llena, sí. Y las tres últimas van en
 * bermellón, porque lo que importa no es cuánto ha subido sino cuánto queda.
 */
export function BarraDelRastro({
  rastro,
  maximo,
  compacta,
}: {
  rastro: number;
  maximo: number;
  compacta?: boolean;
}): JSX.Element {
  const queda = Math.max(0, maximo - rastro);
  const apremia = queda <= 2;
  return (
    <View style={compacta ? undefined : { marginBottom: espacio.md }}>
      <View style={estilos.rastroCabecera}>
        <Etiqueta>El rastro de la columna</Etiqueta>
        <Text
          style={[
            texto.etiqueta,
            { color: apremia ? S.rastro : C.pergaminoTenue, fontSize: 12 },
          ]}
        >
          {rastro} / {maximo}
        </Text>
      </View>
      <View style={estilos.rastroFila}>
        {Array.from({ length: maximo }, (_, i) => (
          <View
            key={i}
            style={[
              estilos.rastroCasilla,
              {
                backgroundColor: i < rastro ? S.rastro : 'transparent',
                borderColor:
                  i < rastro
                    ? S.rastro
                    : i >= maximo - 3
                      ? conAlfa(C.burdeos600, 0.55)
                      : conAlfa(C.laton, 0.4),
              },
            ]}
          />
        ))}
      </View>
      {!compacta && (
        <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.xs }}>
          {queda === 0
            ? 'La columna está interceptada. Por bien que se ande la senda, no se embarca.'
            : queda === 1
              ? 'Una pisada más y os cogen. No entréis donde no sepáis.'
              : `Quedan ${queda} antes de que os alcancen.`}
        </Cuerpo>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Los hitos
// ---------------------------------------------------------------------------

/** Lo que dice una condición, en una línea y sin prosa. Para el tablero. */
export function descripcionDe(c: Condicion, nombre: (id: string) => string): string {
  switch (c.tipo) {
    case 'antes':
      return `${nombre(c.a)} antes que ${nombre(c.b)}`;
    case 'seguido':
      return `${nombre(c.a)} → ${nombre(c.b)}, sin nada en medio`;
    case 'posicion':
      return `${nombre(c.a)} es el tramo ${c.posicion}`;
    case 'no-posicion':
      return `${nombre(c.a)} no es el tramo ${c.posicion}`;
    case 'extremo':
      return `${nombre(c.a)} abre o cierra`;
    case 'pasa-por':
      return `la senda pasa por ${nombre(c.a)}`;
    case 'no-pasa-por':
      return `la senda NO pasa por ${nombre(c.a)}`;
    default:
      return '';
  }
}

/**
 * Una tira de mojón.
 *
 * LO PRIVADO Y LO PÚBLICO SON DE OTRO MATERIAL, no llevan una etiqueta que los
 * distinga. Es la lección más importante que dejó el papiro de la Momia: contar
 * en voz alta algo que creías público y no lo era es delatarse solo, y en un
 * juego donde uno de los presentes miente, delatarse es perder. Lo tuyo va sobre
 * añil —tinta sobre papel de tu bolsillo—; lo de la mesa, sobre washi claro con
 * el sello bermellón de quien lo puso.
 */
export function TarjetaHito({
  hito,
  apartada,
  alTocar,
  nombreDePaso,
}: {
  hito: HitoVisible;
  /** Solo para los públicos: lo has apartado por no fiarte. */
  apartada?: boolean;
  alTocar?: () => void;
  nombreDePaso: (id: string) => string;
}): JSX.Element {
  const esPublico = hito.publico;
  const cuerpo = (
    <View
      style={[
        estilos.hito,
        esPublico
          ? { backgroundColor: apartada ? conAlfa(C.caoba900, 0.5) : C.pergamino, borderColor: S.bermellon }
          : { backgroundColor: conAlfa(S.anil, 0.28), borderColor: conAlfa(S.anil, 0.85) },
        apartada && { opacity: 0.55 },
      ]}
    >
      <View style={estilos.hitoCabecera}>
        <Etiqueta style={{ color: esPublico ? S.bermellon : C.laton }}>
          {esPublico ? 'Sobre la mesa' : 'En tu mano'}
        </Etiqueta>
        {hito.falso !== undefined && (
          <Etiqueta style={{ color: hito.falso ? S.bermellon : S.bambu }}>
            {hito.falso ? 'era mentira' : 'era cierto'}
          </Etiqueta>
        )}
      </View>
      <Text
        style={[
          texto.cuerpo,
          {
            color: esPublico && !apartada ? C.caoba700 : C.pergamino,
            fontSize: 17,
            lineHeight: 24,
          },
        ]}
      >
        {hito.texto}
      </Text>
      {(hito.publicadoPorNombre || hito.halladoEn) && (
        <Text
          style={[
            texto.microCaps,
            {
              color: esPublico && !apartada ? conAlfa(C.caoba700, 0.75) : C.pergaminoTenue,
              marginTop: espacio.sm,
              fontSize: 11,
            },
          ]}
        >
          {hito.publicadoPorNombre ? `Lo puso ${hito.publicadoPorNombre}` : ''}
          {hito.publicadoPorNombre && hito.halladoEn ? ' · ' : ''}
          {hito.halladoEn
            ? `dice haberlo leído en ${hito.halladoEn.pasoNombre || nombreDePaso(hito.halladoEn.pasoId)}, hora ${hito.halladoEn.ronda}`
            : ''}
        </Text>
      )}
      {apartada && (
        <Text style={[texto.microCaps, { color: C.pergaminoTenue, marginTop: espacio.sm, fontSize: 11 }]}>
          apartado · no cuenta en tu tablero
        </Text>
      )}
    </View>
  );

  if (!alTocar) return cuerpo;
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        alTocar();
      }}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
    >
      {cuerpo}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// El tablero de la senda
// ---------------------------------------------------------------------------

/** La columna «fuera de la senda». Se trata como una posición más. */
export const FUERA = 0;

export const clave = (paso: string, posicion: number): string => `${paso}|${posicion}`;

export interface Exclusiones {
  /** Casillas que un hito, ÉL SOLO, deja imposibles. */
  imposibles: Set<string>;
  /** Casillas que un hito, ÉL SOLO, deja confirmadas. */
  seguras: Set<string>;
}

/**
 * Qué tacha cada condición POR SÍ SOLA.
 *
 * Sin cruzar unas con otras: ver la cabecera del fichero. Lo que se marca aquí
 * es lo que una persona vería de un vistazo leyendo esa frase y nada más, que es
 * exactamente el trabajo que la app puede ahorrarle sin quitarle el juego.
 *
 * La posición `0` es «fuera de la senda». Tratarla como una columna más es lo
 * que hace que las dos condiciones nuevas de este juego —«pasa por» y «no pasa
 * por»— se puedan pintar en el mismo tablero que las de orden, en vez de en una
 * lista aparte que nadie miraría.
 */
export function exclusionesDe(
  condiciones: Condicion[],
  pasos: PasoVisible[],
  tramos: number,
): Exclusiones {
  const imposibles = new Set<string>();
  const seguras = new Set<string>();
  const posiciones = Array.from({ length: tramos }, (_, i) => i + 1);

  const dentro = (a: string): void => {
    // Afirmar algo de un paso implica que la senda pasa por él.
    imposibles.add(clave(a, FUERA));
  };

  for (const c of condiciones) {
    switch (c.tipo) {
      case 'posicion': {
        dentro(c.a);
        seguras.add(clave(c.a, c.posicion));
        for (const p of posiciones) if (p !== c.posicion) imposibles.add(clave(c.a, p));
        // Y ese tramo ya no puede ser de nadie más.
        for (const otro of pasos) {
          if (otro.id !== c.a) imposibles.add(clave(otro.id, c.posicion));
        }
        break;
      }
      case 'no-posicion':
        imposibles.add(clave(c.a, c.posicion));
        break;
      case 'pasa-por':
        dentro(c.a);
        break;
      case 'no-pasa-por':
        seguras.add(clave(c.a, FUERA));
        for (const p of posiciones) imposibles.add(clave(c.a, p));
        break;
      case 'extremo':
        dentro(c.a);
        for (const p of posiciones) {
          if (p !== 1 && p !== tramos) imposibles.add(clave(c.a, p));
        }
        break;
      case 'antes':
      case 'seguido':
        dentro(c.a);
        dentro(c.b);
        // El que va antes no puede cerrar; el que va después no puede abrir.
        imposibles.add(clave(c.a, tramos));
        imposibles.add(clave(c.b, 1));
        break;
      default:
        break;
    }
  }
  return { imposibles, seguras };
}

/**
 * ¿Se contradicen entre sí?
 *
 * AQUÍ SÍ SE CRUZAN, y es la única excepción a la regla de arriba. No resuelve
 * nada —no dice quién miente ni cuál es la mentira— pero sí dice que ALGUIEN
 * miente, y esa es justamente la información que el juego quiere que circule por
 * la mesa en voz alta.
 *
 * Se recorren todas las variaciones. Con seis pasos son 360 y con diez, 5 040:
 * se recorren en un suspiro incluso en un móvil viejo, y la alternativa —un
 * resolutor con poda— podría tener un fallo sutil que dijera «hay mentira»
 * cuando no la hay. Acusar en falso es peor que no acusar.
 */
export function hayContradiccion(
  condiciones: Condicion[],
  pasos: PasoVisible[],
  tramos: number,
): boolean {
  if (condiciones.length === 0 || pasos.length < tramos) return false;
  const ids = pasos.map((p) => p.id);
  return !variaciones(ids, tramos).some((senda) =>
    condiciones.every((c) => cumpleCondicion(senda, c)),
  );
}

/**
 * El tablero: pasos por tramos, con la columna de «fuera».
 *
 * Se lee de un vistazo y no hace falta explicarlo: una casilla tachada es un
 * sitio donde ese paso no puede ir. Lo que NO se pinta es la deducción cruzada,
 * que es lo que convertiría esto en un resolutor.
 */
export function TableroDeLaSenda({
  pasos,
  tramos,
  exclusiones,
}: {
  pasos: PasoVisible[];
  tramos: number;
  exclusiones: Exclusiones;
}): JSX.Element {
  const posiciones = [...Array.from({ length: tramos }, (_, i) => i + 1), FUERA];
  return (
    <View style={estilos.tablero}>
      <View style={estilos.tableroFila}>
        <View style={estilos.tableroNombre} />
        {posiciones.map((p) => (
          <View key={p} style={estilos.tableroCelda}>
            <Text style={[texto.microCaps, { color: C.laton, fontSize: 10 }]}>
              {p === FUERA ? 'fuera' : `${p}.º`}
            </Text>
          </View>
        ))}
      </View>
      {pasos.map((paso) => (
        <View key={paso.id} style={estilos.tableroFila}>
          <View style={estilos.tableroNombre}>
            <Text numberOfLines={1} style={[texto.cuerpo, { color: C.pergamino, fontSize: 14 }]}>
              {paso.nombre}
            </Text>
          </View>
          {posiciones.map((p) => {
            const k = clave(paso.id, p);
            const seguro = exclusiones.seguras.has(k);
            const imposible = !seguro && exclusiones.imposibles.has(k);
            return (
              <View
                key={p}
                style={[
                  estilos.tableroCelda,
                  estilos.tableroCasilla,
                  {
                    borderColor: seguro
                      ? S.bambu
                      : imposible
                        ? conAlfa(C.burdeos600, 0.5)
                        : conAlfa(C.laton, 0.3),
                    backgroundColor: seguro
                      ? conAlfa(S.bambu, 0.28)
                      : imposible
                        ? conAlfa(C.burdeos700, 0.28)
                        : 'transparent',
                  },
                ]}
              >
                <Text
                  style={{
                    color: seguro ? C.pergamino : imposible ? conAlfa(C.pergaminoTenue, 0.8) : 'transparent',
                    fontSize: 13,
                  }}
                >
                  {seguro ? '●' : imposible ? '✕' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// El disfraz
// ---------------------------------------------------------------------------

/** Tu disfraz, con su kanji y lo que hace. Se mira mucho: va compacto. */
export function TarjetaDisfraz({
  rol,
  kanji,
  queHace,
  usado,
  compacta,
}: {
  rol?: string;
  kanji?: string;
  queHace?: string;
  usado: boolean;
  compacta?: boolean;
}): JSX.Element {
  return (
    <View style={[estilos.disfraz, usado && { opacity: 0.6 }]}>
      <View style={estilos.disfrazSello}>
        <Text style={{ color: C.oro300, fontSize: compacta ? 17 : 21 }}>{kanji ?? '忍'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={estilos.rastroCabecera}>
          <Etiqueta>Tu disfraz</Etiqueta>
          {usado && <Etiqueta style={{ color: C.pergaminoTenue }}>usado esta hora</Etiqueta>}
        </View>
        <Text style={[texto.titulo, { color: C.oro300, fontSize: compacta ? 17 : 19 }]}>
          {rol ?? 'Sin disfraz'}
        </Text>
        {!compacta && queHace && (
          <Cuerpo tenue style={{ marginTop: espacio.xs, fontSize: 15, lineHeight: 21 }}>
            {queHace}
          </Cuerpo>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  monFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  monCirculo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rastroCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rastroFila: { flexDirection: 'row', gap: 4, marginTop: espacio.xs, flexWrap: 'wrap' },
  rastroCasilla: { width: 16, height: 16, borderWidth: 1.2, borderRadius: 3 },

  hito: {
    borderWidth: 1.2,
    borderRadius: radio.md,
    padding: espacio.md,
    marginBottom: espacio.sm,
  },
  hitoCabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: espacio.xs,
  },

  tablero: { marginTop: espacio.sm },
  tableroFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  tableroNombre: { flex: 1, paddingRight: espacio.sm },
  tableroCelda: { width: 30, alignItems: 'center', justifyContent: 'center' },
  tableroCasilla: { height: 26, borderWidth: 1, borderRadius: 4, marginLeft: 3 },

  disfraz: { flexDirection: 'row', gap: espacio.md, alignItems: 'flex-start' },
  disfrazSello: {
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: conAlfa(C.oro500, 0.6),
    backgroundColor: conAlfa(S.anil, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
