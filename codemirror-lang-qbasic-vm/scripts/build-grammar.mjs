import VMInfo from '@lamus/qbasic-vm/allCommands.json' assert { type: 'json' }
import Handlebars from 'handlebars'
import fs from 'fs/promises'

Handlebars.registerHelper('keys', function (obj) {
  if (typeof obj === "object" && !Array.isArray(obj)) {
    return Object.keys(obj)
  }
  return []
})

Handlebars.registerHelper('tokens', function (array) {
  if (Array.isArray(array)) {
    return array.map((item) => `"${item}"`).join(" | ")
  }
  return "()"
})

const file = await fs.readFile("../src/syntax.grammar.tpl", { encoding: 'utf-8' })
const template = Handlebars.compile(file, {
  noEscape: true
})

await fs.writeFile('../src/syntax.grammar', template(VMInfo), {
  encoding: 'utf-8'
})
