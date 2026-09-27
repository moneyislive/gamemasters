/**
 * LOS MANDOS DEL PASEO EN EL MÓVIL: una palanca para el pulgar y un botón para correr.
 *
 * ═══ EL HUECO QUE ESTO TAPA ═══
 *
 * En la app no se podía andar. El único juego que se anda, Las Lindes, leía las teclas de
 * `document`, y en iOS y en Android no hay `document` ni teclado: se pulsaba «Hombro», la cámara
 * bajaba detrás de la figura, y la figura se quedaba plantada. Sin un error, porque el efecto que
 * leía las teclas miraba si había `document` y se callaba. Es la regla de la casa al revés:
 * ningún juego sólo para PC, y el paseo lo era.
 *
 * ═══ QUÉ ESCRIBE, Y POR QUÉ EN UNA REFERENCIA ═══
 *
 * `MandosDeFuera` (`escenas/paseo/mandos.ts`): la palanca de −1 a 1 en los dos ejes y si se
 * corre. En una referencia y no en el estado de React, porque son sesenta cambios por segundo
 * mientras el pulgar se mueve y la escena los lee en su propio bucle; pasarlos por React
 * repintaría la pantalla entera —barra, hoja, paneles— para mover a un muñeco. Lo único que pasa
 * por el estado es si se corre, porque el botón tiene que verse encendido.
 *
 * ═══ `PanResponder` Y NO `react-native-gesture-handler` ═══
 *
 * `mirador-tactil.ts` cuenta lo que costó el `Pan` de RNGH: con activación manual sólo funciona
 * desde un worklet, y el primer intento dejó la cámara de Riberas sin girar en iOS y en Android.
 * La palanca no activa nada a mano ni necesita el hilo de interfaz: sólo escribe una referencia.
 * `PanResponder` es del núcleo de React Native, corre en el hilo de JavaScript en las dos
 * plataformas y en la web, y no hay nada que casar con la escena: la palanca va ENCIMA del
 * lienzo, así que el dedo que baja en ella no le llega a r3f. Y nada de `onClick`, que en la app
 * no llega (`Lindes.tsx` tiene escrito lo que costó): la palanca es un respondedor y el botón
 * un `Pressable`.
 *
 * ═══ LA PALANCA NACE DONDE BAJA EL DEDO ═══
 *
 * Se mide el arrastre desde el punto donde bajó el pulgar, no desde el centro dibujado: un
 * pulgar no acierta el centro, y medir desde ahí haría andar de lado a quien sólo quería andar.
 *
 * ═══ CORRER SE ENCIENDE Y SE APAGA, NO SE MANTIENE ═══
 *
 * El sistema de respuesta de React Native deja un solo respondedor a la vez: con el pulgar
 * izquierdo en la palanca, el derecho no puede quedarse apretando otro botón. Así que correr es
 * un interruptor —un toque lo enciende y se ve encendido, otro lo apaga— y se enciende antes o
 * después de andar, no mientras.
 *
 * ═══ SÓLO A PIE, Y PARA LOS TRES JUEGOS ═══
 *
 * Se pinta en hombro y en ojos; en la mesa no hay a quién mover. Al dejar de andar se sueltan la
 * palanca y el correr, para que al volver a bajar nadie salga corriendo solo. No sabe de qué
 * juego es: el día que El Burgo y Riberas se anden, se monta igual. Y ahí hay una cosa que Las
 * Lindes no tiene: su MIRADOR TÁCTIL (`mirador-tactil.ts`), que gira la cámara de mesa al
 * arrastrar. Mientras se anda hay que apagarlo, o el pulgar que anda giraría a la vez la mesa.
 *
 * ═══ Y EN UNA MESA DE BOTAS, «GOLPEAR», QUE SÍ SE PULSA ANDANDO ═══
 *
 * La refriega de Boots on Board se golpea: en el escritorio con la G, y aquí con un botón que
 * sale SÓLO a pie y SÓLO con canal (`BotonDeGolpear`). Cuenta pulsaciones en `MandosDeFuera.golpes`
 * y el paseo pone el golpe en el primer tic que dé (`escenas/paseo/mandos.ts`).
 *
 * No es un `Pressable`, y es a propósito: correr se enciende y se apaga porque con el pulgar en la
 * palanca no hay otro respondedor, y golpear tiene que poder hacerse ANDANDO —acercarse y golpear
 * sin soltar la palanca es la refriega entera—. Con un respondedor dentro de la palanca, un dedo
 * nuevo ni siquiera le pregunta al botón: la negociación empieza en el antepasado común de los dos
 * (`ResponderEventPlugin`). Lo que sí le llega es el toque en crudo, `onTouchStart`, que React Native
 * reparte a la vista que toca cada dedo nuevo esté quien esté respondiendo; y con `onClick`, que en
 * la app no llega, no hay nada que hacer. Para el lector de pantalla, la acción `activate`.
 *
 * Grande para el pulgar —76 puntos, que es un botón que se busca a ciegas— y en la fila del correr,
 * a su izquierda: nunca encima de la palanca ni del correr, y dentro de la franja del paseo del
 * Burgo, que mide 152 y fuera de ella el dedo no llega en Android. Si no cabe, encoge hasta 48
 * (`ladoDelGolpe`, con el ancho medido y el de la ventana, el menor de los dos). Y cuando no toca
 * NO SE PINTA, que un botón invisible que siguiera cogiendo el dedo taparía el tablero sin decirlo.
 */
