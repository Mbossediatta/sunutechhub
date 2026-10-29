"use client";

import { ProjectCard } from "@/components/cards/project-card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Project = {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  technologies: string[];
  _count: { likes: number; comments: number };
  user: { name: string; city: string | null };
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
            imageUrl={project.imageUrls[0] ?? null}
            author={project.user}
            technologies={project.technologies}
            likeCount={project._count.likes}
            commentCount={project._count.comments}
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
