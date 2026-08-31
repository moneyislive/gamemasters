/**
 * El cuadro: la pantalla donde se juega El Nudo de Valdehierro.
 *
 * Es la pestaña «Cuadro» y es la única de mesa que tiene este juego. Los otros
 * tres cuelgan de la pestaña genérica `ronda` —CLUEDO entero, la vigilia de la
 * Momia, la hora de las Sombras— y aquí no hay ninguna: el manifiesto no la
 * declara en su barra. Así que todo lo que se hace CON LOS DEMÁS pasa por aquí,
 * desde decir que estás en tu puesto antes de empezar hasta entregar tu cuadro
 * de memoria al final. Lo que se hace a solas —el instrumento del puesto que
 * ocupas— vive en la pestaña «Puesto», que es la otra mitad de la noche.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EL ORDEN DE LOS BLOQUES ES EL ORDEN DE LA NOCHE, Y NO ES DECORATIVO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Se juega DE PIE, con el móvil en una mano y el cuadro de marchas de papel en
 * la otra, a las dos de la mañana y con alguien hablando encima. Bajar a buscar
 * algo cuesta, así que arriba va lo que se mira cada treinta segundos —en qué
 * franja vamos, cuánto retraso llevamos, cuántas conformidades quedan— y debajo,
 * en este orden: el cuadro que se está rehaciendo, la orden que se cursa con él,
 * lo que se puede comprar si no se llega a tiempo, y por último la crónica y la
 * entrega, que se leen una vez cada una.
 *
 * CURSAR VA ANTES QUE CONSULTAR A PROPÓSITO. Es la única acción que mueve la
 * noche: las demás compran información o tiempo para poder cursar mejor. Puesta
 * debajo del archivo, la pantalla insinuaría que primero se paga y luego se
 * decide, que es justo la partida cara.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE LA CUADRÍCULA SÍ SABE, QUE SON LOS CONVOYES QUE YA CRUZARON
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Las marcas viven en `useState` y no van a ningún sitio: es el cuaderno de cada
 * cual, y el porqué está escrito entero en la cabecera de `src/nudo/piezas.tsx`.
 * Pero hay una parte del cuadro que ya no es sospecha sino HECHO: el
 * enclavamiento ha dado paso a unos convoyes, en un orden que vio la mesa
 * entera. Esas casillas se pintan puestas y no se pueden tocar.
 *
 * Y NO ES LA DEDUCCIÓN QUE LA PIEZA SE NIEGA A HACER. Allí lo que no se cruza es
 * el círculo que ALGUIEN APUNTA —una hipótesis— con el resto de la cuadrícula:
 * tachar una fila por un círculo a lápiz sería razonar por la mesa a partir de
 * algo que puede estar mal. Aquí no se razona nada: se escribe en seis casillas
 * un hecho que ya es verdad en una, porque un convoy que salió no puede salir
 * otra vez y una franja resuelta no admite a nadie más. La alternativa era
 * dejar que el cuaderno contradijera a un convoy que todo el mundo vio salir.
 *
 * OJO A DE DÓNDE SALE LA FRANJA DE CADA SALIDA: del ORDEN de las órdenes
 * aceptadas, no del campo `franja` de la orden. Son cosas distintas en cuanto
 * una franja se cierra sin despachar a nadie —el cuadro se corre, como se corre
 * un horario de verdad— y confundirlas pintaría el cuaderno con hechos falsos
 * justo en la noche que peor va.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LO QUE NO SE PUEDE HACER SE VE APAGADO, NUNCA ESCONDIDO
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Qué se puede hacer ahora lo dice `vista.acciones`, que el servidor ya filtra
 * por fase; esta pantalla no compara nombres de fase para decidirlo. Y cuando
 * algo no se puede, el botón se queda ahí desactivado: en una mesa, un control
 * que desaparece parece un fallo de la app y se resuelve preguntando en voz
 * alta, que es la peor manera de resolver nada a las tres de la mañana.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as api from '../../src/api';
import { usePartida } from '../../src/estado';
import { Reloj } from '../../src/reloj';
import { AvisoDeLaPartida } from '../../src/conexion';
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
import { Teleindicador, Via } from '../../src/nudo/teleindicador';
import {
  BarraDelRetraso,
  Contador,
  Cuadricula,
  FilaDeConvoy,
  SelloDeOrden,
  claveDeMarca,
  siguienteMarca,
} from '../../src/nudo/piezas';
import { leerEstadoNudo } from '../../src/nudo/vista';
import type { EstadoNudoVisible, OrdenVisible } from '../../src/nudo/vista';
/*
 * Las tres cifras que la pantalla enuncia en voz alta —lo que cuesta un rechazo
 * y lo que recupera un minuto— salen del contrato compartido y no se escriben a
 * mano. Prometer «un minuto» donde el reductor cobra dos es de las mentiras que
 * nadie comprueba hasta que la noche se pierde por dos minutos.
 */
