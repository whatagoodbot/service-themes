import { progressUpdate } from '../libs/quickthemes.js'

export default async (payload) => {
  return await progressUpdate(payload.room.id, payload.user.id)
}
