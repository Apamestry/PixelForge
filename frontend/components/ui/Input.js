"use client";

import React, { forwardRef } from "react";

export const Input = forwardRef(function Input(
  {
    label,
    id,
    type = "text",
    error,
    helperText,
    className = "",
    disabled = false,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-text mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`w-full rounded border px-3 py-1.5 text-sm text-text placeholder-slate-400 bg-white transition focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${
          error
            ? "border-danger focus:border-danger focus:ring-red-100"
            : "border-border focus:border-accent focus:ring-slate-100"
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} aria-live="polite" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1 text-xs text-text-muted">{helperText}</p>
      )}
    </div>
  );
});
