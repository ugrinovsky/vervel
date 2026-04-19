import type { HttpContext } from '@adonisjs/core/http'
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
    const provider = params.provider as ProviderName

    if (!['vk', 'yandex'].includes(provider)) {
      return response.badRequest({ message: 'Invalid OAuth provider' })
    }

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
    const provider = params.provider as ProviderName

    if (!['vk', 'yandex'].includes(provider)) {
      return response.badRequest({ message: 'Invalid OAuth provider' })
    }

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

      const tokenData: any = await tokenResponse.json()
      const accessToken = tokenData.access_token

      // Get user info from provider
      let email: string | null = null
      let name: string | null = null

      if (provider === 'vk') {
        // VK returns email in token response
        email = tokenData.email || null

        // Get user info for name
        const userInfoUrl = `${config.userInfoUrl}?access_token=${accessToken}&v=5.131&fields=first_name,last_name`
        const userInfoResponse = await fetch(userInfoUrl)
        const userInfoData: any = await userInfoResponse.json()

        if (userInfoData.response && userInfoData.response[0]) {
          const user = userInfoData.response[0]
          name = `${user.first_name} ${user.last_name}`
        }
      } else if (provider === 'yandex') {
        // Yandex user info
        const userInfoResponse = await fetch(config.userInfoUrl, {
          headers: {
            Authorization: `OAuth ${accessToken}`,
          },
        })
        const userInfoData: any = await userInfoResponse.json()

        email = userInfoData.default_email || null
        name = userInfoData.display_name || userInfoData.real_name || null
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
        oauthProvider.refreshToken = tokenData.refresh_token || null
        oauthProvider.expiresAt = tokenData.expires_in
          ? DateTime.now().plus({ seconds: tokenData.expires_in })
          : null
        await oauthProvider.save()
      } else {
        // Step 2: Check if user with this email exists
        user = (await User.findBy('email', email)) as User

        if (user) {
          // Email exists - link OAuth to existing account
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
        } else {
          // Step 3: Create new user without role (will be asked later)
          user = await User.create({
            email,
            fullName: name || email,
            password: null, // OAuth users don't have password
            role: null as any, // Will be set on role selection screen
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
      console.error('OAuth callback error:', error)
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
      const userInfoData: any = await userInfoResponse.json()

      let name: string | null = null
      if (userInfoData.response?.[0]) {
        const u = userInfoData.response[0]
        name = `${u.first_name} ${u.last_name}`.trim()
      }

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
      console.error('VK SDK login error:', error)
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
      console.error('VK Mini App login error:', error)
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
      const userInfo: any = await userInfoResponse.json()

      const email: string | null = userInfo.default_email || null
      const name: string | null = userInfo.display_name || userInfo.real_name || null
      const providerUserId = String(userInfo.id)

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
            role: null as any,
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
      console.error('Yandex SDK login error:', error)
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
