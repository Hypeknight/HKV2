import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './apps/web/app/**/*.{ts,tsx}',
    './apps/web/components/**/*.{ts,tsx}',
    './apps/web/lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b0f',
        accent: '#f4b400',
        panel: '#14141b'
      },
      boxShadow: {
        glow: '0 0 40px rgba(244, 180, 0, 0.18)'
      }
    }
  },
  plugins: []
};

export default config;
