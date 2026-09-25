/**
 * EL TRADUCTOR: del `Barrio` de la noche (el de la sala y el servidor) al `PlanoDeLaCiudad` (el del
 * pintor). Lo único de la ciudad que conoce la forma del barrio.
 *
 * ═══ QUÉ SE TRADUCE Y QUÉ SE INVENTA ═══
 *
 * Todo lo que ESTORBA o se ve igual en todos los aparatos sale del barrio sin tocarlo: las cajas,
 * las alturas de cada tramo, la cara de cada fachada y su planta baja, los rótulos con su texto y su
 * color, el horario del tren. Lo que el barrio deja al cliente (`quiebro-barrio.ts`, «Lo que no
 * está») se decide aquí o en los constructores, siempre con el hash del sitio para que dos aparatos
 * vean lo mismo: qué coche es un taxi, a qué altura cuelga la farola, qué ventana está encendida.
 *
 * Los retranqueos se hacen aquí: el barrio dice «el tramo 2 se mete 2 m desde cada fachada» y el
 * pintor necesita la caja ya metida. Sólo desde las caras que dan a la calle; por las medianeras el
 * volumen sigue a paño con el vecino, como en una manzana de verdad.
 */
import type {
  Barrio,
  CajaDelBarrio,
  Cara,
  EstiloDeFachada as EstiloDelBarrio,
  FachadaDelEdificio,
  RotuloDelBarrio,
  TramoDeAltura,
} from '../../../../shared/arcade/juegos/quiebro-barrio';
import type { IdDeDistrito } from '../../../../shared/arcade/juegos/quiebro-ciudad';
import { ANCHO_DE_ACERA, ANCHO_DE_CALZADA, EJES_DE_CALLE, MEDIO_BARRIO, barrioDeLaNoche, trenEn } from '../../../../shared/arcade/juegos/quiebro-barrio';
import type {
  CabinaDelPlano,
  CajaXZ,
  CalleDelPlano,
  CocheDelPlano,
  EdificioDelPlano,
  EstiloDeFachada,
  FarolaDelPlano,
  Orientacion,
  PiezaConFrente,
  PlanoDeLaCiudad,
  RotuloDelPlano,
  TipoDeCoche,
  Volumen,
} from './tipos';
import { azarEn } from './azar';

/** El rumbo de 256 (0 norte, 64 este…) a la orientación más cercana. */
export function orientacionDelRumbo(rumbo: number): Orientacion {
  const r = ((Math.round(rumbo / 64) % 4) + 4) % 4;
  return r === 0 ? 'n' : r === 1 ? 'e' : r === 2 ? 's' : 'o';
}

/** La cara de una fachada (norte, este…) a la orientación del plano. */
export function orientacionDeLaCara(c: Cara): Orientacion {
  return c === 'norte' ? 'n' : c === 'este' ? 'e' : c === 'sur' ? 's' : 'o';
}

function cajaDe(c: CajaDelBarrio | undefined): CajaXZ {
  if (c === undefined) throw new Error('el barrio apunta a una caja que no tiene');
  return { x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 };
}

const ESTILO: Readonly<Record<EstiloDelBarrio, EstiloDeFachada>> = {
  ladrillo: 'ladrillo',
  revoco: 'revoco',
  piedra: 'piedra',
  azulejo: 'azulejo',
  hormigon: 'hormigon',
  vidrio: 'vidrio',
};

/** La huella metida `entrante` metros desde cada cara de `caras`. */
function metida(h: CajaXZ, caras: readonly Orientacion[], entrante: number): CajaXZ {
  return {
    x0: h.x0 + (caras.includes('o') ? entrante : 0),
    x1: h.x1 - (caras.includes('e') ? entrante : 0),
    z0: h.z0 + (caras.includes('n') ? entrante : 0),
    z1: h.z1 - (caras.includes('s') ? entrante : 0),
  };
}

/** Qué coche hay en una caja: por el hash de su sitio, igual en todos los aparatos. */
function tipoDeCoche(c: CajaXZ): TipoDeCoche {
  const h = azarEn(Math.round(c.x0 * 4), Math.round(c.z0 * 4), 31);
  return h < 0.55 ? 'turismo' : h < 0.8 ? 'taxi' : 'furgoneta';
}

