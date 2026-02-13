import { cva } from "class-variance-authority";

export const toolbarStyles = cva(["flex items-center flex-wrap gap-2 mb-4"]);
export const infoTextStyles = cva(["text-[0.85rem] text-(--foreground-muted)"]);
export const buttonGroupStyles = cva(["flex gap-2 ml-auto"]);
export const sectionStyles = cva([
  "rounded-lg p-4 mb-3",
  "bg-(--surface-tint) border border-(--border-faint)",
]);
export const sectionTitleStyles = cva([
  "text-[0.85rem] font-semibold mb-3 text-(--foreground-muted) uppercase tracking-wide",
]);
export const controlRowStyles = cva(["flex items-center gap-3 flex-wrap"]);
export const rangeContainerStyles = cva([
  "flex flex-col gap-1 flex-1 min-w-35",
]);
export const rangeInputStyles = cva([
  "w-full shadow-none inset-shadow-none ring-0 inset-ring-0",
]);
export const rangeValueStyles = cva([
  "text-[0.75rem] text-(--foreground-muted) tabular-nums text-right min-w-16",
]);
export const playbackBarStyles = cva([
  "flex items-center gap-3 mb-3 p-3 rounded-lg",
  "bg-(--surface-tint) border border-(--border-faint)",
]);
export const timeDisplayStyles = cva([
  "text-[0.85rem] tabular-nums text-(--foreground-muted)",
]);
export const fadeControlsStyles = cva([
  "flex items-center gap-3 flex-wrap mt-2",
]);
