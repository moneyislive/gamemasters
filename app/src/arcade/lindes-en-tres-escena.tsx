/**
 * LAS LINDES EN EL MÓVIL: el valle, y la hoja desde la que se juega.
 *
 * ═══ QUÉ HACE ESTA PANTALLA ═══
 *
 * Monta la escena (`escenas/lindes/Lindes.tsx`) con el tablero que traduce
 * `shared/arcade/juegos/lindes-en-tres.ts`, y pinta debajo la hoja con la que se juega:
 * la losa de la mano, dónde plantar, las acciones del turno y los paneles del juego. Ni
 * una regla vive aquí: qué se puede poner y dónde lo dice la lista de opciones que el
 * juego acaba de componer.
 *
 * ═══ ES LA HERMANA DE `escritorio/src/lindes-en-tres.tsx`, Y COMPARTEN EL CONTROLADOR ═══
 *
 * Las dos pantallas son distintas —una tiene raíl y la otra una hoja, una tiene teclado y
 * la otra el pulgar— y lo que hacían igual ya no está escrito dos veces: las tres cámaras,
 * el giro que se ajusta solo al señalar una casilla, la calidad medida, el `alFallar` que
 * manda al retablo, lo que manda cada toque y el lienzo con la escena dentro son del
 * controlador de Las Lindes (`escenas/lindes/el-valle-en-la-mesa.ts`). Lo que se comparte es
 * lo que puede divergir sin que nadie se entere; lo que no se comparte es la forma, que es
 * distinta a propósito.
 *
 * ═══ Y LO QUE ES DE CUALQUIER MESA, ES DE LA PLATAFORMA ═══
 *
 * El vestíbulo de abrir o entrar, el latido de la cuenta atrás, los nombres, la barra de la
 * mesa, la red bajo el lienzo y el respaldo al retablo vienen del contrato de pintor de la
 * app (`pintor-propio.tsx`). Esta pantalla tenía su propia copia de todo eso, y era la que se
 * había quedado atrás: sin selector de plazo, con un botón de abrir que decía «Volcar la
 * bolsa» —que es empezar la partida, no abrir la mesa—, con una red que no apuntaba el fallo
 * en el parte, y con un respaldo que no decía de quién era el turno ni por qué se estaba
 * jugando sobre el retablo. Con el contrato tiene las cuatro cosas sin escribir ninguna.
 *
 * ═══ EL RESPALDO NO ES UNA CORTESÍA ═══
 *
 * Si los modelos no llegan, el lienzo revienta o la vista no es de este juego, se cae al
 * RETABLO —el mueble genérico, el mismo SVG con el que se juega sin una línea de tres
 * dimensiones— y la partida se puede terminar ahí. Es lo que hace que la escena sea un lujo y
 * no una dependencia.
 *
 * ═══ Y SIN TELÓN, A PROPÓSITO ═══
 *
 * El Burgo y Riberas tapan el lienzo hasta que llega su mundo; éste no. El suelo, los huecos
 * donde cabe la losa y los labriegos se pintan sin esperar a los modelos, así que el valle se
 * puede jugar antes de que lleguen, y un telón encima quitaría una partida que ya se puede
 * jugar para enseñar una frase.
 *
 * ═══ Y A PIE SE ANDA CON EL PULGAR ═══
 *
 * La escena leía las teclas de `document`, y aquí no hay ni una cosa ni la otra: en
 * «Hombro» y en «Ojos» la cámara bajaba detrás de la figura y la figura no se movía.
 * Ahora esta pantalla monta `MandosDelPaseo` —una palanca y un botón de correr— y le
 * pasa a la escena la referencia donde los escribe. Esta pantalla no tiene mirador
 * táctil que apagar mientras se anda: la cámara de mesa de Las Lindes se encuadra sola
 * y no se arrastra, así que el pulgar que anda no mueve nada más.
 *
 * ═══ Y EN UNA MESA DE BOTAS SE ANDA CON LOS DEMÁS ═══
 *
 * Si la mesa es de la modalidad `botas` —y eso lo dice `esMesaDeBotas`, la misma pregunta
 * que hace el escritorio—, la escena recibe el canal (`canal`): la dirección del WebSocket
 * del servidor que la app tiene elegido (`direccionDelCanal`), la llave del asiento, quién
 * soy y los asientos con su nombre, su figura y su color. Se empieza a pie, al hombro, que
 * es a lo que se viene a una mesa así, y arriba a la izquierda se enseña cómo va el canal:
 * «Conectando…», «Dentro», «Sin conexión: …». En una mesa normal no se pasa nada y la escena
 * no abre ningún socket. Todo eso sigue aquí y no en el controlador: cada cliente llama a su
 * casa, y `verify:canal-del-paseo` lo mira en el fuente de cada uno.
 *
 * ═══ Y EN EL TELÉFONO EL VALLE TIENE COLOR, Y CALIDAD MEDIDA ═══
 *
 * El ATLAS del tablero, compilado a bytes (`COMPLEMENTOS_DEL_TABLERO`): sin él, en iOS y en
 * Android cada casa y cada muralla salían blancas. Y la CALIDAD, que la juzga el controlador con
 * lo que la escena mide por `alMedir`, igual que en el escritorio.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Canvas } from '../tres/Lienzo';
import { decodificaImagenes, texturasDelTablero } from '../tres/texturas-nativas';
import { Lindes } from '../../../escenas/lindes/Lindes';
import type { ComplementoDelCargador } from '../../../escenas/lindes/catalogo';
import {
  alCrearElLienzoDelValle,
  EL_LIENZO_DEL_VALLE,
  LAS_CAMARAS_DEL_VALLE,
  usarElValleEnLaMesa,
} from '../../../escenas/lindes/el-valle-en-la-mesa';
import type { CanalDeBotas, EstadoDelCanal } from '../../../escenas/lindes/tipos';
import { SIN_MANDOS_DE_FUERA } from '../../../escenas/paseo/mandos';
import type { MandosDeFuera } from '../../../escenas/paseo/mandos';
import { asientosQueAndan, esMesaDeBotas } from '../../../escenas/paseo/mesa-de-botas';
/*
 * Del fichero del juego, que aquí sólo hace falta el identificador. Quien instala los arcades
 * del binario —por si se llega por enlace directo— es el contrato de pintor.
 */
