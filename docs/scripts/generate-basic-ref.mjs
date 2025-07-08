import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import copy from 'recursive-copy'
import { rimraf } from 'rimraf'

const groupProps = {
  'audio': {
    title: 'Audio',
    description: 'These commands allow to produce both synthesized music as well as pre-recorded audio.',
  },
  'arrays': {
    title: 'Arrays',
    description: 'These commands allow modify and inspect Arrays and Array-like variables.',
  },
  'files': {
    title: 'Files',
    description: 'These commands allow operations on the File System, like creating, reading and writing files or listing files in a directory.',
  },
  'graphics': {
    title: 'Graphics',
    description: 'Commands for printing text and drawing on the screen.',
  },
  'mouse': {
    title: 'Mouse',
    description: 'Commands to interface with a mouse pointer'
  },
  'math': {
    title: 'Math',
    description: 'Mathematical operations.',
  },
  'others': {
    title: 'Others',
    description: 'Assorted commands and utilities.',
  },
  'strings': {
    title: 'Strings',
    description: 'Commands for use with String variables.',
  },
  'system': {
    title: 'System',
    description: 'Commands to interface with the Computer itself.',
  },
}

const commandReference = JSON.parse(await fs.readFile(new URL("../../qbasic-vm/dist/allCommands.json", import.meta.url)))
const basicReference = new URL("../docs/basic-reference/", import.meta.url)

const basicReferencePath = fileURLToPath(basicReference)

const groupedCommands = {}

function sanitizeMdText(text) {
  return text.replace(/([$])/gi, '\\$1')
}

function sanitizeUrl(url) {
  return url.replace(/([\W])/gi, (found) => `_u${found.charCodeAt(0)}`)
}

await rimraf([`${basicReferencePath}/**/*`], {
  glob: true,
})

Object.values(commandReference).forEach(
  (commands) => Object.entries(commands).forEach(
    ([commandName, commandProps]) => {
      const group = commandProps.group ?? 'others'

      groupedCommands[group] = groupedCommands[group] ?? []

      groupedCommands[group].push({ name: commandName, ...commandProps })
    }))

Object.values(groupedCommands).forEach(
  (commands) => commands.sort((a, b) => a.name.localeCompare(b.name)))

/** Create command group pages */
{
  await Promise.allSettled(Object.entries(groupedCommands).map(async ([groupName, commands]) => {
    const body = commands.map((commandProps) => {
      return `## ${commandProps.name} {#${sanitizeUrl(commandProps.name)}}\n` +
        '\n' +
        (commandProps.args?.length ? ` * Arguments: ` + commandProps.args.map((arg) => (`\`${arg}\``)).join(', ') + '  \n' : 'No arguments\n') +
        (commandProps.minArgs ? ` * Minimum arguments: ${commandProps.minArgs}\n` : '') +
        (commandProps.type ? ` * Return Type: \`${commandProps.type}\`\n` : '') +
        '\n\n' +
        (commandProps.comment ?? '') +
        '\n'
    }).join('\n')
    const headerStr = groupProps[groupName]?.title ?? groupName

    let frontMatter = ''

    if (groupProps[groupName]?.frontMatter) {
      frontMatter = '---\n' +
                    Object.entries(groupProps[groupName]?.frontMatter).map(([key, value]) => `${key}: ${value}`).join('\n')
                    '---\n\n'
    }

    const header = `# ${headerStr}` + '\n\n'

    const preface = groupProps[groupName]?.description ? groupProps[groupName]?.description + '\n\n' : '' 

    const allText = header + preface + body

    const targetUrl = new URL(`${groupName}.md`, basicReference)

    await fs.writeFile(targetUrl, allText, {
      encoding: 'utf-8'
    })
  }))
}

/** Create command index */
{
  const header = `# Command Index\n\n`

  const allCommands = []

  Object.entries(groupedCommands).forEach(([groupName, commands]) => {
    commands.forEach((commandProps) => {
      allCommands.push({
        name: commandProps.name,
        group: groupName
      })
    })
  })

  allCommands.sort((a, b) => a.name.localeCompare(b.name))

  const targetUrl = new URL(`alphabetical-index.md`, basicReference)

  const body = allCommands.map((commandProps) => ` * [${sanitizeMdText(commandProps.name)}](${commandProps.group}.md#${sanitizeUrl(commandProps.name)})`).join('\n') + '\n'

  const allText = header + body

  await fs.writeFile(targetUrl, allText, {
    encoding: 'utf8'
  })
}

/** Copy the static files over */
{
  const staticAssets = new URL("./static/", import.meta.url)

  const staticAssetsPath = fileURLToPath(staticAssets)
  const basicReferencePath = fileURLToPath(basicReference)
  await copy(staticAssetsPath, basicReferencePath)
}

