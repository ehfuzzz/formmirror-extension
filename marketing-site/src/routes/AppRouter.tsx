import { Routes, Route, Navigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import Home from '../pages/Home'
import Docs from '../pages/Docs'
import Contact from '../pages/Contact'
import LegalPrivacy from '../pages/LegalPrivacy'
import LegalTerms from '../pages/LegalTerms'
import NotFound from '../pages/NotFound'

export default function AppRouter() {
  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs/*" element={<Docs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/legal/privacy" element={<LegalPrivacy />} />
          <Route path="/legal/terms" element={<LegalTerms />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
