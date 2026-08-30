/**
 * Iniciar sesión con Google y con Apple, comprobado sin tener cuenta en ninguno.
 *
 *   npm run verify:proveedores
 *
 * LO QUE MÁS IMPORTA DE TODO ESTO es lo que NO puede pasar: que dos personas
 * acaben compartiendo cuenta. La tentación de fusionar es enorme y suena
 * razonable —«el correo está verificado y coincide, pues es suya»—, pero esa
 * cuenta pudo nacer del correo que TECLEÓ QUIEN ORGANIZA, con su errata o su
 * dirección reutilizada. Y la fusión no se deshace: `partidas` es un array
 * plano, así que el día que una de las dos personas ejerza su derecho de
 * supresión se llevaría por delante el historial de la otra, y el comprobador
 * diría que todo fue bien.
 *
 * Por eso la mitad de las comprobaciones de aquí son de la forma «esto NO
 * ocurre», que son las que de verdad hay que escribir.
 *
 * AISLAMIENTO. Proceso aparte, cwd temporal, entorno explícito.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const TSX = path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SONDA = path.join(REPO, 'server', 'scripts', 'sonda-proveedores.ts');

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
// Se siembra una cuenta creada por el CAMINO DEL CONSENTIMIENTO, con historial.
// Es la que un inicio de sesión con Google jamás puede adoptar.
// ---------------------------------------------------------------------------

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-prov-'));
const ahora = new Date().toISOString();
fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
fs.writeFileSync(
  path.join(dir, 'data', 'db.json'),
  JSON.stringify(
    {
      games: [],
      messages: {},
      config: { model: 'claude-fable-5' },
      live: [],
      accounts: [
        {
          id: 'cta-sembrada',
          email: 'ana@ejemplo.com',
          displayName: 'Ana (del consentimiento)',
          createdAt: ahora,
          partidas: [
            {
              gameId: 'vieja',
              titulo: 'Una velada de antes',
              personaje: 'Ana Escarlata',
              jugadaEl: ahora,
              acerto: true,
              gano: true,
              eraElSenalado: false,
            },
          ],
          trofeos: ['primera-partida'],
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
  primera: { id: string; email: string; nombre: string };
  mismaCuenta: boolean;
  noAdopta: {
    sembradaSigue: boolean;
    cuentaDeGoogleEsOtra: boolean;
    historialDeGoogleVacio: boolean;
    historialSembradoIntacto: number;
  };
  appleSegundaVez: { mismaCuenta: boolean; conservaCorreo: boolean; conservaNombre: boolean };
  vinculo: { proveedores: string[]; cortaSesiones: boolean };
  fusionAjena: string;
  brunoIntacto: boolean;
  tallerSinLista: boolean | null;
  tallerFueraDeLista: boolean | null;
  tallerEnLista: boolean | null;
  tallerSinVerificar: boolean;
  puertaJugador: boolean;
  puertaAdmitida: boolean;
  puertaFantasma: boolean;
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
      PLAYER_TOKEN_SECRET: 'secreto-de-prueba-de-proveedores-0123456789',
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

  paso('Entrar con un proveedor');
  comprobar('la primera vez crea cuenta', Boolean(m.primera?.id), m.primera);
  comprobar('con su correo y su nombre', m.primera?.email === 'ana@ejemplo.com' && m.primera?.nombre === 'Ana', m.primera);
  comprobar('volver a entrar recupera LA MISMA, no crea otra', m.mismaCuenta, m.mismaCuenta);

  paso('Y NUNCA adopta una cuenta por coincidencia de correo');
  /*
    Es la comprobación central del fichero. Si esto se rompe, alguien que se
    registre con el correo que otra persona tenía apuntado en una velada se
    queda con su historial, sus trofeos y su derecho a borrarlo.
  */
  comprobar('la cuenta del consentimiento sigue existiendo', m.noAdopta.sembradaSigue, m.noAdopta);
  comprobar('la de Google es OTRA', m.noAdopta.cuentaDeGoogleEsOtra, m.noAdopta);
  comprobar('y nace con el historial vacío', m.noAdopta.historialDeGoogleVacio, m.noAdopta);
  comprobar(
    'el historial de la sembrada queda intacto',
    m.noAdopta.historialSembradoIntacto === 1,
    m.noAdopta,
  );

  paso('Apple no manda correo ni nombre a partir de la segunda vez');
  comprobar('sigue siendo la misma cuenta', m.appleSegundaVez.mismaCuenta, m.appleSegundaVez);
  comprobar('y NO se pierde el correo de la primera', m.appleSegundaVez.conservaCorreo, m.appleSegundaVez);
  comprobar('ni el nombre', m.appleSegundaVez.conservaNombre, m.appleSegundaVez);

  paso('Vincular un segundo proveedor, desde dentro');
  comprobar(
    'la cuenta acaba con las dos identidades',
    JSON.stringify(m.vinculo.proveedores) === JSON.stringify(['apple', 'google']),
    m.vinculo,
  );
  comprobar(
    'y vincular corta las sesiones anteriores',
    m.vinculo.cortaSesiones,
    m.vinculo,
  );

  paso('Una identidad que ya es de otro NO se roba');
  comprobar('se rechaza con un conflicto', m.fusionAjena === 'rechazada', m.fusionAjena);
  comprobar('y la cuenta ajena sigue intacta', m.brunoIntacto, m.brunoIntacto);

  paso('El taller solo se abre a quien esté en la lista');
  comprobar('sin lista, ninguna cuenta de proveedor entra', m.tallerSinLista === false, m.tallerSinLista);
  comprobar('fuera de la lista, tampoco', m.tallerFueraDeLista === false, m.tallerFueraDeLista);
  comprobar('en la lista, sí (y sin importar mayúsculas)', m.tallerEnLista === true, m.tallerEnLista);
  comprobar(
    'pero un correo SIN verificar no abre el taller ni estando en la lista',
    m.tallerSinVerificar === false,
    m.tallerSinVerificar,
  );

  paso('Y el GUARDIÁN aplica esa regla, que no es lo mismo');
  /*
    Aquí es donde falló de verdad. La regla de arriba estuvo bien escrita desde
    el principio y el taller seguía abierto, porque el guardián no la llamaba:
    le bastaba con que la firma del pasaporte fuera válida. Y ese pasaporte lo
    tiene cualquiera que inicie sesión con su Google en la app del jugador, así
    que un invitado podía pedir `/api/games/<id>` y leer la solución del caso al
    que estaba invitado.

    Comprobar la regla y no la puerta es exactamente lo que dejó pasar el fallo.
  */
  comprobar(
    'el pasaporte de quien juega NO abre el taller',
    m.puertaJugador === false,
    m.puertaJugador,
  );
  comprobar('el de una cuenta admitida SÍ', m.puertaAdmitida === true, m.puertaAdmitida);
  comprobar(
    'y el de una cuenta que ya no existe, tampoco',
    m.puertaFantasma === false,
    m.puertaFantasma,
  );
}

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* carpeta temporal */
}

console.log('');
if (fallos.length === 0) {
  console.log(`✔ ${hechas} comprobaciones. Dos personas nunca acaban compartiendo cuenta.`);
  process.exit(0);
}
console.log(`✘ ${fallos.length} de ${hechas} comprobaciones han fallado:\n`);
for (const f of fallos) console.log(`   · ${f}`);
process.exit(1);
