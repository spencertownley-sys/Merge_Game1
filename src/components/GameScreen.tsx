// The core gameplay screen for Classic and Journey: the Pixi board letterboxed in the
// middle, HUD strips above and below, pause overlay, results on game over. In Journey mode a
// LevelRuntime (journey/levelRuntime.ts) tracks goals/constraints from the same frames.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixiStage } from '../render/PixiStage';
import { SimClient } from '../hooks/SimClient';
import { useGameStore } from '../store/gameStore';
import { useSettings } from '../store/settingsStore';
import { newRunSeed, useUi } from '../store/uiStore';
import { useJourney, isLandRestored } from '../store/journeyStore';
import { runRepository } from '../persistence/RunRepository';
import { LevelRuntime, toSimLevelConfig, type LevelStatus } from '../journey/levelRuntime';
import { LEVELS } from '../journey/levels';
import { tierName } from '../render/coreArt';
import { HUDBottom, HUDTop } from './HUD';
import { PauseOverlay } from './PauseOverlay';
import { ResultsScreen } from './ResultsScreen';
import { SettingsPanel } from './SettingsPanel';
import type { LevelDef } from '../types';
import type { SimLevelConfig } from '../engine/types';
import { shareCard } from '../share/shareCard';
import { landDef } from '../journey/lands';
import { DevTuningPanel } from './DevTuningPanel';
import { ShareCardPreview } from './ShareCardPreview';

export type GameScreenProps =
  | {
      mode: 'classic';
      seed: number;
      /** Dev/test-only sim overrides (e.g. ?debug=fill). */
      debugSim?: SimLevelConfig;
      /** Dev-only physics tuning panel (?debug=tuning). */
      tuningPanel?: boolean;
    }
  | { mode: 'journey'; level: LevelDef };

function statusChanged(a: LevelStatus | null, b: LevelStatus): boolean {
  if (!a) return true;
  if (a.outcome !== b.outcome || a.dropsRemaining !== b.dropsRemaining) return true;
  if (Math.ceil(a.secondsRemaining ?? 0) !== Math.ceil(b.secondsRemaining ?? 0)) return true;
  return a.goals.some((g, i) => g.current !== b.goals[i]?.current || g.done !== b.goals[i]?.done);
}

