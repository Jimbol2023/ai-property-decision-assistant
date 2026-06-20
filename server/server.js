import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import propertyRoutes from './routes/propertyRoutes.js';

dotenv.config();

const app = express();
const preferredPort = Number(process.env.PORT) || 5000;
const fallbackPorts = preferredPort === 5000 ? [5000, 5001, 5002, 5003] : [preferredPort];
const defaultClientOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
];
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim())
  : defaultClientOrigins;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'ai-property-decision-assistant' });
});

app.use('/api', propertyRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : 'Unexpected server error',
    errors: error.errors
  });
});

function listenOnAvailablePort(ports) {
  const [port, ...remainingPorts] = ports;
  const server = app.listen(port, () => {
    console.log(`Property decision API listening on http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && remainingPorts.length > 0) {
      console.warn(`Port ${port} is already in use. Trying ${remainingPorts[0]}...`);
      server.close(() => listenOnAvailablePort(remainingPorts));
      return;
    }

    if (error.code === 'EADDRINUSE') {
      console.error(`Ports ${fallbackPorts.join(', ')} are unavailable. Stop another server or set PORT to an open port.`);
      process.exit(1);
    }

    throw error;
  });
}

listenOnAvailablePort(fallbackPorts);
