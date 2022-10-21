// import { djChange, getCurrentTheme, startQuickThemes, stopCurrentTheme, skipTheme } from '../libs/quickthemes.js'

export default async (payload) => {
  if (payload.service !== process.env.npm_package_name) return
  return [{
    topic: 'responseRead',
    payload: {
      key: 'themesNotYet',
      category: 'system'
    }
  }]

  // switch (payload.arguments) {
  //   case 'start':
  //     return await startQuickThemes(payload, meta)
  //   case 'stop':
  //     return await stopCurrentTheme(meta)
  //   case 'skip':
  //     // Need to test this
  //     return skipTheme(payload, meta)
  //   case 'djChange':
  //     return djChange(meta.roomUuid, payload.djs, meta)
  //   case 'current':
  //     return await getCurrentTheme(meta.roomUuid)
  //   default:
  //     return [{
  //       topic: 'responseRead',
  //       payload: {
  //         key: 'themesError',
  //         category: 'system'
  //       }
  //     }]
  // }
}
