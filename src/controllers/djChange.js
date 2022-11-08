import { djChange } from '../libs/quickthemes.js'

export default async (payload) => {
  return await djChange(payload.room.id, payload.djs)
}
