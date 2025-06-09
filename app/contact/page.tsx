'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import StructuredData from '@/components/SEO/StructuredData';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSubmitStatus('success');
                setFormData({ name: '', email: '', subject: '', message: '' });
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const contactInfo = {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": "Contact Butterflies Beading",
        "description": "Get in touch with Butterflies Beading for custom jewelry orders and inquiries",
        "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+1-555-123-4567",
            "contactType": "customer service",
            "email": "info@butterfliesbeading.com",
            "availableLanguage": "English"
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <StructuredData type="breadcrumb" data={contactInfo} />

            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Contact Us
                        </h1>
                        <p className="text-lg text-gray-600">
                            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Contact Information */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    Get in Touch
                                </h2>

                                <div className="space-y-6">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-lg font-medium text-gray-900">Address</h3>
                                            <p className="text-gray-600">
                                                123 Artisan Way<br />
                                                Craftsville, NY 10001<br />
                                                United States
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-lg font-medium text-gray-900">Phone</h3>
                                            <p className="text-gray-600">+1 (555) 123-4567</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-lg font-medium text-gray-900">Email</h3>
                                            <p className="text-gray-600">info@butterfliesbeading.com</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-lg font-medium text-gray-900">Business Hours</h3>
                                            <div className="text-gray-600">
                                                <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                                                <p>Saturday: 10:00 AM - 4:00 PM</p>
                                                <p>Sunday: Closed</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Social Media Links */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Follow Us</h3>
                                <div className="flex space-x-4">
                                    <a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">
                                        <span className="sr-only">Facebook</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                                        </svg>
                                    </a>
                                    <a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">
                                        <span className="sr-only">Instagram</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.987 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.596-3.205-1.529l1.529-1.297c.438.596 1.119.959 1.885.959.766 0 1.447-.363 1.885-.959l1.529 1.297c-.757.933-1.908 1.529-3.205 1.529z" />
                                        </svg>
                                    </a>
                                    <a href="#" className="text-gray-400 hover:text-purple-600 transition-colors">
                                        <span className="sr-only">Pinterest</span>
                                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0C5.374 0 0 5.372 0 12s5.374 12 12 12 12-5.372 12-12S18.626 0 12 0zm0 19c-.721 0-1.418-.109-2.073-.312.286-.465.713-1.227.87-1.835l.437-1.664c.229.436.895.802 1.603.802 2.11 0 3.542-1.929 3.542-4.508 0-1.946-1.651-3.785-4.156-3.785-3.125 0-4.708 2.243-4.708 4.109 0 1.139.432 2.151 1.36 2.528.152.061.232.034.267-.093l.267-1.056c.034-.137.021-.186-.076-.306-.209-.252-.343-.578-.343-.959 0-1.234.921-2.338 2.4-2.338 1.308 0 2.027.8 2.027 1.872 0 1.401-.619 2.586-1.54 2.586-.508 0-.887-.421-.766-.938.145-.615.425-1.279.425-1.723 0-.398-.213-.728-.654-.728-.519 0-.936.537-.936 1.256 0 .459.155.769.155.769s-.528 2.236-.62 2.628c-.184.784-.028 1.747-.014 1.844.008.057.081.071.114.028.047-.061.652-.808.851-1.571.056-.215.322-1.259.322-1.259.159.303.623.571 1.116.571 1.469 0 2.467-1.34 2.467-3.134C17.125 7.334 15.294 5.7 12.9 5.7c-2.856 0-4.832 2.052-4.832 4.751 0 .873.331 1.651.877 2.114.089.075.102.141.075.218-.02.057-.065.259-.085.331-.028.101-.09.123-.208.074-1.15-.536-1.869-2.208-1.869-3.551 0-2.908 2.113-5.271 6.088-5.271 3.197 0 5.68 2.278 5.68 5.322 0 3.173-2.001 5.727-4.777 5.727-.932 0-1.811-.485-2.11-1.06z" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-gray-50 rounded-lg p-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                Send us a Message
                            </h2>

                            {submitStatus === 'success' && (
                                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                                    <p className="text-green-800">
                                        Thank you for your message! We'll get back to you soon.
                                    </p>
                                </div>
                            )}

                            {submitStatus === 'error' && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-red-800">
                                        Sorry, there was an error sending your message. Please try again.
                                    </p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                            Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                                        Subject *
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        required
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                                        Message *
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        rows={6}
                                        required
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`w-full btn-primary py-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Message'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
