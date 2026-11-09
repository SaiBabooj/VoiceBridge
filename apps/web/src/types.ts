export type LangCode = 'en' | 'hi' | 'ta'
export type Participant = 'traveller' | 'driver'
export type RiskLevel = 'low' | 'commitment'
export type VehicleType = 'sedan' | 'suv' | 'hatchback'

export interface LanguageMeta {
  code: LangCode
  nativeName: string
  englishName: string
  bcp47: string
}

export interface Driver {
  id: string
  name: string
  avatarVariant: number
  car: string
  vehicleType: VehicleType
  languages: LangCode[]
  primaryLanguage: LangCode
  rating: number
  trips: number
  priceMin: number
  priceMax: number
  waitingCharge: number
  verified: boolean
  available: boolean
  intro: Record<LangCode, string>
  is_sample: true
}

export interface DriverRequest {
  id: string
  travellerName: string
  travellerLanguage: LangCode
  pickup: Record<LangCode, string>
  stops: Record<LangCode, string>[]
  hours: number
  distanceKm: number
  groupSize: number
  offeredPrice: number
  is_sample: true
}

export interface StructuredTip {
  id: string
  travellerName: string
  amount: number
  note: string
  tags: string[]
  at: number
  is_sample: true
}

export type InterestKey =
  | 'temples'
  | 'beach'
  | 'food'
  | 'culture'
  | 'markets'
  | 'shopping'
  | 'heritage'
  | 'nature'
export type GroupKey = 'solo' | 'couple' | 'family' | 'friends'
export type DurationKey = 'half' | 'full' | 'evening'

export interface TripPrefs {
  interests: InterestKey[]
  group: GroupKey | null
  duration: DurationKey | null
}

export interface PlanItem {
  id: string
  time: string
  title: Record<LangCode, string>
  status: 'confirmed' | 'new' | 'needs-confirmation'
}

export interface Commitment {
  price: number
  hours: number
  waitingCharge: number
  inclusions: Array<'fuel' | 'driver' | 'parking'>
}

export interface Plan {
  id: string
  roomId: string
  version: number
  locked: boolean
  items: PlanItem[]
  commitment: Commitment
  confirmedBy: Participant[]
  needsConfirmation: boolean
  updatedAt: number
}

export interface Room {
  id: string
  driverId: string
  travellerName?: string
  travellerLang: LangCode
  driverLang: LangCode
  plan: Plan
  locked: boolean
  createdAt: number
}

export type ChatPhase = 'idle' | 'listening' | 'understanding' | 'translating' | 'speaking'

export interface ChatMessage {
  id: string
  speaker: Participant
  originalText: string
  originalLang: LangCode
  translationText: string
  translationLang: LangCode
  risk: RiskLevel
  commitment?: Commitment
  confirmed?: boolean
  at: number
}

export interface ConfirmCopy {
  question: Record<LangCode, string>
  backTranslation: Record<LangCode, string>
}

export interface PendingConfirm {
  confirmId: string
  utteranceId: string
  speaker: Participant
  question: string
  backTranslation: string
  copy?: ConfirmCopy
  commitment?: Commitment
  kind: 'price' | 'time' | 'place' | 'text'
  at: number
}

export type ServerEventType =
  | 'status'
  | 'utterance.partial'
  | 'utterance.final'
  | 'translation'
  | 'confirm.request'
  | 'confirm.response'
  | 'tts.chunk'
  | 'plan.update'
  | 'driver.pending'
  | 'error'

export type ClientEventType =
  | 'audio.start'
  | 'audio.chunk'
  | 'audio.end'
  | 'text.send'
  | 'confirm.response'
  | 'plan.lock'

export interface EventEnvelope<T extends string, P> {
  id: string
  type: T
  roomId: string
  ts: number
  payload: P
}

export type ServerEvent =
  | EventEnvelope<'status', { phase: ChatPhase; side: Participant }>
  | EventEnvelope<
      'utterance.partial',
      { utteranceId: string; speaker: Participant; lang: LangCode; text: string }
    >
  | EventEnvelope<
      'utterance.final',
      {
        utteranceId: string
        speaker: Participant
        lang: LangCode
        text: string
        risk: RiskLevel
      }
    >
  | EventEnvelope<
      'translation',
      {
        utteranceId: string
        speaker: Participant
        sourceLang: LangCode
        targetLang: LangCode
        original: string
        text: string
        risk: RiskLevel
        commitment?: Commitment
      }
    >
  | EventEnvelope<
      'confirm.request',
      {
        confirmId: string
        utteranceId: string
        speaker: Participant
        question: string
        backTranslation: string
        copy?: ConfirmCopy
        commitment?: Commitment
        kind: 'price' | 'time' | 'place' | 'text'
        at: number
      }
    >
  | EventEnvelope<'confirm.response', { confirmId: string; confirmed: boolean; by: Participant }>
  | EventEnvelope<
      'tts.chunk',
      { utteranceId: string; speaker: Participant; lang: LangCode; text: string }
    >
  | EventEnvelope<'plan.update', { plan: Plan }>
  | EventEnvelope<'driver.pending', { active: boolean }>
  | EventEnvelope<'error', { code: string; message: string }>

export type ClientEvent =
  | EventEnvelope<'audio.start', { lang: LangCode; as?: Participant }>
  | EventEnvelope<'audio.chunk', { byteLength: number; as?: Participant }>
  | EventEnvelope<'audio.end', { lang: LangCode; durationMs: number; as?: Participant }>
  | EventEnvelope<'text.send', { lang: LangCode; text: string; as?: Participant }>
  | EventEnvelope<'confirm.response', { confirmId: string; confirmed: boolean; as?: Participant }>
  | EventEnvelope<'plan.lock', Record<string, never>>

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'

export interface RoomEventListener {
  (event: ServerEvent, meta: { replay: boolean }): void
}

export type RatingTag = 'safe' | 'friendly' | 'onTime' | 'clean' | 'knowledge'
