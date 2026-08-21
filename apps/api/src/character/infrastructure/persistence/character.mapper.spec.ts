import { describe, expect, it } from 'vitest'
import { CharacterMapper } from './character.mapper'
import { DrizzleCharacterWithRelations } from './character.query'

describe('CharacterMapper', () => {
	it('应完整还原角色、版本、资产和世界书引用', () => {
		const createdAt = new Date('2026-08-21T08:00:00.000Z')
		const updatedAt = new Date('2026-08-21T09:00:00.000Z')
		const raw = {
			id: '11111111-1111-4111-8111-111111111111',
			ownerId: '22222222-2222-4222-8222-222222222222',
			alias: '助手',
			currentRevisionId: null,
			createdAt,
			updatedAt,
			revisions: [
				{
					id: '33333333-3333-4333-8333-333333333333',
					characterId: '11111111-1111-4111-8111-111111111111',
					revisionNumber: 1,
					isDraft: true,
					name: 'Kirika',
					description: '角色描述',
					personality: '冷静',
					scenario: '测试场景',
					systemPrompt: '系统提示词',
					postHistoryInstructions: '历史后置指令',
					greetings: ['你好'],
					examples: ['示例'],
					extensions: { source: 'test' },
					createdAt,
					updatedAt,
					revisionAssets: [
						{
							revisionId: '33333333-3333-4333-8333-333333333333',
							assetId: '44444444-4444-4444-8444-444444444444',
							kind: 'avatar' as const,
							name: '立绘',
							uri: 'asset://avatar',
							ordinal: 0,
							extensions: { size: 'large' },
						},
					],
					lorebookReferences: [
						{
							characterRevisionId: '33333333-3333-4333-8333-333333333333',
							lorebookRevisionId: '55555555-5555-4555-8555-555555555555',
							ordinal: 0,
							enabled: true,
						},
					],
				},
			],
		} satisfies DrizzleCharacterWithRelations

		const character = CharacterMapper.toDomain(raw)
		const revision = character.draftRevision

		expect(character.alias).toBe('助手')
		expect(revision).not.toBeNull()
		expect(revision?.name).toBe('Kirika')
		expect(revision?.assets[0]).toMatchObject({
			kind: 'avatar',
			name: '立绘',
			ordinal: 0,
		})
		expect(revision?.lorebooks[0]).toMatchObject({
			ordinal: 0,
			enabled: true,
		})
		if (!revision) throw new Error('角色草稿版本映射失败')

		const model = CharacterMapper.toCharacterRevisionPersistence(
			character.id,
			revision,
		)
		expect(model.revision).toMatchObject({
			name: 'Kirika',
			greetings: ['你好'],
			extensions: { source: 'test' },
		})
		expect(model.assets[0]?.assetId).toBe(
			'44444444-4444-4444-8444-444444444444',
		)
		expect(model.lorebooks[0]?.lorebookRevisionId).toBe(
			'55555555-5555-4555-8555-555555555555',
		)
	})
})
