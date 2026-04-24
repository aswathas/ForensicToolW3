import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Dashboard } from './pages/Dashboard'
import { Investigation } from './pages/Investigation'
import { SignalsCatalog } from './pages/SignalsCatalog'
import { EntityProfile } from './pages/EntityProfile'
import { ReportBuilder } from './pages/ReportBuilder'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/investigation/:runId" element={<Investigation />} />
        <Route path="/signals" element={<SignalsCatalog />} />
        <Route path="/entity-profile" element={<EntityProfile />} />
        <Route path="/report" element={<ReportBuilder />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  )
}

export default App
