#!/usr/bin/env node

/**
 * test-vertex-ai.mjs
 * 
 * Tests Google Cloud Vertex AI connection and configuration.
 * Run this before using LLM-powered narrative generation.
 * 
 * Usage: node analysis/test-vertex-ai.mjs
 */

import { VertexAI } from '@google-cloud/vertexai';

// ============================================================================
// Configuration Check
// ============================================================================

function checkEnvironment() {
  console.log('Checking environment configuration...\n');
  
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  console.log(`  GOOGLE_CLOUD_PROJECT: ${project || '❌ NOT SET'}`);
  console.log(`  GOOGLE_CLOUD_LOCATION: ${location}`);
  console.log(`  GOOGLE_APPLICATION_CREDENTIALS: ${credentials || '(using gcloud auth)'}`);
  console.log();
  
  if (!project) {
    console.error('❌ Error: GOOGLE_CLOUD_PROJECT environment variable not set');
    console.error('\nSet it with:');
    console.error('  PowerShell: $env:GOOGLE_CLOUD_PROJECT="your-project-id"');
    console.error('  Bash: export GOOGLE_CLOUD_PROJECT="your-project-id"');
    console.error('\nSee analysis/VERTEX_AI_SETUP.md for full instructions.');
    process.exit(1);
  }
  
  console.log('✓ Environment variables configured\n');
  return { project, location };
}

// ============================================================================
// Vertex AI Client Test
// ============================================================================

async function testVertexAI({ project, location }) {
  try {
    console.log('Initializing Vertex AI client...\n');
    
    const vertexAI = new VertexAI({
      project,
      location
    });
    
    console.log('✓ Vertex AI client initialized\n');
    
    // Initialize Gemini model
    console.log('Loading Gemini 2.0 Flash model...\n');
    
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        topP: 0.9,
      },
    });
    
    console.log('✓ Model loaded\n');
    
    // Send test prompt
    console.log('Sending test prompt...\n');
    
    const prompt = `Write a 2-sentence summary of how AI governance works in insurance underwriting. 
Focus on the balance between automated decisions and human oversight.`;
    
    const result = await model.generateContent(prompt);
    const response = result.response.candidates[0].content.parts[0].text;
    
    console.log('✓ Test prompt generated successfully\n');
    console.log('Response:');
    console.log('─'.repeat(80));
    console.log(response.trim());
    console.log('─'.repeat(80));
    console.log();
    
    // Usage metadata
    if (result.response.usageMetadata) {
      const { promptTokenCount, candidatesTokenCount, totalTokenCount } = result.response.usageMetadata;
      console.log('Usage:');
      console.log(`  Input tokens: ${promptTokenCount}`);
      console.log(`  Output tokens: ${candidatesTokenCount}`);
      console.log(`  Total tokens: ${totalTokenCount}`);
      console.log(`  Estimated cost: $${((promptTokenCount * 0.075 + candidatesTokenCount * 0.30) / 1_000_000).toFixed(6)}`);
      console.log();
    }
    
    console.log('✅ Setup complete! Vertex AI is working correctly.\n');
    console.log('Next steps:');
    console.log('  1. Generate narrative: node analysis/narrative-generator.mjs insurance-underwriting --method llm');
    console.log('  2. See analysis/VERTEX_AI_SETUP.md for more options');
    
  } catch (error) {
    console.error('\n❌ Error testing Vertex AI:\n');
    
    if (error.message.includes('could not be found')) {
      console.error('Project not found or invalid project ID.');
      console.error('Check your GOOGLE_CLOUD_PROJECT environment variable.');
    } else if (error.message.includes('not been used')) {
      console.error('Vertex AI API not enabled for this project.');
      console.error('\nEnable it at:');
      console.error(`  https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=${project}`);
    } else if (error.message.includes('Could not load the default credentials')) {
      console.error('Authentication failed.');
      console.error('\nRun: gcloud auth application-default login');
      console.error('Or set GOOGLE_APPLICATION_CREDENTIALS to your service account key.');
    } else if (error.message.includes('permission')) {
      console.error('Permission denied.');
      console.error('\nEnsure your account has the "Vertex AI User" role.');
      console.error(`  https://console.cloud.google.com/iam-admin/iam?project=${project}`);
    } else {
      console.error(error.message);
      console.error('\nFull error:');
      console.error(error);
    }
    
    console.error('\nSee analysis/VERTEX_AI_SETUP.md for troubleshooting.');
    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('Vertex AI Connection Test');
  console.log('='.repeat(80) + '\n');
  
  const config = checkEnvironment();
  await testVertexAI(config);
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
