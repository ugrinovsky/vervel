import app from '@adonisjs/core/services/app';
import { assert } from '@japa/assert';
import { apiClient } from '@japa/api-client';
import { pluginAdonisJS } from '@japa/plugin-adonisjs';
import type { Config } from '@japa/runner/types';
import TestUtils from '@adonisjs/core/services/test_utils';
import { authApiClient } from '@adonisjs/auth/plugins/api_client';

export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [() => {}],
  teardown: [],
};

export const plugins: Config['plugins'] = [
  assert(),
  apiClient(),
  pluginAdonisJS(app),
  authApiClient(app),
];

export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['functional', 'unit'].includes(suite.name)) {
    suite.setup(() => TestUtils.httpServer().start());
  }
};
