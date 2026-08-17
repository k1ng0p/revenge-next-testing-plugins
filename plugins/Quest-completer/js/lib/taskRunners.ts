import { HEARTBEAT_INTERVAL_MS, KIND_BLOCKED_MESSAGE, MAX_PING_SECONDS, MIN_PING_SECONDS, TASK_META, type Quest, type TaskType } from './constants'
import { questRequest } from './questApi'

export type ProgressListener = (type: TaskType, progress: { value: number; completed_at?: string | null }) => void

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Real-time pacing: the timestamp we send is always derived from actual
 * elapsed wall-clock time, never jumped ahead. Completing a target-second
 * video takes target real seconds, the same as actually watching it.
 */
async function runVideoTask(quest: Quest, type: TaskType, onProgress: ProgressListener, stoppedRef: { stopped: boolean }) {
	const target = quest.tasks[type]!.target
	let done = quest.progress[type]?.value || 0
	const startedAt = Date.now() - done * 1000

	while (!stoppedRef.stopped && done < target) {
		const interval = MIN_PING_SECONDS + Math.random() * (MAX_PING_SECONDS - MIN_PING_SECONDS)
		await sleep(interval * 1000)
		if (stoppedRef.stopped) return

		const elapsed = (Date.now() - startedAt) / 1000
		const timestamp = Math.min(target, elapsed)
		const res = await questRequest(`/quests/${quest.id}/video-progress`, 'POST', { timestamp })
		const progress = res?.progress?.[type]
		done = progress ? progress.value : timestamp
		onProgress(type, progress || { value: done })

		if (progress?.completed_at) return
	}
}

/**
 * Heartbeat tasks (Play/Stream on Desktop, Play Activity) are paced entirely
 * by Discord's server based on real elapsed time between calls; we cannot
 * fast-forward these even if we wanted to. Discord also rejects the request
 * outright (401) unless it carries an Electron user-agent, so this will
 * typically fail immediately from a mobile client.
 */
async function runHeartbeatTask(quest: Quest, type: TaskType, onProgress: ProgressListener, stoppedRef: { stopped: boolean }) {
	const target = quest.tasks[type]!.target

	while (!stoppedRef.stopped) {
		const res = await questRequest(`/quests/${quest.id}/heartbeat`, 'POST', {
			application_id: quest.applicationId,
			terminal: false,
		})
		const progress = res?.progress?.[type]
		const done = progress ? progress.value : 0
		onProgress(type, progress || { value: done })

		if (stoppedRef.stopped || done >= target || progress?.completed_at) return
		await sleep(HEARTBEAT_INTERVAL_MS)
	}
}

/**
 * Console tasks require the linked Xbox/PlayStation account to actually be
 * online and playing the game right now; we cannot fake that. We surface
 * Discord's own error hints when it isn't.
 */
async function runConsoleTask(quest: Quest, _type: TaskType) {
	const res = await questRequest(`/quests/${quest.id}/console/start`, 'POST', {})
	if (res?.started) return
	const hints = res?.error_hints_v2?.map((h: { message: string }) => h.message) || res?.error_hints || []
	throw new Error(hints.join('; ') || 'Console did not report the game as running')
}

export function runTask(
	quest: Quest,
	type: TaskType,
	onProgress: ProgressListener,
	stoppedRef: { stopped: boolean },
): Promise<void> {
	const kind = TASK_META[type].kind
	if (kind === 'video') return runVideoTask(quest, type, onProgress, stoppedRef)
	if (kind === 'heartbeat') return runHeartbeatTask(quest, type, onProgress, stoppedRef)
	if (kind === 'console') return runConsoleTask(quest, type)
	return Promise.reject(new Error(KIND_BLOCKED_MESSAGE.achievement))
}
