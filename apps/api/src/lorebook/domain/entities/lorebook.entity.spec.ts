import { describe, expect, it } from 'vitest'
import { UserId } from '~/auth/user-id.vo'
import { Lorebook, LorebookId } from './lorebook.entity'
import { LorebookEntry, LorebookEntryId } from './lorebook-entry.entity'
import {
	LorebookRevision,
	LorebookRevisionId,
} from './lorebook-revision.entity'

const ownerId = new UserId('11111111-1111-4111-8111-111111111111')
const lorebookId = new LorebookId('22222222-2222-4222-8222-222222222222')
const firstRevisionId = new LorebookRevisionId(
	'33333333-3333-4333-8333-333333333333',
)
const secondRevisionId = new LorebookRevisionId(
	'44444444-4444-4444-8444-444444444444',
)
const firstEntryId = new LorebookEntryId('55555555-5555-4555-8555-555555555555')
const now = new Date('2026-08-21T08:00:00.000Z')

function createEntry(
	overrides: {
		id?: LorebookEntryId
		keys?: string[]
		title?: string
		enabled?: boolean
		content?: string
		priority?: number
	} = {},
) {
	return LorebookEntry.reconstitute(
		overrides.id ?? firstEntryId,
		overrides.keys ?? ['月亮'],
		overrides.title ?? '月之条目',
		overrides.enabled ?? true,
		overrides.content ?? '月亮升起时，魔力会增强。',
		'after_history',
		overrides.priority ?? 10,
	)
}

function createPublishedRevision(
	id = firstRevisionId,
	revisionNumber = 1,
	entries: LorebookEntry[] = [createEntry()],
) {
	return LorebookRevision.reconstitute(id, revisionNumber, false, entries)
}

describe('Lorebook', () => {
	it('创建世界书时生成唯一的初始空草稿', () => {
		const lorebook = Lorebook.create('测试世界书', '描述', ownerId)

		expect(lorebook).toMatchObject({
			name: '测试世界书',
			description: '描述',
			visibility: 'private',
		})
		expect(lorebook.currentRevision).toBeNull()
		expect(lorebook.revisions).toHaveLength(1)
		expect(lorebook.draftRevision).toMatchObject({
			revisionNumber: 1,
			isDraft: true,
		})
		expect(lorebook.draftRevision?.entries).toEqual([])

		expect(() => lorebook.createNewDraftRevision()).toThrow(
			'该世界书已存在草稿版本',
		)
		expect(() => Lorebook.create('   ', '', ownerId)).toThrow(
			'世界书名称不能为空',
		)
	})

	it('发布非空草稿并从已发布版本创建独立的新草稿', () => {
		const lorebook = Lorebook.create('测试世界书', '', ownerId)
		const firstDraft = lorebook.draftRevision
		if (!firstDraft) throw new Error('测试世界书缺少初始草稿')

		const publishedEntry = createEntry()
		lorebook.replaceRevisionEntries(firstDraft.id, [publishedEntry])
		lorebook.publishRevision(firstDraft.id)

		expect(lorebook.currentRevision?.id).toEqual(firstDraft.id)
		expect(lorebook.currentRevision?.isDraft).toBe(false)
		expect(lorebook.draftRevision).toBeNull()

		const secondDraft = lorebook.createNewDraftRevision()
		const clonedEntry = secondDraft.entries[0]
		expect(secondDraft.revisionNumber).toBe(2)
		expect(clonedEntry?.id.value).not.toBe(publishedEntry.id.value)
		expect(clonedEntry).toMatchObject({
			title: publishedEntry.title,
			content: publishedEntry.content,
			priority: publishedEntry.priority,
		})

		lorebook.replaceRevisionEntries(secondDraft.id, [
			LorebookEntry.create(
				['星星'],
				'新条目',
				true,
				'新草稿内容',
				'before_history',
				20,
			),
		])

		expect(firstDraft.entries).toHaveLength(1)
		expect(firstDraft.entries[0]?.title).toBe('月之条目')
		expect(secondDraft.entries[0]?.title).toBe('新条目')
	})

	it('拒绝发布空草稿、修改已发布版本和提前公开', () => {
		const lorebook = Lorebook.create('测试世界书', '', ownerId)
		const draft = lorebook.draftRevision
		if (!draft) throw new Error('测试世界书缺少初始草稿')

		expect(() => lorebook.publishRevision(draft.id)).toThrow(
			'不能发布条目为空的世界书',
		)
		expect(() => lorebook.changeVisibility('public')).toThrow(
			'没有已发布版本的世界书不能对外可见',
		)

		lorebook.replaceRevisionEntries(draft.id, [createEntry()])
		lorebook.publishRevision(draft.id)
		lorebook.changeVisibility('unlisted')

		expect(lorebook.visibility).toBe('unlisted')
		expect(() =>
			lorebook.replaceRevisionEntries(draft.id, [createEntry()]),
		).toThrow('已发布的版本不能更改')
	})

	it('重建时拒绝重复版本、多个草稿和非法当前版本', () => {
		const firstDraft = LorebookRevision.createDraft(1, [])
		const secondDraft = LorebookRevision.createDraft(2, [])

		expect(() =>
			Lorebook.reconstitute(
				lorebookId,
				'测试世界书',
				'',
				ownerId,
				null,
				'private',
				[firstDraft, secondDraft],
				now,
				now,
			),
		).toThrow('世界书最多只能存在一个草稿版本')

		const published = createPublishedRevision()
		expect(() =>
			Lorebook.reconstitute(
				lorebookId,
				'测试世界书',
				'',
				ownerId,
				published.id,
				'private',
				[published, published],
				now,
				now,
			),
		).toThrow(`世界书版本 ID 重复: ${published.id.value}`)

		const duplicateNumber = createPublishedRevision(secondRevisionId, 1, [
			createEntry({
				id: new LorebookEntryId('66666666-6666-4666-8666-666666666666'),
			}),
		])
		expect(() =>
			Lorebook.reconstitute(
				lorebookId,
				'测试世界书',
				'',
				ownerId,
				published.id,
				'private',
				[published, duplicateNumber],
				now,
				now,
			),
		).toThrow('世界书版本号重复: 1')

		expect(() =>
			Lorebook.reconstitute(
				lorebookId,
				'测试世界书',
				'',
				ownerId,
				secondRevisionId,
				'private',
				[published],
				now,
				now,
			),
		).toThrow('当前世界书版本不属于该世界书')

		expect(() =>
			Lorebook.reconstitute(
				lorebookId,
				'测试世界书',
				'',
				ownerId,
				firstDraft.id,
				'private',
				[firstDraft],
				now,
				now,
			),
		).toThrow('当前世界书版本不能指向草稿')

		expect(() =>
			Lorebook.reconstitute(
				lorebookId,
				'测试世界书',
				'',
				ownerId,
				null,
				'public',
				[],
				now,
				now,
			),
		).toThrow('没有已发布版本的世界书不能对外可见')
	})
})

