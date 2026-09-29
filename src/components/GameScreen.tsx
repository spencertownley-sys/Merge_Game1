// The core gameplay screen (Classic for now; Journey wiring lands in Step 6): the Pixi board
// letterboxed in the middle, HUD strips above and below, pause overlay, results on game over.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixiStage } from '../render/PixiStage';
import { SimClient } from '../hooks/SimClient';
import { useGameStore } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';
import { HUDBottom, HUDTop } from './HUD';

export interface GameScreenProps {
  seed?: number;
}

export function GameScreen({ seed: seedProp }: GameScreenProps) {
  const seed = useMemo(
    () => seedProp ?? (Date.now() ^ (Math.floor(performance.now()) << 8)) >>> 0,
    [seedProp],
  );
  const clientRef = useRef<SimClient | null>(null);
  const [client, setClient] = useState<SimClient | null>(null);
  const [stageReady, setStageReady] = useState(false);
  const simpleGraphics = useSettings((s) => s.simpleGraphics);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const showTierNumbers = useSettings((s) => s.showTierNumbers);
  const gameOver = useGameStore((s) => s.gameOver);
  const paused = useGameStore((s) => s.paused);
  const beginRun = useGameStore((s) => s.beginRun);
  const applyFrame = useGameStore((s) => s.applyFrame);

  useEffect(() => {
    const c = new SimClient();
    clientRef.current = c;
    setClient(c);
    beginRun('classic', seed, null, 0);
    const unsub = c.subscribe(applyFrame);
    c.start({ seed });
    return () => {
      unsub();
      c.destroy();
      clientRef.current = null;
    };
  }, [seed, beginRun, applyFrame]);

  const onDrop = useCallback((x: number) => clientRef.current?.drop(x), []);

  return (
    <div className="flex h-full w-full flex-col">
      <HUDTop />
      <div className="relative min-h-0 flex-1">
        {client && (
          <PixiStage
            client={client}
            onDrop={onDrop}
            interactive={!gameOver && !paused}
            quality={simpleGraphics ? 'simple' : 'high'}
            reduceMotion={reduceMotion}
            showTierNumbers={showTierNumbers}
            onReady={() => setStageReady(true)}
          />
        )}
        {!stageReady && (
          <div className="absolute inset-0 flex items-center justify-center text-ink-soft">
            Warming up…
          </div>
        )}
      </div>
      <HUDBottom />
    </div>
  );
}
