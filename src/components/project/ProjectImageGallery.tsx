import type { PortfolioProject } from '@/types/project';

/** Editorial pair: the long desktop capture in a scrollable frame beside the phone capture. */
export function ProjectImageGallery({ project }: { project: PortfolioProject }) {
  const { fullPage, mobile } = project.images;
  if (!fullPage && !mobile) return null;
  return (
    <section className="gallery" aria-label={`${project.title} screenshots`} data-ov-swap>
      {fullPage && (
        <figure className="shot shot--long">
          <div className="shot__frame" tabIndex={0} aria-label="Full homepage capture. Scroll inside to see the whole page." data-lenis-prevent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullPage.src}
              width={fullPage.width}
              height={fullPage.height}
              alt={`${project.title}: the whole homepage, desktop`}
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption>Whole homepage, desktop, 1440 px. Scroll inside the frame.</figcaption>
        </figure>
      )}
      {mobile && (
        <figure className="shot shot--phone">
          <div className="shot__phone">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mobile} width={600} height={1299} alt={`${project.title} homepage on a phone`} loading="lazy" decoding="async" />
          </div>
          <figcaption>On a phone, 390 px.</figcaption>
        </figure>
      )}
    </section>
  );
}