import { useEffect, useMemo, useState } from 'react';
import type { JSX, MutableRefObject } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { AccessibilityActionInfo, LayoutChangeEvent } from 'react-native';
import { SIN_MANDOS_DE_FUERA } from '../../../escenas/paseo/mandos';
import type { MandosDeFuera } from '../../../escenas/paseo/mandos';
import { usarAparatoTactil } from './aparato-tactil';
import { LETRA } from './muebles';

/**
 * LO QUE HAY QUE MOVER EL PULGAR PARA IR A TOPE, en puntos.
 *
 * Cuarenta y cuatro: menos que el ancho de un pulgar, para que andar no pida estirarlo, y lo
 * bastante para que la zona muerta de `mandos.ts` —un cuarto— sean once puntos y no un temblor.
 */
const RECORRIDO = 44;

/** Lo que mide la base de la palanca y lo que mide su pomo, en puntos. */
const BASE = 128;
const POMO = 56;

/** A qué altura del pie va la fila del correr y del golpe: la del centro de la palanca, los dos pulgares a la par. */
const ABAJO_DEL_CORRER = 16 + BASE / 2 - 24;

/** Lo que mide el correr a lo ancho: fijo, para que el golpe sepa dónde acaba sin medirlo. */
const ANCHO_DEL_CORRER = 112;

/** El golpe: el lado que se quiere, el menor que se acepta y el hueco con sus vecinos, en puntos. */
const LADO_DEL_GOLPE = 76;
const LADO_MINIMO_DEL_GOLPE = 48;
const HUECO_DEL_GOLPE = 12;

/** Lo que es de la palanca por la izquierda —su margen, su base y el hueco— y lo que es del correr por la derecha. */
const LO_DE_LA_PALANCA = 16 + BASE + HUECO_DEL_GOLPE;
const LO_DEL_CORRER = 16 + ANCHO_DEL_CORRER + HUECO_DEL_GOLPE;

/**
 * EL LADO DEL GOLPE en un lienzo de `ancho` puntos: lo que quede entre la palanca y el correr, hasta
 * 76, y nunca menos de 48. Con 375 de ancho salen los 76; con 360, 64; con 320 no cabe ni el
 * mínimo y se queda en 48, comiéndose doce puntos del canto derecho de la base —por donde el pomo
 * sólo pasa a tope—, que es menos malo que un botón que no se acierta.
 */
export function ladoDelGolpe(ancho: number): number {
  const cabe = Math.floor(ancho - LO_DE_LA_PALANCA - LO_DEL_CORRER);
  return Math.max(LADO_MINIMO_DEL_GOLPE, Math.min(LADO_DEL_GOLPE, Number.isFinite(cabe) ? cabe : LADO_MINIMO_DEL_GOLPE));
}

/** Para el lector de pantalla: pulsar dos veces es golpear. */
const ACCIONES_DEL_GOLPE: readonly AccessibilityActionInfo[] = [{ name: 'activate', label: 'Golpear' }];

export interface MandosDelPaseoProps {
  /** Donde se escriben. La escena los lee en su bucle, sin pasar por React. */
  readonly mandos: MutableRefObject<MandosDeFuera>;
  /** Sólo a pie: en la mesa no hay a quién mover. */
  readonly visibles: boolean;
}

