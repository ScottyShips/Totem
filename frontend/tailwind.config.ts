import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // "Midnight" — warm dusk-purple, not cold blue-black. The whole palette
        // carries a violet/aubergine undertone so even unstyled surfaces read
        // as twilight rather than tech-app void. Cards (900) sit visibly above
        // the body (950) without needing borders to delineate.
        midnight: {
          50: "#f7f3fc",
          100: "#ebe4f5",
          200: "#d4c5e8",
          300: "#b8a0d4",
          400: "#9576b8",
          500: "#735696",
          600: "#583f76",
          700: "#3f2c5a",
          800: "#2a1c3f",
          900: "#1f1330",
          950: "#140a23",
        },
        // Primary action color — vivid violet.
        iris: {
          300: "#cba6f7",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        // Hot pink — used in hero gradients and "Going" status.
        bloom: {
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
        },
        // Electric cyan — third stop in the aurora gradient, secondary highlights.
        spark: {
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        // Success — fresh, slightly cool green to sit alongside iris/spark.
        mint: {
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
        },
        // Error — warm rose, less aggressive than red but still legible.
        flame: {
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
        },
        // Sunset — warm peach/coral/gold. Brings festival-poster warmth
        // into times, counts, icons. Pairs against cool iris/spark for that
        // "dusk just before the lights come on" feeling.
        sunset: {
          200: "#fee4c4",
          300: "#fed7aa",
          400: "#fdba74",
          500: "#fb923c",
          600: "#ea7826",
        },
        // Marigold — used for accents alongside sunset, less peachy.
        gold: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
        },
      },
      backgroundImage: {
        // Reusable aurora gradient — apply with `bg-aurora` and `bg-clip-text`
        // for hero text, or as a regular background for accent surfaces.
        aurora:
          "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #38bdf8 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
