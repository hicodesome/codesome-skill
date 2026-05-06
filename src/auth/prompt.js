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

export function formatPasswordPrompt(question) {
  const label = String(question || '密码').trim().replace(/[：:]\s*$/, '')
  return `${label}（输入时不会显示，输完回车）：`
}

export function promptPassword(question) {
  if (!canPrompt()) throw new Error('当前不是交互终端，请使用 --password-stdin 或改用 codesome auth login --browser。')
  const prompt = formatPasswordPrompt(question)

  if (!process.stdin.setRawMode) {
    return new Promise((resolve) => {
      process.stderr.write(prompt)
      const rl = readline.createInterface({ input: process.stdin, output: process.stderr, terminal: true })
      rl.question('', (answer) => {
        rl.close()
        process.stderr.write('\n')
        resolve(answer)
      })
      rl._writeToOutput = function writeToOutput() {}
    })
  }

  return new Promise((resolve, reject) => {
    let value = ''
    const stdin = process.stdin
    const wasRaw = stdin.isRaw

    function cleanup() {
      stdin.off('data', onData)
      stdin.off('error', onError)
      stdin.setRawMode(Boolean(wasRaw))
      stdin.pause()
    }

    function finish() {
      cleanup()
      process.stderr.write('\n')
      resolve(value)
    }

    function onError(error) {
      cleanup()
      reject(error)
    }

    function onData(chunk) {
      const text = chunk.toString('utf8')
      for (const char of text) {
        if (char === '\u0003') {
          cleanup()
          process.stderr.write('\n')
          reject(new Error('已取消密码输入。'))
          return
        }
        if (char === '\r' || char === '\n') {
          finish()
          return
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1)
          continue
        }
        value += char
      }
    }

    process.stderr.write(prompt)
    stdin.setEncoding('utf8')
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('data', onData)
    stdin.on('error', onError)
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
