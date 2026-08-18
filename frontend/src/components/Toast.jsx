import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState({ message: "", isError: false, visible: false });
  const hideTimer = useRef(null);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError, visible: true });
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2600);
  }, []);

  return { toast, showToast };
}

export default function Toast({ toast }) {
  return (
    <div
      id="apiToast"
      className={`api-toast${toast.visible ? " is-visible" : ""}${toast.isError ? " is-error" : ""}`}
    >
      {toast.message}
    </div>
  );
}
