import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { levelById } from './journey/levels';
import { SettingsPanel } from './components/SettingsPanel';
import { ToastHost } from './components/Toast';
import { useSettingsHydration } from './hooks/useSettingsHydration';
import { useUi } from './store/uiStore';

// Pixi, Rapier and the journey content only load when a run or the map is opened, so the
// home screen paints from a small React-only chunk (Lighthouse FCP/LCP).
const GameScreen = lazy(() =>
  import('./components/GameScreen').then((m) => ({ default: m.GameScreen })),
);
const JourneyMap = lazy(() =>
  import('./journey/JourneyMap').then((m) => ({ default: m.JourneyMap })),
);
import { useGameStore } from './store/gameStore';
import type { SimLevelConfig } from './engine/types';

declare global {
  interface Window {
    __smoosh?: { game: typeof useGameStore; ui: typeof useUi };
  }
}
/** Dev-only hooks (?debug=..., window.__smoosh). Also kept in the e2e build via .env.e2e. */
const DEBUG_HOOKS = import.meta.env.DEV || import.meta.env.VITE_DEBUG_HOOKS === '1';
if (DEBUG_HOOKS) window.__smoosh = { game: useGameStore, ui: useUi };

function ShaderDebug() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!DEBUG_HOOKS) return; // debug harnesses are tree-shaken out of production
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

function DeterminismDebug() {
  const [result, setResult] = useState<string>('running…');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!DEBUG_HOOKS) return;
      try {
        const { runDeterminismCheck } = await import('./render/debug/DeterminismHarness');
        const r = await runDeterminismCheck();
        if (cancelled) return;
        window.__determinism = r;
        setResult(JSON.stringify(r, null, 2));
      } catch (err) {
        window.__determinism = { error: String(err) };
        setResult(`error: ${String(err)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <pre className="p-4 text-xs" data-testid="determinism-result">
      {result}
    </pre>
  );
}

export default function App() {
  useSettingsHydration();
  const [debug] = useState(() =>
    DEBUG_HOOKS ? new URLSearchParams(location.search).get('debug') : null,
  );
  if (debug === 'shader') return <ShaderDebug />;
  if (debug === 'determinism') return <DeterminismDebug />;
  // ?debug=fill (dev only): all tier-5 drops so a run overflows quickly in smoke tests.
  const debugSim: SimLevelConfig | undefined =
    debug === 'fill' ? { spawnBag: [0, 0, 0, 0, 20] } : undefined;
  return (
    <div className="mx-auto h-full w-full max-w-[560px]">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-ink-soft">Loading…</div>
        }
      >
        <Router debugSim={debugSim} tuningPanel={debug === 'tuning'} />
      </Suspense>
      <ToastHost />
    </div>
  );
}
