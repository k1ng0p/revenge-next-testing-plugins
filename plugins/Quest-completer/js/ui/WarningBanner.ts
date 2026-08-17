import { React, ReactNative as RN } from '@revenge-mod/react'

export function renderWarningBanner() {
	return React.createElement(
		RN.View,
		{
			style: {
				backgroundColor: '#3a2a1a',
				borderColor: '#e8a33d',
				borderWidth: 1,
				borderRadius: 10,
				padding: 12,
				marginBottom: 16,
			},
		},
		React.createElement(RN.Text, { style: { color: '#e8a33d', fontWeight: '700', marginBottom: 4 } }, 'Use at your own risk'),
		React.createElement(
			RN.Text,
			{ style: { color: '#f0d9b5', fontSize: 12, lineHeight: 16 } },
			'This spoofs progress directly against Discord\u2019s Quests API, which is against Discord\u2019s Terms of Service. Only Watch Video quests are reliably automatable from mobile; Play/Stream on Desktop, console, and achievement quests are blocked by Discord\u2019s own servers or the game itself. Your account could be actioned for using this.',
		),
	)
}
