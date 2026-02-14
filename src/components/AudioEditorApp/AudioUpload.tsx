"use client";

import { cva } from "class-variance-authority";
import { useDropzone } from "react-dropzone";

interface AudioUploadProps {
  onAudioSelected: (file: File) => void;
}

const dropzoneStyles = cva([
  "border-2 border-dashed rounded-lg p-10 relative text-center cursor-pointer",
  "transition-[border-color,background-color] duration-200",
  "border-(--border-faint) bg-(--surface-tint) text-(--foreground-subtle)",
  "hover:border-(--border-hover)",
  "data-[drag-active=true]:border-(--accent)",
  "data-[drag-active=true]:bg-(--accent-tint)",
  "data-[drag-active=true]:text-(--accent)",
]);

const dropzoneTextStyles = cva([], {
  variants: {
    type: {
      primary: "text-base mb-2",
      secondary: "text-[0.85rem] opacity-70",
      overlay:
        "text-base absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    },
    visibleWhen: {
      idle: "data-[drag-active=true]:invisible",
      active: "invisible data-[drag-active=true]:visible",
    },
  },
});

export default function AudioUpload({ onAudioSelected }: AudioUploadProps) {
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onAudioSelected(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/*": [],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      data-drag-active={isDragActive}
      className={dropzoneStyles()}
    >
      <input {...getInputProps()} />
      <p
        data-drag-active={isDragActive}
        className={dropzoneTextStyles({ type: "primary", visibleWhen: "idle" })}
      >
        Drag & drop an audio file here, or click to select
      </p>
      <p
        data-drag-active={isDragActive}
        className={dropzoneTextStyles({
          type: "secondary",
          visibleWhen: "idle",
        })}
      >
        Supports varies by browser. If loading does nothing, the file type may
        be unsupported. MP3 and WAV are widely supported.
      </p>
      <p
        data-drag-active={isDragActive}
        className={dropzoneTextStyles({
          type: "overlay",
          visibleWhen: "active",
        })}
      >
        Drop the audio file here ...
      </p>
    </div>
  );
}
