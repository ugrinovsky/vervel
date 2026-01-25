/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

const ExercisesController = () => import('#controllers/exercises_controller');

import router from '@adonisjs/core/services/router';

router.get('/', async () => {
  return {
    hello: 'world',
  };
});

router.get('/exercises', [ExercisesController, 'index']);
