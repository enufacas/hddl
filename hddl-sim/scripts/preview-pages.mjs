import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

const repoBase = '/hddl'
const distDir = path.resolve(__dirname, '..', 'dist')
const indexHtml = path.join(distDir, 'index.html')

app.use(repoBase, express.static(distDir))

// GitHub Pages SPA fallback behavior: unknown paths under /hddl/ load index.html
app.get(`${repoBase}/*`, (req, res) => {
  res.sendFile(indexHtml)
})

const port = Number(process.env.PORT || 4174)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`GitHub Pages-style preview: http://localhost:${port}${repoBase}/`)
})
