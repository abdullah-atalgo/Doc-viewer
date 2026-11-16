/** @type {import('tailwindcss').Config} */

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        intelQEDarkBlue: '#0058BE',
        intelQEBlue: '#FFFFFF',
        intelQELightBlue: '#D8E2FF',
        intelQELightGreen: '#B5C0C9',
        intelQELightOlive: '#B5C0C9',
        intelQEOffWhite: '#F7F9FB',
        opsBackground: '#F7F9FB',
        opsSurface: '#F7F9FB',
        opsSurfaceLowest: '#FFFFFF',
        opsSurfaceLow: '#F2F4F6',
        opsSurfaceContainer: '#ECEEF0',
        opsSurfaceHigh: '#E6E8EA',
        opsSurfaceHighest: '#E0E3E5',
        opsSurfaceVariant: '#E0E3E5',
        opsText: '#191C1E',
        opsMuted: '#45464D',
        opsOutline: '#76777D',
        opsOutlineVariant: '#C6C6CD',
        opsPrimary: '#000000',
        opsPrimaryContainer: '#131B2E',
        opsSecondary: '#0058BE',
        opsSecondaryContainer: '#2170E4',
        opsSuccess: '#0F9D58',
        opsWarning: '#B7791F',
        opsPending: '#4F46E5',
        opsError: '#BA1A1A',
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'Poppins', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 23, 42, 0.03)',
        modal: '0 4px 12px rgba(15, 23, 42, 0.08)',
        insetsoft: 'inset 0 1px 0 rgba(255,255,255,0.4)',
      },
    },
  },
  plugins: [],
};
