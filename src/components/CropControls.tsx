import { Input } from "@cloudflare/kumo";
import { Label } from "@cloudflare/kumo/components/label";
import { type AudioEditSettings, formatTime } from "../utils/audioProcessing";
import {
  controlRowStyles,
  rangeContainerStyles,
  rangeInputStyles,
  rangeValueStyles,
  sectionStyles,
  sectionTitleStyles,
} from "./AudioEditorStyles";

interface CropControlsProps {
  duration: number;
  settings: AudioEditSettings;
  updateSetting: <K extends keyof AudioEditSettings>(
    key: K,
    value: AudioEditSettings[K],
  ) => void;
}

export default function CropControls({
  duration,
  settings,
  updateSetting,
}: CropControlsProps) {
  return (
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
  );
}
