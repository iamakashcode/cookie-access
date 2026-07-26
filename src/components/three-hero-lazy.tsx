"use client";

import dynamic from "next/dynamic";

// Load the WebGL scene as its own chunk, client-side only — keeps Three.js out
// of the initial bundle and off the server, so first paint stays fast.
const ThreeHero = dynamic(
  () => import("./three-hero").then((m) => m.ThreeHero),
  { ssr: false },
);

export function ThreeHeroLazy() {
  return <ThreeHero />;
}
