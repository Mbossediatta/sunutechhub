"use client";

import Link from "next/link";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Registration = {
  id: string;
  course: { id: string; title: string };
};

export function PaginatedCourseLinks({
  registrations,
}: {
  registrations: Registration[];
}) {
  const pagination = usePagination(registrations);

  return (
    <>
      <div className="flex flex-col gap-3">
        {pagination.pageItems.map(({ id, course }) => (
          <Link
            key={id}
            href={`/cours/${course.id}`}
            className="rounded-xl border p-4 text-sm font-medium hover:border-primary"
          >
            {course.title}
          </Link>
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
