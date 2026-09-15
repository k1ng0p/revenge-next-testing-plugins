const { jsx, jsxs, Fragment } = revenge.react.ReactJSXRuntime;
const { React, ReactNative } = revenge.react;
const { getModules, filters } = revenge.modules.finders;
const { patcher, utils, jsonStorage } = revenge;

const getName = (m) => m?.name || m?.default?.name || m?.type?.name || m?.default?.type?.name || m?.render?.name || m?.default?.render?.name;
const withExactName = filters.createFilterGenerator(([n], _k, m) => getName(m) === n, ([n]) => `withExactName(${n})`, 1);

function patchTarget(m) {
	if (typeof m?.default === "function") return { parent: m, key: "default" };
	if (typeof m?.default?.type === "function") return { parent: m.default, key: "type" };
	if (typeof m?.default?.render === "function") return { parent: m.default, key: "render" };
	if (typeof m?.type === "function") return { parent: m, key: "type" };
	if (typeof m?.render === "function") return { parent: m, key: "render" };
	return null;
}

const settings = jsonStorage.getJsonStorage(
	jsonStorage.pluginStoragePathFor("k1ngop.platform-indicators", "storage.json"),
	{ default: { dmTopBar: true, userList: true, profileUsername: true, fallbackColors: false, oldUserListIcons: false, primaryOnStatusDot: true }, load: true },
);

function SettingsPage() {
	const s = settings.use() ?? settings.cache;
	const set = (k, v) => settings.set({ [k]: v });
	const { Design } = revenge.discord.design;

	const rows = [
		["dmTopBar", "Show icons on the DM top bar"],
		["userList", "Show icons on the users and DMs list"],
		["profileUsername", "Show icons on user profiles"],
		["primaryOnStatusDot", "Show primary platform on status dot (others inline)"],
		["fallbackColors", "Theme compatibility mode"],
	];

	return jsx(revenge.components.Page, {
		children: jsxs(Design.TableRowGroup, {
			children: [
				...rows.map(([key, label]) =>
					jsx(Design.TableSwitchRow, { label, value: s?.[key] ?? key !== "fallbackColors", onValueChange: (v) => set(key, v) }, key),
				),
				jsx(Design.TableSwitchRow, {
					label: "Old user list icon style",
					subLabel: "Moves status indicators to the right",
					value: s?.oldUserListIcons ?? false,
					onValueChange: (v) => set("oldUserListIcons", v),
				}),
			],
		}),
	});
}

const FALLBACK_COLORS = { online: "#23a55a", dnd: "#f23f43", idle: "#f0b232", offline: "#80848e" };
const STATUS_TOKENS = { online: "STATUS_ONLINE", dnd: "STATUS_DANGER", idle: "STATUS_WARNING", offline: "STATUS_OFFLINE" };

function statusColor(status, useFallback) {
	if (useFallback) return FALLBACK_COLORS[status] ?? FALLBACK_COLORS.offline;
	try {
		const token = revenge.discord.common.Tokens?.colors?.[STATUS_TOKENS[status]];
		if (typeof token === "string") return token;
		if (typeof token?.resolve === "function") return token.resolve();
	} catch {}
	return FALLBACK_COLORS[status] ?? FALLBACK_COLORS.offline;
}

const ASSET_NAMES = {
	mobile: "MobilePhoneIcon",
	desktop: "ic_monitor",
	web: "GlobeEarthIcon",
	embedded: "ic_playstation_device_ps5_32px",
	vr: "VrHeadsetIcon",
};

// Platform priority order (higher priority = shown on status dot)
const PLATFORM_PRIORITY = ["desktop", "mobile", "web", "vr", "embedded"];

function normalizePlatform(p) {
	p = String(p || "").toLowerCase();
	if (p === "ios" || p === "android") return "mobile";
	if (p === "oculus" || p === "quest" || p === "samsung_gear_vr") return "vr";
	return p;
}

function PlatformIcon({ platform, color, iconSize = 16 }) {
	const name = ASSET_NAMES[normalizePlatform(platform)];
	const assetId = name && revenge.assets.getAssetIdByName(name, "png");

	if (!assetId) return jsx(ReactNative.View, { children: jsx(ReactNative.View, { style: { width: iconSize, height: iconSize, borderRadius: 100, backgroundColor: color } }) });
	return jsx(ReactNative.View, { children: jsx(ReactNative.Image, { style: { height: iconSize, width: iconSize, tintColor: color }, source: assetId }) });
}

let presence, myId;

