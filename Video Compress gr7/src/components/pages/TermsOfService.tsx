import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

export function TermsOfService({ onBack }: { onBack: () => void }) {
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
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
            <p className="text-slate-400 mt-1">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using VidFlow, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">2. Description of Service</h2>
            <p>
              VidFlow provides web-based video processing tools that operate entirely within the user's web browser. We provide these tools "as is" and "as available" without any warranty or condition, express, implied, or statutory.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">3. User Responsibilities</h2>
            <p>
              You are responsible for the content you process using our tools. You agree not to use VidFlow for any illegal or unauthorized purpose. You must not, in the use of the service, violate any laws in your jurisdiction (including but not limited to copyright laws).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">4. Local Processing and Data Loss</h2>
            <p>
              Because VidFlow processes files locally in your browser, we do not have backups of your files. You are solely responsible for keeping original copies of your media. We are not liable for any data loss, corruption, or processing errors that may occur during the use of our tools.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">5. Modifications to Service</h2>
            <p>
              We reserve the right to modify or discontinue, temporarily or permanently, the service (or any part thereof) with or without notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">6. Limitation of Liability</h2>
            <p>
              In no event shall VidFlow be liable for any direct, indirect, incidental, special, consequential, or exemplary damages resulting from your use of the service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">7. Contact Information</h2>
            <p>
              For any questions regarding these Terms of Service, please contact us at:
              <br />
              <a href="mailto:gr7imagepdf@gmail.com" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">gr7imagepdf@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
