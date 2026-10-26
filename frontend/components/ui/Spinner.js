"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function Spinner({ size = 18, className = "" }) {
  return (
    <Loader2
      size={size}
      strokeWidth={1.75}
      className={`animate-spin text-accent ${className}`}
    />
  );
}
