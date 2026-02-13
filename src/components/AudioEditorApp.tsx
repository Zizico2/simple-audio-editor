"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { Label } from "@cloudflare/kumo/components/label";
import { Select } from "@cloudflare/kumo/components/select";
import { Switch } from "@cloudflare/kumo/components/switch";
import { Tooltip } from "@cloudflare/kumo/components/tooltip";
import { cva } from "class-variance-authority";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AudioEditSettings,
  decodeAudioFile,
  type EaseCurve,
  type ExportFormat,
  exportAudio,
  FORMAT_DESCRIPTIONS,
  formatTime,
  getDefaultSettings,
  processAudio,
} from "../utils/audioProcessing";
import AudioUpload from "./AudioUpload";
import WaveformDisplay from "./WaveformDisplay";
import { Input } from "@cloudflare/kumo";

interface AudioData {
  file: File;
  buffer: AudioBuffer;
}

const toolbarStyles = cva(["flex items-center flex-wrap gap-2 mb-4"]);
const infoTextStyles = cva(["text-[0.85rem] text-(--foreground-muted)"]);
const buttonGroupStyles = cva(["flex gap-2 ml-auto"]);
const sectionStyles = cva([
  "rounded-lg p-4 mb-3",
  "bg-(--surface-tint) border border-(--border-faint)",
]);
const sectionTitleStyles = cva([
  "text-[0.85rem] font-semibold mb-3 text-(--foreground-muted) uppercase tracking-wide",
]);
const controlRowStyles = cva(["flex items-center gap-3 flex-wrap"]);
const rangeContainerStyles = cva(["flex flex-col gap-1 flex-1 min-w-[140px]"]);
const rangeInputStyles = cva([
  "w-full outline-none shadow-none inset-shadow-none ring-0 inset-ring-0",
]);
const rangeValueStyles = cva([
  "text-[0.75rem] text-(--foreground-muted) tabular-nums text-right min-w-[4rem]",
]);
const playbackBarStyles = cva([
  "flex items-center gap-3 mb-3 p-3 rounded-lg",
  "bg-(--surface-tint) border border-(--border-faint)",
]);
const timeDisplayStyles = cva([
  "text-[0.85rem] tabular-nums text-(--foreground-muted)",
]);
const fadeControlsStyles = cva(["flex items-center gap-3 flex-wrap mt-2"]);

const EASE_CURVES: { value: EaseCurve; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "exponential", label: "Exponential" },
  { value: "logarithmic", label: "Logarithmic" },
  { value: "sCurve", label: "S-Curve" },
];

