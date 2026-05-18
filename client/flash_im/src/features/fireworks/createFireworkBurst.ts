import type { FireworkBurst, FireworkParticle } from './types';

const PALETTE = [
  '#ff4fd8',
  '#6ee7ff',
  '#fff05a',
  '#7cff6b',
  '#ff8a3d',
  '#9f7bff',
  '#ffffff',
  '#37ffbd',
];

type CreateFireworkBurstParams = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  power?: number;
};

export function createFireworkBurst({
  id,
  x,
  y,
  width,
  height,
  power = 1,
}: CreateFireworkBurstParams): FireworkBurst {
  const baseColor = pick(PALETTE);
  const particleCount = Math.round(randomBetween(34, 54) * power);
  const maxDistance = Math.min(width, height) * randomBetween(0.18, 0.32);
  const duration = Math.round(randomBetween(900, 1280) * Math.max(0.9, power));

  return {
    id,
    x,
    y,
    color: baseColor,
    duration,
    particles: Array.from({ length: particleCount }, (_, index) =>
      createParticle(index, maxDistance, power),
    ),
  };
}

function createParticle(
  index: number,
  maxDistance: number,
  power: number,
): FireworkParticle {
  const angle = (Math.PI * 2 * index) / randomBetween(28, 42) + randomBetween(-0.18, 0.18);

  return {
    id: `particle-${index}`,
    angle,
    color: pick(PALETTE),
    delay: randomBetween(0, 120),
    distance: randomBetween(maxDistance * 0.42, maxDistance) * power,
    size: randomBetween(4, 8.5),
    spin: randomBetween(-180, 180),
  };
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
