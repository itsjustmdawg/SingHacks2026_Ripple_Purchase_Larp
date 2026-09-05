"use client";
import { useRef } from "react";
export function AgentCore({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={"core-scene " + (compact ? "core-compact" : "")}
      role="img"
      aria-label="Illustration of an autonomous agent core connecting discovery, policy, wallet and settlement"
      onPointerMove={(e) => {
        if (
          e.pointerType !== "mouse" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const b = e.currentTarget.getBoundingClientRect();
        ref.current?.style.setProperty(
          "--tilt-x",
          (e.clientX - b.left - b.width / 2) / 55 + "deg",
        );
        ref.current?.style.setProperty(
          "--tilt-y",
          -(e.clientY - b.top - b.height / 2) / 55 + "deg",
        );
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--tilt-x", "0deg");
        ref.current?.style.setProperty("--tilt-y", "0deg");
      }}
    >
      <div className="core-halo" />
      <div className="core-assembly">
        <div className="core-orbit orbit-one" />
        <div className="core-orbit orbit-two" />
        <div className="core-orbit orbit-three" />
        <div className="core-sphere">
          <div className="core-meridian" />
          <div className="core-meridian second" />
          <div className="core-equator" />
          <span className="core-center">
            L<span>AGENT ENGINE</span>
          </span>
        </div>
        <span className="core-node node-api">
          API
          <span className="node-light" />
        </span>
        <span className="core-node node-data">
          DATA
          <span className="node-light" />
        </span>
        <span className="core-node node-pay">
          PAY
          <span className="node-light" />
        </span>
        <span className="core-node node-wallet">
          WALLET
          <span className="node-light" />
        </span>
        <div className="core-crosshair cross-one">+</div>
        <div className="core-crosshair cross-two">+</div>
      </div>
      <div className="core-caption">
        <span className="status-dot" />
        AUTONOMOUS COMMERCE ENGINE <span>01 / 05</span>
      </div>
    </div>
  );
}
