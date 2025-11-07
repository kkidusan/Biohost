"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, Clock, Eye, Star, ArrowRight, Zap,
  Loader2, X, Menu, ChevronRight, Home as HomeIcon, ChevronLeft, ChevronDown,
  Grid, List as ListIcon, Volume2, VolumeX, Pause, Play, Sun, Moon,
  Settings, FileText
} from "lucide-react";
import Link from "next/link";
import {
  collection, getDocs, query, doc, updateDoc, increment, Timestamp
} from "firebase/firestore";
import { db } from "../firebaseconfig";
import { useAuth } from "../context/AuthContext";
import DOMPurify from "dompurify";

interface Page {
  id: string;
  title: string;
  html: string;
}

interface Chapter {
  id: string;
  title: string;
  pages: Page[];
  publish?: boolean;
}

interface Book {
  id: string;
  title: string;
  authorEmail: string;
  coverImage?: string | null;
  excerpt?: string;
  style: string;
  chapters: Chapter[];
  wordCount: number;
  updatedAt: Timestamp;
  views?: number;
  rating?: number;
}

export default function ReadPage() {
  const { isLoggedIn } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mobileTab, setMobileTab] = useState<"home" | "pages" | "settings">("home");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fixed: formatNumber defined early
  const formatNumber = (n?: number): string => (n ?? 0).toLocaleString();

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const allBooksQuery = query(collection(db, "books"));
        const allSnap = await getDocs(allBooksQuery);

        const publishedBooks = allSnap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Book)
          .filter(book => book.chapters?.some(ch => ch.publish === true));

        const list: Book[] = publishedBooks.map(book => ({
          ...book,
          views: book.views ?? 0,
          rating: book.rating ?? 4.7,
        }));

        setBooks(list);
      } catch (e) {
        console.error("Failed to fetch published books:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const openBook = async (book: Book) => {
    const hasPublished = book.chapters.some(ch => ch.publish === true);
    if (!hasPublished) return;

    setSelectedBook(book);
    setActiveChapterIdx(0);
    setActivePageIdx(0);
    setMobileTab("home");
    document.body.style.overflow = "hidden";

    try {
      await updateDoc(doc(db, "books", book.id), { views: increment(1) });
    } catch (e) {
      console.error(e);
    }
  };

  const closeBook = () => {
    setSelectedBook(null);
    setMobileTab("home");
    document.body.style.overflow = "auto";
    stopReading();
  };

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(books.map(b => b.style)))],
    [books]
  );

  const filteredBooks = useMemo(() => {
    return books
      .filter(b =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.authorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.excerpt ?? "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(b => selectedCategory === "All" || b.style === selectedCategory)
      .sort((a, b) => {
        if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        if (sortBy === "views") return (b.views ?? 0) - (a.views ?? 0);
        if (sortBy === "readTime") {
          const aMin = Math.ceil(a.wordCount / 200);
          const bMin = Math.ceil(b.wordCount / 200);
          return aMin - bMin;
        }
        return 0;
      })
      .map(b => ({
        ...b,
        readTime: `${Math.max(1, Math.ceil(b.wordCount / 200))} min read`,
      }));
  }, [books, searchTerm, selectedCategory, sortBy]);

  const chapters = selectedBook?.chapters.filter(ch => ch.publish === true) ?? [];
  const currentPage = chapters[activeChapterIdx]?.pages?.[activePageIdx];
  const currentPageContent = DOMPurify.sanitize(
    currentPage?.html ?? "<p>No content.</p>"
  );
  const totalPagesInChapter = chapters[activeChapterIdx]?.pages?.length ?? 1;
  const totalPages = chapters.reduce((a, c) => a + c.pages.length, 0);
  const currentPageGlobal =
    chapters
      .slice(0, activeChapterIdx)
      .reduce((a, c) => a + c.pages.length, 0) + activePageIdx + 1;

  const isFirstPage = activeChapterIdx === 0 && activePageIdx === 0;
  const isLastPage =
    activeChapterIdx === chapters.length - 1 &&
    activePageIdx === totalPagesInChapter - 1;

  useEffect(() => {
    if (selectedBook && totalPages > 0) {
      const prog = (currentPageGlobal / totalPages) * 100;
      setReadingProgress(prog);
    }
  }, [currentPageGlobal, totalPages, selectedBook]);

  const startReading = () => {
    if (!selectedBook || isSpeaking) return;
    stopReading();
    const text = currentPage?.html.replace(/<[^>]*>/g, "").trim() ?? "";
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.9;
    utt.pitch = 1;
    utt.lang = "en-US";
    utt.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true);
  };

  const pauseReading = () => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const resumeReading = () => {
    if (isSpeaking && isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedBook) return;
      if (e.key === "ArrowRight") nextPage();
      if (e.key === "ArrowLeft") prevPage();
      if (e.key === " ") {
        e.preventDefault();
        isSpeaking
          ? isPaused
            ? resumeReading()
            : pauseReading()
          : startReading();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedBook, isSpeaking, isPaused]);

  const nextPage = () => {
    if (activePageIdx < totalPagesInChapter - 1) {
      setActivePageIdx(activePageIdx + 1);
    } else if (activeChapterIdx < chapters.length - 1) {
      setActiveChapterIdx(activeChapterIdx + 1);
      setActivePageIdx(0);
    }
  };

  const prevPage = () => {
    if (activePageIdx > 0) {
      setActivePageIdx(activePageIdx - 1);
    } else if (activeChapterIdx > 0) {
      setActiveChapterIdx(activeChapterIdx - 1);
      setActivePageIdx(chapters[activeChapterIdx - 1].pages.length - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="p-8 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-2xl"
        >
          <Loader2 className="h-12 w-12 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex flex-col ${
              isDark
                ? "bg-gray-900 text-white"
                : "bg-gradient-to-br from-amber-50 via-rose-50 to-indigo-50"
            }`}
            onClick={closeBook}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="h-full w-full flex flex-col md:flex-row"
              onClick={e => e.stopPropagation()}
            >
              {/* DESKTOP SIDEBAR */}
              <div className={`hidden md:block md:w-80 lg:w-96 ${isDark ? "bg-gray-900/95" : "bg-white/95"} backdrop-blur-3xl border-r ${isDark ? "border-gray-800" : "border-gray-200/50"} flex flex-col`}>
                <div className={`p-6 border-b ${isDark ? "border-gray-800" : "border-gray-200/50"} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <BookOpen className={`h-7 w-7 ${isDark ? "text-amber-400" : "text-indigo-600"}`} />
                    <h2 className={`text-2xl font-bold bg-clip-text text-transparent ${isDark ? "bg-gradient-to-r from-amber-400 to-pink-400" : "bg-gradient-to-r from-indigo-600 to-purple-600"}`}>
                      Contents
                    </h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-1">
                    {chapters.map((ch, ci) => (
                      <div key={ch.id}>
                        <div
                          onClick={() => {
                            setActiveChapterIdx(ci);
                            setActivePageIdx(0);
                          }}
                          className={`flex items-center justify-between py-3 px-4 rounded-lg cursor-pointer transition-all ${
                            activeChapterIdx === ci
                              ? isDark
                                ? "bg-amber-900/50 text-amber-200"
                                : "bg-indigo-100 text-indigo-700"
                              : isDark
                              ? "hover:bg-gray-800"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 font-semibold">
                            <ChevronDown className={`h-5 w-5 transition-transform ${activeChapterIdx === ci ? "rotate-0" : "-rotate-90"}`} />
                            <span>{ch.title}</span>
                          </div>
                          <span className="text-sm opacity-70">{ch.pages.length} p.</span>
                        </div>

                        {activeChapterIdx === ci && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="ml-8 mt-1 space-y-0.5">
                            {ch.pages.map((p, pi) => (
                              <div
                                key={p.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePageIdx(pi);
                                }}
                                className={`py-2.5 px-4 rounded-md text-sm cursor-pointer transition-colors ${
                                  activePageIdx === pi
                                    ? isDark
                                      ? "bg-amber-800/60 text-amber-100 font-medium"
                                      : "bg-indigo-200 text-indigo-800 font-medium"
                                    : isDark
                                    ? "hover:bg-gray-800"
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                {p.title}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* READER MAIN AREA */}
              <div className="flex-1 flex flex-col relative">
                {/* MOBILE HEADER WITH MENU */}
                <div className={`${isDark ? "bg-gray-900/95" : "bg-white/90"} backdrop-blur-3xl border-b ${isDark ? "border-gray-800" : "border-gray-200/50"} p-4 flex items-center justify-between z-50`}>
                  <div className="flex items-center gap-3">
                    <button onClick={closeBook} className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 transition">
                      <ChevronLeft className="h-6 w-6 text-white" />
                    </button>
                    <h2 className="text-lg font-bold truncate max-w-40">{selectedBook.title}</h2>
                  </div>
                  <button onClick={() => setMobileTab(mobileTab === "pages" ? "home" : "pages")} className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700">
                    <Menu className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className={`h-1 ${isDark ? "bg-gray-700" : "bg-gray-200"} relative`}>
                  <motion.div
                    className="absolute inset-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${readingProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Content + Tabs */}
                <div className="flex-1 overflow-hidden flex flex-col pb-20 md:pb-0">
                  <AnimatePresence mode="wait">
                    {mobileTab === "home" && (
                      <motion.div
                        key="reader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-y-auto p-6 pt-8"
                      >
                        <article className="max-w-4xl mx-auto">
                          <motion.div
                            key={`${activeChapterIdx}-${activePageIdx}`}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`prose prose-lg ${isDark ? "prose-invert" : ""} max-w-none`}
                            style={{ fontSize: `${fontSize}px` }}
                            dangerouslySetInnerHTML={{ __html: currentPageContent }}
                          />
                        </article>
                      </motion.div>
                    )}

                    {mobileTab === "pages" && (
                      <motion.div
                        key="toc"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-y-auto p-6 bg-white/95 dark:bg-gray-900/95"
                      >
                        <h3 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Table of Contents</h3>
                        <div className="space-y-3">
                          {chapters.map((ch, ci) => (
                            <div key={ch.id}>
                              <div
                                onClick={() => {
                                  setActiveChapterIdx(ci);
                                  setActivePageIdx(0);
                                  setMobileTab("home");
                                }}
                                className={`flex items-center justify-between py-4 px-5 rounded-2xl cursor-pointer transition-all font-semibold shadow-md ${
                                  activeChapterIdx === ci
                                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                                    : isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-50 hover:bg-gray-100"
                                }`}
                              >
                                <span>{ch.title}</span>
                                <span className="text-sm opacity-80">{ch.pages.length} pages</span>
                              </div>
                              {activeChapterIdx === ci && (
                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="ml-5 mt-2 space-y-2">
                                  {ch.pages.map((p, pi) => (
                                    <div
                                      key={p.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePageIdx(pi);
                                        setMobileTab("home");
                                      }}
                                      className={`py-3 px-5 rounded-xl text-sm cursor-pointer transition ${
                                        activePageIdx === pi
                                          ? "bg-indigo-500 text-white font-medium shadow-lg"
                                          : isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
                                      }`}
                                    >
                                      {p.title}
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {mobileTab === "settings" && (
                      <motion.div
                        key="settings"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 overflow-y-auto p-8 bg-white/95 dark:bg-gray-900/95"
                      >
                        <h3 className="text-3xl font-bold mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Reader Settings</h3>
                        <div className="max-w-md mx-auto space-y-10">
                          <div className="space-y-8 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-medium">Font Size</span>
                              <div className="flex items-center gap-4">
                                <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className="p-4 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-lg hover:scale-110 transition">
                                  <span className="text-2xl font-bold">A-</span>
                                </button>
                                <span className="text-3xl font-bold w-16 text-center">{fontSize}</span>
                                <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="p-4 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-lg hover:scale-110 transition">
                                  <span className="text-2xl font-bold">A+</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-lg font-medium">Dark Mode</span>
                              <button
                                onClick={() => setIsDark(!isDark)}
                                className={`p-6 rounded-3xl shadow-2xl transition-all hover:scale-110 ${
                                  isDark 
                                    ? "bg-gradient-to-br from-yellow-400 to-orange-500" 
                                    : "bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700"
                                }`}
                              >
                                {isDark ? <Sun className="h-10 w-10" /> : <Moon className="h-10 w-10" />}
                              </button>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-lg font-medium">Read Aloud</span>
                              <div className="flex gap-4">
                                <button
                                  onClick={isSpeaking ? (isPaused ? resumeReading : pauseReading) : startReading}
                                  className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl hover:scale-110 transition"
                                >
                                  {isSpeaking ? (isPaused ? <Play className="h-10 w-10" /> : <Pause className="h-10 w-10" />) : <Volume2 className="h-10 w-10" />}
                                </button>
                                <button onClick={stopReading} className="p-6 rounded-3xl bg-gradient-to-br from-red-500 to-pink-600 shadow-2xl hover:scale-110 transition">
                                  <VolumeX className="h-10 w-10" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* FLOATING NAVIGATION ARROWS */}
                <div className="md:hidden fixed bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-12 z-50 pointer-events-none">
                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={prevPage}
                    disabled={isFirstPage}
                    className={`pointer-events-auto p-3.5 rounded-full shadow-2xl backdrop-blur-xl transition-all ${
                      isFirstPage 
                        ? "bg-gray-500/70 cursor-not-allowed" 
                        : "bg-gradient-to-br from-indigo-500 to-purple-600 hover:shadow-purple-500/60"
                    }`}
                  >
                    <ChevronLeft className="h-7 w-7 text-white" />
                  </motion.button>

                  <div className="px-5 py-2.5 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border border-gray-200/50 dark:border-gray-700">
                    <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                      {currentPageGlobal} / {totalPages}
                    </span>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={nextPage}
                    disabled={isLastPage}
                    className={`pointer-events-auto p-3.5 rounded-full shadow-2xl backdrop-blur-xl transition-all ${
                      isLastPage 
                        ? "bg-gray-500/70 cursor-not-allowed" 
                        : "bg-gradient-to-br from-indigo-500 to-purple-600 hover:shadow-purple-500/60"
                    }`}
                  >
                    <ChevronRight className="h-7 w-7 text-white" />
                  </motion.button>
                </div>

                {/* DESKTOP BOTTOM NAV */}
                <div className={`hidden md:flex ${isDark ? "bg-gray-900/95 text-white" : "bg-white/90 text-gray-900"} backdrop-blur-3xl border-t ${isDark ? "border-gray-800" : "border-gray-200/50"} p-4 items-center justify-between`}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={prevPage}
                    className={`flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
                      isFirstPage
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-gray-700 to-gray-600 text-white hover:shadow-lg"
                    }`}
                  >
                    <ChevronLeft className="h-6 w-6" /> Previous
                  </motion.div>

                  <div className="flex items-center gap-3 text-lg font-bold">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                      {currentPageGlobal} / {totalPages}
                    </span>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={nextPage}
                    className={`flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
                      isLastPage
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:shadow-xl"
                    }`}
                  >
                    Next <ChevronRight className="h-6 w-6" />
                  </motion.div>
                </div>

                {/* MOBILE BOTTOM TABS - ALWAYS VISIBLE */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-gray-300 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl z-50">
                  <div className="flex justify-around py-2.5">
                    <button
                      onClick={() => setMobileTab("home")}
                      className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-2xl transition-all ${
                        mobileTab === "home" 
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-110" 
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <HomeIcon className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Read</span>
                    </button>
                    <button
                      onClick={() => setMobileTab("pages")}
                      className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-2xl transition-all ${
                        mobileTab === "pages" 
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-110" 
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Pages</span>
                    </button>
                    <button
                      onClick={() => setMobileTab("settings")}
                      className={`flex flex-col items-center gap-0.5 px-6 py-2 rounded-2xl transition-all ${
                        mobileTab === "settings" 
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-110" 
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Settings</span>
                    </button>
                  </div>
                </div>

                {/* Desktop Floating Controls - FULLY RESTORED */}
                <div className="hidden md:flex absolute top-4 right-4 gap-3">
                  <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"}`}>A-</button>
                  <button onClick={() => setFontSize(Math.min(28, fontSize + 2))} className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"}`}>A+</button>
                  <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"}`}>
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                  <button onClick={isSpeaking ? (isPaused ? resumeReading : pauseReading) : startReading} className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"}`}>
                    {isSpeaking ? (isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />) : <Volume2 className="h-5 w-5" />}
                  </button>
                  <button onClick={stopReading} className={`p-2 rounded-lg ${isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"}`}>
                    <VolumeX className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL LIBRARY VIEW */}
      {!selectedBook && (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-900">
          <section className="relative overflow-hidden py-20 px-4">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-pink-600/10 blur-3xl" />
            <div className="relative max-w-7xl mx-auto text-center">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"
              >
                Read Real Lives
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-700 dark:text-gray-200 font-medium"
              >
                Every story is a legacy. Every page is a memory.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <div className="relative w-full max-w-lg">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search titles, authors, excerpts..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 text-lg"
                  />
                </div>
              </motion.div>
            </div>
          </section>

          <section className="py-8 px-4 sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-700/50 z-40">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-5 items-center justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="px-5 py-3 rounded-xl bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c === "All" ? "All Styles" : c}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="px-5 py-3 rounded-xl bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="rating">Top Rated</option>
                  <option value="views">Most Read</option>
                  <option value="readTime">Quick Reads</option>
                </select>
                <button
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  className="p-3 rounded-xl bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 hover:bg-white dark:hover:bg-gray-600 cursor-pointer transition"
                >
                  {viewMode === "grid" ? <Grid className="h-6 w-6" /> : <ListIcon className="h-6 w-6" />}
                </button>
              </div>
              <div className="text-base font-medium text-gray-600 dark:text-gray-300 flex items-center gap-4">
                <span>{filteredBooks.length} books</span>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
                  <span>Live</span>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                {viewMode === "grid" ? (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                  >
                    {filteredBooks.map((b, i) => (
                      <BookCard key={b.id} book={b} index={i} onRead={() => openBook(b)} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    {filteredBooks.map((b, i) => (
                      <BookListItem key={b.id} book={b} index={i} onRead={() => openBook(b)} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {filteredBooks.length === 0 && !loading && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-32">
                  <BookOpen className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">No Books Found</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">Try adjusting your filters.</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setSearchTerm(""); setSelectedCategory("All"); setSortBy("rating"); }}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-xl hover:shadow-2xl cursor-pointer transition"
                  >
                    Clear Filters
                  </motion.button>
                </motion.div>
              )}
            </div>
          </section>

          <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
            <div className="max-w-7xl mx-auto text-center">
              <motion.h3 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-extrabold mb-6">
                Your Story Matters
              </motion.h3>
              <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-90 font-medium">
                Write it. Share it. Preserve it forever.
              </motion.p>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
                <Link
                  href={isLoggedIn ? "/story" : "/signup"}
                  className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-indigo-600 font-extrabold text-xl shadow-2xl hover:shadow-3xl transition-all"
                >
                  {isLoggedIn ? "Write Now" : "Start Free"} <ArrowRight className="h-7 w-7" />
                </Link>
              </motion.div>
            </div>
          </section>
        </div>
      )}
    </>
  );

  function BookCard({ book, index, onRead }: { book: Book & { readTime: string }; index: number; onRead: () => void }) {
    const safeImg = book.coverImage || "https://via.placeholder.com/400x600.png?text=No+Cover";

    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -12, scale: 1.03 }}
        onClick={onRead}
        className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl cursor-pointer transition-all"
      >
        <div className="relative h-72 overflow-hidden">
          <img src={safeImg} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="flex items-center justify-between">
              <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-bold shadow-lg">
                {book.style}
              </span>
              <div className="flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-lg font-bold">{(book.rating ?? 4.5).toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-3 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {book.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-base line-clamp-2 leading-relaxed">
            {book.excerpt ?? "No excerpt available."}
          </p>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-5">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              by {book.authorEmail.split("@")[0]}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{book.readTime}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span className="font-medium">{formatNumber(book.views)}</span>
              </span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-center shadow-lg hover:shadow-xl transition"
          >
            Read Story
          </motion.button>
        </div>
      </motion.div>
    );
  }

  function BookListItem({ book, index, onRead }: { book: Book & { readTime: string }; index: number; onRead: () => void }) {
    const safeImg = book.coverImage || "https://via.placeholder.com/400x600.png?text=No+Cover";

    return (
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.08 }}
        whileHover={{ x: 12 }}
        onClick={onRead}
        className="group flex items-center gap-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl cursor-pointer transition-all"
      >
        <div className="relative shrink-0">
          <img src={safeImg} alt={book.title} className="w-36 h-48 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 shadow-lg" />
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md">
            {book.style}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">{book.title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-base line-clamp-2 leading-relaxed">
            {book.excerpt ?? "No excerpt available."}
          </p>
          <div className="flex items-center justify-between text-base">
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">
                by {book.authorEmail.split("@")[0]}
              </p>
              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-3 mt-1">
                <Clock className="h-4 w-4" /> {book.readTime} • <Eye className="h-4 w-4" /> {formatNumber(book.views)} views
              </p>
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-yellow-500">
                <Star className="h-6 w-6 fill-current" />
                <span className="text-xl font-bold">{(book.rating ?? 4.5).toFixed(1)}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition"
              >
                Read Now
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
}