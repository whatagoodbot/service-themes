import { logger, metrics } from '@whatagoodbot/utilities'
import { clients } from '@whatagoodbot/rpc'
import { djChange, getCurrentTheme, startQuickThemes, stopCurrentTheme, skipTheme } from '../../libs/quickthemes.js'

export default async payload => {
  if (payload.service !== process.env.npm_package_name) return
  let functionName = 'quickthemes'
  logger.debug({ event: functionName })
  metrics.count(functionName)

  switch (payload.arguments) {
    case 'start':
      functionName = 'quickthemes start'
      logger.debug({ event: functionName })
      metrics.count(functionName)
      return await startQuickThemes(payload.room.id, payload.djs)
    case 'stop':
      functionName = 'quickthemes stop'
      logger.debug({ event: functionName })
      metrics.count(functionName)
      return await stopCurrentTheme(payload)
    case 'skip':
      functionName = 'quickthemes skip'
      logger.debug({ event: functionName })
      metrics.count(functionName)
      return skipTheme(payload)
    case 'djChange':
      functionName = 'quickthemes djChange'
      logger.debug({ event: functionName })
      metrics.count(functionName)
      return djChange(payload.room.id, payload.djs)
    case 'current':
      functionName = 'quickthemes current'
      logger.debug({ event: functionName })
      metrics.count(functionName)
      return await getCurrentTheme(payload.room.id)
    default:
      functionName = 'quickthemes error'
      logger.debug({ event: functionName })
      metrics.count(functionName)
      return themesError()
  }
}

const themesError = async () => {
  const string = await clients.strings.get('themesError')
  return [{
    topic: 'broadcast',
    payload: {
      message: string.value
    }
  }]
}
