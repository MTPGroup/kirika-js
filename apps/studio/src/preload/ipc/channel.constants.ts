export const workspaceChannels = {
  open: 'studio:workspace:open',
  create: 'studio:workspace:create',
  getState: 'studio:workspace:get-state',
  close: 'studio:workspace:close',
  listRecent: 'studio:workspace:list-recent',
} as const
export const providerChannels = {
  list: 'studio:providers:list',
  save: 'studio:providers:save',
  delete: 'studio:providers:delete',
  testConnection: 'studio:providers:test-connection',
  listModels: 'studio:providers:list-models',
} as const
export const profileChannels = {
  get: 'studio:profile:get',
  save: 'studio:profile:save',
  selectAvatar: 'studio:profile:select-avatar',
  saveAvatar: 'studio:profile:save-avatar',
  removeAvatar: 'studio:profile:remove-avatar',
} as const
export const dialogChannels = {
  selectDirectory: 'studio:dialog:select-directory',
  selectFile: 'studio:dialog:select-file',
  saveFile: 'studio:dialog:save-file',
} as const
export const windowChannels = {
  openSettings: 'studio:window:open-settings',
  openAbout: 'studio:window:open-about',
} as const
export const characterChannels = {
  list: 'studio:characters:list',
  create: 'studio:characters:create',
  get: 'studio:characters:get',
  delete: 'studio:characters:delete',
  updateDraft: 'studio:characters:update-draft',
  saveDraft: 'studio:characters:save-draft',
  replaceGreetings: 'studio:characters:replace-greetings',
  replaceExamples: 'studio:characters:replace-examples',
  importAsset: 'studio:characters:import-asset',
  replaceAssets: 'studio:characters:replace-assets',
  replaceLorebooks: 'studio:characters:replace-lorebooks',
  createDraft: 'studio:characters:create-draft',
  publish: 'studio:characters:publish',
  importCard: 'studio:characters:import-card',
  exportCard: 'studio:characters:export-card',
} as const
export const lorebookChannels = {
  list: 'studio:lorebooks:list',
  create: 'studio:lorebooks:create',
  get: 'studio:lorebooks:get',
  delete: 'studio:lorebooks:delete',
  updateMetadata: 'studio:lorebooks:update-metadata',
  changeVisibility: 'studio:lorebooks:change-visibility',
  createDraft: 'studio:lorebooks:create-draft',
  replaceEntries: 'studio:lorebooks:replace-entries',
  publish: 'studio:lorebooks:publish',
} as const
export const conversationChannels = {
  list: 'studio:conversations:list',
  create: 'studio:conversations:create',
  createTest: 'studio:conversations:create-test',
  get: 'studio:conversations:get',
  getHistory: 'studio:conversations:get-history',
  delete: 'studio:conversations:delete',
  rename: 'studio:conversations:rename',
  changeTurnPolicy: 'studio:conversations:change-turn-policy',
  addCharacter: 'studio:conversations:add-character',
  removeParticipant: 'studio:conversations:remove-participant',
  renameParticipant: 'studio:conversations:rename-participant',
  sendHumanMessage: 'studio:conversations:send-human-message',
  editMessage: 'studio:conversations:edit-message',
  deleteMessage: 'studio:conversations:delete-message',
  regenerateMessage: 'studio:conversations:regenerate-message',
  selectBranch: 'studio:conversations:select-branch',
  archive: 'studio:conversations:archive',
  restore: 'studio:conversations:restore',
} as const
export const generationChannels = {
  start: 'studio:generation:start',
  startTest: 'studio:generation:start-test',
  abort: 'studio:generation:abort',
  event: 'studio:generation:event',
} as const

export type PreloadChannel =
  | (typeof workspaceChannels)[keyof typeof workspaceChannels]
  | (typeof providerChannels)[keyof typeof providerChannels]
  | (typeof profileChannels)[keyof typeof profileChannels]
  | (typeof dialogChannels)[keyof typeof dialogChannels]
  | (typeof windowChannels)[keyof typeof windowChannels]
  | (typeof characterChannels)[keyof typeof characterChannels]
  | (typeof lorebookChannels)[keyof typeof lorebookChannels]
  | (typeof conversationChannels)[keyof typeof conversationChannels]
  | (typeof generationChannels)[keyof typeof generationChannels]
