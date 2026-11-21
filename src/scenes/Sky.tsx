// ============================================================
// Sky — full-screen Canvas 2D starfield: 3 parallax layers, twinkle,
// nebula haze, drifting dust, shooting stars and a warp effect on zoom.
// ============================================================
import React, { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { mulberry32 } from '../plant/random';

interface Star { x: number; y: number; z: number; r: number; tw: number; ph: number }
interface Dust { x: number; y: number; vx: number; vy: number; r: number; a: number }
interface Shoot { x: number; y: number; vx: number; vy: number; life: number; max: number }

export function Sky() {
  const ref = useRef<HTMLCanvasElement>(null);
  const warpAt = useStore((s) => s.warpAt);
  const warpDir = useStore((s) => s.warpDir);
  const profileReduced = useStore((s) => s.profile?.reducedMotion ?? false);
  // honour the OS/browser preference as well as the in-app setting
  const reduced = profileReduced || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const warpRef = useRef({ at: 0, dir: 1 });
  warpRef.current = { at: warpAt, dir: warpDir };
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const rand = mulberry32(20261119);
    let W = 0, H = 0, dpr = 1;
    const stars: Star[] = [];
    const dust: Dust[] = [];
    const shoots: Shoot[] = [];
    let raf = 0;
    let last = performance.now();
    let scrollOff = 0;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      // layout viewport (never wider than the document → no phantom horizontal overflow on mobile)
      W = document.documentElement.clientWidth || window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars.length = 0; dust.length = 0;
      const n = Math.round((W * H) / 3200);
      for (let i = 0; i < n; i++) {
        const z = 0.25 + rand() * 0.75;
        stars.push({ x: rand() * W, y: rand() * H, z, r: 0.4 + z * 1.3 * (rand() < 0.08 ? 1.8 : 1), tw: 0.5 + rand() * 2, ph: rand() * Math.PI * 2 });
      }
      for (let i = 0; i < Math.round(W / 40); i++) dust.push({ x: rand() * W, y: rand() * H, vx: (rand() - 0.5) * 4, vy: -3 - rand() * 6, r: 0.8 + rand() * 1.6, a: 0.15 + rand() * 0.35 });
    };
    resize();
    window.addEventListener('resize', resize);
    const onMove = (e: PointerEvent) => { mouse.current = { x: (e.clientX / W - 0.5) * 2, y: (e.clientY / H - 0.5) * 2 }; };
    window.addEventListener('pointermove', onMove);
    const onScroll = (e: Event) => { const t = e.target as HTMLElement; if (t && typeof t.scrollTop === 'number' && t.classList?.contains('months-scroll')) scrollOff = t.scrollTop; };
    document.addEventListener('scroll', onScroll, true);

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = now / 1000;
      // background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#070a1c'); bg.addColorStop(0.55, '#0e1333'); bg.addColorStop(1, '#1a1b46');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // nebula haze
      const nebulas = [
        { x: W * 0.2, y: H * 0.3, r: W * 0.45, c: 'rgba(120, 90, 180, 0.16)' },
        { x: W * 0.8, y: H * 0.7, r: W * 0.4, c: 'rgba(200, 120, 160, 0.12)' },
        { x: W * 0.55, y: H * 0.1, r: W * 0.3, c: 'rgba(90, 120, 200, 0.10)' },
      ];
      for (const n of nebulas) {
        const g = ctx.createRadialGradient(n.x + Math.sin(t * 0.05) * 20, n.y + Math.cos(t * 0.04) * 15, 0, n.x, n.y, n.r);
        g.addColorStop(0, n.c); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      // warp
      const w = warpRef.current;
      const elapsed = (performance.now() - w.at) / 1000;
      const warp = w.at && elapsed < 1.1 ? Math.sin(Math.min(1, elapsed / 1.1) * Math.PI) : 0;
      const cx = W / 2, cy = H / 2;
      const mx = mouse.current.x, my = mouse.current.y;
      // stars
      for (const s of stars) {
        const px = s.x - mx * 14 * s.z;
        const py = ((s.y - scrollOff * 0.12 * s.z) % H + H) % H - my * 10 * s.z;
        const tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(t * s.tw + s.ph);
        const alpha = (0.35 + s.z * 0.65) * tw;
        if (warp > 0) {
          const dx = px - cx, dy = py - cy;
          const k = 1 + warp * 0.6 * s.z * w.dir;
          const ex = cx + dx * k, ey = cy + dy * k;
          ctx.strokeStyle = `rgba(246, 239, 226, ${alpha * 0.9})`;
          ctx.lineWidth = s.r * 1.2;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(246, 239, 226, ${alpha})`;
          ctx.beginPath(); ctx.arc(px, py, s.r, 0, Math.PI * 2); ctx.fill();
          if (s.r > 1.6) {
            ctx.fillStyle = `rgba(246, 215, 141, ${alpha * 0.25})`;
            ctx.beginPath(); ctx.arc(px, py, s.r * 3, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      // dust
      if (!reduced) {
        for (const d of dust) {
          d.x += d.vx * dt; d.y += d.vy * dt;
          if (d.y < -5) { d.y = H + 5; d.x = rand() * W; }
          if (d.x < -5) d.x = W + 5; if (d.x > W + 5) d.x = -5;
          ctx.fillStyle = `rgba(246, 215, 141, ${d.a * (0.6 + 0.4 * Math.sin(t * 2 + d.x))})`;
          ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        }
        // shooting stars
        if (rand() < dt * 0.12 && shoots.length < 2) {
          const sx = rand() * W * 0.8 + W * 0.1, sy = rand() * H * 0.4;
          shoots.push({ x: sx, y: sy, vx: 500 + rand() * 300, vy: 180 + rand() * 140, life: 0, max: 0.8 + rand() * 0.5 });
        }
        for (let i = shoots.length - 1; i >= 0; i--) {
          const s = shoots[i];
          s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
          const a = Math.sin(Math.min(1, s.life / s.max) * Math.PI);
          const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.18, s.y - s.vy * 0.18);
          g.addColorStop(0, `rgba(255, 250, 230, ${a})`); g.addColorStop(1, 'rgba(255,250,230,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.18, s.y - s.vy * 0.18); ctx.stroke();
          if (s.life > s.max) shoots.splice(i, 1);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove); document.removeEventListener('scroll', onScroll, true); };
  }, [reduced]);

  return <canvas id="sky" ref={ref} aria-hidden="true" />;
}
