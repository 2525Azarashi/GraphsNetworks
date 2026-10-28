// Static build for Vercel / any static host: copies public/ and writes index.html (+ 404.html) from the shared shell.
import { cpSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { shell } from '../src/shell.js'
const out = 'out'
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync('public', out, { recursive: true })
writeFileSync(`${out}/index.html`, shell)
writeFileSync(`${out}/404.html`, shell)
console.log('static build → ./out')
