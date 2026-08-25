import type { HonoLogLayerVariables } from '@loglayer/hono'
import {
  getSimplePrettyTerminal,
  moonlight,
} from '@loglayer/transport-simple-pretty-terminal'
import { LogLayer } from 'loglayer'
import { serializeError } from 'serialize-error'

export const log = new LogLayer({
  errorSerializer: serializeError,
  transport: getSimplePrettyTerminal({
    runtime: 'node',
    theme: moonlight,
  }),
})

export interface AppEnv {
  Variables: HonoLogLayerVariables
}
