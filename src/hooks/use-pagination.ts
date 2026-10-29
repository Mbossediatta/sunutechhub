"use client";

import { useMemo, useState } from "react";

const PAGE_SIZES = [10, 20, 50] as const;

export function usePagination<T>(items: readonly T[], initialPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, items, pageSize],
  );
  const setPageSize = (value: number) => {
    if (!PAGE_SIZES.some((size) => size === value)) return;
    setPageSizeState(value);
    setPage(1);
  };

  return {
    pageItems,
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
    setPage,
    setPageSize,
  };
}

export const paginationPageSizes = PAGE_SIZES;
