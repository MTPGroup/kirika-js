import z from 'zod'

const extensionsSchema = z.record(z.string(), z.unknown())

const characterAssetSchema = z.object({
  assetId: z.uuid(),
  kind: z.enum([
    'avatar',
    'background',
    'emotion',
    'audio',
    'video',
    'model',
    'other',
  ]),
  name: z.string().trim().min(1),
  uri: z.string().trim().min(1),
  ordinal: z.number().int().min(0),
  extensions: extensionsSchema.default({}),
})

const characterLorebookSchema = z.object({
  lorebookRevisionId: z.uuid(),
  ordinal: z.number().int().min(0),
  enabled: z.boolean().default(true),
})

export const characterRevisionInputSchema = z
  .object({
    name: z.string().trim().min(1),
    description: z.string().default(''),
    personality: z.string().default(''),
    scenario: z.string().default(''),
    systemPrompt: z.string().default(''),
    postHistoryInstructions: z.string().default(''),
    greetings: z
      .array(
        z.string().refine((value) => value.trim().length > 0, {
          message: '问候语不能为空',
        }),
      )
      .default([]),
    examples: z
      .array(
        z.string().refine((value) => value.trim().length > 0, {
          message: '对话示例不能为空',
        }),
      )
      .default([]),
    extensions: extensionsSchema.default({}),
    assets: z.array(characterAssetSchema).default([]),
    lorebooks: z.array(characterLorebookSchema).default([]),
  })
  .superRefine(({ assets, lorebooks }, context) => {
    const assetPositions = new Set<string>()
    assets.forEach((asset, index) => {
      const position = `${asset.kind}:${asset.ordinal}`
      if (assetPositions.has(position)) {
        context.addIssue({
          code: 'custom',
          message: '同类型资产序号不能重复',
          path: ['assets', index, 'ordinal'],
        })
      }
      assetPositions.add(position)
    })

    const lorebookIds = new Set<string>()
    const lorebookOrdinals = new Set<number>()
    lorebooks.forEach((reference, index) => {
      if (lorebookIds.has(reference.lorebookRevisionId)) {
        context.addIssue({
          code: 'custom',
          message: '世界书版本不能重复引用',
          path: ['lorebooks', index, 'lorebookRevisionId'],
        })
      }
      if (lorebookOrdinals.has(reference.ordinal)) {
        context.addIssue({
          code: 'custom',
          message: '世界书引用序号不能重复',
          path: ['lorebooks', index, 'ordinal'],
        })
      }

      lorebookIds.add(reference.lorebookRevisionId)
      lorebookOrdinals.add(reference.ordinal)
    })
  })

export const characterRevisionResultSchema = z.object({
  id: z.uuid(),
  revisionNumber: z.number().int().min(1),
  isDraft: z.boolean(),
  name: z.string(),
  description: z.string(),
  personality: z.string(),
  scenario: z.string(),
  systemPrompt: z.string(),
  postHistoryInstructions: z.string(),
  greetings: z.array(z.string()),
  examples: z.array(z.string()),
  extensions: extensionsSchema,
  assets: z.array(characterAssetSchema),
  lorebooks: z.array(characterLorebookSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
