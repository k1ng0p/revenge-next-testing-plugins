import Page from '@revenge-mod/components/Page'
import { React, ReactNative as RN } from '@revenge-mod/react'
import { DEFAULT_ENABLED_TASKS, type PluginSettings, type QuestState } from '../lib/constants'
import type { QuestStore } from '../lib/store'
import { renderQuestRow } from './QuestRow'
import { renderSummaryBar } from './SummaryBar'
import { renderTaskToggles } from './TaskToggles'
import { renderWarningBanner } from './WarningBanner'

interface SettingsProps {
	api: {
		plugin: { questStore?: QuestStore }
		jsonStorage: import('@revenge-mod/json-storage').JsonStorage<PluginSettings>
	}
}

export function Settings({ api }: SettingsProps) {
	const store = api.plugin.questStore

	const [state, setState] = React.useState<QuestState>(store ? store.getState() : { quests: [], loading: false, error: null })

	React.useEffect(() => {
		if (!store) return
		return store.subscribe(setState)
	}, [store])

	const settings = api.jsonStorage.use()
	const enabledTasks = settings?.enabledTasks || DEFAULT_ENABLED_TASKS

	if (!store) {
		return React.createElement(
			RN.View,
			{ style: { padding: 16 } },
			React.createElement(RN.Text, { style: { color: '#ffffff' } }, 'Quest Completer is not running.'),
		)
	}

	return React.createElement(
		Page,
		{ style: { flex: 1 } },
		React.createElement(
			RN.ScrollView,
			{ style: { flex: 1 }, contentContainerStyle: { padding: 16 }, showsVerticalScrollIndicator: false },
			renderWarningBanner(),
			renderSummaryBar(store, state),
			renderTaskToggles(api.jsonStorage, enabledTasks),
			React.createElement(RN.Text, { style: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 12 } }, 'Quests'),
			state.error ? React.createElement(RN.Text, { style: { color: '#f23f42', marginBottom: 10 } }, state.error) : null,
			state.quests.length === 0 && !state.loading
				? React.createElement(
						RN.Text,
						{ style: { color: '#b5bac1' } },
						'No active quests found. Open the Quests tab in Discord, accept a quest, then tap Refresh.',
					)
				: state.quests.map(q => renderQuestRow(store, q, enabledTasks)),
		),
	)
}
