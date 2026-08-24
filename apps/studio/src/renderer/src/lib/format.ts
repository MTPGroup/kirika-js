/** 把 ISO 时间转成「3 分钟前」这类相对时间。 */
export function timeAgo(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${Math.max(1, minutes)} 分钟前`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  const days = Math.round(hours / 24)
  if (days < 30) return `${days} 天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

/** 取名字的首字符用于头像占位。 */
export function initials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'

  // 中文直接取首字，拉丁取大写首字母。
  return Array.from(trimmed)[0]?.toUpperCase() ?? '?'
}
