"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type Mode = "pomodoro" | "break" | "stopwatch";

const PRESETS: Record<Exclude<Mode, "stopwatch">, number> = {
  pomodoro: 25 * 60,
  break: 5 * 60,
};

export function FocusTimer() {
  const [mode, setMode] = useState<Mode>("pomodoro");
  const [seconds, setSeconds] = useState(PRESETS.pomodoro);
  const [running, setRunning] = useState(false);
  const [noise, setNoise] = useState(false);
  const tickRef = useRef<number | null>(null);
  const audioRef = useRef<{
    ctx: AudioContext;
    node: AudioBufferSourceNode;
    gain: GainNode;
  } | null>(null);

  useEffect(() => {
    if (!running) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      return;
    }
    tickRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (mode === "stopwatch") return s + 1;
        if (s <= 1) {
          setRunning(false);
          if (mode === "pomodoro") {
            void fetch("/api/focus", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                kind: "pomodoro",
                durationSeconds: PRESETS.pomodoro,
              }),
            });
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running, mode]);

  useEffect(() => {
    return () => stopNoise();
  }, []);

  function switchMode(next: Mode) {
    setRunning(false);
    setMode(next);
    setSeconds(next === "stopwatch" ? 0 : PRESETS[next]);
  }

  function reset() {
    setRunning(false);
    setSeconds(mode === "stopwatch" ? 0 : PRESETS[mode === "break" ? "break" : "pomodoro"]);
  }

  function startNoise() {
    const ctx = new AudioContext();
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0.04;
    node.connect(gain);
    gain.connect(ctx.destination);
    node.start();
    audioRef.current = { ctx, node, gain };
    setNoise(true);
  }

  function stopNoise() {
    if (audioRef.current) {
      try {
        audioRef.current.node.stop();
        void audioRef.current.ctx.close();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    setNoise(false);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-border bg-surface p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold">Modo Enfoque</h1>
      <div className="flex justify-center gap-1 rounded-xl border border-border p-0.5">
        {(
          [
            ["pomodoro", "Pomodoro"],
            ["break", "Descanso"],
            ["stopwatch", "Cronómetro"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => switchMode(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs",
              mode === id ? "bg-accent text-accent-fg" : "text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="font-mono text-6xl tracking-tight tabular-nums">
        {mm}:{ss}
      </div>

      <div className="flex justify-center gap-2">
        <Button onClick={() => setRunning((r) => !r)}>
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pausa" : "Start"}
        </Button>
        <Button variant="secondary" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => (noise ? stopNoise() : startNoise())}
          title="Ruido blanco"
        >
          {noise ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted">
        25 min de foco · ruido blanco opcional · se registra al completar un pomodoro
      </p>
    </div>
  );
}
