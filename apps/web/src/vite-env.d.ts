/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Canonical page URL passed to VK ID SDK as redirectUrl on prod */
  readonly VITE_APP_URL?: string
  readonly VITE_VK_APP_ID?: string
  readonly VITE_ENABLE_VK_MINI_APP?: string
  readonly VITE_YANDEX_CLIENT_ID?: string
  /** Опционально: свой URL скрипта YaAuthSuggest, если yastatic.net недоступен */
  readonly VITE_YANDEX_SDK_URL?: string
}
