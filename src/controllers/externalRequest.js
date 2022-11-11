import { djChange, getCurrentTheme, startQuickThemes, stopCurrentTheme, skipTheme, getLeaderboard, getCurrentLeaderboard } from '../libs/quickthemes.js'
import { getString } from '../libs/grpc.js'

export default async (payload) => {
  if (payload.service !== process.env.npm_package_name) return
  if (payload.client === 'goodbot-ttl') {
    const string = await getString('themesNotYet')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  }
  switch (payload.arguments) {
    case 'start':
      return await startQuickThemes(payload.room.slug, payload.djs)
    case 'stop':
      return await stopCurrentTheme(payload)
    case 'skip':
      return skipTheme(payload)
    case 'djChange':
      return djChange(payload.room.slug, payload.djs)
    case 'current':
      return await getCurrentTheme(payload.room.slug)
    case 'leaderboard':
      return await getLeaderboard(payload.room.slug)
    case 'currentleaderboard':
      return await getCurrentLeaderboard(payload.room.slug)
    default:
      return themesError()
  }
}

const themesError = async () => {
  const string = await getString('themesError')
  return [{
    topic: 'broadcast',
    payload: {
      message: string.value
    }
  }]
}
