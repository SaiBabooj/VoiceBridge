import type { Driver, LangCode, Plan, Room } from '../types'
import { mockApi, mockGateway } from './mockGateway'
import type { DriverFilters } from './mockData'
import { newId } from './utils'

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')
).replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL.replace(/\/$/, '')}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!response.ok) {
    let code = `HTTP_${response.status}`
    try {
      const body = (await response.json()) as { code?: string; detail?: string }
      code = body.code ?? body.detail ?? code
    } catch {
      /* keep the status code */
    }
    throw new Error(code)
  }
  return (await response.json()) as T
}

export const api = {
  async listDrivers(filters: DriverFilters = {}): Promise<Driver[]> {
    if (USE_MOCKS) return mockApi.listDrivers(filters)
    const params = new URLSearchParams()
    if (filters.language && filters.language !== 'all') params.set('language', filters.language)
    if (filters.vehicle && filters.vehicle !== 'all') params.set('vehicle', filters.vehicle)
    if (filters.sort) params.set('sort', filters.sort)
    const query = params.toString()
    return request<Driver[]>(`/drivers${query ? `?${query}` : ''}`)
  },

  async getDriver(id: string): Promise<Driver> {
    if (USE_MOCKS) return mockApi.getDriver(id)
    return request<Driver>(`/drivers/${encodeURIComponent(id)}`)
  },

  async createRoom(driverId: string, travellerLang: LangCode): Promise<Room> {
    if (USE_MOCKS) return mockApi.createRoom(driverId, travellerLang)
    return request<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify({ driverId, travellerLang }),
    })
  },

  async acceptRequest(driverId: string, travellerLang: LangCode): Promise<Room> {
    if (USE_MOCKS) return mockApi.acceptRequest(driverId, travellerLang)
    return request<Room>('/driver/requests/accept', {
      method: 'POST',
      body: JSON.stringify({ driverId, travellerLang }),
    })
  },

  async getRoom(roomId: string): Promise<Room> {
    if (USE_MOCKS) return mockApi.getRoom(roomId)
    return request<Room>(`/rooms/${encodeURIComponent(roomId)}`)
  },

  async getPlan(roomId: string): Promise<Plan> {
    if (USE_MOCKS) return mockApi.getPlan(roomId)
    return request<Plan>(`/rooms/${encodeURIComponent(roomId)}/plan`)
  },

  async lockPlan(roomId: string): Promise<Plan> {
    if (USE_MOCKS) {
      mockGateway.send(roomId, {
        id: newId('evt'),
        type: 'plan.lock',
        roomId,
        ts: Date.now(),
        payload: {},
      })
      return mockApi.getPlan(roomId)
    }
    return request<Plan>(`/rooms/${encodeURIComponent(roomId)}/plan/lock`, { method: 'POST' })
  },

  async submitRating(input: {
    roomId: string
    stars: number
    tags: string[]
    comment: string
  }): Promise<{ ok: true }> {
    if (USE_MOCKS) return mockApi.submitRating(input)
    return request<{ ok: true }>(`/rooms/${encodeURIComponent(input.roomId)}/rating`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}
