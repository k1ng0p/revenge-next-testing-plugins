import { React, ReactNative as RN } from '@revenge-mod/react'
import type { QuestState } from '../lib/constants'
import type { QuestStore } from '../lib/store'

export function renderSummaryBar(store: QuestStore, state: QuestState) {
	const total = state.quests.length
	const done = state.quests.filter(q => q.status === 'done').length
	const remaining = total - done

	return React.createElement(
		RN.View,
		{ style: { marginBottom: 16 } },
		React.createElement(
			RN.View,
			{ style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 } },
			React.createElement(
				RN.Text,
				{ style: { color: '#b5bac1', fontSize: 13 } },
				total === 0 ? 'No quests loaded yet' : `${done} done \u2022 ${remaining} remaining \u2022 ${total} total`,
			),
		),
		React.createElement(
			RN.View,
			{ style: { flexDirection: 'row' } },
			React.createElement(
				RN.TouchableOpacity,
				{
					onPress: () => store.refresh(),
					style: {
						flex: 1,
						alignItems: 'center',
						paddingVertical: 10,
						backgroundColor: '#2b2d31',
						borderRadius: 8,
						marginRight: 8,
					},
				},
				React.createElement(RN.Text, { style: { color: '#ffffff', fontWeight: '600' } }, state.loading ? 'Checking...' : 'Check for Quests'),
			),
			React.createElement(
				RN.TouchableOpacity,
				{
					onPress: () => store.completeAll(),
					disabled: total === 0 || remaining === 0,
					style: {
						flex: 1,
						alignItems: 'center',
						paddingVertical: 10,
						backgroundColor: '#5865f2',
						borderRadius: 8,
						opacity: total === 0 || remaining === 0 ? 0.6 : 1,
					},
				},
				React.createElement(RN.Text, { style: { color: '#ffffff', fontWeight: '600' } }, 'Complete Quests'),
			),
		),
	)
}
