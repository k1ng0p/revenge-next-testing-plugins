import { React, ReactNative as RN } from '@revenge-mod/react'
import { TASK_META, type Quest, type TaskType } from '../lib/constants'
import { overallPercent, selectTasks } from '../lib/questApi'
import type { QuestStore } from '../lib/store'
import { renderOrb } from './Orb'

export function renderQuestRow(store: QuestStore, quest: Quest, enabledTasks: Record<TaskType, boolean>) {
	const types = selectTasks(quest, enabledTasks)
	const accent = quest.status === 'done' ? '#23a559' : quest.status === 'error' ? '#f23f42' : '#5865f2'
	const percent = overallPercent(quest, types)

	const subtitle = !types.length
		? 'No enabled task type for this quest'
		: types
				.map(t => {
					const target = quest.tasks[t]!.target
					const value = quest.progress[t]?.value || 0
					return `${TASK_META[t].label} ${Math.round(value)}/${target}s`
				})
				.join(', ')

	const buttonLabel = quest.status === 'done' ? 'Done' : quest.status === 'running' ? 'Running' : 'Start'

	return React.createElement(
		RN.View,
		{
			key: quest.id,
			style: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2b2d31', borderRadius: 12, padding: 12, marginBottom: 10 },
		},
		renderOrb(percent, 48, accent),
		React.createElement(
			RN.View,
			{ style: { flex: 1, marginLeft: 12 } },
			React.createElement(RN.Text, { style: { color: '#ffffff', fontWeight: '600' } }, quest.name),
			React.createElement(RN.Text, { style: { color: '#949ba4', fontSize: 12, marginTop: 2 } }, subtitle),
			quest.status === 'error' || quest.status === 'unsupported'
				? React.createElement(RN.Text, { style: { color: '#f23f42', fontSize: 12, marginTop: 2 } }, quest.error)
				: null,
		),
		React.createElement(
			RN.TouchableOpacity,
			{
				disabled: !types.length || quest.status === 'running' || quest.status === 'done',
				onPress: () => store.completeQuest(quest.id),
				style: {
					paddingHorizontal: 10,
					paddingVertical: 6,
					borderRadius: 8,
					backgroundColor: quest.status === 'done' ? '#23a559' : '#404249',
					opacity: !types.length || quest.status === 'running' ? 0.6 : 1,
				},
			},
			React.createElement(RN.Text, { style: { color: '#ffffff', fontSize: 12 } }, buttonLabel),
		),
	)
}