import {
  RETRASO_POR_ORDEN_RECHAZADA,
  RETRASO_QUE_RECUPERA,
  horaDeFranja,
} from '../../../shared/juegos';

/** Una consulta ya pagada, tal y como se queda apuntada en la pantalla. */
interface ConsultaHecha {
  convoy: string;
  franja: number;
  posible: boolean;
  respuesta: string;
}

// ---------------------------------------------------------------------------
// Leer lo que contesta el servidor
// ---------------------------------------------------------------------------

/*
 * `hacerAccion` devuelve `resultado: unknown`, y tiene que devolverlo: el motor
 * transporta lo que conteste un reductor que no conoce. Se lee a la defensiva y
 * campo a campo por lo mismo que `vista.ts` lee el estado así — un móvil con una
 * versión más vieja que el servidor tiene que enseñar menos, no reventar—, y va
 * aquí y no allí porque esto es otra puerta: el estado entra por la vista y la
 * contestación de una acción entra por su respuesta.
 */
function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cadena(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function leerOrdenCursada(resultado: unknown): { aceptada: boolean; anuncio: string } | undefined {
  if (!esObjeto(resultado)) return undefined;
  return { aceptada: resultado.aceptada === true, anuncio: cadena(resultado.anuncio) };
}

function leerConsulta(resultado: unknown): { posible: boolean; respuesta: string } | undefined {
  if (!esObjeto(resultado)) return undefined;
  return { posible: resultado.posible === true, respuesta: cadena(resultado.respuesta) };
}

function leerAnuncio(resultado: unknown): string {
  return esObjeto(resultado) ? cadena(resultado.anuncio) : '';
}

// ---------------------------------------------------------------------------
// Lo que ya es un hecho en la cuadrícula
// ---------------------------------------------------------------------------

/**
 * Las casillas que el enclavamiento ya ha decidido, listas para pintarse fijas.
 *
 * La i-ésima orden ACEPTADA ocupa la franja i del cuadro, se haya cursado en la
 * franja de reloj que sea: es la posición que el reductor compara con el cuadro
 * verdadero, así que es la única lectura que no puede mentir.
 */
function casillasCiertas(
  estado: EstadoNudoVisible | undefined,
  convoyes: Array<{ id: string }>,
): Record<string, 'x' | 'o'> {
  const ciertas: Record<string, 'x' | 'o'> = {};
  if (!estado) return ciertas;

  let posicion = 0;
  for (const orden of estado.ordenes) {
    if (!orden.aceptada) continue;
    const franja = posicion;
    posicion++;
    if (franja >= estado.franjas) break;

    ciertas[claveDeMarca(orden.convoy, franja)] = 'o';
    /* Ese convoy no vuelve a salir… */
    for (let f = 0; f < estado.franjas; f++) {
      if (f !== franja) ciertas[claveDeMarca(orden.convoy, f)] = 'x';
    }
    /* …y esa franja ya tiene dueño. */
    for (const convoy of convoyes) {
      if (convoy.id !== orden.convoy) ciertas[claveDeMarca(convoy.id, franja)] = 'x';
    }
  }
  return ciertas;
}

/** La crónica agrupada por franja, la más reciente arriba. */
function cronicaPorFranjas(
  ordenes: OrdenVisible[],
): Array<{ franja: number; ordenes: OrdenVisible[] }> {
  const grupos: Array<{ franja: number; ordenes: OrdenVisible[] }> = [];
  for (const orden of [...ordenes].reverse()) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.franja === orden.franja) ultimo.ordenes.push(orden);
    else grupos.push({ franja: orden.franja, ordenes: [orden] });
  }
  return grupos;
}

// ---------------------------------------------------------------------------
// La ficha de elegir
// ---------------------------------------------------------------------------

/**
 * Una ficha pulsable: un convoy, una franja, un convoy para una franja.
 *
 * Es la única pieza que se repite en tres bloques de esta pantalla y por eso
 * está aquí y no en `piezas.tsx`: allí van las cosas que un día pintará otra
 * pantalla del juego, y esto es la carpintería de esta. Los 44 puntos de alto no
 * son de gusto: son lo que se pulsa sin apuntar con el móvil en una mano.
 *
 * `apagada` es «esto ya está puesto en otro sitio», no «esto no se puede»: la
 * ficha sigue admitiendo el toque, porque mover un convoy de franja es la
 * corrección más frecuente al rellenar el cuadro final.
 */
