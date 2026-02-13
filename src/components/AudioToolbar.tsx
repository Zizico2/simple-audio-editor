import { Button } from "@cloudflare/kumo/components/button";
import { Tooltip } from "@cloudflare/kumo/components/tooltip";
import {
  type ExportFormat,
  FORMAT_DESCRIPTIONS,
} from "../utils/audioProcessing";
import {
  buttonGroupStyles,
  infoTextStyles,
  toolbarStyles,
} from "./audioEditorStyles";

interface AudioToolbarProps {
  audioData: { file: File; buffer: AudioBuffer } | null;
  duration: number;
  isOpusLoading: boolean;
  isWavLoading: boolean;
  onDownload: (format: ExportFormat) => void;
  onReset: () => void;
}

export default function AudioToolbar({
  audioData,
  duration,
  isOpusLoading,
  isWavLoading,
  onDownload,
  onReset,
}: AudioToolbarProps) {
  return (
    <div className={toolbarStyles()}>
      <p className={infoTextStyles()}>
        {audioData ? (
          <>
            <strong>{audioData.file.name}</strong> &middot;{" "}
            {duration.toFixed(2)}s &middot; {audioData.buffer.sampleRate} Hz
            &middot; {audioData.buffer.numberOfChannels}ch
          </>
        ) : (
          "No audio selected"
        )}
      </p>
      <div className={buttonGroupStyles()}>
        <Tooltip content={FORMAT_DESCRIPTIONS.opus} side="bottom" asChild>
          <Button
            onClick={() => onDownload("opus")}
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
            onClick={() => onDownload("wav")}
            disabled={isOpusLoading || isWavLoading || !audioData}
            type="button"
            variant="secondary"
            loading={isWavLoading}
          >
            Export WAV
          </Button>
        </Tooltip>
        <Button
          onClick={onReset}
          disabled={!audioData || isOpusLoading || isWavLoading}
          type="button"
          variant="secondary-destructive"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
