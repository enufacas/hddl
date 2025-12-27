import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseScenarioJson } from '../src/sim/scenario-schema.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scenariosDir = path.join(root, 'src', 'sim', 'scenarios')

async function main() {
  let entries
  try {
    entries = await fs.readdir(scenariosDir, { withFileTypes: true })
  } catch {
    console.error(`No scenarios directory found at ${scenariosDir}`)
    process.exitCode = 1
    return
  }

  const files = entries
    .filter(e => e.isFile())
    .map(e => e.name)
    .filter(name => name.endsWith('.scenario.json'))
    .sort()

  if (!files.length) {
    console.error(`No *.scenario.json files found in ${scenariosDir}`)
    process.exitCode = 1
    return
  }

  let hadErrors = false

  for (const name of files) {
    const filePath = path.join(scenariosDir, name)
    const raw = await fs.readFile(filePath, 'utf8')
    const report = parseScenarioJson(raw)

    if (!report.ok) {
      hadErrors = true
      console.error(`\n[FAIL] ${name}`)
      for (const e of report.errors ?? []) console.error(`  - ${e}`)
      continue
    }

    if ((report.warnings ?? []).length) {
      console.warn(`\n[WARN] ${name}`)
      for (const w of report.warnings) console.warn(`  - ${w}`)
    } else {
      console.log(`[OK] ${name}`)
    }
  }

  if (hadErrors) process.exitCode = 1
}

await main()
