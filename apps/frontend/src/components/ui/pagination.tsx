import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  // eslint-disable-next-line no-unused-vars
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}: PaginationProps) {
  // Don't render if only one page or no items
  if (totalPages <= 1) {
    return null;
  }

  // Calculate range of items being shown
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent,
    action: () => void,
    disabled: boolean
  ) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      action();
    }
  };

  return (
    <div
      className="flex items-center justify-between mt-4"
      role="navigation"
      aria-label="Pagination"
    >
      {/* Items info */}
      <div className="text-sm text-gray-600" aria-live="polite">
        Showing {startItem} to {endItem} of {totalItems} items
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          onKeyDown={(e) => handleKeyDown(e, handlePrevious, currentPage === 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {/* Current page info */}
        <div
          className="text-sm text-gray-600"
          aria-current="page"
          aria-label={`Page ${currentPage} of ${totalPages}`}
        >
          Page {currentPage} of {totalPages}
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          onKeyDown={(e) =>
            handleKeyDown(e, handleNext, currentPage === totalPages)
          }
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
