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

// Public invite info (no auth)
router.get('/invite/info/:token', '#controllers/invite_controller.getInviteInfo');

// YooKassa webhook — public, called by YooKassa servers
router.post('/payments/webhook', '#controllers/payments_controller.webhook');

// OAuth routes
router.get('/oauth/:provider/redirect', [OAuthController, 'redirect']);
router.get('/oauth/:provider/callback', [OAuthController, 'callback']);
router.post('/oauth/set-role', [OAuthController, 'setRole']);
router.post('/oauth/vk/sdk-login', [OAuthController, 'vkSdkLogin']);
router.post('/oauth/yandex/sdk-login', [OAuthController, 'yandexSdkLogin']);

router.get('/', async () => {
  return {
    hello: 'world',
  };
});

// Web Push — public VAPID key
router.get('/push/vapid-key', '#controllers/push_controller.vapidKey');

// Web Push — subscribe / unsubscribe (auth required)
router.post('/push/subscribe', '#controllers/push_controller.subscribe').use(middleware.auth());
router.delete('/push/unsubscribe', '#controllers/push_controller.unsubscribe').use(middleware.auth());

router.get('/exercises', '#controllers/exercises_controller.index');
router.get('/exercises/:id', '#controllers/exercises_controller.show');

router
  .group(() => {
    router.get('workouts/stats', '#controllers/workouts_controller.stats');
    router.get('workouts/by-zone', '#controllers/workouts_controller.byZone');
    router.resource('workouts', WorkoutsController).apiOnly();

    router.get('avatar/stats', '#controllers/avatars_controller.getZoneIntensities');

    router.get('profile', '#controllers/profile_controller.getProfile');
    router.put('profile', '#controllers/profile_controller.updateProfile');
    router.post('profile/photo', '#controllers/profile_controller.uploadPhoto');
    router.put('profile/password', '#controllers/profile_controller.changePassword');
    router.post('profile/become-athlete', '#controllers/profile_controller.becomeAthlete');
    router.post('profile/become-trainer', '#controllers/profile_controller.becomeTrainer');

    // Публичный профиль тренера (для атлетов)
    router.get('athlete/trainers/:trainerId/profile', '#controllers/profile_controller.getTrainerPublicProfile');

    // Streak routes
    router.get('streak', '#controllers/streak_controller.show');
    router.get('streak/history', '#controllers/streak_controller.history');

    // Achievement routes
    router.get('achievements', '#controllers/streak_controller.achievements');
    router.post('achievements/check', '#controllers/streak_controller.checkAndUnlock');
    router.post('achievements/seen', '#controllers/streak_controller.markAchievementsSeen');

    // Invite
    router.post('invite/accept', '#controllers/invite_controller.acceptInvite');
    router.get('profile/qr-data', '#controllers/invite_controller.getQrData');
    router.get('referral/stats', '#controllers/invite_controller.getReferralStats');

    // Video calls — join (athlete + trainer)
    router.post('calls/:roomName/join', '#controllers/video_calls_controller.join');
    router.get('athlete/calls/active', '#controllers/video_calls_controller.athleteActive');

    // Athlete: my groups and trainers
    router.get('athlete/my-groups', '#controllers/athlete_controller.getMyGroups');
    router.get('athlete/my-trainers', '#controllers/athlete_controller.getMyTrainers');
    router.get('athlete/unread-counts', '#controllers/athlete_controller.getUnreadCounts');
    router.get('athlete/upcoming-workouts', '#controllers/athlete_controller.getUpcomingWorkouts');
    router.get('athlete/periodization', '#controllers/athlete_controller.getMyPeriodization');
    router.get('athlete/chats/group/:groupId', '#controllers/athlete_controller.getOrCreateGroupChat');
    router.get('athlete/chats/trainer/:trainerId', '#controllers/athlete_controller.getOrCreatePersonalChat');

    // Shared chat messages (trainer or athlete participant)
    router.get('chats/:chatId/messages', '#controllers/chat_controller.getMessagesShared');
    router.post('chats/:chatId/messages', '#controllers/chat_controller.sendMessageShared');
    router.post('chats/:chatId/read', '#controllers/chat_controller.markAsRead');
  })
  .use(middleware.auth());

// Feedback (auth — saves user_id)
router.post('/feedback', '#controllers/feedback_controller.create').use(middleware.auth());

// Payments — create top-up (protected)
router
  .group(() => {
    router.post('topup', '#controllers/payments_controller.topup')
  })
  .prefix('payments')
  .use(middleware.auth())

// AI routes (athlete: recognize workout from image; trainer: generate from text)
router
  .group(() => {
    router.get('status', '#controllers/ai_controller.status')
    router.get('balance', '#controllers/ai_controller.balance')
    router.get('transactions', '#controllers/ai_controller.transactions')
    router.post('recognize-workout', '#controllers/ai_controller.recognizeWorkout')
    router.post('generate-workout', '#controllers/ai_controller.generateWorkout')
    router.post('chat', '#controllers/ai_controller.chat')
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
    router.delete('athletes/:athleteId', '#controllers/trainer_controller.removeAthlete')
    router.patch('athletes/:athleteId/nickname', '#controllers/trainer_controller.updateAthleteNickname');

    // Athlete data
    router.get('athletes/:athleteId/stats', '#controllers/trainer_controller.getAthleteStats');
    router.get('athletes/:athleteId/avatar', '#controllers/trainer_controller.getAthleteAvatar');
    router.get('athletes/:athleteId/periodization', '#controllers/trainer_controller.getAthletePeriodization');
    router.get('athletes/:athleteId/workouts', '#controllers/trainer_controller.getAthleteWorkouts');

    // Groups
    router.get('groups', '#controllers/trainer_controller.listGroups');
    router.post('groups', '#controllers/trainer_controller.createGroup');
    router.put('groups/:id', '#controllers/trainer_controller.updateGroup');
    router.delete('groups/:id', '#controllers/trainer_controller.deleteGroup');
    router.get('groups/:id/athletes', '#controllers/trainer_controller.getGroupAthletes');
    router.get('groups/:id/leaderboard', '#controllers/trainer_controller.getGroupLeaderboard');
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

    // Video calls
    router.post('calls', '#controllers/video_calls_controller.create');
    router.post('calls/:callId/end', '#controllers/video_calls_controller.end');
    router.get('calls', '#controllers/video_calls_controller.trainerHistory');
  })
  .prefix('trainer')
  .use([middleware.auth(), middleware.trainer()]);
