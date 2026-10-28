import { Hono } from 'hono'
import { shell } from './shell.js'

const app = new Hono()



app.get('/', (c) => c.html(shell))
for (const p of ['/lec/*', '/map', '/words']) app.get(p, (c) => c.html(shell))

export default app
