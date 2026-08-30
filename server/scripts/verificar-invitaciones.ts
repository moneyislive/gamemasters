/**
 * Las invitaciones que se ven en la portada de la app.
 *
 *   npm run verify:invitaciones
 *
 * LA COMPROBACIÓN QUE MÁS IMPORTA está al final y es la más tonta de escribir:
 * que en la respuesta NO aparece ningún código de invitación. Se busca la
 * cadena en el JSON entero, no campo a campo, porque el fallo que hay que
 * impedir no es «se me olvidó ocultar este campo» sino «alguien añadió un campo
 * nuevo dentro de un objeto que ya se enviaba». Si el código personal viajara
 * en la lista de invitaciones, cualquier fallo de casado de correos se
 * convertiría en entrada libre a la velada de otro.
 *
 * Y la segunda: que `directa` —entrar sin teclear nada— sea FALSO mientras el
 * correo no lo haya verificado un proveedor. Hoy no hay ninguno enchufado, así
 * que debe ser falso siempre; el día que lo haya, esta prueba es la que impide
 * que se encienda de más.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SONDA = path.join(REPO, 'server', 'scripts', 'sonda-invitaciones.ts');

let hechas = 0;
const fallos: string[] = [];
function comprobar(que: string, condicion: boolean, detalle?: unknown): void {
  hechas++;
  if (condicion) return;
  fallos.push(
    `${que}${detalle === undefined ? '' : `\n      ${String(JSON.stringify(detalle)).slice(0, 240)}`}`,
  );
}
function paso(titulo: string): void {
  console.log(`\n· ${titulo}`);
}

// ---------------------------------------------------------------------------
// Dos partidas: en una está invitada Ana, en la otra no.
// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-invit-'));
const ahora = new Date().toISOString();
const CODIGO_SECRETO = 'NOSALE';

const partida = (id: string, nombre: string, correos: Array<string | undefined>) => ({
  id,
  name: nombre,
  status: 'ready',
  createdAt: ahora,
  updatedAt: ahora,
  suspects: correos.map((email, i) => ({ id: `s${i}`, name: `Persona ${i}`, email })),
  rooms: [{ id: 'r0', name: 'Salón' }],
  weapons: [{ id: 'w0', name: 'Candelabro' }],
  boardMode: 'generated',
  settings: { language: 'es' },
});

const sesion = (id: string, correos: Array<string | undefined>, fase: string) => ({
  id,
  code: id.slice(0, 5).toUpperCase(),
  phase: fase,
  round: 0,
  totalRounds: 3,
  players: correos.map((email, i) => ({
    participanteId: `s${i}`,
    displayName: `Persona ${i}`,
    email,
    joinCode: CODIGO_SECRETO,
    joined: false,
    elecciones: [],
    notas: '',
    girosRecibidos: [],
  })),
  respuestasEntregadas: [],
  tablon: [],
  rev: 1,
  updatedAt: ahora,
});

fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(dir, 'data', 'db.json'),
  JSON.stringify(
    {
      games: [
        partida('con-ana', 'La velada del jueves', ['ana@ejemplo.com', 'bruno@ejemplo.com']),
        partida('sin-ana', 'Una a la que no va', ['carla@ejemplo.com']),
        partida('terminada', 'Una que ya acabó', ['ana@ejemplo.com']),
        partida('con-relay', 'Con alias de Apple', ['abc123@privaterelay.appleid.com']),
      ],
      messages: {},
      config: { model: 'claude-fable-5' },
      live: [
        sesion('con-ana', ['ana@ejemplo.com', 'bruno@ejemplo.com'], 'lobby'),
        sesion('sin-ana', ['carla@ejemplo.com'], 'lobby'),
        sesion('terminada', ['ana@ejemplo.com'], 'desenlace'),
        sesion('con-relay', ['abc123@privaterelay.appleid.com'], 'lobby'),
      ],
      accounts: [
        {
          id: 'cta-ana',
          email: 'ana@ejemplo.com',
          displayName: 'Ana',
          createdAt: ahora,
          partidas: [],
          trofeos: [],
          correos: [
            { correo: 'ana@ejemplo.com', nivel: 'invitacion', origen: 'confirmacion', anadidoEl: ahora },
          ],
        },
      ],
    },
    null,
    2,
  ),
  'utf8',
);

type Medida = {
  crudo: string;
  invitaciones: Array<{ gameId: string; titulo: string; personaje: string; directa: boolean; paraEl: string }>;
  conBuzon: Array<{ gameId: string; directa: boolean }>;
  conRelay: number;
  relayDirecta: boolean;
  empezadaDirecta: boolean | null;
  ocupadaDirecta: boolean | null;
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
      PLAYER_TOKEN_SECRET: 'secreto-de-prueba-de-invitaciones-0123456789',
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

  paso('Se ve lo que te espera, y solo eso');
  comprobar('Ana ve una invitación', m.invitaciones.length === 1, m.invitaciones);
  comprobar('la de su partida', m.invitaciones[0]?.gameId === 'con-ana', m.invitaciones[0]);
  comprobar('con el título', m.invitaciones[0]?.titulo === 'La velada del jueves');
  comprobar('y el personaje que le toca', m.invitaciones[0]?.personaje === 'Persona 0');
  comprobar(
    'y con cuál de sus correos la han localizado, para poder decir «yo no soy»',
    m.invitaciones[0]?.paraEl === 'ana@ejemplo.com',
  );
  comprobar(
    'NO ve la partida a la que no la han invitado',
    !m.invitaciones.some((i) => i.gameId === 'sin-ana'),
  );
  comprobar(
    'ni la que ya terminó: eso es historia, no una invitación',
    !m.invitaciones.some((i) => i.gameId === 'terminada'),
  );

  paso('Entrar de un toque exige un correo verificado por un proveedor');
  comprobar(
    'con el correo solo confirmado, NO se entra directo',
    m.invitaciones[0]?.directa === false,
    m.invitaciones[0],
  );
  comprobar(
    'con el buzón verificado por un proveedor, SÍ',
    m.conBuzon.find((i) => i.gameId === 'con-ana')?.directa === true,
    m.conBuzon,
  );
  /*
    «Ocultar mi correo» de Apple entrega un alias por aplicación. Puede casar con
    una invitación —si quien organiza escribió ese alias, que es raro pero
    posible— y entonces se ve, porque es tuyo. Lo que NO puede hacer nunca es
    abrir la puerta sin código: el alias no prueba que seas la persona que quien
    organiza tenía en la cabeza, solo que controlas ese buzón de reenvío.
  */
  comprobar('un alias de Apple sí puede verse', m.conRelay === 1, m.conRelay);
  comprobar(
    'pero NUNCA entra directo, ni con el buzón verificado',
    m.relayDirecta === false,
    m.relayDirecta,
  );

  paso('Verificar el buzón NO basta: hacen falta las tres condiciones');
  comprobar(
    'con la partida ya empezada, NO se entra sin código',
    m.empezadaDirecta === false,
    m.empezadaDirecta,
  );
  comprobar(
    'con la silla ya ocupada, tampoco',
    m.ocupadaDirecta === false,
    m.ocupadaDirecta,
  );

  paso('Y lo que jamás puede salir');
  comprobar(
    'el código de invitación NO aparece en ninguna parte de la respuesta',
    !m.crudo.includes(CODIGO_SECRETO),
    m.crudo.slice(0, 200),
  );
  comprobar(
    'ni el código de la partida',
    !m.crudo.includes('CON-A'),
    m.crudo.slice(0, 200),
  );
}

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* carpeta temporal */
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. Las invitaciones avisan sin abrir puertas.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