/** Lo de un edificio que el pintor necesita, como lo dan el barrio y la ciudad (los dos salen del mismo generador). */
export interface EdificioQueSeTraduce {
  readonly huella: CajaXZ;
  readonly tramos: readonly TramoDeAltura[];
  readonly estilo: EstiloDelBarrio;
  readonly tono: number;
  readonly vano: number;
  readonly balcones: boolean;
  readonly semilla: number;
  readonly fachadas: readonly FachadaDelEdificio[];
  /** El distrito de su hueco: lo da la ciudad (`EdificioDeLaCiudad.distrito`); el barrio viejo no lo tiene. */
  readonly distrito?: IdDeDistrito;
}

/**
 * UN EDIFICIO DEL PLANO a partir del del barrio o de la ciudad: los volúmenes con sus retranqueos hechos
 * (sólo desde las caras que dan a la calle), la altura de planta, las fachadas y los soportales. `bajo` es
 * su caja de choque (la planta baja, ya metida en cada cara con soportal) y `pilares` las de sus pilares.
 */
export function edificioDelPlano(e: EdificioQueSeTraduce, bajo: CajaXZ, soportales: readonly Cara[], pilares: readonly CajaXZ[]): EdificioDelPlano {
  const caras = e.fachadas.map((f) => orientacionDeLaCara(f.cara));
  const volumenes: Volumen[] = [];
  e.tramos.forEach((t, i) => {
    const planta = i === 0 ? bajo : t.entrante > 0 ? metida(e.huella, caras, t.entrante) : e.huella;
    volumenes.push({ ...planta, y0: t.desde, y1: t.hasta });
  });
  const cuerpo = e.tramos[1] ?? e.tramos[0];
  const alturaDePlanta = cuerpo === undefined || cuerpo.plantas === 0 ? 3 : (cuerpo.hasta - cuerpo.desde) / cuerpo.plantas;
  const fondo = (c: Cara): number =>
    c === 'norte' ? bajo.z0 - e.huella.z0 : c === 'sur' ? e.huella.z1 - bajo.z1 : c === 'oeste' ? bajo.x0 - e.huella.x0 : e.huella.x1 - bajo.x1;
  return {
    huella: e.huella,
    caja: bajo,
    volumenes,
    estilo: ESTILO[e.estilo],
    tono: (e.tono + 0.5) / 4,
    vano: e.vano,
    balcones: e.balcones,
    plantaBaja: e.tramos[0]?.hasta ?? 4.5,
    alturaDePlanta,
    fachadas: e.fachadas.map((f) => ({ mira: orientacionDeLaCara(f.cara), bajo: f.bajo })),
    soportales: soportales.map((c) => ({ mira: orientacionDeLaCara(c), fondo: fondo(c) })).filter((s) => s.fondo > 0.01),
    pilares,
    semilla: e.semilla,
    ...(e.distrito !== undefined ? { distrito: e.distrito } : {}),
  };
}

/** Un rótulo del barrio o de la ciudad, como lo pinta el plano. */
export function rotuloDelPlano(r: RotuloDelBarrio): RotuloDelPlano {
  return {
    texto: r.texto,
    x: r.x,
    y: r.y,
    z: r.z,
    mira: orientacionDeLaCara(r.cara),
    ancho: r.ancho,
    alto: r.alto,
    color: r.color,
    forma: r.clase === 'tienda' ? 'fachada' : 'bandera',
    parpadea: r.parpadea,
  };
}

/** Un coche aparcado en su caja: el tipo y la semilla por el hash de su sitio, igual en todos los aparatos. */
export function cocheDelPlano(caja: CajaXZ, mira: number): CocheDelPlano {
  return { tipo: tipoDeCoche(caja), caja, mira: orientacionDelRumbo(mira), semilla: Math.round(azarEn(Math.round(caja.x0 * 4), Math.round(caja.z1 * 4)) * 65535) };
}

