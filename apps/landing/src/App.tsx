import type { ReactElement } from 'react';
import { DownloadSection } from './components/DownloadSection';
import { FeatureStrip } from './components/FeatureStrip';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { ProductPreviewScrollSection } from './components/ProductPreviewScrollSection';
import { RoadmapSection } from './components/RoadmapSection';
import { TopNav } from './components/TopNav';

function App(): ReactElement {
  return (
    <div className="min-h-screen bg-[var(--goyo-app)] text-[var(--goyo-text)] [font-family:var(--goyo-ui-font-family)]">
      <div
        aria-hidden="true"
        className="goyo-scroll-progress fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-[var(--goyo-accent)]"
      />
      <TopNav />
      <Hero />
      <FeatureStrip />
      <ProductPreviewScrollSection />
      <DownloadSection />
      <RoadmapSection />
      <Footer />
    </div>
  );
}

export default App;
