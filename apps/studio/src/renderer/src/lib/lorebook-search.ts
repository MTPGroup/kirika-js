import type { LorebookSummaryDto } from '@renderer/services/api'

interface SearchableLorebook {
  readonly name: string
  readonly description: string
  readonly updatedAt: string
}

interface ScoredLorebook<T> {
  readonly item: T
  readonly score: number
  readonly index: number
}

/**
 * 在内存中的世界书摘要上执行可解释的加权搜索。
 * 每个查询词都必须命中名称或描述；名称的完全、前缀和包含匹配依次优先。
 */
export function searchLorebooks<T extends SearchableLorebook>(
  books: readonly T[],
  query: string,
): T[] {
  const terms = tokenizeSearchQuery(query)
  if (terms.length === 0) return [...books]

  return books
    .map((item, index): ScoredLorebook<T> | null => {
      const name = normalizeSearchText(item.name)
      const description = normalizeSearchText(item.description)
      let score = 0

      for (const term of terms) {
        const termScore = scoreTerm(name, description, term)
        if (termScore === 0) return null
        score += termScore
      }

      return { item, score, index }
    })
    .filter((value): value is ScoredLorebook<T> => value !== null)
    .sort((left, right) => {
      const scoreDifference = right.score - left.score
      if (scoreDifference !== 0) return scoreDifference

      const updatedDifference =
        Date.parse(right.item.updatedAt) - Date.parse(left.item.updatedAt)
      if (Number.isFinite(updatedDifference) && updatedDifference !== 0)
        return updatedDifference

      const nameDifference = left.item.name.localeCompare(right.item.name)
      return nameDifference !== 0 ? nameDifference : left.index - right.index
    })
    .map(({ item }) => item)
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/\s+/gu, ' ')
    .trim()
}

export function tokenizeSearchQuery(query: string): string[] {
  return [...new Set(normalizeSearchText(query).split(' ').filter(Boolean))]
}

function scoreTerm(name: string, description: string, term: string): number {
  if (name === term) return 100
  if (name.startsWith(term)) return 80
  if (containsWordPrefix(name, term)) return 70
  if (name.includes(term)) return 60
  if (hasCloseWord(name, term)) return 40
  if (description.startsWith(term)) return 30
  if (containsWordPrefix(description, term)) return 25
  if (description.includes(term)) return 15
  return 0
}

function containsWordPrefix(value: string, term: string): boolean {
  return words(value).some((word) => word.startsWith(term))
}

function hasCloseWord(value: string, term: string): boolean {
  if (!/^[\p{Letter}\p{Number}]+$/u.test(term) || term.length < 4) return false
  return words(value).some(
    (word) =>
      Math.abs(word.length - term.length) <= 1 && isWithinOneEdit(word, term),
  )
}

function words(value: string): string[] {
  return value.split(/[\s\p{P}\p{S}]+/u).filter(Boolean)
}

function isWithinOneEdit(left: string, right: string): boolean {
  if (left === right) return true
  if (Math.abs(left.length - right.length) > 1) return false

  let leftIndex = 0
  let rightIndex = 0
  let edits = 0
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1
      rightIndex += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (left.length > right.length) leftIndex += 1
    else if (right.length > left.length) rightIndex += 1
    else {
      leftIndex += 1
      rightIndex += 1
    }
  }
  return (
    edits + Number(leftIndex < left.length || rightIndex < right.length) <= 1
  )
}

export type SearchableLorebookSummary = Pick<
  LorebookSummaryDto,
  'name' | 'description' | 'updatedAt'
>
