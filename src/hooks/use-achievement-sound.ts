"use client";

import { useCallback, useRef } from "react";

/**
 * Xbox-style chimes via Web Audio.
 * iOS Safari requires AudioContext.resume() during a user gesture;
 * call unlock() synchronously on click/touch before any await.
 */
export function useAchievementSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current) {
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const unlock = useCallback(() => {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      // Tiny silent buffer to fully unlock on some iOS versions.
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      /* audio blocked or unavailable */
    }
  }, [getCtx]);

  const playNotes = useCallback(
    (notes: number[], gap: number, peak: number, duration: number) => {
      try {
        const ctx = getCtx();
        if (!ctx) return;
        if (ctx.state === "suspended") void ctx.resume();

        const now = ctx.currentTime;
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          const t = now + i * gap;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(peak, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + duration + 0.05);
        });
      } catch {
        /* audio blocked or unavailable */
      }
    },
    [getCtx],
  );

  /** Full achievement chime (día óptimo / semana perfecta). */
  const play = useCallback(() => {
    playNotes([523.25, 659.25, 783.99, 1046.5], 0.07, 0.28, 0.45);
  }, [playNotes]);

  /** Short confirmation when completing a habit or task. */
  const playTick = useCallback(() => {
    playNotes([880, 1174.66], 0.05, 0.22, 0.22);
  }, [playNotes]);

  return { unlock, play, playTick };
}
