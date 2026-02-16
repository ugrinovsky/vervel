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

const AuthController = () => import('#controllers/auth_controller');

router.post('/login', [AuthController, 'login']);
router.post('/register', [AuthController, 'register']);

router.get('/', async () => {
  return {
    hello: 'world',
  };
});

router.get('/exercises', '#controllers/exercises_controller.index');

router
  .group(() => {
    router.get('workouts/stats', '#controllers/workouts_controller.stats');
    router.resource('workouts', WorkoutsController).apiOnly();

    router.get('avatar/stats', '#controllers/avatars_controller.getZoneIntensities');

    router.get('profile', '#controllers/profile_controller.getProfile');
    router.put('profile', '#controllers/profile_controller.updateProfile');
    router.put('profile/password', '#controllers/profile_controller.changePassword');

    // Invite
    router.post('invite/accept', '#controllers/invite_controller.acceptInvite');
    router.get('profile/qr-data', '#controllers/invite_controller.getQrData');
  })
  .use(middleware.auth());

// Trainer routes
router
  .group(() => {
    // Athletes
    router.get('athletes', '#controllers/trainer_controller.listAthletes');
    router.post('athletes/by-email', '#controllers/trainer_controller.addAthleteByEmail');
    router.post('athletes/invite', '#controllers/trainer_controller.generateInviteLink');
    router.post('athletes/by-qr', '#controllers/trainer_controller.addAthleteByQr');
    router.delete('athletes/:athleteId', '#controllers/trainer_controller.removeAthlete');

    // Athlete data
    router.get('athletes/:athleteId/stats', '#controllers/trainer_controller.getAthleteStats');
    router.get('athletes/:athleteId/avatar', '#controllers/trainer_controller.getAthleteAvatar');

    // Groups
    router.get('groups', '#controllers/trainer_controller.listGroups');
    router.post('groups', '#controllers/trainer_controller.createGroup');
    router.put('groups/:id', '#controllers/trainer_controller.updateGroup');
    router.delete('groups/:id', '#controllers/trainer_controller.deleteGroup');
    router.get('groups/:id/athletes', '#controllers/trainer_controller.getGroupAthletes');
    router.post('groups/:id/athletes', '#controllers/trainer_controller.addAthleteToGroup');
    router.delete('groups/:id/athletes/:athleteId', '#controllers/trainer_controller.removeAthleteFromGroup');
  })
  .prefix('trainer')
  .use([middleware.auth(), middleware.trainer()]);
