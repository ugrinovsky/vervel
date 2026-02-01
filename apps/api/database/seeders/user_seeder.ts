import User from '#models/user';
import { BaseSeeder } from '@adonisjs/lucid/seeders';

export default class extends BaseSeeder {
  async run() {
    await User.create({
      fullName: 'Test User',
      email: 'test@example.com',
      password: '123456',
    });
  }
}
