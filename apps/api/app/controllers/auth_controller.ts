import type { HttpContext } from '@adonisjs/core/http';
import hash from '@adonisjs/core/services/hash';
import User from '#models/user';
import { registerValidator } from '#validators/auth_validator';

export default class AuthController {
  public async login({ request, response }: HttpContext) {
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
      },
      token,
    });
  }

  public async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator);

    const existing = await User.findBy('email', data.email);
    if (existing) {
      return response.conflict({ message: 'Email уже зарегистрирован' });
    }

    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
    });

    const token = await User.accessTokens.create(user);

    return response.created({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
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
