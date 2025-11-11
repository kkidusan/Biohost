"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, Eye, Star, ArrowRight, Zap,
  Loader2, X, Menu, ChevronRight, Home as HomeIcon, ChevronLeft, ChevronDown,
  Grid, List as ListIcon, Volume2, VolumeX, Pause, Play,
  Settings, FileText, Sparkles, Bell, BellOff
} from "lucide-react";
import Link from "next/link";
import {
  collection, getDocs, query, doc, updateDoc, increment, Timestamp,
  addDoc, serverTimestamp, where
} from "firebase/firestore";
import { db } from "../firebaseconfig";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
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
  const { user, isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [readingProgress, setReadingProgress] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"read" | "pages" | "settings">("read");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const [showSubscribeAlert, setShowSubscribeAlert] = useState(false);

  const formatNumber = (n?: number): string => (n ?? 0).toLocaleString();
  const isDark = theme === "dark";

  // Load subscriptions
  useEffect(() => {
    const savedSubs = localStorage.getItem("bookSubscriptions");
    if (savedSubs) {
      setSubscriptions(new Set(JSON.parse(savedSubs)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("bookSubscriptions", JSON.stringify(Array.from(subscriptions)));
  }, [subscriptions]);

  // Subscribe with Firebase
  const subscribeToBook = async (bookId: string, authorEmail: string) => {
    if (!user?.email) return;

    const subRef = collection(db, "subscribers");
    const q = query(
      subRef,
      where("bookId", "==", bookId),
      where("subscriberEmail", "==", user.email)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      await addDoc(subRef, {
        bookId,
        authorEmail,
        subscriberEmail: user.email,
        subscribedAt: serverTimestamp(),
        active: true
      });
    } else {
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, { active: true });
    }

    const newSubs = new Set(subscriptions);
    newSubs.add(bookId);
    setSubscriptions(newSubs);
    setShowSubscribeAlert(true);
    setTimeout(() => setShowSubscribeAlert(false), 3000);
  };

  const unsubscribeFromBook = async (bookId: string) => {
    if (!user?.email) return;

    const subRef = collection(db, "subscribers");
    const q = query(
      subRef,
      where("bookId", "==", bookId),
      where("subscriberEmail", "==", user.email)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docRef = snap.docs[0].ref;
      await updateDoc(docRef, { active: false });
    }

    const newSubs = new Set(subscriptions);
    newSubs.delete(bookId);
    setSubscriptions(newSubs);
  };

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
    setMobileTab("read");
    setMobileMenuOpen(false);
    document.body.style.overflow = "hidden";

    try {
      await updateDoc(doc(db, "books", book.id), { views: increment(1) });
      const updatedBooks = books.map(b => b.id === book.id ? { ...b, views: (b.views ?? 0) + 1 } : b);
      setBooks(updatedBooks);
    } catch (e) {
      console.error(e);
    }
  };

  const closeBook = () => {
    setSelectedBook(null);
    setMobileTab("read");
    setMobileMenuOpen(false);
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
        return 0;
      });
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
      <div className={`min-h-screen flex items-center justify-center ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900"
          : "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"
      }`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="p-8 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-2xl backdrop-blur-xl"
        >
          <Loader2 className="h-12 w-12 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Subscribe Alert */}
      <AnimatePresence>
        {showSubscribeAlert && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-2xl flex items-center gap-3"
          >
            <Bell className="h-5 w-5 animate-pulse" />
            Subscribed! You'll get updates.
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex flex-col ${
              isDark
                ? "bg-gradient-to-br from-gray-900 via-slate-900 to-purple-900"
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
              {/* Desktop Sidebar */}
              <div className={`hidden md:block md:w-80 lg:w-96 ${
                isDark ? "bg-gray-800/70" : "bg-white/70"
              } backdrop-blur-xl border-r ${
                isDark ? "border-gray-700/50" : "border-gray-200/50"
              } flex flex-col`}>
                <div className={`p-6 border-b ${
                  isDark ? "border-gray-700/50" : "border-gray-200/50"
                } flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <BookOpen className={`h-7 w-7 ${
                      isDark ? "text-blue-400" : "text-blue-600"
                    }`} />
                    <h2 className={`text-2xl font-bold bg-clip-text text-transparent ${
                      isDark
                        ? "bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
                        : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
                    }`}>
                      Contents
                    </h2>
                  </div>
                  <button
                    onClick={() => subscriptions.has(selectedBook.id) 
                      ? unsubscribeFromBook(selectedBook.id) 
                      : subscribeToBook(selectedBook.id, selectedBook.authorEmail)
                    }
                    className={`p-2 rounded-xl ${subscriptions.has(selectedBook.id) ? "bg-yellow-500" : "bg-gradient-to-r from-blue-500 to-purple-600"} text-white`}
                  >
                    {subscriptions.has(selectedBook.id) ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                  </button>
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
                          className={`flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer transition-all group ${
                            activeChapterIdx === ci
                              ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                              : isDark
                                ? "hover:bg-gray-700/50"
                                : "hover:bg-white/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 font-semibold">
                            <ChevronDown className={`h-5 w-5 transition-transform ${
                              activeChapterIdx === ci ? "rotate-0" : "-rotate-90"
                            }`} />
                            <span>{ch.title}</span>
                          </div>
                          <span className="text-sm opacity-70">{ch.pages.length} p.</span>
                        </div>

                        {activeChapterIdx === ci && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="ml-8 mt-1 space-y-0.5"
                          >
                            {ch.pages.map((p, pi) => (
                              <div
                                key={p.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePageIdx(pi);
                                }}
                                className={`py-2.5 px-4 rounded-lg text-sm cursor-pointer transition-colors ${
                                  activePageIdx === pi
                                    ? "bg-blue-600 text-white font-medium"
                                    : isDark
                                      ? "hover:bg-gray-700"
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

              {/* Reader Main Area */}
              <div className="flex-1 flex flex-col relative">
                {/* Desktop Header with Settings */}
                <div className={`hidden md:flex ${
                  isDark ? "bg-gray-800/80" : "bg-white/80"
                } backdrop-blur-xl border-b ${
                  isDark ? "border-gray-700/50" : "border-gray-200/50"
                } p-4 items-center justify-between z-50`}>
                  <button onClick={closeBook} className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <h2 className="text-xl font-bold truncate max-w-xl">{selectedBook.title}</h2>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className="p-3 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-lg">
                      <span className="text-lg font-bold">A-</span>
                    </button>
                    <span className="text-lg font-bold w-12 text-center">{fontSize}</span>
                    <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className="p-3 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-lg">
                      <span className="text-lg font-bold">A+</span>
                    </button>
                    <button
                      onClick={isSpeaking ? (isPaused ? resumeReading : pauseReading) : startReading}
                      className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
                    >
                      {isSpeaking ? (isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />) : <Volume2 className="h-5 w-5" />}
                    </button>
                    <button onClick={stopReading} className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 shadow-lg">
                      <VolumeX className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Mobile Header */}
                <div className={`md:hidden ${
                  isDark ? "bg-gray-800/80" : "bg-white/80"
                } backdrop-blur-xl border-b ${
                  isDark ? "border-gray-700/50" : "border-gray-200/50"
                } p-4 flex items-center justify-between z-50`}>
                  <button onClick={closeBook} className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <h2 className="text-lg font-bold truncate max-w-40">{selectedBook.title}</h2>
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className={`h-1 ${
                  isDark ? "bg-gray-700" : "bg-gray-200"
                } relative`}>
                  <motion.div
                    className="absolute inset-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${readingProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {mobileTab === "read" && (
                      <motion.div
                        key="reader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="min-h-full"
                      >
                        <article className="px-6 py-8 max-w-4xl mx-auto">
                          <motion.div
                            key={`${activeChapterIdx}-${activePageIdx}`}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={`prose prose-lg max-w-none ${
                              isDark ? "prose-invert" : ""
                            } leading-relaxed`}
                            style={{ fontSize: `${fontSize}px` }}
                            dangerouslySetInnerHTML={{ __html: currentPageContent }}
                          />
                          <div className="h-32" />
                        </article>
                      </motion.div>
                    )}

                    {mobileTab === "pages" && (
                      <motion.div
                        key="toc"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`flex-1 overflow-y-auto p-6 ${
                          isDark ? "bg-gray-800/70" : "bg-white/70"
                        } backdrop-blur-xl`}
                      >
                        <h3 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                          Table of Contents
                        </h3>
                        <div className="space-y-3">
                          {chapters.map((ch, ci) => (
                            <div key={ch.id}>
                              <div
                                onClick={() => {
                                  setActiveChapterIdx(ci);
                                  setActivePageIdx(0);
                                  setMobileTab("read");
                                  setMobileMenuOpen(false);
                                }}
                                className={`flex items-center justify-between py-4 px-5 rounded-2xl cursor-pointer transition-all font-semibold shadow-md ${
                                  activeChapterIdx === ci
                                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                                    : isDark
                                      ? "bg-gray-700/50 hover:bg-gray-600/70"
                                      : "bg-white/50 hover:bg-white/70"
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
                                        setMobileTab("read");
                                        setMobileMenuOpen(false);
                                      }}
                                      className={`py-3 px-5 rounded-xl text-sm cursor-pointer transition ${
                                        activePageIdx === pi
                                          ? "bg-blue-500 text-white font-medium shadow-lg"
                                          : isDark
                                            ? "hover:bg-gray-700"
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
                      </motion.div>
                    )}

                    {mobileTab === "settings" && (
                      <motion.div
                        key="settings"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`flex-1 overflow-y-auto p-8 ${
                          isDark ? "bg-gray-800/70" : "bg-white/70"
                        } backdrop-blur-xl`}
                      >
                        <h3 className="text-3xl font-bold mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                          Reader Settings
                        </h3>
                        <div className="max-w-md mx-auto space-y-10">
                          <div className={`space-y-8 ${
                            isDark ? "bg-gray-800/50" : "bg-white/50"
                          } backdrop-blur-xl rounded-3xl p-8 shadow-2xl`}>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-medium">Font Size</span>
                              <div className="flex items-center gap-4">
                                <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className={`p-4 rounded-2xl ${
                                  isDark
                                    ? "bg-gradient-to-br from-gray-700 to-gray-800"
                                    : "bg-gradient-to-br from-gray-200 to-gray-300"
                                } shadow-lg hover:scale-110 transition`}>
                                  <span className="text-2xl font-bold">A-</span>
                                </button>
                                <span className="text-3xl font-bold w-16 text-center">{fontSize}</span>
                                <button onClick={() => setFontSize(Math.min(32, fontSize + 2))} className={`p-4 rounded-2xl ${
                                  isDark
                                    ? "bg-gradient-to-br from-gray-700 to-gray-800"
                                    : "bg-gradient-to-br from-gray-200 to-gray-300"
                                } shadow-lg hover:scale-110 transition`}>
                                  <span className="text-2xl font-bold">A+</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-lg font-medium">Read Aloud</span>
                              <div className="flex gap-4">
                                <button
                                  onClick={isSpeaking ? (isPaused ? resumeReading : pauseReading) : startReading}
                                  className="p-6 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl hover:scale-110 transition"
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

                {/* Desktop Bottom Nav */}
                <div className={`hidden md:flex ${
                  isDark ? "bg-gray-800/80" : "bg-white/80"
                } backdrop-blur-xl border-t ${
                  isDark ? "border-gray-700/50" : "border-gray-200/50"
                } p-4 items-center justify-between`}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={prevPage}
                    className={`flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
                      isFirstPage
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    }`}
                  >
                    <ChevronLeft className="h-6 w-6" /> Previous
                  </motion.div>

                  <div className="flex items-center gap-3 text-lg font-bold">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
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
                        : "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                    }`}
                  >
                    Next <ChevronRight className="h-6 w-6" />
                  </motion.div>
                </div>

                {/* Mobile Vertical Menu */}
                <AnimatePresence>
                  {mobileMenuOpen && (
                    <motion.div
                      initial={{ x: -300 }}
                      animate={{ x: 0 }}
                      exit={{ x: -300 }}
                      className={`md:hidden fixed inset-y-0 left-0 w-72 z-50 ${
                        isDark ? "bg-gray-900/95" : "bg-white/95"
                      } backdrop-blur-2xl shadow-2xl flex flex-col`}
                    >
                      <div className="p-6 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                          Menu
                        </h3>
                        <button
                          onClick={() => setMobileMenuOpen(false)}
                          className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {[
                          { tab: "read" as const, icon: HomeIcon, label: "Read" },
                          { tab: "pages" as const, icon: FileText, label: "Pages" },
                          { tab: "settings" as const, icon: Settings, label: "Settings" },
                        ].map(({ tab, icon: Icon, label }) => (
                          <button
                            key={tab}
                            onClick={() => {
                              setMobileTab(tab);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all text-left font-semibold text-lg ${
                              mobileTab === tab
                                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl scale-105"
                                : isDark
                                  ? "bg-gray-800/70 hover:bg-gray-700"
                                  : "bg-white/70 hover:bg-white/90"
                            }`}
                          >
                            <Icon className="h-7 w-7" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Library View */}
      {!selectedBook && (
        <div className={`min-h-screen ${
          isDark
            ? "bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900"
            : "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"
        }`}>
          {/* Hero */}
          <section className="relative overflow-hidden py-24 px-4">
            <div className={`absolute inset-0 ${
              isDark
                ? "bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"
                : "bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20"
            } blur-3xl`}>
              <motion.div
                animate={{ x: [0, 100, 0], y: [0, -100, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className={`absolute top-20 left-20 w-96 h-96 ${
                  isDark
                    ? "bg-gradient-to-br from-blue-400/30 to-purple-500/30"
                    : "bg-gradient-to-br from-blue-400/30 to-purple-500/30"
                } rounded-full blur-3xl`}
              />
              <motion.div
                animate={{ x: [0, -150, 0], y: [0, 100, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className={`absolute bottom-20 right-20 w-80 h-80 ${
                  isDark
                    ? "bg-gradient-to-tr from-pink-400/30 to-orange-500/30"
                    : "bg-gradient-to-tr from-pink-400/30 to-orange-500/30"
                } rounded-full blur-3xl`}
              />
            </div>

            <div className="relative max-w-7xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mb-6"
              >
                <span className={`inline-block px-4 py-1 rounded-full ${
                  isDark ? "bg-white/10" : "bg-white/20"
                } backdrop-blur-md border ${
                  isDark ? "border-white/20" : "border-white/30"
                } text-sm font-medium text-white shadow-md`}>
                  <Zap className="inline h-4 w-4 mr-1" />
                  {filteredBooks.length} Stories Live
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className={`text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent ${
                  isDark
                    ? "bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
                    : "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
                } drop-shadow-lg`}
              >
                Read Real Lives
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-xl md:text-2xl mb-10 max-w-4xl mx-auto text-gray-700 dark:text-gray-200"
              >
                Every story is a legacy. Every page is a memory.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <div className="relative w-full max-w-lg">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search titles, authors, excerpts..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={`w-full pl-12 pr-5 py-4 rounded-full ${
                      isDark ? "bg-gray-800/80" : "bg-white/80"
                    } backdrop-blur-xl border ${
                      isDark ? "border-gray-700/50" : "border-gray-200/50"
                    } text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-lg shadow-lg`}
                  />
                </div>
              </motion.div>
            </div>
          </section>

          {/* Filters */}
          <section className={`py-8 px-4 sticky top-0 ${
            isDark ? "bg-gray-800/60" : "bg-white/60"
          } backdrop-blur-xl border-b ${
            isDark ? "border-gray-700/50" : "border-gray-200/50"
          } z-40`}>
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-5 items-center justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className={`px-5 py-3 rounded-xl ${
                    isDark ? "bg-gray-700/70" : "bg-white/70"
                  } backdrop-blur-md border ${
                    isDark ? "border-gray-600/50" : "border-gray-200/50"
                  } text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                  className={`px-5 py-3 rounded-xl ${
                    isDark ? "bg-gray-700/70" : "bg-white/70"
                  } backdrop-blur-md border ${
                    isDark ? "border-gray-600/50" : "border-gray-200/50"
                  } text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="rating">Top Rated</option>
                  <option value="views">Most Read</option>
                </select>
                <button
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  className={`p-3 rounded-xl ${
                    isDark ? "bg-gray-700/70" : "bg-white/70"
                  } backdrop-blur-md border ${
                    isDark ? "border-gray-600/50" : "border-gray-200/50"
                  } hover:bg-white dark:hover:bg-gray-600 cursor-pointer transition`}
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

          {/* Books */}
          <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <AnimatePresence mode="wait">
                {viewMode === "grid" ? (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  >
                    {filteredBooks.map((b, i) => (
                      <BookCard
                        key={b.id}
                        book={b}
                        index={i}
                        onRead={() => openBook(b)}
                        isSubscribed={subscriptions.has(b.id)}
                        onSubscribe={() => subscribeToBook(b.id, b.authorEmail)}
                      />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {filteredBooks.map((b, i) => (
                      <BookListItem
                        key={b.id}
                        book={b}
                        index={i}
                        onRead={() => openBook(b)}
                        isSubscribed={subscriptions.has(b.id)}
                        onSubscribe={() => subscribeToBook(b.id, b.authorEmail)}
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
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">No Books Found</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">Try adjusting your filters.</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setSearchTerm(""); setSelectedCategory("All"); setSortBy("rating"); }}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-xl hover:shadow-2xl transition"
                  >
                    Clear Filters
                  </motion.button>
                </motion.div>
              )}
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-20 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className={`max-w-4xl mx-auto text-center rounded-3xl p-10 shadow-2xl backdrop-blur-xl border ${
                isDark
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 border-white/20"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 border-white/20"
              }`}
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {isLoggedIn ? "Keep Sharing Your Story" : "Ready to Share Your Story?"}
              </h3>
              <p className="text-white/90 mb-8 text-lg">
                {isLoggedIn
                  ? "Your legacy is live. Keep sharing and inspiring."
                  : "Join thousands who’ve preserved their legacy with BioHost."}
              </p>
              <motion.a
                href={isLoggedIn ? "/story" : "/signup"}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-blue-600 dark:text-blue-600 font-bold text-lg shadow-lg hover:shadow-xl transition"
              >
                {isLoggedIn ? "Write Now" : "Start Free"} <Sparkles className="h-5 w-5" />
              </motion.a>
            </motion.div>
          </section>
        </div>
      )}
    </>
  );
}

// BookCard Component
function BookCard({ 
  book, 
  index, 
  onRead, 
  isSubscribed, 
  onSubscribe 
}: { 
  book: Book; 
  index: number; 
  onRead: () => void; 
  isSubscribed: boolean; 
  onSubscribe: () => void; 
}) {
  const safeImg = book.coverImage || "https://via.placeholder.com/400x600.png?text=No+Cover";
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onClick={onRead}
      className={`group relative ${
        isDark ? "bg-gray-800/70" : "bg-white/70"
      } backdrop-blur-xl rounded-2xl p-6 shadow-lg border ${
        isDark ? "border-gray-700/50" : "border-gray-200/50"
      } overflow-hidden cursor-pointer`}
    >
      <Link href="#" className="absolute inset-0 z-10"><span className="sr-only">Read {book.title}</span></Link>
      <div className="relative h-64 mb-4 overflow-hidden rounded-xl">
        <img src={safeImg} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          onClick={(e) => { e.stopPropagation(); onSubscribe(); }}
          className={`absolute top-3 right-3 p-2 rounded-full ${isSubscribed ? "bg-yellow-500" : "bg-white/80"} backdrop-blur-md shadow-lg`}
        >
          {isSubscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </button>
      </div>
      <h3 className={`text-xl font-semibold ${
        isDark ? "text-white" : "text-gray-900"
      } mb-2 relative z-20 line-clamp-1`}>
        {book.title}
      </h3>
      <p className={`${
        isDark ? "text-gray-300" : "text-gray-600"
      } text-sm mb-3 line-clamp-2`}>{book.excerpt ?? "No excerpt."}</p>
      <div className={`flex items-center justify-between text-sm ${
        isDark ? "text-gray-400" : "text-gray-500"
      }`}>
        <span>by {book.authorEmail.split("@")[0]}</span>
      </div>
      <motion.div
        className="mt-4 relative z-20"
        initial={{ opacity: 0, x: -10 }}
        whileInView={{ opacity: 1, x: 0 }}
      >
        <div className={`inline-flex items-center gap-1.5 ${
          isDark ? "text-blue-400" : "text-blue-600"
        } font-semibold text-sm hover:gap-2.5 transition-all`}>
          Read now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </motion.div>
    </motion.div>
  );
}

// BookListItem Component
function BookListItem({ 
  book, 
  index, 
  onRead, 
  isSubscribed, 
  onSubscribe 
}: { 
  book: Book; 
  index: number; 
  onRead: () => void; 
  isSubscribed: boolean; 
  onSubscribe: () => void; 
}) {
  const safeImg = book.coverImage || "https://via.placeholder.com/400x600.png?text=No+Cover";
  const isDark = document.documentElement.classList.contains("dark");

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ x: 12 }}
      onClick={onRead}
      className={`group flex items-center gap-6 ${
        isDark ? "bg-gray-800/70" : "bg-white/70"
      } backdrop-blur-xl rounded-2xl p-6 shadow-lg border ${
        isDark ? "border-gray-700/50" : "border-gray-200/50"
      } cursor-pointer transition-all`}
    >
      <Link href="#" className="absolute inset-0 z-10"><span className="sr-only">Read {book.title}</span></Link>
      <img src={safeImg} alt={book.title} className="w-32 h-44 object-cover rounded-xl group-hover:scale-105 transition-transform shadow-md" />
      <div className="flex-1">
        <h3 className={`text-2xl font-bold ${
          isDark ? "text-white" : "text-gray-900"
        } mb-2`}>{book.title}</h3>
        <p className={`${
          isDark ? "text-gray-300" : "text-gray-600"
        } mb-3 line-clamp-2`}>{book.excerpt ?? "No excerpt."}</p>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-semibold ${
              isDark ? "text-gray-100" : "text-gray-900"
            }`}>by {book.authorEmail.split("@")[0]}</p>
            <p className={`text-sm ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}>{book.views?.toLocaleString()} views</p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={(e) => { e.stopPropagation(); onSubscribe(); }}
              className={`p-3 rounded-full ${isSubscribed ? "bg-yellow-500" : "bg-gradient-to-r from-blue-500 to-purple-600"} text-white shadow-lg`}
            >
              {isSubscribed ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg"
            >
              Read Now
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}