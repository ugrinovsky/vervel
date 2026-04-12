import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

export default class extends BaseSeeder {
  async run() {
    await User.firstOrCreate(
      { email: 'test@example.com' },
      { fullName: 'Test User', password: '123456' }
    )
  }
}
