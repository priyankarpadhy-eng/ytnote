import React from 'react';
import { SEO } from '../components/SEO';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function AboutUs() {
    const schema = {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "mainEntity": {
            "@type": "Organization",
            "name": "LectureSnap",
            "url": "https://lecturesnap.online",
            "logo": "https://lecturesnap.online/logo.png",
            "foundingDate": "2024",
            "description": "The ultimate study companion for students using YouTube as their primary learning resource."
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 font-sans">
            <SEO
                title="About Us"
                description="Learn about the mission behind LectureSnap - helping students master their studies with smarter video note-taking tools."
                canonical="/about"
                schema={schema}
            />

            <nav className="p-6 border-b border-gray-100 dark:border-white/5">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">LectureSnap</h1>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
                <section className="space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight">Built for the Modern Student</h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 leading-relaxed">
                        We believe that knowledge should be captured, not just consumed. In an era where YouTube is the world's biggest classroom, students needed a better way to take notes.
                    </p>
                </section>

                <section className="prose dark:prose-invert lg:prose-lg">
                    <p>
                        LectureSnap started with a simple observation: pausing a video to scribble down notes breaks your flow. It interrupts the learning process and makes studying feel like a chore. We wanted to change that.
                    </p>
                    <p>
                        Our mission is to empower students to learn faster and retain more. By combining instant screenshot capabilities with a powerful note-taking interface, we've created a workspace that lives right alongside your video content.
                    </p>
                    <h3>Our Core Values</h3>
                    <ul>
                        <li><strong>Speed:</strong> Capture information at the speed of thought.</li>
                        <li><strong>Focus:</strong> Eliminate distractions and keep you in the zone.</li>
                        <li><strong>Simplicity:</strong> Tools that just work, without the learning curve.</li>
                    </ul>
                    <p>
                        Today, LectureSnap is used by students around the world to ace their exams, organize their research, and build their knowledge base. We are just getting started.
                    </p>
                </section>
            </main>

            <footer className="border-t border-gray-100 dark:border-white/5 py-12 text-center text-gray-500">
                <p>&copy; {new Date().getFullYear()} LectureSnap. All rights reserved.</p>
            </footer>
        </div>
    );
}
