import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface WordEntry {
  id: string;
  word: string;
  pos: string;
  definition_en: string;
  examples_en: string[];
  word_ko: string;
  definition_ko: string;
  examples_ko: string[];
  confidence: "high" | "medium" | "low";
}

export interface WordSet {
  id: string;
  name: string;
  words: WordEntry[];
  createdAt: number;
}

interface VocabContextType {
  currentWords: WordEntry[];
  savedSets: WordSet[];
  setCurrentWords: (words: WordEntry[]) => void;
  updateWord: (id: string, changes: Partial<WordEntry>) => void;
  saveCurrentSet: () => Promise<void>;
  deleteSet: (id: string) => Promise<void>;
  loadSet: (set: WordSet) => void;
}

const VocabContext = createContext<VocabContextType | null>(null);

const STORAGE_KEY = "@dux_vocab_sets_v1";

export function VocabProvider({ children }: { children: React.ReactNode }) {
  const [currentWords, setCurrentWords] = useState<WordEntry[]>([]);
  const [savedSets, setSavedSets] = useState<WordSet[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSavedSets(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const persistSets = async (sets: WordSet[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
      setSavedSets(sets);
    } catch {}
  };

  const updateWord = (id: string, changes: Partial<WordEntry>) => {
    setCurrentWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...changes } : w))
    );
  };

  const saveCurrentSet = async () => {
    const date = new Date().toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const newSet: WordSet = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: `단어장 ${date}`,
      words: currentWords,
      createdAt: Date.now(),
    };
    await persistSets([newSet, ...savedSets]);
  };

  const deleteSet = async (id: string) => {
    await persistSets(savedSets.filter((s) => s.id !== id));
  };

  const loadSet = (set: WordSet) => {
    setCurrentWords(set.words);
  };

  return (
    <VocabContext.Provider
      value={{
        currentWords,
        savedSets,
        setCurrentWords,
        updateWord,
        saveCurrentSet,
        deleteSet,
        loadSet,
      }}
    >
      {children}
    </VocabContext.Provider>
  );
}

export function useVocab() {
  const ctx = useContext(VocabContext);
  if (!ctx) throw new Error("useVocab must be used within VocabProvider");
  return ctx;
}
