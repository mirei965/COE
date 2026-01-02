import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // ダークモードを手動切り替えorシステム同期
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // COE ブランドカラー定義
        brand: {
          // ライトモードの主役（ティール〜ミント）
          50: '#F0FDFA', // Teal-50
          100: '#CCFBF1', // Teal-100
          200: '#99F6E4', // Teal-200
          300: '#5EEAD4', // Teal-300
          400: '#2DD4BF', // Teal-400 (ティールの光)
          500: '#14B8A6', // Teal-500
          
          // ダークモードの背景専用 (Deep Navy)
          900: '#0F172A', // Slate-900 (予備)
          950: '#0B1221', // ★ここ重要！漆黒ではない「夜の青」
          surface: '#151E32', // Navy Light (Card Background)
        },
        // ニュートラル（文字色など）
        slate: {
          50: '#F8FAFC', // ライト背景
          800: '#1E293B', // ダークカード背景予備
          900: '#0F172A', 
        },
        // アクセント（ミント）
        mint: {
          100: '#D1FAE5',
          400: '#34D399',
        }
      },
      // アニメーション定義（呼吸する光）
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
