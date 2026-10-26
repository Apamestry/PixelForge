"use client";

import React from "react";

export function IconButton({
  icon: Icon,
  label,
  tooltip,
  variant = "ghost", // "ghost" | "secondary" | "primary" | "danger"
  size = "md", // "sm" | "md" | "lg"
  active = false,
  disabled = false,
  className = "",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-40 disabled:cursor-not-allowed select-none";

  const sizeStyles = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20,
  };

  const variantStyles = {
    ghost: active
      ? "bg-slate-100 text-accent"
      : "text-text-muted hover:text-text hover:bg-slate-100",
    secondary: active
      ? "bg-slate-100 border border-border text-accent"
      : "bg-white border border-border text-text hover:bg-slate-50",
    primary: "bg-accent hover:bg-accent-hover text-white",
    danger: "text-text-muted hover:text-danger hover:bg-red-50",
  };

  return (
    <button
      type="button"
      title={tooltip || label}
      aria-label={label || tooltip}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.ghost
      } ${className}`}
      {...props}
    >
      {Icon && <Icon size={iconSizes[size] || 18} strokeWidth={1.75} />}
    </button>
  );
}
