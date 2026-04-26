import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:    '#1C3453',
        navy2:   '#14263E',
        terra:   '#B8563B',
        terra2:  '#C96B4E',
        olive:   '#777967',
        beige:   '#C0B3A6',
        cream:   '#EDE8E1',
        cream2:  '#F5F2EE',
      },
      fontFamily: {
        forum: ['Forum', 'serif'],
        sans:  ['Open Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
