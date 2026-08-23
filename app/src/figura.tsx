/**
 * El retrato dibujado: la figura que interpreta los rasgos del avatar.
 *
 * POR QUÉ EXISTE ESTE FICHERO. Los catálogos de `avatar.ts` —pieles, peinados,
 * atuendos, accesorios— llevaban ahí desde el principio **sin que nadie los
 * dibujara**. El editor los recorría, se guardaban los índices, y luego no se
 * veía nada: el único retrato posible era el modelo 3D de Tripo, que tarda un
 * par de minutos y exige subir una foto. Así que quien abría la app por primera
 * vez no tenía cara.
 *
 * ESTO ES LO QUE SE VE MIENTRAS NO HAY MODELO 3D, y no es un placeholder: es
 * una identidad completa desde el primer segundo. Un retrato de perfil, con la
 * paleta de la casa, que cambia entero según los rasgos.
 *
 * SVG Y NO IMÁGENES. Diez retratos en PNG a la resolución que hoy tienen los
 * móviles son varios megas dentro de un APK que ya pesa cien; en vectores son
 * unos kilobytes, escalan a cualquier tamaño y se recolorean solos. Además el
 * elenco se amplía escribiendo una línea, no exportando ficheros.
 */
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ACCESORIOS, COLORES_ATUENDO, COLORES_PELO, PEINADOS, PIELES } from './avatar';
import type { Avatar } from './avatar';

/** Coge del catálogo sin salirse nunca, aunque el índice guardado sea basura. */
function de<T>(catalogo: ReadonlyArray<T>, i: number): T {
  return catalogo[((i % catalogo.length) + catalogo.length) % catalogo.length] as T;
}

/**
 * El pelo, por encima de la cabeza y por detrás según el peinado.
 *
 * Va en dos piezas —lo de detrás y lo de delante— porque una melena tiene que
 * pasar por detrás del hombro y el flequillo por delante de la frente. Con una
 * sola pieza, o el pelo flota sobre el abrigo o la cara queda tapada.
 */
function Pelo({ estilo, color }: { estilo: string; color: string }): JSX.Element {
  switch (estilo) {
    case 'Melena':
      return (
        <G>
          <Path d="M28 46c0-16 8-26 22-26s22 10 22 26c0 14-2 26-4 34H32c-2-8-4-20-4-34z" fill={color} />
          <Path d="M30 44c2-14 10-22 20-22s18 8 20 22c-4-8-11-12-20-12s-16 4-20 12z" fill="#0000001f" />
        </G>
      );
    case 'Rizos':
      return (
        <G fill={color}>
          <Circle cx="36" cy="34" r="10" />
          <Circle cx="50" cy="27" r="11" />
          <Circle cx="64" cy="34" r="10" />
          <Circle cx="30" cy="46" r="8" />
          <Circle cx="70" cy="46" r="8" />
        </G>
      );
    case 'Coleta':
      return (
        <G fill={color}>
          <Path d="M30 44c0-14 9-23 20-23s20 9 20 23c-5-7-11-11-20-11s-15 4-20 11z" />
          <Path d="M68 40c8 2 12 9 11 18-1 8-5 13-10 15 4-8 4-16 1-22-2-5-2-8-2-11z" />
        </G>
      );
    case 'Rapado':
      return <Path d="M32 44c0-12 8-20 18-20s18 8 18 20c-5-5-11-8-18-8s-13 3-18 8z" fill={color} opacity={0.85} />;
    default:
      // Clásico
      return (
        <Path d="M30 45c0-14 9-24 20-24s20 10 20 24c-4-9-11-14-20-14s-16 5-20 14z" fill={color} />
      );
  }
}

/** Lo que se pone en la cara. El monóculo va siempre en el mismo ojo. */
function Accesorio({ cual }: { cual: string }): JSX.Element | null {
  switch (cual) {
    case 'Monóculo':
      return (
        <G>
          <Circle cx="60" cy="54" r="9" fill="#ffffff14" stroke="#e8cf7f" strokeWidth={2} />
          <Path d="M66 61l6 12" stroke="#e8cf7f" strokeWidth={1.5} strokeLinecap="round" />
        </G>
      );
    case 'Gafas':
      return (
        <G stroke="#e8cf7f" strokeWidth={2} fill="#ffffff10">
          <Circle cx="41" cy="54" r="8" />
          <Circle cx="60" cy="54" r="8" />
          <Path d="M49 54h3" />
        </G>
      );
    case 'Antifaz':
      return (
        <Path
          d="M30 50c6-4 14-5 20-5s14 1 20 5c-1 8-5 12-11 12-4 0-6-2-9-4-3 2-5 4-9 4-6 0-10-4-11-12z"
          fill="#12161c"
          opacity={0.92}
        />
      );
    default:
      return null;
  }
}

