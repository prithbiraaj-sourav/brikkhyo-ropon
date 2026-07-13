import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        bangla: ['"Noto Sans Bengali"', 'sans-serif'],
      },
      colors: {
        forest: {
          50:  '#E1F5EE',
          100: '#9FE1CB',
          200: '#5DCAA5',
          500: '#1D9E75',
          700: '#0F6E56',
          900: '#085041',
        },
      },
    },
  },
  plugins: [],
}
export default config
