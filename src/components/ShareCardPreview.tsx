// Shows the rendered share card in-page. Used after the PNG-download fallback so the card is
// still reachable (long-press / drag to save) on hosts that block script-started downloads.

import { useEffect, useState } from 'react';

export function ShareCardPreview({ blob, onClose }: { blob: Blob; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="card flex max-h-full w-full max-w-sm flex-col items-center gap-3 overflow-y-auto p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        {url && (
          <img
            src={url}
            alt="Your result card"
            className="w-full rounded-xl shadow"
            data-testid="share-preview"
          />
        )}
        <p className="text-center text-xs text-ink-soft">
          Saved as a PNG where downloads are allowed. Otherwise long-press or drag the card to keep
          it.
        </p>
        <div className="flex w-full gap-2">
          {url && (
            <a href={url} download="result-card.png" className="btn-secondary flex-1">
              Save image
            </a>
          )}
          <button type="button" className="btn-primary flex-1" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
