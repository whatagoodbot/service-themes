import { logger, metrics } from '@whatagoodbot/utilities'
import { get } from '../../libs/quickthemes.js'

export default async (call, callback) => {
  const functionName = 'getCurrentTheme'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  if (!call?.request?.room) return callback(null, null)
  const currentTheme = await get(call?.request?.room)
  if (currentTheme) {
    callback(null, {
      id: currentTheme.quickThemeTracker.id
    })
  } else {
    callback(null, {
      id: null
    })
  }
}
