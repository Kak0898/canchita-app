// /** @type {import('tailwindcss').Config} */
// export default {
//   content: [
//     "./index.html",
//     "./src/**/*.{js,ts,jsx,tsx}",
//   ],
//   theme: {
//     extend: {
//       colors: {
//         pitch: {
//           50:  '#f0fdf4',
//           100: '#dcfce7',
//           400: '#4ade80',
//           500: '#22c55e',
//           600: '#16a34a',
//           700: '#15803d',
//           900: '#14532d',
//         },
//         grass: '#1a2e1a',
//         turf:  '#111c11',
//         chalk: '#e8f5e9',
//       },
//       fontFamily: {
//         display: ['Oswald', 'sans-serif'],
//         body:    ['Inter', 'sans-serif'],
//         mono:    ['JetBrains Mono', 'monospace'],
//       },
//     },
//   },
//   plugins: [],
// }


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          50:   '#f0fdf4',
          100:  '#dcfce7',
          300:  '#86efac', // 👈 ¡Agregado! Para tu hover:text-pitch-300
          400:  '#4ade80',
          500:  '#22c55e',
          600:  '#16a34a',
          700:  '#15803d',
          800:  '#166534', // 👈 ¡Agregado! Para tu border-pitch-800 en el .badge
          900:  '#14532d',
        },
        grass: '#1a2e1a',
        turf:  '#111c11',
        chalk: '#e8f5e9',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}