/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { fontFamily: { sans: ['Inter', 'DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] }, colors: { ink: '#172033', brand: '#2563eb' }, boxShadow: { card: '0 10px 30px rgba(21, 36, 66, .045)' } } },
  plugins: [],
}
