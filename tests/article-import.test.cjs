const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')
const ts = require('typescript')

const pages = [
  'Little you\nlittle wonder',
  'Little wish\ngentle thunder',
  'You are mighty\nyou are small',
  'You are ours\nafter all',
  'Little star\nwith little wings',
  'Let’s all dance\nlet’s all sing',
  'You are life\nand breath adored',
]

// Exercise the real creation handler; stub auth/database and defer translation
// so these checks never write remote data or call the AI service.
function handler({ signedIn = true } = {}) {
  const inserted = []
  const deferred = []
  const updates = []
  const source = fs.readFileSync(path.join(__dirname, '../src/app/api/articles/route.ts'), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    Buffer,
    process: { env: { OPENAI_API_KEY: 'local-test-only' } },
    fetch: async (_url, options) => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: `[translation] ${JSON.parse(options.body).messages[1].content}` } }] }),
    }),
    console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (name === 'next/server') {
        return { NextResponse: Response, after: callback => deferred.push(callback) }
      }
      if (name === '@/lib/supabase/server') {
        return {
          createRouteClient: async () => ({
            auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'test-user' } : null } }) },
            from(table) {
              assert.equal(table, 'articles')
              return {
                update(row) {
                  updates.push(row)
                  return { eq: async () => ({ error: null }) }
                },
                insert(row) {
                  inserted.push(row)
                  return {
                    select: () => ({ single: async () => ({ data: { id: 'test-article' }, error: null }) }),
                  }
                },
              }
            },
          }),
        }
      }
      if (name === '@/lib/async/pool') return { mapWithConcurrency: async (values, _limit, worker) => Promise.all(values.map(worker)) }
      return require(name)
    },
  })
  return { post: exports.POST, inserted, deferred, updates }
}

function request(body) {
  return new Request('http://localhost/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('photo book keeps all seven pages and their verse lines in order', async () => {
  const route = handler()
  const response = await route.post(request({
    title: 'Little You', content: pages.join('\r\n\r\n'), preserveParagraphs: true,
  }))
  assert.equal(response.status, 200)
  assert.deepEqual(Array.from(route.inserted[0].original_content), pages)
  assert.equal(route.deferred.length, 1)
})

test('existing text imports keep line-by-line behavior', async () => {
  const route = handler()
  const response = await route.post(request({ title: 'Little You', content: pages.join('\n\n') }))
  assert.equal(response.status, 200)
  assert.deepEqual(Array.from(route.inserted[0].original_content), pages.flatMap(page => page.split('\n')))
})

test('invalid paragraph option cannot create an article', async () => {
  const route = handler()
  const response = await route.post(request({ title: 'Little You', content: pages[0], preserveParagraphs: 'true' }))
  assert.equal(response.status, 400)
  assert.equal(route.inserted.length, 0)
})

test('an unsigned-in request cannot create an article', async () => {
  const route = handler({ signedIn: false })
  const response = await route.post(request({ title: 'Little You', content: pages.join('\n\n'), preserveParagraphs: true }))
  assert.equal(response.status, 401)
  assert.equal(route.inserted.length, 0)
})

const image = 'data:image/jpeg;base64,/9j/2Q=='

test('photo imports save each JPEG with its text, including a blank page', async () => {
  const route = handler()
  const sourcePages = [{ text: pages[0], image }, { text: '', image }, { text: pages[1], image }]
  const response = await route.post(request({ title: 'Little You', content: pages.join('\n\n'), pages: sourcePages }))
  assert.equal(response.status, 200)
  assert.deepEqual(JSON.parse(JSON.stringify(route.inserted[0].original_content)), sourcePages)
  assert.equal(route.deferred.length, 1)
  await route.deferred[0]()
  assert.equal(route.updates[0].status, 'ready')
  assert.deepEqual(Array.from(route.updates[0].translated_content), [`[translation] ${pages[0]}`, '', `[translation] ${pages[1]}`])
})

test('photo imports reject remote image URLs and empty books before saving', async () => {
  for (const sourcePages of [[{ text: pages[0], image: 'https://example.com/page.jpg' }], [{ text: '', image }]]) {
    const route = handler()
    const response = await route.post(request({ title: 'Book', content: 'Book', pages: sourcePages }))
    assert.equal(response.status, 400)
    assert.equal(route.inserted.length, 0)
  }
})

test('photo imports reject more than ten pages or an oversized image payload', async () => {
  const route = handler()
  const response = await route.post(request({ title: 'Book', content: 'Book', pages: Array(11).fill({text: 'Page', image}) }))
  assert.equal(response.status, 400)
  assert.equal(route.inserted.length, 0)
  const largeImage = 'data:image/jpeg;base64,' + 'A'.repeat(1_900_000)
  const tooLarge = await route.post(request({ title: 'Book', content: 'Book', pages: [{text: 'One',image:largeImage},{text:'Two',image:largeImage}] }))
  assert.equal(tooLarge.status, 413)
  assert.equal(route.inserted.length, 0)
})
