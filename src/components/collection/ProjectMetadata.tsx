import type { PortfolioProject } from '@/types/project';

/** The museum label every computer carries. Same schema for all eleven. */
export function ProjectMetadata({ project }: { project: PortfolioProject }) {
  return (
    <div className="label" key={project.id}>
      <h2 className="label__title" lang={project.lang}>
        {project.title}
      </h2>
      <dl className="label__table">
        <div className="label__row">
          <dt>Category</dt>
          <dd>{project.category}</dd>
        </div>
        <div className="label__row">
          <dt>Year</dt>
          <dd className="tnum">{project.year}</dd>
        </div>
        <div className="label__row">
          <dt>Built with</dt>
          <dd>{project.technologies.slice(0, 3).join(', ')}</dd>
        </div>
      </dl>
    </div>
  );
}
