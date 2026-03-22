import { useExercises } from '@/hooks/useExercises';
import { useEffect, useState } from 'react';

export default function ExercisesList() {
  const { data: exercises, loading, error } = useExercises();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Exercises:</h2>
      <ul>
        {exercises.map((ex) => (
          <li key={ex.id}>{ex.id}</li>
        ))}
      </ul>
    </div>
  );
}
