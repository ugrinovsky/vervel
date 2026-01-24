import { Exercise } from '../../types/Exercise';

export default [
  {
    id: 'bench_press',
    keywords: ['жим', 'жим лёжа', 'bench'],
    zones: ['chests', 'triceps', 'shoulders'],
    intensity: 0.7,
  },
  {
    id: 'squat',
    keywords: ['присед'],
    zones: ['legs', 'glutes', 'core'],
    intensity: 0.8,
  },
  {
    id: 'burpee',
    keywords: ['берпи'],
    zones: ['legs', 'core', 'shoulders'],
    intensity: 0.9,
  },
] as Exercise[];
