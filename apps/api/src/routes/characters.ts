import type { CharacterRepositoryPort } from '@kirika-js/core/domain/character'
import { CharacterId } from '@kirika-js/core/domain/character'
import { UserId } from '@kirika-js/core/domain/shared'
import type { Hono } from 'hono'
import { z } from 'zod'
import type { CharacterService } from '../character/character.service.js'
import { characterToJson } from '../character/serialize.js'
import type { Auth } from '../lib/auth.js'

const createSchema = z.object({
  alias: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  systemPrompt: z.string().optional(),
  postHistoryInstructions: z.string().optional(),
  greetings: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  personality: z.string().optional(),
  scenario: z.string().optional(),
  systemPrompt: z.string().optional(),
  postHistoryInstructions: z.string().optional(),
  extensions: z.record(z.string(), z.unknown()).optional(),
})

export interface CharacterRouteDependencies {
  readonly auth: Auth
  readonly service: CharacterService
  readonly repository: CharacterRepositoryPort
}

export function mountCharacterRoutes(
  app: Hono,
  deps: CharacterRouteDependencies,
): void {
  app.post('/api/characters', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const body = createSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: body.error.flatten() }, 400)

    const { alias, ...content } = body.data
    const character = await deps.service.create(new UserId(session.user.id), {
      alias: alias ?? null,
      content,
    })

    return c.json(characterToJson(character), 201)
  })

  app.get('/api/characters/:id', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const character = await deps.service.get(new CharacterId(c.req.param('id')))
    if (!character) return c.json({ error: 'not found' }, 404)
    if (character.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    return c.json(characterToJson(character))
  })

  app.patch('/api/characters/:id', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const character = await deps.service.get(new CharacterId(c.req.param('id')))
    if (!character) return c.json({ error: 'not found' }, 404)
    if (character.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    const body = updateSchema.safeParse(await c.req.json())
    if (!body.success) return c.json({ error: body.error.flatten() }, 400)

    try {
      const updated = await deps.service.updateDraft(character, body.data)
      return c.json(characterToJson(updated))
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        400,
      )
    }
  })

  app.post('/api/characters/:id/publish', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const character = await deps.service.get(new CharacterId(c.req.param('id')))
    if (!character) return c.json({ error: 'not found' }, 404)
    if (character.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    try {
      const published = await deps.service.publish(character)
      return c.json(characterToJson(published))
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : String(error) },
        400,
      )
    }
  })

  app.delete('/api/characters/:id', async (c) => {
    const session = await deps.auth.api.getSession({
      headers: c.req.raw.headers,
    })
    if (!session) return c.json({ error: 'unauthorized' }, 401)

    const character = await deps.service.get(new CharacterId(c.req.param('id')))
    if (!character) return c.json({ error: 'not found' }, 404)
    if (character.ownerId.value !== session.user.id) {
      return c.json({ error: 'forbidden' }, 403)
    }

    await deps.service.remove(character.id)
    return c.body(null, 204)
  })
}