import { LINDES } from '../../../shared/arcade/juegos/lindes';
import { tableroDeLaVista } from '../../../shared/mecanicas/tablero-declarado';
import { MandosDelPaseo } from './mandos-del-paseo';
import { BotonDeGolpear } from './mandos-del-paseo';
import { direccionDelCanal } from './mesa';
import { LETRA, SALA } from './muebles';
import { ElRespaldo, LaMesaDeUnPintor, RedDelLienzo } from './pintor-propio';
import type { LoQueVeElPintor } from './pintor-propio';
import { traer } from './traer';

/**
 * ═══ CON QUÉ SE ABRE EL TABLERO: EN UN TELÉFONO, CON SU ATLAS COMPILADO ═══
 *
 * `tablero.glb` trae su atlas empotrado como PNG y Hermes no decodifica PNG: sin esto el valle
 * se montaba entero y SIN UN SOLO COLOR —ni el verde de un prado ni la piedra de una muralla—,
 * porque todo el color del pack vive en ese atlas. Es lo que le pasaba a Riberas y se arregla
 * con lo mismo: `texturasDelTablero` (`tres/texturas-nativas.ts`) contesta con el atlas
 * compilado a bytes. Lo único distinto es quién abre el `.glb`: allí la pantalla, aquí la
 * escena, así que aquí se le PASA.
 *
 * Sólo donde el motor no decodifica imágenes: en la web de la app el PNG se abre de verdad, y
 * el complemento cambiaría el atlas por su copia, que es lo mismo pero por nada. Y es el del
 * TABLERO, no `texturasLisas`: la blanca de los avatares dejaría el valle igual de blanco.
 * Es del módulo y no del render porque la escena lo lee una vez, al pedir el catálogo.
 */
const COMPLEMENTOS_DEL_TABLERO: readonly ComplementoDelCargador[] = decodificaImagenes() ? [] : [texturasDelTablero];

/**
 * Pinta la mesa de Las Lindes. La pantalla entera hasta que hay mesa —el vestíbulo con su plazo—
 * y lo que es de cualquier mesa —el latido, los nombres, la barra— es de la plataforma.
 */
