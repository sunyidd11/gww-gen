/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        'hospital-blue': '#6a46ff',
        'hospital-bg': '#F5F7FA',
      }
    },
  },
  plugins: [],
};

