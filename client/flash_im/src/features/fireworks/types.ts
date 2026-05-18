export type FireworkParticle = {
  id: string;
  angle: number;
  color: string;
  delay: number;
  distance: number;
  size: number;
  spin: number;
};

export type FireworkBurst = {
  id: string;
  x: number;
  y: number;
  color: string;
  duration: number;
  particles: FireworkParticle[];
};
