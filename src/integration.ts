import type { AstroIntegration } from 'astro'
import { type AstroAuthConfig, virtualConfigModule } from './config'

export default (config: AstroAuthConfig = {}): AstroIntegration => ({
	name: 'astro-auth',
	hooks: {
		'astro:config:setup': ({ config: astroConfig, injectRoute, injectScript, updateConfig }) => {
			if (astroConfig.output === 'static')
				throw new Error(
					'auth-astro requires server-side rendering. Please set output to "server" & install an adapter. See https://docs.astro.build/en/guides/deploy/#adding-an-adapter-for-ssr'
				)

			updateConfig({
				vite: {
					plugins: [virtualConfigModule(config.configFile)],
					optimizeDeps: { exclude: ['auth:config'] }
				},
			})

			config.prefix ??= '/api/auth'

			if (config.injectEndpoints !== false) {
				const currentDir = new URL('.', import.meta.url).toString().replace('file://', '').substring(1)
				injectRoute({
					pattern: config.prefix + '/[...auth]',
					entryPoint: currentDir + 'api/[...auth].ts',
				})
			}

			const edge = ['@astrojs/vercel/edge', '@astrojs/cloudflare'].includes(
				astroConfig.adapter.name
			)

			if (
				(!edge && globalThis.process && process.versions.node < '19.0.0') ||
				(process.env.NODE_ENV === 'development' && edge)
			) {
				injectScript(
					'page-ssr',
					`import crypto from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = crypto;
if (typeof globalThis.crypto.subtle === "undefined") globalThis.crypto.subtle = crypto.webcrypto.subtle;
if (typeof globalThis.crypto.randomUUID === "undefined") globalThis.crypto.randomUUID = crypto.randomUUID;
`
				)
			}
		},
	},
})