function getPresence() {
	if (!presence) presence = revenge.discord.flux.Stores.PresenceStore?.getState?.();
	return presence;
}

function getStatuses(userId) {
	myId ??= revenge.discord.flux.Stores.UserStore?.getCurrentUser?.()?.id;

	if (userId === myId) {
		const sessions = revenge.discord.flux.Stores.SessionsStore?.getSessions?.() ?? {};
		return Object.values(sessions).reduce((acc, s) => {
			const client = s?.clientInfo?.client;
			if (!client || client === "unknown") return acc;
			acc[normalizePlatform(client)] = s.status;
			return acc;
		}, {});
	}
	return getPresence()?.clientStatuses?.[userId];
}

// Get platforms sorted by priority
function getSortedPlatforms(statuses) {
	const platforms = Object.keys(statuses || {});
	return platforms.sort((a, b) => {
		const idxA = PLATFORM_PRIORITY.indexOf(normalizePlatform(a));
		const idxB = PLATFORM_PRIORITY.indexOf(normalizePlatform(b));
		return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
	});
}

// Component that renders ONLY the primary (highest priority) platform icon
function PrimaryStatusIcon({ userId, size = 16 }) {
	const rerender = utils.react.useReRender();
	React.useEffect(() => revenge.discord.flux.onFluxEventDispatched("PRESENCE_UPDATES", (p) => { rerender(); return p; }), [rerender]);
	const statuses = getStatuses(userId) ?? {};
	const sorted = getSortedPlatforms(statuses);

	if (sorted.length === 0) return null;

	const primary = sorted[0];
	return jsx(PlatformIcon, { platform: primary, color: statusColor(statuses[primary], settings.cache?.fallbackColors), iconSize: size });
}

// Component that renders all platforms EXCEPT the primary one
function SecondaryStatusIcons({ userId, size = 16 }) {
	const rerender = utils.react.useReRender();
	React.useEffect(() => revenge.discord.flux.onFluxEventDispatched("PRESENCE_UPDATES", (p) => { rerender(); return p; }), [rerender]);
	const statuses = getStatuses(userId) ?? {};
	const sorted = getSortedPlatforms(statuses);

	// Skip the first (primary) platform
	const secondary = sorted.slice(1);

	if (secondary.length === 0) return null;

	return jsx(Fragment, {
		children: secondary.map((p) =>
			jsx(PlatformIcon, { platform: p, color: statusColor(statuses[p], settings.cache?.fallbackColors), iconSize: size }, p),
		),
	});
}

// Original component that renders ALL platforms (for backward compatibility)
function StatusIcons({ userId, size = 16 }) {
	const rerender = utils.react.useReRender();
	React.useEffect(() => revenge.discord.flux.onFluxEventDispatched("PRESENCE_UPDATES", (p) => { rerender(); return p; }), [rerender]);
	const statuses = getStatuses(userId) ?? {};
	return jsx(Fragment, {
		children: Object.keys(statuses).map((p) =>
			jsx(PlatformIcon, { platform: p, color: statusColor(statuses[p], settings.cache?.fallbackColors), iconSize: size }, p),
		),
	});
}

const WALK = { walkable: new Set(["props", "children"]) };
const hasUser = (n) => n?.props?.user?.id !== undefined;
const safely = (fn) => { try { fn(); } catch {} };

