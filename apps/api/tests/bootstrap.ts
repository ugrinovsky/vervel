import app from '@adonisjs/core/services/app'
import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import type { Config } from '@japa/runner/types'
import TestUtils from '@adonisjs/core/services/test_utils'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'

/** После pluginAdonisJS: app поднят, Lucid видит ту же БД, что и HTTP-тесты. */
export async function bootAndMigrate() {
  await TestUtils.boot()
  await (
    TestUtils as typeof TestUtils & {
      db: () => { migrate: () => Promise<() => Promise<void>> }
    }
  )
    .db()
    .migrate()
}

export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

export const plugins: Config['plugins'] = [
  assert(),
  apiClient(),
  pluginAdonisJS(app),
  authApiClient(app),
]

export const configureSuite: Config['configureSuite'] = (suite) => {
  if (suite.name === 'functional') {
    suite.setup(async () => {
      // suite идёт после plugins → migrate точно до httpServer (functional < unit по имени — раньше unit)
      await bootAndMigrate()
      await TestUtils.httpServer().start()
    })
  }
  if (suite.name === 'unit') {
    suite.setup(bootAndMigrate)
  }
}
