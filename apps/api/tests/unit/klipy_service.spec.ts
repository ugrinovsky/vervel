import { test } from '@japa/runner'
import KlipyService from '#services/KlipyService'

function sampleItem(id: string) {
  return {
    id,
    title: 't',
    file: {
      xs: {
        jpg: {
          url: `https://media.klipy.com/thumb/${id}.jpg`,
          width: 160,
          height: 120,
        },
      },
      hd: { gif: { url: `https://media.klipy.com/media/${id}/hd.gif` } },
      gif: { url: `https://media.klipy.com/media/${id}/std.gif` },
    },
  }
}

test.group('KlipyService (fetch замокан, getApiKey — заглушка)', (group) => {
  const origFetch = global.fetch
  let origGetApiKey: typeof KlipyService.getApiKey

  group.setup(() => {
    origGetApiKey = KlipyService.getApiKey
    ;(KlipyService as unknown as { getApiKey: () => string | undefined }).getApiKey = () =>
      'unit-test-klipy-key'
  })

  group.teardown(() => {
    global.fetch = origFetch
    ;(KlipyService as unknown as { getApiKey: typeof origGetApiKey }).getApiKey = origGetApiKey
  })

  group.each.setup(() => {
    global.fetch = origFetch
    KlipyService.clearCaches()
  })

  test('search: KLIPY URL, per_page + page, парсит data.data', async ({ assert }) => {
    global.fetch = async (input: unknown) => {
      const u = String(input)
      assert.include(u, 'https://api.klipy.com/api/v1/')
      assert.include(u, encodeURIComponent('unit-test-klipy-key'))
      assert.include(u, '/gifs/search')
      assert.include(u, 'per_page=10')
      assert.include(u, 'page=1')
      assert.include(u, 'q=')
      assert.include(u, encodeURIComponent('привет'))
      return new Response(
        JSON.stringify({
          result: true,
          data: {
            data: [sampleItem('a'), sampleItem('b')],
            has_next: true,
            per_page: 10,
            current_page: 1,
          },
        }),
        { status: 200 }
      )
    }
    const { items, nextOffset } = await KlipyService.search('привет', 0, 10, 'gif')
    assert.lengthOf(items, 2)
    assert.equal(items[0].id, 'a')
    assert.equal(items[0].url, 'https://media.klipy.com/media/a/hd.gif')
    assert.equal(items[0].previewUrl, 'https://media.klipy.com/thumb/a.jpg')
    assert.equal(items[0].previewWidth, 160)
    assert.equal(items[0].previewHeight, 120)
    assert.equal(nextOffset, 2)
  })

  test('search: offset>0 → page 2', async ({ assert }) => {
    global.fetch = async (input: unknown) => {
      assert.include(String(input), 'page=2')
      assert.include(String(input), 'per_page=10')
      return new Response(
        JSON.stringify({
          data: { data: [sampleItem('x')], has_next: false, per_page: 10, current_page: 2 },
        }),
        { status: 200 }
      )
    }
    const { items, nextOffset } = await KlipyService.search('q', 10, 10, 'gif')
    assert.lengthOf(items, 1)
    assert.isNull(nextOffset)
  })

  test('search kind=sticker → /stickers/search', async ({ assert }) => {
    global.fetch = async (input: unknown) => {
      assert.include(String(input), '/stickers/search')
      return new Response(
        JSON.stringify({ data: { data: [], has_next: false, per_page: 5, current_page: 1 } }),
        { status: 200 }
      )
    }
    const { items, nextOffset } = await KlipyService.search('x', 0, 5, 'sticker')
    assert.lengthOf(items, 0)
    assert.isNull(nextOffset)
  })

  test('trending → /gifs/trending', async ({ assert }) => {
    global.fetch = async (input: unknown) => {
      assert.include(String(input), '/gifs/trending')
      assert.include(String(input), 'per_page=20')
      return new Response(
        JSON.stringify({
          data: { data: [sampleItem('t1')], has_next: false, per_page: 20, current_page: 1 },
        }),
        { status: 200 }
      )
    }
    const { items } = await KlipyService.trending(0, 20, 'gif')
    assert.lengthOf(items, 1)
    assert.equal(items[0].id, 't1')
  })

  test('categoryGifs кодирует сегменты пути', async ({ assert }) => {
    global.fetch = async (input: unknown) => {
      const s = String(input)
      assert.include(s, '/gifs/categories/')
      assert.include(s, encodeURIComponent('cat a'))
      assert.include(s, encodeURIComponent('tag b'))
      return new Response(
        JSON.stringify({
          data: {
            data: [sampleItem('c1')],
            has_next: false,
            per_page: 24,
            current_page: 1,
          },
        }),
        { status: 200 }
      )
    }
    const { items } = await KlipyService.categoryGifs('gif', 'cat a', 'tag b', 0, 24)
    assert.lengthOf(items, 1)
  })

  test('listCategories gif: запрос к /gifs/categories', async ({ assert }) => {
    let calls = 0
    global.fetch = async (input: unknown) => {
      calls++
      assert.include(String(input), '/gifs/categories')
      assert.notInclude(String(input), '/stickers/')
      return new Response(
        JSON.stringify({
          data: [
            {
              name: 'Animals',
              name_encoded: 'animals',
              subcategories: [],
              gif: sampleItem('preview'),
            },
            {
              name: 'Food',
              name_encoded: 'food-and-drink',
              subcategories: [{ name: 'Coffee', name_encoded: 'coffee' }],
              gif: sampleItem('food'),
            },
          ],
        }),
        { status: 200 }
      )
    }
    const rows = await KlipyService.listCategories('gif')
    assert.equal(calls, 1)
    assert.lengthOf(rows, 2)
    assert.equal(rows[0].name_encoded, 'animals')
    assert.isNull(rows[0].defaultTagEncoded)
    assert.equal(rows[0].categoryPreviewUrl, 'https://media.klipy.com/thumb/preview.jpg')
    assert.equal(rows[1].defaultTagEncoded, 'coffee')
    assert.equal(rows[1].categoryPreviewUrl, 'https://media.klipy.com/thumb/food.jpg')
  })

  test('listCategories sticker: при ошибке API — пустой список', async ({ assert }) => {
    let calls = 0
    global.fetch = async (input: unknown) => {
      calls++
      assert.include(String(input), '/stickers/categories')
      return new Response('not found', { status: 404 })
    }
    const rows = await KlipyService.listCategories('sticker')
    assert.equal(calls, 1)
    assert.lengthOf(rows, 0)
  })

  test('categoryGifs sticker: при ошибке пути — fallback на stickers/search', async ({
    assert,
  }) => {
    let calls = 0
    global.fetch = async (input: unknown) => {
      calls++
      const s = String(input)
      if (calls === 1) {
        assert.include(s, '/stickers/categories/')
        return new Response('nf', { status: 404 })
      }
      assert.include(s, '/stickers/search')
      return new Response(
        JSON.stringify({
          data: { data: [sampleItem('s1')], has_next: false, per_page: 24, current_page: 1 },
        }),
        { status: 200 }
      )
    }
    const { items } = await KlipyService.categoryGifs('sticker', 'actions', 'cooking', 0, 24)
    assert.equal(calls, 2)
    assert.lengthOf(items, 1)
    assert.equal(items[0].id, 's1')
  })

  test('search бросает при HTTP !== 200', async ({ assert }) => {
    global.fetch = async () => new Response('err', { status: 500 })
    await assert.rejects(() => KlipyService.search('q', 0, 5, 'gif'))
  })

  test('search: result:false от API — явная ошибка, не пустой items', async ({ assert }) => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          result: false,
          errors: { message: ['invalid key'] },
        }),
        { status: 200 }
      )
    await assert.rejects(() => KlipyService.search('q', 0, 5, 'gif'))
  })

  test('search: http:// в URL и плоское дерево url — парсится (fallback)', async ({ assert }) => {
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          data: {
            data: [
              {
                id: 'alt1',
                files: {
                  thumb: { url: 'http://media.example.com/t.jpg', width: 100, height: 80 },
                  full: { url: 'http://media.example.com/x.gif' },
                },
              },
            ],
            has_next: false,
            per_page: '24',
            current_page: 1,
          },
        }),
        { status: 200 }
      )
    const { items } = await KlipyService.search('q', 0, 24, 'gif')
    assert.lengthOf(items, 1)
    assert.equal(items[0].previewUrl, 'http://media.example.com/t.jpg')
    assert.equal(items[0].url, 'http://media.example.com/x.gif')
  })
})
