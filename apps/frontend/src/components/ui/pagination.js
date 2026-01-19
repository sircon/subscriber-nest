import { jsxs as _jsxs, jsx as _jsx } from 'react/jsx-runtime';
import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) {
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
  const handleKeyDown = (e, action, disabled) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      action();
    }
  };
  return _jsxs('div', {
    className: 'flex items-center justify-between mt-4',
    role: 'navigation',
    'aria-label': 'Pagination',
    children: [
      _jsxs('div', {
        className: 'text-sm text-gray-600',
        'aria-live': 'polite',
        children: [
          'Showing ',
          startItem,
          ' to ',
          endItem,
          ' of ',
          totalItems,
          ' items',
        ],
      }),
      _jsxs('div', {
        className: 'flex items-center gap-2',
        children: [
          _jsxs(Button, {
            variant: 'outline',
            size: 'sm',
            onClick: handlePrevious,
            onKeyDown: (e) =>
              handleKeyDown(e, handlePrevious, currentPage === 1),
            disabled: currentPage === 1,
            'aria-label': 'Go to previous page',
            children: [
              _jsx(ChevronLeft, { className: 'h-4 w-4 mr-1' }),
              'Previous',
            ],
          }),
          _jsxs('div', {
            className: 'text-sm text-gray-600',
            'aria-current': 'page',
            'aria-label': `Page ${currentPage} of ${totalPages}`,
            children: ['Page ', currentPage, ' of ', totalPages],
          }),
          _jsxs(Button, {
            variant: 'outline',
            size: 'sm',
            onClick: handleNext,
            onKeyDown: (e) =>
              handleKeyDown(e, handleNext, currentPage === totalPages),
            disabled: currentPage === totalPages,
            'aria-label': 'Go to next page',
            children: [
              'Next',
              _jsx(ChevronRight, { className: 'h-4 w-4 ml-1' }),
            ],
          }),
        ],
      }),
    ],
  });
}
