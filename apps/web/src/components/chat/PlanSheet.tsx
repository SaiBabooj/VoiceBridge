import { Check, Lock, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatINR } from '../../lib/utils'
import type { LangCode, Plan } from '../../types'
import { Banner } from '../ui/Banner'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'

function onlyLang(language: string): LangCode {
  return language === 'hi' || language === 'ta' ? language : 'en'
}

export function PlanSheet({
  open,
  onClose,
  plan,
  onLock,
  onViewAgreement,
  locking = false,
  waitingFor,
}: {
  open: boolean
  onClose: () => void
  plan: Plan
  onLock: () => void
  onViewAgreement: () => void
  locking?: boolean
  waitingFor?: string
}) {
  const { t, i18n } = useTranslation()
  const lang = onlyLang(i18n.language)
  const eligible = plan.confirmedBy.length >= 2 && !plan.needsConfirmation

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t('chat.planTitle')}
      subtitle={t('chat.planSubtitle')}
      footer={
        plan.locked ? (
          <Button
            fullWidth
            size="lg"
            icon={<Lock aria-hidden className="h-5 w-5" />}
            onClick={onViewAgreement}
          >
            {t('agreement.title')}
          </Button>
        ) : (
          <div>
            <Button
              fullWidth
              size="lg"
              disabled={!eligible}
              loading={locking}
              icon={<Lock aria-hidden className="h-5 w-5" />}
              onClick={onLock}
            >
              {t('chat.lockAgreement')}
            </Button>
            {!eligible ? (
              <p className="mt-2 text-center text-xs text-muted">
                {plan.confirmedBy.length >= 2
                  ? t('chat.needsYourConfirmation')
                  : t('plan.waitingFor', { name: waitingFor ?? t('chat.you') })}
              </p>
            ) : null}
          </div>
        )
      }
    >
      {plan.locked ? (
        <Banner tone="success" title={t('chat.locked')}>
          {t('chat.lockedHint')}
        </Banner>
      ) : plan.needsConfirmation ? (
        <Banner tone="warning" title={t('chat.needsYourConfirmation')}>
          {t('chat.planSubtitle')}
        </Banner>
      ) : (
        <Banner tone="success" title={t('plan.confirmedByBoth')} />
      )}

      <section className="mt-4 rounded-2xl border border-line bg-surface2 p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {t('plan.priceTable')}
        </h3>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">{t('agreement.price')}</dt>
            <dd className="num font-semibold">{formatINR(plan.commitment.price)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">{t('agreement.hours')}</dt>
            <dd className="num font-semibold">{plan.commitment.hours}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">{t('agreement.waiting')}</dt>
            <dd className="num font-semibold">{formatINR(plan.commitment.waitingCharge)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {plan.commitment.inclusions.map((inclusion) => (
            <Chip key={inclusion} selected={false} className="pointer-events-none min-h-[36px] px-3 py-1 text-xs">
              {t(`profile.${inclusion}`)}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {t('plan.stops')}
        </h3>
        <ul className="mt-2 space-y-2">
          {plan.items.map((item) => {
            const changed = item.status === 'new' || item.status === 'needs-confirmation'
            return (
              <li
                key={item.id}
                className={
                  changed
                    ? 'flex items-center gap-3 rounded-2xl border border-accent bg-accent-soft px-3 py-2.5'
                    : 'flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5'
                }
              >
                <span className="num w-12 shrink-0 text-[13px] font-semibold text-muted">
                  {item.time}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-medium" lang={lang}>
                  {item.title[lang]}
                </span>
                {changed ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-ink">
                    <Plus aria-hidden className="h-3 w-3" />
                    {t('chat.needsYourConfirmation')}
                  </span>
                ) : (
                  <Check aria-label={t('chat.confirmed')} className="h-4 w-4 shrink-0 text-success" />
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <p className="mt-4 text-center text-[11px] text-muted">
        {t('plan.version', { version: plan.version })} · {t('plan.demoNote')}
      </p>
    </BottomSheet>
  )
}
