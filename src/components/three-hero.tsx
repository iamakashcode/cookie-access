"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A live WebGL centrepiece: a rotating particle globe wrapped around a
 * wireframe core, with a few orbiting shards. It eases toward the pointer and
 * drifts/rotates as the page scrolls — real, interactive 3D behind the hero.
 * Fails silently if WebGL or motion isn't available.
 */
export function ThreeHero() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL → the CSS aurora still shows
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.z = 6.2;

    const group = new THREE.Group();
    group.position.x = 1.6; // sit under the right-hand column
    scene.add(group);

    // Particle globe
    const N = 1100;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const cA = new THREE.Color(0x6366f1); // indigo
    const cB = new THREE.Color(0x8b5cf6); // violet
    const cC = new THREE.Color(0x38bdf8); // sky
    for (let i = 0; i < N; i++) {
      const r = 2.3 + (Math.random() - 0.5) * 0.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const mix = Math.random();
      const c = mix < 0.5 ? cA.clone().lerp(cB, mix * 2) : cB.clone().lerp(cC, (mix - 0.5) * 2);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pgeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pmat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pgeo, pmat);
    group.add(points);

    // Wireframe core
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 1),
      new THREE.MeshBasicMaterial({ color: 0x818cf8, wireframe: true, transparent: true, opacity: 0.35 }),
    );
    group.add(core);

    // Orbiting shards
    const shards: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16 + Math.random() * 0.1),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8b5cf6 : 0x38bdf8, transparent: true, opacity: 0.7 }),
      );
      const a = (i / 5) * Math.PI * 2;
      m.position.set(Math.cos(a) * 3, Math.sin(a) * 1.6, Math.sin(a) * 3);
      shards.push(m);
      group.add(m);
    }

    // Pointer easing target
    const target = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      target.x = ny * 0.5;
      target.y = nx * 0.7;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let scrollY = window.scrollY;
    const onScroll = () => (scrollY = window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });

    let auto = 0;
    let mx = 0;
    let my = 0;
    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      auto += 0.0018;
      mx += (target.x - mx) * 0.05;
      my += (target.y - my) * 0.05;
      const sf = scrollY / Math.max(1, window.innerHeight); // scroll fraction

      group.rotation.x = mx + Math.sin(t * 0.3) * 0.05;
      group.rotation.y = auto + my;
      group.position.y = -sf * 1.4; // drift up on scroll
      group.rotation.z = sf * 0.35;
      const s = Math.max(0.6, 1 - sf * 0.25);
      group.scale.setScalar(s);

      core.rotation.x = t * 0.18;
      core.rotation.z = t * 0.12;
      shards.forEach((m, i) => {
        const a = t * (0.3 + i * 0.05) + i;
        m.position.set(Math.cos(a) * 3, Math.sin(a * 0.8) * 1.7, Math.sin(a) * 3);
        m.rotation.x = t;
        m.rotation.y = t;
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      pgeo.dispose();
      pmat.dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
      shards.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_65%_45%,black,transparent_80%)]"
    />
  );
}
