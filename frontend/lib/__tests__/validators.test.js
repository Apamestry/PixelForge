import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateLoginForm,
  validateSignupForm,
  mapServerError,
} from "../validators";

describe("validators module", () => {
  describe("validateEmail", () => {
    it("rejects empty or whitespace emails", () => {
      expect(validateEmail("")).toBe("Email address is required");
      expect(validateEmail("   ")).toBe("Email address is required");
      expect(validateEmail(null)).toBe("Email address is required");
    });

    it("rejects invalid email formats", () => {
      expect(validateEmail("plainaddress")).toBe("Please enter a valid email address");
      expect(validateEmail("@missinguser.com")).toBe("Please enter a valid email address");
      expect(validateEmail("user@domain")).toBe("Please enter a valid email address");
    });

    it("accepts valid email addresses", () => {
      expect(validateEmail("user@example.com")).toBeNull();
      expect(validateEmail("tejas.m@sub.domain.co")).toBeNull();
    });
  });

  describe("validatePassword", () => {
    it("rejects passwords shorter than 8 characters per SPEC section 5", () => {
      expect(validatePassword("")).toBe("Password is required");
      expect(validatePassword("1234567")).toBe("Password must be at least 8 characters");
    });

    it("accepts passwords with 8 or more characters", () => {
      expect(validatePassword("12345678")).toBeNull();
      expect(validatePassword("super-secure-pass!")).toBeNull();
    });
  });

  describe("validateConfirmPassword", () => {
    it("rejects non-matching confirmation password", () => {
      expect(validateConfirmPassword("pass1234", "pass5678")).toBe("Passwords do not match");
      expect(validateConfirmPassword("pass1234", "")).toBe("Please confirm your password");
    });

    it("accepts matching confirmation password", () => {
      expect(validateConfirmPassword("pass1234", "pass1234")).toBeNull();
    });
  });

  describe("validateLoginForm and validateSignupForm", () => {
    it("validates login form", () => {
      const invalid = validateLoginForm({ email: "invalid", password: "123" });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.email).toBeDefined();
      expect(invalid.errors.password).toBeDefined();

      const valid = validateLoginForm({ email: "user@example.com", password: "validpassword" });
      expect(valid.isValid).toBe(true);
      expect(Object.keys(valid.errors)).toHaveLength(0);
    });

    it("validates signup form", () => {
      const invalid = validateSignupForm({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "mismatch",
      });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.confirmPassword).toBe("Passwords do not match");

      const valid = validateSignupForm({
        email: "user@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(valid.isValid).toBe(true);
    });
  });

  describe("mapServerError", () => {
    it("maps duplicate email errors (409 or detail text)", () => {
      expect(mapServerError({ status: 409, detail: "Email already registered" })).toBe(
        "An account with this email already exists."
      );
    });

    it("maps invalid credentials errors (401 or detail text)", () => {
      expect(mapServerError({ status: 401, detail: "Incorrect email or password" })).toBe(
        "Incorrect email or password."
      );
    });

    it("maps validation errors (422)", () => {
      expect(mapServerError({ status: 422, detail: "Validation error" })).toBe(
        "Please check the information provided and try again."
      );
    });

    it("maps network connection failures", () => {
      const networkError = new TypeError("Failed to fetch");
      expect(mapServerError(networkError)).toBe(
        "Unable to connect to the server. Please check your network connection."
      );
    });

    it("maps 500 server errors", () => {
      expect(mapServerError({ status: 500 })).toBe(
        "The service is temporarily unavailable. Please try again shortly."
      );
    });
  });
});
