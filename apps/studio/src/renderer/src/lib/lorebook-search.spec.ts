import { describe, expect, it } from 'vitest'
import {
  normalizeSearchText,
  searchLorebooks,
  tokenizeSearchQuery,
} from './lorebook-search'

interface Book {
  name: string
  description: string
  updatedAt: string
}

const book = (
  name: string,
  description: string,
  updatedAt = '2026-01-01T00:00:00.000Z',
): Book => ({ name, description, updatedAt })

describe('searchLorebooks', () => {
  it('规范化全角字符、大小写和连续空白', () => {
    expect(normalizeSearchText('  ＫｉＲｉＫａ　   月亮  ')).toBe('kirika 月亮')
    expect(tokenizeSearchQuery(' Kirika  kirika 月亮 ')).toEqual([
      'kirika',
      '月亮',
    ])
  })

  it('要求所有查询词分别命中名称或描述', () => {
    const books = [
      book('Kirika', '月亮的魔法少女'),
      book('Kirika', '太阳的魔法少女'),
      book('月亮百科', '与角色无关'),
    ]

    expect(searchLorebooks(books, 'kirika 月亮')).toEqual([books[0]])
  })

  it('按照名称完全、前缀、包含和描述命中进行加权排序', () => {
    const books = [
      book('其他', 'Kirika 的设定'),
      book('The Kirika Archive', '角色资料'),
      book('Kirika 世界书', '角色资料'),
      book('Kirika', '角色资料'),
    ]

    expect(searchLorebooks(books, 'kirika')).toEqual([
      books[3],
      books[2],
      books[1],
      books[0],
    ])
  })

  it('支持英文名称的一处插入、删除或替换错误', () => {
    const books = [book('Kirika', '角色资料'), book('月亮', 'Kirika 的资料')]

    expect(searchLorebooks(books, 'kirka')).toEqual([books[0]])
    expect(searchLorebooks(books, 'kirikaa')).toEqual([books[0]])
    expect(searchLorebooks(books, 'kirixa')).toEqual([books[0]])
  })

  it('同分时按更新时间、名称和原始顺序稳定排序', () => {
    const books = [
      book('Beta Moon', '', '2026-01-01T00:00:00.000Z'),
      book('Alpha Moon', '', '2026-02-01T00:00:00.000Z'),
      book('Gamma Moon', '', '2026-02-01T00:00:00.000Z'),
    ]

    expect(searchLorebooks(books, 'moon')).toEqual([
      books[1],
      books[2],
      books[0],
    ])
    expect(searchLorebooks(books, '   ')).toEqual(books)
  })
})
