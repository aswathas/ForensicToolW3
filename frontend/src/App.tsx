import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Intro } from './pages/Intro'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Investigation } from './pages/Investigation'
import { SignalsCatalog } from './pages/SignalsCatalog'
import { EntityProfile } from './pages/EntityProfile'
import { ReportBuilder } from './pages/ReportBuilder'
import { GraphsPage } from './pages/GraphsPage'
import { Upcoming } from './pages/Upcoming'

// First visit → /intro; subsequent visits → /home (skips intro)
function RootRedirect() {
  const seen = sessionStorage.getItem('intro_seen')
  return seen ? <Navigate to="/home" replace /> : <Navigate to="/intro" replace />
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/"                        element={<RootRedirect />} />
        <Route path="/intro"                   element={<Intro />} />
        <Route path="/home"                    element={<Landing />} />
        <Route path="/dashboard"               element={<Dashboard />} />
        <Route path="/investigation/:runId"    element={<Investigation />} />
        <Route path="/signals"                 element={<SignalsCatalog />} />
        <Route path="/entity-profile"          element={<EntityProfile />} />
        <Route path="/report"                  element={<ReportBuilder />} />
        <Route path="/graphs"                  element={<GraphsPage />} />
        <Route path="/upcoming"               element={<Upcoming />} />
        <Route path="*"                        element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
