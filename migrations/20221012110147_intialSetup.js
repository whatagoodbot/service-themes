
export const up = (knex) => {
  return knex.schema
    .createTable('themes', function (table) {
      table.increments('id').notNullable().primary()
      table.string('name', 255)
      table.timestamp('used')
      table.timestamps(true, true, true)
    })
    .createTable('quickThemes', function (table) {
      table.increments('id').primary()
      table.timestamp('start')
      table.timestamp('end')
      table.string('room', 255)
      table.string('leader', 255)
      table.integer('leaderPosition')
      table.string('caboose', 255)
      table.integer('caboosePosition')
      table.timestamps(true, true, true)
    })
    .createTable('quickThemesTracker', function (table) {
      table.increments('id').primary()
      table.integer('quickTheme')
      table.integer('currentTheme')
      table.integer('nextTheme')
      table.integer('lastTheme')
      table.timestamps(true, true, true)
    })
}

export const down = (knex) => {
  return knex.schema
    .dropTable('themes')
    .dropTable('quickThemes')
    .dropTable('quickThemeTracker')
}
