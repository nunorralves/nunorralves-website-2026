import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  // The route the page links stay on, so the same control works anywhere
  basePath?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath = "/",
}: PaginationProps) {
  return (
    <div className='flex justify-between items-center mt-12'>
      {currentPage > 1 ? (
        <Link
          href={`${basePath}?page=${currentPage - 1}`}
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors'
        >
          <ChevronLeft className='w-4 h-4' />
          Previous
        </Link>
      ) : (
        <div />
      )}

      <div className='text-sm text-muted-foreground'>
        Page {currentPage} of {totalPages}
      </div>

      {currentPage < totalPages ? (
        <Link
          href={`${basePath}?page=${currentPage + 1}`}
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors'
        >
          Next
          <ChevronRight className='w-4 h-4' />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
