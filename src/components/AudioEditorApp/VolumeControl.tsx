import { Input } from "@cloudflare/kumo";
import type { AudioEditSettings } from "../../utils/audioProcessing";
import {
  controlRowStyles,
  rangeContainerStyles,
  rangeInputStyles,
  rangeValueStyles,
  sectionStyles,
  sectionTitleStyles,
} from "./audioEditorStyles";

interface VolumeControlProps {
  settings: AudioEditSettings;
  updateSetting: <K extends keyof AudioEditSettings>(
    key: K,
    value: AudioEditSettings[K],
  ) => void;
}

export default function VolumeControl({
  settings,
  updateSetting,
}: VolumeControlProps) {
  return (
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
  );
}
