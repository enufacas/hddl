#!/usr/bin/env node

/**
 * Narrative Generation API Server
 * 
 * Simple HTTP server that wraps narrative-generator.mjs for Cloud Run deployment.
 * Runs locally for development, deploys to Cloud Run for production.
 * 
 * Usage:
 *   npm run api:dev          # Local development (port 3000)
 *   npm run api:start        # Production mode
 */

import express from 'express';
import cors from 'cors';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateNarrative } from './narrative-generator-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',           // Vite dev server
    'https://enufacas.github.io'       // GitHub Pages (update with your domain)
  ]
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List available scenarios
app.get('/scenarios', async (req, res) => {
  try {
    const scenariosPath = join(__dirname, '..', 'src', 'sim', 'scenarios');
    const fs = await import('fs/promises');
    const files = await fs.readdir(scenariosPath);
    const scenarios = files
      .filter(f => f.endsWith('.scenario.json'))
      .map(f => f.replace('.scenario.json', ''));
    
    res.json({ scenarios });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate narrative endpoint
app.post('/generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { scenario, fullContext = true } = req.body;
    
    if (!scenario) {
      return res.status(400).json({ error: 'Missing required field: scenario' });
    }
    
    console.log(`[${new Date().toISOString()}] Generating narrative for: ${scenario}`);
    
    // Load scenario
    const scenarioPath = join(__dirname, '..', 'src', 'sim', 'scenarios', `${scenario}.scenario.json`);
    const scenarioData = JSON.parse(await readFile(scenarioPath, 'utf-8'));
    
    // Generate narrative
    const result = await generateNarrative(scenarioData, { fullContext });
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Completed in ${duration}ms - ${result.citations.length} citations, cost: $${result.metadata.cost}`);
    
    res.json({
      ...result,
      metadata: {
        ...result.metadata,
        duration
      }
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: `Scenario not found: ${req.body.scenario}` });
    }
    
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Narrative Generation API running on port ${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log(`  List scenarios: http://localhost:${PORT}/scenarios`);
  console.log(`  Generate: POST http://localhost:${PORT}/generate`);
  console.log(`\nExample request:`);
  console.log(`  curl -X POST http://localhost:${PORT}/generate \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"scenario":"insurance-underwriting"}'`);
}).on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
