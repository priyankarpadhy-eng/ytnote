import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export default function TermsAndConditions() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans p-8 md:p-16">
            <SEO
                title="Terms and Conditions"
                description="Review the terms and conditions for using the LectureSnap extension and web application."
                canonical="/terms"
            />
            <div className="max-w-3xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-blue-500 mb-8 hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Last updated: January 26, 2026</p>

                <section className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-semibold mb-3">1. Agreement to Terms</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            By accessing or using LectureSnap, you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the service.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">2. Use of Service</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            You agree to use LectureSnap only for lawful purposes. You are responsible for all content (notes, screenshots) you create and store on the platform. You must not upload content that violates copyright laws or is illegal.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">3. User Accounts</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            When you create an account with us, you must provide accurate information. You are responsible for safeguarding the password (or Google account credentials) that you use to access the service and for any activities or actions under your account.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">4. Intellectual Property</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            The Service and its original content (excluding Content provided by you or other users), features, and functionality are and will remain the exclusive property of LectureSnap and its licensors.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">5. Termination</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">6. Limitation of Liability</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            In no event shall LectureSnap, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
