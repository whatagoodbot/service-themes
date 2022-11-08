import { get } from '../libs/quickthemes.js'

export default async (call, callback) => {
  console.log('rpc req', call?.request?.room)
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
