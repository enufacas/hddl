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
import { handleGenerateScenario } from './scenario-generator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Trust first proxy for accurate client IP in rate limiting
const PORT = process.env.PORT || 3000;

// Abuse protection: Request size limit (1MB max)
app.use(express.json({ limit: '1mb' }));

// Abuse protection: Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 20;

function rateLimit(req, res, next) {
  const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  
  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, []);
  }
  
  const timestamps = rateLimitMap.get(clientId);
  // Remove timestamps outside the window
  const validTimestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      limit: MAX_REQUESTS_PER_WINDOW,
      window: '1 hour',
      retryAfter: Math.ceil((validTimestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
    });
  }
  
  validTimestamps.push(now);
  rateLimitMap.set(clientId, validTimestamps);
  
  // Cleanup old entries periodically
  if (Math.random() < 0.01) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.length === 0 || now - times[times.length - 1] > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  next();
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',           // Vite dev server
    'https://enufacas.github.io'       // GitHub Pages (update with your domain)
  ]
}));

// Apply rate limiting to generation endpoints only (not health check)
app.use('/generate', rateLimit);
app.use('/generate-scenario', rateLimit);

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
    
    // Input validation
    if (!scenario) {
      return res.status(400).json({ error: 'Missing required field: scenario' });
    }
    
    if (typeof scenario !== 'string' || scenario.length > 200) {
      return res.status(400).json({ error: 'Invalid scenario name (max 200 characters)' });
    }
    
    // Sanitize input (prevent path traversal)
    if (scenario.includes('..') || scenario.includes('/') || scenario.includes('\\')) {
      return res.status(400).json({ error: 'Invalid characters in scenario name' });
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

// Generate scenario endpoint
app.post('/generate-scenario', handleGenerateScenario);

// Start server
app.listen(PORT, () => {
  console.log(`Narrative Generation API running on port ${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/health`);
  console.log(`  List scenarios: http://localhost:${PORT}/scenarios`);
  console.log(`  Generate narrative: POST http://localhost:${PORT}/generate`);
  console.log(`  Generate scenario: POST http://localhost:${PORT}/generate-scenario`);
  console.log(`\nExample requests:`);
  console.log(`  # Generate narrative`);
  console.log(`  curl -X POST http://localhost:${PORT}/generate \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"scenario":"insurance-underwriting"}'`);
  console.log(`\n  # Generate new scenario`);
  console.log(`  curl -X POST http://localhost:${PORT}/generate-scenario \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"prompt":"Insurance agent learning bundle discount approval","domain":"insurance"}'`);
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
