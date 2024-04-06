import VMInfo from '@lamus/qbasic-vm/allCommands.json' assert { type: 'json' }
import Handlebars from 'handlebars'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

Handlebars.registerHelper('keys', function (obj) {
  if (typeof obj === "object" && !Array.isArray(obj)) {
    return Object.keys(obj)
  }
  return []
})

Handlebars.registerHelper('join', function (...arrs) {
  let result = []
  for (const arr of arrs) {
    result = result.concat(arr)
  }
  return result
})

Handlebars.registerHelper('sort', function (arr) {
  return arr.sort((a, b) => b.length - a.length)
})

Handlebars.registerHelper('toTokens', function (array) {
  if (Array.isArray(array)) {
    return array.map((item) => `"${item}"`).join(" | ")
  }
  return "()"
})

const file = await fs.readFile(path.join(dirname, "../src/CodeEditor/extensions/qbasic-lang/syntax.grammar.tpl"), { encoding: 'utf-8' })
const template = Handlebars.compile(file, {
  noEscape: true
})

await fs.writeFile(path.join(dirname, '../src/CodeEditor/extensions/qbasic-lang/syntax.grammar'), template(VMInfo), {
  encoding: 'utf-8'
})
