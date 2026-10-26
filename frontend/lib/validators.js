/**
 * Client-side validation and error mapping helpers.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return "Email address is required";
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return "Please enter a valid email address";
  }
  return null;
}

export function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  return null;
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword || typeof confirmPassword !== "string") {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}

export function validateLoginForm({ email, password }) {
  const errors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;

  const passErr = validatePassword(password);
  if (passErr) errors.password = passErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSignupForm({ email, password, confirmPassword }) {
  const errors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;

  const passErr = validatePassword(password);
  if (passErr) errors.password = passErr;

  const confirmErr = validateConfirmPassword(password, confirmPassword);
  if (confirmErr) errors.confirmPassword = confirmErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Maps server HTTP errors and network failures to plain, user-friendly messages.
 *
 * @param {Response | Error | { status?: number, detail?: string, message?: string }} error
 * @param {string} [context="login"] - "login" | "register"
 * @returns {string} Plain error message
 */
export function mapServerError(error, context = "login") {
  if (!error) return "An unexpected error occurred. Please try again.";

  // Handle standard network errors
  if (error instanceof TypeError || error.message === "Failed to fetch" || error.name === "TypeError") {
    return "Unable to connect to the server. Please check your network connection.";
  }

  const status = error.status;
  const detail = typeof error.detail === "string" ? error.detail : error.message || "";
  const lowerDetail = detail.toLowerCase();

  if (status === 409 || lowerDetail.includes("already registered") || lowerDetail.includes("already exists")) {
    return "An account with this email already exists.";
  }

  if (status === 401 || lowerDetail.includes("incorrect email or password") || lowerDetail.includes("invalid credentials")) {
    return "Incorrect email or password.";
  }

  if (status === 422 || lowerDetail.includes("validation error")) {
    return "Please check the information provided and try again.";
  }

  if (status >= 500) {
    return "The service is temporarily unavailable. Please try again shortly.";
  }

  if (detail && !detail.startsWith("[object") && detail.length < 120) {
    return detail;
  }

  return context === "register" ? "Registration failed. Please try again." : "Sign in failed. Please try again.";
}
