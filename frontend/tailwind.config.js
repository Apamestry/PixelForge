/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#F7FAFC",
        text: {
          DEFAULT: "#0F172A",
          muted: "#475569",
        },
        border: {
          DEFAULT: "#E2E8F0",
        },
        accent: {
          DEFAULT: "#065A82",
          hover: "#054A6B",
        },
        danger: {
          DEFAULT: "#B91C1C",
          hover: "#991B1B",
        },
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      fontSize: {
        body: ["14px", { lineHeight: "20px" }],
        panel: ["13px", { lineHeight: "18px" }],
      },
    },
  },
  plugins: [],
};
