const { spawn } = require('child_process')
const assert = require('assert')

const childScript = [
  'import { promptPassword } from "./src/auth/prompt.js";',
  'const value = await promptPassword("Codesome 密码：");',
  'console.log("VALUE_LENGTH=" + value.length);',
  'console.log("VALUE_MATCH=" + (value === "secret-pass"));'
].join(' ')

const command = `${JSON.stringify(process.execPath)} --input-type=module -e ${JSON.stringify(childScript)}`
const child = spawn('script', ['-q', '-e', '-c', command, '/dev/null'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
})

let stdout = ''
let stderr = ''

child.stdout.setEncoding('utf8')
child.stderr.setEncoding('utf8')
child.stdout.on('data', (chunk) => { stdout += chunk })
child.stderr.on('data', (chunk) => { stderr += chunk })

setTimeout(() => {
  child.stdin.write('secret-pass\n')
}, 100)

const timer = setTimeout(() => {
  child.kill('SIGTERM')
}, 5000)

child.on('close', (code) => {
  clearTimeout(timer)
  try {
    assert.strictEqual(code, 0, `child exited ${code}\nstdout=${stdout}\nstderr=${stderr}`)
    const output = `${stdout}\n${stderr}`
    assert.match(output, /Codesome 密码（输入时不会显示，输完回车）：/, 'password prompt was not visible')
    assert(!output.includes('secret-pass'), 'password was echoed to terminal output')
    assert.match(stdout, /VALUE_LENGTH=11/, 'password value length mismatch')
    assert.match(stdout, /VALUE_MATCH=true/, 'password value mismatch')
    console.log(JSON.stringify({ ok: true, checked: ['visible-password-prompt', 'no-password-echo', 'password-value'] }))
  } catch (error) {
    console.error(error.stack || error.message)
    process.exitCode = 1
  }
})
