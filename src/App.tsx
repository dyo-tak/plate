import { Routes, Route } from 'react-router-dom'
import { Nav } from './components/Nav'
import { Home } from './pages/Home'
import { Notes } from './pages/Notes'
import { Settings } from './pages/Settings'
import SyncCallback from './pages/SyncCallback'
import { StampedHeader } from './components/StampedHeader'
import { BrandTicker } from './components/BrandTicker'
import { InvertedLetter } from './components/InvertedLetter'
import { CoordinateFooter } from './components/CoordinateFooter'

export default function App() {
  return (
    <div className="min-h-screen bg-paper text-headline-ink font-ui">
      <Nav />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<Notes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/sync/callback" element={<SyncCallback />} />
      </Routes>

      {/* Editorial closer — full-bleed stamped section + ticker + footer */}
      <StampedHeader
        eyebrow="Section"
        title="Editorial"
        trailing="—"
      />

      <InvertedLetter
        topEyebrow="A brief letter from the work desk"
        bottomEyebrow="Plate · Mumbai · 2026"
        body="Plate is a working broadside. Notes go in, ink comes out. The page is paper; the deep sections are ink. There is no other color, and that is the point."
      />

      <BrandTicker
        brands={['Notebooks', 'Outlines', 'Daily Notes', 'Code Snippets', 'Reading Lists', 'Diagrams']}
        withComingSoon={['Diagrams']}
      />

      <CoordinateFooter />
    </div>
  )
}
