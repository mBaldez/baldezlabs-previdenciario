import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginPage } from './pages/LoginPage'
import { ListagemPage } from './pages/ListagemPage'
import { EditorPage } from './pages/EditorPage'

function RotaProtegida({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: 'var(--navy)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--gold)', fontFamily: 'Georgia, serif', fontSize: '18px',
    }}>
      Carregando...
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function RotaPublica({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={
          <RotaPublica><LoginPage /></RotaPublica>
        } />
        <Route path="/" element={
          <RotaProtegida><ListagemPage /></RotaProtegida>
        } />
        <Route path="/editor/:id" element={
          <RotaProtegida><EditorPage /></RotaProtegida>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
