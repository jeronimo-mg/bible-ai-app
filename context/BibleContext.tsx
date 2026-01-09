import React, { createContext, useState, useContext, useEffect } from 'react';

type BibleContextType = {
    currentBookIndex: number;
    currentChapterIndex: number;
    setCurrentBookIndex: (index: number) => void;
    setCurrentChapterIndex: (index: number) => void;
    // Simple scroll position persistence (y offset)
    scrollPosition: number;
    setScrollPosition: (y: number) => void;
    // History tracking to "resume"
    hasOpenedChapter: boolean;
    markChapterOpened: () => void;
};

const BibleContext = createContext<BibleContextType | undefined>(undefined);

export function BibleProvider({ children }: { children: React.ReactNode }) {
    const [currentBookIndex, setCurrentBookIndex] = useState(0); // Default Genesis
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0); // Default Chapter 1
    const [scrollPosition, setScrollPosition] = useState(0);
    const [hasOpenedChapter, setHasOpenedChapter] = useState(false);

    const markChapterOpened = () => setHasOpenedChapter(true);

    return (
        <BibleContext.Provider
            value={{
                currentBookIndex,
                currentChapterIndex,
                setCurrentBookIndex,
                setCurrentChapterIndex,
                scrollPosition,
                setScrollPosition,
                hasOpenedChapter,
                markChapterOpened,
            }}
        >
            {children}
        </BibleContext.Provider>
    );
}

export function useBibleContext() {
    const context = useContext(BibleContext);
    if (context === undefined) {
        throw new Error('useBibleContext must be used within a BibleProvider');
    }
    return context;
}
