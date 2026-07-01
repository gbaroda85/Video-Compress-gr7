import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tools
      </button>
      
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-800">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-slate-400 mt-1">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Information We Do Not Collect</h2>
            <p>
              VidFlow is designed with privacy as its core principle. <strong>We do not collect, store, or process any of your video files on our servers.</strong> All video processing is performed entirely locally within your web browser using WebAssembly technology.
            </p>
            <p>
              Your media files never leave your device. There is no upload process, and we have no access to the content you process using our tools.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. Information We Collect</h2>
            <p>
              We collect minimal information necessary to operate and improve the service:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Basic analytics data (such as page views, browser type, and device type) to understand how our service is used.</li>
              <li>Information you explicitly provide when contacting our support email (gr7imagepdf@gmail.com).</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. Third-Party Services</h2>
            <p>
              We may use third-party analytics services to help analyze how users use the site. These services use cookies and similar technologies to collect information about site usage. They do not have access to your video files.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:gr7imagepdf@gmail.com" className="text-indigo-400 hover:text-indigo-300 mt-2 inline-block">gr7imagepdf@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
