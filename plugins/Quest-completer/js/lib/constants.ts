export type TaskKind = 'video' | 'heartbeat' | 'console' | 'achievement'

export type TaskType =
	| 'WATCH_VIDEO'
	| 'WATCH_VIDEO_ON_MOBILE'
	| 'PLAY_ON_DESKTOP'
	| 'STREAM_ON_DESKTOP'
	| 'PLAY_ACTIVITY'
	| 'PLAY_ON_XBOX'
	| 'PLAY_ON_PLAYSTATION'
	| 'ACHIEVEMENT_IN_GAME'
	| 'ACHIEVEMENT_IN_ACTIVITY'

export interface TaskMeta {
	label: string
	kind: TaskKind
}

export const API_BASE = 'https://discord.com/api/v9'
export const MIN_PING_SECONDS = 5
export const MAX_PING_SECONDS = 12
export const HEARTBEAT_INTERVAL_MS = 100000

export const TASK_META: Record<TaskType, TaskMeta> = {
	WATCH_VIDEO: { label: 'Watch Video', kind: 'video' },
	WATCH_VIDEO_ON_MOBILE: { label: 'Watch Video on Mobile', kind: 'video' },
	PLAY_ON_DESKTOP: { label: 'Play on Desktop', kind: 'heartbeat' },
	STREAM_ON_DESKTOP: { label: 'Stream on Desktop', kind: 'heartbeat' },
	PLAY_ACTIVITY: { label: 'Play Activity', kind: 'heartbeat' },
	PLAY_ON_XBOX: { label: 'Play on Xbox', kind: 'console' },
	PLAY_ON_PLAYSTATION: { label: 'Play on PlayStation', kind: 'console' },
	ACHIEVEMENT_IN_GAME: { label: 'Achievement in Game', kind: 'achievement' },
	ACHIEVEMENT_IN_ACTIVITY: { label: 'Achievement in Activity', kind: 'achievement' },
}

export const TASK_ORDER: TaskType[] = [
	'WATCH_VIDEO',
	'WATCH_VIDEO_ON_MOBILE',
	'PLAY_ON_DESKTOP',
	'STREAM_ON_DESKTOP',
	'PLAY_ACTIVITY',
	'PLAY_ON_XBOX',
	'PLAY_ON_PLAYSTATION',
	'ACHIEVEMENT_IN_GAME',
	'ACHIEVEMENT_IN_ACTIVITY',
]

export const DEFAULT_ENABLED_TASKS: Record<TaskType, boolean> = {
	WATCH_VIDEO: true,
	WATCH_VIDEO_ON_MOBILE: true,
	PLAY_ON_DESKTOP: false,
	STREAM_ON_DESKTOP: false,
	PLAY_ACTIVITY: false,
	PLAY_ON_XBOX: false,
	PLAY_ON_PLAYSTATION: false,
	ACHIEVEMENT_IN_GAME: false,
	ACHIEVEMENT_IN_ACTIVITY: false,
}

export const KIND_BLOCKED_MESSAGE: Record<Exclude<TaskKind, 'video'>, string> = {
	heartbeat: 'Requires the official desktop app; Discord blocks this from mobile clients.',
	console: 'Requires the linked console to be online and actively playing.',
	achievement: 'Tracked by the game itself, cannot be automated.',
}

export interface PluginSettings {
	enabledTasks: Record<TaskType, boolean>
}

export interface Quest {
	id: string
	name: string
	joinOperator: 'and' | 'or'
	tasks: Partial<Record<TaskType, { target: number }>>
	enrolled: boolean
	progress: Partial<Record<TaskType, { value: number; completed_at?: string | null }>>
	applicationId?: string
	status: 'idle' | 'running' | 'done' | 'error' | 'unsupported'
	error: string | null
}

export interface QuestState {
	quests: Quest[]
	loading: boolean
	error: string | null
}
