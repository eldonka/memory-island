// ============================================================
// Demo "photographs" — illustrated scenes painted on a canvas so the demo
// never ships anyone's real photos. They are placeholders: replace them with
// real pictures of your own day for the final demonstration.
// ============================================================
import { mulberry32 } from '../plant/random';

export type Scene = 'autumn_park' | 'office_night' | 'party' | 'rain_city' | 'sea_morning' | 'mountain_sunset' | 'snow_evening';

function grainAndVignette(ctx: CanvasRenderingContext2D, W: number, H: number, rand: () => number, grain = 0.06) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 255 * grain;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function sky(ctx: CanvasRenderingContext2D, W: number, H: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace(')', `,${a})`).replace('rgb(', 'rgba('));
  g.addColorStop(1, color.replace(')', ',0)').replace('rgb(', 'rgba('));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function paintScene(scene: Scene, variant: number, W = 1200, H = 900): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const rand = mulberry32(1000 + variant * 7919);

  switch (scene) {
    case 'autumn_park': {
      sky(ctx, W, H, [[0, '#f3c98a'], [0.5, '#e7a35d'], [0.75, '#b8763f'], [1, '#5f3d24']]);
      glow(ctx, W * (0.3 + rand() * 0.4), H * 0.35, H * 0.5, 'rgb(255,220,150)', 0.6);
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      for (let i = 0; i < 5; i++) {
        const x = W * (0.08 + i * 0.2 + rand() * 0.1), tw = 18 + rand() * 20;
        ctx.fillStyle = '#3d2615'; ctx.fillRect(x - tw / 2, H * 0.35, tw, H * 0.4);
        for (let k = 0; k < 26; k++) {
          const px = x + (rand() - 0.5) * 300, py = H * 0.2 + rand() * H * 0.3;
          ctx.fillStyle = ['#e8862f', '#f2b134', '#c9502a', '#f5d07a', '#a8441f'][Math.floor(rand() * 5)];
          ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(px, py, 22 + rand() * 40, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (let k = 0; k < 160; k++) {
        ctx.fillStyle = ['#e8862f', '#f2b134', '#c9502a', '#f5d07a'][Math.floor(rand() * 4)];
        ctx.beginPath(); ctx.ellipse(rand() * W, H * 0.72 + rand() * H * 0.28, 6 + rand() * 8, 3 + rand() * 4, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'office_night': {
      sky(ctx, W, H, [[0, '#0b1230'], [0.6, '#152147'], [1, '#0a0f24']]);
      const cols = 6, rows = 4, gx = W * 0.08, gy = H * 0.08, cw = (W * 0.84) / cols, ch = (H * 0.5) / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const lit = rand() < 0.25;
        ctx.fillStyle = lit ? `rgba(255,214,150,${0.5 + rand() * 0.4})` : '#1a2a55';
        ctx.fillRect(gx + i * cw + 6, gy + j * ch + 6, cw - 12, ch - 12);
      }
      ctx.fillStyle = '#2a2f45'; ctx.fillRect(0, H * 0.66, W, H * 0.34);
      ctx.fillStyle = '#0f1530'; ctx.fillRect(W * 0.3, H * 0.4, W * 0.4, H * 0.28);
      ctx.fillStyle = '#9fc7ff'; ctx.fillRect(W * 0.32, H * 0.42, W * 0.36, H * 0.22);
      glow(ctx, W * 0.5, H * 0.55, H * 0.35, 'rgb(120,170,255)', 0.45);
      glow(ctx, W * 0.85, H * 0.6, H * 0.25, 'rgb(255,200,120)', 0.5);
      ctx.fillStyle = '#d9d9e0'; ctx.fillRect(W * 0.12, H * 0.72, W * 0.12, H * 0.02); ctx.fillRect(W * 0.78, H * 0.75, W * 0.06, H * 0.06);
      break;
    }
    case 'party': {
      sky(ctx, W, H, [[0, '#2a1246'], [0.5, '#4a1b6b'], [1, '#1b0b2e']]);
      for (let s = 0; s < 3; s++) {
        const y0 = H * (0.12 + s * 0.1);
        for (let i = 0; i < 14; i++) { const x = (W / 13) * i, y = y0 + Math.sin(i * 0.9 + s) * 30; glow(ctx, x, y, 40, 'rgb(255,220,140)', 0.9); ctx.fillStyle = '#fff6d6'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); }
      }
      for (let k = 0; k < 260; k++) {
        ctx.fillStyle = ['#ff6b9d', '#ffd166', '#06d6a0', '#4cc9f0', '#f94144', '#ffffff'][Math.floor(rand() * 6)];
        ctx.globalAlpha = 0.7 + rand() * 0.3;
        const x = rand() * W, y = rand() * H, r = 4 + rand() * 9;
        if (rand() < 0.5) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); } else { ctx.save(); ctx.translate(x, y); ctx.rotate(rand() * Math.PI); ctx.fillRect(-r, -r / 2, r * 2, r); ctx.restore(); }
      }
      ctx.globalAlpha = 1;
      for (let b = 0; b < 5; b++) { const x = W * (0.1 + rand() * 0.8), y = H * (0.5 + rand() * 0.3); ctx.fillStyle = ['#ff6b9d', '#ffd166', '#4cc9f0'][b % 3]; ctx.beginPath(); ctx.ellipse(x, y, 60, 75, 0, 0, Math.PI * 2); ctx.fill(); glow(ctx, x - 20, y - 25, 50, 'rgb(255,255,255)', 0.5); }
      break;
    }
    case 'rain_city': {
      sky(ctx, W, H, [[0, '#4b5668'], [0.5, '#6b7585'], [1, '#2f3542']]);
      for (let i = 0; i < 9; i++) {
        const w = 60 + rand() * 140, h = H * (0.25 + rand() * 0.4), x = (W / 9) * i + rand() * 30;
        ctx.fillStyle = '#242a36'; ctx.fillRect(x, H * 0.75 - h, w, h);
        for (let k = 0; k < 8; k++) if (rand() < 0.4) { ctx.fillStyle = 'rgba(255,205,140,0.7)'; ctx.fillRect(x + 10 + rand() * (w - 24), H * 0.75 - h + 10 + rand() * (h - 30), 10, 14); }
      }
      ctx.fillStyle = '#3a4150'; ctx.fillRect(0, H * 0.75, W, H * 0.25);
      for (let k = 0; k < 12; k++) glow(ctx, rand() * W, H * (0.78 + rand() * 0.15), 50 + rand() * 60, rand() < 0.5 ? 'rgb(255,170,90)' : 'rgb(90,200,220)', 0.35);
      ctx.strokeStyle = 'rgba(220,230,255,0.35)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 400; k++) { const x = rand() * W, y = rand() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 28 + rand() * 20); ctx.stroke(); }
      break;
    }
    case 'sea_morning': {
      sky(ctx, W, H, [[0, '#9fb8e8'], [0.4, '#f1c9d4'], [0.55, '#fbe3c3'], [0.56, '#5f9fb8'], [1, '#2f6f8f']]);
      const sx = W * (0.3 + rand() * 0.4);
      glow(ctx, sx, H * 0.5, H * 0.45, 'rgb(255,235,190)', 0.9);
      ctx.fillStyle = '#fff2cf'; ctx.beginPath(); ctx.arc(sx, H * 0.5, 52, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      for (let k = 0; k < 24; k++) { const y = H * (0.58 + k * 0.017); ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.02 + k) * 4); ctx.stroke(); }
      glow(ctx, sx, H * 0.75, H * 0.2, 'rgb(255,220,170)', 0.5);
      break;
    }
    case 'mountain_sunset': {
      sky(ctx, W, H, [[0, '#2b1b4e'], [0.45, '#c2507a'], [0.7, '#f3a15c'], [1, '#f9d68a']]);
      glow(ctx, W * 0.55, H * 0.7, H * 0.5, 'rgb(255,200,120)', 0.8);
      const layers = ['#5a2b5e', '#3e1f48', '#2a1535'];
      layers.forEach((col, li) => {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 60) ctx.lineTo(x, H * (0.55 + li * 0.12) - Math.abs(Math.sin(x * 0.004 + li + variant)) * H * 0.22 + rand() * 10);
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      });
      for (let k = 0; k < 120; k++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.6})`; ctx.beginPath(); ctx.arc(rand() * W, rand() * H * 0.4, 1 + rand() * 1.5, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'snow_evening': {
      sky(ctx, W, H, [[0, '#0c1a3a'], [0.6, '#1d3561'], [1, '#2f4a78']]);
      ctx.fillStyle = '#dfe8f5'; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      const hx = W * 0.5, hw = W * 0.34, hy = H * 0.72, hh = H * 0.3;
      ctx.fillStyle = '#2a2532'; ctx.fillRect(hx - hw / 2, hy - hh, hw, hh);
      ctx.beginPath(); ctx.moveTo(hx - hw / 2 - 30, hy - hh); ctx.lineTo(hx, hy - hh - H * 0.18); ctx.lineTo(hx + hw / 2 + 30, hy - hh); ctx.closePath(); ctx.fillStyle = '#e9f0f8'; ctx.fill();
      for (let i = 0; i < 2; i++) { const wx = hx - hw * 0.25 + i * hw * 0.5; glow(ctx, wx, hy - hh * 0.55, 90, 'rgb(255,200,120)', 0.8); ctx.fillStyle = '#ffd89a'; ctx.fillRect(wx - 28, hy - hh * 0.55 - 36, 56, 72); }
      for (let k = 0; k < 500; k++) { ctx.fillStyle = `rgba(255,255,255,${0.4 + rand() * 0.6})`; ctx.beginPath(); ctx.arc(rand() * W, rand() * H, 1 + rand() * 3, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
  }
  grainAndVignette(ctx, W, H, rand, scene === 'rain_city' || scene === 'office_night' ? 0.1 : 0.06);
  return c;
}

export function sceneBlob(scene: Scene, variant: number): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const c = paintScene(scene, variant);
  const dataUrl = c.toDataURL('image/jpeg', 0.86);
  return new Promise((resolve) => c.toBlob((b) => resolve({ blob: b!, dataUrl, width: c.width, height: c.height }), 'image/jpeg', 0.9));
}
