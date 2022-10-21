import { themesDb, quickThemesDb, quickThemesTrackerDb } from '../models/index.js'

const start = async (room, djs) => {
  const isThemeInProgress = await get(room)
  if (isThemeInProgress) return { started: false, reason: 'themeAlreadyInProgress' }

  if (djs.length < 3) {
    return { started: false, reason: 'themeNotEnoughPeople' }
  }

  const themes = await themesDb.getAll()
  const currentTheme = themes[Math.floor(Math.random() * themes.length)]
  const nextTheme = themes[Math.floor(Math.random() * themes.length)]

  const leader = djs[0]
  const caboose = djs[djs.length - 1]

  const themeRecord = await quickThemesDb.add(leader.user, caboose.user, room)
  quickThemesTrackerDb.add(themeRecord[0], currentTheme.id, nextTheme.id)

  return {
    started: true,
    currentTheme,
    nextTheme,
    leader,
    caboose
  }
}

const get = async (room) => {
  const quickTheme = await quickThemesDb.getCurrent(room)
  if (quickTheme?.id) {
    const quickThemeTracker = await quickThemesTrackerDb.get(quickTheme.id)
    return {
      quickTheme,
      quickThemeTracker
    }
  }
}

const skip = async (room, djs) => {
  const isThemeInProgress = await get(room)
  if (isThemeInProgress) {
    const themes = await themesDb.getAll()
    const currentTheme = isThemeInProgress.quickThemeTracker.nextTheme
    const nextTheme = themes[Math.floor(Math.random() * themes.length)]

    const leader = djs[0]
    const caboose = djs[djs.length - 1]

    quickThemesTrackerDb.add(isThemeInProgress.quickThemeTracker.quickTheme, currentTheme, nextTheme.id)

    return {
      skipped: true,
      currentThemeName: isThemeInProgress.quickThemeTracker.nextThemeName,
      nextThemeName: nextTheme.name,
      leader,
      caboose
    }
  }
}

const stop = async (room) => {
  const isThemeInProgress = await get(room)
  if (isThemeInProgress) {
    quickThemesDb.update(isThemeInProgress.quickThemeTracker.id, { end: new Date() })
    themesDb.update(isThemeInProgress.quickThemeTracker.currentTheme, { used: new Date() })
    return true
  }
}

const changeSeats = async (room, djs) => {
  const inProgressTheme = await get(room)
  if (inProgressTheme) {
    if (djs.length < 3) {
      stop(room)
      return { started: false, reason: 'themeNotEnoughPeople' }
    }
    const leader = djs[0].user
    const caboose = djs[djs.length - 1].user

    if (leader !== inProgressTheme.quickTheme.leader || caboose !== inProgressTheme.quickTheme.caboose) {
      await quickThemesDb.update(inProgressTheme.quickTheme.id, {
        leader,
        caboose
      })
      return { djsChanged: true }
    }
  }
}

export const startQuickThemes = async (payload, meta) => {
  const theme = await start(meta.roomUuid, payload.djs)
  if (theme.started) {
    return [{
      topic: 'responseRead',
      payload: {
        key: 'themeStart',
        category: 'system'
      }
    },
    {
      topic: 'themeUpdate',
      payload: {
        trigger: 'start',
        currentTheme: theme.currentTheme.name,
        nextTheme: theme.nextTheme.name,
        leader: theme.leader.user,
        caboose: theme.caboose.user
      }
    }
    ]
  } else {
    const response = [{
      topic: 'responseRead',
      payload: {
        key: theme.reason,
        category: 'system'
      }
    }]
    if (theme.reason === 'themeAlreadyInProgress') return response.concat(await getCurrentTheme(meta))
    return response
  }
}

export const getCurrentTheme = async (room, trigger = 'current') => {
  const currentTheme = await get(room)
  if (currentTheme?.quickTheme?.id) {
    return [{
      topic: 'themeUpdate',
      payload: {
        trigger,
        currentTheme: currentTheme.quickThemeTracker.currentThemeName,
        nextTheme: currentTheme.quickThemeTracker.nextThemeName,
        leader: currentTheme.quickTheme.leader,
        caboose: currentTheme.quickTheme.caboose
      }
    }]
  } else {
    return [{
      topic: 'responseRead',
      payload: {
        key: 'themeNone',
        category: 'system'
      }
    }]
  }
}

export const stopCurrentTheme = async (meta) => {
  const stoppedTheme = await stop(meta.roomUuid)
  if (stoppedTheme) {
    return [{
      topic: 'themeUpdate',
      payload: {
        trigger: 'themeEnd',
        currentTheme: '',
        nextTheme: '',
        leader: '',
        caboose: '',
        clearPin: true
      }
    }]
  } else {
    return [{
      topic: 'responseRead',
      payload: {
        key: 'somethingWentWrong',
        category: 'system'
      }
    }]
  }
}

export const skipTheme = async (payload, meta) => {
  const currentTheme = await skip(meta.roomUuid, payload.djs)
  return [{
    topic: 'themeUpdate',
    payload: {
      trigger: 'skip',
      currentTheme: currentTheme.currentThemeName,
      nextTheme: currentTheme.nextThemeName,
      leader: currentTheme.leader.user,
      caboose: currentTheme.caboose.user
    }
  }]
}

export const djChange = async (roomUuid, djs, meta) => {
  const isChange = await changeSeats(roomUuid, djs)
  if (isChange) {
    return [{
      topic: 'responseRead',
      payload: {
        key: 'themeDjChange',
        category: 'system'
      }
    },
    ...await getCurrentTheme(meta, 'djChange')
    ]
  }
}

export const progressUpdate = async (room, dj) => {
  const inProgressTheme = await get(room)
  if (inProgressTheme) {
    console.log(inProgressTheme)

    if (dj.userId === inProgressTheme.leader) {
      // await pinMessage(room, `${strings.themeCurrent} ${theme.quickThemeTracker.currentThemeName}. ${strings.themeOnDeck} ${theme.quickThemeTracker.nextThemeName}`)
      if (inProgressTheme.quickTheme.start) {
        // const winner = await playReactionsDb.getReactionTable({
        //   theme: inProgressTheme.quickThemeTracker.lastTheme
        // })
        // return [winner]
      } else {
        await quickThemesDb.update(inProgressTheme.quickTheme.id, { start: new Date() })
        return [{
          topic: 'responseRead',
          payload: {
            key: 'themeBegun',
            category: 'system'
          }
        },
        ...await getCurrentTheme(room, 'djChange')]
      }
    }
    if (dj.userId === inProgressTheme.caboose) {
      themesDb.update(inProgressTheme.quickThemeTracker.currentTheme, 'used', new Date())
      const themes = await themesDb.getAll()
      const themeOnDeck = themes[Math.floor(Math.random() * themes.length)]
      quickThemesTrackerDb.add(inProgressTheme.quickTheme.id, inProgressTheme.quickThemeTracker.nextTheme, themeOnDeck.id, inProgressTheme.quickThemeTracker.currentTheme)
      return [
        // `${strings.themeNext} ${theme.quickThemeTracker.nextThemeName}. ${strings.themeOnDeck} ${themeOnDeck.name}`,
        // `${strings.themeNextLeader}${themeLeader.nickname}, ${strings.themeNextCaboose}${themeCaboose.nickname}`
      ]
    }
  }
}
