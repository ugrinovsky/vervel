import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import OAuthProvider from '#models/oauth_provider'
import type { ProviderName } from '#models/oauth_provider'
import { DateTime } from 'luxon'
import env from '#start/env'
import crypto from 'node:crypto'

export default class OAuthController {
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
  public async redirect({ params, response, session }: HttpContext) {
    const provider = params.provider as ProviderName

    if (!['vk', 'yandex'].includes(provider)) {
      return response.badRequest({ message: 'Invalid OAuth provider' })
    }

    const config = this.getProviderConfig(provider)

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex')
    session.put('oauth_state', state)

    // Build authorization URL
    const params_obj = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope,
      state,
    })

    return response.redirect(`${config.authorizeUrl}?${params_obj.toString()}`)
  }

  /**
   * Handle OAuth callback
   * GET /oauth/:provider/callback
   */
  public async callback({ params, response, request, session }: HttpContext) {
    const provider = params.provider as ProviderName

    if (!['vk', 'yandex'].includes(provider)) {
      return response.badRequest({ message: 'Invalid OAuth provider' })
    }

    // Check for OAuth errors
    if (request.input('error')) {
      return response
        .redirect()
        .status(302)
        .toPath(`/login?error=oauth_denied&provider=${provider}`)
    }

    const code = request.input('code')
    const state = request.input('state')
    const sessionState = session.get('oauth_state')

    // Verify state (CSRF protection)
    if (!state || state !== sessionState) {
      return response
        .redirect()
        .status(302)
        .toPath(`/login?error=oauth_failed&provider=${provider}`)
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
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
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
        return response
          .redirect()
          .status(302)
          .toPath(`/login?error=no_email&provider=${provider}`)
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

      // Clear OAuth state
      session.forget('oauth_state')

      // If user doesn't have role, redirect to role selection
      if (!user.role) {
        return response
          .redirect()
          .status(302)
          .toPath(`/select-role?token=${token.value!.release()}&userId=${user.id}`)
      }

      // User has role - redirect to app with token
      return response
        .redirect()
        .status(302)
        .toPath(`/auth/callback?token=${token.value!.release()}`)
    } catch (error) {
      console.error('OAuth callback error:', error)
      return response
        .redirect()
        .status(302)
        .toPath(`/login?error=oauth_failed&provider=${provider}`)
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
      },
    })
  }
}
