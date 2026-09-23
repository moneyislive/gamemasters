/**
 * LAS LINDES EN EL MÓVIL: el valle, y la hoja desde la que se juega.
 *
 * ═══ QUÉ HACE ESTA PANTALLA ═══
 *
 * Abre o entra en una mesa, monta la escena (`escenas/lindes/Lindes.tsx`) con el
 * tablero que traduce `shared/arcade/juegos/lindes-en-tres.ts`, y convierte los
 * toques en movimientos. Ni una regla vive aquí: qué se puede poner y dónde lo dice
 * la lista de opciones que el juego acaba de componer.
 *
 * ═══ ES LA HERMANA DE `escritorio/src/lindes-en-tres.tsx`, Y COMPARTEN LO QUE IMPORTA ═══
 *
 * Las dos pantallas son distintas —una tiene raíl y la otra una hoja, una tiene
 * teclado y la otra el pulgar— y las dos llaman a las MISMAS funciones de
 * `shared/`: `tableroEnTres`, `sitiosQueSeOfrecen`, `girosQueCaben`,
 * `movimientoDePoner`. Lo que se comparte es lo que puede divergir sin que nadie se
 * entere; lo que no se comparte es la forma, que es distinta a propósito.
 *
 * ═══ EL RESPALDO NO ES UNA CORTESÍA ═══
 *
 * Si los modelos no llegan o el aparato no da contexto de dibujo, se cae al
 * RETABLO —el mueble genérico, el mismo SVG con el que se juega sin una línea de
 * tres dimensiones— y la partida se puede terminar ahí. Es lo que hace que la
 * escena sea un lujo y no una dependencia.
 *
 * ═══ Y EL GIRO VIVE EN LA PANTALLA ═══
 *
 * Con qué giro se pone la losa es una decisión de pantalla hasta que se pulsa: no
 * es estado del juego, no viaja por el cable y no tiene que sobrevivir a nada. Si
 * viviera en la partida, girar sería un movimiento —una revisión, un aviso a los
 * demás aparatos y una entrada en el diario— por cada vuelta que alguien le da a
 * una losa antes de decidirse.
 *
 * ═══ Y A PIE SE ANDA CON EL PULGAR ═══
 *
 * La escena leía las teclas de `document`, y aquí no hay ni una cosa ni la otra: en
 * «Hombro» y en «Ojos» la cámara bajaba detrás de la figura y la figura no se movía.
 * Ahora esta pantalla monta `MandosDelPaseo` —una palanca y un botón de correr— y le
 * pasa a la escena la referencia donde los escribe. Esta pantalla no tiene mirador
 * táctil que apagar mientras se anda: la cámara de mesa de Las Lindes se encuadra sola
 * y no se arrastra, así que el pulgar que anda no mueve nada más.
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas } from '../tres/Lienzo';
import { Lindes } from '../../../escenas/lindes/Lindes';
import type { ModoDeCamaraDeLasLindes } from '../../../escenas/lindes/tipos';
import { SIN_MANDOS_DE_FUERA } from '../../../escenas/paseo/mandos';
import type { MandosDeFuera } from '../../../escenas/paseo/mandos';
import {
  elSiguienteGiro,
  accionesFueraDeLosSitios,
  laAccionDePasar,
  girosQueCaben,
  movimientoDePoner,
  sitiosQueSeOfrecen,
  tableroEnTres,
} from '../../../shared/arcade/juegos/lindes-en-tres';
/*
 * Del juego y NUNCA del índice: `shared/arcade/juegos/index.ts` instala los siete
 * arcades al cargarse, y eso es cosa del servidor. Aquí sólo hace falta el
 * identificador y el catálogo de losas.
 */
import { LINDES } from '../../../shared/arcade/juegos/lindes';
import { losaPorId } from '../../../shared/arcade/juegos/lindes-losas';
import type { Giro } from '../../../shared/arcade/juegos/lindes-losas';
import { tableroDeLaVista } from '../../../shared/mecanicas/tablero-declarado';
import type { MovimientoDeclarado } from '../../../shared/mecanicas/tablero-declarado';
import { manifiestoDeArcadeSiExiste } from '../../../shared/arcade';
import { MandosDelPaseo } from './mandos-del-paseo';
import { usarMesaDeArcade } from './mesa';
import { LETRA, SALA } from './muebles';
import { Pantalla } from './piezas';
import { Retablo } from './retablo';
import { BarraDeLaMesa } from './tablero-en-linea';
import { traer } from './traer';

/** El campo vertical de la cámara. El mismo que usa `camaraDeMesa` para encuadrar. */
const CAMPO = 45;

