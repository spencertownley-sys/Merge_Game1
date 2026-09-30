// React wrapper around the Pixi Application + BoardScene. Owns the canvas, letterboxing,
// and pointer input (drag along the rail, release to drop). Everything gameplay-related is
// read from the SimClient's frames; this component never touches physics state directly.

import { useEffect, useRef } from 'react';
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

export function PixiStage(props: PixiStageProps) {
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
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', onUp);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <div ref={hostRef} className={props.className ?? 'h-full w-full'} />;
}