/**
 * El retrato completo.
 *
 * `tamano` es el lado del cuadrado. Todo lo demás se dibuja sobre un lienzo de
 * 100×100 y escala solo — que es la ventaja de no usar imágenes.
 */
export function Figura({
  avatar,
  tamano = 96,
  conFondo = true,
}: {
  avatar: Avatar;
  tamano?: number;
  conFondo?: boolean;
}): JSX.Element {
  const piel = de(PIELES, avatar.piel);
  const pelo = de(COLORES_PELO, avatar.colorPelo);
  const peinado = de(PEINADOS, avatar.peinado);
  const ropa = de(COLORES_ATUENDO, avatar.colorAtuendo);
  const accesorio = de(ACCESORIOS, avatar.accesorio);
  const atuendo = avatar.atuendo;

  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="fondoRetrato" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#16311f" />
          <Stop offset="1" stopColor="#0a140e" />
        </LinearGradient>
      </Defs>

      {conFondo && <Rect x="0" y="0" width="100" height="100" rx="14" fill="url(#fondoRetrato)" />}

      {/* El halo de detrás: separa la figura del fondo sin dibujarle un borde. */}
      <Circle cx="50" cy="52" r="34" fill="#e8cf7f" opacity={0.06} />

      {/* Melena y coleta pasan POR DETRÁS de los hombros. */}
      {(peinado === 'Melena' || peinado === 'Coleta') && <Pelo estilo={peinado} color={pelo} />}

      {/* Hombros y atuendo. La capa se dibuja más ancha; el esmoquin, con solapa. */}
      <G>
        <Path
          d={
            atuendo === 2
              ? 'M14 100c0-20 16-30 36-30s36 10 36 30z' // Capa
              : 'M22 100c0-17 13-26 28-26s28 9 28 26z'
          }
          fill={ropa.tela}
        />
        <Path
          d={
            atuendo === 2
              ? 'M14 100c0-20 16-30 36-30v30z'
              : 'M22 100c0-17 13-26 28-26v26z'
          }
          fill={ropa.sombra}
          opacity={0.55}
        />
        {atuendo === 0 && (
          // Esmoquin: la pechera y la pajarita.
          <G>
            <Path d="M43 78l7 8 7-8-7-5z" fill="#f1ece0" />
            <Path d="M45 76h10l-5 4z" fill={ropa.detalle} />
          </G>
        )}
        {atuendo === 1 && (
          // Gabardina: el cinturón cruzado.
          <Path d="M30 92h40" stroke={ropa.detalle} strokeWidth={3} strokeLinecap="round" />
        )}
        {atuendo === 3 && (
          // De diario: el cuello abierto.
          <Path d="M44 76l6 7 6-7" stroke={ropa.detalle} strokeWidth={2} fill="none" />
        )}
      </G>

      {/* Cuello y cabeza. */}
      <Path d="M44 66h12v10H44z" fill={piel} opacity={0.85} />
      <Ellipse cx="50" cy="50" rx="19" ry="22" fill={piel} />
      {/* Una sombra en un lado: sin esto la cara es una mancha plana. */}
      <Path d="M50 28c-10 0-19 10-19 22s9 22 19 22z" fill="#00000012" />

      {/* Ojos y boca, apenas sugeridos: a este tamaño más detalle es ruido. */}
      <Circle cx="42" cy="53" r="2.1" fill="#1a1410" />
      <Circle cx="58" cy="53" r="2.1" fill="#1a1410" />
      <Path d="M45 62c3 2 7 2 10 0" stroke="#1a1410" strokeWidth={1.6} fill="none" strokeLinecap="round" />

      {/* El resto de peinados van por delante. */}
      {peinado !== 'Melena' && peinado !== 'Coleta' && <Pelo estilo={peinado} color={pelo} />}

      <Accesorio cual={accesorio} />
    </Svg>
  );
}
