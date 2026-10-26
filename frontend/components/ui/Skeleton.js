"use client";

import React from "react";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200/70 ${className}`}
      {...props}
    />
  );
}