function Ficha({
  rotulo,
  nota,
  activa,
  apagada,
  onPress,
}: {
  rotulo: string;
  nota?: string;
  activa: boolean;
  apagada?: boolean;
  onPress: () => void;
}): JSX.Element {
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={activa ? { selected: true } : {}}
      style={({ pressed }) => [
        estilos.ficha,
        {
          borderColor: activa ? C.oro400 : conAlfa(C.laton, 0.4),
          backgroundColor: activa ? conAlfa(C.oro500, 0.18) : conAlfa(C.caoba900, 0.62),
        },
        apagada && !activa && { opacity: 0.42 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[texto.etiqueta, { color: activa ? C.oro300 : C.pergamino, fontSize: 13 }]}>
        {rotulo}
      </Text>
      {nota ? (
        <Text style={[texto.microCaps, { color: C.laton, fontSize: 9, letterSpacing: 0.8 }]}>
          {nota}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// La pantalla
// ---------------------------------------------------------------------------

export default function PantallaCuadro(): JSX.Element {
  const { vista, cargando, error, refrescar } = usePartida();

  /* El cuaderno de cada cual. No viaja al servidor: ver la cabecera. */
  const [marcas, setMarcas] = useState<Record<string, 'x' | 'o' | undefined>>({});
  const [convoyElegido, setConvoyElegido] = useState<string | null>(null);
  const [sello, setSello] = useState<{ aceptada: boolean; nombre: string; anuncio: string } | null>(
    null,
  );
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [consultaConvoy, setConsultaConvoy] = useState<string | null>(null);
  const [consultaFranja, setConsultaFranja] = useState(1);
  const [consultas, setConsultas] = useState<ConsultaHecha[]>([]);
  const [dichoDeLaMana, setDichoDeLaMana] = useState<string | null>(null);
  const [entrega, setEntrega] = useState<Record<string, string>>({});
  const [avisando, setAvisando] = useState(false);

  /*
   * TODOS LOS HOOKS ANTES DE CUALQUIER `return`. React identifica los hooks por
   * su orden de llamada, así que salir antes cambiaría cuántos hay entre la
   * pantalla de carga, la sala de espera y la noche en curso, y React tiraría la
   * pantalla entera al pasar de una a otra.
   */
  const estado = useMemo(() => leerEstadoNudo(vista?.estadoDelJuego), [vista?.estadoDelJuego]);

  /**
   * Las filas de la cuadrícula, en un orden que NO cambia en toda la noche.
   *
   * Sale de las opciones del primer eje porque ahí están los seis convoyes en el
   * orden del taller, que es el del cuadro de papel que hay encima de la mesa.
   * Componerlo con `salidos` y `porSalir` habría sido lo directo y habría movido
   * las filas cada vez que uno cruza: las marcas a lápiz de quien juega parecen
   * saltar de sitio solas, y a esas horas eso no se atribuye a un reordenamiento
   * sino a que la app ha perdido los apuntes.
   */
  const convoyesDelCuadro = useMemo<Array<{ id: string; nombre: string }>>(() => {
    const delEje = vista?.ejes[0]?.opciones ?? [];
    if (delEje.length > 0) return delEje.map((o) => ({ id: o.id, nombre: o.nombre }));
    if (!estado) return [];
    return [...estado.porSalir, ...estado.salidos].map((c) => ({ id: c.id, nombre: c.nombre }));
  }, [vista?.ejes, estado]);

  const ciertas = useMemo(
    () => casillasCiertas(estado, convoyesDelCuadro),
    [estado, convoyesDelCuadro],
  );
  const marcasEnPantalla = useMemo(() => ({ ...marcas, ...ciertas }), [marcas, ciertas]);
  const rotulosDeFranja = useMemo(
    () => Array.from({ length: estado?.franjas ?? 0 }, (_, i) => horaDeFranja(i + 1)),
    [estado?.franjas],
  );
  const cronica = useMemo(() => cronicaPorFranjas(estado?.ordenes ?? []), [estado?.ordenes]);

  /*
   * El sello se retira solo. Es un cartel, no un diálogo: nadie va a buscar
   * dónde se cierra mientras la mesa discute la orden siguiente, y dejado fijo
   * taparía la lista de convoyes justo cuando hace falta.
   */
  useEffect(() => {
    if (!sello) return;
    const temporizador = setTimeout(() => setSello(null), 7000);
    return () => clearTimeout(temporizador);
  }, [sello]);

  if (cargando && !vista) {
    return (
      <Pantalla>
        <Cargando texto="Entrando de servicio…" />
      </Pantalla>
    );
  }
  if (!vista) {
    return (
      <Pantalla>
        <AvisoError>{error ?? 'No hay ninguna partida activa.'}</AvisoError>
        <Boton onPress={() => router.replace('/')}>Volver a entrar</Boton>
      </Pantalla>
    );
  }

  const { sesion } = vista;

  /** ¿Deja el servidor hacer esto ahora mismo? Él filtra por fase; aquí solo se pregunta. */
  const puedo = (accion: string): boolean => (vista.acciones ?? []).some((a) => a.id === accion);

  /**
   * Una acción, con su error a la vista y la vista al día.
   *
   * SE REFRESCA SIEMPRE, también cuando ha fallado: media docena de fallos de
   * este juego son «alguien se te ha adelantado» —no queda conformidad, ese
   * convoy ya cruzó— y en todos ellos lo que hay que enseñar es el estado nuevo,
   * no el de antes de pulsar. Y `ocupado` se suelta ANTES de refrescar para que
   * una espera larga no deje el botón girando sin salida.
   */
  const hacer = async (
    etiqueta: string,
    accion: string,
    datos: Record<string, string | number>,
    alSalirBien?: (resultado: unknown) => void,
  ): Promise<void> => {
    setErrorAccion(null);
    setOcupado(etiqueta);
    try {
      const r = await api.hacerAccion(accion, datos);
      alSalirBien?.(r.resultado);
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo hacer eso.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setOcupado(null);
      await refrescar();
    }
  };

  const avisar = async (listo: boolean): Promise<void> => {
    setErrorAccion(null);
    setAvisando(true);
    try {
      await api.avisarListo(listo);
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : 'No se pudo avisar.');
    } finally {
      setAvisando(false);
      await refrescar();
    }
  };

  // ---- Antes de la primera franja ----
  if (sesion.phase === 'lobby') {
    return (
      <Pantalla>
        <AvisoDeLaPartida />
        {/*
          LA ENTRADA SE COMPONE POR CAPAS, no aparece de golpe.

          Antes esto era un `FadeInDown` sobre el bloque entero, el mismo que
          usan los otros tres juegos: el título de una estación de tren entraba
          exactamente igual que el de una expedición al Valle de los Reyes.

          Ahora primero se enciende el rótulo de la estación, después el cuadro
          se escribe tablilla a tablilla, después se tiende la vía y solo al
          final llegan el parte y los botones. Los retardos van escalonados a
          mano y no encadenados: una cadena de animaciones que se disparan unas
          a otras se descuadra en cuanto una tarda de más, y aquí basta con que
          cada capa sepa cuándo le toca.
        */}
        <View style={estilos.centro}>
          <Animated.View entering={FadeIn.duration(340)}>
            <Sello>{N.estacion} · turno de noche</Sello>
          </Animated.View>

          <Teleindicador texto={sesion.tituloPartida} style={{ marginTop: espacio.lg }} />

          <Animated.View entering={FadeIn.duration(420).delay(880)}>
            <Cuerpo tenue style={{ textAlign: 'center', fontStyle: 'italic', marginTop: espacio.sm }}>
              {sesion.lema}
            </Cuerpo>
          </Animated.View>

          <Via style={{ marginVertical: espacio.lg }} />

          <Animated.View entering={FadeInUp.duration(460).delay(1040)}>
            <Cuerpo style={{ textAlign: 'center' }}>
              Ardió el telégrafo y con él el cuadro de marchas. Seis convoyes vienen rodando y no se
              les puede avisar. Abre tu sobre antes de empezar: las tiras que salvaste no las tiene
              nadie más, y solas no dicen nada.
            </Cuerpo>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(460).delay(1180)}
            style={{ alignSelf: 'stretch', alignItems: 'center' }}
          >
            <Boton
              onPress={() => router.push('/(juego)/personaje')}
              style={{ marginTop: espacio.lg, alignSelf: 'stretch' }}
            >
              Ver tu oficio
            </Boton>
            <View style={{ height: espacio.md }} />
            <Cuerpo tenue style={{ textAlign: 'center', fontSize: 14 }}>
              {sesion.listos} de {sesion.total} están en su puesto.
            </Cuerpo>
            <Boton
              variante={vista.yo.pediEmpezar ? 'secundario' : 'primario'}
              cargando={avisando}
              onPress={() => void avisar(!vista.yo.pediEmpezar)}
              style={{ marginTop: espacio.sm, alignSelf: 'stretch' }}
            >
              {vista.yo.pediEmpezar ? 'Todavía no estoy' : 'Estoy en mi puesto'}
            </Boton>
            <AvisoError>{errorAccion}</AvisoError>
          </Animated.View>
        </View>
      </Pantalla>
    );
  }

  if (!estado) {
    return (
      <Pantalla>
        <AvisoDeLaPartida />
        <Cargando texto="La estación todavía no ha abierto el cuadro…" />
      </Pantalla>
    );
  }

  const nombreDeConvoy = (id: string): string =>
    convoyesDelCuadro.find((c) => c.id === id)?.nombre ?? id;

  const tocarCasilla = (clave: string): void => {
    /* Lo que ya decidió el enclavamiento no se borra a lápiz. */
    if (ciertas[clave] !== undefined) return;
    setMarcas((previas) => ({ ...previas, [clave]: siguienteMarca(previas[clave]) }));
  };

  const cursar = (convoyId: string): Promise<void> =>
    hacer('cursar', 'cursar-orden', { convoy: convoyId }, (resultado) => {
      setConvoyElegido(null);
      const r = leerOrdenCursada(resultado);
      if (!r) return;
      setSello({ aceptada: r.aceptada, nombre: nombreDeConvoy(convoyId), anuncio: r.anuncio });
      void Haptics.notificationAsync(
        r.aceptada
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    });

  const consultar = async (): Promise<void> => {
    if (!consultaConvoy) return;
    const convoyId = consultaConvoy;
    const franja = consultaFranja;
    await hacer(
      'consultar',
      'consultar-archivo',
      /* La franja va como NÚMERO: la declara `pideNumero` y el motor la valida. */
      { convoy: convoyId, franja },
      (resultado) => {
        const r = leerConsulta(resultado);
        if (!r) return;
        setConsultas((previas) => [
          { convoy: nombreDeConvoy(convoyId), franja, posible: r.posible, respuesta: r.respuesta },
          ...previas,
        ]);
      },
    );
  };

  /* Los efectos de la maña que están armados y aún sin gastar. */
  const armados = [
    estado.yo.indulto ? 'un rechazo sin retraso' : null,
    estado.yo.consultaGratis ? 'una consulta gratis' : null,
    estado.yo.sinConformidad ? 'una orden sin conformidad' : null,
  ].filter((a): a is string => a !== null);

  const ejes = vista.ejes ?? [];
  const entregado = Boolean(vista.miRespuesta);
  const elegidosEnLaEntrega = Object.values(entrega);
  const entregaCompleta = ejes.length > 0 && ejes.every((e) => entrega[e.ejeId]);
  const entregaRepetida = new Set(elegidosEnLaEntrega).size !== elegidosEnLaEntrega.length;

  /**
   * Poner un convoy en una franja lo quita de la que tuviera.
   *
   * Un cuadro de marchas es una permutación, así que esto no es una comodidad:
   * es la única forma de rellenarlo que no puede acabar en un cuadro imposible.
   * El servidor rechaza los repetidos —y bien—, pero un error rojo a las tres de
   * la mañana, con la mesa esperando a que entregues, no se lo merece nadie.
   */
  const ponerEnLaEntrega = (ejeId: string, convoyId: string): void => {
    setEntrega((previa) => {
      const nueva: Record<string, string> = {};
      for (const [eje, convoy] of Object.entries(previa)) {
        if (eje !== ejeId && convoy !== convoyId) nueva[eje] = convoy;
      }
      if (previa[ejeId] !== convoyId) nueva[ejeId] = convoyId;
      return nueva;
    });
  };

  return (
    <Pantalla>
      <AvisoDeLaPartida />

      {/* ---- 1. En qué punto va la noche ---- */}
      <Animated.View entering={FadeInUp.duration(420)}>
        <View style={estilos.cabecera}>
          <View style={{ flex: 1 }}>
            <Etiqueta>
              Franja {estado.franja} de {estado.franjas} · {estado.hora}
            </Etiqueta>
            <Titulo style={{ fontSize: 24 }}>{N.estacion}</Titulo>
          </View>
          {sesion.phase === 'ronda-abierta' && sesion.roundEndsAt ? (
            <Reloj terminaEn={sesion.roundEndsAt} ahoraServidor={sesion.ahora} />
          ) : null}
        </View>
      </Animated.View>

      {estado.amanecer ? (
        <Marco tono={estado.amanecer.correoPaso ? 'oscuro' : 'peligro'}>
          <Sello>El parte del amanecer</Sello>
          <Cuerpo style={{ marginTop: espacio.md }}>{estado.amanecer.anuncio}</Cuerpo>
        </Marco>
      ) : null}

      <Marco style={{ marginBottom: espacio.md }}>
        <BarraDelRetraso retraso={estado.retraso} maximo={estado.retrasoMaximo} />
        <View style={estilos.contadores}>
          <View style={{ flex: 1 }}>
            <Contador
              etiqueta="conformidades"
              valor={estado.conformidades}
              tono={estado.conformidades === 0 ? 'rojo' : 'oro'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Contador etiqueta="tu margen" valor={estado.yo.margen} />
          </View>
          <View style={{ flex: 1 }}>
            <Contador
              etiqueta="convoyes fuera"
              valor={`${estado.despachados}/${estado.franjas}`}
              tono="tenue"
            />
          </View>
        </View>
        {estado.franjasPerdidas.length > 0 ? (
          <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.sm }}>
            Se cerraron sin sacar a nadie las franjas {estado.franjasPerdidas.join(', ')}. Parte de
            ese retraso viene de ahí.
          </Cuerpo>
        ) : null}
      </Marco>

      <AvisoError>{errorAccion}</AvisoError>

      {/* ---- 2. El cuadro que se está rehaciendo ---- */}
      <Seccion>El cuadro de marchas</Seccion>
      <Marco>
        <Cuadricula
          convoyes={convoyesDelCuadro}
          franjas={rotulosDeFranja}
          marcas={marcasEnPantalla}
          onTocar={tocarCasilla}
        />
        <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.md }}>
          Toca una casilla para tacharla ({N.marca}), otra vez para marcarla (○) y otra para
          borrarla. Es tu cuaderno: no lo ve nadie y no sale de este móvil. Lo que ya ha cruzado
          viene puesto y no se puede tocar.
        </Cuerpo>
      </Marco>

      {/* ---- 3. Cursar la orden ---- */}
      <Ornamento />
      <Seccion>Cursar la orden</Seccion>

      {sello ? (
        <Animated.View entering={FadeIn.duration(260)}>
          <SelloDeOrden aceptada={sello.aceptada} nombre={sello.nombre} />
          {sello.anuncio ? (
            <Cuerpo style={{ marginBottom: espacio.md }}>{sello.anuncio}</Cuerpo>
          ) : null}
        </Animated.View>
      ) : null}

      {estado.porSalir.length === 0 ? (
        <Marco>
          <Cuerpo tenue>Han cruzado los seis. Ya no queda nada en la vía.</Cuerpo>
        </Marco>
      ) : (
        <>
          {estado.porSalir.map((convoy) => (
            <View
              key={convoy.id}
              /* Elegir uno apaga los demás: es el aviso de que la orden ya tiene destinatario. */
              style={convoyElegido && convoyElegido !== convoy.id ? { opacity: 0.4 } : undefined}
            >
              <FilaDeConvoy
                nombre={convoy.nombre}
                carga={convoy.carga}
                esCorreo={convoy.id === estado.correo?.id}
                onPress={() => setConvoyElegido(convoyElegido === convoy.id ? null : convoy.id)}
              />
            </View>
          ))}

          {convoyElegido ? (
            <Animated.View entering={FadeIn.duration(260)}>
              <Boton
                variante="primario"
                cargando={ocupado === 'cursar'}
                disabled={!puedo('cursar-orden')}
                onPress={() => void cursar(convoyElegido)}
              >
                Cursar la orden de salida
              </Boton>
              <Cuerpo tenue style={{ fontSize: 14, marginTop: espacio.sm }}>
                {estado.yo.sinConformidad
                  ? 'Llevas la llave maestra: esta orden no gasta conformidad. '
                  : 'Gasta una conformidad de la estación. '}
                {estado.yo.indulto
                  ? 'Y llevas el cambio de aguja: si no da paso, esta vez no cuesta retraso.'
                  : `Si no es el que toca, el enclavamiento no da paso: +${RETRASO_POR_ORDEN_RECHAZADA} minutos de retraso.`}
              </Cuerpo>
              {!puedo('cursar-orden') ? (
                <Etiqueta style={{ marginTop: espacio.sm }}>
                  Fuera de franja no se cursa nada
                </Etiqueta>
              ) : null}
            </Animated.View>
          ) : (
            <Cuerpo tenue style={{ fontSize: 14 }}>
              Toca el convoy al que le vais a dar salida.
            </Cuerpo>
          )}
        </>
      )}

      {/* ---- 4 y 5. Lo que se compra con el margen, y lo que solo tienes tú ---- */}
      <Ornamento />
      <Seccion>Tu margen y tu maña</Seccion>
      <Plegable
        etiqueta="Consultar el archivo"
        resumen={`Cuesta ${estado.tarifa.consulta} de margen. Dice si un convoy CABE en una franja, no cuál es.`}
      >
        <Marco>
          {estado.porSalir.length === 0 ? (
            <Cuerpo tenue>Ya no queda ningún convoy por colocar.</Cuerpo>
          ) : (
            <>
              <Etiqueta>¿Por qué convoy preguntas?</Etiqueta>
              <View style={estilos.fichas}>
                {estado.porSalir.map((convoy) => (
                  <Ficha
                    key={convoy.id}
                    rotulo={convoy.nombre}
                    activa={consultaConvoy === convoy.id}
                    onPress={() => setConsultaConvoy(convoy.id)}
                  />
                ))}
              </View>

              <Etiqueta style={{ marginTop: espacio.md }}>¿Por qué franja?</Etiqueta>
              <View style={estilos.fichas}>
                {rotulosDeFranja.map((hora, i) => (
                  <Ficha
                    key={`franja:${i}`}
                    rotulo={String(i + 1)}
                    nota={hora}
                    activa={consultaFranja === i + 1}
                    onPress={() => setConsultaFranja(i + 1)}
                  />
                ))}
              </View>

              <Boton
                cargando={ocupado === 'consultar'}
                disabled={!consultaConvoy || !puedo('consultar-archivo')}
                onPress={() => void consultar()}
                style={{ marginTop: espacio.md }}
              >
                {estado.yo.consultaGratis
                  ? 'Preguntar · esta te sale gratis'
                  : 'Preguntar al archivo'}
              </Boton>
              <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.sm }}>
                Un «no» tacha esa casilla para siempre. Un «sí» solo dice que no lo descartes: la
                única franja que da «sí» es la suya, así que dos preguntas bien elegidas valen la
                noche.
              </Cuerpo>
            </>
          )}

          {consultas.length > 0 ? (
            <View style={{ marginTop: espacio.md }}>
              <Etiqueta>Lo que ya has preguntado</Etiqueta>
              {consultas.map((c, i) => (
                <View key={`consulta:${i}`} style={estilos.consulta}>
                  <Text
                    style={[
                      texto.microCaps,
                      { color: c.posible ? C.oro300 : C.peligro, fontSize: 11, width: 58 },
                    ]}
                  >
                    {c.posible ? 'cabe' : 'no cabe'}
                  </Text>
                  <Text style={[texto.cuerpo, { color: C.pergamino, fontSize: 15, flex: 1 }]}>
                    {c.convoy} · franja {c.franja}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Marco>
      </Plegable>

      {/* ---- 5. La maña y el reloj ---- */}
      <Marco>
        <Etiqueta>{estado.yo.oficioNombre}</Etiqueta>
        <Titulo style={{ fontSize: 20, marginTop: 2 }}>{estado.yo.mana.nombre}</Titulo>
        <Cuerpo style={{ marginTop: espacio.xs, fontSize: 15 }}>{estado.yo.mana.texto}</Cuerpo>
        {armados.length > 0 ? (
          <Cuerpo style={{ color: C.oro300, marginTop: espacio.sm, fontSize: 15 }}>
            Tienes armado: {armados.join(' · ')}. Dilo en voz alta antes de gastarlo.
          </Cuerpo>
        ) : null}
        {dichoDeLaMana ? (
          <Cuerpo style={{ marginTop: espacio.sm, fontSize: 15 }}>{dichoDeLaMana}</Cuerpo>
        ) : null}

        <View style={estilos.botonera}>
          <Boton
            style={{ flex: 1 }}
            cargando={ocupado === 'mana'}
            disabled={estado.yo.manaUsada || !puedo('usar-mana')}
            onPress={() =>
              void hacer('mana', 'usar-mana', {}, (resultado) =>
                setDichoDeLaMana(leerAnuncio(resultado) || null),
              )
            }
          >
            {estado.yo.manaUsada ? 'Maña gastada' : 'Usar tu maña'}
          </Boton>
          <Boton
            style={{ flex: 1 }}
            cargando={ocupado === 'recuperar'}
            disabled={
              estado.retraso === 0 ||
              estado.yo.margen < estado.tarifa.recuperar ||
              !puedo('recuperar-tiempo')
            }
            onPress={() => void hacer('recuperar', 'recuperar-tiempo', {})}
          >
            Recuperar {RETRASO_QUE_RECUPERA} min
          </Boton>
        </View>
        <Cuerpo tenue style={{ fontSize: 13, marginTop: espacio.sm }}>
          La maña se usa una vez en toda la noche. Recuperar {RETRASO_QUE_RECUPERA} minuto sale por{' '}
          {estado.tarifa.recuperar} de TU margen, y el retraso que quita es de toda la estación.
        </Cuerpo>
      </Marco>

      {/* ---- 6. La crónica ---- */}
      <Ornamento />
      <Seccion>Lo que ya se ha cursado</Seccion>
      {cronica.length === 0 ? (
        <Marco>
          <Cuerpo tenue>Esta noche todavía no se ha cursado ninguna orden.</Cuerpo>
        </Marco>
      ) : (
        <>
          <Cuerpo tenue style={{ fontSize: 14, marginBottom: espacio.sm }}>
            Está aquí para que nadie tenga que acordarse de lo que ya se probó.
          </Cuerpo>
          {cronica.map((grupo) => (
            <View key={`franja:${grupo.franja}`} style={{ marginBottom: espacio.sm }}>
              <Etiqueta style={{ marginBottom: espacio.xs }}>
                Franja {grupo.franja} · {horaDeFranja(grupo.franja)}
              </Etiqueta>
              {grupo.ordenes.map((orden, i) => (
                <FilaDeConvoy
                  key={`${grupo.franja}:${i}:${orden.convoy}`}
                  nombre={orden.nombre}
                  esCorreo={orden.convoy === estado.correo?.id}
                  estado={orden.aceptada ? 'salido' : 'rechazado'}
                />
              ))}
            </View>
          ))}
        </>
      )}

      {/* ---- 7. Entregar tu cuadro ---- */}
      {ejes.length > 0 ? (
        <>
          <Ornamento />
          <Seccion>Tu cuadro de memoria</Seccion>
          {entregado ? (
            <Marco>
              <Etiqueta style={{ color: C.oro300 }}>Entregado</Etiqueta>
              <Cuerpo style={{ marginTop: espacio.xs }}>
                Tu cuadro está en la oficina y ya no se puede cambiar. No se dirá si acertaste hasta
                el parte del amanecer.
              </Cuerpo>
            </Marco>
          ) : (
            <Marco tono="peligro">
              <Cuerpo style={{ marginBottom: espacio.md }}>
                Escribe la noche entera de memoria: un convoy por franja, los seis distintos. Se
                entrega una vez, no se puede cambiar y no sabrás si acertaste hasta el amanecer.
              </Cuerpo>

              {ejes.map((eje, i) => (
                <View key={eje.ejeId} style={{ marginBottom: espacio.md }}>
                  <Etiqueta>
                    Franja {i + 1} · {eje.rotulo}
                  </Etiqueta>
                  <View style={estilos.fichas}>
                    {eje.opciones.map((opcion) => (
                      <Ficha
                        key={`${eje.ejeId}:${opcion.id}`}
                        rotulo={opcion.nombre}
                        activa={entrega[eje.ejeId] === opcion.id}
                        apagada={elegidosEnLaEntrega.includes(opcion.id)}
                        onPress={() => ponerEnLaEntrega(eje.ejeId, opcion.id)}
                      />
                    ))}
                  </View>
                </View>
              ))}

              {entregaRepetida ? (
                <Cuerpo style={{ color: C.peligro, marginBottom: espacio.sm, fontSize: 15 }}>
                  Hay un convoy puesto en dos franjas. Un cuadro de marchas no repite ninguno.
                </Cuerpo>
              ) : null}

              <Boton
                variante="peligro"
                cargando={ocupado === 'entregar'}
                disabled={!entregaCompleta || entregaRepetida || !puedo('entregar-cuadro')}
                onPress={() => void hacer('entregar', 'entregar-cuadro', entrega)}
              >
                {entregaCompleta ? 'Entregar mi cuadro' : 'Te faltan franjas'}
              </Boton>
            </Marco>
          )}
        </>
      ) : null}
    </Pantalla>
  );
}

// ---------------------------------------------------------------------------
// Medidas y disposición. Sin un solo color: `StyleSheet.create` se evalúa al
// importar el fichero —o sea antes de que haya partida— y congelaría la paleta.
// Es la advertencia de la cabecera de `ui.tsx`, y vale igual aquí.
// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', paddingVertical: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', marginBottom: espacio.md },
  contadores: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.lg },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, marginTop: espacio.sm },
  ficha: {
    // 44 de alto: lo que se pulsa sin apuntar, de pie y con una mano ocupada.
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: 6,
  },
  botonera: { flexDirection: 'row', gap: espacio.sm, marginTop: espacio.md },
  consulta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingVertical: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: conAlfa(C.laton, 0.22),
  },
});
