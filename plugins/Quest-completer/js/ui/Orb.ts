import { React, ReactNative as RN } from '@revenge-mod/react'

export function renderOrb(percent: number, size = 48, accent = '#5865f2') {
	const clamped = Math.max(0, Math.min(100, percent || 0))
	return React.createElement(
		RN.View,
		{
			style: {
				width: size,
				height: size,
				borderRadius: size / 2,
				backgroundColor: '#2b2d31',
				overflow: 'hidden',
				justifyContent: 'center',
				alignItems: 'center',
				borderWidth: 1,
				borderColor: '#3f4147',
			},
		},
		React.createElement(RN.View, {
			style: {
				position: 'absolute',
				left: 0,
				right: 0,
				bottom: 0,
				height: Math.max(2, Math.round((size * clamped) / 100)),
				backgroundColor: accent,
				opacity: 0.85,
			},
		}),
		React.createElement(RN.Text, { style: { color: '#ffffff', fontSize: 11, fontWeight: '700' } }, `${Math.round(clamped)}%`),
	)
}
