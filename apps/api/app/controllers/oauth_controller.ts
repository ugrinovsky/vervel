import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import { errorMessage } from '#utils/error'
import { isRecord } from '#utils/type_guards'
import User from '#models/user'
import OAuthProvider from '#models/oauth_provider'
import type { ProviderName } from '#models/oauth_provider'
import { DateTime } from 'luxon'
import env from '#start/env'
import { setAuthTokenCookie } from '#utils/auth_cookie'
import {
  normalizeVkLaunchParams,
  verifyVkMiniAppLaunchFromRawSearch,
  verifyVkMiniAppLaunchSignature,
} from '#utils/vk_mini_app_launch'

// ── Helpers: parse & validate external API JSON responses ─────────────────────

type VkTokenResponse = {
  access_token: string
  user_id: string
  email: string | null
  refresh_token: string | null
  expires_in: number | null
}

function parseVkTokenResponse(raw: unknown): VkTokenResponse {
  if (!isRecord(raw) || typeof raw['access_token'] !== 'string') {
    throw new Error('Invalid VK token response')
  }
  return {
    access_token: raw['access_token'],
    user_id: String(raw['user_id'] ?? ''),
    email: typeof raw['email'] === 'string' ? raw['email'] : null,
    refresh_token: typeof raw['refresh_token'] === 'string' ? raw['refresh_token'] : null,
    expires_in: typeof raw['expires_in'] === 'number' ? raw['expires_in'] : null,
  }
}

type VkUserInfoResponse = {
  name: string | null
}

function parseVkUserInfoResponse(raw: unknown): VkUserInfoResponse {
  if (!isRecord(raw) || !Array.isArray(raw['response']) || !isRecord(raw['response'][0])) {
    return { name: null }
  }
  const user = raw['response'][0]
  const first = typeof user['first_name'] === 'string' ? user['first_name'] : ''
  const last = typeof user['last_name'] === 'string' ? user['last_name'] : ''
  return { name: `${first} ${last}`.trim() || null }
}

type YandexUserInfoResponse = {
  id: string
  email: string | null
  name: string | null
}

function parseYandexUserInfoResponse(raw: unknown): YandexUserInfoResponse {
  if (!isRecord(raw)) throw new Error('Invalid Yandex user info response')
  return {
    id: String(raw['id'] ?? ''),
    email: typeof raw['default_email'] === 'string' ? raw['default_email'] : null,
    name:
      typeof raw['display_name'] === 'string'
        ? raw['display_name']
        : typeof raw['real_name'] === 'string'
          ? raw['real_name']
          : null,
  }
}

export default class OAuthController {
  /**
   * Найти или создать пользователя по VK ID (OAuth / VK ID SDK / Mini App).
   * Роль всегда `null` до `/select-role`, кроме явной обработки в `vkMiniAppLogin`.
   */
  private async linkOrCreateVkUser(
    providerUserId: string,
    name: string | null,
    accessToken: string | null
  ): Promise<User> {
    let oauthProvider = await OAuthProvider.query()
      .where('provider', 'vk')
      .where('provider_user_id', providerUserId)
      .first()

    if (oauthProvider) {
      await oauthProvider.load('user')
      const user = oauthProvider.user
      if (accessToken) {
        oauthProvider.accessToken = accessToken
        await oauthProvider.save()
      }
      return user
    }

    const syntheticEmail = `vk_${providerUserId}@vkid.user`
    const existing = await User.findBy('email', syntheticEmail)

    const user =
      existing ??
      (await User.create({
        email: syntheticEmail,
        fullName: name || `VK User ${providerUserId}`,
        password: null,
        role: null,
      }))

    await OAuthProvider.create({
      userId: user.id,
      provider: 'vk',
      providerUserId,
      accessToken,
      refreshToken: null,
      expiresAt: null,
    })

    return user
  }

  private getProviderConfig(provider: ProviderName) {
    if (provider === 'vk') {
      return {
        authorizeUrl: 'https://oauth.vk.com/authorize',
        tokenUrl: 'https://oauth.vk.com/access_token',
        userInfoUrl: 'https://api.vk.com/method/users.get',
        clientId: env.get('VK_CLIENT_ID'),
        clientSecret: env.get('VK_CLIENT_SECRET'),
        redirectUri: env.get('VK_REDIRECT_URI'),
        scope: 'email',
      }
    } else {
      return {
        authorizeUrl: 'https://oauth.yandex.ru/authorize',
        tokenUrl: 'https://oauth.yandex.ru/token',
        userInfoUrl: 'https://login.yandex.ru/info',
        clientId: env.get('YANDEX_CLIENT_ID'),
        clientSecret: env.get('YANDEX_CLIENT_SECRET'),
        redirectUri: env.get('YANDEX_REDIRECT_URI'),
        scope: 'login:email login:info',
      }
    }
  }

