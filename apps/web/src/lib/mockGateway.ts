import type {
  ClientEvent,
  Commitment,
  ConfirmCopy,
  LangCode,
  Participant,
  Plan,
  PlanItem,
  Room,
  RoomEventListener,
  ServerEvent,
} from '../types'
import {
  CONFIRM_COPY,
  DRIVER_REPLIES,
  INCOMING_REQUEST,
  PLAN_COPY,
  SAMPLE_DRIVERS,
  TRAVELLER_REPLIES,
  TRAVELLER_SCRIPT,
  findDriver,
  quoteForDriver,
  type DriverFilters,
  type DriverReply,
  type ScriptLine,
} from './mockData'
import { newId, sleep } from './utils'

type Localized = Record<LangCode, string>

interface MockRoom {
  meta: Room
  log: ServerEvent[]
  listeners: Set<RoomEventListener>
  busy: boolean
  travellerTurn: number
  driverTurn: number
  pending: {
    confirmId: string
    utteranceId: string
    kind: 'price' | 'time' | 'place' | 'text'
    speaker: Participant
  } | null
}

const rooms = new Map<string, MockRoom>()
const ratings: Array<Record<string, unknown>> = []

function localeFor(room: MockRoom): LangCode {
  return room.meta.travellerLang
}

function seedPlan(roomId: string, driver: ReturnType<typeof findDriver>): Plan {
  const commitment: Commitment = {
    price: driver ? quoteForDriver(driver) : 3200,
    hours: 8,
    waitingCharge: driver?.waitingCharge ?? 200,
    inclusions: ['fuel', 'driver', 'parking'],
  }
  return {
    id: newId('plan'),
    roomId,
    version: 1,
    locked: false,
    items: [
      { id: 'pickup', time: '08:00', title: PLAN_COPY.pickup, status: 'confirmed' },
      { id: 'temple', time: '08:30', title: PLAN_COPY.temple, status: 'confirmed' },
      { id: 'beach', time: '11:00', title: PLAN_COPY.beach, status: 'confirmed' },
      { id: 'lunch', time: '13:00', title: PLAN_COPY.lunch, status: 'confirmed' },
    ],
    commitment,
    confirmedBy: [],
    needsConfirmation: true,
    updatedAt: Date.now(),
  }
}

function makeRoom(driverId: string, travellerLang: LangCode): MockRoom {
  const driver = findDriver(driverId)
  if (!driver) throw new Error('DRIVER_NOT_FOUND')
  const driverLang = driver.languages.find((language) => language !== travellerLang) ?? 'ta'
  const id = newId('room')
  const meta: Room = {
    id,
    driverId,
    travellerName: INCOMING_REQUEST.travellerName,
    travellerLang,
    driverLang,
    plan: seedPlan(id, driver),
    locked: false,
    createdAt: Date.now(),
  }
  return {
    meta,
    log: [],
    listeners: new Set(),
    busy: false,
    travellerTurn: 0,
    driverTurn: 0,
    pending: null,
  }
}

function emit<T extends string, P>(room: MockRoom, type: T, payload: P): void {
  const event = {
    id: newId('evt'),
    type,
    roomId: room.meta.id,
    ts: Date.now(),
    payload,
  } as unknown as ServerEvent
  room.log.push(event)
  for (const listener of room.listeners) listener(event, { replay: false })
}

function schedule(room: MockRoom, ms: number, fn: () => void): void {
  setTimeout(() => {
    if (rooms.has(room.meta.id)) fn()
  }, ms)
}

function clonePlan(room: MockRoom): Plan {
  return structuredClone(room.meta.plan)
}

function emitPlan(room: MockRoom): void {
  room.meta.plan.updatedAt = Date.now()
  emit(room, 'plan.update', { plan: clonePlan(room) })
}

function addConfirmer(room: MockRoom, by: Participant): void {
  const plan = room.meta.plan
  if (!plan.confirmedBy.includes(by)) plan.confirmedBy = [...plan.confirmedBy, by]
}

function confirmRequest(
  room: MockRoom,
  kind: 'price' | 'time' | 'place' | 'text',
  speaker: Participant,
  utteranceId: string,
  copy: ConfirmCopy,
  commitment?: Commitment,
): void {
  const confirmId = newId('cfm')
  const locale = localeFor(room)
  room.pending = { confirmId, utteranceId, kind, speaker }
  emit(room, 'confirm.request', {
    confirmId,
    utteranceId,
    speaker,
    question: copy.question[locale],
    backTranslation: copy.backTranslation[locale],
    copy,
    commitment,
    kind,
    at: Date.now(),
  })
}

