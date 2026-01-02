/**
 * Test script for scenario generation API
 */

const testPrompt = "Insurance agent learning bundle discount approval and escalating unusual commercial policy";
const testDomain = "insurance";

const requestBody = JSON.stringify({
  prompt: testPrompt,
  domain: testDomain
});

console.log('Testing scenario generation API...');
console.log(`Prompt: "${testPrompt}"`);
console.log(`Domain: ${testDomain}`);
console.log('');

// Note: Origin validation disabled for local testing (NODE_ENV=production in container)
// For testing, we need to provide an origin header
fetch('http://localhost:8080/generate-scenario', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Origin': 'http://localhost:5173'  // Vite dev server origin for local testing
  },
  body: requestBody
})
  .then(response => {
    console.log(`Status: ${response.status} ${response.statusText}`);
    return response.json();
  })
  .then(data => {
    if (data.error) {
      console.error('Error:', data.error);
      if (data.hint) console.error('Hint:', data.hint);
      process.exit(1);
    }
    
    console.log('\nGenerated Scenario:');
    console.log(`  ID: ${data.scenario.id}`);
    console.log(`  Title: ${data.scenario.title}`);
    console.log(`  Events: ${data.meta.eventCount}`);
    console.log(`  Agents: ${data.meta.agentCount}`);
    console.log(`  Envelopes: ${data.meta.envelopeCount}`);
    console.log(`  Warnings: ${data.warnings.length}`);
    
    if (data.warnings.length > 0) {
      console.log('\nValidation Warnings:');
      data.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    console.log('\n=== ENVELOPES ===');
    data.scenario.envelopes.forEach(env => {
      console.log(`\n${env.name} (${env.envelopeId})`);
      console.log(`  Owner: ${env.ownerRole}`);
      console.log(`  Assumptions: ${env.assumptions.join(', ')}`);
      console.log(`  Constraints: ${env.constraints.join(', ')}`);
    });
    
    console.log('\n=== AGENTS ===');
    data.scenario.fleets.forEach(fleet => {
      console.log(`\nFleet (Steward: ${fleet.stewardRole})`);
      fleet.agents.forEach(agent => {
        console.log(`  - ${agent.name} (${agent.role})`);
      });
    });
    
    console.log('\n=== SAMPLE EVENTS (showing narrative coherence) ===');
    data.scenario.events.forEach((e, i) => {
      if (i < 8 || i >= data.scenario.events.length - 3) {
        console.log(`\n[${e.hour}h] ${e.type.toUpperCase()}`);
        if (e.actorName) console.log(`  Actor: ${e.actorName}`);
        if (e.summary) console.log(`  Summary: ${e.summary}`);
        if (e.queryText) console.log(`  Query: ${e.queryText}`);
        if (e.semanticContext) console.log(`  Context: ${e.semanticContext}`);
        if (e.boundary_reason) console.log(`  Reason: ${e.boundary_reason}`);
        if (e.nextAssumptions) console.log(`  New assumptions: ${e.nextAssumptions.join('; ')}`);
      } else if (i === 8) {
        console.log(`\n... (${data.scenario.events.length - 11} middle events omitted)`);
      }
    });
    
    console.log('\n✓ Scenario generation successful!');
  })
  .catch(error => {
    console.error('Request failed:', error.message);
    process.exit(1);
  });