  /**
   * Redirect to OAuth provider
   * GET /oauth/:provider/redirect
   */
  public async redirect({ params, response }: HttpContext) {
    const raw = String(params.provider)
    if (raw !== 'vk' && raw !== 'yandex') {
      return response.badRequest({ message: 'Invalid OAuth provider' })
    }
    const provider: ProviderName = raw

    const config = this.getProviderConfig(provider)

    // Build authorization URL
    const paramsObj = new URLSearchParams({
      client_id: config.clientId ?? '',
      redirect_uri: config.redirectUri ?? '',
      response_type: 'code',
      scope: config.scope,
    })

    return response.redirect(`${config.authorizeUrl}?${paramsObj.toString()}`)
  }

  /**
   * Handle OAuth callback
   * GET /oauth/:provider/callback
   *
   * Новые пользователи с `role: null` проходят выбор роли на фронте (/select-role), не через VK Mini App.
   */
  public async callback({ params, response, request }: HttpContext) {
    const rawProvider = String(params.provider)
    if (rawProvider !== 'vk' && rawProvider !== 'yandex') {
      return response.badRequest({ message: 'Invalid OAuth provider' })
    }
    const provider: ProviderName = rawProvider

    const appUrl = env.get('APP_URL') || 'http://localhost:5173'

    // Check for OAuth errors
    if (request.input('error')) {
      return response
        .redirect()
        .status(302)
        .toPath(`${appUrl}/login?error=oauth_denied&provider=${provider}`)
    }

    const code = request.input('code')

    if (!code) {
      return response
        .redirect()
        .status(302)
        .toPath(`${appUrl}/login?error=oauth_failed&provider=${provider}`)
    }

    try {
      const config = this.getProviderConfig(provider)

      // Exchange code for access token
      const tokenResponse = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId ?? '',
          client_secret: config.clientSecret ?? '',
          code,
          redirect_uri: config.redirectUri ?? '',
          grant_type: 'authorization_code',
        }).toString(),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token')
      }

      const tokenData = parseVkTokenResponse(await tokenResponse.json())
      const accessToken = tokenData.access_token

      // Get user info from provider
      let email: string | null = null
      let name: string | null = null

      if (provider === 'vk') {
        email = tokenData.email
        const userInfoUrl = `${config.userInfoUrl}?access_token=${accessToken}&v=5.131&fields=first_name,last_name`
        const userInfoResponse = await fetch(userInfoUrl)
        name = parseVkUserInfoResponse(await userInfoResponse.json()).name
      } else if (provider === 'yandex') {
        const userInfoResponse = await fetch(config.userInfoUrl, {
          headers: { Authorization: `OAuth ${accessToken}` },
        })
        const yandexInfo = parseYandexUserInfoResponse(await userInfoResponse.json())
        email = yandexInfo.email
        name = yandexInfo.name
      }

      // Check if email is provided
      if (!email) {
        return response.redirect().status(302).toPath(`/login?error=no_email&provider=${provider}`)
      }

      // Step 1: Find existing OAuth connection
      let oauthProvider = await OAuthProvider.query()
        .where('provider', provider)
        .where('provider_user_id', tokenData.user_id || email)
        .first()

      let user: User

      if (oauthProvider) {
        // Existing OAuth connection found
        await oauthProvider.load('user')
        user = oauthProvider.user

        // Update OAuth tokens
        oauthProvider.accessToken = accessToken
        oauthProvider.refreshToken = tokenData.refresh_token
        oauthProvider.expiresAt = tokenData.expires_in
          ? DateTime.now().plus({ seconds: tokenData.expires_in })
          : null
        await oauthProvider.save()
      } else {
        // Step 2: Check if user with this email exists
        const existingUser = await User.findBy('email', email)

        if (existingUser) {
          user = existingUser
          // Email exists - link OAuth to existing account
          oauthProvider = await OAuthProvider.create({
            userId: user.id,
            provider,
            providerUserId: tokenData.user_id || email,
            accessToken,
            refreshToken: tokenData.refresh_token,
            expiresAt: tokenData.expires_in
              ? DateTime.now().plus({ seconds: tokenData.expires_in })
              : null,
          })
        } else {
          // Step 3: Create new user without role (will be asked later)
          user = await User.create({
            email,
            fullName: name || email,
            password: null,
            role: null,
          })

          // Create OAuth link
          oauthProvider = await OAuthProvider.create({
            userId: user.id,
            provider,
            providerUserId: tokenData.user_id || email,
            accessToken,
            refreshToken: tokenData.refresh_token || null,
            expiresAt: tokenData.expires_in
              ? DateTime.now().plus({ seconds: tokenData.expires_in })
              : null,
          })
        }
      }

      // Generate our access token
      const token = await User.accessTokens.create(user)
      setAuthTokenCookie(response, token.value!.release())

      // If user doesn't have role, redirect to role selection
      if (!user.role) {
        return response.redirect().status(302).toPath(`/select-role?userId=${user.id}`)
      }

      // User has role - redirect to app
      return response.redirect().status(302).toPath(`/auth/callback`)
    } catch (error) {
      logger.error({ provider, err: errorMessage(error) }, 'oauth: callback error')
      return response
        .redirect()
        .status(302)
        .toPath(`/login?error=oauth_failed&provider=${provider}`)
    }
  }

  /**
   * Authenticate with VK ID SDK (frontend OneTap flow)
   * POST /oauth/vk/sdk-login
   *
   * Новый пользователь без роли → `needsRole` и экран /select-role (как у веб OAuth и Яндекса), не как у Mini App.
   */
  public async vkSdkLogin({ request, response }: HttpContext) {
    const { accessToken, userId } = request.only(['accessToken', 'userId'])

    if (!accessToken || !userId) {
      return response.badRequest({ message: 'accessToken and userId are required' })
    }

    try {
      // Get user info from VK API
      const userInfoUrl = `https://api.vk.com/method/users.get?access_token=${accessToken}&v=5.131&fields=first_name,last_name`
      const userInfoResponse = await fetch(userInfoUrl)
      const name = parseVkUserInfoResponse(await userInfoResponse.json()).name

      const providerUserId = String(userId)
      const user = await this.linkOrCreateVkUser(providerUserId, name, accessToken)

      const token = await User.accessTokens.create(user)
      setAuthTokenCookie(response, token.value!.release())

      if (!user.role) {
        return response.ok({
          needsRole: true,
          userId: user.id,
        })
      }

      return response.ok({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          themeHue: user.themeHue,
        },
      })
    } catch (error) {
      logger.error({ err: errorMessage(error) }, 'oauth: vk sdk login error')
      return response.internalServerError({ message: 'Ошибка авторизации через VK' })
    }
  }

  /**
   * Вход из VK Mini App по подписанным параметрам запуска (без access token VK API).
   * POST /oauth/vk/mini-app-login
   *
   * Без роли — как у остальных OAuth: `needsRole` + экран /select-role на клиенте.
   */
  public async vkMiniAppLogin({ request, response }: HttpContext) {
    const launchParams = normalizeVkLaunchParams(request.input('launchParams'))
    if (!launchParams?.sign) {
      return response.badRequest({ message: 'launchParams object with sign is required' })
    }

    const secret = env.get('VK_MINI_APP_SECRET')
    if (!secret) {
      return response.serviceUnavailable({
        message: 'VK Mini App login is not configured (set VK_MINI_APP_SECRET)',
      })
    }

    const expectedAppId = env.get('VK_MINI_APP_ID')
    if (expectedAppId && launchParams.vk_app_id !== expectedAppId) {
      return response.forbidden({ message: 'Invalid vk_app_id' })
    }

    const launchQueryInput = request.input('launchQuery')
    const rawLaunchQuery = typeof launchQueryInput === 'string' ? launchQueryInput.trim() : ''

    const signatureOk =
      verifyVkMiniAppLaunchSignature(launchParams, secret) ||
      (rawLaunchQuery.length > 0 && verifyVkMiniAppLaunchFromRawSearch(rawLaunchQuery, secret))

    if (!signatureOk) {
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex').slice(0, 12)
      logger.warn(
        {
          vkAppId: launchParams.vk_app_id ?? null,
          vkUserId: launchParams.vk_user_id ?? null,
          secretLen: secret.length,
          secretHash12: secretHash,
          sign: launchParams.sign ?? null,
          launchParamKeys: Object.keys(launchParams).sort(),
          launchQuery: rawLaunchQuery || null,
        },
        'vk-mini-app-login: invalid signature'
      )
      return response.forbidden({ message: 'Invalid launch signature' })
    }

    const vkTs = launchParams.vk_ts
    if (vkTs) {
      const ts = Number(vkTs)
      if (Number.isFinite(ts)) {
        const ageSec = Math.abs(Date.now() / 1000 - ts)
        if (ageSec > 86400) {
          return response.forbidden({ message: 'Stale launch parameters' })
        }
      }
    }

    const providerUserId = launchParams.vk_user_id
    if (!providerUserId) {
      return response.badRequest({ message: 'vk_user_id is required in launch params' })
    }

    try {
      const user = await this.linkOrCreateVkUser(providerUserId, null, null)
      const token = await User.accessTokens.create(user)
      const accessToken = token.value!.release()
      setAuthTokenCookie(response, accessToken)

      if (!user.role) {
        return response.ok({
          accessToken,
          needsRole: true,
          userId: user.id,
        })
      }

      return response.ok({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          themeHue: user.themeHue,
        },
      })
    } catch (error) {
      logger.error({ err: errorMessage(error) }, 'oauth: vk mini app login error')
      return response.internalServerError({ message: 'Ошибка входа через VK Mini App' })
    }
  }

  /**
   * Authenticate with Yandex SDK (frontend YaAuthSuggest flow)
   * POST /oauth/yandex/sdk-login
   *
   * Новый пользователь без роли → `needsRole` и экран /select-role (не VK Mini App).
   */
  public async yandexSdkLogin({ request, response }: HttpContext) {
    const { accessToken } = request.only(['accessToken'])

    if (!accessToken) {
      return response.badRequest({ message: 'accessToken is required' })
    }

    try {
      const userInfoResponse = await fetch('https://login.yandex.ru/info', {
        headers: { Authorization: `OAuth ${accessToken}` },
      })
      const userInfo = parseYandexUserInfoResponse(await userInfoResponse.json())

      const email = userInfo.email
      const name = userInfo.name
      const providerUserId = userInfo.id

      if (!email) {
        return response.badRequest({ message: 'Яндекс не предоставил email' })
      }

      let oauthProvider = await OAuthProvider.query()
        .where('provider', 'yandex')
        .where('provider_user_id', providerUserId)
        .first()

      let user: User

      if (oauthProvider) {
        await oauthProvider.load('user')
        user = oauthProvider.user
        oauthProvider.accessToken = accessToken
        await oauthProvider.save()
      } else {
        const existing = await User.findBy('email', email)

        if (existing) {
          user = existing
          oauthProvider = await OAuthProvider.create({
            userId: user.id,
            provider: 'yandex',
            providerUserId,
            accessToken,
            refreshToken: null,
            expiresAt: null,
          })
        } else {
          user = await User.create({
            email,
            fullName: name || email,
            password: null,
            role: null,
          })
          oauthProvider = await OAuthProvider.create({
            userId: user.id,
            provider: 'yandex',
            providerUserId,
            accessToken,
            refreshToken: null,
            expiresAt: null,
          })
        }
      }

      const token = await User.accessTokens.create(user)
      setAuthTokenCookie(response, token.value!.release())

      if (!user.role) {
        return response.ok({
          needsRole: true,
          userId: user.id,
        })
      }

      return response.ok({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          themeHue: user.themeHue,
        },
      })
    } catch (error) {
      logger.error({ err: errorMessage(error) }, 'oauth: yandex sdk login error')
      return response.internalServerError({ message: 'Ошибка авторизации через Яндекс' })
    }
  }

  /**
   * Set user role after OAuth registration
   * POST /oauth/set-role
   */
  public async setRole({ request, response }: HttpContext) {
    const userId = request.input('userId')
    const role = request.input('role')

    if (!['athlete', 'trainer', 'both'].includes(role)) {
      return response.badRequest({ message: 'Invalid role' })
    }

    const user = await User.find(userId)
    if (!user) {
      return response.notFound({ message: 'User not found' })
    }

    if (user.role) {
      return response.conflict({ message: 'Role already set' })
    }

    user.role = role
    await user.save()

    return response.ok({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        themeHue: user.themeHue,
      },
    })
  }
}
