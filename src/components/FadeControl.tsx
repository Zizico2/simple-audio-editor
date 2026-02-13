import { Input } from "@cloudflare/kumo";
import { Label } from "@cloudflare/kumo/components/label";
import { Select } from "@cloudflare/kumo/components/select";
import { Switch } from "@cloudflare/kumo/components/switch";
import type { AudioEditSettings, EaseCurve } from "../utils/audioProcessing";
import {
  fadeControlsStyles,
  rangeContainerStyles,
  rangeInputStyles,
  rangeValueStyles,
  sectionStyles,
  sectionTitleStyles,
} from "./AudioEditorStyles";

const EASE_CURVES: { value: EaseCurve; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "exponential", label: "Exponential" },
  { value: "logarithmic", label: "Logarithmic" },
  { value: "sCurve", label: "S-Curve" },
];

interface FadeControlProps {
  type: "fadeIn" | "fadeOut";
  settings: AudioEditSettings;
  updateFade: (
    updates: Partial<
      AudioEditSettings["fadeIn"] | AudioEditSettings["fadeOut"]
    >,
  ) => void;
  toggle: () => void;
  cropStart: number;
  cropEnd: number;
}

export default function FadeControl({
  type,
  settings,
  updateFade,
  toggle,
  cropStart,
  cropEnd,
}: FadeControlProps) {
  const fade = settings[type];
  return (
    <div className={sectionStyles()}>
      <div className="flex items-center justify-between mb-3">
        <p className={`${sectionTitleStyles()} mb-0!`}>
          {type === "fadeIn" ? "Fade In" : "Fade Out"}
        </p>
        <Switch size="sm" checked={fade.enabled} onClick={toggle} />
      </div>
      {fade.enabled && (
        <div className={fadeControlsStyles()}>
          <div className={rangeContainerStyles()}>
            <Label>Duration</Label>
            <div className="flex items-center gap-2">
              <Input
                type="range"
                min={0.01}
                max={Math.min(10, cropEnd - cropStart)}
                step={0.01}
                value={fade.duration}
                onChange={(e) =>
                  updateFade({ duration: Number.parseFloat(e.target.value) })
                }
                className={rangeInputStyles()}
              />
              <span className={rangeValueStyles()}>
                {fade.duration.toFixed(2)}s
              </span>
            </div>
          </div>
          <div className="min-w-35">
            <Label>Curve</Label>
            <Select
              className="mt-1"
              value={fade.curve}
              onValueChange={(val) => updateFade({ curve: val as EaseCurve })}
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
  );
}
