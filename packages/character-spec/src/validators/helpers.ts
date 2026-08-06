import { z } from 'zod'

/** CCv2 extensions 只允许保存可序列化的 JSON 数据。 */
export const ExtensionsSchema = z.record(z.string(), z.json())
