// Shareable result card (§11): a 1080×1350 canvas — score header, the top ball drawn large,
// the top three levels of its merge ancestry from the mergeLog, the current land's story
// context, and a footer with the game name. Always rendered with the default Skylight-mote
// art (never a personalized face — that rule becomes load-bearing in Phase 1.5).
// Delivered via the Web Share API where available, otherwise downloaded as a PNG.

import { BRAND_NAME } from '../config/brand';
import { tierDef } from '../config/tiers';
import { drawPlaceholderCore, tierName } from '../render/coreArt';
import type { LandId, MergeEvent } from '../types';

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

export interface ShareCardInput {
  score: number;
  mode: 'classic' | 'journey';
  topTier: number;
  mergeLog: MergeEvent[];
  date?: Date;
  land?: { id: LandId; name: string; line: string };
  levelName?: string;
  stars?: number;
  /** Short URL for the footer. */
  url?: string;
}

/** Ancestry tree node: which merges produced a given ball id, up to `depth` levels. */
export interface AncestryNode {
  tier: number;
  children: [AncestryNode, AncestryNode] | null;
}

/** Rebuilds the top-N levels of a ball's merge ancestry from the recorded mergeLog (§11.3).
 *  The root is the latest merge that produced a ball of `topTier` (or the apex merge). */
export function buildAncestry(
  mergeLog: MergeEvent[],
  topTier: number,
  depth = 3,
): AncestryNode | null {
  const byResult = new Map<number, MergeEvent>();
  for (const m of mergeLog) if (m.resultId >= 0) byResult.set(m.resultId, m);
  const roots = mergeLog.filter((m) => m.tier === topTier);
  const root = roots[roots.length - 1];
  if (!root) return topTier > 0 ? { tier: topTier, children: null } : null;
  const build = (event: MergeEvent | undefined, tier: number, level: number): AncestryNode => {
    if (!event || level >= depth) return { tier, children: null };
    const childTier = event.tier - 1;
    return {
      tier: event.tier,
      children: [
        build(byResult.get(event.parentIds[0]), childTier, level + 1),
        build(byResult.get(event.parentIds[1]), childTier, level + 1),
      ],
    };
  };
  return build(root, topTier, 0);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws a default-art mote as a 2D gummy orb (a canvas approximation of the §9.3 look). */
export function drawMote(
  ctx: CanvasRenderingContext2D,
  tier: number,
  cx: number,
  cy: number,
  r: number,
): void {
  const def = tierDef(tier);
  ctx.save();
  // body
  const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  body.addColorStop(0, '#ffffffcc');
  body.addColorStop(0.35, def.rimColor + 'dd');
  body.addColorStop(1, def.rimColor);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // core art glowing inside (default Skylight-mote art only)
  const core = drawPlaceholderCore(tier, 256);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(core, cx - r * 0.72, cy - r * 0.72, r * 1.44, r * 1.44);
  ctx.globalAlpha = 1;
  // rim ring (accessibility style)
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = def.rimColor;
  ctx.globalAlpha = 0.8;
  if (def.rimStyle === 'dashed') ctx.setLineDash([r * 0.25, r * 0.18]);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  if (def.rimStyle === 'double') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // gloss
  const gloss = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.45,
    0,
    cx - r * 0.35,
    cy - r * 0.45,
    r * 0.5,
  );
  gloss.addColorStop(0, '#ffffffaa');
  gloss.addColorStop(1, '#ffffff00');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderShareCard(
  input: ShareCardInput,
  canvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const c = canvas ?? document.createElement('canvas');
  c.width = SHARE_CARD_WIDTH;
  c.height = SHARE_CARD_HEIGHT;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const W = SHARE_CARD_WIDTH;
  const H = SHARE_CARD_HEIGHT;

  // Background: soft pastel wash
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#fff3e2');
  bg.addColorStop(1, '#fbe0d6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Card
  ctx.fillStyle = '#fffdf9';
  roundedRect(ctx, 60, 60, W - 120, H - 120, 48);
  ctx.fill();

  // Header
  const date = input.date ?? new Date();
  ctx.fillStyle = '#6b5f66';
  ctx.font = '600 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${input.mode === 'journey' ? 'Journey' : 'Classic'} · ${date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`,
    W / 2,
    140,
  );
  ctx.fillStyle = '#2b2622';
  ctx.font = '700 128px system-ui, sans-serif';
  ctx.fillText(String(input.score), W / 2, 270);
  ctx.font = '600 36px system-ui, sans-serif';
  ctx.fillStyle = '#6b5f66';
  ctx.fillText(input.levelName ? input.levelName : 'points', W / 2, 322);
  if (input.stars !== undefined) {
    ctx.font = '64px system-ui, sans-serif';
    ctx.fillStyle = '#ffd700';
    const s = '★'.repeat(input.stars) + '☆'.repeat(Math.max(0, 3 - input.stars));
    ctx.fillText(s, W / 2, 395);
  }

  // Hero: top ball
  const heroY = 620;
  if (input.topTier > 0) {
    drawMote(ctx, input.topTier, W / 2, heroY, 200);
    ctx.fillStyle = '#2b2622';
    ctx.font = '700 48px system-ui, sans-serif';
    ctx.fillText(tierName(input.topTier), W / 2, heroY + 270);
  }

  // Ancestry tree (top 3 levels)
  const tree = buildAncestry(input.mergeLog, input.topTier, 3);
  if (tree?.children) {
    ctx.fillStyle = '#6b5f66';
    ctx.font = '600 30px system-ui, sans-serif';
    ctx.fillText('made from', W / 2, heroY + 330);
    const drawLevel = (nodes: AncestryNode[], y: number, r: number) => {
      const span = W - 240;
      const step = span / nodes.length;
      nodes.forEach((n, i) => {
        const x = 120 + step * (i + 0.5);
        drawMote(ctx, n.tier, x, y, r);
      });
      const next = nodes.flatMap((n) => n.children ?? []);
      if (next.length && next.length <= 8) drawLevel(next, y + r * 2.6, r * 0.62);
    };
    drawLevel(tree.children, heroY + 420, 70);
  }

  // Land story context
  if (input.land) {
    ctx.fillStyle = '#6b5f66';
    ctx.font = 'italic 30px system-ui, sans-serif';
    wrapText(ctx, `${input.land.name} — ${input.land.line}`, W / 2, H - 200, W - 260, 38);
  }

  // Footer
  ctx.fillStyle = '#2b2622';
  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText(BRAND_NAME, W / 2, H - 120);
  if (input.url) {
    ctx.fillStyle = '#6b5f66';
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText(input.url, W / 2, H - 82);
  }
  return c;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, y);
      line = w;
      y += lineHeight;
    } else line = test;
  }
  if (line) ctx.fillText(line, cx, y);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}

export interface ShareOutcome {
  method: 'share' | 'download';
}

/** Web Share API with a PNG-download fallback (§11). */
export async function shareCard(input: ShareCardInput): Promise<ShareOutcome> {
  const canvas = renderShareCard(input);
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], `${BRAND_NAME.toLowerCase()}-${input.score}.png`, {
    type: 'image/png',
  });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `${BRAND_NAME} — ${input.score} points` });
      return { method: 'share' };
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return { method: 'share' };
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { method: 'download' };
}
