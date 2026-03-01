/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env';

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for OAuth providers
  |----------------------------------------------------------
  */
  // VK_CLIENT_ID: Env.schema.string(),
  // VK_CLIENT_SECRET: Env.schema.string(),
  // VK_REDIRECT_URI: Env.schema.string(),

  // YANDEX_CLIENT_ID: Env.schema.string(),
  // YANDEX_CLIENT_SECRET: Env.schema.string(),
  // YANDEX_REDIRECT_URI: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for AI Workout Recognition (Yandex Cloud)
  |----------------------------------------------------------
  */
  FEATURE_AI_WORKOUT: Env.schema.string.optional(),
  YANDEX_CLOUD_API_KEY: Env.schema.string.optional(),
  YANDEX_FOLDER_ID: Env.schema.string.optional(),
  YANDEX_OCR_MODEL: Env.schema.string.optional(),
  YANDEX_GPT_MODEL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | AI pricing (rubles per operation)
  |----------------------------------------------------------
  */
  AI_COST_GENERATE: Env.schema.string.optional(),  // default 10
  AI_COST_RECOGNIZE: Env.schema.string.optional(), // default 9
  AI_COST_CHAT: Env.schema.string.optional(),      // default 6
  AI_WELCOME_BONUS: Env.schema.string.optional(),  // default 50

  /*
  |----------------------------------------------------------
  | YooKassa payments (https://yookassa.ru)
  |----------------------------------------------------------
  */
  YOOKASSA_SHOP_ID: Env.schema.string.optional(),
  YOOKASSA_SECRET_KEY: Env.schema.string.optional(),
  // Set to "true" to skip IP whitelist check in local development
  YOOKASSA_SKIP_IP_CHECK: Env.schema.string.optional(),
  // Base URL of the app — used as return_url after payment
  APP_URL: Env.schema.string.optional(),
});
