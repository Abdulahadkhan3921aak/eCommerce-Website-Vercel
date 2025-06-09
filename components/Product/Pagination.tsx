import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        return pageNumbers;
    };

    return (
        <div className="pagination">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
            >
                Previous
            </button>

            {currentPage > 3 && (
                <>
                    <button onClick={() => onPageChange(1)} className="pagination-number">1</button>
                    {currentPage > 4 && <span className="pagination-ellipsis">...</span>}
                </>
            )}

            {getPageNumbers().map((number) => (
                <button
                    key={number}
                    onClick={() => onPageChange(number)}
                    className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                >
                    {number}
                </button>
            ))}

            {currentPage < totalPages - 2 && (
                <>
                    {currentPage < totalPages - 3 && <span className="pagination-ellipsis">...</span>}
                    <button onClick={() => onPageChange(totalPages)} className="pagination-number">
                        {totalPages}
                    </button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
            >
                Next
            </button>
        </div>
    );
};

export default Pagination;
