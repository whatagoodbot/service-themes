import { themesDb, quickThemesDb, quickThemesTrackerDb } from '../models/index.js'
import { getString, getManyStrings, getUser, getThemeResults } from '../libs/grpc.js'
import { logger } from '../utils/logging.js'

const broadcastCurrentThemeDetails = async (currentTheme, nextTheme, leader, caboose, intro) => {
  logger.debug('broadcastCurrentThemeDetails')
  const leaderProfile = await getUser(leader)
  const cabooseProfile = await getUser(caboose)
  const strings = await getManyStrings([intro, 'themeCurrent', 'themeOnDeck', 'themeLeader', 'themeCaboose'])
  const responses = []
  if (intro) {
    responses.push({
      topic: 'broadcast',
      payload: {
        message: strings[intro]
      }
    })
  }
  responses.push({
    topic: 'broadcast',
    payload: {
      message: `${strings.themeCurrent} ${currentTheme}. ${strings.themeOnDeck} ${nextTheme}`
    }
  },
  {
    topic: 'broadcast',
    payload: {
      message: `${strings.themeLeader} @${leaderProfile.name}, ${strings.themeCaboose} @${cabooseProfile.name}`
    }
  })
  return responses
}

export const get = async (room) => {
  logger.debug('get')
  const quickTheme = await quickThemesDb.getCurrent(room)
  if (quickTheme?.id) {
    const quickThemeTracker = await quickThemesTrackerDb.get(quickTheme.id)
    return {
      quickTheme,
      quickThemeTracker
    }
  }
}

export const startQuickThemes = async (room, djs) => {
  logger.debug('startQuickThemes')
  const themeInProgress = await get(room)
  if (themeInProgress) {
    return broadcastCurrentThemeDetails(themeInProgress.quickThemeTracker.currentThemeName, themeInProgress.quickThemeTracker.nextThemeName, themeInProgress.quickTheme.leader, themeInProgress.quickTheme.caboose, 'themeAlreadyInProgress')
  }

  // if (djs.length < 3) {
  //   const string = await getString('themeNotEnoughPeople')
  //   return [{
  //     topic: 'broadcast',
  //     payload: {
  //       message: string.value
  //     }
  //   }]
  // }
  const themes = await themesDb.getAll()
  const currentTheme = themes[Math.floor(Math.random() * themes.length)]
  const nextTheme = themes[Math.floor(Math.random() * themes.length)]
  const leader = djs[1]
  const caboose = djs[0]

  const themeRecord = await quickThemesDb.add(leader.userId, 1, caboose.userId, 0, room)
  quickThemesTrackerDb.add(themeRecord[0], currentTheme.id, nextTheme.id)

  return broadcastCurrentThemeDetails(currentTheme.name, nextTheme.name, leader.userId, caboose.userId, 'themeStart')
}

export const getCurrentTheme = async (room, intro) => {
  logger.debug('getCurrentTheme')
  const themeInProgress = await get(room)
  if (themeInProgress?.quickTheme?.id) {
    return broadcastCurrentThemeDetails(themeInProgress.quickThemeTracker.currentThemeName, themeInProgress.quickThemeTracker.nextThemeName, themeInProgress.quickTheme.leader, themeInProgress.quickTheme.caboose, intro)
  } else {
    const string = await getString('themeNone')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  }
}

const stop = async (themeInProgress) => {
  logger.debug('stop')
  if (themeInProgress) {
    quickThemesDb.update(themeInProgress.quickTheme.id, { end: new Date() })
    themesDb.update(themeInProgress.quickThemeTracker.currentTheme, { used: new Date() })
  }
}

export const stopCurrentTheme = async (payload) => {
  logger.debug('stopCurrentTheme')
  const themeInProgress = await get(payload.room.slug)
  if (themeInProgress) {
    await stop(themeInProgress)
    const string = await getString('themeEnd')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  } else {
    const string = await getString('themeNone')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  }
}

