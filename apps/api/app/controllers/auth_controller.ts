import type { HttpContext } from '@adonisjs/core/http';
import hash from '@adonisjs/core/services/hash';
import User from '#models/user';

export default class AuthController {
  public async login({ request, response }: HttpContext) {
    const email = request.input('email');
    const password = request.input('password');

    const user = await User.query().where('email', email).first();
    if (!user) {
      return response.unauthorized({ message: 'Invalid credentials' });
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
