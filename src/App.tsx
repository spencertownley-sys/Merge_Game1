import { useEffect, useRef, useState } from 'react';
import { GameScreen } from './components/GameScreen';

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

export default function App() {
  const [debug] = useState(() =>
    import.meta.env.DEV ? new URLSearchParams(location.search).get('debug') : null,
  );
  if (debug === 'shader') return <ShaderDebug />;
  return <GameScreen />;
}
