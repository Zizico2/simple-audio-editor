"use client";

import { useEffect, useRef, useState } from "react";
import type {
  AudioEditSettings,
  ExportFormat,
} from "../../utils/audioProcessing";
import {
  decodeAudioFile,
  exportAudio,
  getDefaultSettings,
  processAudio,
} from "../../utils/audioProcessing";
import AudioToolbar from "./AudioToolbar";
import AudioUpload from "./AudioUpload";
import CropControls from "./CropControls";
import FadeControl from "./FadeControl";
import PlaybackControls from "./PlaybackControls";
import VolumeControl from "./VolumeControl";
import WaveformDisplay from "./WaveformDisplay";

interface AudioData {
  file: File;
  buffer: AudioBuffer;
}

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

  const stopPlayback = () => {
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
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: stopPlayback is stable since react compiler
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
      <AudioToolbar
        audioData={audioData}
        duration={duration}
        isOpusLoading={isOpusLoading}
        isWavLoading={isWavLoading}
        onDownload={handleDownload}
        onReset={handleReset}
      />

      {!audioData ? (
        isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[0.85rem] text-(--foreground-muted)">
              Decoding audio...
            </p>
          </div>
        ) : (
          <AudioUpload onAudioSelected={handleAudioSelected} />
        )
      ) : settings ? (
        <>
          <WaveformDisplay
            audioBuffer={audioData.buffer}
            settings={settings}
            playbackPosition={playbackPosition}
            onSeek={handleSeek}
          />
          <PlaybackControls
            isPlaying={isPlaying}
            onPreview={handlePreview}
            playbackPosition={playbackPosition}
            duration={duration}
            cropStart={settings.cropStart}
            cropEnd={settings.cropEnd}
          />
          <CropControls
            duration={duration}
            settings={settings}
            updateSetting={updateSetting}
          />
          <VolumeControl settings={settings} updateSetting={updateSetting} />
          <FadeControl
            type="fadeIn"
            settings={settings}
            updateFade={updateFadeIn}
            toggle={() => updateFadeIn({ enabled: !settings.fadeIn.enabled })}
            cropStart={settings.cropStart}
            cropEnd={settings.cropEnd}
          />
          <FadeControl
            type="fadeOut"
            settings={settings}
            updateFade={updateFadeOut}
            toggle={() => updateFadeOut({ enabled: !settings.fadeOut.enabled })}
            cropStart={settings.cropStart}
            cropEnd={settings.cropEnd}
          />
        </>
      ) : null}
    </>
  );
}
