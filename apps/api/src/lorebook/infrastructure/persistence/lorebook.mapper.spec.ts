import { describe, expect, it } from 'vitest'
import { LorebookMapper } from './lorebook.mapper'
import type { DrizzleLorebookWithRelations } from './lorebook.query'

describe('LorebookMapper', () => {
	it('完整还原世界书、版本和条目并保留持久化字段', () => {
		const createdAt = new Date('2026-08-21T08:00:00.000Z')
		const updatedAt = new Date('2026-08-21T09:00:00.000Z')
		const lorebookId = '11111111-1111-4111-8111-111111111111'
		const ownerId = '22222222-2222-4222-8222-222222222222'
		const revisionId = '33333333-3333-4333-8333-333333333333'
		const entryId = '44444444-4444-4444-8444-444444444444'
		const raw = {
			id: lorebookId,
			ownerId,
			currentRevisionId: revisionId,
			name: '月之世界书',
			description: '世界书描述',
			extensions: { source: 'test' },
			visibility: 'public' as const,
			createdAt,
			updatedAt,
			revisions: [
				{
					id: revisionId,
					lorebookId,
					revisionNumber: 1,
					isDraft: false,
					changeLog: null,
					createdAt,
					entries: [
						{
							id: entryId,
							revisionId,
							keys: ['月亮', '星星'],
							title: '天体',
							enabled: true,
							content: '天体设定',
							position: 'before_history' as const,
							priority: 42,
						},
					],
				},
			],
		} satisfies DrizzleLorebookWithRelations

		const lorebook = LorebookMapper.toDomain(raw)
		const revision = lorebook.currentRevision
		const entry = revision?.entries[0]

		expect(lorebook).toMatchObject({
			name: '月之世界书',
			description: '世界书描述',
			visibility: 'public',
		})
		expect(lorebook.id.value).toBe(lorebookId)
		expect(lorebook.ownerId.value).toBe(ownerId)
		expect(lorebook.createdAt).toEqual(createdAt)
		expect(lorebook.updatedAt).toEqual(updatedAt)
		expect(revision).toMatchObject({
			revisionNumber: 1,
			isDraft: false,
		})
		expect(entry).toMatchObject({
			title: '天体',
			enabled: true,
			content: '天体设定',
			position: 'before_history',
			priority: 42,
		})
		expect(entry?.keys).toEqual(['月亮', '星星'])

		const lorebookModel = LorebookMapper.toLorebookPersistence(lorebook)
		expect(lorebookModel).toMatchObject({
			id: lorebookId,
			ownerId,
			currentRevisionId: revisionId,
			name: '月之世界书',
			description: '世界书描述',
			visibility: 'public',
			updatedAt,
		})
		if (!revision) throw new Error('世界书当前版本映射失败')

		const revisionModel = LorebookMapper.toLorebookRevisionPersistence(
			lorebook.id,
			revision,
		)
		expect(revisionModel.revision).toEqual({
			id: revisionId,
			lorebookId,
			revisionNumber: 1,
			isDraft: false,
		})
		expect(revisionModel.entries).toEqual([
			{
				id: entryId,
				revisionId,
				title: '天体',
				content: '天体设定',
				keys: ['月亮', '星星'],
				enabled: true,
				position: 'before_history',
				priority: 42,
			},
		])
	})
})