export function GameScreen(props: GameScreenProps) {
  const level = props.mode === 'journey' ? props.level : null;
  const seed = props.mode === 'classic' ? props.seed : props.level.seed;
  const debugSim = props.mode === 'classic' ? props.debugSim : undefined;
  const simLevel = useMemo(() => (level ? toSimLevelConfig(level) : debugSim), [level, debugSim]);
  const clientRef = useRef<SimClient | null>(null);
  const runtimeRef = useRef<LevelRuntime | null>(null);
  const [client, setClient] = useState<SimClient | null>(null);
  const [stageReady, setStageReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [levelStatus, setLevelStatus] = useState<LevelStatus | null>(null);
  const [savedResult, setSavedResult] = useState<{ isNewBest: boolean } | null>(null);
  const simpleGraphics = useSettings((s) => s.simpleGraphics);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const showTierNumbers = useSettings((s) => s.showTierNumbers);
  const gameOver = useGameStore((s) => s.gameOver);
  const paused = useGameStore((s) => s.paused);
  const score = useGameStore((s) => s.score);
  const topTier = useGameStore((s) => s.topTier);
  const bestScore = useGameStore((s) => s.bestScore);
  const beginRun = useGameStore((s) => s.beginRun);
  const applyFrame = useGameStore((s) => s.applyFrame);
  const setPaused = useGameStore((s) => s.setPaused);
  const setBestScore = useGameStore((s) => s.setBestScore);
  const navigate = useUi((s) => s.navigate);
  const toast = useUi((s) => s.toast);
  const journeyProgress = useJourney((s) => s.progress);
  const recordJourney = useJourney((s) => s.record);

  const mode = props.mode;
  const levelId = level?.id ?? null;
  const runEnded = gameOver || (levelStatus !== null && levelStatus.outcome !== 'playing');

  // Boot the worker + run.
  useEffect(() => {
    const c = new SimClient();
    clientRef.current = c;
    setClient(c);
    beginRun(mode, seed, levelId, 0);
    const rt = level ? new LevelRuntime(level, tierName) : null;
    runtimeRef.current = rt;
    let lastStatus: LevelStatus | null = null;
    const unsub = c.subscribe((snap, events) => {
      applyFrame(snap, events);
      if (rt) {
        const st = rt.applyFrame(snap, events);
        if (statusChanged(lastStatus, st)) {
          lastStatus = st;
          setLevelStatus(st);
          if (st.outcome !== 'playing') c.pause(); // freeze the board for the results card
        }
      }
    });
    c.onError = (m) => toast(`Physics error: ${m}`, 'error');
    c.start({ seed, level: simLevel });
    let live = true;
    runRepository
      .getBestScore(mode, levelId ?? undefined)
      .then((b) => live && setBestScore(b))
      .catch(() => {});
    return () => {
      live = false;
      unsub();
      c.destroy();
      clientRef.current = null;
      runtimeRef.current = null;
    };
  }, [mode, seed, levelId, level, simLevel, beginRun, applyFrame, setBestScore, toast]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !useGameStore.getState().gameOver) {
        clientRef.current?.pause();
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [setPaused]);

  // Save the run (and journey progress) once when it ends.
  useEffect(() => {
    if (!runEnded || savedResult) return;
    const s = useGameStore.getState();
    let live = true;
    (async () => {
      try {
        await runRepository.saveRun({
          mode,
          levelId: levelId ?? undefined,
          seed: s.seed,
          score: s.score,
          topTier: s.topTier,
          mergeLog: s.mergeLog,
        });
        if (level && levelStatus?.outcome === 'won') {
          await recordJourney(level.id, { stars: levelStatus.stars, score: s.score });
        }
      } catch (err) {
        console.warn('Failed to save run', err);
        toast('Could not save this run.', 'error');
      }
      if (live) setSavedResult({ isNewBest: s.score > s.bestScore && s.score > 0 });
    })();
    return () => {
      live = false;
    };
  }, [runEnded, savedResult, mode, levelId, level, levelStatus, recordJourney, toast]);

  const onDrop = useCallback((x: number) => clientRef.current?.drop(x), []);
  const pause = () => {
    clientRef.current?.pause();
    setPaused(true);
  };
  const resume = () => {
    setShowSettings(false);
    clientRef.current?.resume();
    setPaused(false);
  };

  const nextLevel = level ? LEVELS.find((l) => l.id === level.id + 1) : undefined;
  const landRestoredNow = level ? isLandRestored(level.land, journeyProgress) : false;
  const [sharing, setSharing] = useState(false);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const s = useGameStore.getState();
      const land = level ? landDef(level.land) : undefined;
      const outcome = await shareCard({
        score: s.score,
        mode,
        topTier: s.topTier,
        mergeLog: s.mergeLog,
        land: land
          ? { id: land.id, name: land.name, line: landRestoredNow ? land.restored : land.blurb }
          : undefined,
        levelName: level ? `${level.id}. ${level.name}` : undefined,
        stars: level ? levelStatus?.stars : undefined,
        url: typeof location !== 'undefined' ? location.host : undefined,
      });
      if (outcome.method === 'download') setCardBlob(outcome.blob);
    } catch (err) {
      console.warn('Share failed', err);
      toast('Could not create the share card.', 'error');
    } finally {
      setSharing(false);
    }
  };
  const won = levelStatus?.outcome === 'won';

  return (
    <div className="relative flex h-full w-full flex-col">
      <HUDTop>
        <button
          type="button"
          className="btn-ghost min-w-11 px-3 text-xl"
          onClick={pause}
          aria-label="Pause"
          disabled={runEnded || paused}
          data-testid="pause"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="currentColor">
            <rect x="3" y="2" width="4.5" height="14" rx="1.5" />
            <rect x="10.5" y="2" width="4.5" height="14" rx="1.5" />
          </svg>
        </button>
      </HUDTop>
      {level && levelStatus && (
        <div
          className="flex flex-wrap items-center gap-2 px-4 pb-1 text-xs font-semibold"
          data-testid="goal-strip"
        >
          {levelStatus.goals.map((g, i) => (
            <span
              key={i}
              className={`rounded-full px-3 py-1 ${g.done ? 'bg-gold/30 text-ink' : 'bg-ink/5 text-ink-soft'}`}
            >
              {g.done ? '✓ ' : ''}
              {g.label}
              {g.showCounter ? ` ${g.current}/${g.target}` : ''}
            </span>
          ))}
          {levelStatus.dropsRemaining !== null && (
            <span
              className={`ml-auto rounded-full px-3 py-1 tabular-nums ${levelStatus.dropsRemaining <= 5 ? 'bg-coral/20 text-coral' : 'bg-ink/5 text-ink-soft'}`}
            >
              ⬇ {levelStatus.dropsRemaining}
            </span>
          )}
          {levelStatus.secondsRemaining !== null && (
            <span
              className={`ml-auto rounded-full px-3 py-1 tabular-nums ${levelStatus.secondsRemaining <= 10 ? 'bg-coral/20 text-coral' : 'bg-ink/5 text-ink-soft'}`}
            >
              ⏱ {Math.ceil(levelStatus.secondsRemaining)}s
            </span>
          )}
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        {client && (
          <PixiStage
            client={client}
            onDrop={onDrop}
            interactive={!runEnded && !paused && !showSettings}
            quality={simpleGraphics ? 'simple' : 'high'}
            reduceMotion={reduceMotion}
            showTierNumbers={showTierNumbers}
            land={level?.land}
            restored={level ? landRestoredNow : true}
            onReady={() => setStageReady(true)}
          />
        )}
        {props.mode === 'classic' && props.tuningPanel && (
          <DevTuningPanel onChange={(t) => clientRef.current?.applyTuning(t)} />
        )}
        {!stageReady && (
          <div
            className="absolute inset-0 flex items-center justify-center text-ink-soft"
            data-testid="warming-up"
          >
            Warming up…
          </div>
        )}
      </div>
      <HUDBottom />

      {paused && !runEnded && !showSettings && (
        <PauseOverlay
          onResume={resume}
          onSettings={() => setShowSettings(true)}
          onQuit={() => navigate(level ? { name: 'journey' } : { name: 'home' })}
        />
      )}
      {showSettings && <SettingsPanel overlay onClose={() => setShowSettings(false)} />}
      {cardBlob && <ShareCardPreview blob={cardBlob} onClose={() => setCardBlob(null)} />}
      {runEnded && savedResult && (
        <ResultsScreen
          mode={mode}
          score={score}
          bestScore={bestScore}
          topTier={topTier}
          isNewBest={savedResult.isNewBest}
          passed={level ? won : undefined}
          stars={level ? levelStatus?.stars : undefined}
          levelName={level ? `${level.id}. ${level.name}` : undefined}
          primaryLabel={
            level ? (won ? (nextLevel ? 'Next level' : 'Back to map') : 'Try again') : 'Play again'
          }
          onPrimary={() => {
            if (!level)
              return navigate({ name: 'classic', seed: newRunSeed(), runKey: Date.now() });
            if (won && nextLevel)
              return navigate({ name: 'level', levelId: nextLevel.id, runKey: Date.now() });
            if (won) return navigate({ name: 'journey' });
            navigate({ name: 'level', levelId: level.id, runKey: Date.now() });
          }}
          onRetry={
            level && won
              ? () => navigate({ name: 'level', levelId: level.id, runKey: Date.now() })
              : undefined
          }
          onShare={onShare}
          onMenu={() => navigate(level ? { name: 'journey' } : { name: 'home' })}
        >
          {level && !won && levelStatus?.failReason && (
            <p className="text-sm text-ink-soft">
              {levelStatus.failReason === 'drops' &&
                'Out of drops. Every Keeper needs a second try.'}
              {levelStatus.failReason === 'time' && 'Out of time. The light will wait for you.'}
              {levelStatus.failReason === 'board' &&
                'The pile grew too tall. Try spreading the motes out.'}
            </p>
          )}
          {level && won && landRestoredNow && (
            <p className="text-sm font-semibold text-ink">✨ Light has returned to this land.</p>
          )}
        </ResultsScreen>
      )}
    </div>
  );
}
