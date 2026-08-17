import type { JsonStorage } from '@revenge-mod/json-storage'
import { Design } from '@revenge-mod/discord/design'
import { React } from '@revenge-mod/react'
import { KIND_BLOCKED_MESSAGE, TASK_META, TASK_ORDER, type PluginSettings, type TaskType } from '../lib/constants'

export function renderTaskToggles(jsonStorage: JsonStorage<PluginSettings>, enabledTasks: Record<TaskType, boolean>) {
	return React.createElement(Design.TableRowGroup, {
		title: 'Auto-complete specific Quest types',
		children: TASK_ORDER.map(type => {
			const meta = TASK_META[type]
			const subLabel = meta.kind === 'video' ? 'Fully automatable' : KIND_BLOCKED_MESSAGE[meta.kind]
			return React.createElement(Design.TableSwitchRow, {
				key: type,
				label: meta.label,
				subLabel,
				value: !!enabledTasks[type],
				onValueChange: (value: boolean) => {
					jsonStorage.set({ enabledTasks: { [type]: value } } as Partial<PluginSettings>)
				},
			})
		}),
	})
}
