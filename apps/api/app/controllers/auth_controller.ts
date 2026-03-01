import type { HttpContext } from '@adonisjs/core/http';
import hash from '@adonisjs/core/services/hash';
import limiter from '@adonisjs/limiter/services/main';
import User from '#models/user';
import { registerValidator } from '#validators/auth_validator';

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

    const existing = await User.findBy('email', data.email);
    if (existing) {
      return response.conflict({ message: 'Email уже зарегистрирован' });
    }

    await registerLimit.increment(`register_ip_${ip}`);

    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
      gender: data.gender ?? null,
    });

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
