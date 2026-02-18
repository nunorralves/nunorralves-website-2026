import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  return (
    <div className='flex justify-between items-center mt-12'>
      {currentPage > 1 ? (
        <Link
          href={`/?page=${currentPage - 1}`}
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
          href={`/?page=${currentPage + 1}`}
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
