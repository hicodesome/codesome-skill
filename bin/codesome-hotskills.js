#!/usr/bin/env node
import { main } from '../src/cli.js'

if (process.stdout.setDefaultEncoding) process.stdout.setDefaultEncoding('utf8')
if (process.stderr.setDefaultEncoding) process.stderr.setDefaultEncoding('utf8')

main(['hotskills', ...process.argv.slice(2)]).catch((error) => {
  const message = error && typeof error.message === 'string' ? error.message : String(error)
  console.error(`Error: ${message}`)
  process.exitCode = 1
})
