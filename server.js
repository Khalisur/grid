/* eslint-disable prettier/prettier */
/* eslint-disable no-undef */
import express from 'express';
import jsonServer from 'json-server';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Create the JSON Server API
const apiRouter = jsonServer.router('db.json');
const apiMiddlewares = jsonServer.defaults();

// Use JSON Server for the /api routes
app.use('/api', apiMiddlewares, jsonServer.bodyParser, apiRouter);

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, 'dist')));

// Handle any requests that don't match the ones above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 