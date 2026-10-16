"use client";

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Line, RoundedBox } from "@react-three/drei";
import { Group, MathUtils } from "three";

/** Decorative only: HTML remains the complete interface when WebGL is unavailable. */
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function Architecture({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const particles = useMemo(() => {
    // Deterministic positions prevent a hydration mismatch and visual reshuffling.
    const positions = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      positions[i * 3] = Math.sin(i * 127.1) * 7;
      positions[i * 3 + 1] = Math.cos(i * 311.7) * 4.5;
      positions[i * 3 + 2] = Math.sin(i * 74.7) * 3 - 4;
    }
    return positions;
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const update = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("pointermove", update, { passive: true });
    return () => window.removeEventListener("pointermove", update);
  }, [reducedMotion]);

  useFrame((state, delta) => {
    if (!group.current || reducedMotion) return;
    const smoothing = 1 - Math.exp(-delta * 2);
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, pointer.current.x * 0.12, smoothing);
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, pointer.current.y * 0.08, smoothing);
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.28) * 0.075;
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.8} />
      <pointLight position={[1, 4, 5]} color="#a6a0ff" intensity={18} />
      <pointLight position={[-4, -1, 2]} color="#70e5db" intensity={9} />
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[particles, 3]} /></bufferGeometry>
        <pointsMaterial color="#a4b6e0" size={0.025} transparent opacity={0.46} sizeAttenuation depthWrite={false} />
      </points>
      <Line points={[[-4.2, -1.3, -1], [-2.7, 1.4, -1], [1.5, 2, -1], [4, 0.4, -1], [3, -2.1, -1], [-0.3, -2.9, -1], [-4.2, -1.3, -1]]} color="#636189" lineWidth={0.6} transparent opacity={0.28} />
      <Line points={[[-2.7, 1.4, -1], [-0.3, -2.9, -1], [1.5, 2, -1], [3, -2.1, -1], [-2.7, 1.4, -1]]} color="#616a90" lineWidth={0.5} transparent opacity={0.18} />
      {([
        { position: [-3.5, 1.8, 0], size: 0.9, rotation: [0.45, 0.55, 0.35], color: "#9991fb" },
        { position: [3.25, -1.7, 0], size: 1.1, rotation: [0.65, 0.45, 0.25], color: "#78cfc9" },
        { position: [3.5, 2.4, -2], size: 0.43, rotation: [0.65, 0.4, 0.25], color: "#9991fb" },
        { position: [-3.8, -2.3, -2], size: 0.35, rotation: [0.45, 0.65, 0.4], color: "#78cfc9" },
      ] as const).map((node, index) => (
        <RoundedBox key={index} args={[node.size, node.size, node.size]} radius={0.09} smoothness={4} position={[...node.position]} rotation={[...node.rotation]}>
          <meshPhysicalMaterial color={node.color} metalness={0.2} roughness={0.15} transparent opacity={0.2} clearcoat={1} depthWrite={false} />
          <Edges color={node.color} transparent opacity={0.55} />
        </RoundedBox>
      ))}
    </group>
  );
}

export default function Background3D() {
  const [supported, setSupported] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    try {
      const testCanvas = document.createElement("canvas");
      const context = testCanvas.getContext("webgl2");
      setSupported(Boolean(context));
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setSupported(false); }
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div className="land-canvas" aria-hidden="true">
      <div className="land-canvas-fallback" />
      {supported && !contextLost && (
        <CanvasBoundary>
          <Canvas
            dpr={[1, 1.5]}
            frameloop={reducedMotion ? "demand" : "always"}
            camera={{ position: [0, 0, 9], fov: 45 }}
            gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
            onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); setContextLost(true); }, { once: true })}
          >
            <Architecture reducedMotion={reducedMotion} />
          </Canvas>
        </CanvasBoundary>
      )}
    </div>
  );
}
