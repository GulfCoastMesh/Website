"use client";

import { useEffect, useRef } from "react";

export type PacketCategory = "advert" | "message" | "route" | "control";

type CoreScopeMessage = { type?: unknown; data?: unknown };
type CoreScopePacket = { payload_type?: unknown; packet?: unknown };
type Point = { x: number; y: number };
type Trail = {
  category: PacketCategory;
  start: Point;
  control: Point;
  end: Point;
  bornAt: number;
  duration: number;
  intensity: number;
};
type Anchor = Point & { phase: number; radius: number };
type ReplayEvent = { offsetMs: number; payloadType: number };

const DEFAULT_ANALYZER_URL = "wss://analyzer.gulfcoastmesh.org";
const DESKTOP_TRAIL_LIMIT = 28;
const MOBILE_TRAIL_LIMIT = 16;
const IDLE_REPLAY_DELAY_MS = 0;

export const TRAFFIC_COLORS: Record<"light" | "dark", Record<PacketCategory, string>> = {
  light: {
    advert: "#0d9488", // Gulf Coast Mesh teal
    message: "#2563eb", // Comms blue
    route: "#7c3aed", // Routing violet
    control: "#d97706", // Telemetry amber
  },
  dark: {
    advert: "#00f5d4", // Electric neon cyan-teal
    message: "#38bdf8", // Vivid electric sky blue
    route: "#c084fc", // Radiant electric violet
    control: "#fbbf24", // Vibrant luminous amber-gold
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const packetCategory = (message: CoreScopeMessage): PacketCategory | null => {
  if (message.type !== "packet" || !isRecord(message.data)) return null;

  const data = message.data as CoreScopePacket;
  let payloadType = data.payload_type;
  if (payloadType === undefined && isRecord(data.packet)) {
    payloadType = data.packet.payload_type;
  }

  const parsedType =
    typeof payloadType === "number"
      ? payloadType
      : typeof payloadType === "string"
        ? Number.parseInt(payloadType, 10)
        : Number.NaN;

  if (parsedType === 4) return "advert";
  if ([2, 5, 6].includes(parsedType)) return "message";
  if ([8, 9].includes(parsedType)) return "route";
  return "control";
};

const payloadCategory = (payloadType: number): PacketCategory => {
  if (payloadType === 4) return "advert";
  if ([2, 5, 6].includes(payloadType)) return "message";
  if ([8, 9].includes(payloadType)) return "route";
  return "control";
};

const randomEdgePoint = (side: number): Point => {
  switch (side) {
    case 0:
      return { x: -0.04, y: Math.random() };
    case 1:
      return { x: 1.04, y: Math.random() };
    case 2:
      return { x: Math.random(), y: -0.04 };
    default:
      return { x: Math.random(), y: 1.04 };
  }
};

const createTrail = (category: PacketCategory, now: number): Trail => {
  const startSide = Math.floor(Math.random() * 4);
  let endSide = Math.floor(Math.random() * 4);
  if (endSide === startSide) endSide = (endSide + 2) % 4;

  return {
    category,
    start: randomEdgePoint(startSide),
    control: {
      x: 0.25 + Math.random() * 0.5,
      y: 0.2 + Math.random() * 0.6,
    },
    end: randomEdgePoint(endSide),
    bornAt: now,
    duration: 2600 + Math.random() * 1200,
    intensity: 1,
  };
};

const pointOnCurve = (trail: Trail, position: number): Point => {
  const inverse = 1 - position;
  return {
    x:
      inverse * inverse * trail.start.x +
      2 * inverse * position * trail.control.x +
      position * position * trail.end.x,
    y:
      inverse * inverse * trail.start.y +
      2 * inverse * position * trail.control.y +
      position * position * trail.end.y,
  };
};

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const anchors: Anchor[] = Array.from({ length: 8 }, () => ({
      x: 0.08 + Math.random() * 0.84,
      y: 0.08 + Math.random() * 0.84,
      phase: Math.random() * Math.PI * 2,
      radius: 0.8 + Math.random() * 1.2,
    }));
    let trails: Trail[] = [];
    let animationFrame = 0;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempt = 0;
    let idleReplayTimer: number | null = null;
    let replayAbortController: AbortController | null = null;
    let replayEvents: ReplayEvent[] = [];
    let replayDuration = 0;
    let replayActive = false;
    let replayStartedAt = 0;
    let replayIndex = 0;
    let replayLoadPromise: Promise<boolean> | null = null;
    let demoTimer: number | null = null;
    let isDark = document.documentElement.classList.contains("dark");
    let isStopped = false;
    let shouldConnect = !reducedMotion.matches && !document.hidden;
    let lastFrameAt = 0;
    let lastLivePacketAt = performance.now();

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const addTrail = (category: PacketCategory) => {
      const limit =
        window.innerWidth < 640 ? MOBILE_TRAIL_LIMIT : DESKTOP_TRAIL_LIMIT;

      if (trails.length >= limit) {
        const existing = [...trails]
          .reverse()
          .find((trail) => trail.category === category);
        if (existing) {
          existing.intensity = Math.min(1.8, existing.intensity + 0.16);
          existing.duration = Math.min(2800, existing.duration + 80);
          return;
        }
        trails.shift();
      }

      trails.push(createTrail(category, performance.now()));
    };

    const draw = (now: number) => {
      if (isStopped || reducedMotion.matches) return;

      animationFrame = window.requestAnimationFrame(draw);
      const minimumFrameDelay = trails.length > 0 ? 16 : 80;
      if (now - lastFrameAt < minimumFrameDelay) return;
      lastFrameAt = now;

      if (replayActive && replayEvents.length > 0 && replayDuration > 0) {
        let elapsed = now - replayStartedAt;
        if (elapsed >= replayDuration) {
          replayStartedAt +=
            Math.floor(elapsed / replayDuration) * replayDuration;
          replayIndex = 0;
          elapsed = now - replayStartedAt;
        }
        while (
          replayIndex < replayEvents.length &&
          replayEvents[replayIndex].offsetMs <= elapsed
        ) {
          addTrail(payloadCategory(replayEvents[replayIndex].payloadType));
          replayIndex += 1;
        }
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      const theme = isDark ? "dark" : "light";

      // Subtle drifting anchor dots (faint mesh nodes in the background)
      context.fillStyle = isDark
        ? "rgba(148, 163, 184, 0.28)"
        : "rgba(51, 65, 85, 0.16)";
      for (const anchor of anchors) {
        const driftX = Math.sin(now / 12000 + anchor.phase) * 3;
        const driftY = Math.cos(now / 15000 + anchor.phase) * 3;
        context.beginPath();
        context.arc(
          anchor.x * width + driftX,
          anchor.y * height + driftY,
          anchor.radius,
          0,
          Math.PI * 2
        );
        context.fill();
      }

      // Render active packet trails
      trails = trails.filter((trail) => now - trail.bornAt < trail.duration);
      for (const trail of trails) {
        const lifetime = Math.min((now - trail.bornAt) / trail.duration, 1);
        const head = easeOutCubic(lifetime);
        const tail = Math.max(0, head - 0.28);
        const fade = Math.pow(1 - lifetime, 1.25);
        const steps = 18;

        context.beginPath();
        for (let index = 0; index <= steps; index += 1) {
          const position = tail + ((head - tail) * index) / steps;
          const point = pointOnCurve(trail, position);
          const x = point.x * width;
          const y = point.y * height;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.globalAlpha =
          (isDark
            ? Math.min(0.94, 0.76 * trail.intensity)
            : Math.min(0.78, 0.5 * trail.intensity)) * fade;
        context.strokeStyle = TRAFFIC_COLORS[theme][trail.category];
        context.lineWidth = isDark
          ? Math.min(3.4, 2.0 * trail.intensity)
          : Math.min(3.2, 1.8 * trail.intensity);
        context.lineCap = "round";
        context.lineJoin = "round";
        context.shadowColor = TRAFFIC_COLORS[theme][trail.category];
        context.shadowBlur = isDark ? 16 : 6;
        context.stroke();

        const headPoint = pointOnCurve(trail, head);
        context.globalAlpha =
          (isDark
            ? Math.min(1, 0.95 * trail.intensity)
            : Math.min(0.85, 0.58 * trail.intensity)) * fade;
        context.shadowBlur = isDark ? 18 : 8;
        context.beginPath();
        context.arc(
          headPoint.x * width,
          headPoint.y * height,
          isDark ? 2.8 : 2.4,
          0,
          Math.PI * 2
        );
        context.fillStyle = TRAFFIC_COLORS[theme][trail.category];
        context.fill();

        // High-energy photon core in dark mode for extra brilliance
        if (isDark) {
          context.shadowBlur = 4;
          context.shadowColor = "#ffffff";
          context.beginPath();
          context.arc(
            headPoint.x * width,
            headPoint.y * height,
            1.2,
            0,
            Math.PI * 2
          );
          context.fillStyle = "#ffffff";
          context.globalAlpha = Math.min(0.95, 0.9 * trail.intensity) * fade;
          context.fill();
        }
      }

      context.globalAlpha = 1;
      context.shadowBlur = 0;
    };

    const deactivateReplay = () => {
      replayActive = false;
      replayStartedAt = 0;
      replayIndex = 0;
    };

    const activateReplay = () => {
      if (replayEvents.length === 0 || replayDuration <= 0) return false;
      replayActive = true;
      replayStartedAt = performance.now();
      replayIndex = 0;
      return true;
    };

    const loadReplayBuffer = (): Promise<boolean> => {
      if (replayEvents.length > 0 && replayDuration > 0) {
        return Promise.resolve(true);
      }
      if (replayLoadPromise) return replayLoadPromise;
      if (isStopped) return Promise.resolve(false);

      replayAbortController?.abort();
      const controller = new AbortController();
      replayAbortController = controller;

      const loadPromiseRef: { current?: Promise<boolean> } = {};
      const loadPromise = (async () => {
        try {
          const response = await fetch("/api/mesh-replay", {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Replay unavailable");
          const payload: unknown = await response.json();
          if (!isRecord(payload) || !Array.isArray(payload.events))
            return false;

          const duration = Number(payload.durationMs);
          const events = payload.events.filter(
            (event): event is ReplayEvent =>
              isRecord(event) &&
              Number.isFinite(event.offsetMs) &&
              Number.isFinite(event.payloadType)
          );
          if (
            events.length === 0 ||
            !Number.isFinite(duration) ||
            duration <= 0
          ) {
            return false;
          }

          replayEvents = events;
          replayDuration = duration;
          return true;
        } catch {
          return false;
        } finally {
          if (replayAbortController === controller) {
            replayAbortController = null;
          }
          if (replayLoadPromise === loadPromiseRef.current) replayLoadPromise = null;
        }
      })();

      loadPromiseRef.current = loadPromise;
      replayLoadPromise = loadPromise;
      return loadPromise;
    };

    const scheduleIdleReplay = () => {
      if (idleReplayTimer !== null) window.clearTimeout(idleReplayTimer);
      const idleFor = performance.now() - lastLivePacketAt;
      const delay = Math.max(0, IDLE_REPLAY_DELAY_MS - idleFor);
      idleReplayTimer = window.setTimeout(() => {
        idleReplayTimer = null;
        void beginIdleReplay();
      }, delay);
    };

    const beginIdleReplay = async () => {
      if (isStopped || reducedMotion.matches || document.hidden) return;

      const replayAvailable = await loadReplayBuffer();
      if (isStopped || reducedMotion.matches || document.hidden) return;

      const idleFor = performance.now() - lastLivePacketAt;
      if (idleFor < IDLE_REPLAY_DELAY_MS) {
        scheduleIdleReplay();
        return;
      }

      if (!replayAvailable || !activateReplay()) {
        idleReplayTimer = window.setTimeout(beginIdleReplay, 10000);
      }
    };

    const scheduleReconnect = () => {
      if (!shouldConnect || isStopped || reconnectTimer !== null) return;
      const delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt));
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(
        () => {
          reconnectTimer = null;
          connect();
        },
        delay + Math.random() * 350
      );
    };

    const connect = () => {
      if (
        !shouldConnect ||
        isStopped ||
        socket?.readyState === WebSocket.CONNECTING ||
        socket?.readyState === WebSocket.OPEN
      ) {
        return;
      }
      const analyzerUrl =
        process.env.NEXT_PUBLIC_ANALYZER_WS_URL || DEFAULT_ANALYZER_URL;

      let nextSocket: WebSocket;
      try {
        nextSocket = new WebSocket(analyzerUrl);
        socket = nextSocket;
      } catch {
        scheduleReconnect();
        return;
      }

      nextSocket.addEventListener("open", () => {
        reconnectAttempt = 0;
      });
      nextSocket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        try {
          const category = packetCategory(JSON.parse(event.data));
          if (category) {
            lastLivePacketAt = performance.now();
            deactivateReplay();
            scheduleIdleReplay();
            addTrail(category);
          }
        } catch {
          // Ignore non-packet messages
        }
      });
      nextSocket.addEventListener("close", () => {
        if (socket === nextSocket) socket = null;
        scheduleReconnect();
      });
      nextSocket.addEventListener("error", () => nextSocket.close());
    };

    const stopLiveActivity = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      const activeSocket = socket;
      socket = null;
      activeSocket?.close();
      if (idleReplayTimer !== null) {
        window.clearTimeout(idleReplayTimer);
        idleReplayTimer = null;
      }
      replayAbortController?.abort();
      replayAbortController = null;
      replayLoadPromise = null;
      deactivateReplay();
      trails = [];
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };

    const handleMotionPreference = () => {
      if (reducedMotion.matches) {
        shouldConnect = false;
        stopLiveActivity();
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else {
        shouldConnect = !document.hidden;
        lastLivePacketAt = performance.now();
        connect();
        void loadReplayBuffer();
        scheduleIdleReplay();
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const handleVisibility = () => {
      shouldConnect = !document.hidden && !reducedMotion.matches;
      if (!shouldConnect) {
        stopLiveActivity();
      } else {
        lastLivePacketAt = performance.now();
        connect();
        void loadReplayBuffer();
        scheduleIdleReplay();
      }
    };

    const themeObserver = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains("dark");
    });

    resize();
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleMotionPreference);

    if (!reducedMotion.matches) {
      void loadReplayBuffer();
      connect();
      scheduleIdleReplay();
      animationFrame = window.requestAnimationFrame(draw);

      const isLocalhost =
        typeof window !== "undefined" &&
        ["localhost", "127.0.0.1"].includes(window.location.hostname);
      const isDemo =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).has("mesh-demo");

      if (isLocalhost && isDemo) {
        const categories: PacketCategory[] = [
          "advert",
          "message",
          "route",
          "control",
        ];
        let categoryIndex = 0;
        addTrail(categories[categoryIndex]);
        demoTimer = window.setInterval(() => {
          categoryIndex = (categoryIndex + 1) % categories.length;
          addTrail(categories[categoryIndex]);
        }, 450);
      }
    }

    return () => {
      isStopped = true;
      shouldConnect = false;
      if (demoTimer !== null) window.clearInterval(demoTimer);
      stopLiveActivity();
      window.cancelAnimationFrame(animationFrame);
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  return (
    <div className="mesh-background" aria-hidden="true">
      <canvas ref={canvasRef} className="mesh-background__canvas" />
      <div className="mesh-background__scrim" />
    </div>
  );
}

export default Background;
