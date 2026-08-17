import { getModules } from '@revenge-mod/modules/finders'
import { withProps } from '@revenge-mod/modules/finders/filters'

let cachedToken: string | null = null

/**
 * Finds the module exposing `getToken`/`getId` (the standard cross-mod
 * pattern for locating the current user's auth token) and resolves with
 * the token string.
 */
export function getToken(): Promise<string> {
	if (cachedToken) return Promise.resolve(cachedToken)

	return new Promise((resolve, reject) => {
		const unsub = getModules(
			withProps('getToken', 'getId'),
			mod => {
				try {
					const token = (mod as { getToken: () => string | undefined }).getToken()
					if (token) {
						cachedToken = token
						unsub?.()
						resolve(token)
					}
				} catch {
					// keep waiting for a real match
				}
			},
			{ max: 5 },
		)

		setTimeout(() => {
			if (!cachedToken) reject(new Error('Could not locate the auth token module'))
		}, 15000)
	})
}
