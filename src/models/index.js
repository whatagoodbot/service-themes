import { createRequire } from 'module'
import knexfile from '../../knexfile.js'

import themesModel from './themes.js'
import quickThemesModel from './quickThemes.js'
import quickThemesTrackerModel from './quickThemesTracker.js'

const require = createRequire(import.meta.url)
const { knex } = require('../libs/knex.cjs')(knexfile[process.env.NODE_ENV])

export const themesDb = themesModel(knex)
export const quickThemesDb = quickThemesModel(knex)
export const quickThemesTrackerDb = quickThemesTrackerModel(knex)
