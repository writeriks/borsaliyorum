"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const ThemeModeToggle = () => {
  const { setTheme, theme } = useTheme();
  const isDark = theme === "dark";
  const modeName = isDark ? "Aydınlık Tema" : "Karanlık Tema";

  return (
    <Button
      className="outline-none border-none rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      variant="outline"
      size="icon"
    >
      {theme === "dark" ? (
        <Sun className="dark:-rotate-90 dark:scale-100" />
      ) : (
        <Moon className="absolute dark:rotate-0 dark:scale-100" />
      )}

      <span className="sr-only">{modeName}</span>
    </Button>
  );
};

export default ThemeModeToggle;
