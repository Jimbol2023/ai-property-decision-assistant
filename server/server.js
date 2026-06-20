import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import propertyRoutes from './routes/propertyRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'ai-property-decision-assistant' });
});

app.use('/api', propertyRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Unexpected server error' });
});

app.listen(port, () => {
  console.log(`Property decision API listening on http://localhost:${port}`);
});
