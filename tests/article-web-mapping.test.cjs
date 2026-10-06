const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../src/lib/data/types.ts'), 'utf8')
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const exportsObject = {}
vm.runInNewContext(compiled, {exports:exportsObject,require:()=>({toGenerationStatus:status=>status})})

test('web reader receives strings for both legacy articles and photographed pages', () => {
  for (const original of [['First','Second'],[{text:'First',image:'data:image/jpeg;base64,/9j/2Q=='},{text:'Second',image:'data:image/jpeg;base64,/9j/2Q=='}]]) {
    const mapped = exportsObject.mapArticleDetail({original_content:original,translated_content:['一','二']})
    assert.deepEqual(Array.from(mapped.originalContent),['First','Second'])
    assert.deepEqual(Array.from(mapped.translatedContent),['一','二'])
  }
})
