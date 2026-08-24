import type {
  CharacterSummaryDto,
  ConversationParticipantDto,
  ConversationSummaryDto,
  LorebookSummaryDto,
  ProviderConfig,
} from '@renderer/services/api'

/**
 * 临时演示数据。
 *
 * 在 IPC / 适配器链路（studio-runtime → ipc handlers）接通之前，渲染层页面先用这份
 * 静态数据预览 UI/UX。各页面都已按真实 DTO 形状编写，后续只需把这里的常量替换为
 * `services/api.ts` 的真实调用即可，组件不用改动。
 */
export const demoCharacters: readonly CharacterSummaryDto[] = [
  {
    id: 'chr_01',
    alias: 'Lina',
    name: '琳娜 · 夜之精灵',
    currentRevisionId: 'rev_01',
    draftRevisionId: 'rev_02',
    revisionCount: 3,
    hasDraft: true,
    updatedAt: '2025-08-24T07:42:00.000Z',
  },
  {
    id: 'chr_02',
    alias: 'Ken',
    name: '剑士 · 肯',
    currentRevisionId: 'rev_03',
    draftRevisionId: null,
    revisionCount: 1,
    hasDraft: false,
    updatedAt: '2025-08-23T14:12:00.000Z',
  },
  {
    id: 'chr_03',
    alias: 'Aria',
    name: '阿莉娅 · 机械歌姬',
    currentRevisionId: 'rev_04',
    draftRevisionId: 'rev_05',
    revisionCount: 5,
    hasDraft: true,
    updatedAt: '2025-08-22T09:31:00.000Z',
  },
  {
    id: 'chr_04',
    alias: 'Sana',
    name: '纱奈 · 秘术师',
    currentRevisionId: null,
    draftRevisionId: 'rev_06',
    revisionCount: 2,
    hasDraft: true,
    updatedAt: '2025-08-21T18:05:00.000Z',
  },
  {
    id: 'chr_05',
    alias: 'Rin',
    name: '凛 · 流浪者',
    currentRevisionId: 'rev_07',
    draftRevisionId: null,
    revisionCount: 2,
    hasDraft: false,
    updatedAt: '2025-08-19T11:20:00.000Z',
  },
  {
    id: 'chr_06',
    alias: 'Yuki',
    name: '雪 · 神官',
    currentRevisionId: 'rev_08',
    draftRevisionId: null,
    revisionCount: 1,
    hasDraft: false,
    updatedAt: '2025-08-15T20:48:00.000Z',
  },
]

export const demoLorebooks: readonly LorebookSummaryDto[] = [
  {
    id: 'lb_01',
    name: '艾尔登大陆 · 基础设定',
    description: '涵盖大陆地理、国家与种族的通用世界设定，供全部角色引用。',
    visibility: 'private',
    currentRevisionId: 'lrev_01',
    draftRevisionId: null,
    revisionCount: 4,
    entryCount: 128,
    updatedAt: '2025-08-24T06:10:00.000Z',
  },
  {
    id: 'lb_02',
    name: '夜之森林 · 秘闻',
    description: '与琳娜相关的森林生物、遗迹与古老禁忌。',
    visibility: 'unlisted',
    currentRevisionId: 'lrev_02',
    draftRevisionId: 'lrev_03',
    revisionCount: 2,
    entryCount: 34,
    updatedAt: '2025-08-23T16:44:00.000Z',
  },
  {
    id: 'lb_03',
    name: '机械之城 · 教条',
    description: '阿莉娅所处的机械城邦规则与其造物主的残响。',
    visibility: 'public',
    currentRevisionId: 'lrev_04',
    draftRevisionId: null,
    revisionCount: 1,
    entryCount: 57,
    updatedAt: '2025-08-20T08:02:00.000Z',
  },
]

export const demoProviders: readonly ProviderConfig[] = [
  {
    id: 'prov_01',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: 'sk-••••••••••••••••',
    defaultModel: 'deepseek-chat',
    temperature: 0.8,
    topP: 0.9,
    maxOutputTokens: 2048,
    seed: 42,
    stream: true,
    useLorebook: true,
    saveHistory: true,
    enabled: true,
  },
  {
    id: 'prov_02',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-••••••••••••••••',
    defaultModel: 'gpt-4o-mini',
    temperature: 0.7,
    topP: 1,
    maxOutputTokens: 1024,
    seed: undefined,
    stream: true,
    useLorebook: true,
    saveHistory: false,
    enabled: false,
  },
  {
    id: 'prov_03',
    name: '本地 Ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    apiKey: undefined,
    defaultModel: 'qwen2.5:7b',
    temperature: 0.6,
    topP: 0.8,
    maxOutputTokens: undefined,
    seed: undefined,
    stream: true,
    useLorebook: false,
    saveHistory: true,
    enabled: true,
  },
]

function participant(
  id: string,
  displayName: string,
  characterId: string | null,
): ConversationParticipantDto {
  return {
    id,
    type: characterId ? 'character' : 'human',
    role: characterId ? 'member' : 'owner',
    status: 'active',
    userId: characterId ? null : 'u_me',
    characterId,
    characterRevisionId: characterId ? `${characterId}::rev_cur` : null,
    displayName,
    joinedAt: '2025-08-20T10:00:00.000Z',
    leftAt: null,
  }
}

export const demoConversations: readonly ConversationSummaryDto[] = [
  {
    id: 'conv_01',
    title: '月下森林的相遇',
    mode: 'direct',
    status: 'active',
    turnPolicy: 'manual',
    participants: [
      participant('p_me', '你', null),
      participant('p_01', '琳娜 · 夜之精灵', 'chr_01'),
    ],
    activeLeafMessageId: 'm_12',
    activeGenerationMessageId: null,
    messageCount: 24,
    updatedAt: '2025-08-24T07:45:00.000Z',
    archivedAt: null,
  },
  {
    id: 'conv_02',
    title: '机械之城的嘱托',
    mode: 'direct',
    status: 'active',
    turnPolicy: 'manual',
    participants: [
      participant('p_me', '你', null),
      participant('p_02', '阿莉娅 · 机械歌姬', 'chr_03'),
    ],
    activeLeafMessageId: 'm_08',
    activeGenerationMessageId: null,
    messageCount: 19,
    updatedAt: '2025-08-23T20:31:00.000Z',
    archivedAt: null,
  },
]

export const workspaceState = {
  workspaceName: '月下工坊',
  workspaceDir: '~/Kirika/workspaces/月光工坊',
  dbPath: '~/Kirika/workspaces/月光工坊/data/studio.sqlite',
  assetsDir: '~/Kirika/workspaces/月光工坊/assets',
  schemaVersion: 7,
}

export const recentActivity = [
  {
    id: 'a1',
    kind: 'character' as const,
    title: '编辑了「琳娜 · 夜之精灵」',
    time: '2025-08-24T07:58:00.000Z',
  },
  {
    id: 'a2',
    kind: 'conversation' as const,
    title: '继续了对话「月下森林的相遇」',
    time: '2025-08-24T07:57:00.000Z',
  },
  {
    id: 'a3',
    kind: 'lorebook' as const,
    title: '更新了世界书「夜之森林 · 秘闻」',
    time: '2025-08-24T07:52:00.000Z',
  },
  {
    id: 'a4',
    kind: 'generation' as const,
    title: '生成了 312 个 token（DeepSeek）',
    time: '2025-08-24T07:48:00.000Z',
  },
]