/** El plano del barrio de verdad. */
export function planoDe(barrio: Barrio): PlanoDeLaCiudad {
  const cajas = barrio.cajas;
  const limite = barrio.limites.find((l) => l.id === 'barrio')?.caja ?? {
    x0: -MEDIO_BARRIO,
    z0: -MEDIO_BARRIO,
    x1: MEDIO_BARRIO,
    z1: MEDIO_BARRIO,
  };

  const calles: CalleDelPlano[] = [];
  for (const en of EJES_DE_CALLE) {
    for (const corre of ['x', 'z'] as const) {
      calles.push({ corre, en, desde: limite.x0, hasta: limite.x1, acera: ANCHO_DE_ACERA, calzada: ANCHO_DE_CALZADA });
    }
  }

  const edificios: EdificioDelPlano[] = barrio.edificios.map((e) =>
    edificioDelPlano(e, cajaDe(cajas[e.caja]), e.soportal === null ? [] : [e.soportal], e.pilares.map((i) => cajaDe(cajas[i]))),
  );

  const deTipo = (tipo: CajaDelBarrio['tipo']): CajaDelBarrio[] => cajas.filter((c) => c.tipo === tipo);
  const conFrente = (c: CajaDelBarrio): PiezaConFrente => ({ caja: cajaDe(c), mira: orientacionDelRumbo(c.mira) });

  const plaza = barrio.manzanas.find((m) => m.tipo === 'glorieta')?.solar ?? { x0: -18, z0: -18, x1: 18, z1: 18 };
  const dentroDeLaPlaza = (c: CajaXZ): boolean => c.x0 >= plaza.x0 && c.x1 <= plaza.x1 && c.z0 >= plaza.z0 && c.z1 <= plaza.z1;
  const fuente = deTipo('fuente')[0];
  const quiosco = deTipo('quiosco')[0];

  const farolas: FarolaDelPlano[] = deTipo('farola').map((c) => {
    const caja = cajaDe(c);
    const deLaPlaza = dentroDeLaPlaza(caja);
    return {
      x: (c.x0 + c.x1) / 2,
      z: (c.z0 + c.z1) / 2,
      altura: deLaPlaza ? 4.6 : 6.2,
      brazo: deLaPlaza ? null : orientacionDelRumbo(c.mira),
      caja,
    };
  });

  const coches: CocheDelPlano[] = deTipo('coche').map((c) => cocheDelPlano(cajaDe(c), c.mira));

  const cabinas: CabinaDelPlano[] = [...barrio.cabinas, barrio.refugio].map((c) => ({
    x: c.poste.x,
    z: c.poste.z,
    mira: orientacionDelRumbo(c.mira),
    refugio: c.id === 'refugio',
    caja: cajaDe(cajas[c.caja]),
  }));

  const rotulos: RotuloDelPlano[] = barrio.adorno.rotulos.map(rotuloDelPlano);

  const t = barrio.tren;
  const tren = {
    eje: t.eje,
    linea: t.linea,
    desde: t.desde,
    hasta: t.hasta,
    alto: t.alto,
    largo: t.largo,
    pilares: t.pilares.map((i) => cajaDe(cajas[i])),
    enTic: (tic: number) => trenEn(barrio, tic),
  };

  const hora = `${String(barrio.adorno.hora.h)}:${barrio.adorno.hora.m < 10 ? '0' : ''}${String(barrio.adorno.hora.m)}`;
  return {
    semilla: barrio.semilla,
    nombre: barrio.adorno.nombre,
    hora,
    tiempo: barrio.adorno.tiempo,
    limite,
    manzanas: barrio.manzanas.filter((m) => m.tipo === 'edificada').map((m) => m.solar),
    calles,
    edificios,
    glorieta: {
      caja: plaza,
      quiosco: quiosco === undefined ? null : conFrente(quiosco),
      fuente:
        fuente === undefined
          ? null
          : { x: (fuente.x0 + fuente.x1) / 2, z: (fuente.z0 + fuente.z1) / 2, radio: (fuente.x1 - fuente.x0) / 2, caja: cajaDe(fuente) },
      bancos: deTipo('banco').map(conFrente),
    },
    tren,
    rotulos,
    coches,
    cabinas,
    farolas,
    quioscosDePrensa: deTipo('quiosco-de-prensa').map(conFrente),
    cerco: deTipo('fachada-exterior').map(cajaDe),
    vallas: deTipo('valla').map(cajaDe),
    estructura: cajas.map(cajaDe),
  };
}

/** El plano de una noche de una mesa. */
export function planoDelBarrio(codigo: string, noche: number): PlanoDeLaCiudad {
  return planoDe(barrioDeLaNoche(codigo, noche));
}
