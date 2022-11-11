import { server, serverCreds, clientCreds, strings, users, themes, themeResults } from '@whatagoodbot/rpc'
import getCurrentTheme from '../controllers/getCurrentTheme.js'

const stringService = new strings.Strings(`${process.env.RPC_MISS_GROUPIE}:${process.env.RPC_MISS_GROUPIE_PORT || '50051'}`, clientCreds)
const userService = new users.Users(`${process.env.USERS_SERVICE}:50051`, clientCreds)
const themeResultsService = new themeResults.ThemeResults(`${process.env.RPC_STATS}:50051`, clientCreds)

export const startServer = () => {
  server.addService(themes.Themes.service, { getCurrentTheme })
  server.bindAsync('0.0.0.0:50051', serverCreds, () => {
    console.log('GRPC server running')
    server.start()
  })
}

export const getString = string => {
  return new Promise(resolve => {
    stringService.getString({ string }, (error, response) => {
      if (error) console.log(error)
      resolve(response)
    })
  })
}

export const getManyStrings = strings => {
  return new Promise(resolve => {
    stringService.getManyStrings({ strings }, (error, response) => {
      if (error) console.log(error)
      const strings = {}
      response.strings.forEach(string => {
        strings[string.name] = string.value
      })
      resolve(strings)
    })
  })
}

export const getUser = id => {
  return new Promise(resolve => {
    userService.getUser({ id }, (error, response) => {
      if (error) console.log(error)
      resolve(response)
    })
  })
}

export const getThemeResults = (room, quickTheme) => {
  return new Promise(resolve => {
    themeResultsService.getThemeWinner({ room, quickTheme }, (error, response) => {
      if (error) console.log(error)
      resolve(response)
    })
  })
}

export const getThemeLeaderboard = (room, quickThemeIds) => {
  return new Promise(resolve => {
    themeResultsService.getThemeLeaderboard({ room, quickThemeIds }, (error, response) => {
      if (error) console.log(error)
      resolve(response)
    })
  })
}

export const getCurrentThemeLeaderboard = (room, quickTheme) => {
  return new Promise(resolve => {
    themeResultsService.getCurrentThemeLeaderboard({ room, quickTheme }, (error, response) => {
      if (error) console.log(error)
      resolve(response)
    })
  })
}
