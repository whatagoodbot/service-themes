import { themesDb, quickThemesDb, quickThemesTrackerDb } from '../models/index.js'
import { logger, metrics } from '@whatagoodbot/utilities'
import { clients } from '@whatagoodbot/rpc'

const broadcastCurrentThemeDetails = async (currentTheme, nextTheme, leader, caboose, intro) => {
  const functionName = 'broadcastCurrentThemeDetails'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  const leaderProfile = await clients.users.get(leader)
  const cabooseProfile = await clients.users.get(caboose)
  const strings = await clients.strings.getMany([intro, 'themeCurrent', 'themeOnDeck', 'themeLeader', 'themeCaboose'])
  const responses = []
  // TODO add rich text support here
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
  const functionName = 'get'
  logger.debug({ event: functionName })
  metrics.count(functionName)
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
  const functionName = 'startQuickThemes'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  const themeInProgress = await get(room)
  if (themeInProgress) {
    return await broadcastCurrentThemeDetails(themeInProgress.quickThemeTracker.currentThemeName, themeInProgress.quickThemeTracker.nextThemeName, themeInProgress.quickTheme.leader, themeInProgress.quickTheme.caboose, 'themeAlreadyInProgress')
  }

  if (djs.length < 3) {
    const string = await clients.strings.get('themeNotEnoughPeople')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  }
  const themes = await themesDb.getAll()
  const currentTheme = themes[Math.floor(Math.random() * themes.length)]
  const nextTheme = themes[Math.floor(Math.random() * themes.length)]
  const leader = djs[1]
  const caboose = djs[0]

  const themeRecord = await quickThemesDb.add(leader.userId, 1, caboose.userId, 0, room)
  quickThemesTrackerDb.add(themeRecord[0], currentTheme.id, nextTheme.id)

  return await broadcastCurrentThemeDetails(currentTheme.name, nextTheme.name, leader.userId, caboose.userId, 'themeStart')
}

export const getCurrentTheme = async (room, intro) => {
  const functionName = 'getCurrentTheme'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  const themeInProgress = await get(room)
  if (themeInProgress?.quickTheme?.id) {
    return await broadcastCurrentThemeDetails(themeInProgress.quickThemeTracker.currentThemeName, themeInProgress.quickThemeTracker.nextThemeName, themeInProgress.quickTheme.leader, themeInProgress.quickTheme.caboose, intro)
  } else {
    const string = await clients.strings.get('themeNone')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  }
}

const stop = async (themeInProgress) => {
  const functionName = 'stop'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  if (themeInProgress) {
    quickThemesDb.update(themeInProgress.quickTheme.id, { end: new Date() })
    themesDb.update(themeInProgress.quickThemeTracker.currentTheme, { used: new Date() })
  }
}

export const stopCurrentTheme = async (payload) => {
  const functionName = 'stopCurrentTheme'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  const themeInProgress = await get(payload.room.id)
  if (themeInProgress) {
    await stop(themeInProgress)
    const string = await clients.strings.get('themeFinished')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  } else {
    const string = await clients.strings.get('themeNone')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  }
}

export const skipTheme = async (payload) => {
  const functionName = 'skipTheme'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  const themeInProgress = await get(payload.room.id)
  if (themeInProgress) {
    const themes = await themesDb.getAll()
    const currentTheme = themeInProgress.quickThemeTracker.currentTheme
    const currentThemName = themeInProgress.quickThemeTracker.currentThemeName
    const nextTheme = themes[Math.floor(Math.random() * themes.length)]
    quickThemesTrackerDb.add(themeInProgress.quickThemeTracker.quickTheme, currentTheme, nextTheme.id)
    return await broadcastCurrentThemeDetails(currentThemName, nextTheme.name, themeInProgress.quickTheme.leader, themeInProgress.quickTheme.caboose)
  } else {
    const string = await clients.strings.get('themeNone')
    return [{
      topic: 'broadcast',
      payload: {
        message: string.value
      }
    }]
  }
}

export const djChange = async (room, djs) => {
  const functionName = 'djChange'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  const themeInProgress = await get(room)
  if (themeInProgress) {
    if (djs.length < 3) {
      stop(themeInProgress)
      const string = await clients.strings.get('themeNotEnoughPeople')
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
      const leaderPosition = themeInProgress.quickTheme.leaderPosition + 1
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
    if (caboosePosition !== (djs.length-1)) {
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
      return await broadcastCurrentThemeDetails(themeInProgress.quickThemeTracker.currentThemeName, themeInProgress.quickThemeTracker.nextThemeName, leader, caboose, 'themeDjChange')
    } else {
      await quickThemesDb.update(themeInProgress.quickTheme.id, {
        leaderPosition
      })
    }
  }
}

export const progressUpdate = async (room, dj) => {
  const functionName = 'progressUpdate'
  logger.debug({ event: functionName })
  metrics.count(functionName)
  const themeInProgress = await get(room)
  if (themeInProgress) {
    const leader = themeInProgress.quickTheme.leader
    const caboose = themeInProgress.quickTheme.caboose
    if (dj === leader) {
      if (themeInProgress.quickTheme.start) {
        const themeResults = await clients.statistics.getThemeWinner(room, themeInProgress.quickThemeTracker.id)
        const strings = await clients.strings.getMany(['themeWinnerIntro', 'themeWinnerMid'])
        // Switch to next theme
        themesDb.update(themeInProgress.quickThemeTracker.currentTheme, { used: new Date() })
        const themes = await themesDb.getAll()
        const themeOnDeck = themes[Math.floor(Math.random() * themes.length)]
        quickThemesTrackerDb.add(themeInProgress.quickTheme.id, themeInProgress.quickThemeTracker.nextTheme, themeOnDeck.id, themeInProgress.quickThemeTracker.currentTheme)
        return [{
          topic: 'broadcast',
          payload: {
            message: `${strings.themeWinnerIntro} @${themeResults.user.name} ${strings.themeWinnerMid} ${themeResults.score}`
          }
        }
        ]
      } else {
        await quickThemesDb.update(themeInProgress.quickTheme.id, { start: new Date() })
        return await broadcastCurrentThemeDetails(themeInProgress.quickThemeTracker.currentThemeName, themeInProgress.quickThemeTracker.nextThemeName, leader, caboose, 'themeBegun')
      }
    }
    if (dj === caboose) {
      const [string, leaderProfile] = await Promise.all([
        clients.strings.get('themeNext'),
        clients.users.get(leader)
      ])
      const message = `${string.value} ${themeInProgress.quickThemeTracker.nextThemeName} - get ready @${leaderProfile.name}`
      return [{
        topic: 'broadcast',
        payload: {
          message
        }
      }]
    }
  }
}
