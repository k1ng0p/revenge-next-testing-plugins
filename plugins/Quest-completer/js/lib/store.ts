import type { JsonStorage } from '@revenge-mod/json-storage'
import { DEFAULT_ENABLED_TASKS, type PluginSettings, type Quest, type QuestState, type TaskType } from './constants'
import { questRequest, selectTasks, toQuestEntry } from './questApi'
import { runTask } from './taskRunners'

export interface QuestStore {
	getState(): QuestState
	subscribe(fn: (state: QuestState) => void): () => void
	refresh(): Promise<void>
	completeQuest(id: string): Promise<void>
	completeAll(): Promise<void>
	destroy(): void
}

export function createQuestStore(jsonStorage: JsonStorage<PluginSettings>): QuestStore {
	let state: QuestState = { quests: [], loading: false, error: null }
	const listeners = new Set<(state: QuestState) => void>()
	const stoppedRef = { stopped: false }

	function emit() {
		listeners.forEach(fn => fn(state))
	}

	function patchState(patch: Partial<QuestState>) {
		state = { ...state, ...patch }
		emit()
	}

	function currentQuest(id: string) {
		return state.quests.find(q => q.id === id)
	}

	function patchQuest(id: string, patch: Partial<Quest>) {
		state = { ...state, quests: state.quests.map(q => (q.id === id ? { ...q, ...patch } : q)) }
		emit()
	}

	function patchQuestProgress(id: string, type: TaskType, progress: { value: number; completed_at?: string | null }) {
		const quest = currentQuest(id)
		if (!quest) return
		patchQuest(id, { progress: { ...quest.progress, [type]: progress } })
	}

	function getEnabledTasks(): Record<TaskType, boolean> {
		return (jsonStorage.cache as PluginSettings | undefined)?.enabledTasks || DEFAULT_ENABLED_TASKS
	}

	async function refresh() {
		patchState({ loading: true, error: null })
		try {
			const data = await questRequest('/quests/@me', 'GET')
			const now = Date.now()
			const quests: any[] = data?.quests || []
			const list = quests
				.filter(q => !q.user_status?.completed_at)
				.filter(q => {
					const exp = q.config?.expires_at
					return !exp || new Date(exp).getTime() > now
				})
				.map(toQuestEntry)
			patchState({ quests: list, loading: false })
		} catch (e) {
			patchState({ loading: false, error: String((e as Error)?.message || e) })
		}
	}

	async function completeQuest(id: string) {
		const quest = currentQuest(id)
		if (!quest || quest.status === 'running' || quest.status === 'done') return

		const types = selectTasks(quest, getEnabledTasks())
		if (!types.length) {
			patchQuest(id, {
				status: 'unsupported',
				error: 'No enabled task type available for this quest. Toggle one on above.',
			})
			return
		}

		patchQuest(id, { status: 'running', error: null })

		try {
			if (!quest.enrolled) {
				await questRequest(`/quests/${id}/enroll`, 'POST', { location: 1 })
				patchQuest(id, { enrolled: true })
			}

			for (const type of types) {
				await runTask(quest, type, (t, progress) => patchQuestProgress(id, t, progress), stoppedRef)
			}

			if (!stoppedRef.stopped) {
				await questRequest(`/quests/${id}/claim-reward`, 'POST', { location: 1, platform: 0 }).catch(() => {
					// reward may already be auto-granted; ignore claim errors
				})
				patchQuest(id, { status: 'done' })
			}
		} catch (e) {
			patchQuest(id, { status: 'error', error: String((e as Error)?.message || e) })
		}
	}

	async function completeAll() {
		const enabled = getEnabledTasks()
		const queue = state.quests.filter(q => q.status !== 'done' && selectTasks(q, enabled).length > 0)
		for (const q of queue) {
			if (stoppedRef.stopped) break
			await completeQuest(q.id)
		}
	}

	function destroy() {
		stoppedRef.stopped = true
		listeners.clear()
	}

	return {
		getState: () => state,
		subscribe: fn => {
			listeners.add(fn)
			return () => listeners.delete(fn)
		},
		refresh,
		completeQuest,
		completeAll,
		destroy,
	}
}
