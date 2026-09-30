// Decorative frame around the play area, themed per land (ART_AND_STORY_DIRECTION.md §3).
// Procedural Pixi drawing so it ships without assets; the admin screen can replace any land's
// frame with a custom image (drawn underneath the board, so the board still sits in the hole).

import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { PHYSICS } from '../config/physics';
import { LAND_PALETTES } from './palette';
import type { LandId } from '../types';

/** Logical margins (board px) the frame adds around the 400×600 board. */
export const FRAME = { side: 30, top: 34, bottom: 40 } as const;

export const FRAME_W = PHYSICS.boardWidthPx + FRAME.side * 2;
export const FRAME_H = PHYSICS.boardHeightPx + FRAME.top + FRAME.bottom;

const W = PHYSICS.boardWidthPx;
const H = PHYSICS.boardHeightPx;

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${f((n >> 16) & 0xff)}, ${f((n >> 8) & 0xff)}, ${f(n & 0xff)})`;
}

/** Small deterministic pseudo-random for decoration placement (render-only). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FrameTheme {
  base: string;
  edge: string;
  accent: string;
  decorate: (g: Graphics, rnd: () => number, restored: boolean) => void;
}

// --- decoration helpers -------------------------------------------------------------------

function flower(g: Graphics, x: number, y: number, r: number, petal: string, centre: string): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.circle(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.6).fill({ color: petal });
  }
  g.circle(x, y, r * 0.5).fill({ color: centre });
}

function leaf(g: Graphics, x: number, y: number, len: number, angle: number, color: string): void {
  const dx = Math.cos(angle) * len;
  const dy = Math.sin(angle) * len;
  const nx = -dy * 0.35;
  const ny = dx * 0.35;
  g.moveTo(x, y)
    .quadraticCurveTo(x + dx / 2 + nx, y + dy / 2 + ny, x + dx, y + dy)
    .quadraticCurveTo(x + dx / 2 - nx, y + dy / 2 - ny, x, y)
    .fill({ color });
}

function grassTuft(g: Graphics, x: number, y: number, h: number, color: string): void {
  for (let i = -1; i <= 1; i++) {
    g.moveTo(x, y)
      .quadraticCurveTo(x + i * h * 0.35, y - h * 0.6, x + i * h * 0.5, y - h)
      .stroke({ width: 2, color, alpha: 0.9, cap: 'round' });
  }
}

function shell(g: Graphics, x: number, y: number, r: number, color: string): void {
  g.moveTo(x, y);
  g.arc(x, y, r, Math.PI, Math.PI * 2).fill({ color });
  for (let i = 1; i < 4; i++) {
    const a = Math.PI + (i / 4) * Math.PI;
    g.moveTo(x, y)
      .lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      .stroke({ width: 1, color: darken(color, 0.3), alpha: 0.7 });
  }
}

function mushroom(g: Graphics, x: number, y: number, s: number, cap: string): void {
  g.roundRect(x - s * 0.18, y - s * 0.6, s * 0.36, s * 0.6, s * 0.1).fill({ color: '#f3e9dc' });
  g.ellipse(x, y - s * 0.6, s * 0.5, s * 0.3).fill({ color: cap });
  g.circle(x - s * 0.15, y - s * 0.68, s * 0.07).fill({ color: '#fff' });
  g.circle(x + s * 0.18, y - s * 0.62, s * 0.05).fill({ color: '#fff' });
}

function star(g: Graphics, x: number, y: number, r: number, color: string): void {
  g.star(x, y, 4, r, r * 0.35).fill({ color, alpha: 0.9 });
}

// --- themes ---------------------------------------------------------------------------------

const THEMES: Partial<Record<LandId, FrameTheme>> = {
  'sunmeadow-hollow': {
    base: '#c99a5b',
    edge: '#8f6a3b',
    accent: '#f4b860',
    decorate(g, rnd, restored) {
      // wood grain
      for (let i = 0; i < 26; i++) {
        const y = -FRAME.top + 6 + i * ((H + FRAME.top + FRAME.bottom) / 26);
        g.moveTo(-FRAME.side + 4, y)
          .lineTo(-FRAME.side + 4 + FRAME.side * 0.6 * rnd(), y + 2)
          .stroke({ width: 1, color: '#8f6a3b', alpha: 0.35 });
        g.moveTo(W + FRAME.side - 4, y + 5)
          .lineTo(W + FRAME.side - 4 - FRAME.side * 0.6 * rnd(), y + 7)
          .stroke({ width: 1, color: '#8f6a3b', alpha: 0.35 });
      }
      // fence posts along the top
      for (let x = -FRAME.side + 10; x < W + FRAME.side; x += 38) {
        g.roundRect(x, -FRAME.top + 8, 8, FRAME.top - 12, 2).fill({ color: '#e8cfa4' });
      }
      g.rect(-FRAME.side, -FRAME.top + 14, FRAME_W, 3).fill({ color: '#e8cfa4' });
      // sun in the corner
      g.circle(W + FRAME.side - 18, -FRAME.top + 16, 11).fill({
        color: restored ? '#ffd76a' : '#d9cfb8',
      });
      // wildflowers + grass along the bottom
      const petals = restored
        ? ['#f28bb0', '#ffd23f', '#9bd770', '#f4b860']
        : ['#bdb6ad', '#c9c2b8', '#b9beb1', '#c5bcb0'];
      for (let x = -FRAME.side + 12; x < W + FRAME.side - 8; x += 22 + rnd() * 10) {
        grassTuft(g, x, H + FRAME.bottom - 6, 10 + rnd() * 10, restored ? '#7fb35c' : '#a9ad9f');
        if (rnd() > 0.45)
          flower(
            g,
            x + 6,
            H + FRAME.bottom - 16 - rnd() * 8,
            3.2,
            petals[Math.floor(rnd() * petals.length)],
            '#fff3c4',
          );
      }
    },
  },
  'driftmoor-cove': {
    base: '#9fb5c4',
    edge: '#5f7f95',
    accent: '#7fa6c2',
    decorate(g, rnd, restored) {
      // rope border
      for (let y = -FRAME.top + 10; y < H + FRAME.bottom - 10; y += 9) {
        g.circle(-FRAME.side + 12, y, 3.2).stroke({ width: 1.5, color: '#e6d9c2', alpha: 0.9 });
        g.circle(W + FRAME.side - 12, y + 4, 3.2).stroke({
          width: 1.5,
          color: '#e6d9c2',
          alpha: 0.9,
        });
      }
      // driftwood planks top
      for (let x = -FRAME.side + 6; x < W + FRAME.side - 6; x += 44) {
        g.roundRect(x, -FRAME.top + 8, 40, 12, 4).fill({ color: '#cbb59a', alpha: 0.9 });
      }
      // lighthouse
      const lx = W + FRAME.side - 20;
      g.moveTo(lx - 6, -FRAME.top + 30)
        .lineTo(lx + 6, -FRAME.top + 30)
        .lineTo(lx + 4, -FRAME.top + 6)
        .lineTo(lx - 4, -FRAME.top + 6)
        .fill({ color: '#f4efe6' });
      g.rect(lx - 4, -FRAME.top + 14, 8, 4).fill({ color: '#d2544a' });
      g.circle(lx, -FRAME.top + 5, 3).fill({ color: restored ? '#ffe28a' : '#cfcac0' });
      // waves + shells along the bottom
      for (let x = -FRAME.side; x < W + FRAME.side; x += 20) {
        g.moveTo(x, H + FRAME.bottom - 14)
          .quadraticCurveTo(x + 5, H + FRAME.bottom - 20, x + 10, H + FRAME.bottom - 14)
          .quadraticCurveTo(x + 15, H + FRAME.bottom - 8, x + 20, H + FRAME.bottom - 14)
          .stroke({ width: 2, color: restored ? '#eaf4fb' : '#d5dbe0', alpha: 0.9 });
      }
      for (let i = 0; i < 7; i++)
        shell(
          g,
          -FRAME.side + 20 + i * 62 + rnd() * 20,
          H + FRAME.bottom - 4,
          5 + rnd() * 3,
          restored ? '#f7dfe1' : '#d8d3d0',
        );
    },
  },
  whisperwood: {
    base: '#7d9c6b',
    edge: '#4f6b44',
    accent: '#79a86f',
    decorate(g, rnd, restored) {
      // bark texture
      for (let i = 0; i < 40; i++) {
        const y = -FRAME.top + rnd() * (H + FRAME.top + FRAME.bottom);
        g.moveTo(-FRAME.side + 3, y)
          .lineTo(-FRAME.side + 3 + rnd() * 18, y + 12 + rnd() * 20)
          .stroke({ width: 1.5, color: '#4f6b44', alpha: 0.45 });
        const y2 = -FRAME.top + rnd() * (H + FRAME.top + FRAME.bottom);
        g.moveTo(W + FRAME.side - 3, y2)
          .lineTo(W + FRAME.side - 3 - rnd() * 18, y2 + 12 + rnd() * 20)
          .stroke({ width: 1.5, color: '#4f6b44', alpha: 0.45 });
      }
      // leafy canopy along the top
      const greens = restored
        ? ['#9ec59b', '#79a86f', '#b7d7a8']
        : ['#b9c0b4', '#a7ada2', '#c6cbc0'];
      for (let x = -FRAME.side; x < W + FRAME.side; x += 14) {
        leaf(
          g,
          x,
          -FRAME.top + 6,
          16 + rnd() * 10,
          Math.PI / 2 + (rnd() - 0.5) * 0.9,
          greens[Math.floor(rnd() * greens.length)],
        );
      }
      // moss + mushrooms along the bottom
      g.rect(-FRAME.side, H + FRAME.bottom - 12, FRAME_W, 12).fill({
        color: restored ? '#6f9a5e' : '#9aa394',
        alpha: 0.9,
      });
      for (let i = 0; i < 6; i++)
        mushroom(
          g,
          -FRAME.side + 30 + i * 70 + rnd() * 25,
          H + FRAME.bottom - 10,
          12 + rnd() * 6,
          restored ? '#e0736b' : '#bfb3b0',
        );
      // drifting light motes
      for (let i = 0; i < 12; i++) {
        const side = rnd() > 0.5 ? -FRAME.side + 6 + rnd() * 18 : W + FRAME.side - 6 - rnd() * 18;
        g.circle(side, -FRAME.top + 40 + rnd() * (H - 40), 1.5 + rnd() * 1.5).fill({
          color: restored ? '#fff6c8' : '#e5e5e0',
          alpha: 0.9,
        });
      }
    },
  },
};

function genericTheme(land: LandId): FrameTheme {
  const p = LAND_PALETTES[land];
  return {
    base: p.ground,
    edge: darken(p.ground, 0.35),
    accent: p.accent,
    decorate(g, rnd, restored) {
      for (let i = 0; i < 10; i++) {
        star(
          g,
          -FRAME.side + 8 + rnd() * 14,
          -FRAME.top + 20 + rnd() * (H + 20),
          3 + rnd() * 2,
          restored ? p.accent : '#d8d4d0',
        );
        star(
          g,
          W + FRAME.side - 8 - rnd() * 14,
          -FRAME.top + 20 + rnd() * (H + 20),
          3 + rnd() * 2,
          restored ? p.accent : '#d8d4d0',
        );
      }
      for (let x = -FRAME.side + 10; x < W + FRAME.side; x += 26) {
        g.circle(x, H + FRAME.bottom - 12, 5 + rnd() * 4).fill({
          color: restored ? p.accent : '#cfcac4',
          alpha: 0.7,
        });
      }
    },
  };
}

export class LandFrame {
  readonly container = new Container();
  private readonly gfx = new Graphics();
  private readonly imageHolder = new Container();
  private image: Sprite | null = null;
  private land: LandId | null = null;
  private restored = true;
  private imageUrl: string | undefined;

  constructor() {
    this.container.addChild(this.imageHolder, this.gfx);
  }

  /** Redraws when land/restored/image change. Coordinates: board-local (0,0 = board top-left). */
  set(land: LandId, restored: boolean, imageUrl?: string): void {
    if (land === this.land && restored === this.restored && imageUrl === this.imageUrl) return;
    this.land = land;
    this.restored = restored;
    this.imageUrl = imageUrl;
    this.draw();
    this.loadImage(imageUrl);
  }

  private draw(): void {
    const g = this.gfx;
    g.clear();
    if (!this.land) return;
    const theme = THEMES[this.land] ?? genericTheme(this.land);
    const base = this.restored ? theme.base : darken(theme.base, 0.1);
    // frame body with a hole for the board (drawn as four bands)
    g.roundRect(-FRAME.side, -FRAME.top, FRAME_W, FRAME_H, 22).fill({ color: base });
    g.roundRect(-FRAME.side + 3, -FRAME.top + 3, FRAME_W - 6, FRAME_H - 6, 20).stroke({
      width: 2,
      color: '#ffffff',
      alpha: 0.25,
    });
    g.rect(0, 0, W, H).fill({ color: '#000000', alpha: 0.18 }); // inner shadow under the board bg
    g.rect(0, 0, W, H).stroke({ width: 3, color: theme.edge, alpha: 0.9 });
    const rnd = seeded(this.land.length * 7919);
    theme.decorate(g, rnd, this.restored);
    this.gfx.visible = !this.image;
  }

  private loadImage(url?: string): void {
    this.image?.destroy();
    this.image = null;
    this.imageHolder.removeChildren();
    this.gfx.visible = true;
    if (!url) return;
    const wanted = url;
    Assets.load<Texture>({ src: url, alias: `frame#${url}`, loadParser: 'loadTextures' })
      .then((tex) => {
        if (this.imageUrl !== wanted) return;
        const s = new Sprite(tex);
        s.position.set(-FRAME.side, -FRAME.top);
        s.width = FRAME_W;
        s.height = FRAME_H;
        this.image = s;
        this.imageHolder.addChild(s);
        this.gfx.visible = false;
      })
      .catch((err) => console.warn('Frame art failed to load; using the procedural frame.', err));
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
