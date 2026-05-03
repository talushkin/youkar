import { Routes, Route } from 'react-router-dom'
import PaymentPage from './pages/PaymentPage'
import RequestPage from './pages/RequestPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<PaymentPage />} />
      <Route path="/request" element={<RequestPage />} />
    </Routes>
  )
}

export default App
