import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import Pagination from './Pagination';

const ProductGrid = ({ products }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Calculate pagination
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentProducts = products.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="product-grid-container">
            <div className="product-grid">
                {currentProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
        </div>
    );
};

export default ProductGrid;
