"use client";

import { cva } from "class-variance-authority";
import { useCallback, useEffect, useRef } from "react";
import type { AudioEditSettings } from "../utils/audioProcessing";
import { extractWaveformPeaks, formatTime } from "../utils/audioProcessing";

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer;
  settings: AudioEditSettings;
  playbackPosition: number; // 0-1 normalized to the FULL buffer
  onSeek: (time: number) => void;
}

const containerStyles = cva([
  "relative w-full rounded-lg overflow-hidden",
  "bg-(--surface-tint) border border-(--border-faint)",
]);

const timestampStyles = cva([
  "absolute bottom-1 text-[0.7rem] text-(--foreground-muted) pointer-events-none select-none",
]);

export default function WaveformDisplay({
  audioBuffer,
  settings,
  playbackPosition,
  onSeek,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    const numBuckets = Math.floor(width);
    const { positive, negative } = extractWaveformPeaks(
      audioBuffer,
      numBuckets,
    );

    const totalDuration = audioBuffer.duration;
    const cropStartPx = (settings.cropStart / totalDuration) * width;
    const cropEndPx = (settings.cropEnd / totalDuration) * width;

    // Draw dimmed region outside crop
    const isDark =
      document.documentElement.getAttribute("data-mode") === "dark";
    ctx.fillStyle = isDark
      ? "rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.06)";
    ctx.fillRect(0, 0, cropStartPx, height);
    ctx.fillRect(cropEndPx, 0, width - cropEndPx, height);

    // Draw waveform
    for (let i = 0; i < numBuckets; i++) {
      const x = i;
      const isInCrop = x >= cropStartPx && x <= cropEndPx;

      if (isInCrop) {
        ctx.fillStyle = isDark
          ? "rgba(100, 160, 255, 0.8)"
          : "rgba(0, 112, 243, 0.7)";
      } else {
        ctx.fillStyle = isDark
          ? "rgba(255, 255, 255, 0.15)"
          : "rgba(0, 0, 0, 0.15)";
      }

      const posHeight = positive[i] * midY * 0.9;
      const negHeight = -negative[i] * midY * 0.9;

      ctx.fillRect(x, midY - posHeight, 1, posHeight + negHeight);
    }

    // Draw fade regions
    if (settings.fadeIn.enabled && settings.fadeIn.duration > 0) {
      const fadeEndPx =
        cropStartPx + (settings.fadeIn.duration / totalDuration) * width;
      const gradient = ctx.createLinearGradient(cropStartPx, 0, fadeEndPx, 0);
      gradient.addColorStop(
        0,
        isDark ? "rgba(255, 200, 50, 0.25)" : "rgba(255, 160, 0, 0.2)",
      );
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.fillRect(cropStartPx, 0, fadeEndPx - cropStartPx, height);
    }

    if (settings.fadeOut.enabled && settings.fadeOut.duration > 0) {
      const fadeStartPx =
        cropEndPx - (settings.fadeOut.duration / totalDuration) * width;
      const gradient = ctx.createLinearGradient(fadeStartPx, 0, cropEndPx, 0);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(
        1,
        isDark ? "rgba(255, 200, 50, 0.25)" : "rgba(255, 160, 0, 0.2)",
      );
      ctx.fillStyle = gradient;
      ctx.fillRect(fadeStartPx, 0, cropEndPx - fadeStartPx, height);
    }

    // Draw crop boundary lines
    ctx.strokeStyle = isDark
      ? "rgba(255, 255, 255, 0.4)"
      : "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(cropStartPx, 0);
    ctx.lineTo(cropStartPx, height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cropEndPx, 0);
    ctx.lineTo(cropEndPx, height);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw playback position
    if (playbackPosition > 0) {
      const playPx = playbackPosition * width;
      ctx.strokeStyle = isDark ? "#ffffff" : "#000000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playPx, 0);
      ctx.lineTo(playPx, height);
      ctx.stroke();
    }

    // Draw center line
    ctx.strokeStyle = isDark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(0, 0, 0, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
  }, [audioBuffer, settings, playbackPosition]);

  useEffect(() => {
    draw();

    const resizeObserver = new ResizeObserver(() => draw());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [draw]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const time = ratio * audioBuffer.duration;
    onSeek(time);
  };

  return (
    <div ref={containerRef} className={containerStyles()}>
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        style={{ height: "140px" }}
        onClick={handleClick}
      />
      <span className={timestampStyles()} style={{ left: "4px" }}>
        {formatTime(settings.cropStart)}
      </span>
      <span className={timestampStyles()} style={{ right: "4px" }}>
        {formatTime(settings.cropEnd)}
      </span>
    </div>
  );
}
