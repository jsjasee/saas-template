import React from "react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const isPreviousDisabled = currentPage <= 1;
  const isNextDisabled = totalPages <= 1 || currentPage >= totalPages;

  return (
    <div className="flex justify-center space-x-2 mt-4">
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isPreviousDisabled}
        variant="outline"
      >
        Previous
      </Button>
      <span className="flex items-center">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isNextDisabled}
        variant="outline"
      >
        Next
      </Button>
    </div>
  );
}
