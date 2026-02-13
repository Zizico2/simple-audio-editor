export type EaseCurve = "linear" | "exponential" | "logarithmic" | "sCurve";

export interface AudioEditSettings {
  cropStart: number; // seconds
  cropEnd: number; // seconds
  volume: number; // 0-2 multiplier
  fadeIn: {
    enabled: boolean;
    duration: number; // seconds
    curve: EaseCurve;
  };
  fadeOut: {
    enabled: boolean;
    duration: number; // seconds
    curve: EaseCurve;
  };
}

export function getDefaultSettings(duration: number): AudioEditSettings {
  return {
    cropStart: 0,
    cropEnd: duration,
    volume: 1,
    fadeIn: {
      enabled: false,
      duration: Math.min(1, duration * 0.1),
      curve: "linear",
    },
    fadeOut: {
      enabled: false,
      duration: Math.min(1, duration * 0.1),
      curve: "linear",
    },
  };
}

/**
 * Apply an ease curve to a linear 0→1 progress value
 */
function applyEaseCurve(t: number, curve: EaseCurve): number {
  switch (curve) {
    case "exponential":
      return t * t;
    case "logarithmic":
      return Math.sqrt(t);
    case "sCurve":
      return t * t * (3 - 2 * t);
    default:
      return t;
  }
}

/**
 * Process audio using OfflineAudioContext: crop, volume, fade in/out
 */
export async function processAudio(
  sourceBuffer: AudioBuffer,
  settings: AudioEditSettings,
): Promise<AudioBuffer> {
  const { cropStart, cropEnd, volume, fadeIn, fadeOut } = settings;
  const sampleRate = sourceBuffer.sampleRate;
  const channels = sourceBuffer.numberOfChannels;

  const startSample = Math.floor(cropStart * sampleRate);
  const endSample = Math.floor(cropEnd * sampleRate);
  const croppedLength = endSample - startSample;

  if (croppedLength <= 0) {
    throw new Error("Crop region is empty");
  }

  const offlineCtx = new OfflineAudioContext(
    channels,
    croppedLength,
    sampleRate,
  );

  // Create buffer source
  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;

  // Create gain node for volume
  const gainNode = offlineCtx.createGain();
  gainNode.gain.setValueAtTime(volume, 0);

  // Apply fade in
  if (fadeIn.enabled && fadeIn.duration > 0) {
    const fadeDuration = Math.min(fadeIn.duration, croppedLength / sampleRate);
    gainNode.gain.setValueAtTime(0, 0);

    switch (fadeIn.curve) {
      case "exponential":
        // exponentialRampToValueAtTime can't start from 0
        gainNode.gain.setValueAtTime(0.001, 0);
        gainNode.gain.exponentialRampToValueAtTime(volume, fadeDuration);
        break;
      case "logarithmic":
      case "sCurve": {
        // Use setValueCurveAtTime for custom curves
        const steps = 100;
        const curveValues = new Float32Array(steps);
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          curveValues[i] = applyEaseCurve(t, fadeIn.curve) * volume;
        }
        gainNode.gain.setValueCurveAtTime(curveValues, 0, fadeDuration);
        break;
      }
      default:
        gainNode.gain.linearRampToValueAtTime(volume, fadeDuration);
        break;
    }
  }

  // Apply fade out
  if (fadeOut.enabled && fadeOut.duration > 0) {
    const totalDuration = croppedLength / sampleRate;
    const fadeDuration = Math.min(fadeOut.duration, totalDuration);
    const fadeOutStart = totalDuration - fadeDuration;

    switch (fadeOut.curve) {
      case "exponential":
        gainNode.gain.setValueAtTime(volume, fadeOutStart);
        gainNode.gain.exponentialRampToValueAtTime(0.001, totalDuration);
        break;
      case "logarithmic":
      case "sCurve": {
        const steps = 100;
        const curveValues = new Float32Array(steps);
        for (let i = 0; i < steps; i++) {
          const t = i / (steps - 1);
          curveValues[i] = applyEaseCurve(1 - t, fadeOut.curve) * volume;
        }
        gainNode.gain.setValueCurveAtTime(
          curveValues,
          fadeOutStart,
          fadeDuration,
        );
        break;
      }
      default:
        gainNode.gain.setValueAtTime(volume, fadeOutStart);
        gainNode.gain.linearRampToValueAtTime(0, totalDuration);
        break;
    }
  }

  source.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  source.start(0, cropStart, cropEnd - cropStart);

  return offlineCtx.startRendering();
}

/**
 * Decode an audio file (File or Blob) into an AudioBuffer
 */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  try {
    return await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    await audioCtx.close();
  }
}

/**
 * Extract waveform peaks from an AudioBuffer for visualization
 */
export function extractWaveformPeaks(
  buffer: AudioBuffer,
  numBuckets: number,
): { positive: Float32Array; negative: Float32Array } {
  const channelData = buffer.getChannelData(0); // Use first channel
  const samplesPerBucket = Math.floor(channelData.length / numBuckets);
  const positive = new Float32Array(numBuckets);
  const negative = new Float32Array(numBuckets);

  for (let i = 0; i < numBuckets; i++) {
    const start = i * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, channelData.length);
    let max = -1;
    let min = 1;

    for (let j = start; j < end; j++) {
      const val = channelData[j];
      if (val > max) max = val;
      if (val < min) min = val;
    }

    positive[i] = max;
    negative[i] = min;
  }

  return { positive, negative };
}

/**
 * Encode an AudioBuffer to a WAV file Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Interleave channels and write samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Format seconds to mm:ss.ms display
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
}