/** Las tres cámaras, con su rótulo corto: en un móvil no cabe una frase. */
const LAS_CAMARAS: readonly { modo: 'mesa' | 'hombro' | 'ojos'; rotulo: string }[] = [
  { modo: 'mesa', rotulo: 'Mesa' },
  { modo: 'hombro', rotulo: 'Hombro' },
  { modo: 'ojos', rotulo: 'Ojos' },
];

/**
 * LA RED DEL LIENZO.
 *
 * Un fallo dentro del contexto de dibujo —un modelo roto, un aparato sin WebGL—
 * tiraría la pantalla entera y dejaría a alguien fuera de su partida. Con la red,
 * se cae el lienzo y se sigue jugando sobre el retablo. Es la misma que tienen las
 * otras dos pantallas de escena de esta app.
 */
class RedDelValle extends Component<
  { alFallar: (motivo: string) => void; children: ReactNode },
  { roto: boolean }
> {
  public override state = { roto: false };

  public static getDerivedStateFromError(): { roto: boolean } {
    return { roto: true };
  }

  public override componentDidCatch(fallo: unknown): void {
    this.props.alFallar(fallo instanceof Error ? fallo.message : String(fallo));
  }

  public override render(): ReactNode {
    return this.state.roto ? null : this.props.children;
  }
}

