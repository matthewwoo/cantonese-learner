const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

function handler(responsePages, { signedIn = true } = {}) {
  const calls = []
  const source = fs.readFileSync(path.join(__dirname, '../src/app/api/articles/ocr/route.ts'), 'utf8')
  const exports = {}
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(compiled, {
    exports, process: {env:{OPENAI_API_KEY:'local-test-only'}},
    console: {log(){},warn(){},error(){}},
    require(name) {
      if (name === 'next/server') return {NextResponse:Response}
      if (name === '@/lib/supabase/server') return {createRouteClient:async()=>({auth:{getUser:async()=>({data:{user:signedIn?{id:'test-user'}:null}})}})}
      if (name === 'openai') return {default:class {
        chat = {completions:{create:async input=>{
          calls.push(input)
          return {choices:[{message:{content:JSON.stringify({title:'Book',pages:responsePages})}}]}
        }}}
      }}
      return require(name)
    },
  })
  return {post:exports.POST,calls}
}

function request(images) {
  return new Request('http://localhost/api/articles/ocr', {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({images}),
  })
}

test('OCR returns exactly one ordered passage per photo, preserving blank pages', async () => {
  const pages = ['Little you\nlittle wonder','','Little wish\ngentle thunder']
  const route = handler(pages)
  const response = await route.post(request(['one','two','three']))
  assert.equal(response.status,200)
  assert.deepEqual((await response.json()).pages,pages)
  assert.equal(route.calls.length,1)
  const images = route.calls[0].messages[1].content.slice(1)
  assert.deepEqual(Array.from(images,x=>x.image_url.url),['data:image/jpeg;base64,one','data:image/jpeg;base64,two','data:image/jpeg;base64,three'])
})

test('OCR cannot shift photo alignment by returning too few pages', async () => {
  const route = handler(['merged page'])
  const response = await route.post(request(['one','two']))
  assert.equal(response.status,502)
  assert.equal(route.calls.length,3)
})

test('OCR rejects unauthenticated and excessive-photo requests without calling AI', async () => {
  const unsigned = handler(['text'],{signedIn:false})
  assert.equal((await unsigned.post(request(['one']))).status,401)
  assert.equal(unsigned.calls.length,0)
  const route = handler(['text'])
  assert.equal((await route.post(request(Array(11).fill('photo')))).status,400)
  assert.equal(route.calls.length,0)
})
