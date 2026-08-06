import { z } from 'zod'

export const stringDefault = (fallback = '') =>
	z
		.string()
		.nullish()
		.catch(fallback)
		.transform((val) => val ?? fallback)

export const stringArrayDefault = () =>
	z
		.array(z.string())
		.nullish()
		.catch([])
		.transform((val) => val ?? [])

export const recordDefault = () =>
	z
		.record(z.string(), z.unknown())
		.nullish()
		.catch({})
		.transform((val) => val ?? {})
