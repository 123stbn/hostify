import { Router, Request, Response } from 'express';
import { dockerClient } from '../services/docker.service.js';
import { getDeploymentState, triggerDeploy } from '../services/compose.service.js';

export const containersRouter = Router();

// Contenedores del stack
containersRouter.get('/containers', async (_req: Request, res: Response) => {
  try {
    const containers = await dockerClient.listHostifyContainers();
    res.json(containers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Acción sobre un contenedor (start / stop / restart)
containersRouter.post('/containers/:id/:action', async (req: Request, res: Response) => {
  const { id, action } = req.params;
  if (!['start', 'stop', 'restart'].includes(action)) {
    return res.status(400).json({ error: 'Acción no válida' });
  }

  try {
    await dockerClient.containerAction(id, action as any);
    res.json({ success: true, message: `Acción ${action} ejecutada sobre ${id}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logs de un contenedor
containersRouter.get('/containers/:id/logs', async (req: Request, res: Response) => {
  const { id } = req.params;
  const lines = parseInt(req.query.lines as string) || 100;
  try {
    const logs = await dockerClient.getContainerLogs(id, lines);
    res.json({ id, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logs e Historial de despliegue general de la suite
containersRouter.get('/compose/status', (_req: Request, res: Response) => {
  res.json(getDeploymentState());
});

// Desplegar / Iniciar el stack completo seleccionado manualmente
containersRouter.post('/compose/deploy', async (_req: Request, res: Response) => {
  if (!dockerClient.isAvailable()) {
    return res.status(400).json({ error: 'Docker Engine está apagado. Inicie Docker Desktop o Colima.' });
  }

  const deploymentState = getDeploymentState();
  if (deploymentState.isDeploying) {
    return res.status(409).json({ error: 'Ya hay un despliegue en progreso' });
  }

  const started = triggerDeploy();
  if (!started) {
    return res.status(500).json({ error: 'No se pudo iniciar el despliegue' });
  }

  res.json({ success: true, message: 'Despliegue iniciado en segundo plano' });
});
