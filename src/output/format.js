export function printJson(value) {
  console.log(JSON.stringify(value, null, 2))
}

export function hasFlag(args, flag) {
  return args.includes(flag)
}

export function getOption(args, name) {
  const prefix = `${name}=`
  const inline = args.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = args.indexOf(name)
  if (index >= 0 && index + 1 < args.length) return args[index + 1]
  return undefined
}
