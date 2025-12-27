import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function normalizeRel(rel) {
  return rel.replace(/\\/g, '/').trim()
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const repoRoot = path.resolve(root, '..')
  const canonPath = path.join(repoRoot, 'docs', 'Canon_Registry.md')

  const md = await fs.readFile(canonPath, 'utf8')

  // Pull list-style entries like:
  // - foundations/HDDL_System_Overview.md
  const lines = md.split(/\r?\n/)
  const entries = []

  for (const line of lines) {
    const m = /^-\s+([^#].*?)\s*$/.exec(line)
    if (!m) continue
    const value = m[1]

    // Ignore explicit non-canon headings.
    if (/^\*\*/.test(value)) continue

    // Stop if it's clearly prose.
    if (!/\.md$/.test(value) && !/\.html$/.test(value)) continue

    entries.push(normalizeRel(value))
  }

  if (!entries.length) {
    console.error('No canon entries found in docs/Canon_Registry.md')
    process.exitCode = 1
    return
  }

  const missing = []
  for (const rel of entries) {
    const full = path.join(repoRoot, 'docs', rel)
    if (!(await exists(full))) missing.push(rel)
  }

  if (missing.length) {
    console.error('\n[FAIL] Missing Canon Registry targets:')
    for (const rel of missing) console.error(`  - docs/${rel}`)
    process.exitCode = 1
    return
  }

  console.log(`[OK] Canon Registry validated (${entries.length} entries)`) 
}

await main()
