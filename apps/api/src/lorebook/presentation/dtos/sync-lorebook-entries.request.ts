import { createZodDto } from 'nestjs-zod'
import z from 'zod'

const syncLorebookEntrySchema = z.object({
  id: z.uuid().optional(),
  keys: z.array(z.string().trim().min(1)).min(1),
  title: z.string().trim().min(1),
  enabled: z.boolean().default(true),
  content: z.string().refine((content) => content.trim().length > 0, {
    message: '条目内容不能为空',
  }),
  position: z
    .enum(['before_history', 'after_history'])
    .default('after_history'),
  priority: z.number().int().default(0),
})

const syncLorebookEntriesSchema = z
  .object({
    entries: z.array(syncLorebookEntrySchema),
  })
  .superRefine(({ entries }, context) => {
    const ids = new Set<string>()

    entries.forEach((entry, index) => {
      if (!entry.id) return

      if (ids.has(entry.id)) {
        context.addIssue({
          code: 'custom',
          message: '条目 ID 不能重复',
          path: ['entries', index, 'id'],
        })
      }

      ids.add(entry.id)
    })
  })

export class SyncLorebookEntriesRequest extends createZodDto(
  syncLorebookEntriesSchema,
) {}
