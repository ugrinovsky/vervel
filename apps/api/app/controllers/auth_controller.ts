import type { HttpContext } from '@adonisjs/core/http';
import hash from '@adonisjs/core/services/hash';
import limiter from '@adonisjs/limiter/services/main';
import db from '@adonisjs/lucid/services/db';
// @ts-ignore — no types for this package
import disposableDomains from 'disposable-email-domains';
import User from '#models/user';
import { registerValidator } from '#validators/auth_validator';
import { AiBalanceService } from '#services/AiBalanceService';

const disposableSet: Set<string> = new Set(disposableDomains);

export default class AuthController {
  public async login({ request, response }: HttpContext) {
    const ip = request.ip();

    // Rate limit: 10 login attempts per IP per 15 minutes
    const loginLimit = limiter.use({ requests: 10, duration: '15 mins', blockDuration: '30 mins' });
    const loginLimitRes = await loginLimit.attempt(`login_ip_${ip}`, async () => {
      const email = request.input('email');
      const password = request.input('password');

      const user = await User.query().where('email', email).first();
      if (!user) {
        return response.unauthorized({ message: 'Invalid credentials' });
      }

      // Check if user has password (not OAuth-only user)
      if (!user.password) {
        return response.unauthorized({
          message: 'Этот аккаунт использует социальный вход. Войдите через VK или Yandex.',
        });
      }

      const isValid = await hash.verify(user.password, password);
      if (!isValid) {
        return response.unauthorized({ message: 'Invalid credentials' });
      }

      const token = await User.accessTokens.create(user);

      return response.ok({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          gender: user.gender,
        },
        token,
      });
    });

    if (loginLimitRes === null) {
      return response.tooManyRequests({ message: 'Слишком много попыток. Попробуйте через 30 минут.' });
    }

    return loginLimitRes;
  }

  public async register({ request, response }: HttpContext) {
    const ip = request.ip();

    // Rate limit: 5 registrations per IP per 10 minutes
    const registerLimit = limiter.use({ requests: 5, duration: '10 mins', blockDuration: '60 mins' });
    const isLimited = await registerLimit.isBlocked(`register_ip_${ip}`);
    if (isLimited) {
      return response.tooManyRequests({ message: 'Слишком много регистраций с этого адреса. Попробуйте позже.' });
    }

    // Honeypot: if filled, silently reject (bots)
    const honeypot = request.input('website', '');
    if (honeypot) {
      return response.created({
        user: { id: 0, email: '', fullName: '', role: 'athlete', gender: null },
        token: '',
      });
    }

    const data = await request.validateUsing(registerValidator);

    const emailDomain = data.email.split('@')[1]?.toLowerCase();
    if (emailDomain && disposableSet.has(emailDomain)) {
      return response.unprocessableEntity({ message: 'Временные почтовые адреса не допускаются. Используйте постоянный email.' });
    }

    const existing = await User.findBy('email', data.email);
    if (existing) {
      const wantsAthlete = data.role === 'athlete' || data.role === 'both';
      const wantsTrainer = data.role === 'trainer' || data.role === 'both';
      const hasAthlete = existing.role === 'athlete' || existing.role === 'both';
      const hasTrainer = existing.role === 'trainer' || existing.role === 'both';

      if ((wantsAthlete && !hasAthlete) || (wantsTrainer && !hasTrainer)) {
        existing.role = 'both';
        await existing.save();
        const token = await User.accessTokens.create(existing);
        return response.ok({
          user: {
            id: existing.id,
            email: existing.email,
            fullName: existing.fullName,
            role: existing.role,
            gender: existing.gender,
          },
          token,
          upgraded: true,
        });
      }

      return response.conflict({ message: 'Этот email уже зарегистрирован. Войдите в аккаунт.' });
    }

    await registerLimit.increment(`register_ip_${ip}`);

    // Validate referrer if provided: must exist, must be an athlete, must not exceed referral cap
    let validRefId: number | null = null;
    if (data.refId) {
      const referrer = await User.find(data.refId);
      if (referrer && referrer.isAthlete) {
        const referralCount = await db
          .from('balance_transactions')
          .where('user_id', referrer.id)
          .where('type', 'bonus')
          .where('description', 'like', 'Реферальный бонус%')
          .count('* as total')
          .first();
        const count = Number(referralCount?.total ?? 0);
        if (count < 2) {
          validRefId = referrer.id;
        }
      }
    }

    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
      gender: data.gender ?? null,
      referredById: validRefId,
    });

    if (validRefId) {
      AiBalanceService.topup(
        validRefId,
        AiBalanceService.REFERRAL_BONUS,
        'bonus',
        `Реферальный бонус за приглашение пользователя ${user.email}`
      ).catch(() => {});
    }

    const token = await User.accessTokens.create(user);

    return response.created({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        gender: user.gender,
      },
      token,
    });
  }

  public async me({ auth, response }: HttpContext) {
    await auth.use('api').authenticate();
    return response.ok({ user: auth.user });
  }

  public async logout({ auth, response }: HttpContext) {
    const user = auth.user!;
    const token = user.currentAccessToken;

    if (token) {
      await User.accessTokens.delete(user, token.identifier);
    }

    return response.ok({ message: 'Logged out' });
  }
}
