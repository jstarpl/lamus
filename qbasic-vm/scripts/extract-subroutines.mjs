import ts from 'typescript'
import process from 'process'
import path from 'path'
import fs from 'fs/promises'

const SOURCE_FILE_NAME = process.argv[2]
const TARGET_FILE_NAME = process.argv[3]

const VARIABLE_NAMES = ["SystemFunctions", "SystemSubroutines"]
const IGNORE_TOKENS = ["print_using"]

console.log(`Reading source file...`)

const fileNameOnly = path.basename(SOURCE_FILE_NAME)
const sourceText = await fs.readFile(SOURCE_FILE_NAME, { encoding: 'utf-8' })

console.log(`Source file read: ${fileNameOnly}`)

const sourceFile = ts.createSourceFile(fileNameOnly, sourceText, {
  languageVersion: ts.ScriptTarget.ES2022
}, undefined, ts.ScriptKind.TS)

const functionsAndSubroutines = {}

console.log(`Source file parsed`)

const CLEAN_COMMENT_REGEX = /(^\s*\/\*\*|^\s*\*(\s+|$)|^\s*\*\/\s*|^\s*\/\/\s+)/g

/**
 *
 *
 * @param {string} text
 * @return {string} 
 */
function cleanComment(text) {
  return text.split(/\r?\n/).map(line => line.replaceAll(CLEAN_COMMENT_REGEX, '').trim()).join('\n').trim()
}

const TAG_EXTRACT_REGEX = /^\s*@(\w+)($|\s+(.+)$)/i

/**
 *
 *
 * @param {string} sourceText
 * @return {{ text: string, tags: Record<string, string | string[]> }}
 */
function extractTags(sourceText) {
  /** @type {Record<string, string | string[]>} */
  const tags = {}
  const lines = sourceText.split(/\r?\n/)

  for (let i = sourceText.length - 1; i >= 0; i--) {
    if (!lines[i]) continue
    const m = TAG_EXTRACT_REGEX.exec(lines[i])
    if (m === null) break

    const key = m[1]

    let value = (!m[3]) ? true : m[3].split(/\s*,\s*/)
    if (key !== "args" && Array.isArray(value) && value.length === 1) {
      value = value[0]
    }
    if (Number.isFinite(Number.parseFloat(value))) {
      value = Number.parseFloat(value)
    }

    tags[key] = value
    lines.pop()
  }

  const text = lines.join("\n")

  return {
    text,
    tags,
  }
}

/**
 *
 *
 * @param {ts.PropertyName} propName
 * @return {string} 
 */
function propertyNameToString(propName) {
  return ts.isStringLiteral(propName) ? propName.text : propName.escapedText
}

/**
 *
 *
 * @param {ts.Expression} expr
 * @return {string | number | string[] | null}
 */
function expressionToString(expr) {
  if (ts.isStringLiteral(expr)) {
    return expr.text
  } else if (ts.isNumericLiteral(expr)) {
    return Number(expr.text)
  } else if (ts.isArrayLiteralExpression(expr)) {
    /** @type {string[]} */
    const items = []
    ts.forEachChild(expr, node0 => {
      items.push(expressionToString(node0))
    })
    return items
  } else {
    return null
  }
}

/**
 *
 *
 * @param {ts.ObjectLiteralExpression} node
 * @return {Record<string, string | string[]>} 
 */
function getSubroutineProps(node) {
  /** @type Record<string, string | string[]> */
  const props = {}

  const propsToScan = ['type', 'args', 'minArgs']

  ts.forEachChild(node, node0 => {
    if (!ts.isPropertyAssignment(node0)) return

    const propertyName = propertyNameToString(node0.name)
    if (!propsToScan.includes(propertyName)) return

    const propertyValue = expressionToString(node0.initializer)

    props[propertyName] = propertyValue
  })

  return props
}

/**
 *
 *
 * @param {string} keyName
 * @param {ts.ObjectLiteralExpression} node
 */
function findAllObjectEntries(keyName, node) {
  ts.forEachChild(node, node0 => {
    if (!ts.isPropertyAssignment(node0)) return
    
    const name = node0.name
    const propertyName = ts.isStringLiteral(name) ? name.text : name.escapedText
    if (IGNORE_TOKENS.includes(propertyName)) return
    
    const fullText = node0.getFullText(sourceFile)
    const triviaWidth = node0.getLeadingTriviaWidth(sourceFile)
    const unprocessedComment = cleanComment(fullText.substring(0, triviaWidth)) || undefined
    const { text: comment, tags } = unprocessedComment ? extractTags(unprocessedComment) : {}
    
    if (!ts.isObjectLiteralExpression(node0.initializer)) return

    const subroutineProps = getSubroutineProps(node0.initializer)
    
    if (!functionsAndSubroutines[keyName]) functionsAndSubroutines[keyName] = {}
    functionsAndSubroutines[keyName][propertyName] = {
      comment,
      ...subroutineProps,
      ...tags,
    }
  })
}

function findAllSubroutinesAndFunctions(sourceFile) {
  ts.forEachChild(sourceFile, node0 => {
    if (!ts.isVariableStatement(node0)) return
    ts.forEachChild(node0, node1 => {
      if (!ts.isVariableDeclarationList(node1)) return
      ts.forEachChild(node1, node2 => {
        if (!ts.isVariableDeclaration(node2)) return
        const identifier = node2.name
        if (!VARIABLE_NAMES.includes(identifier.escapedText)) return
        ts.forEachChild(node2, node3 => {
          if (!ts.isObjectLiteralExpression(node3)) return
          findAllObjectEntries(identifier.escapedText, node3)
        })
      })
    })
  })
}

findAllSubroutinesAndFunctions(sourceFile)

await fs.writeFile(TARGET_FILE_NAME, JSON.stringify(functionsAndSubroutines, undefined, 2))

console.log(`Written to ${path.basename(TARGET_FILE_NAME)}.`)
