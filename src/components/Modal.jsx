import React, { useEffect } from "react";

export default function Modal({
  title,
  children,
  onClose,
  onSave,
  isSaving = false,
  saveText = "Save",
  type = "form",
  message,
  onConfirm,
  customButtons,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10501">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        {type === "alert" || type === "confirm" ? (
          <p className="mb-4">{message}</p>
        ) : (
          <div className="space-y-4">{children}</div>
        )}
        <div className="flex justify-end space-x-2 mt-6">
          {customButtons || (
            <>
              {(type === "form" || type === "confirm") && (
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={
                  type === "alert"
                    ? onClose
                    : type === "confirm"
                    ? onConfirm
                    : onSave
                }
                disabled={isSaving}
                className="flex items-center px-4 py-2 text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : type === "alert" || type === "confirm"
                  ? "OK"
                  : saveText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
