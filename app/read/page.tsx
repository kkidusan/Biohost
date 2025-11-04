"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, Clock, Eye, Star, ArrowRight, Zap,
  Loader2, X, Menu, ChevronRight, Home, ChevronLeft, ChevronDown,
  Grid, List as ListIcon, Volume2, VolumeX, Pause, Play, Sun, Moon
} from "lucide-react";
import Link from "next/link";
import {
  collection, getDocs, query, doc, updateDoc, increment, Timestamp
} from "firebase/firestore";
import { db } from "../firebaseconfig";
import { useAuth } from "../context/AuthContext";
import DOMPurify from "dompurify";

/* ──────────────────────── TYPES ──────────────────────── */
interface Page {
  id: string;
  title: string;
  html: string;
}
interface Chapter {
  id: string;
  title: string;
  pages: Page[];
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

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */
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
  const [showMenu, setShowMenu] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ────── FETCH FROM `books` ────── */
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "books"));
        const snap = await getDocs(q);
        const list: Book[] = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          views: d.data().views ?? 0,
          rating: d.data().rating ?? 4.7,
        })) as Book[];
        setBooks(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  /* ────── INCREMENT VIEWS ────── */
  const openBook = async (book: Book) => {
    setSelectedBook(book);
    setActiveChapterIdx(0);
    setActivePageIdx(0);
    setShowMenu(true);
    document.body.style.overflow = "hidden";

    try {
      await updateDoc(doc(db, "books", book.id), { views: increment(1) });
    } catch (e) {
      console.error(e);
    }
  };

  const closeBook = () => {
    setSelectedBook(null);
    document.body.style.overflow = "auto";
    stopReading();
  };

  /* ────── FILTERS & SORTING ────── */
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

  /* ────── READER STATE ────── */
  const chapters = selectedBook?.chapters ?? [];
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

  /* ────── PROGRESS ────── */
  useEffect(() => {
    if (selectedBook) {
      const prog = totalPages ? (currentPageGlobal / totalPages) * 100 : 0;
      setReadingProgress(prog);
    }
  }, [currentPageGlobal, totalPages, selectedBook]);

  /* ────── TEXT-TO-SPEECH ────── */
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

  /* ────── KEYBOARD NAV ────── */
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
    if (activePageIdx < totalPagesInChapter - 1) setActivePageIdx(activePageIdx + 1);
    else if (activeChapterIdx < chapters.length - 1) {
      setActiveChapterIdx(activeChapterIdx + 1);
      setActivePageIdx(0);
    }
  };
  const prevPage = () => {
    if (activePageIdx > 0) setActivePageIdx(activePageIdx - 1);
    else if (activeChapterIdx > 0) {
      setActiveChapterIdx(activeChapterIdx - 1);
      setActivePageIdx(
        chapters[activeChapterIdx - 1].pages.length - 1
      );
    }
  };

  /* ────── HELPERS ────── */
  const formatNumber = (n?: number): string => (n ?? 0).toLocaleString();

  /* ────── LOADING UI ────── */
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
      {/* ────── IMMERSIVE READER ────── */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 overflow-hidden ${
              isDark
                ? "bg-gray-800 text-white"
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
              {/* LEFT SIDEBAR */}
              <div
                className={`md:w-80 lg:w-96 ${
                  isDark ? "bg-gray-900/95" : "bg-white/95"
                } backdrop-blur-3xl border-r ${
                  isDark ? "border-gray-800" : "border-gray-200/50"
                } flex flex-col transition-all duration-500 ${
                  showMenu
                    ? "translate-x-0"
                    : "-translate-x-full md:translate-x-0"
                } fixed md:static inset-y-0 left-0 z-10`}
              >
                <div
                  className={`p-6 border-b ${
                    isDark ? "border-gray-800" : "border-gray-200/50"
                  } flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen
                      className={`h-7 w-7 ${
                        isDark ? "text-amber-400" : "text-indigo-600"
                      }`}
                    />
                    <h2
                      className={`text-2xl font-bold bg-clip-text text-transparent ${
                        isDark
                          ? "bg-gradient-to-r from-amber-400 to-pink-400"
                          : "bg-gradient-to-r from-indigo-600 to-purple-600"
                      }`}
                    >
                      Contents
                    </h2>
                  </div>
                  <div
                    onClick={() => setShowMenu(false)}
                    className="md:hidden p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 cursor-pointer"
                  >
                    <X className="h-5 w-5 text-white" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {chapters.map((ch, ci) => (
                    <motion.div
                      key={ch.id}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ci * 0.1 }}
                      onClick={() => {
                        setActiveChapterIdx(ci);
                        setActivePageIdx(0);
                      }}
                      className={`p-5 rounded-2xl transition-all cursor-pointer shadow-lg backdrop-blur-xl border ${
                        activeChapterIdx === ci
                          ? `${
                              isDark
                                ? "bg-gradient-to-r from-amber-500 to-pink-500 text-white border-transparent"
                                : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent"
                            } shadow-2xl`
                          : `${
                              isDark
                                ? "bg-gray-800/70 border-gray-700/50"
                                : "bg-white/70 border-gray-200/50"
                            } hover:shadow-xl hover:scale-105`
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-lg">
                        <span className="flex items-center gap-3">
                          <ChevronDown
                            className={`h-6 w-6 transition-transform ${
                              activeChapterIdx === ci ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                          {ch.title}
                        </span>
                        <span className="text-sm opacity-80">
                          {ch.pages.length} pages
                        </span>
                      </div>

                      {activeChapterIdx === ci && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="mt-4 space-y-2"
                        >
                          {ch.pages.map((p, pi) => (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: pi * 0.05 }}
                              onClick={e => {
                                e.stopPropagation();
                                setActivePageIdx(pi);
                              }}
                              className={`px-5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer backdrop-blur-md ${
                                activePageIdx === pi
                                  ? `${
                                      isDark
                                        ? "bg-amber-900/60 text-amber-200"
                                        : "bg-indigo-100 text-indigo-700"
                                    } shadow-md`
                                  : `${
                                      isDark
                                        ? "bg-gray-700/50 hover:bg-gray-600/50"
                                        : "bg-white/50 hover:bg-white/80"
                                    }`
                              }`}
                            >
                              {p.title}
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div
                  className={`p-6 border-t ${
                    isDark ? "border-gray-800" : "border-gray-200/50"
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeBook}
                    className={`w-full py-4 rounded-2xl ${
                      isDark
                        ? "bg-gradient-to-r from-amber-500 to-pink-500"
                        : "bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500"
                    } text-white font-bold text-center shadow-xl hover:shadow-2xl cursor-pointer flex items-center justify-center gap-3`}
                  >
                    <Home className="h-6 w-6" />
                    Back to Gallery
                  </motion.div>
                </div>
              </div>

              {/* MAIN CONTENT */}
              <div className="flex-1 flex flex-col">
                {/* Top Controls */}
                <div
                  className={`${
                    isDark
                      ? "bg-gray-900/95 text-white"
                      : "bg-white/90 text-gray-900"
                  } backdrop-blur-3xl border-b ${
                    isDark ? "border-gray-800" : "border-gray-200/50"
                  } p-4 flex items-center justify-between`}
                >
                  <div
                    onClick={() => setShowMenu(true)}
                    className="md:hidden p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 cursor-pointer"
                  >
                    <Menu className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                      className={`p-2 rounded-lg ${
                        isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      A-
                    </button>
                    <button
                      onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                      className={`p-2 rounded-lg ${
                        isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      A+
                    </button>
                    <button
                      onClick={() => setIsDark(!isDark)}
                      className={`p-2 rounded-lg ${
                        isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {isDark ? (
                        <Sun className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={
                        isSpeaking
                          ? isPaused
                            ? resumeReading
                            : pauseReading
                          : startReading
                      }
                      className={`p-2 rounded-lg ${
                        isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {isSpeaking ? (
                        isPaused ? (
                          <Play className="h-5 w-5" />
                        ) : (
                          <Pause className="h-5 w-5" />
                        )
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={stopReading}
                      className={`p-2 rounded-lg ${
                        isDark ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      <VolumeX className="h-5 w-5" />
                    </button>
                  </div>

                  <div
                    onClick={closeBook}
                    className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 cursor-pointer"
                  >
                    <X className="h-5 w-5 text-white" />
                  </div>
                </div>

                {/* Progress */}
                <div className={`h-1 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${readingProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 md:p-14">
                  <article className="max-w-4xl mx-auto">
                    <motion.div
                      key={`${activeChapterIdx}-${activePageIdx}`}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                      className={`prose prose-lg ${
                        isDark ? "prose-invert text-white" : ""
                      } max-w-none`}
                      style={{ fontSize: `${fontSize}px` }}
                      dangerouslySetInnerHTML={{ __html: currentPageContent }}
                    />
                  </article>
                </div>

                {/* Bottom Nav */}
                <div
                  className={`${
                    isDark
                      ? "bg-gray-900/95 text-white"
                      : "bg-white/90 text-gray-900"
                  } backdrop-blur-3xl border-t ${
                    isDark ? "border-gray-800" : "border-gray-200/50"
                  } p-4 flex items-center justify-between`}
                >
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────── GALLERY ────── */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-900">
        {/* Hero */}
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

        {/* Filters */}
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
              <div
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                className="p-3 rounded-xl bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 hover:bg-white dark:hover:bg-gray-600 cursor-pointer"
              >
                {viewMode === "grid" ? (
                  <Grid className="h-6 w-6" />
                ) : (
                  <ListIcon className="h-6 w-6" />
                )}
              </div>
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

        {/* Grid / List */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {filteredBooks.map((b, i) => (
                    <BookCard
                      key={b.id}
                      book={b}
                      index={i}
                      onRead={() => openBook(b)}
                    />
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
                    <BookListItem
                      key={b.id}
                      book={b}
                      index={i}
                      onRead={() => openBook(b)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {filteredBooks.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-32"
              >
                <BookOpen className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  No Books Found
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                  Try adjusting your filters.
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                  }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-xl hover:shadow-2xl cursor-pointer"
                >
                  Clear Filters
                </motion.div>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto text-center">
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-extrabold mb-6"
            >
              Your Story Matters
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-90 font-medium"
            >
              Write it. Share it. Preserve it forever.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                href={isLoggedIn ? "/story" : "/signup"}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-indigo-600 font-extrabold text-xl shadow-2xl hover:shadow-3xl transition-all"
              >
                {isLoggedIn ? "Write Now" : "Start Free"}{" "}
                <ArrowRight className="h-7 w-7" />
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ────── CARD / LIST ITEM ────── */
function BookCard({
  book,
  index,
  onRead,
}: {
  book: Book & { readTime: string };
  index: number;
  onRead: () => void;
}) {
  const safeImg =
    book.coverImage || "https://via.placeholder.com/400x600.png?text=No+Cover";

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -12, scale: 1.03 }}
      onClick={onRead}
      className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl cursor-pointer"
    >
      <div className="relative h-72 overflow-hidden">
        <img
          src={safeImg}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <div className="flex items-center justify-between">
            <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-bold shadow-lg">
              {book.style}
            </span>
            <div className="flex items-center gap-1.5">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-bold">
                {(book.rating ?? 4.5).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-3 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {book.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 text-base line-clamp-2 leading-relaxed">
          {book.excerpt ?? ""}
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
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-center shadow-lg hover:shadow-xl"
        >
          Read Story
        </motion.div>
      </div>
    </motion.div>
  );
}

function BookListItem({
  book,
  index,
  onRead,
}: {
  book: Book & { readTime: string };
  index: number;
  onRead: () => void;
}) {
  const safeImg =
    book.coverImage || "https://via.placeholder.com/400x600.png?text=No+Cover";

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ x: 12 }}
      onClick={onRead}
      className="group flex items-center gap-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl cursor-pointer"
    >
      <div className="relative shrink-0">
        <img
          src={safeImg}
          alt={book.title}
          className="w-36 h-48 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 shadow-lg"
        />
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md">
          {book.style}
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
          {book.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 text-base line-clamp-2 leading-relaxed">
          {book.excerpt ?? ""}
        </p>
        <div className="flex items-center justify-between text-base">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">
              by {book.authorEmail.split("@")[0]}
            </p>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-3 mt-1">
              <Clock className="h-4 w-4" /> {book.readTime} •{" "}
              <Eye className="h-4 w-4" /> {formatNumber(book.views)} views
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-yellow-500">
              <Star className="h-6 w-6 fill-current" />
              <span className="text-xl font-bold">
                {(book.rating ?? 4.5).toFixed(1)}
              </span>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl"
            >
              Read Now
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ────── REAL formatNumber (no stub) ────── */
const formatNumber = (n?: number): string => (n ?? 0).toLocaleString();