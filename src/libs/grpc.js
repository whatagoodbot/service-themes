import { logger, metrics } from '@whatagoodbot/utilities'
import { server, serverCreds, themes } from '@whatagoodbot/rpc'
import getCurrentTheme from '../controllers/rpc/getCurrentTheme.js'

export const startServer = () => {
  server.addService(themes.Themes.service, { getCurrentTheme })
  server.bindAsync('0.0.0.0:50000', serverCreds, () => {
    const functionName = 'startGrpcServer'
    logger.debug({ event: functionName })
    metrics.count(functionName)
    server.start()
  })
}
