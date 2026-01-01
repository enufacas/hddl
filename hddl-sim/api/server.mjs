#!/usr/bin/env node

/**
 * Narrative Generation API Server
 * 
 * REST API for generating HDDL narratives from scenario JSON.
 * Designed for Cloud Run deployment with local Docker testing support.
 * 
 * Usage:
 *   docker build -t narrative-api .
 *   docker run -p 8080:8080 narrative-api
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateNarrative } from './narrative-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Cloud Run load balancer)
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',           // Vite dev server
    'https://enufacas.github.io'       // GitHub Pages
  ]
}));
app.use(express.json());

// Origin validation: Only allow requests from GitHub Pages
// Prevents direct API access via curl/Postman/scripts
const validateOrigin = (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer;
  
  // Allow localhost for local testing
  if (process.env.NODE_ENV === 'development' && origin?.includes('localhost')) {
    return next();
  }
  
  if (!origin) {
    console.warn('Blocked request: No origin header');
    return res.status(403).json({ error: 'Access denied: No origin header' });
  }
  
  try {
    const originUrl = new URL(origin);
    const isAllowed = originUrl.href.startsWith('https://enufacas.github.io');
    
    if (!isAllowed) {
      console.warn(`Blocked request from: ${originUrl.origin}`);
      return res.status(403).json({ 
        error: 'Access denied: Invalid origin'
      });
    }
    
    next();
  } catch (err) {
    console.warn('Blocked request: Invalid origin format');
    return res.status(403).json({ error: 'Access denied: Invalid origin' });
  }
};

// Rate limiting: 20 requests per hour per IP
// Generous for demo use, but prevents script abuse
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour per instance
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Rate limit reached',
    limit: '20 narratives per hour',
    note: 'This is a demo API for HDDL narrative generation.',
    retryAfter: 3600
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List available scenarios
app.get('/scenarios', async (req, res) => {
  try {
    // Path from api/ to src/sim/scenarios/
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

// Generate narrative endpoint (with origin validation and rate limiting)
app.post('/generate', validateOrigin, limiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { scenario, fullContext = true, userAddendum: rawUserAddendum = '' } = req.body;
    const userAddendum = (typeof rawUserAddendum === 'string' ? rawUserAddendum : '')
      .replace(/\u0000/g, '')
      .slice(0, 4000);
    
    if (!scenario) {
      return res.status(400).json({ error: 'Missing required field: scenario' });
    }
    
    console.log(`[${new Date().toISOString()}] Generating narrative for: ${scenario}`);
    if (userAddendum) {
      // Log the prompt (truncated to avoid massive logs)
      console.log(`[${new Date().toISOString()}] Prompt: ${userAddendum.slice(0, 500).replace(/\n/g, ' ')}${userAddendum.length > 500 ? '...' : ''}`);
    }
    
    // Load scenario - path from api/ to src/sim/scenarios/
    const scenarioPath = join(__dirname, '..', 'src', 'sim', 'scenarios', `${scenario}.scenario.json`);
    const scenarioData = JSON.parse(await readFile(scenarioPath, 'utf-8'));
    
    // Generate narrative
    const result = await generateNarrative(scenarioData, { fullContext, userAddendum });
    
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Completed in ${duration}ms - ${result.citations.length} citations, cost: $${result.metadata.cost}`);
    
    if (result.narrative) {
      // Log a preview of the generated narrative
      console.log(`[${new Date().toISOString()}] Response: ${result.narrative.slice(0, 200).replace(/\n/g, ' ')}...`);
    }

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
