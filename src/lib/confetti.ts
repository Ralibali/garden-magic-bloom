/**
 * Lättviktskonfetti utan beroenden.
 * Respekterar prefers-reduced-motion och städar upp efter sig själv.
 */

const BRAND_COLORS = ['#38795c', '#a1502b', '#f2a516', '#d9f99d', '#84cc16', '#fef3c7'];

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vr: number;
  size: number; color: string;
  life: number;
};

let active = false;

export function fireConfetti(options?: { particleCount?: number; durationMs?: number }) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (active) return;
  active = true;

  const particleCount = options?.particleCount ?? 140;
  const durationMs = options?.durationMs ?? 2400;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); active = false; return; }
  ctx.scale(dpr, dpr);

  const width = window.innerWidth;
  const height = window.innerHeight;
  const origins = [
    { x: width * 0.22, y: height * 0.62, dir: 1 },
    { x: width * 0.78, y: height * 0.62, dir: -1 },
  ];

  const particles: Particle[] = [];
  for (let i = 0; i < particleCount; i++) {
    const origin = origins[i % origins.length];
    const angle = (-Math.PI / 2) + origin.dir * (Math.random() * 0.55) + (Math.random() - 0.5) * 0.35;
    const speed = 7 + Math.random() * 8;
    particles.push({
      x: origin.x, y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.25,
      size: 5 + Math.random() * 6,
      color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
      life: 1,
    });
  }

  const start = performance.now();
  let raf = 0;

  const tick = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    let alive = false;
    for (const p of particles) {
      p.vy += 0.14;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = Math.max(0, 1 - elapsed / durationMs);
      if (p.life <= 0 || p.y > height + 20) continue;
      alive = true;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.6);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      ctx.restore();
    }
    if (alive && elapsed < durationMs) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
      active = false;
    }
  };

  raf = requestAnimationFrame(tick);
}
