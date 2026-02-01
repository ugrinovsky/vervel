/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router';
import { middleware } from './kernel.js';
import WorkoutsController from '#controllers/workouts_controller';

const ExercisesController = () => import('#controllers/exercises_controller');
const AuthController = () => import('#controllers/auth_controller');

router.post('/login', [AuthController, 'login']);

router.get('/', async () => {
  return {
    hello: 'world',
  };
});

router.get('/exercises', [ExercisesController, 'index']);

router
  .group(() => {
    router.get('workouts/stats', '#controllers/workouts_controller.stats');
    router.resource('workouts', WorkoutsController).apiOnly();
  })
  .use(middleware.auth());
