import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

const steps = [
  { name: 'validate:canon', script: 'validate-canon-registry.mjs' },
  { name: 'validate:scenarios', script: 'validate-scenarios.mjs' },
  { name: 'validate:closed-loops', script: 'validate-closed-loops.mjs' },
]

for (const step of steps) {
  const res = spawnSync(process.execPath, [path.join(scriptsDir, step.script)], {
    stdio: 'inherit',
  })
  if (res.status !== 0) {
    process.exitCode = res.status ?? 1
    break
  }
}
