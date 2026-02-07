import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				surface: 'hsl(var(--surface))',
				'surface-elevated': 'hsl(var(--surface-elevated))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))',
					dark: 'hsl(var(--primary-dark))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					glow: 'hsl(var(--secondary-glow))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				node: {
					trigger: 'hsl(var(--node-trigger))',
					'trigger-foreground': 'hsl(var(--node-trigger-foreground))',
					action: 'hsl(var(--node-action))',
					'action-foreground': 'hsl(var(--node-action-foreground))',
					utility: 'hsl(var(--node-utility))',
					'utility-foreground': 'hsl(var(--node-utility-foreground))',
					ai: 'hsl(var(--node-ai))',
					'ai-foreground': 'hsl(var(--node-ai-foreground))'
				},
				canvas: {
					background: 'hsl(var(--canvas-background))',
					grid: 'hsl(var(--canvas-grid))'
				},
				connection: {
					line: 'hsl(var(--connection-line))',
					hover: 'hsl(var(--connection-hover))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-glow': 'var(--gradient-glow)',
				'gradient-node': 'var(--gradient-node)'
			},
			boxShadow: {
				glow: 'var(--shadow-glow)',
				node: 'var(--shadow-node)',
				elevated: 'var(--shadow-elevated)'
			},
			transitionTimingFunction: {
				smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
				bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
