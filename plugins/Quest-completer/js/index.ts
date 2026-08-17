import { DEFAULT_ENABLED_TASKS, type PluginSettings } from './lib/constants'
import { createQuestStore, type QuestStore } from './lib/store'
import { Settings } from './ui/Settings'

// Keyed by the running Plugin instance so the SettingsComponent (which gets
// its own `api` on every render) can reach the same store the start()
// lifecycle created, without mutating Revenge's own Plugin object shape.
const stores = new WeakMap<object, QuestStore>()

export default plugin<{ jsonStorage: PluginSettings }>({
	jsonStorage: {
		default: { enabledTasks: DEFAULT_ENABLED_TASKS },
		load: true,
	},

	start(api) {
		const store = createQuestStore(api.jsonStorage)
		stores.set(api.plugin, store)
		store.refresh()
		api.cleanup(() => store.destroy())
	},

	SettingsComponent(props) {
		const store = stores.get(props.api.plugin)
		return Settings({ api: { plugin: { questStore: store }, jsonStorage: props.api.jsonStorage } })
	},

	stop(api) {
		stores.get(api.plugin)?.destroy()
	},
})
