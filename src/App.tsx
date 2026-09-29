import { useEffect, useRef, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { HomeScreen } from './components/HomeScreen';
import { JourneyMap } from './journey/JourneyMap';
import { levelById } from './journey/levels';
import { SettingsPanel } from './components/SettingsPanel';
import { ToastHost } from './components/Toast';
import { useSettingsHydration } from './hooks/useSettingsHydration';
import { useUi } from './store/uiStore';
import { useGameStore } from './store/gameStore';
import type { SimLevelConfig } from './engine/types';

declare global {
  interface Window {
    __smoosh?: { game: typeof useGameStore; ui: typeof useUi };
  }
}
if (import.meta.env.DEV) window.__smoosh = { game: useGameStore, ui: useUi };

function ShaderDebug() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { mountShaderTest } = await import('./render/debug/ShaderTestScene');
      if (!cancelled && ref.current) await mountShaderTest(ref.current);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <div ref={ref} className="p-4" />;
}

function Router({ debugSim, tuningPanel }: { debugSim?: SimLevelConfig; tuningPanel?: boolean }) {
  const screen = useUi((s) => s.screen);
  const navigate = useUi((s) => s.navigate);
  switch (screen.name) {
    case 'home':
      return <HomeScreen />;
    case 'classic':
      return (
        <GameScreen
          key={screen.runKey}
          mode="classic"
          seed={screen.seed}
          debugSim={debugSim}
          tuningPanel={tuningPanel}
        />
      );
    case 'journey':
      return <JourneyMap />;
    case 'level': {
      const level = levelById(screen.levelId);
      if (!level) return <JourneyMap />;
      return <GameScreen key={screen.runKey} mode="journey" level={level} />;
    }
    case 'settings':
      return <SettingsPanel onClose={() => navigate(screen.from)} />;
  }
}

export default function App() {
  useSettingsHydration();
  const [debug] = useState(() =>
    import.meta.env.DEV ? new URLSearchParams(location.search).get('debug') : null,
  );
  if (debug === 'shader') return <ShaderDebug />;
  // ?debug=fill (dev only): all tier-5 drops so a run overflows quickly in smoke tests.
  const debugSim: SimLevelConfig | undefined =
    debug === 'fill' ? { spawnBag: [0, 0, 0, 0, 20] } : undefined;
  return (
    <div className="mx-auto h-full w-full max-w-[560px]">
      <Router debugSim={debugSim} tuningPanel={debug === 'tuning'} />
      <ToastHost />
    </div>
  );
}
