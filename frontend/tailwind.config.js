/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        stripe: {
          blue: "var(--primary-blue)",
          success: "var(--success-green)",
          warning: "var(--warning-amber)",
          danger: "var(--danger-red)",
        },
        border: "var(--border-color)",
        background: "var(--page-bg)",
        foreground: "var(--text-primary)",
        card: "var(--card-bg)",
        textSecondary: "var(--text-secondary)",
      },
      boxShadow: {
        card: "var(--card-shadow)",
      },
      borderRadius: {
        input: "6px",
        card: "8px",
        modal: "12px",
      }
    }
  },
  plugins: []
};