describe('LorebookEntry', () => {
	it('规范化关键词并对外提供防御性副本', () => {
		const entry = LorebookEntry.create(
			['  月亮  ', '月亮', '', '  星星 '],
			'  天体  ',
			true,
			'天体设定',
			'after_history',
			10,
		)

		expect(entry.keys).toEqual(['月亮', '星星'])
		expect(entry.title).toBe('天体')
		const exposedKeys = entry.keys as string[]
		exposedKeys.push('外部修改')
		expect(entry.keys).toEqual(['月亮', '星星'])
	})

	it('校验必要字段并仅在启用时匹配关键词', () => {
		expect(() =>
			LorebookEntry.create([], '条目', true, '内容', 'after_history', 0),
		).toThrow('世界书条目至少需要一个触发关键词')
		expect(() =>
			LorebookEntry.create(['关键词'], '   ', true, '内容', 'after_history', 0),
		).toThrow('世界书条目标题不能为空')
		expect(() =>
			LorebookEntry.create(['关键词'], '条目', true, '   ', 'after_history', 0),
		).toThrow('世界书条目内容不能为空')

		expect(createEntry().isTriggeredBy('今晚的月亮很好看')).toBe(true)
		expect(createEntry({ enabled: false }).isTriggeredBy('月亮')).toBe(false)
	})
})

describe('LorebookRevision', () => {
	it('按优先级返回命中条目并在发布后禁止修改', () => {
		const lowPriority = createEntry({ priority: 1 })
		const highPriority = createEntry({
			id: new LorebookEntryId('77777777-7777-4777-8777-777777777777'),
			title: '高优先级',
			priority: 100,
		})
		const disabled = createEntry({
			id: new LorebookEntryId('88888888-8888-4888-8888-888888888888'),
			title: '禁用条目',
			enabled: false,
			priority: 200,
		})
		const revision = LorebookRevision.createDraft(1, [
			lowPriority,
			highPriority,
			disabled,
		])

		expect(revision.matchEntries('月亮')).toEqual([highPriority, lowPriority])
		revision.publish()
		expect(() => revision.upsertEntry(createEntry())).toThrow(
			'已发布的版本不能更改',
		)
	})

	it('拒绝非法版本号和重复条目 ID', () => {
		expect(() => LorebookRevision.createDraft(0, [])).toThrow(
			'非法的版本号，需要 >= 1',
		)
		expect(() => LorebookRevision.createDraft(1.5, [])).toThrow(
			'非法的版本号，需要 >= 1',
		)
		const entry = createEntry()
		expect(() => LorebookRevision.createDraft(1, [entry, entry])).toThrow(
			'世界书条目 ID 重复',
		)
	})
})
