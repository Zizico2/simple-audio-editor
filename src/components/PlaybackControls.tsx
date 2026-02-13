import { Button } from "@cloudflare/kumo/components/button";
import { formatTime } from "../utils/audioProcessing";
import { playbackBarStyles, timeDisplayStyles } from "./audioEditorStyles";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPreview: () => void;
  playbackPosition: number;
  duration: number;
  cropStart: number;
  cropEnd: number;
}

export default function PlaybackControls({
  isPlaying,
  onPreview,
  playbackPosition,
  duration,
  cropStart,
  cropEnd,
}: PlaybackControlsProps) {
  return (
    <div className={playbackBarStyles()}>
      <Button
        onClick={onPreview}
        type="button"
        variant={isPlaying ? "primary" : "secondary"}
        size="sm"
      >
        {isPlaying ? "Stop" : "Preview"}
      </Button>
      <span className={timeDisplayStyles()}>
        {formatTime(playbackPosition * duration)} /{" "}
        {formatTime(cropEnd - cropStart)}
      </span>
    </div>
  );
}
