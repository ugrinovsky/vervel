import { test } from '@japa/runner'
import GiphyService from '#services/GiphyService'

function sampleGif(id: string) {
  return {
    id,
    images: {
      fixed_height_small: {
        url: `https://media.giphy.com/media/${id}/s.gif`,
        width: '160',
        height: '120',
      },
      downsized: { url: `https://media.giphy.com/media/${id}/giphy.gif` },
    },
  }
}

test.group('GiphyService (fetch замокан, getApiKey — заглушка)', (group) => {
  const origFetch = global.fetch
  let origGetApiKey: typeof GiphyService.getApiKey

  group.setup(() => {
    origGetApiKey = GiphyService.getApiKey
    ;(GiphyService as unknown as { getApiKey: () => string | undefined }).getApiKey = () =>
      'unit-test-giphy-key'
  })

  group.teardown(() => {
    global.fetch = origFetch
    ;(GiphyService as unknown as { getApiKey: typeof origGetApiKey }).getApiKey = origGetApiKey
  })

  group.each.setup(() => {
    global.fetch = origFetch
    GiphyService.clearCaches()
  })

  test('search: парсит data, url из downsized', async ({ assert }) => {
    global.fetch = async (input: RequestInfo | URL) => {
      const u = String(input)
      assert.include(u, 'api.giphy.com/v1/gifs/search')
      assert.include(u, 'q=')
      assert.include(u, encodeURIComponent('привет'))
      return new Response(
        JSON.stringify({
          data: [sampleGif('a'), sampleGif('b')],
          pagination: { count: 2, offset: 0, total_count: 10 },
        }),
        { status: 200 }
      )
    }
    const { items, nextOffset } = await GiphyService.search('привет', 0, 10, 'gif')
    assert.lengthOf(items, 2)
    assert.equal(items[0].id, 'a')
    assert.equal(items[0].url, 'https://media.giphy.com/media/a/giphy.gif')
    assert.equal(items[0].previewWidth, 160)
    assert.equal(items[0].previewHeight, 120)
    assert.equal(nextOffset, 2)
  })

  test('search: previewWidth/Height из original, если у fixed_height_small нет width/height', async ({
    assert,
  }) => {
    const gifNoSmallDims = {
      id: 'x',
      images: {
        fixed_height_small: {
          url: 'https://media.giphy.com/media/x/s.gif',
        },
        downsized: { url: 'https://media.giphy.com/media/x/giphy.gif' },
        original: {
          url: 'https://media.giphy.com/media/x/giphy.gif',
          width: '480',
          height: '270',
        },
      },
    }
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [gifNoSmallDims],
          pagination: { count: 1, offset: 0, total_count: 1 },
        }),
        { status: 200 }
      )
    const { items } = await GiphyService.search('q', 0, 10, 'gif')
    assert.lengthOf(items, 1)
    assert.equal(items[0].previewWidth, 480)
    assert.equal(items[0].previewHeight, 270)
  })

  test('search kind=sticker → /v1/stickers/search', async ({ assert }) => {
    global.fetch = async (input: RequestInfo | URL) => {
      assert.include(String(input), '/v1/stickers/search')
      return new Response(
        JSON.stringify({
          data: [],
          pagination: { count: 0, offset: 0, total_count: 0 },
        }),
        { status: 200 }
      )
    }
    const { items, nextOffset } = await GiphyService.search('x', 0, 5, 'sticker')
    assert.lengthOf(items, 0)
    assert.isNull(nextOffset)
  })

  test('trending kind=sticker → /v1/stickers/trending', async ({ assert }) => {
    global.fetch = async (input: RequestInfo | URL) => {
      assert.include(String(input), '/v1/stickers/trending')
      return new Response(
        JSON.stringify({
          data: [sampleGif('t1')],
          pagination: { count: 1, offset: 0, total_count: 1 },
        }),
        { status: 200 }
      )
    }
    const { items } = await GiphyService.trending(0, 20, 'sticker')
    assert.lengthOf(items, 1)
    assert.equal(items[0].id, 't1')
  })

  test('categoryGifs кодирует сегменты пути', async ({ assert }) => {
    global.fetch = async (input: RequestInfo | URL) => {
      const s = String(input)
      assert.include(s, '/v1/gifs/categories/')
      assert.include(s, encodeURIComponent('cat a'))
      assert.include(s, encodeURIComponent('tag b'))
      return new Response(
        JSON.stringify({
          data: [sampleGif('c1')],
          pagination: { count: 1, offset: 0, total_count: 5 },
        }),
        { status: 200 }
      )
    }
    const { items } = await GiphyService.categoryGifs('gif', 'cat a', 'tag b', 0, 24)
    assert.lengthOf(items, 1)
  })

  test('listCategories gif: один запрос к /v1/gifs/categories', async ({ assert }) => {
    let calls = 0
    global.fetch = async (input: RequestInfo | URL) => {
      calls++
      assert.include(String(input), '/v1/gifs/categories')
      assert.notInclude(String(input), '/stickers/')
      return new Response(
        JSON.stringify({
          data: [
            {
              name: 'Animals',
              name_encoded: 'animals',
              subcategories: [],
              gif: sampleGif('preview'),
            },
            {
              name: 'Food',
              name_encoded: 'food-and-drink',
              subcategories: [{ name: 'Coffee', name_encoded: 'coffee' }],
              gif: sampleGif('food'),
            },
          ],
        }),
        { status: 200 }
      )
    }
    const rows = await GiphyService.listCategories('gif')
    assert.equal(calls, 1)
    assert.lengthOf(rows, 2)
    assert.equal(rows[0].name_encoded, 'animals')
    assert.isNull(rows[0].defaultTagEncoded)
    assert.equal(rows[0].categoryPreviewUrl, 'https://media.giphy.com/media/preview/s.gif')
    assert.equal(rows[1].defaultTagEncoded, 'coffee')
    assert.equal(rows[1].categoryPreviewUrl, 'https://media.giphy.com/media/food/s.gif')
  })

  test('listCategories sticker: при ошибке API — пустой список (без подмены GIF-категорий)', async ({
    assert,
  }) => {
    let calls = 0
    global.fetch = async (input: RequestInfo | URL) => {
      calls++
      assert.include(String(input), '/v1/stickers/categories')
      return new Response('not found', { status: 404 })
    }
    const rows = await GiphyService.listCategories('sticker')
    assert.equal(calls, 1)
    assert.lengthOf(rows, 0)
  })

  test('categoryGifs sticker: при ошибке пути категории — fallback на stickers/search', async ({
    assert,
  }) => {
    let calls = 0
    global.fetch = async (input: RequestInfo | URL) => {
      calls++
      const s = String(input)
      if (calls === 1) {
        assert.include(s, '/v1/stickers/categories/')
        assert.include(s, encodeURIComponent('actions'))
        assert.include(s, encodeURIComponent('cooking'))
        return new Response('nf', { status: 404 })
      }
      assert.include(s, '/v1/stickers/search')
      assert.include(s, 'q=')
      return new Response(
        JSON.stringify({
          data: [sampleGif('s1')],
          pagination: { count: 1, offset: 0, total_count: 1 },
        }),
        { status: 200 }
      )
    }
    const { items } = await GiphyService.categoryGifs('sticker', 'actions', 'cooking', 0, 24)
    assert.equal(calls, 2)
    assert.lengthOf(items, 1)
    assert.equal(items[0].id, 's1')
  })

  test('search бросает при HTTP !== 200', async ({ assert }) => {
    global.fetch = async () => new Response('err', { status: 500 })
    await assert.rejects(() => GiphyService.search('q', 0, 5, 'gif'))
  })
})
