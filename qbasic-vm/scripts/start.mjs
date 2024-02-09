import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import * as esbuild from 'esbuild'

function locateFile(paths, url) {
  for (const pathOption of paths) {
    const filePath = path.join(pathOption, url)
    const exists = fs.existsSync(filePath)
    if (exists) return filePath
  }
  return false
}

const ctx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  outdir: 'dist/'
})

ctx.watch()
const { host, port } = await ctx.serve({
  servedir: 'dist/'
})

const REDIRECTS = {
  '/': '/index.html'
}

const PUBLIC_DIRS = [ 'demo',  'assets' ]

http.createServer((req, res) => {
  const targetUrl = req.url
  if (REDIRECTS[targetUrl]) {
    const redirectedTarget = REDIRECTS[targetUrl]
    res.writeHead(302, {
      location: redirectedTarget
    }).end()
    return
  }

  const options = {
    hostname: host,
    port: port,
    path: targetUrl,
    method: req.method,
    headers: req.headers,
  }

  // Forward each incoming request to esbuild
  const proxyReq = http.request(options, proxyRes => {
    // If esbuild returns anything other than "not found", send that
    if (proxyRes.statusCode !== 404) {
      res.writeHead(proxyRes.statusCode, proxyRes.headers)
      proxyRes.pipe(res, { end: true })
      return
    }

    // Otherwise, try to find a file in the demo folder to send
    const filePath = locateFile(PUBLIC_DIRS, targetUrl)
    if (filePath === false) {
      res.writeHead(404).end()
      return
    }

    const stream = fs.createReadStream(filePath)
    res.writeHead(200)
    stream.pipe(res, { end: true })
  })

  // Forward the body of the request to esbuild
  req.pipe(proxyReq, { end: true })
}).listen(4000)
