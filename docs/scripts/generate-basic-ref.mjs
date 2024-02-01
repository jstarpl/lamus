import fs from 'node:fs/promises'

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

const groupedCommands = {}

function sanitizeMdText(text) {
  return text.replace(/([$])/gi, '\\$1')
}

function sanitizeUrl(url) {
  return url.replace(/([\W])/gi, (found) => `_u${found.charCodeAt(0)}`)
}

Object.values(commandReference).forEach(
  (commands) => Object.entries(commands).forEach(
    ([commandName, commandProps]) => {
      const group = commandProps.group ?? 'others'

      groupedCommands[group] = groupedCommands[group] ?? []

      groupedCommands[group].push({ name: commandName, ...commandProps })
    }))

Object.values(groupedCommands).forEach(
  (commands) => commands.sort((a, b) => a.name.localeCompare(b.name)))

{
  await Promise.allSettled(Object.entries(groupedCommands).map(async ([groupName, commands]) => {
    const body = commands.map((commandProps) => {
      return `## ${commandProps.name}<a id="${sanitizeUrl(commandProps.name)}"></a>\n` +
        '\n' +
        (commandProps.type ? `Return Type: \`${commandProps.type}\`  ` : '') +
        '\n' +
        (commandProps.args?.length ? `Arguments: ` + commandProps.args.map((arg) => (`\`${arg}\``)).join(', ') + '  ' : 'No arguments  ') +
        '\n' +
        (commandProps.minArgs ? `Minimum arguments: ${commandProps.minArgs}  ` : '') +
        '\n\n' +
        (commandProps.comment ?? '') +
        '\n'
    }).join('\n')
    const headerStr = groupProps[groupName]?.title ?? groupName

    const header = `# ${headerStr}` + '\n\n'

    const preface = groupProps[groupName]?.description ? groupProps[groupName]?.description + '\n\n' : '' 

    const allText = header + preface + body

    const targetUrl = new URL(`${groupName}.md`, basicReference)

    fs.writeFile(targetUrl, allText, {
      encoding: 'utf-8'
    })
  }))
}

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

  const targetUrl = new URL(`alphabetic-index.md`, basicReference)

  const body = allCommands.map((commandProps) => ` * [${sanitizeMdText(commandProps.name)}](${commandProps.group}.md#${sanitizeUrl(commandProps.name)})`).join('\n') + '\n'

  const allText = header + body

  fs.writeFile(targetUrl, allText, {
    encoding: 'utf8'
  })
}

