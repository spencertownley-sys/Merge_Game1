// The Journey intro story: steps through its panels, finishes once, and skips cleanly.
import { createElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRO_PANELS, IntroCutscene } from '../../src/journey/IntroCutscene';
import { DEFAULT_SETTINGS } from '../../src/store/settingsStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const q = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;

function mount(onDone: () => void, autoAdvanceMs = 0) {
  act(() =>
    root.render(createElement(IntroCutscene, { reduceMotion: true, onDone, autoAdvanceMs })),
  );
}

describe('IntroCutscene', () => {
  it('tells the story across six painted panels, with Wick speaking last', () => {
    expect(INTRO_PANELS.map((p) => p.art)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(INTRO_PANELS.at(-1)?.speaker).toBe('wick');
    for (const p of INTRO_PANELS) expect(p.text.length).toBeGreaterThan(20);
  });

  it('first-run flag defaults to unseen', () => {
    expect(DEFAULT_SETTINGS.introSeen).toBe(false);
  });

  it('advances panel by panel and finishes exactly once on the last tap', () => {
    const onDone = vi.fn();
    mount(onDone);
    for (let i = 0; i < INTRO_PANELS.length; i++) {
      expect(q('intro-text')?.textContent).toBe(INTRO_PANELS[i]!.text);
      act(() => q('intro-next')!.click());
    }
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => q('intro-next')!.click());
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('skip ends the story straight away', () => {
    const onDone = vi.fn();
    mount(onDone);
    act(() => q('intro-skip')!.click());
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('moves on by itself but waits on the last panel', () => {
    vi.useFakeTimers();
    try {
      const onDone = vi.fn();
      mount(onDone, 1000);
      for (let i = 1; i < INTRO_PANELS.length; i++) {
        act(() => vi.advanceTimersByTime(1000));
        expect(q('intro-text')?.textContent).toBe(INTRO_PANELS[i]!.text);
      }
      act(() => vi.advanceTimersByTime(10_000));
      expect(onDone).not.toHaveBeenCalled();
      expect(q('intro-next')?.getAttribute('aria-label')).toBe('Begin the journey');
    } finally {
      vi.useRealTimers();
    }
  });
});
