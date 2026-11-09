import type {
  ClientEvent,
  ConnectionStatus,
  LangCode,
  Participant,
  RoomEventListener,
  ServerEvent,
} from '../types'
import { mockGateway } from './mockGateway'

export interface ChatTransport {
  connect: () => void
  disconnect: () => void
  send: (event: ClientEvent) => void
  onEvent: (listener: RoomEventListener) => () => void
  onStatus: (listener: (status: ConnectionStatus) => void) => () => void
}

type StatusListener = (status: ConnectionStatus) => void

class MockTransport implements ChatTransport {
  private roomId: string
  private eventListeners = new Set<RoomEventListener>()
  private statusListeners = new Set<StatusListener>()
  private unsubscribeGateway: (() => void) | null = null
  private status: ConnectionStatus = 'connecting'
  private disposed = false
  private onlineHandler = () => this.handleOnline()
  private offlineHandler = () => this.handleOffline()
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(roomId: string) {
    this.roomId = roomId
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status === status) return
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }

  private handleOffline() {
    this.setStatus('offline')
  }

  private handleOnline() {
    this.setStatus('reconnecting')
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      if (this.disposed) return
      this.setStatus('connected')
    }, 900)
  }

  connect() {
    window.addEventListener('online', this.onlineHandler)
    window.addEventListener('offline', this.offlineHandler)
    if (!navigator.onLine) {
      this.setStatus('offline')
      return
    }
    try {
      this.unsubscribeGateway = mockGateway.subscribe(this.roomId, (event, meta) => {
        for (const listener of this.eventListeners) listener(event, meta)
      })
    } catch {
      this.setStatus('offline')
      return
    }
    this.timer = setTimeout(() => {
      if (!this.disposed) this.setStatus('connected')
    }, 350)
  }

  disconnect() {
    this.disposed = true
    if (this.timer) clearTimeout(this.timer)
    window.removeEventListener('online', this.onlineHandler)
    window.removeEventListener('offline', this.offlineHandler)
    this.unsubscribeGateway?.()
  }

  send(event: ClientEvent) {
    if (!navigator.onLine) {
      this.setStatus('offline')
      return
    }
    mockGateway.send(this.roomId, event)
  }

  onEvent(listener: RoomEventListener) {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }
}

class WebSocketTransport implements ChatTransport {
  private roomId: string
  private language: LangCode
  private role: Participant
  private socket: WebSocket | null = null
  private eventListeners = new Set<RoomEventListener>()
  private statusListeners = new Set<StatusListener>()
  private status: ConnectionStatus = 'connecting'
  private attempt = 0
  private disposed = false
  private retryTimer: ReturnType<typeof setTimeout> | null = null

  constructor(roomId: string, language: LangCode, role: Participant) {
    this.roomId = roomId
    this.language = language
    this.role = role
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status === status) return
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }

  connect() {
    if (this.disposed) return
    const base = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8000'
    const url = `${base.replace(/\/$/, '')}/ws/${this.roomId}?role=${this.role}&lang=${this.language}`
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')
    try {
      this.socket = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.socket.onopen = () => {
      this.attempt = 0
      this.setStatus('connected')
    }
    this.socket.onmessage = (message) => {
      try {
        const event = JSON.parse(String(message.data)) as ServerEvent
        for (const listener of this.eventListeners) listener(event, { replay: false })
      } catch {
        /* ignore malformed frames in the demo */
      }
    }
    this.socket.onclose = () => {
      if (this.disposed) return
      this.scheduleReconnect()
    }
    this.socket.onerror = () => {
      this.socket?.close()
    }
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.attempt, 10_000)
    this.attempt += 1
    this.setStatus('reconnecting')
    this.retryTimer = setTimeout(() => this.connect(), delay)
  }

  disconnect() {
    this.disposed = true
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.socket?.close()
  }

  send(event: ClientEvent) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event))
    }
  }

  onEvent(listener: RoomEventListener) {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }
}

export function createTransport(
  roomId: string,
  language: LangCode,
  role: Participant = 'traveller',
): ChatTransport {
  const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'
  return useMocks ? new MockTransport(roomId) : new WebSocketTransport(roomId, language, role)
}
