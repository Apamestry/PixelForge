"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function Button({
  children,
  type = "button",
  variant = "primary", // "primary" | "secondary" | "danger" | "ghost"
  size = "md", // "sm" | "md" | "lg"
  loading = false,
  disabled = false,
  className = "",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs space-x-1.5",
    md: "px-3.5 py-1.5 text-sm space-x-2",
    lg: "px-4 py-2 text-sm space-x-2",
  };

  const variantStyles = {
    primary: "bg-accent hover:bg-accent-hover text-white border border-transparent",
    secondary: "bg-white hover:bg-slate-50 text-text border border-border",
    danger: "bg-white hover:bg-red-50 text-danger border border-red-200 focus:ring-red-100",
    ghost: "bg-transparent hover:bg-slate-100 text-text-muted hover:text-text border border-transparent",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />}
      <span>{children}</span>
    </button>
  );
}
