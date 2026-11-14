// React wrapper around the Pixi Application + BoardScene. Owns the canvas, letterboxing,
// and pointer input (drag along the rail, release to drop). Everything gameplay-related is
// read from the SimClient's frames; this component never touches physics state directly.

import { useEffect, useId, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { BoardScene, type BoardSceneOptions } from './boardScene';
import { preloadCoreTextures } from './artStyles';
import type { SimClient } from '../hooks/SimClient';
import { PHYSICS } from '../config/physics';

export interface PixiStageProps extends BoardSceneOptions {
  client: SimClient;
  /** Called with the board-x to drop at. The stage does not decide whether a drop is legal;
   *  the sim does. */
  onDrop: (x: number) => void;
  interactive: boolean;
  onReady?: () => void;
  className?: string;
}

/** Board pixels per arrow-key press (Shift moves three times as far). */
const KEY_STEP_PX = 12;
const KEY_HELP = 'Left and right arrow keys move the drop guide. Space or Enter drops the mote.';
const KEY_HELP_VISIBLE =
  'pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit max-w-[90%] rounded-full bg-white/90 px-3 py-1 text-center text-xs text-ink-soft';

export function PixiStage(props: PixiStageProps) {
  const helpId = useId();
  const [focused, setFocused] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BoardScene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Create the Application once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const app = new Application();
    let scene: BoardScene | null = null;
    let unsubscribe: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      try {
        await app.init({
          preference: 'webgl',
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          backgroundAlpha: 0,
          resizeTo: host,
        });
        if (disposed) {
          app.destroy(true);
          return;
        }
        await preloadCoreTextures();
        if (disposed) {
          app.destroy(true);
          return;
        }
        host.appendChild(app.canvas);
        app.canvas.style.touchAction = 'none';
        const p = propsRef.current;
        scene = new BoardScene(app, {
          quality: p.quality,
          reduceMotion: p.reduceMotion,
          showTierNumbers: p.showTierNumbers,
          land: p.land,
          restored: p.restored,
          visual: p.visual,
          artStyle: p.artStyle,
          tierArt: p.tierArt,
          frameArtUrl: p.frameArtUrl,
          backgroundArtUrl: p.backgroundArtUrl,
          showFrame: p.showFrame,
          fog: p.fog,
          walls: p.walls,
        });
        sceneRef.current = scene;
        const doResize = () => scene?.resize(host.clientWidth, host.clientHeight);
        doResize();
        resizeObserver = new ResizeObserver(doResize);
        resizeObserver.observe(host);
        app.ticker.add((t) => scene?.update(t.deltaMS));
        unsubscribe = p.client.subscribe((snap, events) => scene?.applyFrame(snap, events));
        if (p.client.latest) scene.applyFrame(p.client.latest, []);
        p.onReady?.();
      } catch (err) {
        console.error('PixiStage failed to initialise', err);
      }
    })();

    return () => {
      disposed = true;
      unsubscribe?.();
      resizeObserver?.disconnect();
      scene?.destroy();
      sceneRef.current = null;
      if (app.renderer) app.destroy(true, { children: true });
    };
  }, []);

  // Re-subscribe if the client instance changes (new run).
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const unsub = props.client.subscribe((snap, events) => scene.applyFrame(snap, events));
    if (props.client.latest) scene.applyFrame(props.client.latest, []);
    return unsub;
  }, [props.client]);

  useEffect(() => {
    sceneRef.current?.setOptions({
      quality: props.quality,
      reduceMotion: props.reduceMotion,
      showTierNumbers: props.showTierNumbers,
      land: props.land,
      restored: props.restored,
      visual: props.visual,
      artStyle: props.artStyle,
      tierArt: props.tierArt,
      frameArtUrl: props.frameArtUrl,
      backgroundArtUrl: props.backgroundArtUrl,
      showFrame: props.showFrame,
      fog: props.fog,
      walls: props.walls,
    });
  }, [
    props.quality,
    props.reduceMotion,
    props.showTierNumbers,
    props.land,
    props.restored,
    props.visual,
    props.artStyle,
    props.tierArt,
    props.frameArtUrl,
    props.backgroundArtUrl,
    props.fog,
    props.walls,
    props.showFrame,
  ]);

  // Pointer input: drag anywhere on the board to position, release to drop (PRD §3.1).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dragging = false;
    let activePointer: number | null = null;
    let lastX = PHYSICS.boardWidthPx / 2;

    const toBoard = (ev: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      return sceneRef.current?.toBoard(ev.clientX - rect.left, ev.clientY - rect.top) ?? null;
    };

    const onDown = (ev: PointerEvent) => {
      if (!propsRef.current.interactive) return;
      if (activePointer !== null) return;
      const b = toBoard(ev);
      if (!b) return;
      activePointer = ev.pointerId;
      dragging = true;
      lastX = b.x;
      sceneRef.current?.setPointer(b);
      sceneRef.current?.setHeld(b.x, true);
      host.setPointerCapture(ev.pointerId);
    };
    const onMove = (ev: PointerEvent) => {
      const b = toBoard(ev);
      if (!b) return;
      sceneRef.current?.setPointer(b);
      if (dragging && ev.pointerId === activePointer) {
        lastX = b.x;
        sceneRef.current?.setHeld(b.x, true);
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== activePointer) return;
      activePointer = null;
      if (dragging) {
        dragging = false;
        sceneRef.current?.setHeld(lastX, false);
        if (propsRef.current.interactive) propsRef.current.onDrop(lastX);
      }
      try {
        host.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
    };
    const onLeave = () => {
      if (!dragging) sceneRef.current?.setPointer(null);
    };
    // Keyboard play (WCAG 2.1.1): arrows steer the drop guide, Space or Enter drops.
    let keyX = PHYSICS.boardWidthPx / 2;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (!propsRef.current.interactive || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      const step = ev.shiftKey ? KEY_STEP_PX * 3 : KEY_STEP_PX;
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        keyX = Math.min(
          PHYSICS.boardWidthPx,
          Math.max(0, keyX + (ev.key === 'ArrowLeft' ? -step : step)),
        );
        sceneRef.current?.setHeld(keyX, true);
      } else if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        if (ev.repeat) return;
        sceneRef.current?.setHeld(keyX, true);
        propsRef.current.onDrop(keyX);
      }
    };
    const onFocus = () => {
      setFocused(true);
      sceneRef.current?.setHeld(keyX, true);
    };
    const onBlur = () => {
      setFocused(false);
      if (!dragging) sceneRef.current?.setHeld(keyX, false);
    };
    host.addEventListener('keydown', onKeyDown);
    host.addEventListener('focus', onFocus);
    host.addEventListener('blur', onBlur);
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('keydown', onKeyDown);
      host.removeEventListener('focus', onFocus);
      host.removeEventListener('blur', onBlur);
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <>
      <div
        ref={hostRef}
        className={`${props.className ?? 'h-full w-full'} focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-gold/70`}
        tabIndex={0}
        role="application"
        aria-label="Game board"
        aria-describedby={helpId}
      />
      <p id={helpId} className={focused ? KEY_HELP_VISIBLE : 'sr-only'}>
        {KEY_HELP}
      </p>
    </>
  );
}
