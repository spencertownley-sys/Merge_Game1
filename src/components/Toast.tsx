import { useUi } from '../store/uiStore';

export function ToastHost() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto card min-h-11 px-4 py-2 text-sm font-semibold ${
            t.kind === 'error' ? 'text-coral' : 'text-ink'
          }`}
          role="status"
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
