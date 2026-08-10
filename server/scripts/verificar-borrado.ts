/**
 * El derecho a desaparecer, comprobado.
 *
 *   npm run verify:borrado
 *
 * POR QUÉ EXISTE. Las dos tiendas exigen poder borrar la cuenta desde dentro de
 * la app —Apple 5.1.1(v), Google Play desde abril de 2024— y el RGPD exige
 * atender una supresión. Aquí no había ni ventanilla ni mecanismo: el almacén
 * declaraba `getAccount`, `getAccountByEmail` y `saveAccount`, y ni un borrado.
 *
 * Pero lo que de verdad hace falta comprobar no es que la fila desaparezca. Es
 * que NO VUELVA. Un borrado a medias es peor que ninguno, porque quien lo pide
 * se queda tranquilo:
 *
 *   - Si solo se borra la cuenta, el correo sigue escrito en la sesión en vivo,
 *     y el desenlace de esa misma partida la crea otra vez.
 *   - Y si se limpia la sesión pero no la partida, `sincronizarJugadores` copia
 *     el correo DE VUELTA desde `game.suspects` en el primer «sincronizar» que
 *     pulse quien dirige.
 *
 * Las dos vueltas atrás se prueban aquí, ejecutándolas de verdad.
 *
 * AISLAMIENTO. Proceso aparte con cwd en una carpeta temporal y entorno
 * explícito, como el resto de comprobadores: ni la clave de Anthropic ni el
 * Atlas de producción entran aquí.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SONDA = path.join(REPO, 'server', 'scripts', 'sonda-borrado.ts');

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 260)}`}`,
  );
}

// ---------------------------------------------------------------------------
// La partida sembrada: dos invitados con correo, uno sin él.
// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-borrado-'));
const ahora = new Date().toISOString();

const game = {
  id: 'velada',
  name: 'Velada de comprobación',
  status: 'ready',
  createdAt: ahora,
  updatedAt: ahora,
  suspects: [
    { id: 's0', name: 'Ana', email: 'Ana@Ejemplo.COM' },
    { id: 's1', name: 'Bruno', email: 'bruno@ejemplo.com' },
    { id: 's2', name: 'Carla' },
  ],
  rooms: [{ id: 'r0', name: 'Salón' }, { id: 'r1', name: 'Cocina' }],
  weapons: [{ id: 'w0', name: 'Candelabro' }],
  boardMode: 'generated',
  settings: { language: 'es' },
};

// Una SEGUNDA partida, con el mismo correo. Borrar tiene que alcanzar también
// aquí: quien dice «borra mis datos» no está hablando de una sola velada.
const otra = {
  ...game,
  id: 'otra-velada',
  name: 'Otra velada',
  suspects: [
    { id: 's0', name: 'Ana', email: 'ana@ejemplo.com' },
    { id: 's1', name: 'Diego', email: 'diego@ejemplo.com' },
  ],
};

const sesionDe = (id: string, sospechosos: Array<{ id: string; name: string; email?: string }>) => ({
  id,
  code: id.slice(0, 5).toUpperCase(),
  phase: 'lobby',
  round: 0,
  totalRounds: 3,
  players: sospechosos.map((s, i) => ({
    suspectId: s.id,
    displayName: s.name,
    email: s.email,
    joinCode: `CODIG${i}`,
    joined: false,
    elecciones: [],
    notas: '',
    girosRecibidos: [],
  })),
  acusaciones: [],
  tablon: [],
  rev: 1,
  updatedAt: ahora,
});

const cuentaDeAna = {
  id: 'cta-ana',
  email: 'ana@ejemplo.com',
  displayName: 'Ana',
  createdAt: ahora,
  partidas: [
    {
      gameId: 'vieja',
      titulo: 'Una de antes',
      personaje: 'Ana Escarlata',
      jugadaEl: ahora,
      acerto: true,
      gano: true,
      eraCulpable: false,
    },
  ],
  trofeos: ['primera-partida', 'ganador'],
};

const cuentaDeBruno = {
  id: 'cta-bruno',
  email: 'bruno@ejemplo.com',
  displayName: 'Bruno',
  createdAt: ahora,
  partidas: [],
  trofeos: [],
};

fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(dir, 'data', 'db.json'),
  JSON.stringify(
    {
      games: [game, otra],
      messages: {},
      config: { model: 'claude-fable-5' },
      live: [sesionDe(game.id, game.suspects), sesionDe(otra.id, otra.suspects)],
      accounts: [cuentaDeAna, cuentaDeBruno],
    },
    null,
    2,
  ),
  'utf8',
);

// ---------------------------------------------------------------------------
// La sonda hace el trabajo dentro de un proceso aislado y cuenta qué quedó.
// ---------------------------------------------------------------------------

type Medida = {
  sinConsentimiento: { brunoPartidas: number; anaPartidas: number; carlaExiste: boolean };
  antes: { cuentas: number; anaEnSesion: boolean; anaEnPartida: boolean };
  resultado: { cuentaBorrada: boolean; partidasLimpiadas: number };
  despues: {
    cuentas: number;
    anaExiste: boolean;
    brunoExiste: boolean;
    anaEnSesion: boolean;
    anaEnPartida: boolean;
    anaEnOtraSesion: boolean;
    anaEnOtraPartida: boolean;
    brunoEnSesion: boolean;
    jugadoresIntactos: number;
  };
  trasSincronizar: { anaEnSesion: boolean };
  trasDesenlace: { anaExiste: boolean; brunoExiste: boolean };
  trasBorrarPartida: { sesionSigueViva: boolean };
  error?: string;
};

const salida = await new Promise<string>((resolver, rechazar) => {
  let texto = '';
  const hijo = spawn(process.execPath, [TSX, SONDA], {
    cwd: dir,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      NODE_ENV: 'test',
      PLAYER_TOKEN_SECRET: 'secreto-de-prueba-de-borrado-0123456789abcdef',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  hijo.stdout.on('data', (t) => {
    texto += String(t);
  });
  hijo.on('error', rechazar);
  hijo.on('close', () => resolver(texto.trim().split('\n').pop() ?? ''));
});

let m: Medida | null = null;
try {
  m = JSON.parse(salida) as Medida;
} catch {
  /* la sonda no llegó a hablar */
}

