const fs = require('fs')

const source = fs.readFileSync('src/auth/browser.js', 'utf8')

const checks = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'process.platform === \'darwin\'',
  'MACOS_BROWSER_CANDIDATES'
]

const missing = checks.filter((item) => !source.includes(item))
const result = {
  macos_chrome_candidate: !missing.includes(checks[0]),
  macos_edge_candidate: !missing.includes(checks[1]),
  darwin_branch: !missing.includes(checks[2]),
  macos_candidate_list: !missing.includes(checks[3])
}

console.log(JSON.stringify(result))
if (missing.length) process.exit(1)