export function MandosDelPaseo({ mandos, visibles: aPie }: MandosDelPaseoProps): JSX.Element | null {
  /*
   * A PIE Y CON EL DEDO. En el teléfono, siempre; en `/jugar` abierto en un ORDENADOR se anda con W A S D
   * y la palanca sobra (`aparato-tactil.web.ts`, 27-sep-2026). Si deja de ser táctil a mitad de paseo
   * —se movió el ratón—, se suelta todo igual que al subir a la mesa.
   */
  const tactil = usarAparatoTactil();
  const visibles = aPie && tactil;
  const [corriendo, ponerCorriendo] = useState(false);
  /* Se crea una vez: un `Animated.ValueXY` nuevo por pintado soltaría el pomo a mitad de arrastre. */
  const [pomo] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));

  const palanca = useMemo(() => {
    /* De puntos de pantalla a la palanca: `y` de pantalla crece hacia abajo, y abajo es atrás. */
    const mover = (dx: number, dy: number): void => {
      const largo = Math.hypot(dx, dy);
      const k = largo > RECORRIDO ? RECORRIDO / largo : 1;
      const x = dx * k;
      const y = dy * k;
      pomo.setValue({ x, y });
      /* Los golpes se copian tal cual: el otro pulgar puede haber golpeado entre dos movimientos de éste. */
      mandos.current = { palanca: { x: x / RECORRIDO, y: -y / RECORRIDO }, deprisa: mandos.current.deprisa, golpes: mandos.current.golpes };
    };
    const soltar = (): void => {
      pomo.setValue({ x: 0, y: 0 });
      mandos.current = { palanca: { x: 0, y: 0 }, deprisa: mandos.current.deprisa, golpes: mandos.current.golpes };
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      /* El pulgar que anda no se lo cede a nadie: soltar la palanca a medio paseo lo para en seco. */
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => mover(0, 0),
      onPanResponderMove: (_, gesto) => mover(gesto.dx, gesto.dy),
      onPanResponderRelease: soltar,
      onPanResponderTerminate: soltar,
    });
  }, [mandos, pomo]);

  /* Al dejar de andar, todo suelto: al volver a bajar nadie sale corriendo solo. */
  useEffect(() => {
    if (visibles) return;
    pomo.setValue({ x: 0, y: 0 });
    mandos.current = SIN_MANDOS_DE_FUERA;
    ponerCorriendo(false);
  }, [mandos, pomo, visibles]);

  if (!visibles) return null;
  return (
    <>
      <View
        style={estilos.base}
        accessible
        accessibilityLabel="Palanca para andar"
        accessibilityHint="Arrastra hacia arriba para andar, hacia abajo para retroceder y a los lados para girar."
        {...palanca.panHandlers}
      >
        <Animated.View pointerEvents="none" style={[estilos.pomo, { transform: pomo.getTranslateTransform() }]} />
      </View>
      <Pressable
        style={[estilos.correr, corriendo && estilos.correrPuesto]}
        accessibilityRole="button"
        accessibilityLabel="Correr"
        accessibilityState={{ selected: corriendo }}
        onPress={() => {
          const ahora = !corriendo;
          ponerCorriendo(ahora);
          mandos.current = { palanca: mandos.current.palanca, deprisa: ahora, golpes: mandos.current.golpes };
        }}
      >
        <Text style={[estilos.correrTexto, corriendo && estilos.correrTextoPuesto]} numberOfLines={1} adjustsFontSizeToFit>
          Correr
        </Text>
      </Pressable>
    </>
  );
}

export interface BotonDeGolpearProps {
  /** Donde se cuentan los golpes: la misma referencia que la palanca. */
  readonly mandos: MutableRefObject<MandosDeFuera>;
  /** Sólo a pie y con canal: en una mesa normal, o mirando la mesa, no hay a quién golpear. */
  readonly visible: boolean;
}

/**
 * «GOLPEAR»: un toque, un golpe. Ver la cabecera: por qué `onTouchStart` y no un `Pressable`, dónde
 * va y por qué no se pinta cuando no toca.
 */
