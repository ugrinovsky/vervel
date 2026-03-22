import { useState } from 'react';

export function useImageLoad() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return {
    loaded,
    error,
    onLoad: () => setLoaded(true),
    onError: () => setError(true),
  };
}
