// src/context/GuestContext.js
"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const GuestContext = createContext();

export const GuestProvider = ({ children }) => {
  const [guestArtifact, setGuestArtifact] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false); // To prevent hydration mismatch
  const [isSyncing, setIsSyncing] = useState(false);

  // 1. Load from LocalStorage on Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kalpad_guest_artifact');
        if (saved) {
          setGuestArtifact(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to parse guest artifact", e);
        localStorage.removeItem('kalpad_guest_artifact');
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // 2. Save Artifact (Plan + Strategy)
  const saveGuestArtifact = (data) => {
    // Data Structure: 
    // { examName, examDate, syllabus, plan: [], strategy: {}, generationContext: string, generatedNotes: [] }
    
    // Ensure generatedNotes array exists
    const artifact = {
      ...data,
      generatedNotes: data.generatedNotes || []
    };

    setGuestArtifact(artifact);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kalpad_guest_artifact', JSON.stringify(artifact));
    }
  };

  // 3. Update/Add a Note to the Artifact
  // Guests rely on 'day' and 'sub_topic_text' as keys since they don't have DB IDs yet.
  const updateGuestNote = (dayIndex, subTopicText, noteMarkdown) => {
    if (!guestArtifact) return;

    const newNote = {
      day: dayIndex, // The day number (e.g., 1, 2)
      sub_topic_text: subTopicText,
      notes_markdown: noteMarkdown,
      created_at: new Date().toISOString()
    };

    // Filter out previous version of this note if it exists (update logic)
    const existingNotes = guestArtifact.generatedNotes || [];
    const otherNotes = existingNotes.filter(n => n.sub_topic_text !== subTopicText);
    
    const updatedNotes = [...otherNotes, newNote];

    const updatedArtifact = { 
      ...guestArtifact, 
      generatedNotes: updatedNotes 
    };

    saveGuestArtifact(updatedArtifact);
  };

  // 4. Helper: Check if guest has reached note limit (1 note max)
  const hasReachedNoteLimit = () => {
    if (!guestArtifact) return false;
    return (guestArtifact.generatedNotes?.length || 0) >= 1;
  };

  // 5. Clear Artifact (After successful sync)
  const clearGuestArtifact = () => {
    setGuestArtifact(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kalpad_guest_artifact');
    }
  };

  return (
    <GuestContext.Provider value={{ 
      guestArtifact, 
      isLoaded,
      saveGuestArtifact, 
      updateGuestNote, 
      clearGuestArtifact,
      hasReachedNoteLimit,
      isSyncing, 
      setIsSyncing 
    }}>
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = () => useContext(GuestContext);