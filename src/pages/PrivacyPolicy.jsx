import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans p-8 md:p-16">
            <SEO
                title="Privacy Policy"
                description="Read our Privacy Policy to understand how LectureSnap collects, uses, and protects your personal data."
                canonical="/privacy"
            />
            <div className="max-w-3xl mx-auto">
                <Link to="/" className="inline-flex items-center gap-2 text-blue-500 mb-8 hover:underline">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-8">Last updated: January 26, 2026</p>

                <section className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            We collect information you provide directly to us when you use LectureSnap. This includes:
                            <ul className="list-disc ml-6 mt-2 space-y-1">
                                <li><strong>Account Information:</strong> When you sign in with Google, we collect your email address and profile picture to create your account.</li>
                                <li><strong>User Content:</strong> We store the notes, folders, and screenshots you create. These are stored securely in Firebase Cloud Storage and Firestore.</li>
                            </ul>
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            We use the collected information solely to provide and improve the LectureSnap service. We do not sell your personal data to third parties. We use your data to:
                            <ul className="list-disc ml-6 mt-2 space-y-1">
                                <li>Sync your notes across multiple devices.</li>
                                <li>Authenticate your identity.</li>
                                <li>Ensure the security of your account.</li>
                            </ul>
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">3. Data Storage and Security</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            Your data is stored on Google Firebase servers. We implement standard security measures to protect your information. However, no method of transmission over the Internet is 100% secure.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">4. Cookies</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            We use cookies and similar technologies to maintain your session and authentication status.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-semibold mb-3">5. Contact Us</h2>
                        <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                            If you have any questions about this Privacy Policy, please contact us at clawcode66@gmail.com.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
