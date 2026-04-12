import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'
import env from '#start/env'

const apiKey = env.get('LIVEKIT_API_KEY') ?? 'devkey'
const apiSecret = env.get('LIVEKIT_API_SECRET') ?? 'devsecret000000000000000000000000'
const livekitUrl = env.get('LIVEKIT_URL') ?? 'ws://localhost:7880'

// LIVEKIT_HOST — internal HTTP URL for server-to-server calls (e.g. http://livekit:7880 in Docker)
// Falls back to converting LIVEKIT_URL ws→http for local dev outside Docker
const livekitHost =
  env.get('LIVEKIT_HOST') ?? livekitUrl.replace(/^wss/, 'https').replace(/^ws/, 'http')

const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret)

export type ParticipantRole = 'trainer' | 'athlete'

export default class LiveKitService {
  /**
   * Generate a participant token for joining a room.
   */
  static async createToken(params: {
    roomName: string
    userId: number
    userName: string
    role: ParticipantRole
  }): Promise<string> {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: String(params.userId),
      name: params.userName,
      ttl: '4h',
    })

    at.addGrant({
      roomJoin: true,
      room: params.roomName,
      canPublish: true,
      canSubscribe: true,
      // Only trainer can publish data (e.g. chat in room)
      canPublishData: true,
    })

    return at.toJwt()
  }

  /**
   * Create a LiveKit room (idempotent — safe to call if room already exists).
   */
  static async createRoom(roomName: string): Promise<void> {
    await roomService.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 50 })
  }

  /**
   * Returns true if the LiveKit room currently exists (i.e. was not auto-expired or deleted).
   */
  static async roomExists(roomName: string): Promise<boolean> {
    try {
      const rooms = await roomService.listRooms([roomName])
      return rooms.length > 0
    } catch {
      return false
    }
  }

  /**
   * Delete a LiveKit room and disconnect all participants.
   */
  static async deleteRoom(roomName: string): Promise<void> {
    try {
      await roomService.deleteRoom(roomName)
    } catch {
      // Room may already be gone — ignore
    }
  }

  /**
   * Build a deterministic room name for a trainer↔athlete personal call.
   */
  static personalRoomName(trainerId: number, athleteId: number): string {
    return `personal_${trainerId}_${athleteId}`
  }

  /**
   * Build a deterministic room name for a trainer→group call.
   */
  static groupRoomName(trainerId: number, groupId: number): string {
    return `group_${trainerId}_${groupId}`
  }

  static get wsUrl(): string {
    return livekitUrl
  }
}
