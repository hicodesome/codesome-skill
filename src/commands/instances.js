import {
  addInstance,
  listInstances,
  removeInstance,
  resolveInstanceContext,
  switchInstance
} from '../instances/instances.js'
import { getOption, hasFlag, printJson } from '../output/format.js'

function instanceJson(instance) {
  return {
    id: instance.id,
    name: instance.name,
    base_url: instance.base_url,
    adapter: instance.adapter,
    current: Boolean(instance.current),
    trusted_at: instance.trusted_at,
    created_at: instance.created_at,
    updated_at: instance.updated_at,
    dir: instance.dir || null
  }
}

export async function handleInstance(args) {
  const subcommand = args[0]
  const json = hasFlag(args, '--json')

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printInstanceHelp()
    return
  }

  if (subcommand === 'list') {
    const result = await listInstances()
    const data = {
      current: result.current,
      items: result.items.map(instanceJson)
    }
    if (json) {
      printJson(data)
      return
    }
    for (const item of data.items) {
      console.log(`${item.current ? '*' : '-'} ${item.id}  ${item.base_url}`)
    }
    return
  }

  if (subcommand === 'current') {
    const instance = await resolveInstanceContext()
    const data = instanceJson(instance)
    if (json) {
      printJson(data)
      return
    }
    console.log(`当前实例：${data.id}`)
    console.log(`后台地址：${data.base_url}`)
    console.log(`适配器：${data.adapter}`)
    return
  }

  if (subcommand === 'add') {
    const name = args[1]
    const baseUrl = getOption(args, '--base-url')
    if (!name || !baseUrl) throw new Error('用法：codesome instance add <name> --base-url <url>')
    const instance = await addInstance(name, {
      baseUrl,
      makeCurrent: hasFlag(args, '--current')
    })
    const data = instanceJson(instance)
    if (json) {
      printJson({ added: true, instance: data })
      return
    }
    console.log(`实例已添加：${data.id}`)
    console.log(`后台地址：${data.base_url}`)
    console.log(`适配器：${data.adapter}`)
    console.log('信任方式：本机登记，无需平台审核或官方白名单')
    console.log(`下一步：codesome auth login --instance ${data.id}`)
    return
  }

  if (subcommand === 'switch') {
    const name = args[1]
    if (!name) throw new Error('用法：codesome instance switch <name>')
    const instance = await switchInstance(name)
    const data = instanceJson(instance)
    if (json) {
      printJson({ switched: true, instance: data })
      return
    }
    console.log(`当前实例已切换为：${data.id}`)
    console.log(`后台地址：${data.base_url}`)
    return
  }

  if (subcommand === 'status') {
    const name = args[1] || getOption(args, '--instance')
    const instance = await resolveInstanceContext({ instance: name })
    const data = instanceJson(instance)
    if (json) {
      printJson(data)
      return
    }
    console.log(`实例：${data.id}`)
    console.log(`当前实例：${data.current ? '是' : '否'}`)
    console.log(`后台地址：${data.base_url}`)
    console.log(`适配器：${data.adapter}`)
    if (data.dir) console.log(`目录：${data.dir}`)
    return
  }

  if (subcommand === 'remove') {
    const name = args[1]
    if (!name) throw new Error('用法：codesome instance remove <name> [--confirm]')
    const result = await removeInstance(name, { confirm: hasFlag(args, '--confirm') })
    if (json) {
      printJson(result)
      return
    }
    if (result.dry_run) {
      console.log(`实例删除预检：${result.instance.id}`)
      console.log(`后台地址：${result.instance.base_url}`)
      console.log(`目录：${result.instance.dir}`)
      console.log(`如确认删除，请重新执行：codesome instance remove ${result.instance.id} --confirm`)
      return
    }
    console.log(`实例已删除：${result.instance.id}`)
    console.log(`当前实例：${result.current}`)
    return
  }

  console.error(`未知 instance 命令：${subcommand}`)
  printInstanceHelp()
  process.exitCode = 2
}

export function printInstanceHelp() {
  console.log(`Codesome instance commands

Usage:
  codesome instance list [--json]
  codesome instance current [--json]
  codesome instance add <name> --base-url <url> [--current] [--json]
  codesome instance switch <name> [--json]
  codesome instance status [name] [--json]
  codesome instance remove <name> [--confirm] [--json]

自定义实例是本机信任登记：任意 Sub2API 兼容 HTTPS 地址都可添加，无需平台审核或官方白名单。
`)
}