export function BotonDeGolpear({ mandos, visible: toca }: BotonDeGolpearProps): JSX.Element | null {
  /* Con el ratón y el teclado se golpea con la G: el botón es del dedo, como la palanca. */
  const tactil = usarAparatoTactil(); /* Siempre, y antes de mirar `toca`: un gancho detrás de un `&&` cambia el orden. */
  const visible = toca && tactil;
  const ventana = useWindowDimensions();
  const [medido, ponerMedido] = useState(0);
  const [apretado, ponerApretado] = useState(false);
  /* Al esconderse, suelto: un botón que vuelve a salir no puede salir apretado. */
  useEffect(() => {
    if (!visible) ponerApretado(false);
  }, [visible]);

  if (!visible) return null;
  /* El ancho medido y el de la ventana, el menor: el medido puede quedarse viejo, y la ventana no sabe de columnas. */
  const ancho = medido > 0 ? Math.min(medido, ventana.width) : ventana.width;
  const lado = ladoDelGolpe(ancho);
  const golpear = (): void => {
    mandos.current = { ...mandos.current, golpes: mandos.current.golpes + 1 };
  };
  const medir = (e: LayoutChangeEvent): void => {
    const nuevo = Math.round(e.nativeEvent.layout.width);
    if (nuevo > 0 && nuevo !== medido) ponerMedido(nuevo);
  };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={medir}>
      <View
        style={[estilos.golpear, { width: lado, height: lado, borderRadius: lado / 2 }, apretado && estilos.golpearApretado]}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Golpear"
        accessibilityHint="Lanza un golpe hacia donde miras."
        accessibilityActions={ACCIONES_DEL_GOLPE}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') golpear();
        }}
        onTouchStart={() => {
          golpear();
          ponerApretado(true);
        }}
        onTouchEnd={() => ponerApretado(false)}
        onTouchCancel={() => ponerApretado(false)}
      >
        {/*
          «GOLPE» Y NO «GOLPEAR»: en 360 de ancho el botón mide 64 y «GOLPEAR» en caja alta a 13
          no cabe —salía «GOLPE…»—, y `adjustsFontSizeToFit` no hace nada en la web. Cinco
          letras caben enteras de 48 a 76 sin bajar de 12. Lo que se OYE sigue siendo «Golpear»
          (`accessibilityLabel`), y sin `numberOfLines`: si algún día no cupiera, envuelve.
        */}
        <Text style={[estilos.golpearTexto, apretado && estilos.golpearTextoApretado]}>Golpe</Text>
      </View>
    </View>
  );
}

/*
 * Los colores son los de los botones de cámara de la misma pantalla: la placa oscura y
 * translúcida sobre el valle, el filo claro, y encendido en crema con la tinta oscura. Son
 * mandos del mismo lienzo y se tienen que leer como tales.
 */
const estilos = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: BASE,
    height: BASE,
    borderRadius: BASE / 2,
    backgroundColor: 'rgba(12, 20, 8, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(243, 236, 216, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomo: {
    width: POMO,
    height: POMO,
    borderRadius: POMO / 2,
    backgroundColor: 'rgba(243, 236, 216, 0.85)',
    borderWidth: 1,
    borderColor: '#f3ecd8',
  },
  /* A la altura del centro de la palanca: los dos pulgares en la misma línea. Con su ancho fijo: ver `ANCHO_DEL_CORRER`. */
  correr: {
    position: 'absolute',
    right: 16,
    bottom: ABAJO_DEL_CORRER,
    width: ANCHO_DEL_CORRER,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(12, 20, 8, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(243, 236, 216, 0.45)',
  },
  correrPuesto: { backgroundColor: '#f3ecd8', borderColor: '#f3ecd8' },
  correrTexto: { color: '#f3ecd8', fontSize: 15, ...LETRA.rotuloChico },
  correrTextoPuesto: { color: '#1b2411' },
  /*
   * EL GOLPE, en la fila del correr y a su izquierda. Redondo y en teja: es el único mando que no
   * mueve a nadie, y se tiene que distinguir de los dos que sí sin leerlo. Apretado, en crema con la
   * tinta oscura, como el correr encendido.
   */
  golpear: {
    position: 'absolute',
    right: LO_DEL_CORRER,
    bottom: ABAJO_DEL_CORRER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(122, 34, 24, 0.78)',
    borderWidth: 2,
    borderColor: 'rgba(243, 236, 216, 0.7)',
  },
  golpearApretado: { backgroundColor: '#f3ecd8', borderColor: '#f3ecd8' },
  golpearTexto: { color: '#f3ecd8', fontSize: 13, ...LETRA.rotuloChico, letterSpacing: 0.6, textAlign: 'center' },
  golpearTextoApretado: { color: '#1b2411' },
});
