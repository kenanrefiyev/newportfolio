import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ComputerGallery } from '@/components/collection/ComputerGallery';
import { ProjectOverlay } from '@/components/project/ProjectOverlay';
import { IndexSection } from '@/components/sections/IndexSection';
import { AboutSection } from '@/components/sections/AboutSection';
import { ContactSection } from '@/components/sections/ContactSection';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <ComputerGallery />
        <IndexSection />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
      <ProjectOverlay />
    </>
  );
}