export default function AudioEditorApp() {
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [isOpusLoading, setIsOpusLoading] = useState(false);
  const [isWavLoading, setIsWavLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AudioEditSettings | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef(0);
  const playbackOffsetRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setIsPlaying(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stopPlayback]);

  const handleAudioSelected = async (file: File) => {
    setIsLoading(true);
    try {
      const buffer = await decodeAudioFile(file);
      setAudioData({ file, buffer });
      setSettings(getDefaultSettings(buffer.duration));
      setPlaybackPosition(0);
    } catch (err) {
      console.error("Error decoding audio:", err);
      alert("Failed to decode audio file. Please try a different format.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!audioData || !settings) return;

    if (isPlaying) {
      stopPlayback();
      return;
    }

    try {
      const processedBuffer = await processAudio(audioData.buffer, settings);

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = processedBuffer;
      source.connect(ctx.destination);

      sourceNodeRef.current = source;
      playbackStartTimeRef.current = ctx.currentTime;
      playbackOffsetRef.current = settings.cropStart;

      source.onended = () => {
        stopPlayback();
        setPlaybackPosition(0);
      };

      source.start(0);
      setIsPlaying(true);

      const duration = processedBuffer.duration;
      const totalDuration = audioData.buffer.duration;

      const updatePosition = () => {
        if (!audioCtxRef.current || !sourceNodeRef.current) return;
        const elapsed =
          audioCtxRef.current.currentTime - playbackStartTimeRef.current;
        const currentAbsoluteTime = settings.cropStart + elapsed;
        setPlaybackPosition(currentAbsoluteTime / totalDuration);

        if (elapsed < duration) {
          animFrameRef.current = requestAnimationFrame(updatePosition);
        }
      };

      animFrameRef.current = requestAnimationFrame(updatePosition);
    } catch (err) {
      console.error("Playback error:", err);
      stopPlayback();
    }
  };

  const handleSeek = (time: number) => {
    if (!audioData || !settings) return;
    // Clamp to crop region
    const clampedTime = Math.max(
      settings.cropStart,
      Math.min(settings.cropEnd, time),
    );
    setPlaybackPosition(clampedTime / audioData.buffer.duration);
  };

  const handleDownload = async (format: ExportFormat) => {
    if (!audioData || !settings) return;

    const setLoading = format === "opus" ? setIsOpusLoading : setIsWavLoading;
    setLoading(true);
    try {
      const processedBuffer = await processAudio(audioData.buffer, settings);
      const { blob, extension } = await exportAudio(processedBuffer, format);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const nameWithoutExt = audioData.file.name.replace(/\.[^.]+$/, "");
      link.href = url;
      link.download = `${nameWithoutExt}-edited.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export audio");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    stopPlayback();
    setAudioData(null);
    setSettings(null);
    setPlaybackPosition(0);
  };

  const updateSetting = <K extends keyof AudioEditSettings>(
    key: K,
    value: AudioEditSettings[K],
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateFadeIn = (updates: Partial<AudioEditSettings["fadeIn"]>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      fadeIn: { ...settings.fadeIn, ...updates },
    });
  };

  const updateFadeOut = (updates: Partial<AudioEditSettings["fadeOut"]>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      fadeOut: { ...settings.fadeOut, ...updates },
    });
  };

  const duration = audioData?.buffer.duration ?? 0;

  return (
    <>
      <div className={toolbarStyles()}>
        <p className={infoTextStyles()}>
          {audioData ? (
            <>
              <strong>{audioData.file.name}</strong> &middot;{" "}
              {formatTime(duration)} &middot; {audioData.buffer.sampleRate} Hz
              &middot; {audioData.buffer.numberOfChannels}ch
            </>
          ) : (
            "No audio selected"
          )}
        </p>

        <div className={buttonGroupStyles()}>
          <Tooltip content={FORMAT_DESCRIPTIONS.opus} side="bottom" asChild>
            <Button
              onClick={() => handleDownload("opus")}
              disabled={isOpusLoading || isWavLoading || !audioData}
              type="button"
              variant="secondary"
              loading={isOpusLoading}
            >
              Export
            </Button>
          </Tooltip>

          <Tooltip content={FORMAT_DESCRIPTIONS.wav} side="bottom" asChild>
            <Button
              onClick={() => handleDownload("wav")}
              disabled={isOpusLoading || isWavLoading || !audioData}
              type="button"
              variant="secondary"
              loading={isWavLoading}
            >
              Export WAV
            </Button>
          </Tooltip>

          <Button
            onClick={handleReset}
            disabled={!audioData || isOpusLoading || isWavLoading}
            type="button"
            variant="secondary-destructive"
          >
            Reset
          </Button>
        </div>
      </div>

      {!audioData ? (
        isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className={infoTextStyles()}>Decoding audio...</p>
          </div>
        ) : (
          <AudioUpload onAudioSelected={handleAudioSelected} />
        )
      ) : settings ? (
        <>
          {/* Waveform */}
          <WaveformDisplay
            audioBuffer={audioData.buffer}
            settings={settings}
            playbackPosition={playbackPosition}
            onSeek={handleSeek}
          />

          {/* Playback controls */}
          <div className={playbackBarStyles()}>
            <Button
              onClick={handlePreview}
              type="button"
              variant={isPlaying ? "primary" : "secondary"}
              size="sm"
            >
              {isPlaying ? "Stop" : "Preview"}
            </Button>
            <span className={timeDisplayStyles()}>
              {formatTime(playbackPosition * duration)} /{" "}
              {formatTime(settings.cropEnd - settings.cropStart)}
            </span>
          </div>

          {/* Crop controls */}
          <div className={sectionStyles()}>
            <p className={sectionTitleStyles()}>Crop</p>
            <div className={controlRowStyles()}>
              <div className={rangeContainerStyles()}>
                <Label>Start</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.01}
                    value={settings.cropStart}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      if (val < settings.cropEnd) {
                        updateSetting("cropStart", val);
                      }
                    }}
                    className={rangeInputStyles()}
                  />
                  <span className={rangeValueStyles()}>
                    {formatTime(settings.cropStart)}
                  </span>
                </div>
              </div>

              <div className={rangeContainerStyles()}>
                <Label>End</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="range"
                    min={0}
                    max={duration}
                    step={0.01}
                    value={settings.cropEnd}
                    onChange={(e) => {
                      const val = Number.parseFloat(e.target.value);
                      if (val > settings.cropStart) {
                        updateSetting("cropEnd", val);
                      }
                    }}
                    className={rangeInputStyles()}
                  />
                  <span className={rangeValueStyles()}>
                    {formatTime(settings.cropEnd)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Volume control */}
          <div className={sectionStyles()}>
            <p className={sectionTitleStyles()}>Volume</p>
            <div className={controlRowStyles()}>
              <div className={rangeContainerStyles()}>
                <div className="flex items-center gap-2">
                  <Input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={settings.volume}
                    onChange={(e) =>
                      updateSetting("volume", Number.parseFloat(e.target.value))
                    }
                    className={rangeInputStyles()}
                  />
                  <span className={rangeValueStyles()}>
                    {Math.round(settings.volume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fade In */}
          <div className={sectionStyles()}>
            <div className="flex items-center justify-between mb-3">
              <p className={`${sectionTitleStyles()} !mb-0`}>Fade In</p>
              <Switch
                size="sm"
                checked={settings.fadeIn.enabled}
                onClick={() =>
                  updateFadeIn({ enabled: !settings.fadeIn.enabled })
                }
              />
            </div>

            {settings.fadeIn.enabled && (
              <div className={fadeControlsStyles()}>
                <div className={rangeContainerStyles()}>
                  <Label>Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="range"
                      min={0.01}
                      max={Math.min(10, settings.cropEnd - settings.cropStart)}
                      step={0.01}
                      value={settings.fadeIn.duration}
                      onChange={(e) =>
                        updateFadeIn({
                          duration: Number.parseFloat(e.target.value),
                        })
                      }
                      className={rangeInputStyles()}
                    />
                    <span className={rangeValueStyles()}>
                      {settings.fadeIn.duration.toFixed(2)}s
                    </span>
                  </div>
                </div>

                <div className="min-w-[140px]">
                  <Label>Curve</Label>
                  <Select
                    className="mt-1"
                    value={settings.fadeIn.curve}
                    onValueChange={(val) =>
                      updateFadeIn({ curve: val as EaseCurve })
                    }
                  >
                    {EASE_CURVES.map((c) => (
                      <Select.Option key={c.value} value={c.value}>
                        {c.label}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Fade Out */}
          <div className={sectionStyles()}>
            <div className="flex items-center justify-between mb-3">
              <p className={`${sectionTitleStyles()} !mb-0`}>Fade Out</p>
              <Switch
                size="sm"
                checked={settings.fadeOut.enabled}
                onClick={() =>
                  updateFadeOut({ enabled: !settings.fadeOut.enabled })
                }
              />
            </div>

            {settings.fadeOut.enabled && (
              <div className={fadeControlsStyles()}>
                <div className={rangeContainerStyles()}>
                  <Label>Duration</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="range"
                      min={0.01}
                      max={Math.min(10, settings.cropEnd - settings.cropStart)}
                      step={0.01}
                      value={settings.fadeOut.duration}
                      onChange={(e) =>
                        updateFadeOut({
                          duration: Number.parseFloat(e.target.value),
                        })
                      }
                      className={rangeInputStyles()}
                    />
                    <span className={rangeValueStyles()}>
                      {settings.fadeOut.duration.toFixed(2)}s
                    </span>
                  </div>
                </div>

                <div className="min-w-[140px]">
                  <Label>Curve</Label>
                  <Select
                    className="mt-1"
                    value={settings.fadeOut.curve}
                    onValueChange={(val) =>
                      updateFadeOut({ curve: val as EaseCurve })
                    }
                  >
                    {EASE_CURVES.map((c) => (
                      <Select.Option key={c.value} value={c.value}>
                        {c.label}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
