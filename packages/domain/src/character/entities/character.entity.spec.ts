import { describe, expect, it } from 'vitest'
import { LorebookRevisionId } from '../../lorebook/entities/lorebook-revision.entity'
import { UserId } from '../../shared/user-id.vo'
import { Asset, CharacterRevisionAsset } from './assets.entity'
import { Character, CharacterId } from './character.entity'
import { CharacterLorebookReference } from './character-lorebook-reference.vo'
import {
	CharacterRevision,
	CharacterRevisionId,
} from './character-revision.entity'

function createCharacter() {
	return Character.create({
		ownerId: new UserId(crypto.randomUUID()),
		alias: '  luna  ',
		initialRevision: {
			name: '  露娜  ',
			description: '月之魔女',
			greetings: ['你好。', '', '你好。', '   '],
		},
	})
}

function createAssetReference(kind: 'avatar' | 'background', ordinal: number) {
	const asset = Asset.create(
		`characters/luna/${kind}.png`,
		'image/png',
		1024,
		'a'.repeat(64),
	)

	return new CharacterRevisionAsset({
		assetId: asset.id,
		kind,
		name: kind,
		uri: `asset://${asset.id.value}`,
		ordinal,
		extensions: { crop: { x: 10 } },
	})
}

describe('Character domain', () => {
	it('创建角色时生成初始草稿并规范化基础字段', () => {
		const character = createCharacter()

		expect(character.alias).toBe('luna')
		expect(character.currentRevision).toBeNull()
		expect(character.revisions).toHaveLength(1)
		expect(character.draftRevision).toMatchObject({
			revisionNumber: 1,
			isDraft: true,
			name: '露娜',
			description: '月之魔女',
		})
		expect(character.draftRevision?.greetings).toEqual(['你好。'])
	})

	it('角色名不能为空且同一角色只能存在一个草稿', () => {
		expect(() =>
			Character.create({
				ownerId: new UserId(crypto.randomUUID()),
				initialRevision: { name: '   ' },
			}),
		).toThrow('角色名称不能为空')

		const character = createCharacter()
		expect(() => character.createNewDraftRevision()).toThrow(
			'该角色已存在草稿版本',
		)
	})

	it('发布要求至少一条问候语，发布后版本不可修改', () => {
		const character = Character.create({
			ownerId: new UserId(crypto.randomUUID()),
			initialRevision: { name: '露娜' },
		})
		const draft = character.draftRevision
		if (!draft) throw new Error('测试角色缺少初始草稿')

		expect(() => character.publishRevision(draft.id)).toThrow(
			'角色至少需要一条问候语才能发布',
		)

		character.replaceDraftGreetings(draft.id, ['你好，旅行者。'])
		character.publishRevision(draft.id)

		expect(character.currentRevision?.id.value).toBe(draft.id.value)
		expect(character.draftRevision).toBeNull()
		expect(() =>
			character.updateDraftContent(draft.id, { description: '被篡改' }),
		).toThrow('已发布的角色版本不能更改')
	})

	it('从当前发布版本克隆新草稿且不影响历史版本', () => {
		const character = createCharacter()
		const firstDraft = character.draftRevision
		if (!firstDraft) throw new Error('测试角色缺少初始草稿')

		const avatar = createAssetReference('avatar', 0)
		const lorebookReference = new CharacterLorebookReference({
			lorebookRevisionId: new LorebookRevisionId(crypto.randomUUID()),
			ordinal: 0,
		})

		character.replaceDraftAssets(firstDraft.id, [avatar])
		character.replaceDraftLorebooks(firstDraft.id, [lorebookReference])
		character.publishRevision(firstDraft.id)

		const secondDraft = character.createNewDraftRevision()
		expect(secondDraft.revisionNumber).toBe(2)
		expect(secondDraft.id.value).not.toBe(firstDraft.id.value)
		expect(secondDraft.assets[0]?.assetId.value).toBe(avatar.assetId.value)
		expect(secondDraft.lorebooks[0]?.lorebookRevisionId.value).toBe(
			lorebookReference.lorebookRevisionId.value,
		)

		character.updateDraftContent(secondDraft.id, {
			name: '菈妮',
			description: '新版本',
		})

		expect(secondDraft.name).toBe('菈妮')
		expect(firstDraft.name).toBe('露娜')
		expect(firstDraft.description).toBe('月之魔女')
	})

	it('资产及世界书引用必须具有唯一位置和引用', () => {
		const firstAvatar = createAssetReference('avatar', 0)
		const secondAvatar = createAssetReference('avatar', 0)

		expect(() =>
			CharacterRevision.createDraft(1, {
				name: '露娜',
				assets: [firstAvatar, secondAvatar],
			}),
		).toThrow('角色资产位置重复: avatar:0')

		const lorebookRevisionId = new LorebookRevisionId(crypto.randomUUID())
		const firstReference = new CharacterLorebookReference({
			lorebookRevisionId,
			ordinal: 0,
		})
		const duplicateReference = new CharacterLorebookReference({
			lorebookRevisionId,
			ordinal: 1,
		})

		expect(() =>
			CharacterRevision.createDraft(1, {
				name: '露娜',
				lorebooks: [firstReference, duplicateReference],
			}),
		).toThrow('世界书版本重复引用')
	})

	it('对集合、扩展字段和时间提供防御性副本', () => {
		const extensions = { nested: { enabled: true } }
		const revision = CharacterRevision.createDraft(1, {
			name: '露娜',
			greetings: ['你好。'],
			extensions,
		})

		extensions.nested.enabled = false
		const exposedExtensions = revision.extensions as {
			nested: { enabled: boolean }
		}
		exposedExtensions.nested.enabled = false
		const exposedGreetings = revision.greetings as string[]
		exposedGreetings.push('外部修改')
		const exposedCreatedAt = revision.createdAt
		exposedCreatedAt.setFullYear(2000)

		expect(revision.extensions).toEqual({ nested: { enabled: true } })
		expect(revision.greetings).toEqual(['你好。'])
		expect(revision.createdAt.getFullYear()).not.toBe(2000)
	})

	it('重建聚合时拒绝重复版本号、多个草稿和非法当前版本', () => {
		const ownerId = new UserId(crypto.randomUUID())
		const now = new Date()
		const firstDraft = CharacterRevision.createDraft(1, { name: '露娜' })
		const secondDraft = CharacterRevision.createDraft(2, { name: '露娜' })

		expect(() =>
			Character.reconstitute({
				id: new CharacterId(crypto.randomUUID()),
				ownerId,
				alias: null,
				currentRevisionId: null,
				revisions: [firstDraft, secondDraft],
				createdAt: now,
				updatedAt: now,
			}),
		).toThrow('角色最多只能存在一个草稿版本')

		const publishedRevision = CharacterRevision.reconstitute({
			id: new CharacterRevisionId(crypto.randomUUID()),
			revisionNumber: 1,
			isDraft: false,
			name: '露娜',
			greetings: ['你好。'],
			createdAt: now,
			updatedAt: now,
		})
		const duplicateNumber = CharacterRevision.reconstitute({
			id: new CharacterRevisionId(crypto.randomUUID()),
			revisionNumber: 1,
			isDraft: false,
			name: '菈妮',
			greetings: ['你好。'],
			createdAt: now,
			updatedAt: now,
		})

		expect(() =>
			Character.reconstitute({
				id: new CharacterId(crypto.randomUUID()),
				ownerId,
				alias: null,
				currentRevisionId: publishedRevision.id,
				revisions: [publishedRevision, duplicateNumber],
				createdAt: now,
				updatedAt: now,
			}),
		).toThrow('角色版本号重复: 1')

		expect(() =>
			Character.reconstitute({
				id: new CharacterId(crypto.randomUUID()),
				ownerId,
				alias: null,
				currentRevisionId: new CharacterRevisionId(crypto.randomUUID()),
				revisions: [publishedRevision],
				createdAt: now,
				updatedAt: now,
			}),
		).toThrow('当前角色版本不属于该角色')
	})
})
