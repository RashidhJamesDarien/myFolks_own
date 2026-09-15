"use client";

export function ConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-modal">
        <h2>{title}</h2>

        <p>{message}</p>

        <div className="dialog-actions">
          <button
            type="button"
            className="button lavender"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button primary"
            onClick={onConfirm}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
