import { useCallback, useEffect, useState } from "react";
import { getStoredTheme, setStoredTheme } from "./auth";

export function useTheme() {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      setStoredTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
