import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { useAppStore } from './store/appStore'
import AgreementScreen from './screens/AgreementScreen'
import ChatScreen from './screens/ChatScreen'
import DriverChatScreen from './screens/DriverChatScreen'
import DriverHomeScreen from './screens/DriverHomeScreen'
import DriverListScreen from './screens/DriverListScreen'
import DriverProfileScreen from './screens/DriverProfileScreen'
import DriverTipsScreen from './screens/DriverTipsScreen'
import LanguageScreen from './screens/LanguageScreen'
import NotFoundScreen from './screens/NotFoundScreen'
import RatingScreen from './screens/RatingScreen'
import TripSetupScreen from './screens/TripSetupScreen'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const theme = useAppStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <ToastProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LanguageScreen />} />
        <Route path="/setup" element={<TripSetupScreen />} />
        <Route path="/drivers" element={<DriverListScreen />} />
        <Route path="/drivers/:driverId" element={<DriverProfileScreen />} />
        <Route path="/chat/:roomId" element={<ChatScreen />} />
        <Route path="/agreement/:roomId" element={<AgreementScreen />} />
        <Route path="/rating/:roomId" element={<RatingScreen />} />
        <Route path="/driver" element={<DriverHomeScreen />} />
        <Route path="/driver/chat/:roomId" element={<DriverChatScreen />} />
        <Route path="/driver/tips" element={<DriverTipsScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </ToastProvider>
  )
}
