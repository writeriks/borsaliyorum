"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const ThemeModeToggle = () => {
  const { setTheme, theme } = useTheme();
  console.log("🚀 ~ ThemeModeToggle ~ theme:", theme);
  const isDark = theme === "dark";
  const modeName = isDark ? "Aydınlık Tema" : "Karanlık Tema";

  return (
    <div>
      <Button
        variant="secondary"
        className="bg-transparent dark:bg-transparent dark:hover:bg-secondary"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {theme === "dark" ? (
          <Sun className="mr-2 h-4 w-4 dark:-rotate-90 dark:scale-100" />
        ) : (
          <Moon className="mr-2 h-4 w-4 dark:rotate-0 dark:scale-100" />
        )}
        {modeName}
      </Button>
    </div>
  );
};

export default ThemeModeToggle;
