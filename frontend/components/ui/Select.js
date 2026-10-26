"use client";

import React, { forwardRef } from "react";

export const Select = forwardRef(function Select(
  {
    label,
    id,
    options = [],
    error,
    helperText,
    className = "",
    disabled = false,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-text mb-1">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={`w-full rounded border px-3 py-1.5 text-sm text-text bg-white transition focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${
          error
            ? "border-danger focus:border-danger focus:ring-red-100"
            : "border-border focus:border-accent focus:ring-slate-100"
        } ${className}`}
        {...props}
      >
        {options.length > 0
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && (
        <p id={`${selectId}-error`} aria-live="polite" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1 text-xs text-text-muted">{helperText}</p>
      )}
    </div>
  );
});
