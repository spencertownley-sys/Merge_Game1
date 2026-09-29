// Lightweight pause overlay: resume / settings / quit (UI_UX_NOTES.md §3 Game Board).

export interface PauseOverlayProps {
  onResume: () => void;
  onSettings: () => void;
  onQuit: () => void;
}

export function PauseOverlay(p: PauseOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
      <div
        className="card flex w-full max-w-xs flex-col gap-2 px-6 py-6 text-center"
        role="dialog"
        aria-modal
      >
        <h2 className="font-display mb-2 text-2xl font-bold">Paused</h2>
        <button type="button" className="btn-primary w-full" onClick={p.onResume} autoFocus>
          Resume
        </button>
        <button type="button" className="btn-secondary w-full" onClick={p.onSettings}>
          Settings
        </button>
        <button type="button" className="btn-ghost w-full" onClick={p.onQuit}>
          Quit to menu
        </button>
      </div>
    </div>
  );
}
