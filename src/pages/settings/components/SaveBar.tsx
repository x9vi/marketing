export function SaveBar({ onSave, onReset, isSaving, dirty, message, error }: { onSave: () => void; onReset: () => void; isSaving: boolean; dirty: boolean; message?: string; error?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1">
        {message && <p className="text-sm font-medium text-emerald-600">{message}</p>}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        {!message && !error && (
          <p className="text-sm text-slate-500">
            {dirty ? 'You have unsaved changes.' : 'All changes saved.'}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={isSaving}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !dirty}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