comprobar('la sonda responde', m !== null, salida.slice(0, 300));

if (m) {
  comprobar('la sonda no reventó', !m.error, m.error);

  console.log('\n· Sin haber dicho que sí, no se guarda nada');
  comprobar(
    'llegar al desenlace NO le apunta la partida a quien no la aceptó',
    m.sinConsentimiento.brunoPartidas === 0,
    m.sinConsentimiento,
  );
  comprobar(
    'ni se la suma a quien ya tenía historial de antes',
    m.sinConsentimiento.anaPartidas === 1,
    m.sinConsentimiento,
  );
  comprobar(
    'y a quien no tiene ni correo no se le inventa una cuenta',
    !m.sinConsentimiento.carlaExiste,
    m.sinConsentimiento,
  );

  console.log('\n· Antes de borrar');
  comprobar('hay dos cuentas', m.antes.cuentas === 2, m.antes);
  comprobar('el correo de Ana está en la sesión', m.antes.anaEnSesion, m.antes);
  comprobar('y en la partida', m.antes.anaEnPartida, m.antes);

  console.log('\n· El borrado');
  comprobar('dice haber borrado la cuenta', m.resultado.cuentaBorrada, m.resultado);
  comprobar(
    'y alcanza a las DOS partidas, no solo a aquella desde la que se pidió',
    m.resultado.partidasLimpiadas === 2,
    m.resultado,
  );

  console.log('\n· Después');
  comprobar('la cuenta de Ana ya no existe', !m.despues.anaExiste, m.despues);
  comprobar('queda una sola cuenta', m.despues.cuentas === 1, m.despues);
  comprobar('el correo de Ana no está en la sesión', !m.despues.anaEnSesion, m.despues);
  comprobar('ni en la partida', !m.despues.anaEnPartida, m.despues);
  comprobar('ni en la sesión de la OTRA partida', !m.despues.anaEnOtraSesion, m.despues);
  comprobar('ni en la otra partida', !m.despues.anaEnOtraPartida, m.despues);

  console.log('\n· Y no se lleva por delante a nadie más');
  comprobar('la cuenta de Bruno sigue', m.despues.brunoExiste, m.despues);
  comprobar('su correo sigue en la sesión', m.despues.brunoEnSesion, m.despues);
  comprobar('nadie ha desaparecido de la mesa', m.despues.jugadoresIntactos === 3, m.despues);

  console.log('\n· Las dos formas en que el correo VOLVÍA');
  comprobar(
    'sincronizar la partida NO devuelve el correo a la sesión',
    !m.trasSincronizar.anaEnSesion,
    m.trasSincronizar,
  );
  comprobar(
    'llegar al desenlace NO vuelve a crear la cuenta borrada',
    !m.trasDesenlace.anaExiste,
    m.trasDesenlace,
  );
  comprobar(
    'y sí sigue creando la de quien no la borró',
    m.trasDesenlace.brunoExiste,
    m.trasDesenlace,
  );

  console.log('\n· Borrar la partida se lleva su sesión');
  comprobar(
    'no queda una sesión huérfana con nombres, correos y notas',
    !m.trasBorrarPartida.sesionSigueViva,
    m.trasBorrarPartida,
  );
}

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* carpeta temporal */
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. Quien pide desaparecer, desaparece.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
