/** @type {import('tailwindcss').Config} */
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,md,mdx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        ...defaultTheme.colors,
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
          // The INS series colour: the detail chart, the hub's chart and the
          // comparison's first territory (DESIGN.md, decision log 2026-09-24).
          sky: "hsl(var(--chart-sky))",
        },
        // DESIGN.md's data-trust palette: `bg-status-live-bg` with `text-status-live-fg`.
        status: {
          live: { bg: "hsl(var(--status-live-bg))", fg: "hsl(var(--status-live-fg))" },
          mock: { bg: "hsl(var(--status-mock-bg))", fg: "hsl(var(--status-mock-fg))" },
          partial: { bg: "hsl(var(--status-partial-bg))", fg: "hsl(var(--status-partial-fg))" },
          blocked: { bg: "hsl(var(--status-blocked-bg))", fg: "hsl(var(--status-blocked-fg))" },
        },
        // Parliament's skin (docs/design/parliament-skin-tokens.md): `text-parliament-muted`, `bg-parliament-ramp-1`.
        parliament: {
          fg: "var(--parliament-fg)",
          muted: "var(--parliament-muted)",
          border: "var(--parliament-border)",
          "border-strong": "var(--parliament-border-strong)",
          card: "var(--parliament-card)",
          surface: "var(--parliament-surface)",
          hover: "var(--parliament-hover)",
          page: "var(--parliament-page)",
          link: "var(--parliament-link)",
          "link-hover": "var(--parliament-link-hover)",
          action: "var(--parliament-action)",
          ink: "var(--parliament-ink)",
          icon: "var(--parliament-icon)",
          "commons-fill": "var(--parliament-commons-fill)",
          "senate-fill": "var(--parliament-senate-fill)",
          "resource-fill": "var(--parliament-resource-fill)",
          resource: "var(--parliament-resource)",
          commons: "var(--parliament-commons)",
          senate: "var(--parliament-senate)",
          success: "var(--parliament-success)",
          error: "var(--parliament-error)",
          focus: "var(--parliament-focus)",
          accent: "var(--parliament-accent)",
          "accent-fg": "var(--parliament-accent-fg)",
          "resource-heading": "var(--parliament-resource-heading)",
          "bill-heading": "var(--parliament-bill-heading)",
          conflict: "var(--parliament-conflict)",
          notice: "var(--parliament-notice)",
          "notice-fg": "var(--parliament-notice-fg)",
          "notice-edge": "var(--parliament-notice-edge)",
          highlight: "var(--parliament-highlight)",
          inactive: "var(--parliament-inactive)",
          "accent-focus": "var(--parliament-accent-focus)",
          abstain: "var(--parliament-abstain)",
          faint: "var(--parliament-faint)",
          frame: { fg: "var(--parliament-frame-fg)", muted: "var(--parliament-frame-muted)", subtle: "var(--parliament-frame-subtle)", hover: "var(--parliament-frame-hover)" },
          ramp: { 0: "var(--parliament-ramp-0)", 1: "var(--parliament-ramp-1)", 2: "var(--parliament-ramp-2)", 3: "var(--parliament-ramp-3)", 4: "var(--parliament-ramp-4)", edge: "var(--parliament-ramp-edge)" },
          initials: { 1: "var(--parliament-initials-1)", 2: "var(--parliament-initials-2)", 3: "var(--parliament-initials-3)", 4: "var(--parliament-initials-4)" },
        },
        choropleth: {
          1: "hsl(var(--choropleth-1))",
          2: "hsl(var(--choropleth-2))",
          3: "hsl(var(--choropleth-3))",
          4: "hsl(var(--choropleth-4))",
          5: "hsl(var(--choropleth-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      animation: {
        "pulse-attention":
          "pulse-attention 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        "pulse-attention": {
          "0%, 100%": {
            transform: "scale(1)",
            opacity: "1",
            color: "rgb(248 113 113)",
          },
          "50%": {
            transform: "scale(1.05)",
            opacity: "0.85",
            color: "rgb(239 68 68)",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "hsl(var(--foreground))",
            hr: {
              borderColor: "hsl(var(--border))",
              marginTop: "3em",
              marginBottom: "3em",
            },
            "h1, h2, h3, h4": {
              color: "hsl(var(--foreground))",
              fontWeight: "700",
            },
            a: {
              color: "hsl(var(--primary))",
              textDecoration: "underline",
              fontWeight: "500",
            },
            strong: {
              color: "hsl(var(--foreground))",
              fontWeight: "700",
            },
            code: {
              color: "hsl(var(--foreground))",
              backgroundColor: "hsl(var(--muted))",
              borderRadius: "0.25rem",
              padding: "0.2em 0.4em",
              fontWeight: "500",
            },
            pre: {
              backgroundColor: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              borderRadius: "0.5rem",
              border: "1px solid hsl(var(--border))",
            },
            blockquote: {
              color: "hsl(var(--muted-foreground))",
              borderLeftColor: "hsl(var(--border))",
            },
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};