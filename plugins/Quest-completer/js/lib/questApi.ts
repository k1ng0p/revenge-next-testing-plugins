import { API_BASE, TASK_ORDER, type Quest, type TaskType } from './constants'
import { getToken } from './modules'

export async function questRequest(path: string, method?: string, body?: unknown): Promise<any> {
	const token = await getToken()
	const res = await fetch(API_BASE + path, {
		method: method || 'GET',
		headers: {
			Authorization: token,
			'Content-Type': 'application/json',
		},
		body: body ? JSON.stringify(body) : undefined,
	})

	const text = await res.text()
	let data: any = null
	try {
		data = text ? JSON.parse(text) : null
	} catch {
		data = null
	}

	if (!res.ok) {
		const msg = data?.message || text || `HTTP ${res.status}`
		const err = new Error(`Quest API ${res.status}: ${msg}`) as Error & { status?: number; body?: unknown }
		err.status = res.status
		err.body = data
		throw err
	}

	return data
}

/** Returns every task type present in a raw quest's config, mapped to its target. */
export function collectTasks(rawQuest: any): Partial<Record<TaskType, { target: number }>> {
	return rawQuest?.config?.task_config_v2?.tasks || {}
}

export function toQuestEntry(rawQuest: any): Quest {
	const userStatus = rawQuest.user_status || {}
	return {
		id: rawQuest.id,
		name: rawQuest.config?.messages?.quest_name || 'Quest',
		joinOperator: rawQuest.config?.task_config_v2?.join_operator || 'or',
		tasks: collectTasks(rawQuest),
		enrolled: !!userStatus.enrolled_at,
		progress: userStatus.progress || {},
		applicationId: rawQuest.config?.application?.id,
		status: 'idle',
		error: null,
	}
}

/** Picks which of the quest's tasks to attempt, given the user's toggles. */
export function selectTasks(quest: Quest, enabledTasks: Record<TaskType, boolean>): TaskType[] {
	let matched: TaskType[] = []
	for (const type of TASK_ORDER) {
		if (quest.tasks[type] && enabledTasks[type]) matched.push(type)
	}
	if (quest.joinOperator !== 'and') matched = matched.slice(0, 1)
	return matched
}

export function taskPercent(quest: Quest, type: TaskType): number {
	const target = quest.tasks[type]?.target
	const value = quest.progress[type]?.value
	if (!target) return 0
	return Math.min(100, Math.round(((value || 0) / target) * 100))
}

export function overallPercent(quest: Quest, types: TaskType[]): number {
	if (!types.length) return 0
	const total = types.reduce((sum, type) => sum + taskPercent(quest, type), 0)
	return Math.round(total / types.length)
}
