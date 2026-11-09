import type { PortfolioProject } from '@/types/project';

/*
 * Static computer used when WebGL is unavailable: the same real screenshot inside a CSS
 * monitor (aluminium chin, black glass, bent stand). Rendered for the selected project only.
 */
export function ComputerItem({ project }: { project: PortfolioProject }) {
  return (
    <figure className="css-computer" aria-hidden="true">
      <div className="css-computer__body">
        <div className="css-computer__glass">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={project.screenshot} width={1440} height={900} alt="" decoding="async" />
        </div>
        <div className="css-computer__chin" />
      </div>
      <div className="css-computer__stand" />
    </figure>
  );
}
