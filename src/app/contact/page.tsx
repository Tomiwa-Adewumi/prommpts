'use client';

import { useState } from 'react';
import Link from 'next/link';
import { museoModerno } from '@/lib/fonts';
import { Mail, Send, ArrowLeft, Sparkles, Users, Target, Rocket } from 'lucide-react';
import { HomeSidebar } from '@/components/layout/home-sidebar';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'tumifnx@prommmt.com'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          company: formData.company,
          email: formData.email,
          message: formData.message,
          _subject: 'New Brand Partnership Inquiry - PROMMMT',
          _template: 'table'
        })
      });

      if (response.ok) {
        setShowSuccess(true);
        setFormData({ name: '', company: '', email: '', message: '' });
        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setShowError(true);
        // Hide error message after 5 seconds
        setTimeout(() => setShowError(false), 5000);
      }
    } catch (error) {
      setShowError(true);
      // Hide error message after 5 seconds
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <HomeSidebar onUnauthenticatedAction={(action, destinationUrl) => {
        // For the contact page, we don't need to show a sign-in modal
        // Users can still access the contact form without signing in
        // The sidebar will handle navigation to protected routes appropriately
      }} />

      {/* Main Content */}
      <div className="md:ml-20 pb-20 md:pb-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-16">

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h1 className={`text-5xl font-bold mb-6 ${museoModerno.className}`}>
                Partner with PROMMMT
              </h1>

              <p className="text-gray-300 text-lg mb-8">
                Elevate your brand with AI-powered creative solutions. Connect with our community of AI artists and prompt engineers.
              </p>

              <div className="space-y-6 mb-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${museoModerno.className}`}>Custom AI Campaigns</h3>
                    <p className="text-gray-400">Unique AI-generated content tailored to your brand identity</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${museoModerno.className}`}>Community Engagement</h3>
                    <p className="text-gray-400">Access to thousands of creative professionals and AI enthusiasts</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${museoModerno.className}`}>Targeted Reach</h3>
                    <p className="text-gray-400">Connect with early adopters and tech-savvy audiences</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold mb-2 ${museoModerno.className}`}>Innovation Partnership</h3>
                    <p className="text-gray-400">Be at the forefront of AI creative technology</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="w-5 h-5 text-white" />
                  <h3 className={`text-lg font-semibold ${museoModerno.className}`}>Direct Contact</h3>
                </div>
                <p className="text-gray-300">
                  Reach out directly at:{' '}
                  <a
                    href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'tumifnx@prommmt.com'}`}
                    className="text-white hover:underline font-medium"
                  >
                    {process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'tumifnx@prommmt.com'}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <div className="bg-gray-900 rounded-lg p-8">
                <h2 className={`text-2xl font-bold mb-6 ${museoModerno.className}`}>
                  Get In Touch
                </h2>

                {/* Success Message */}
                {showSuccess && (
                  <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded-lg">
                    <p className="text-green-300 text-center">
                      Thank you! Your message has been sent successfully. We'll get back to you soon.
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {showError && (
                  <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
                    <p className="text-red-300 text-center">
                      There was an error sending your message. Please try again or contact us directly.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-gray-300 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      id="company"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
                      placeholder="Your Company"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
                      placeholder="john@company.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none resize-none"
                      placeholder="Tell us about your brand and how you'd like to collaborate..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}