export const DATABASE_OPTIONS = Symbol('DATABASE_OPTIONS')

export interface DatabaseOptions {
	url: string
	poolMax: number
}
