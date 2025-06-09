interface StructuredDataProps {
    type: 'website' | 'product' | 'organization' | 'breadcrumb';
    data: any;
}

export default function StructuredData({ type, data }: StructuredDataProps) {
    const getStructuredData = () => {
        switch (type) {
            case 'website':
                return {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": "Butterflies Beading",
                    "description": "Handmade jewelry and custom designs",
                    "url": process.env.NEXT_PUBLIC_SITE_URL,
                    "potentialAction": {
                        "@type": "SearchAction",
                        "target": {
                            "@type": "EntryPoint",
                            "urlTemplate": `${process.env.NEXT_PUBLIC_SITE_URL}/products?search={search_term_string}`
                        },
                        "query-input": "required name=search_term_string"
                    }
                };
            case 'organization':
                return {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "Butterflies Beading",
                    "description": "Handmade jewelry and custom designs",
                    "url": process.env.NEXT_PUBLIC_SITE_URL,
                    "logo": `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`,
                    "contactPoint": {
                        "@type": "ContactPoint",
                        "telephone": "+1-555-123-4567",
                        "contactType": "customer service",
                        "email": "info@butterfliesbeading.com"
                    },
                    "sameAs": [
                        "https://www.facebook.com/butterfliesbeading",
                        "https://www.instagram.com/butterfliesbeading",
                        "https://www.pinterest.com/butterfliesbeading"
                    ]
                };
            case 'product':
                return {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    ...data
                };
            default:
                return data;
        }
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(getStructuredData())
            }}
        />
    );
}
