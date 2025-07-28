// src/app/page.js - FINAL CLIENT-SIDE PROCESSING VERSION

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import supabase from '../lib/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import styles from './page.module.css';

// Import the pdf.js library
import * as pdfjsLib from 'pdfjs-dist';
// This line is crucial for the library to work in a Next.js/webpack environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;



export default function HomePage() {
  // Session State
  const [session, setSession] = useState(null);

  // Planner State
  const [examName, setExamName] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [examDate, setExamDate] = useState('');
  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useDocuments, setUseDocuments] = useState(true); // New flag for using documents
  const [generationContext, setGenerationContext] = useState(null);

  // Save Plan State
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Client-Side File Processing State
  const [studyMaterialFile, setStudyMaterialFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handlePlanGeneration = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setPlan(null);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examName, syllabus, examDate, useDocuments }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong.');
      }
      const data = await response.json();
      setPlan(data.plan);
      setGenerationContext(data.context);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!plan || !session) return;
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const response = await fetch('/api/save-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, },
        body: JSON.stringify({ exam_name: examName, exam_date: examDate, plan_topics: plan, generation_context: generationContext }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save the plan.");
      }
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setStudyMaterialFile(e.target.files[0]);
      setProcessMessage(`${e.target.files[0].name} selected. Ready to process.`);
    }
  };

// In src/app/page.js

// --- NEW --- A more robust sanitization function
const sanitizeText = (text) => {
  if (!text) return '';
  // Remove the NUL character
  let sanitized = text.replace(/\u0000/g, '');
  // Fix broken surrogate pairs. This regex finds a low surrogate that is not preceded by a high surrogate.
  sanitized = sanitized.replace(/([^\ud800-\udbff])([\udc00-\udfff])/g, '$1?'); // Replace with a placeholder
  // Find a high surrogate that is not followed by a low surrogate.
  sanitized = sanitized.replace(/([\ud800-\udbff])([^\udc00-\udfff])/g, '$1?'); // Replace with a placeholder
  return sanitized;
};


const handleProcessFile = async () => {
  if (!studyMaterialFile) return;

  setIsProcessing(true);
  setProcessMessage('Step 1/3: Reading and sanitizing PDF in your browser...');

  try {
    // --- Step 1: Parsing and Chunking (Client-Side) ---
    const fileReader = new FileReader();
    const text = await new Promise((resolve, reject) => {
      fileReader.onload = async (event) => {
        try {
          const typedarray = new Uint8Array(event.target.result);
          const pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
          const allText = [];
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText.push(pageText);
          }
          resolve(allText.join('\n\n'));
        } catch (error) { reject(error); }
      };
      fileReader.onerror = (error) => reject(error);
      fileReader.readAsArrayBuffer(studyMaterialFile);
    });

    // --- THIS IS THE FIX ---
    // Sanitize the text *before* chunking to fix character issues at the source.
    const sanitizedText = sanitizeText(String(text));
    const chunks = chunkText(sanitizedText, 1000, 200);

    if (chunks.length === 0) {
      throw new Error("No text could be extracted from this PDF.");
    }
    setProcessMessage(`Step 2/3: Sending ${chunks.length} clean text chunks to be indexed...`);

    // --- Step 2: Send Sanitized Chunks to Backend ---
    const response = await fetch('/api/vectorize-chunks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chunks }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to vectorize content.");
    }

    const result = await response.json();
    setProcessMessage(`✅ Success! ${result.message}`);

  } catch (err) {
    console.error("File processing pipeline error:", err);
    setProcessMessage(`Error: ${err.message}`);
  } finally {
    setIsProcessing(false);
  }
};

// The chunking function can stay the same

const chunkText = (text, chunkSize, chunkOverlap) => {
  const chunks = [];
  if (!text) return chunks;
  let i = 0;
  while (i < text.length) {
    chunks.push(text.substring(i, i + chunkSize));
    i += chunkSize - chunkOverlap;
  }
  return chunks;
};


  if (!session) {
    return (
      <main className={styles.main}>
        <div className={styles.authContainer}>
          <h1 className={styles.title}>Welcome to KalPad AI</h1>
          <p className={styles.description}>Sign in or create an account to get started.</p>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['google']} theme="dark" />
        </div>
      </main>
    );
  } else {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>KalPad AI Study Planner 🚀</h1>
            <div className={styles.headerNav}>
              <Link href="/my-plans" className={styles.navLink}>My Plans</Link>
              <button onClick={() => supabase.auth.signOut()} className={styles.buttonSecondary}>Sign Out</button>
            </div>
          </div>
          <p className={styles.description}>You're signed in as {session.user.email}</p>
          <form onSubmit={handlePlanGeneration} className={styles.form}>
            <input type="text" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Enter Exam Name (e.g., SAT, Final Exams)" required className={styles.input}/>
            <textarea value={syllabus} onChange={(e) => setSyllabus(e.target.value)} placeholder="Paste your syllabus here..." required className={styles.textarea}/>
            <div className={styles.fileUploadSection}>
              <label htmlFor="studyMaterialUpload" className={styles.fileUploadLabel}>
                Optional: Process Study Materials (PDF)
              </label>
              <div className={styles.fileInputContainer}>
                <input
                  type="file"
                  id="studyMaterialUpload"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <button 
                  type="button" 
                  onClick={handleProcessFile} 
                  disabled={!studyMaterialFile || isProcessing}
                  className={styles.button}
                >
                  {isProcessing ? 'Processing...' : 'Process File'}
                </button>
              </div>
              {processMessage && <p className={styles.uploadMessage}>{processMessage}</p>}
            </div>

            <div className={styles.checkboxContainer}>
              <input 
                type="checkbox"
                id="useDocumentsCheck"
                checked={useDocuments}
                onChange={(e) => setUseDocuments(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="useDocumentsCheck" className={styles.checkboxLabel}>
                Use my uploaded documents to create a better, personalized plan
              </label>
            </div>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} required className={styles.input}/>
            <button type="submit" disabled={isLoading} className={styles.button}>
              {isLoading ? 'Generating...' : 'Generate Plan'}
            </button>
          </form>
          {error && <p className={styles.error}>{error}</p>}
          {plan && (
            <div className={styles.planContainer}>
              <div className={styles.planHeader}>
                <h2 className={styles.planTitle}>Your Generated Study Plan:</h2>
                <button onClick={handleSavePlan} disabled={isSaving || saveSuccess} className={styles.button}>
                  {isSaving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Plan'}
                </button>
              </div>
              {saveError && <p className={styles.error}>{saveError}</p>}
              {plan.map((item, index) => (
                <div key={index} className={styles.planItem}>
                  <h3>Day {item.day} ({item.date})</h3>
                  <p><strong>Topic:</strong> {item.topic_name}</p>
                  <p><strong>Study Time:</strong> {item.study_hours} hours</p>
                  <p><em>Justification: {item.justification}</em></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }
}