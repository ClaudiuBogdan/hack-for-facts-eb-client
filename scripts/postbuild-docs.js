// Copy docs-site/build into dist/docs so the app server can serve docs under /docs.
import fs from 'fs'
import path from 'path'

const root = path.resolve(process.cwd())
const docsBuild = path.join(root, 'docs-site', 'build')
const appDist = path.join(root, 'dist')
const distDocs = path.join(appDist, 'docs')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

copyDir(docsBuild, distDocs)
console.log('Docs copied to', distDocs)

