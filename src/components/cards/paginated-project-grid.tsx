"use client";

import { ProjectCard } from "@/components/cards/project-card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Project = {
  id: string;
  title: string;
  description: string;
  user: { name: string; city: string | null };
  course: { title: string; subjects: string[] };
};

export function PaginatedProjectGrid({ projects }: { projects: Project[] }) {
  const pagination = usePagination(projects);

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pagination.pageItems.map((project) => (
          <ProjectCard
            key={project.id}
            id={project.id}
            title={project.title}
            description={project.description}
            author={project.user}
            courseTitle={project.course.title}
            technologies={project.course.subjects}
          />
        ))}
      </div>
      <PaginationControls
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
    </>
  );
}
