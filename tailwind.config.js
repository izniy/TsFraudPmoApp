/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",         // screens and route files (Expo Router)
    "./components/**/*.{js,jsx,ts,tsx}",  // reusable components
    "./hooks/**/*.{js,jsx,ts,tsx}",       // if you're styling inside hooks
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