function confirmationCopy(
  kind: 'price' | 'time' | 'place' | 'text',
  text: string,
  commitment: Commitment,
): ConfirmCopy {
  if (kind === 'price') {
    return {
      question: CONFIRM_COPY.price.question,
      backTranslation: CONFIRM_COPY.price.backTranslation(commitment),
    }
  }
  if (kind === 'time') return CONFIRM_COPY.time
  if (kind === 'place') return CONFIRM_COPY.place
  return {
    backTranslation: { en: text, hi: text, ta: text },
    question: {
      en: 'Did you mean this?',
      hi: 'क्या आपका मतलब यही था?',
      ta: 'இதைத்தானே சொன்னீர்கள்?',
    },
  }
}

function translationFor(original: Localized, target: LangCode): string {
  return original[target]
}

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/[',.!?]/g, '')
}

function detectRisk(text: string): { risk: 'low' | 'commitment'; kind: 'price' | 'time' | 'text' } {
  const money = /(₹|rs\.?|rupee|रुपये|ரூபாய்)/i.test(text)
  const time = /(\d{1,2}:\d{2}|\b\d{1,2}\s?(am|pm)\b|o'clock|बजे|மணிக்கு)/i.test(text)
  if (money) return { risk: 'commitment', kind: 'price' }
  if (time) return { risk: 'commitment', kind: 'time' }
  if (/\b(hour|hours|घंटे|மணி)\b/.test(text)) return { risk: 'commitment', kind: 'text' }
  return { risk: 'low', kind: 'text' }
}

function isKnownLine(text: string): number {
  return TRAVELLER_SCRIPT.findIndex((line) =>
    Object.values(line.original).some((value) => normalise(value) === normalise(text)),
  )
}

function counterpart(side: Participant): Participant {
  return side === 'traveller' ? 'driver' : 'traveller'
}

function driverReplyText(
  reply: DriverReply,
  lang: LangCode,
  commitment: Commitment,
): string {
  return typeof reply.text === 'function' ? reply.text(commitment)[lang] : reply.text[lang]
}

function processTravellerLine(
  room: MockRoom,
  line: ScriptLine,
  index: number,
  typedText?: string,
  autoReply = true,
): void {
  const locale = room.meta.travellerLang
  const driverLang = room.meta.driverLang
  const originalText = typedText ?? line.original[locale]
  const translatedText = typedText
    ? isKnownLine(typedText) >= 0
      ? translationFor(TRAVELLER_SCRIPT[isKnownLine(typedText)].original, driverLang)
      : typedText
    : translationFor(line.original, driverLang)
  const utteranceId = newId('utt')
  const risk = typedText ? detectRisk(typedText).risk : line.risk
  const commitment = line.risk === 'commitment' && !typedText ? room.meta.plan.commitment : undefined

  room.busy = true
  emit(room, 'status', { phase: 'understanding', side: 'traveller' })
  schedule(room, 420, () => {
    emit(room, 'utterance.partial', {
      utteranceId,
      speaker: 'traveller',
      lang: locale,
      text: originalText.slice(0, Math.max(12, Math.floor(originalText.length * 0.55))),
    })
  })
  schedule(room, 820, () => {
    emit(room, 'utterance.final', {
      utteranceId,
      speaker: 'traveller',
      lang: locale,
      text: originalText,
      risk,
    })
    emit(room, 'status', { phase: 'translating', side: 'traveller' })
  })
  schedule(room, 1420, () => {
    emit(room, 'translation', {
      utteranceId,
      speaker: 'traveller',
      sourceLang: locale,
      targetLang: driverLang,
      original: originalText,
      text: translatedText,
      risk,
      commitment,
    })
  })
  schedule(room, 1500, () => {
    emit(room, 'tts.chunk', {
      utteranceId,
      speaker: 'traveller',
      lang: driverLang,
      text: translatedText,
    })
    emit(room, 'status', { phase: 'speaking', side: 'traveller' })
  })
  schedule(room, 2450, () => {
    emit(room, 'status', { phase: 'idle', side: 'traveller' })
    room.busy = false
  })

  if (risk === 'commitment') {
    const kind = typedText ? 'text' : (line.confirmKind ?? 'text')
    schedule(room, 1550, () => {
      confirmRequest(
        room,
        kind,
        'traveller',
        utteranceId,
        confirmationCopy(kind, originalText, room.meta.plan.commitment),
        commitment,
      )
    })
    return
  }

  if (autoReply) schedule(room, 2800, () => driverReply(room, index))
}

function processDriverTurn(
  room: MockRoom,
  reply: DriverReply,
  index: number,
  typedText?: string,
): void {
  const driverLang = room.meta.driverLang
  const locale = room.meta.travellerLang
  const commitment = room.meta.plan.commitment
  const originalText = typedText ?? driverReplyText(reply, driverLang, commitment)
  const translatedText = typedText ?? driverReplyText(reply, locale, commitment)
  const utteranceId = newId('dut')
  const risk = typedText ? detectRisk(typedText).risk : reply.risk
  const commitmentPayload = risk === 'commitment' && !typedText ? commitment : undefined

  room.busy = true
  emit(room, 'status', { phase: 'understanding', side: 'driver' })
  schedule(room, 420, () => {
    emit(room, 'utterance.partial', {
      utteranceId,
      speaker: 'driver',
      lang: driverLang,
      text: originalText.slice(0, Math.max(12, Math.floor(originalText.length * 0.55))),
    })
  })
  schedule(room, 820, () => {
    emit(room, 'utterance.final', {
      utteranceId,
      speaker: 'driver',
      lang: driverLang,
      text: originalText,
      risk,
    })
    emit(room, 'status', { phase: 'translating', side: 'driver' })
  })
  schedule(room, 1420, () => {
    emit(room, 'translation', {
      utteranceId,
      speaker: 'driver',
      sourceLang: driverLang,
      targetLang: locale,
      original: originalText,
      text: translatedText,
      risk,
      commitment: commitmentPayload,
    })
  })
  schedule(room, 1500, () => {
    emit(room, 'tts.chunk', {
      utteranceId,
      speaker: 'driver',
      lang: locale,
      text: translatedText,
    })
    emit(room, 'status', { phase: 'speaking', side: 'driver' })
  })
  schedule(room, 2450, () => {
    emit(room, 'status', { phase: 'idle', side: 'driver' })
    room.busy = false
  })

  if (risk === 'commitment') {
    const kind = typedText ? 'text' : (reply.confirmKind ?? 'text')
    schedule(room, 1550, () => {
      addConfirmer(room, 'driver')
      room.meta.plan.needsConfirmation = true
      room.meta.plan.version += 1
      emitPlan(room)
      confirmRequest(
        room,
        kind,
        'driver',
        utteranceId,
        confirmationCopy(kind, originalText, commitment),
        commitmentPayload,
      )
      schedule(room, 2300, () => acceptDriverQuote(room))
    })
    return
  }

  schedule(room, 2800, () => {
    const replyIndex = room.travellerTurn
    room.travellerTurn += 1
    travellerReply(room, replyIndex)
  })
}

function driverReply(room: MockRoom, index: number): void {
  if (room.pending) return
  const reply = DRIVER_REPLIES[Math.min(index, DRIVER_REPLIES.length - 1)]
  const driverLang = room.meta.driverLang
  const locale = localeFor(room)
  const utteranceId = newId('dut')
  const commitment = room.meta.plan.commitment
  const originalText = driverReplyText(reply, driverLang, commitment)
  const translatedText = driverReplyText(reply, locale, commitment)

  emit(room, 'driver.pending', { active: true })
  schedule(room, 350, () => {
    emit(room, 'utterance.partial', {
      utteranceId,
      speaker: 'driver',
      lang: driverLang,
      text: originalText.slice(0, Math.max(10, Math.floor(originalText.length * 0.5))),
    })
  })
  schedule(room, 780, () => {
    emit(room, 'utterance.final', {
      utteranceId,
      speaker: 'driver',
      lang: driverLang,
      text: originalText,
      risk: reply.risk,
    })
  })
  schedule(room, 1080, () => {
    emit(room, 'translation', {
      utteranceId,
      speaker: 'driver',
      sourceLang: driverLang,
      targetLang: locale,
      original: originalText,
      text: translatedText,
      risk: reply.risk,
      commitment: reply.risk === 'commitment' ? commitment : undefined,
    })
  })
  schedule(room, 1220, () => {
    emit(room, 'tts.chunk', {
      utteranceId,
      speaker: 'driver',
      lang: locale,
      text: translatedText,
    })
  })
  schedule(room, 1650, () => {
    emit(room, 'driver.pending', { active: false })
  })

  if (reply.confirmKind === 'price') {
    schedule(room, 1180, () => {
      addConfirmer(room, 'driver')
      room.meta.plan.needsConfirmation = true
      room.meta.plan.version += 1
      emitPlan(room)
      confirmRequest(
        room,
        'price',
        'driver',
        utteranceId,
        confirmationCopy('price', originalText, commitment),
        commitment,
      )
    })
    return
  }

  if (index === 2) {
    schedule(room, 1180, () => {
      const plan = room.meta.plan
      const coffee: PlanItem = {
        id: 'coffee',
        time: '16:00',
        title: PLAN_COPY.coffee,
        status: 'needs-confirmation',
      }
      if (!plan.items.some((item) => item.id === 'coffee')) plan.items.push(coffee)
      addConfirmer(room, 'driver')
      plan.needsConfirmation = true
      plan.version += 1
      emitPlan(room)
      confirmRequest(
        room,
        'place',
        'driver',
        utteranceId,
        confirmationCopy('place', originalText, commitment),
      )
    })
  }
}

function travellerReply(room: MockRoom, index: number): void {
  const text = TRAVELLER_REPLIES[index % TRAVELLER_REPLIES.length]
  const locale = room.meta.travellerLang
  const driverLang = room.meta.driverLang
  const utteranceId = newId('utt')
  const originalText = text[locale]
  const translatedText = text[driverLang]

  schedule(room, 350, () => {
    emit(room, 'utterance.partial', {
      utteranceId,
      speaker: 'traveller',
      lang: locale,
      text: originalText.slice(0, Math.max(10, Math.floor(originalText.length * 0.5))),
    })
  })
  schedule(room, 780, () => {
    emit(room, 'utterance.final', {
      utteranceId,
      speaker: 'traveller',
      lang: locale,
      text: originalText,
      risk: 'low',
    })
  })
  schedule(room, 1080, () => {
    emit(room, 'translation', {
      utteranceId,
      speaker: 'traveller',
      sourceLang: locale,
      targetLang: driverLang,
      original: originalText,
      text: translatedText,
      risk: 'low',
    })
  })
  schedule(room, 1220, () => {
    emit(room, 'tts.chunk', {
      utteranceId,
      speaker: 'traveller',
      lang: driverLang,
      text: translatedText,
    })
  })
}

function quickMessage(room: MockRoom, from: Participant, text: Localized): void {
  const travellerLang = room.meta.travellerLang
  const driverLang = room.meta.driverLang
  const sourceLang = from === 'traveller' ? travellerLang : driverLang
  const targetLang = from === 'traveller' ? driverLang : travellerLang
  const utteranceId = newId(from === 'traveller' ? 'utt' : 'dut')
  const originalText = text[sourceLang]
  const translatedText = text[targetLang]

  if (from === 'driver') emit(room, 'driver.pending', { active: true })
  schedule(room, 300, () => {
    emit(room, 'utterance.final', {
      utteranceId,
      speaker: from,
      lang: sourceLang,
      text: originalText,
      risk: 'low',
    })
  })
  schedule(room, 650, () => {
    emit(room, 'translation', {
      utteranceId,
      speaker: from,
      sourceLang,
      targetLang,
      original: originalText,
      text: translatedText,
      risk: 'low',
    })
  })
  schedule(room, 800, () => {
    emit(room, 'tts.chunk', {
      utteranceId,
      speaker: from,
      lang: targetLang,
      text: translatedText,
    })
  })
  if (from === 'driver') {
    schedule(room, 1300, () => {
      emit(room, 'driver.pending', { active: false })
    })
  }
}

function acceptDriverQuote(room: MockRoom): void {
  const pending = room.pending
  if (!pending) return
  room.pending = null
  emit(room, 'confirm.response', {
    confirmId: pending.confirmId,
    confirmed: true,
    by: 'traveller',
  })
  const plan = room.meta.plan
  addConfirmer(room, 'traveller')
  plan.needsConfirmation = plan.confirmedBy.length < 2
  if (!plan.needsConfirmation) {
    plan.items = plan.items.map((item) => ({ ...item, status: 'confirmed' as const }))
  }
  plan.version += 1
  emitPlan(room)
  schedule(room, 500, () => quickMessage(room, 'traveller', CONFIRM_COPY.travellerThanks))
}

function autoConfirmSide(room: MockRoom, side: Participant, pending: NonNullable<MockRoom['pending']>): void {
  addConfirmer(room, side)
  const plan = room.meta.plan
  plan.needsConfirmation = plan.confirmedBy.length < 2
  if (!plan.needsConfirmation) {
    plan.items = plan.items.map((item) => ({ ...item, status: 'confirmed' as const }))
  }
  plan.version += 1
  emitPlan(room)
  emit(room, 'confirm.response', {
    confirmId: pending.confirmId,
    confirmed: true,
    by: side,
  })
  if (!plan.needsConfirmation) {
    schedule(room, 400, () =>
      quickMessage(
        room,
        side,
        side === 'driver' ? CONFIRM_COPY.driverConfirmed : CONFIRM_COPY.travellerThanks,
      ),
    )
  }
}

function resolveConfirm(room: MockRoom, confirmed: boolean, by: Participant): void {
  const pending = room.pending
  if (!pending) {
    emit(room, 'error', { code: 'NO_PENDING_CONFIRM', message: 'There is nothing to confirm.' })
    return
  }
  room.pending = null
  emit(room, 'confirm.response', {
    confirmId: pending.confirmId,
    confirmed,
    by,
  })

  const plan = room.meta.plan

  if (!confirmed) {
    if (pending.kind === 'place') {
      plan.items = plan.items.filter((item) => item.id !== 'coffee')
    }
    plan.needsConfirmation = plan.confirmedBy.length < 2
    plan.version += 1
    emitPlan(room)
    const followUp =
      pending.kind === 'price'
        ? CONFIRM_COPY.followUp.price
        : pending.kind === 'time'
          ? CONFIRM_COPY.followUp.time
          : pending.kind === 'place'
            ? CONFIRM_COPY.followUp.place
            : CONFIRM_COPY.followUp.text
    schedule(room, 500, () => quickMessage(room, counterpart(pending.speaker), followUp))
    return
  }

  addConfirmer(room, by)

  if (pending.kind === 'time' && pending.speaker === 'traveller' && !plan.items.some((item) => item.id === 'dinner')) {
    plan.items.push({
      id: 'dinner',
      time: '17:00',
      title: PLAN_COPY.dinner,
      status: 'new',
    })
  }

  if (pending.kind === 'place') {
    const coffee = plan.items.find((item) => item.id === 'coffee')
    if (coffee) coffee.status = 'confirmed'
  }

  plan.needsConfirmation = plan.confirmedBy.length < 2
  if (!plan.needsConfirmation) {
    plan.items = plan.items.map((item) => ({ ...item, status: 'confirmed' as const }))
  }
  plan.version += 1
  emitPlan(room)

  if (plan.needsConfirmation) {
    const other = counterpart(by)
    schedule(room, 900, () => autoConfirmSide(room, other, pending))
  } else {
    schedule(room, 500, () =>
      quickMessage(
        room,
        counterpart(by),
        counterpart(by) === 'driver' ? CONFIRM_COPY.driverConfirmed : CONFIRM_COPY.travellerThanks,
      ),
    )
  }
}

function handleClientEvent(room: MockRoom, event: ClientEvent): void {
  switch (event.type) {
    case 'audio.start': {
      const side = event.payload.as ?? 'traveller'
      emit(room, 'status', { phase: 'listening', side })
      return
    }
    case 'audio.chunk':
      return
    case 'audio.end': {
      if (room.busy || room.pending) return
      const side = event.payload.as ?? 'traveller'
      if (side === 'driver') {
        const index = room.driverTurn
        room.driverTurn += 1
        processDriverTurn(room, DRIVER_REPLIES[index % DRIVER_REPLIES.length], index)
      } else {
        const index = room.travellerTurn
        room.travellerTurn += 1
        processTravellerLine(room, TRAVELLER_SCRIPT[index % TRAVELLER_SCRIPT.length], index)
      }
      return
    }
    case 'text.send': {
      if (room.busy || room.pending) {
        emit(room, 'error', { code: 'BUSY', message: 'Please wait for the current turn.' })
        return
      }
      const text = event.payload.text
      const side = event.payload.as ?? 'traveller'
      if (side === 'driver') {
        const index = room.driverTurn
        room.driverTurn += 1
        processDriverTurn(
          room,
          { text: { en: text, hi: text, ta: text }, risk: detectRisk(text).risk },
          index,
          text,
        )
        return
      }
      const known = isKnownLine(text)
      if (known >= 0) {
        const line = TRAVELLER_SCRIPT[known]
        room.travellerTurn += 1
        processTravellerLine(room, line, known, text)
      } else {
        const { risk } = detectRisk(text)
        const index = room.travellerTurn
        room.travellerTurn += 1
        processTravellerLine(
          room,
          { original: { en: text, hi: text, ta: text }, risk },
          index,
          text,
        )
      }
      return
    }
    case 'confirm.response':
      resolveConfirm(room, event.payload.confirmed, event.payload.as ?? 'traveller')
      return
    case 'plan.lock': {
      const plan = room.meta.plan
      if (plan.needsConfirmation || plan.confirmedBy.length < 2) {
        emit(room, 'error', {
          code: 'PLAN_NOT_CONFIRMED',
          message: 'Both people must confirm before locking.',
        })
        return
      }
      plan.locked = true
      room.meta.locked = true
      plan.version += 1
      emitPlan(room)
      return
    }
    default:
      return
  }
}

function createRoom(driverId: string, travellerLang: LangCode): Room {
  const room = makeRoom(driverId, travellerLang)
  rooms.set(room.meta.id, room)
  return structuredClone(room.meta)
}

function acceptRequest(driverId: string, travellerLang: LangCode): Room {
  const room = makeRoom(driverId, travellerLang)
  rooms.set(room.meta.id, room)
  schedule(room, 700, () => {
    if (room.busy || room.pending) return
    const index = room.travellerTurn
    room.travellerTurn += 1
    processTravellerLine(
      room,
      TRAVELLER_SCRIPT[index % TRAVELLER_SCRIPT.length],
      index,
      undefined,
      false,
    )
  })
  return structuredClone(room.meta)
}

function getRoom(roomId: string): Room {
  const room = rooms.get(roomId)
  if (!room) throw new Error('ROOM_NOT_FOUND')
  return structuredClone(room.meta)
}

function getPlan(roomId: string): Plan {
  const room = rooms.get(roomId)
  if (!room) throw new Error('ROOM_NOT_FOUND')
  return clonePlan(room)
}

function subscribe(roomId: string, listener: RoomEventListener): () => void {
  const room = rooms.get(roomId)
  if (!room) throw new Error('ROOM_NOT_FOUND')
  room.listeners.add(listener)
  const replay = [...room.log]
  queueMicrotask(() => {
    for (const event of replay) {
      if (!room.listeners.has(listener)) return
      listener(event, { replay: true })
    }
  })
  return () => room.listeners.delete(listener)
}

function send(roomId: string, event: ClientEvent): void {
  const room = rooms.get(roomId)
  if (!room) return
  handleClientEvent(room, event)
}

function listDrivers(filters: DriverFilters = {}) {
  const language = filters.language ?? 'all'
  const vehicle = filters.vehicle ?? 'all'
  let drivers = SAMPLE_DRIVERS.filter((driver) => {
    if (language !== 'all' && !driver.languages.includes(language)) return false
    if (vehicle !== 'all' && driver.vehicleType !== vehicle) return false
    return true
  })
  drivers = [...drivers]
  if (filters.sort === 'price') drivers.sort((a, b) => a.priceMin - b.priceMin)
  else if (filters.sort === 'rating') drivers.sort((a, b) => b.rating - a.rating)
  else {
    drivers.sort(
      (a, b) => Number(b.verified) - Number(a.verified) || b.rating - a.rating || b.trips - a.trips,
    )
  }
  return structuredClone(drivers)
}

async function mockDelay(ms: number) {
  await sleep(ms)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('OFFLINE')
  }
}

export const mockApi = {
  async listDrivers(filters: DriverFilters = {}) {
    await mockDelay(550)
    return listDrivers(filters)
  },
  async getDriver(id: string) {
    await mockDelay(350)
    const driver = findDriver(id)
    if (!driver) throw new Error('DRIVER_NOT_FOUND')
    return structuredClone(driver)
  },
  async createRoom(driverId: string, travellerLang: LangCode) {
    await mockDelay(650)
    return createRoom(driverId, travellerLang)
  },
  async acceptRequest(driverId: string, travellerLang: LangCode) {
    await mockDelay(450)
    return acceptRequest(driverId, travellerLang)
  },
  async getRoom(roomId: string) {
    await mockDelay(250)
    return getRoom(roomId)
  },
  async getPlan(roomId: string) {
    await mockDelay(200)
    return getPlan(roomId)
  },
  async submitRating(input: {
    roomId: string
    stars: number
    tags: string[]
    comment: string
  }) {
    await mockDelay(500)
    ratings.push({ ...input, at: Date.now() })
    return { ok: true as const }
  },
}

export const mockGateway = {
  createRoom,
  acceptRequest,
  getRoom,
  getPlan,
  subscribe,
  send,
}
