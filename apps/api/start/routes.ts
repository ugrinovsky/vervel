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
const OAuthController = () => import('#controllers/oauth_controller');

router.post('/login', [AuthController, 'login']);
router.post('/register', [AuthController, 'register']);

// OAuth routes
router.get('/oauth/:provider/redirect', [OAuthController, 'redirect']);
router.get('/oauth/:provider/callback', [OAuthController, 'callback']);
router.post('/oauth/set-role', [OAuthController, 'setRole']);

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
    router.post('profile/become-athlete', '#controllers/profile_controller.becomeAthlete');

    // Streak routes
    router.get('streak', '#controllers/streak_controller.show');
    router.get('streak/history', '#controllers/streak_controller.history');

    // Achievement routes
    router.get('achievements', '#controllers/streak_controller.achievements');
    router.post('achievements/seen', '#controllers/streak_controller.markAchievementsSeen');

    // Invite
    router.post('invite/accept', '#controllers/invite_controller.acceptInvite');
    router.get('profile/qr-data', '#controllers/invite_controller.getQrData');

    // Athlete: my groups and trainers
    router.get('athlete/my-groups', '#controllers/athlete_controller.getMyGroups');
    router.get('athlete/my-trainers', '#controllers/athlete_controller.getMyTrainers');
    router.get('athlete/unread-counts', '#controllers/athlete_controller.getUnreadCounts');
    router.get('athlete/chats/group/:groupId', '#controllers/athlete_controller.getOrCreateGroupChat');
    router.get('athlete/chats/trainer/:trainerId', '#controllers/athlete_controller.getOrCreatePersonalChat');

    // Shared chat messages (trainer or athlete participant)
    router.get('chats/:chatId/messages', '#controllers/chat_controller.getMessagesShared');
    router.post('chats/:chatId/messages', '#controllers/chat_controller.sendMessageShared');
    router.post('chats/:chatId/read', '#controllers/chat_controller.markAsRead');
  })
  .use(middleware.auth());

// AI routes (athlete: recognize workout from image; trainer: generate from text)
router
  .group(() => {
    router.get('status', '#controllers/ai_controller.status')
    router.post('recognize-workout', '#controllers/ai_controller.recognizeWorkout')
    router.post('generate-workout', '#controllers/ai_controller.generateWorkout')
  })
  .prefix('ai')
  .use(middleware.auth());

// Trainer routes
router
  .group(() => {
    // Today overview
    router.get('today', '#controllers/trainer_controller.getTodayOverview');
    router.get('profile-stats', '#controllers/trainer_controller.getProfileStats');
    router.get('unread-counts', '#controllers/chat_controller.getUnreadCounts');

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

    // Chats
    router.get('chats/group/:groupId', '#controllers/chat_controller.getOrCreateGroupChat');
    router.get('chats/athlete/:athleteId', '#controllers/chat_controller.getOrCreateAthleteChat');
    router.get('chats/:chatId/messages', '#controllers/chat_controller.getMessages');
    router.post('chats/:chatId/messages', '#controllers/chat_controller.sendMessage');
    router.get('chats/:chatId/last', '#controllers/chat_controller.getLastMessage');

    // Scheduled workouts
    router.get('scheduled-workouts', '#controllers/scheduled_workout_controller.list');
    router.get('scheduled-workouts/today', '#controllers/scheduled_workout_controller.today');
    router.post('scheduled-workouts', '#controllers/scheduled_workout_controller.create');
    router.put('scheduled-workouts/:id', '#controllers/scheduled_workout_controller.update');
    router.delete('scheduled-workouts/:id', '#controllers/scheduled_workout_controller.delete');

    // Workout templates
    router.get('workout-templates', '#controllers/workout_template_controller.list');
    router.post('workout-templates', '#controllers/workout_template_controller.create');
    router.put('workout-templates/:id', '#controllers/workout_template_controller.update');
    router.delete('workout-templates/:id', '#controllers/workout_template_controller.delete');
  })
  .prefix('trainer')
  .use([middleware.auth(), middleware.trainer()]);
