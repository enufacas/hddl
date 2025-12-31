/**
 * Narrative Generator Library
 * 
 * Core generation logic for API server.
 * Handles Vertex AI communication and narrative generation.
 */

import { VertexAI } from '@google-cloud/vertexai';
import { analyzeScenario, buildNarrativePrompt, parseCitations } from '../analysis/narrative-generator.mjs';

/**
 * Generate narrative from scenario data
 * 
 * @param {Object} scenario - Scenario JSON data
 * @param {Object} options - Generation options
 * @param {boolean} options.fullContext - Include full scenario JSON in prompt
 * @returns {Promise<Object>} { markdown, citations, metadata }
 */
export async function generateNarrative(scenario, options = {}) {
  const fullContext = options.fullContext ?? true;
  const userAddendum = options.userAddendum ?? '';
  
  // Analyze scenario structure (uses function from narrative-generator.mjs)
  const analysis = analyzeScenario(scenario);
  
  // Generate with LLM
  const project = process.env.GOOGLE_CLOUD_PROJECT || 'hddl-narrative-gen';
  
  const vertexAI = new VertexAI({ 
    project, 
    location: 'global',
    apiEndpoint: 'aiplatform.googleapis.com'
  });
  
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
      topP: 0.9,
    },
  });
  
  // Build prompt (uses function from narrative-generator.mjs)
  const prompt = buildNarrativePrompt(analysis, scenario, fullContext, userAddendum);
  const result = await model.generateContent(prompt);
  const markdown = result.response.candidates[0].content.parts[0].text;
  
  // Parse citations (uses function from narrative-generator.mjs)
  const citations = parseCitations(markdown, scenario);
  
  // Build metadata
  const metadata = {
    model: 'gemini-3-flash-preview',
    method: fullContext ? 'llm-full-context' : 'llm-summarized',
    tokensIn: 0,
    tokensOut: 0,
    cost: 0,
    generatedAt: new Date().toISOString()
  };
  
  if (result.response.usageMetadata) {
    const { promptTokenCount, candidatesTokenCount } = result.response.usageMetadata;
    const inputCost = (promptTokenCount * 0.50 / 1_000_000);
    const outputCost = (candidatesTokenCount * 3.00 / 1_000_000);
    
    metadata.tokensIn = promptTokenCount;
    metadata.tokensOut = candidatesTokenCount;
    metadata.cost = parseFloat((inputCost + outputCost).toFixed(6));
  }
  
  return {
    markdown,
    citations,
    metadata
  };
}
