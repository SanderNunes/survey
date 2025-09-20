// const withMT = require("@material-tailwind/react/utils/withMT");
import { mtConfig } from "@material-tailwind/react";
import animate from "tailwindcss-animate";
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{html,js,jsx,tsx}",
    "./src/pages/**/*.{html,js,jsx,tsx}",
    "./src/components/**/*.{html,js,jsx,tsx}",
    "./node_modules/@material-tailwind/react/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primaryDark: {
          DEFAULT: '#6D0255',
          100: '#f3ddec',
          200: '#e1a9d1',
          300: '#ce75b7',
          400: '#b9489e',
          500: '#6D0255',
          600: '#560244',
          700: '#400133',
          800: '#2a0122',
          900: '#150011',
        },
        primary: {
          DEFAULT: '#A1007C',
          100: '#f8dbf1',
          200: '#efb0dc',
          300: '#e684c6',
          400: '#dd58b1',
          500: '#A1007C',
          600: '#7d0061',
          700: '#590046',
          800: '#34002b',
          900: '#100010',
        },
        accent: {
          DEFAULT: '#a01775',
          100: '#f8dcea',
          200: '#efafcd',
          300: '#e682b0',
          400: '#dc5593',
          500: '#a01775',
          600: '#7a115a',
          700: '#540c3f',
          800: '#2f0624',
          900: '#0a010a',
        },
        avatarBg: {
          DEFAULT: '#a01775',
          100: '#f8dcea',
          200: '#efafcd',
          300: '#e682b0',
          400: '#dc5593',
          500: '#a01775',
          600: '#7a115a',
          700: '#540c3f',
          800: '#2f0624',
          900: '#0a010a',
        },
        alternative: {
          DEFAULT: '#EB8210',
          100: '#fff2dc',
          200: '#fedca7',
          300: '#fec672',
          400: '#fdb03d',
          500: '#EB8210',
          600: '#ba660c',
          700: '#894909',
          800: '#582d05',
          900: '#271002',
        },
        secondary: {
          DEFAULT: '#E0BBD4',
          100: '#fbf4f8',
          200: '#f3dfea',
          300: '#eccadb',
          400: '#e4b5cd',
          500: '#E0BBD4',
          600: '#b794aa',
          700: '#8e6d80',
          800: '#654656',
          900: '#3c1f2d',
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    animate,
    require('@tailwindcss/typography')
  ],
};
