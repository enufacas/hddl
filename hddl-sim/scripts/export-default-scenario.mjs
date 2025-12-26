import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDefaultScenario } from '../src/sim/scenario-default-simplified.js'
import { exportScenarioJson } from '../src/sim/scenario-schema.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outPath = path.join(root, 'src', 'sim', 'scenarios', 'default.scenario.json')

const scenario = createDefaultScenario()
const jsonText = exportScenarioJson(scenario, { pretty: true })

await fs.mkdir(path.dirname(outPath), { recursive: true })
await fs.writeFile(outPath, jsonText + '\n', 'utf8')

console.log(`Wrote ${outPath}`)
