import { Asset, AssetId } from '@kirika-js/core/domain/character'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SqliteAssetRepository } from '~/repositories/asset.repository'
import {
  createTestDatabase,
  type TestDatabase,
} from '~/testing/create-test-database'

describe('SqliteAssetRepository', () => {
  let context: Awaited<ReturnType<typeof createTestDatabase>> | undefined

  let db: TestDatabase
  let repository: SqliteAssetRepository

  beforeEach(async () => {
    context = await createTestDatabase()
    db = context.db

    repository = new SqliteAssetRepository(db)
  })

  afterEach(async () => {
    await context?.dispose()
  })

  it('应该保存并通过 ID 读取 Asset', async () => {
    const asset = Asset.create(
      'assets/avatar.png',
      'image/png',
      1024,
      'a'.repeat(64),
    )

    await repository.save(asset)

    const restored = await repository.findById(asset.id)

    expect(restored).not.toBeNull()
    expect(restored?.id.equals(asset.id)).toBe(true)
    expect(restored?.storageKey).toBe('assets/avatar.png')
    expect(restored?.mediaType).toBe('image/png')
    expect(restored?.byteSize).toBe(1024)
    expect(restored?.sha256).toBe('a'.repeat(64))
  })

  it('应该通过 SHA-256 查找 Asset', async () => {
    const sha256 = 'b'.repeat(64)

    const asset = Asset.create('assets/avatar.png', 'image/png', 1024, sha256)

    await repository.save(asset)

    const restored = await repository.findBySha256(sha256.toUpperCase())

    expect(restored?.id.equals(asset.id)).toBe(true)
  })

  it('不存在时应该返回 null', async () => {
    expect(await repository.findById(AssetId.generate())).toBeNull()

    expect(await repository.findBySha256('c'.repeat(64))).toBeNull()
  })

  it('重复保存同一 Asset 应该保持幂等', async () => {
    const asset = Asset.create(
      'assets/avatar.png',
      'image/png',
      1024,
      'd'.repeat(64),
    )

    await repository.save(asset)
    await repository.save(asset)

    const restored = await repository.findById(asset.id)

    expect(restored?.id.equals(asset.id)).toBe(true)
  })

  it('应该删除 Asset', async () => {
    const asset = Asset.create(
      'assets/avatar.png',
      'image/png',
      1024,
      'e'.repeat(64),
    )

    await repository.save(asset)
    await repository.delete(asset.id)

    expect(await repository.findById(asset.id)).toBeNull()
  })
})
