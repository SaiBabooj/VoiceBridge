import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/EmptyState'

export default function NotFoundScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="app-shell">
      <main className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={<Compass aria-hidden className="h-8 w-8" />}
          title={t('notFound.title')}
          body={t('notFound.body')}
          action={<Button fullWidth onClick={() => navigate('/')}>{t('notFound.home')}</Button>}
        />
      </main>
    </div>
  )
}
