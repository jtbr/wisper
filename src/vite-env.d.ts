/// <reference types="vite/client" />

export {};

declare global {
  const __APP_VERSION__: string;
  interface Window {
    electronAPI: {
      onStartRecording: (callback: () => void) => void;
      onStopRecording: (callback: () => void) => void;
      setRecordingState: (state: boolean) => void;
      getRecordingState: () => Promise<boolean>;
      copyToClipboard: (text: string) => Promise<boolean>;
      pasteToCursor: (text: string) => Promise<boolean>;
      hideWindow: () => Promise<void>;
      resizeWindow: (width: number, height: number) => void;
      onOpenSettings: (callback: () => void) => void;
      updateShortcut: (shortcut: string) => Promise<boolean>;
      removeAllListeners: (channel: string) => void;
      log: (level: "info" | "warn" | "error", message: string) => void;
      saveDebugAudio: (arrayBuffer: ArrayBuffer, mimeType: string, subdir?: string, filename?: string) => Promise<string | null>;
    };
  }
}
