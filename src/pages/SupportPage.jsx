import React from 'react';
import { ArrowLeft, Mail, MessageCircle, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export default function SupportPage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{
            "@type": "Question",
            "name": "How do I install the extension?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Currently, you need to download the extension zip file and load it manually in Chrome via Developer Mode. We are working on publishing to the Web Store soon!"
            }
        }, {
            "@type": "Question",
            "name": "Is my data private?",
            "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes! Your personal notes are private to you unless you explicitly share them in a Study Room. Location data on the global map is \"fuzzed\" (randomized) so your exact location is never revealed."
            }
        }]
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans p-8 md:p-16">
            <SEO
                title="Support & Help"
                description="Get help with LectureSnap. Find installation guides, privacy info, and contact our support team."
                canonical="/support"
                schema={faqSchema}
            />
            <div className="max-w-3xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-blue-500 mb-8 hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-4">Support & Help</h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 mb-12">
                    Need help with LectureSnap? We're here for you.
                </p>

                <div className="grid gap-6 md:grid-cols-2 mb-12">
                    {/* Contact Card */}
                    <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                            <Mail className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Email Support</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            For general inquiries, bug reports, or partnership opportunities.
                        </p>
                        <a href="mailto:clawcode66@gmail.com" className="text-blue-600 font-bold hover:underline">
                            clawcode66@gmail.com
                        </a>
                    </div>

                    {/* Instagram Card */}
                    <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
                        <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-xl flex items-center justify-center mb-4">
                            <Instagram className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Follow on Instagram</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Get the latest updates, feature announcements, and study tips.
                        </p>
                        <a href="https://www.instagram.com/lecturesnapp?igsh=MXF2MzEya3R6dDA5bg==" target="_blank" rel="noopener noreferrer" className="text-pink-600 font-bold hover:underline">
                            @lecturesnapp
                        </a>
                    </div>
                </div>

                <div className="space-y-8">
                    <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>

                    <div className="space-y-4">
                        <details className="group bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                            <summary className="flex items-center justify-between p-4 cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                How do I install the extension?
                                <span className="transform group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-4 pt-0 text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-white/5">
                                Currently, you need to download the extension zip file and load it manually in Chrome via Developer Mode. We are working on publishing to the Web Store soon!
                            </div>
                        </details>

                        <details className="group bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                            <summary className="flex items-center justify-between p-4 cursor-pointer font-medium hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                                Is my data private?
                                <span className="transform group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-4 pt-0 text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-white/5">
                                Yes! Your personal notes are private to you unless you explicitly share them in a Study Room. Location data on the global map is "fuzzed" (randomized) so your exact location is never revealed.
                            </div>
                        </details>
                    </div>
                </div>

            </div>
        </div>
    );
}
