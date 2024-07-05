"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

// TODO: Fix any type
export const ThemeProvider = ({
  children,
  ...props
}: ThemeProviderProps): any => {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};
