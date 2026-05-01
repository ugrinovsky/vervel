/**
 * Normalizes short API zone keys (from ExerciseCatalog) and legacy seeder keys
 * to the canonical camelCase keys that match BODY_ZONE_TO_API.
 */
export const ZONE_NORMALIZE: Record<string, string> = {
  back: 'backMuscles',
  trapezoids: 'backMuscles',
  traps: 'backMuscles',
  legs: 'legMuscles',
  calves: 'calfMuscles',
  glutes: 'glutealMuscles',
  core: 'abdominalPress',
  abs: 'abdominalPress',
  obliques: 'obliquePress',
  chest: 'chests',
  arms: 'biceps',
};