export default plugin({
	async start({ cleanup }) {
		await settings.get();

		cleanup(revenge.discord.flux.onFluxEventDispatched("PRESENCE_UPDATES", (p) => { presence = null; return p; }));

		// Patch DM Top Bar
		cleanup(getModules(withExactName("ChannelHeader"), (mod) => {
			const target = patchTarget(mod);
			if (!target) return;
			cleanup(patcher.after(target.parent, target.key, (result) => {
				safely(() => {
					if (!settings.cache?.dmTopBar || result?.type?.type?.name !== "PrivateChannelHeader") return;
					cleanup(patcher.after(result.type, "type", (header) => {
						safely(() => {
							const userId = utils.tree.findInTree(header, hasUser, WALK)?.props?.user?.id;
							if (!userId) return;

							const container = utils.tree.findInTree(header, (n) => n?.key === "DMTabsV2HeaderIcons", WALK);
							if (container) {
								// Show secondary platforms inline, primary goes where status normally shows
								if (settings.cache?.primaryOnStatusDot) {
									container.props.children = jsxs(Fragment, {
										children: [
											jsx(SecondaryStatusIcons, { userId }),
											jsx(PrimaryStatusIcon, { userId }, "PrimaryPlatformIcon"),
										]
									});
								} else {
									container.props.children = jsx(StatusIcons, { userId });
								}
								return;
							}

							const inner = header.props?.children?.props?.children?.props?.children?.[1];
							if (inner && typeof inner.type === "function") {
								const unpatch = patcher.after(inner, "type", (r) => {
									unpatch();
									safely(() => {
										if (!utils.tree.findInTree(r, (n) => n?.key === "DMTabsV2Header-v2", WALK)) {
											if (settings.cache?.primaryOnStatusDot) {
												r.props.children[0]?.props?.children?.push(
													jsxs(ReactNative.View, { 
														style: { flexDirection: "row", alignItems: "center" },
														children: [
															jsx(SecondaryStatusIcons, { userId }),
															jsx(PrimaryStatusIcon, { userId }, "PrimaryPlatformIcon"),
														]
													}, "DMTabsV2Header-v2")
												);
											} else {
												r.props.children[0]?.props?.children?.push(jsx(StatusIcons, { userId }, "DMTabsV2Header-v2"));
											}
										}
									});
									return r;
								});
								cleanup(unpatch);
							}
						});
						return header;
					}));
				});
				return result;
			}));
		}));

		// Patch User Profile
		cleanup(getModules(withExactName("UserProfileContent"), (mod) => {
			const target = patchTarget(mod);
			if (!target) return;
			cleanup(patcher.after(target.parent, target.key, (result) => {
				safely(() => {
					const primary = utils.tree.findInTree(result, (n) => n?.type?.name === "PrimaryInfo", WALK);
					if (!primary) return;
					cleanup(patcher.after(primary, "type", (a) => {
						safely(() => {
							if (a?.type?.name !== "UserProfilePrimaryInfo") return;
							cleanup(patcher.after(a, "type", (b) => {
								safely(() => {
									const name = utils.tree.findInTree(b, (n) => n?.type?.name === "DisplayName", WALK);
									if (!name) return;
									cleanup(patcher.after(name, "type", (c) => {
										safely(() => {
											const userId = name.props?.user?.id;
											if (userId && settings.cache?.profileUsername) {
												if (settings.cache?.primaryOnStatusDot) {
													c?.props?.children?.push(
														jsxs(ReactNative.View, { 
															style: { flexDirection: "row", alignItems: "center" },
															children: [
																jsx(SecondaryStatusIcons, { userId }),
																jsx(PrimaryStatusIcon, { userId }, "PrimaryPlatformIcon"),
															]
														}, "UserProfileIcons")
													);
												} else {
													c?.props?.children?.push(jsx(StatusIcons, { userId }, "UserProfileIcons"));
												}
											}
										});
										return c;
									}));
								});
								return b;
							}));
						});
						return a;
					}));
				});
				return result;
			}));
		}));

		// Patch DisplayName (alternative profile patch)
		cleanup(getModules(filters.withProps("DisplayName"), (mod) => {
			cleanup(patcher.instead(mod, "DisplayName", (args, orig) => {
				const result = orig(...args);
				safely(() => {
					const user = args[0]?.user;
					const children = result.props?.children?.props?.children?.[0]?.props?.children;
					if (user?.id && Array.isArray(children) && settings.cache?.profileUsername) {
						if (children.some((c) => c?.key === "DisplayNameIcons")) return;
						if (settings.cache?.primaryOnStatusDot) {
							children.push(
								jsxs(ReactNative.View, { 
									style: { flexDirection: "row", alignItems: "center" },
									children: [
										jsx(SecondaryStatusIcons, { userId: user.id }),
										jsx(PrimaryStatusIcon, { userId: user.id }, "PrimaryPlatformIcon"),
									]
								}, "DisplayNameIcons")
							);
						} else {
							children.push(jsx(StatusIcons, { userId: user.id }, "DisplayNameIcons"));
						}
					}
				});
				return result;
			}));
		}));

		// Patch UserRow (Member List)
		cleanup(getModules(withExactName("UserRow"), (mod) => {
			const target = patchTarget(mod);
			if (!target) return;
			cleanup(patcher.instead(target.parent, target.key, ([props], orig) => {
				const result = orig(props);
				safely(() => {
					const user = props?.user;
					if (!settings.cache?.userList || !user?.id) return;
					if (utils.tree.findInTree(result?.props?.label, (n) => n?.key === "TabsV2MemberListStatusIconsView", WALK)) return;

					let iconContent;
					if (settings.cache?.primaryOnStatusDot) {
						iconContent = jsxs(ReactNative.View, { 
							style: { flexDirection: "row", alignItems: "center" },
							children: [
								jsx(SecondaryStatusIcons, { userId: user.id }),
								jsx(PrimaryStatusIcon, { userId: user.id }, "PrimaryPlatformIcon"),
							]
						});
					} else {
						iconContent = jsx(StatusIcons, { userId: user.id });
					}

					result.props.label = jsxs(ReactNative.View, {
						style: { justifyContent: settings.cache?.oldUserListIcons ? "space-between" : "flex-start", flexDirection: "row", alignItems: "center" },
						children: [
							result.props.label,
							jsx(ReactNative.View, { style: { flexDirection: "row" }, children: iconContent }, "TabsV2MemberListStatusIconsView"),
						],
					}, "TabsV2MemberListStatusIconsView");
				});
				return result;
			}));
		}, { max: Infinity }));

		// Patch DM List
		cleanup(getModules(withExactName("MessagesItemChannelContent"), (mod) => {
			const target = patchTarget(mod);
			if (!target) return;
			cleanup(patcher.instead(target.parent, target.key, ([props], orig) => {
				const result = orig(props);
				safely(() => {
					if (!settings.cache?.userList || props?.channel?.recipients?.length !== 1) return;
					const recipientId = props.channel.recipients[0];
					const titleNode = utils.tree.findInTree(result, (n) => n?.props?.children?.[0]?.props?.variant?.includes?.("channel-title"), WALK);
					if (titleNode && !utils.tree.findInTree(titleNode, (n) => n?.key === "TabsV2RedesignDMListIcons", WALK)) {
						let iconContent;
						if (settings.cache?.primaryOnStatusDot) {
							iconContent = jsxs(ReactNative.View, { 
								style: { flexDirection: "row", alignItems: "center" },
								children: [
									jsx(SecondaryStatusIcons, { userId: recipientId }),
									jsx(PrimaryStatusIcon, { userId: recipientId }, "PrimaryPlatformIcon"),
								]
							});
						} else {
							iconContent = jsx(StatusIcons, { userId: recipientId });
						}
						titleNode.props?.children?.push(
							jsx(ReactNative.View, { style: { flexDirection: "row" }, children: iconContent }, "TabsV2RedesignDMListIcons")
						);
					}
				});
				return result;
			}));
		}));

		// NEW: Patch Status component to replace status dot with primary platform icon
		cleanup(getModules(withExactName("Status"), (mod) => {
			const target = patchTarget(mod);
			if (!target) return;
			cleanup(patcher.after(target.parent, target.key, (result, [{ userId, style }]) => {
				safely(() => {
					if (!settings.cache?.primaryOnStatusDot || !userId) return;
					// Only replace if user has multiple platforms
					const statuses = getStatuses(userId) ?? {};
					const platforms = Object.keys(statuses);
					if (platforms.length <= 1) return; // Let normal status show for single platform

					// Return primary platform icon instead of status dot
					const primary = getSortedPlatforms(statuses)[0];
					return jsx(ReactNative.View, { 
						style: [style, { justifyContent: "center", alignItems: "center" }],
						children: jsx(PlatformIcon, { 
							platform: primary, 
							color: statusColor(statuses[primary], settings.cache?.fallbackColors), 
							iconSize: style?.width || 16 
						})
					});
				});
				return result;
			}));
		}, { max: Infinity }));

		// NEW: Patch Avatar component status overlay
		cleanup(getModules(withExactName("Avatar"), (mod) => {
			const target = patchTarget(mod);
			if (!target) return;
			cleanup(patcher.after(target.parent, target.key, (result, [props]) => {
				safely(() => {
					if (!settings.cache?.primaryOnStatusDot || !props?.user?.id) return;
					const statuses = getStatuses(props.user.id) ?? {};
					const platforms = Object.keys(statuses);
					if (platforms.length <= 1) return;

					// Find and replace the status dot in avatar
					const avatarStatus = utils.tree.findInTree(result, (n) => n?.type?.name === "Status" || n?.props?.status !== undefined, WALK);
					if (avatarStatus) {
						const primary = getSortedPlatforms(statuses)[0];
						avatarStatus.props.children = jsx(PlatformIcon, { 
							platform: primary, 
							color: statusColor(statuses[primary], settings.cache?.fallbackColors), 
							iconSize: avatarStatus.props.style?.width || 16 
						});
					}
				});
				return result;
			}));
		}, { max: Infinity }));
	},
	SettingsComponent: SettingsPage,
});