export const skipTheme = async (payload) => {
  logger.debug('skipTheme')
  const themeInProgress = await get(payload.room.slug)
  if (themeInProgress) {
    const themes = await themesDb.getAll()
    const currentTheme = themeInProgress.quickThemeTracker.currentTheme
    const currentThemName = themeInProgress.quickThemeTracker.currentThemeName
    const nextTheme = themes[Math.floor(Math.random() * themes.length)]
    quickThemesTrackerDb.add(themeInProgress.quickThemeTracker.quickTheme, currentTheme, nextTheme.id)
    return broadcastCurrentThemeDetails(currentThemName, nextTheme.name, themeInProgress.quickTheme.leader, themeInProgress.quickTheme.caboose)
  }
}

export const djChange = async (room, djs) => {
  logger.debug('djChange')
  const themeInProgress = await get(room)
  if (themeInProgress) {
    if (djs.length < 3) {
      stop(themeInProgress)
      const string = await getString('themeNotEnoughPeople')
      return [{
        topic: 'broadcast',
        payload: {
          message: string.value
        }
      }]
    }
    let hasChanged = false
    let leader = themeInProgress.quickTheme.leader
    let caboose = themeInProgress.quickTheme.caboose
    const leaderPosition = djs.findIndex(dj => dj.userId === leader)
    if (leaderPosition < 0) {
      // We lost the leader - pick a new one
      hasChanged = true
      const leaderPosition = themeInProgress.quickTheme.leaderPosition - 1
      leader = djs[leaderPosition].userId
      await quickThemesDb.update(themeInProgress.quickTheme.id, {
        leader,
        leaderPosition
      })
    }

    for (let pos = 0; pos < leaderPosition; pos++) {
      djs.push(djs.splice(0, 1)[0])
    }
    const caboosePosition = djs.findIndex(dj => dj.userId === caboose)
    if (caboosePosition !== (djs.length - 1)) {
      // Caboose has changed - pick a new one
      hasChanged = true
      const caboosePosition = djs.length - 1
      caboose = djs[caboosePosition].userId
      await quickThemesDb.update(themeInProgress.quickTheme.id, {
        caboose,
        caboosePosition
      })
    }
    if (hasChanged) {
      return broadcastCurrentThemeDetails(themeInProgress.quickThemeTracker.currentThemeName, themeInProgress.quickThemeTracker.nextThemeName, leader, caboose, 'themeDjChange')
    } else {
      await quickThemesDb.update(themeInProgress.quickTheme.id, {
        leaderPosition
      })
    }
  }
}

export const progressUpdate = async (room, dj) => {
  logger.debug('progressUpdate')
  const themeInProgress = await get(room)
  if (themeInProgress) {
    const leader = themeInProgress.quickTheme.leader
    const caboose = themeInProgress.quickTheme.caboose
    if (dj === leader) {
      if (themeInProgress.quickTheme.start) {
        const themeResults = await getThemeResults(room, themeInProgress.quickThemeTracker.id)
        const strings = await getManyStrings(['themeWinnerIntro', 'themeWinnerMid'])
        const winner = await getUser(themeResults.user)
        return [{
          topic: 'broadcast',
          payload: {
            message: `${strings.themeWinnerIntro} ${themeResults.score} ${strings.themeWinnerMid} @${winner.name}`
          }
        }]
      } else {
        await quickThemesDb.update(themeInProgress.quickTheme.id, { start: new Date() })
        return broadcastCurrentThemeDetails(themeInProgress.quickThemeTracker.currentThemeName, themeInProgress.quickThemeTracker.nextThemeName, leader, caboose, 'themeBegun')
      }
    }
    if (dj === caboose) {
      themesDb.update(themeInProgress.quickThemeTracker.currentTheme, { used: new Date() })
      const themes = await themesDb.getAll()
      const themeOnDeck = themes[Math.floor(Math.random() * themes.length)]
      quickThemesTrackerDb.add(themeInProgress.quickTheme.id, themeInProgress.quickThemeTracker.nextTheme, themeOnDeck.id, themeInProgress.quickThemeTracker.currentTheme)
      const string = await getString('themeNext')
      const leaderProfile = await getUser(leader)
      return [{
        topic: 'broadcast',
        payload: {
          message: `${string.value} ${themeInProgress.quickThemeTracker.nextThemeName} - get ready @${leaderProfile.name}`
        }
      }]
    }
  }
}
