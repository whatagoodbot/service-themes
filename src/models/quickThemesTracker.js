const tableName = 'quickThemesTracker'

export default (knex) => {
  return {
    add: async (quickTheme, currentTheme, nextTheme, lastTheme) => {
      return await knex(tableName)
        .insert({
          quickTheme,
          currentTheme,
          nextTheme,
          lastTheme
        })
    },
    getAll: async (quickTheme) => {
      return await knex.select('quickThemesTracker.id', 'quickTheme', 'currentTheme', 'lastTheme', 'nextTheme', 'cTheme.name AS currentThemeName', 'nTheme.name AS nextThemeName').from(tableName)
        .join('themes AS cTheme', { 'quickThemesTracker.currentTheme': 'cTheme.id' })
        .join('themes AS nTheme', { 'quickThemesTracker.nextTheme': 'nTheme.id' })
        .where({ quickTheme })
    },
    get: async (quickTheme) => {
      return await knex.select('quickThemesTracker.id', 'quickTheme', 'currentTheme', 'lastTheme', 'nextTheme', 'cTheme.name AS currentThemeName', 'nTheme.name AS nextThemeName').from(tableName)
        .join('themes AS cTheme', { 'quickThemesTracker.currentTheme': 'cTheme.id' })
        .join('themes AS nTheme', { 'quickThemesTracker.nextTheme': 'nTheme.id' })
        .where({ quickTheme })
        .orderBy('id', 'desc')
        .first()
    },
    getPrevious: async (quickTheme) => {
      const results = await knex.select('quickThemesTracker.id', 'quickTheme', 'currentTheme', 'lastTheme', 'nextTheme', 'cTheme.name AS currentThemeName', 'nTheme.name AS nextThemeName').from(tableName)
        .join('themes AS cTheme', { 'quickThemesTracker.currentTheme': 'cTheme.id' })
        .join('themes AS nTheme', { 'quickThemesTracker.nextTheme': 'nTheme.id' })
        .where({ quickTheme })
        .orderBy('id', 'desc')
      return results[1]
    }
  }
}
