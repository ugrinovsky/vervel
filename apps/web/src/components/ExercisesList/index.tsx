import { useEffect, useState } from 'react';

export default function ExercisesList() {
  const [exercises, setExercises] = useState<Exercise[]>([]);

  // useEffect(() => {
  //   fetchExercises().then(setExercises).catch(console.error);
  // }, []);

  return (
    <div>
      <h2>Exercises:</h2>
      <ul>
        {exercises.map((ex) => (
          <li key={ex._id}>{ex.id}</li>
        ))}
      </ul>
    </div>
  );
}
