// ============================================================
// Deterministic garden layout: one plant per recorded day, arranged in
// 1–3 staggered depth rows so that up to 31 plants stay readable and clickable.
// Pure function → unit-tested. Percentages refer to the island SVG box
// (VW × VH); the island itself widens for crowded months (widthFactor).
// ============================================================
import { hashString } from '../plant/random';

export const ISLAND_VW = 900, ISLAND_VH = 260;
/** grass surface line of the wide island, in SVG units (same curve as Island.tsx) */
export const surfY = (x: number) => ISLAND_VH * 0.5 - Math.sin(((x - ISLAND_VW * 0.08) / (ISLAND_VW * 0.84)) * Math.PI) * 26;

export interface Slot { id: string; xPct: number; yPct: number; scale: number; row: number; depth: number }
export interface GardenLayout { slots: Slot[]; rows: number; widthFactor: number; plantFactor: number }

export function rowsFor(n: number): number { return n <= 8 ? 1 : n <= 18 ? 2 : 3; }

export function layoutGarden(items: { id: string; date: string }[]): GardenLayout {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const n = sorted.length;
  const rows = rowsFor(n);
  const widthFactor = 1 + Math.max(0, n - 12) * 0.045;   // 31 plants → island ≈1.86× wider, the stage pans
  const plantFactor = rows === 1 ? 0.165 : rows === 2 ? 0.145 : 0.125;
  // One even grid along X for ALL plants (neighbours are never in the same depth row),
  // rows cycle front/mid/back so blooms of x-neighbours sit at different heights.
  const rowBase = rows === 1 ? [8] : rows === 2 ? [1, 10] : [-1, 7, 14];   // % of VH below the surface
  const rowScale = rows === 1 ? [1] : rows === 2 ? [0.9, 1] : [0.88, 0.94, 1];
  const slots: Slot[] = sorted.map((it, i) => {
    const h = hashString(it.id) / 4294967296;
    const r = i % rows;
    const fx = (i + 0.5) / n;
    const xPct = 12 + 76 * fx + (h - 0.5) * (n > 1 ? Math.min(2.2, 20 / n) : 0);
    const x = (xPct / 100) * ISLAND_VW;
    const yPct = (surfY(x) / ISLAND_VH) * 100 + rowBase[r] + (h - 0.5) * 1.2;
    return { id: it.id, xPct, yPct, scale: rowScale[r] * (0.97 + h * 0.06), row: r, depth: yPct };
  });
  return { slots, rows, widthFactor, plantFactor };
}

/** Bloom centre in island pixels (for tests and hit-area checks). */
export function bloomCenterPx(slot: Slot, islandW: number, plantFactor: number, stemHeight = 0.78) {
  const islandH = (islandW * ISLAND_VH) / ISLAND_VW;
  const w = Math.min(190, Math.max(56, Math.min(islandW, 1100) * plantFactor)) * slot.scale;
  const h = w * 1.6;
  const baseX = (slot.xPct / 100) * islandW, baseY = (slot.yPct / 100) * islandH;
  const stemLen = (140 + 95 * stemHeight) / 320 * h;   // same proportions as Plant.tsx
  return { x: baseX, y: baseY - stemLen, bloomW: w * 0.34, plantW: w };
}
