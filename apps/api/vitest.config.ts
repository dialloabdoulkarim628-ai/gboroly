import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Latence réseau des tests d'intégration DB (Supabase) — au-delà des 5 s par défaut.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
