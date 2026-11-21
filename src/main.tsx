import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useStore } from './state/store';

// development-only hooks for automated UI checks (not shipped in production builds)
if (import.meta.env.DEV) {
  (window as any).__mi = {
    store: useStore,
    seedStress: async (yearMonth: string, count: number) => {
      const { seedStress } = await import('./data/seed');
      const st = useStore.getState();
      const list = await seedStress(yearMonth, count, st.lang);
      let saved = 0;
      for (const m of list) { try { await st.upsertMemory(m); saved++; } catch (e) { console.warn('seedStress skip', (e as Error).message); } }
      return saved;
    },
  };
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