export default function LasLindesPorDentro(): JSX.Element {
  return <LaMesaDeUnPintor arcade={LINDES} Pintor={ElValleEnLaMesa} />;
}

/**
 * EL PINTOR DE LAS LINDES: el valle y su hoja, con lo que le da el contrato (`LoQueVeElPintor`).
 * Componente aparte para que sus ganchos —el modo, la palanca, el canal, el controlador— no queden
 * detrás de los `return` del vestíbulo.
 */
function ElValleEnLaMesa(pintor: LoQueVeElPintor): JSX.Element {
  const { mesa, vista, juego, abajo, laBarra } = pintor;
  const [modo, ponerModo] = useState<'mesa' | 'hombro' | 'ojos'>('mesa');
  /*
   * La palanca y el correr, en una referencia que escribe `MandosDelPaseo` y lee la escena en
   * su bucle. Aquí arriba, con los demás ganchos: debajo de una salida temprana, React se
   * rompería la primera vez que la pantalla cambiara de rama.
   */
  const mandos = useRef<MandosDeFuera>(SIN_MANDOS_DE_FUERA);

  /*
   * ═══ EL CANAL, SÓLO EN UNA MESA DE BOTAS ═══
   *
   * También aquí arriba, por lo mismo que los mandos. Sin mesa, sin llave o sin asiento no hay
   * canal: no hay con qué decir `hola`. Los asientos llegan en cada vuelta del sondeo, pero la
   * escena sólo reabre el socket si cambian la dirección, la llave o el asiento.
   */
  const esBotas = esMesaDeBotas(mesa.mesa);
  const [estadoDelCanal, ponerEstadoDelCanal] = useState<EstadoDelCanal | null>(null);
  const codigoDeLaMesa = mesa.mesa?.codigo ?? null;
  const yoEnLaMesa = mesa.mesa?.yo ?? null;
  const llaveDelAsiento = mesa.llave ?? null;
  const asientosDeLaMesa = mesa.mesa?.asientos;
  const vistaDeLaMesa = mesa.mesa?.vista;
  const canal = useMemo<CanalDeBotas | undefined>(
    () =>
      esBotas && codigoDeLaMesa !== null && yoEnLaMesa !== null && llaveDelAsiento !== null
        ? {
            url: direccionDelCanal(codigoDeLaMesa),
            llave: llaveDelAsiento,
            yo: yoEnLaMesa,
            asientos: asientosQueAndan(asientosDeLaMesa ?? [], vistaDeLaMesa),
            alCambiar: ponerEstadoDelCanal,
          }
        : undefined,
    [asientosDeLaMesa, codigoDeLaMesa, esBotas, llaveDelAsiento, vistaDeLaMesa, yoEnLaMesa],
  );
  /* Una mesa de botas se empieza a pie: es a lo que se viene. Una vez por mesa; luego manda el botón. */
  useEffect(() => {
    if (esBotas) ponerModo('hombro');
  }, [esBotas, codigoDeLaMesa]);

  /*
   * EL CONTROLADOR DE LAS LINDES: la escena, el giro, la calidad, los sitios y lo que manda cada
   * toque, lo mismo que el escritorio. Ver la cabecera de `escenas/lindes/el-valle-en-la-mesa.ts`.
   */
  const tablero = useMemo(() => tableroDeLaVista(vista.vista), [vista.vista]);
  const valle = usarElValleEnLaMesa({
    puesta: vista,
    tablero,
    opciones: vista.opciones ?? [],
    mover: mesa.mover,
    quieto: mesa.quieto,
    modo,
    traer,
  });
  const { laLosa, girosAqui, girar, sitios, sinRepetir, alTocar } = valle;

  /*
   * ═══ EL RESPALDO: EL RETABLO, Y SE JUEGA IGUAL ═══
   *
   * Cuando la vista no es de este juego —un servidor con otro reparto— o el valle se ha caído,
   * se pinta el tablero declarado con la mesa de siempre alrededor: la barra, de quién es el
   * turno, el aviso, los botones que el retablo no pinta y la crónica. No es una pantalla de
   * disculpa: es el mismo mueble genérico con el que se juega una partida entera, y con una nota
   * que dice por qué.
   */
  if (valle.escena === null || valle.roto !== null) {
    return (
      <ElRespaldo
        pintor={pintor}
        nota={
          valle.roto !== null
            ? `El valle en tres dimensiones no se ha podido pintar (${valle.roto}). Se juega sobre el tablero de siempre.`
            : 'El valle en tres dimensiones no ha podido leer esta mesa. Se juega sobre el tablero de siempre.'
        }
      />
    );
  }

  return (
    <View style={estilos.pantalla}>
      {/*
        ═══ DE DÓNDE SE SALE Y QUÉ CÓDIGO SE DICTA ═══

        Esta pantalla no montaba la barra, así que desde una mesa de Las Lindes en marcha NO
        SE PODÍA hacer ninguna de las tres cosas que la barra existe para hacer: ver el código
        para que se siente quien falta, levantarse para dejarle el sitio a otro, o tirar la mesa
        cuando alguien se ha ido y la partida ya no puede seguir. Ahora llega hecha del contrato
        de pintor —con el hueco de arriba y la marca de Boots on Board—, en las dos ramas.
      */}
      {laBarra}
      <View style={estilos.lienzo}>
        <RedDelLienzo juego={juego} alCaer={valle.alFallar}>
          <Canvas style={estilos.canvas} {...EL_LIENZO_DEL_VALLE} onCreated={alCrearElLienzoDelValle}>
            <Lindes
              {...valle.escena}
              complementosDelTablero={COMPLEMENTOS_DEL_TABLERO}
              canal={canal}
              mandos={mandos}
            />
          </Canvas>
        </RedDelLienzo>

        {/*
          LOS MANDOS DEL PASEO, encima del lienzo y sólo a pie. Sin ellos, en el teléfono se
          bajaba a «Hombro» y no se podía dar un paso. Ver `mandos-del-paseo.tsx`. Y «Golpear»,
          a pie y sólo con canal: la refriega de una mesa de botas, lo que en el escritorio es la G.
        */}
        <MandosDelPaseo mandos={mandos} visibles={modo !== 'mesa'} />
        <BotonDeGolpear mandos={mandos} visible={modo !== 'mesa' && canal !== undefined} />

        {/*
          CÓMO VA EL CANAL, arriba a la izquierda —la derecha es de las cámaras y abajo están
          la palanca y el correr— y sin coger el dedo: es un cartel. Sólo en una mesa de botas.
        */}
        {esBotas ? (
          <View style={estilos.canal} pointerEvents="none">
            <Text style={estilos.canalTexto} numberOfLines={2}>
              {estadoDelCanal?.texto ?? 'Conectando…'}
            </Text>
          </View>
        ) : null}

        {/* Las tres cámaras, con su nombre corto: en un móvil no cabe una frase. */}
        <View style={estilos.camaras}>
          {LAS_CAMARAS_DEL_VALLE.map((c) => (
            <Pressable
              key={c.modo}
              style={[estilos.camara, modo === c.modo && estilos.camaraPuesta]}
              accessibilityRole="button"
              accessibilityState={{ selected: modo === c.modo }}
              onPress={() => ponerModo(c.modo)}
            >
              <Text style={[estilos.camaraTexto, modo === c.modo && estilos.camaraTextoPuesto]}>
                {c.corto}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/*
        LA HOJA: lo que hay que leer y lo que se puede pulsar, debajo del valle.

        Se queda SIEMPRE a la vista y no detrás de un cajón, por lo mismo que en el
        escritorio es un raíl y no un cajón: la decisión de este juego es «dónde
        encaja esto», y se toma mirando el tablero y la losa A LA VEZ. Un cajón
        obligaría a abrirlo y cerrarlo en cada turno.
      */}
      <View style={[estilos.hoja, { paddingBottom: abajo + 10 }]}>
        {/*
          EL AVISO DE LA MESA MANDA SOBRE EL DEL JUEGO. «No ha salido el movimiento» no se veía en
          ninguna parte de esta pantalla mientras se jugaba: sólo en el vestíbulo. Es lo que el Burgo
          hace con su cinta, y por lo mismo: lo que se acaba de pulsar manda sobre lo que hay que
          esperar.
        */}
        <Text style={estilos.aviso} numberOfLines={2}>
          {mesa.aviso.length > 0 ? mesa.aviso : (tablero?.aviso ?? '')}
        </Text>

        {laLosa !== null ? (
          <View style={estilos.fila}>
            <View style={estilos.manoTexto}>
              <Text style={estilos.manoNombre}>{laLosa.nombre}</Text>
              <Text style={estilos.manoLados}>
                N {laLosa.lados[0]} · E {laLosa.lados[1]} · S {laLosa.lados[2]} · O {laLosa.lados[3]}
                {laLosa.ermita ? ' · ermita' : ''}
              </Text>
            </View>
            <Pressable
              style={[estilos.girar, girosAqui.length < 2 && estilos.botonQuieto]}
              disabled={girosAqui.length < 2 || mesa.quieto}
              accessibilityRole="button"
              onPress={girar}
            >
              <Text style={[estilos.botonTexto, girosAqui.length < 2 && estilos.botonTextoQuieto]}>
                Girar
              </Text>
            </Pressable>
          </View>
        ) : null}

        {sitios.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.tira}>
            {sitios.map((s) => (
              <Pressable
                key={`${s.clase}:${s.indice}`}
                style={estilos.chip}
                disabled={mesa.quieto}
                accessibilityRole="button"
                accessibilityLabel={`${s.rotulo}. ${s.ayuda}`}
                onPress={() => alTocar(s.movimiento)}
              >
                <Text style={estilos.chipTexto}>{s.rotulo}</Text>
                {/*
                  LA CIFRA VA SIEMPRE, AUNQUE SEA EL CERO. Una losa puede ofrecer DOS prados
                  —dos praderas que no se tocan—, y entonces los dos rótulos son la misma
                  frase palabra por palabra: «Labriego en el prado». Con la raya en vez del
                  número salían dos fichas idénticas, «—» las dos, y no había forma de saber
                  cuál era cuál ni por qué había dos. Visto jugando una mesa desde la app.
                */}
                <Text style={estilos.chipCifra}>
                  {s.cerrada ? `cierra ${s.valdria}` : `${s.valdria}`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/*
          LOS BOTONES QUE NO SE TOCAN EN EL TABLERO: empezar, no plantar. Salen del
          tablero declarado y no de una lista escrita aquí, para que un botón nuevo
          del juego aparezca sin tocar esta pantalla.

          Y SIN LOS QUE YA ESTÁN ARRIBA. `acciones` trae TODO lo que no sea poner una
          losa, así que traía también los plantados y cada sitio salía DOS veces: una en
          la tira de arriba con lo que valdría, y otra aquí sin nada. Seis chips donde
          había tres cosas. Cuáles sobran lo dice `shared/`, que es quien sabe qué
          movimiento hay detrás de cada sitio.
        */}
        {sinRepetir.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.tira}>
            {sinRepetir.map((a) => (
              <Pressable
                key={a.id}
                style={[estilos.chip, !a.disponible && estilos.chipQuieto]}
                disabled={!a.disponible || mesa.quieto}
                accessibilityRole="button"
                accessibilityLabel={`${a.rotulo}. ${a.ayuda}`}
                onPress={() => alTocar(a.toque)}
              >
                <Text style={[estilos.chipTexto, !a.disponible && estilos.botonTextoQuieto]}>
                  {a.rotulo}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/*
          ═══ EL MARCADOR ES EL QUE DECLARA EL JUEGO, Y NO UNA LISTA DE NOMBRES ═══

          Aquí había una fila con los nombres de los sentados y nada más: ni los puntos, ni
          cuántos labriegos le quedan a cada uno, ni cuántas losas hay en la bolsa, ni qué se
          acaba de cobrar, ni el recuento del final. Jugando una mesa entera desde el móvil no
          se veía UN SOLO PUNTO: se podía poner losas y plantar, pero no saber quién iba
          ganando ni por qué, ni enterarse de haber ganado.

          Lo que se pinta ahora es `tablero.paneles`: lo mismo que el escritorio, salido del
          mismo reductor, sin un dato nuevo ni una regla escrita en el cliente. Es la regla de
          la casa —ningún juego sólo para PC— aplicada a lo único que aquí faltaba.
        */}
        {(tablero?.paneles ?? []).map((panel, i) => (
          <View key={`panel-${String(i)}`} style={estilos.panel}>
            <Text style={estilos.panelTitulo}>{panel.titulo}</Text>
            {panel.lineas.map((linea, j) => (
              <Text key={`panel-${String(i)}-${String(j)}`} style={estilos.panelLinea}>
                {linea}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: SALA.suelo },
  lienzo: { flex: 1, minHeight: 200, backgroundColor: '#8cb8de' },
  canvas: { flex: 1 },
  /*
   * ═══ LO APAGADO SE APAGA CON COLOR, Y POR ESO SON TRES Y NO UNO ═══
   *
   * Esto era `botonApagado: { opacity: 0.4 }`, y `verify:gramatica` lo cazó: una
   * placa al 40 % apaga TAMBIÉN el rótulo que lleva encima, y el rótulo apagado es
   * justo lo que hay que poder leer para saber por qué no se puede pulsar.
   *
   * Son tres y no uno porque el apagado cuelga de tres fondos distintos, y el estilo
   * único era lo que el `opacity` permitía disimular:
   *
   *   · la placa de acento cae a `teja`, que es el fondo muerto de la casa;
   *   · el rótulo que iba OSCURO sobre el acento tiene que pasar a `tenue`, o se
   *     queda negro sobre casi negro —`suelo` sobre `teja` da 1,2:1—;
   *   · y el cromo, que YA es `teja`, tiene que caer a `suelo`: apagarlo a `teja`
   *     habría sido no apagarlo, y con la opacidad ni se notaba.
   */
  botonQuieto: { backgroundColor: SALA.teja },
  botonTextoQuieto: { color: SALA.tenue },
  chipQuieto: { backgroundColor: SALA.suelo, borderColor: SALA.filo },
  botonTexto: { color: SALA.suelo, fontSize: 15, ...LETRA.rotuloChico },
  aviso: { color: SALA.palabra, fontSize: 14, lineHeight: 19, ...LETRA.cuerpo },
  camaras: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  camara: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(12, 20, 8, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(243, 236, 216, 0.45)',
  },
  camaraPuesta: { backgroundColor: '#f3ecd8', borderColor: '#f3ecd8' },
  camaraTexto: { color: '#f3ecd8', fontSize: 13, ...LETRA.rotuloChico },
  camaraTextoPuesto: { color: '#1b2411' },
  /* La misma placa que las cámaras, para que se lea como de la misma familia. */
  canal: {
    position: 'absolute',
    top: 8,
    left: 8,
    maxWidth: '52%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(12, 20, 8, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(243, 236, 216, 0.45)',
  },
  canalTexto: { color: '#f3ecd8', fontSize: 13, ...LETRA.cuerpo },
  hoja: {
    backgroundColor: SALA.pared,
    borderTopColor: SALA.filo,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  manoTexto: { flex: 1, minWidth: 0 },
  manoNombre: { color: SALA.palabra, fontSize: 15, ...LETRA.rotuloChico },
  manoLados: { color: SALA.tenue, fontSize: 13, ...LETRA.cuerpo },
  girar: {
    backgroundColor: SALA.acento,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tira: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    backgroundColor: SALA.teja,
    borderColor: SALA.filoVivo,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  chipTexto: { color: SALA.palabra, fontSize: 13, ...LETRA.cuerpo },
  chipCifra: { color: SALA.tenue, fontSize: 13, ...LETRA.cuerpo },
  panel: { gap: 2, paddingTop: 2 },
  /*
   * Los mismos dos estilos que el retablo usa para SUS paneles —son los mismos paneles,
   * salidos del mismo reductor—: el rótulo en `rotuloChico` y las líneas en `LETRA.dato`,
   * que trae `tabular-nums` y es lo que hace que las cifras queden alineadas de un renglón
   * al siguiente. Y los dos a 13, que es el mínimo de la casa: a 11 lo cazó
   * `verify:gramatica`, y con razón —esto se lee en un móvil, a un brazo de distancia—.
   */
  panelTitulo: { ...LETRA.rotuloChico, color: SALA.tenue, fontSize: 13 },
  panelLinea: {
    ...LETRA.dato,
    fontVariant: [...LETRA.dato.fontVariant],
    color: SALA.palabra,
    fontSize: 13,
  },
});