export default function LasLindesPorDentro(): JSX.Element {
  const manifiesto = manifiestoDeArcadeSiExiste(LINDES);
  const mesa = usarMesaDeArcade(LINDES);
  const [nombre, ponerNombre] = useState('');
  const [codigo, ponerCodigo] = useState('');
  const [giro, ponerGiro] = useState<Giro>(0);
  const [senalada, ponerSenalada] = useState<{ x: number; y: number } | null>(null);
  const [modo, ponerModo] = useState<'mesa' | 'hombro' | 'ojos'>('mesa');
  const [rotoElValle, ponerRotoElValle] = useState(false);
  const bordes = useSafeAreaInsets();
  /*
   * La palanca y el correr, en una referencia que escribe `MandosDelPaseo` y lee la escena en
   * su bucle. Aquí arriba, con los demás ganchos: debajo de una salida temprana, React se
   * rompería la primera vez que la pantalla cambiara de rama.
   */
  const mandos = useRef<MandosDeFuera>(SIN_MANDOS_DE_FUERA);

  const vista = mesa.mesa?.vista ?? null;
  const opciones = mesa.mesa?.opciones ?? [];
  const datos = useMemo(() => tableroEnTres(vista), [vista]);
  const tablero = useMemo(() => tableroDeLaVista(vista), [vista]);
  const sitios = useMemo(() => sitiosQueSeOfrecen(vista, opciones), [vista, opciones]);
  const girosAqui = useMemo(
    () => (datos === null || senalada === null ? [] : girosQueCaben(datos, senalada.x, senalada.y)),
    [datos, senalada],
  );

  /*
   * El giro se ajusta solo al señalar una casilla: si el que llevas elegido no cabe
   * ahí, pasa al primero que sí. Lo contrario es un fantasma que no aparece y un
   * toque que pone la losa de otra manera, y enseñar lo que va a pasar antes de que
   * pase es toda la gracia del fantasma.
   */
  useEffect(() => {
    if (girosAqui.length === 0) return;
    if (girosAqui.indexOf(giro) >= 0) return;
    ponerGiro(girosAqui[0] as Giro);
  }, [girosAqui, giro]);

  const alFallar = useCallback((motivo: string) => {
    console.warn(`El valle no se ha podido pintar (${motivo}): se juega sobre el retablo.`);
    ponerRotoElValle(true);
  }, []);

  const alTocarHueco = useCallback(
    (x: number, y: number, conGiro: Giro) => {
      void mesa.mover(movimientoDePoner(x, y, conGiro));
    },
    [mesa],
  );

  const alSenalarHueco = useCallback((x: number | null, y: number | null) => {
    ponerSenalada(x === null || y === null ? null : { x, y });
  }, []);

  /*
   * EL RELOJ DE ARENA DE LA ESCENA ES TAMBIÉN EL BOTÓN DE PASAR, y lo que manda es LA
   * MISMA acción que manda el botón de la tira: se la pregunta a `shared/`, que es quien
   * sabe cuál de las acciones del tablero es la de no plantar. Dos caminos al mismo gesto
   * que mandaran cosas distintas serían dos gestos, y uno acabaría roto en silencio.
   */
  const laDePasar = useMemo(() => laAccionDePasar(tablero), [tablero]);
  /* Lo que va en la segunda tira: lo que la primera no pinta ya. Ver el comentario de abajo. */
  const sinRepetir = useMemo(() => accionesFueraDeLosSitios(tablero, sitios), [tablero, sitios]);

  const alTocar = useCallback(
    (movimiento: MovimientoDeclarado) => {
      void mesa.mover(movimiento);
    },
    [mesa],
  );

  if (mesa.fase === 'yendo') {
    return (
      <Pantalla hueco={28} estilo={{ paddingTop: bordes.top + 28, paddingBottom: bordes.bottom + 28 }}>
        <View style={estilos.centro}>
          <ActivityIndicator color={SALA.acento} />
          <Text style={estilos.texto}>Hablando con la mesa…</Text>
        </View>
      </Pantalla>
    );
  }

  const sinNombre = nombre.trim().length === 0;
  const noPuedeAbrir = mesa.quieto || sinNombre;
  const noPuedeEntrar = noPuedeAbrir || codigo.trim().length === 0;

  if (mesa.fase === 'fuera' || mesa.mesa === null) {
    return (
      <Pantalla hueco={28} estilo={{ paddingTop: bordes.top + 28, paddingBottom: bordes.bottom + 28 }}>
        <View style={estilos.centro}>
          <Text style={estilos.titulo}>{manifiesto?.nombre ?? 'Las Lindes'}</Text>
          <Text style={estilos.texto}>{manifiesto?.gancho ?? ''}</Text>
          <TextInput
            style={estilos.campo}
            placeholder="Tu nombre en la mesa"
            placeholderTextColor={SALA.tenue}
            value={nombre}
            onChangeText={ponerNombre}
            maxLength={24}
            accessibilityLabel="Tu nombre en la mesa"
          />
          <Pressable
            style={[estilos.boton, noPuedeAbrir && estilos.botonQuieto]}
            disabled={noPuedeAbrir}
            accessibilityRole="button"
            accessibilityState={{ disabled: noPuedeAbrir }}
            onPress={() => mesa.abrir(nombre.trim())}
          >
            <Text style={[estilos.botonTexto, noPuedeAbrir && estilos.botonTextoQuieto]}>
              Volcar la bolsa
            </Text>
          </Pressable>
          <Text style={estilos.rotulo}>O SENTARSE EN UNA MESA ABIERTA</Text>
          <TextInput
            style={estilos.campo}
            placeholder="Código de la mesa"
            placeholderTextColor={SALA.tenue}
            value={codigo}
            onChangeText={ponerCodigo}
            autoCapitalize="characters"
            maxLength={8}
            accessibilityLabel="Código de la mesa"
          />
          <Pressable
            style={[estilos.boton, noPuedeEntrar && estilos.botonQuieto]}
            disabled={noPuedeEntrar}
            accessibilityRole="button"
            accessibilityState={{ disabled: noPuedeEntrar }}
            onPress={() => mesa.entrar(codigo.trim().toUpperCase(), nombre.trim())}
          >
            <Text style={[estilos.botonTexto, noPuedeEntrar && estilos.botonTextoQuieto]}>
              Sentarse
            </Text>
          </Pressable>
          {mesa.aviso.length > 0 ? <Text style={estilos.aviso}>{mesa.aviso}</Text> : null}
        </View>
      </Pantalla>
    );
  }

  /*
   * ═══ EL RESPALDO: EL RETABLO, Y SE JUEGA IGUAL ═══
   *
   * Cuando la vista no es de este juego —un servidor con otro reparto— o el lienzo
   * se ha caído, se pinta el tablero declarado. No es una pantalla de disculpa: es
   * el mismo mueble genérico con el que se juega una partida entera.
   */
  if (datos === null || rotoElValle) {
    return (
      <Pantalla hueco={16} estilo={{ paddingBottom: bordes.bottom + 12 }}>
        <BarraDeLaMesa
          juego={manifiesto?.nombre ?? 'Las Lindes'}
          codigo={mesa.mesa.codigo}
          asientos={mesa.mesa.asientos}
          salir={mesa.salir}
          tirar={mesa.tirar}
          arriba={bordes.top}
        />
        {tablero === null ? (
          <Text style={estilos.texto}>Esperando a la mesa…</Text>
        ) : (
          <Retablo tablero={tablero} alTocar={alTocar} quieto={mesa.quieto} />
        )}
      </Pantalla>
    );
  }

  const laLosa = datos.enMano === '' ? null : losaPorId(datos.enMano);
  const camara: ModoDeCamaraDeLasLindes =
    modo === 'mesa' ? { modo: 'mesa' } : { modo, asiento: mesa.mesa.yo ?? '' };

  return (
    <View style={estilos.pantalla}>
      {/*
        ═══ DE DÓNDE SE SALE Y QUÉ CÓDIGO SE DICTA ═══

        Esta pantalla no montaba la barra, así que desde una mesa de Las Lindes en marcha NO
        SE PODÍA hacer ninguna de las tres cosas que la barra existe para hacer: ver el
        código para que se siente quien falta, levantarse para dejarle el sitio a otro, o
        tirar la mesa cuando alguien se ha ido y la partida ya no puede seguir. En el
        escritorio están las tres; aquí no estaba ninguna, y con una partida de tres días
        eso es quedarse encerrado en el valle.

        Va en LAS DOS ramas —la del retablo y la del valle— porque de las dos hay que poder
        salir, y se lleva ella el hueco de arriba (`arriba={bordes.top}`), que antes se comía
        la pantalla entera. Es el mismo montaje que El Burgo y que el tablero genérico.
      */}
      <BarraDeLaMesa
        juego={manifiesto?.nombre ?? 'Las Lindes'}
        codigo={mesa.mesa.codigo}
        asientos={mesa.mesa.asientos}
        salir={mesa.salir}
        tirar={mesa.tirar}
        arriba={bordes.top}
      />
      <View style={estilos.lienzo}>
        <RedDelValle alFallar={alFallar}>
          <Canvas
            style={estilos.canvas}
            gl={{ antialias: true }}
            dpr={[1, 2]}
            /*
             * Sin sombras en ningún cliente, y no es una decisión por plataforma: un
             * mapa de sombras redibujado cada fotograma baja un móvil de gama media
             * de sesenta a veinte, y el valle se lee perfectamente sin él. Es lo
             * mismo que hacen el Muelle y el Burgo.
             */
            shadows={false}
            camera={{ fov: CAMPO, near: 1, far: 6000 }}
          >
            <Lindes
              tablero={datos}
              codigo={mesa.mesa.codigo}
              traer={traer}
              calidad="plena"
              camara={camara}
              giroEnMano={giro}
              /* La figura de quien pasea; sin ella, `figuraQueSePinta` saca una del asiento. */
              figura={mesa.mesa?.asientos.find((a) => a.id === mesa.mesa?.yo)?.figura}
              sePuedePasar={laDePasar !== null && !mesa.quieto}
              alPasar={laDePasar === null ? undefined : () => alTocar(laDePasar.toque)}
              quieto={mesa.quieto}
              alTocarHueco={alTocarHueco}
              alSenalarHueco={alSenalarHueco}
              alFallar={alFallar}
              mandos={mandos}
            />
          </Canvas>
        </RedDelValle>

        {/*
          LOS MANDOS DEL PASEO, encima del lienzo y sólo a pie. Sin ellos, en el teléfono se
          bajaba a «Hombro» y no se podía dar un paso. Ver `mandos-del-paseo.tsx`.
        */}
        <MandosDelPaseo mandos={mandos} visibles={modo !== 'mesa'} />

        <View style={estilos.camaras}>
          {LAS_CAMARAS.map((c) => (
            <Pressable
              key={c.modo}
              style={[estilos.camara, modo === c.modo && estilos.camaraPuesta]}
              accessibilityRole="button"
              accessibilityState={{ selected: modo === c.modo }}
              onPress={() => ponerModo(c.modo)}
            >
              <Text style={[estilos.camaraTexto, modo === c.modo && estilos.camaraTextoPuesto]}>
                {c.rotulo}
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
      <View style={[estilos.hoja, { paddingBottom: bordes.bottom + 10 }]}>
        <Text style={estilos.aviso} numberOfLines={2}>
          {tablero?.aviso ?? ''}
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
              onPress={() => ponerGiro((g) => elSiguienteGiro(girosAqui, g))}
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

          Y encima llevaba delante una línea que no podía pintar nada —`cond ? null : null`,
          que devuelve `null` decida lo que decida— puesta ahí para que `datos.labriegos`
          pareciera usado. El sitio estaba reservado y el contenido nunca llegó.

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
  centro: { width: '100%', alignItems: 'center', gap: 12 },
  titulo: { ...LETRA.rotulo, color: SALA.blanco, fontSize: 26, lineHeight: 31, textAlign: 'center' },
  texto: { color: SALA.palabra, fontSize: 16, lineHeight: 24, textAlign: 'center', ...LETRA.cuerpo },
  rotulo: { color: SALA.tenue, fontSize: 13, ...LETRA.rotuloChico },
  campo: {
    width: '100%',
    backgroundColor: SALA.teja,
    borderColor: SALA.filo,
    borderWidth: 1,
    borderRadius: 10,
    color: SALA.palabra,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  boton: {
    width: '100%',
    backgroundColor: SALA.acento,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
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
