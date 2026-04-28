import readline from 'node:readline'

export function canPrompt() {
  return Boolean(process.stdin.isTTY && process.stderr.isTTY)
}

export function promptText(question) {
  if (!canPrompt()) throw new Error('当前不是交互终端，请使用 --password-stdin 或改用 codesome auth login --browser。')
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export function promptPassword(question) {
  if (!canPrompt()) throw new Error('当前不是交互终端，请使用 --password-stdin 或改用 codesome auth login --browser。')
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr, terminal: true })
    rl.stdoutMuted = true
    rl._writeToOutput = function writeToOutput(text) {
      if (!rl.stdoutMuted) rl.output.write(text)
    }
    process.stderr.write(question)
    rl.question('', (answer) => {
      rl.close()
      process.stderr.write('\n')
      resolve(answer)
    })
  })
}

export function readStdinSecret() {
  return new Promise((resolve, reject) => {
    let value = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (chunk) => {
      value += chunk
    })
    process.stdin.on('error', reject)
    process.stdin.on('end', () => {
      resolve(value.replace(/\r?\n$/, ''))
    })
  })
}
