/**
 * Rutas de configuración global.
 *   GET /config → AppConfig (modelo activo, catálogo, hasApiKey, storage)
 *   PUT /config → cambia el modelo activo y devuelve la AppConfig resultante
 */
import type { AppConfig } from '../../../shared/types';
import { DEMO_MODE, MODEL_OPTIONS, isModelId } from '../config';
import { getStorageKind, getStore } from '../db/store';
import { identidadDeTaller } from '../auth';
import { crearRouter } from '../rutas';

const router = crearRouter();

async function buildConfig(): Promise<AppConfig> {
  return {
    model: await getStore().getConfigModel(),
    models: MODEL_OPTIONS,
    hasApiKey: !DEMO_MODE,
    storage: getStorageKind(),
  };
}

router.get('/config', async (_req, res) => {
  try {
    res.json(await buildConfig());
  } catch (err) {
    console.error('[config] Error al leer la configuración:', err);
    res.status(500).json({ error: 'No se pudo leer la configuración.' });
  }
});

router.put('/config', async (req, res) => {
  try {
    /*
     * El modelo es GLOBAL de la instancia y lo paga quien tiene la clave de
     * API. Cuando cada Game Master entre con su cuenta, no puede ser que
     * cualquiera de ellos cambie el modelo de todos los demás: eso se decide
     * con la llave de la casa, o siendo alguien a quien se le ha dado el
     * permiso expresamente.
     */
    const quien = identidadDeTaller(req);
    if (quien?.tipo === 'cuenta') {
      const cuenta = await getStore().getAccount(quien.cuentaId);
      if (!cuenta?.taller) {
        res.status(403).json({
          error: 'El modelo lo decide quien administra esta instalación.',
        });
        return;
      }
    }
    const model = (req.body as { model?: unknown } | undefined)?.model;
    if (!isModelId(model)) {
      res.status(400).json({
        error: 'Modelo no válido. Elige uno de la lista de modelos disponibles.',
      });
      return;
    }
    await getStore().setConfigModel(model);
    res.json(await buildConfig());
  } catch (err) {
    console.error('[config] Error al guardar la configuración:', err);
    res.status(500).json({ error: 'No se pudo guardar la configuración.' });
  }
});

export default router;
