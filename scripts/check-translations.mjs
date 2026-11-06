#!/usr/bin/env node
// Lists text passed to t('...') that a translation doesn't cover yet, and translations no longer
// used. Run with: npm run i18n:check
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'src')
const used = new Set()

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'i18n' && entry.name !== 'test') walk(full)
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
      const source = ts.createSourceFile(full, fs.readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true, full.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      const visit = (node) => {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 't' && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) used.add(node.arguments[0].text)
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
}
walk(root)

let problems = 0
for (const file of fs.readdirSync(path.join(root, 'i18n')).filter(name => /^[a-z]{2}(-[A-Z][a-z]{3})?\.ts$/.test(name))) {
  const text = fs.readFileSync(path.join(root, 'i18n', file), 'utf8')
  const catalog = new Set([...text.matchAll(/^ {2}'((?:[^'\\]|\\.)*)':/gm)].map(match => match[1].replace(/\\(.)/g, '$1')))
  const missing = [...used].filter(key => !catalog.has(key))
  console.log(`${file}: ${catalog.size} translations, ${missing.length} missing`)
  for (const key of missing) console.log(`  missing: ${key}`)
  problems += missing.length
}
// Text shown through a variable, like column names, isn't found here and is listed in the catalogs by hand.
process.exitCode = problems ? 1 : 0
