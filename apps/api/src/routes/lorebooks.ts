import {
  LorebookEntry,
  LorebookId,
  type LorebookVisibility,
} from '@kirika-js/core/domain/lorebook'
import { UserId } from '@kirika-js/core/domain/shared'
import type { Hono } from 'hono'
import { z } from 'zod'
import type { Auth } from '../lib/auth.js'
import type { LorebookService } from '../lorebook/lorebook.service.js'
import { lorebookToJson } from '../lorebook/serialize.js'

const createSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
})

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
})

const entrySchema = z.object({
  keys: z.array(z.string().trim().min(1)).min(1),
  secondaryKeys: z.array(z.string().trim().min(1)).optional(),
  title: z.string().trim().min(1),
  enabled: z.boolean().optional(),
  content: z.string().trim().min(1),
  position: z.enum(['before_history', 'after_history', 'at_depth']),
  priority: z.number().int().optional(),
  matchMode: z.enum(['any', 'all']).optional(),
  constant: z.boolean().optional(),
  caseSensitive: z.boolean().optional(),
  matchWholeWords: z.boolean().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  insertionDepth: z.number().int().min(0).optional(),
})

const entriesSchema = z.object({
  entries: z.array(entrySchema),
})

const settingsSchema = z.object({
  scanDepth: z.number().int().min(1),
  tokenBudget: z.number().int().min(1),
})

export interface LorebookRouteDependencies {
  readonly auth: Auth
  readonly service: LorebookService
}

export function mountLorebookRoutes(
  app: Hono,
  deps: LorebookRouteDependencies,
): void {
  app.post('/api/lorebooks', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const body = createSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: body.error.flatten() }, 400)

    const lorebook = await deps.service.create(
      body.data.name,
      body.data.description ?? '',
      new UserId(session.user.id),
    )

    return c.json(lorebookToJson(lorebook), 201)
  })

  app.get('/api/lorebooks/:id', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const lorebook = await deps.service.get(new LorebookId(c.req.param('id')))
    if (!lorebook) return c.json({ error: 'not found' }, 404)
    if (lorebook.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    return c.json(lorebookToJson(lorebook))
  })

  app.patch('/api/lorebooks/:id', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const lorebook = await deps.service.get(new LorebookId(c.req.param('id')))
    if (!lorebook) return c.json({ error: 'not found' }, 404)
    if (lorebook.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    const body = updateSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: body.error.flatten() }, 400)

    try {
      let updated = lorebook
      if (body.data.name !== undefined || body.data.description !== undefined) {
        updated = await deps.service.updateMetadata(
          updated,
          body.data.name ?? updated.name,
          body.data.description ?? updated.description,
        )
      }
      if (body.data.visibility !== undefined) {
        updated = await deps.service.changeVisibility(
          updated,
          body.data.visibility as LorebookVisibility,
        )
      }
      return c.json(lorebookToJson(updated))
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        400,
      )
    }
  })

  app.patch('/api/lorebooks/:id/entries', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const lorebook = await deps.service.get(new LorebookId(c.req.param('id')))
    if (!lorebook) return c.json({ error: 'not found' }, 404)
    if (lorebook.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    const body = entriesSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: body.error.flatten() }, 400)

    const entries = body.data.entries.map((entry) =>
      LorebookEntry.create(
        entry.keys,
        entry.title,
        entry.enabled ?? true,
        entry.content,
        entry.position,
        entry.priority ?? 0,
        {
          secondaryKeys: entry.secondaryKeys,
          matchMode: entry.matchMode,
          constant: entry.constant,
          caseSensitive: entry.caseSensitive,
          matchWholeWords: entry.matchWholeWords,
          probability: entry.probability,
          insertionDepth: entry.insertionDepth,
        },
      ),
    )

    try {
      const updated = await deps.service.replaceEntries(lorebook, entries)
      return c.json(lorebookToJson(updated))
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        400,
      )
    }
  })

  app.patch('/api/lorebooks/:id/settings', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const lorebook = await deps.service.get(new LorebookId(c.req.param('id')))
    if (!lorebook) return c.json({ error: 'not found' }, 404)
    if (lorebook.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    const body = settingsSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: body.error.flatten() }, 400)

    try {
      const updated = await deps.service.updateSettings(
        lorebook,
        body.data.scanDepth,
        body.data.tokenBudget,
      )
      return c.json(lorebookToJson(updated))
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        400,
      )
    }
  })

  app.post('/api/lorebooks/:id/publish', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const lorebook = await deps.service.get(new LorebookId(c.req.param('id')))
    if (!lorebook) return c.json({ error: 'not found' }, 404)
    if (lorebook.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    try {
      const published = await deps.service.publish(lorebook)
      return c.json(lorebookToJson(published))
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        400,
      )
    }
  })

  app.delete('/api/lorebooks/:id', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const lorebook = await deps.service.get(new LorebookId(c.req.param('id')))
    if (!lorebook) return c.json({ error: 'not found' }, 404)
    if (lorebook.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    await deps.service.remove(lorebook.id)
    return c.body(null, 204)
  })
}
