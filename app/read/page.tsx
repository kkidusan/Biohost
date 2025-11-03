"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, Clock, Eye, Star, ArrowRight, Zap,
  Loader2, X, Menu, ChevronRight, Home, ChevronLeft, ChevronDown,
  Grid, List as ListIcon
} from "lucide-react";
import Link from "next/link";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebaseconfig";
import { useAuth } from "../context/AuthContext";
import DOMPurify from 'dompurify'; // npm install dompurify

interface Page {
  title: string;
  content: string; // HTML string
}

interface Chapter {
  title: string;
  pages: Page[];
}

interface Biography {
  id: string;
  title: string;
  author: string;
  authorEmail: string;
  authorId: string;
  country?: string;
  category: string;
  excerpt: string;
  coverImage?: string | null;
  readTime: string;
  rating?: number;
  views?: number;
  createdAt: any;
  updatedAt?: any;
  wordCount?: number;
  chapters?: Chapter[];
  content?: string;
}

export default function ReadPage() {
  const { isLoggedIn } = useAuth();
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedStory, setSelectedStory] = useState<Biography | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [showMenu, setShowMenu] = useState(true);

  // === STRIP HTML & COUNT WORDS ===
  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]*>/g, "").trim();
  };

  // === PARSE CHAPTERS (Structured → HTML Fallback) ===
  const getChapters = (bio: Biography): Chapter[] => {
    if (bio.chapters && Array.isArray(bio.chapters) && bio.chapters.length > 0) {
      return bio.chapters.map(ch => ({
        title: ch.title || "Untitled Chapter",
        pages: Array.isArray(ch.pages)
          ? ch.pages.map(p => ({
              title: p.title || "Page",
              content: (p as any).html || p.content || "<p>No content.</p>",
            }))
          : []
      }));
    }

    if (typeof bio.content === "string" && bio.content.trim()) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(bio.content, "text/html");
      const chapters: Chapter[] = [];
      let currentChapter: Chapter | null = null;

      doc.body.childNodes.forEach(node => {
        if (node.nodeType === 1) {
          const el = node as HTMLElement;
          const tag = el.tagName;

          if (tag === "H1" || tag === "H2") {
            currentChapter = { title: el.textContent?.trim() || "Chapter", pages: [] };
            chapters.push(currentChapter);
          } else if (currentChapter) {
            if (!currentChapter.pages.length) {
              currentChapter.pages.push({ title: "Page 1", content: "" });
            }
            currentChapter.pages[currentChapter.pages.length - 1].content += el.outerHTML;
          }
        }
      });

      if (chapters.length === 0) {
        chapters.push({
          title: "Full Story",
          pages: [{ title: "Page 1", content: bio.content }]
        });
      }

      return chapters;
    }

    return [{
      title: "No Content",
      pages: [{ title: "Page 1", content: "<p>This story has no content.</p>" }]
    }];
  };

  // === FETCH BIOGRAPHIES ===
  useEffect(() => {
    const fetchBiographies = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "biographies"));
        const snapshot = await getDocs(q);
        const rawData = snapshot.docs.map(doc => {
          const raw = doc.data();
          return {
            id: doc.id,
            title: raw.title || "Untitled",
            author: raw.author || raw.authorEmail?.split("@")[0] || "Anonymous",
            authorEmail: raw.authorEmail || "",
            authorId: raw.authorId || "",
            category: raw.category || "Memoir",
            excerpt: raw.excerpt || "No excerpt available.",
            coverImage: raw.coverImage || null,
            chapters: raw.chapters || undefined,
            content: typeof raw.content === "string" ? raw.content : undefined,
            wordCount: typeof raw.wordCount === "number" ? raw.wordCount : undefined,
            views: raw.views ?? 0,
            rating: raw.rating ?? 4.7,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          };
        });

        const withReadTime: Biography[] = rawData.map(bio => {
          const words = bio.wordCount ||
            (typeof bio.content === "string" ? stripHtml(bio.content).split(/\s+/).filter(Boolean).length : 0) ||
            0;
          const minutes = Math.max(1, Math.ceil(words / 200));
          return { ...bio, readTime: `${minutes} min read` };
        });

        setBiographies(withReadTime);
      } catch (err) {
        console.error("Failed to fetch biographies", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBiographies();
  }, []);

  // === FILTERS & SORTING ===
  const categories = useMemo(() => ["All", ...Array.from(new Set(biographies.map(b => b.category)))], [biographies]);
  const countries = useMemo(() => ["All", ...Array.from(new Set(biographies.map(b => b.country).filter(Boolean)))], [biographies]);

  const filteredBiographies = useMemo(() => {
    return biographies
      .filter(bio =>
        bio.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bio.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bio.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(bio => selectedCategory === "All" || bio.category === selectedCategory)
      .filter(bio => selectedCountry === "All" || bio.country === selectedCountry)
      .sort((a, b) => {
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "views") return (b.views || 0) - (a.views || 0);
        if (sortBy === "readTime") return parseInt(a.readTime) - parseInt(b.readTime);
        return 0;
      });
  }, [biographies, searchTerm, selectedCategory, selectedCountry, sortBy]);

  // === READER CONTROLS ===
  const openStory = (bio: Biography) => {
    setSelectedStory(bio);
    setActiveChapterIdx(0);
    setActivePageIdx(0);
    setShowMenu(true);
    document.body.style.overflow = "hidden";
  };

  const closeStory = () => {
    setSelectedStory(null);
    document.body.style.overflow = "auto";
  };

  const formatNumber = (num: number | undefined): string => (num ?? 0).toLocaleString();

  const chapters = selectedStory ? getChapters(selectedStory) : [];
  const currentPageContent = DOMPurify.sanitize(chapters[activeChapterIdx]?.pages?.[activePageIdx]?.content || "");
  const currentPageTitle = chapters[activeChapterIdx]?.pages?.[activePageIdx]?.title || "Page";
  const totalPagesInChapter = chapters[activeChapterIdx]?.pages?.length || 1;
  const isFirstPage = activeChapterIdx === 0 && activePageIdx === 0;
  const isLastPage = chapters.length > 0 &&
    activeChapterIdx === chapters.length - 1 &&
    activePageIdx === chapters[activeChapterIdx].pages.length - 1;

  // === LOADING STATE ===
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
      {/* === IMMERSIVE READER === */}
      <AnimatePresence>
        {selectedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-900 z-50 overflow-hidden"
            onClick={closeStory}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="h-full w-full flex flex-col md:flex-row"
              onClick={e => e.stopPropagation()}
            >
              {/* LEFT SIDEBAR */}
              <div className={`md:w-1/3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transition-all duration-500 ${showMenu ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} fixed md:static inset-y-0 left-0 z-10`}>
                <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                      Contents
                    </h2>
                  </div>
                  <div
                    onClick={() => setShowMenu(false)}
                    className="md:hidden p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {chapters.map((chapter, cIdx) => (
                    <motion.div
                      key={cIdx}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: cIdx * 0.1 }}
                      onClick={() => { setActiveChapterIdx(cIdx); setActivePageIdx(0); }}
                      className={`p-5 rounded-2xl transition-all cursor-pointer shadow-lg backdrop-blur-xl border ${
                        activeChapterIdx === cIdx
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent shadow-2xl'
                          : 'bg-white/70 dark:bg-gray-800/70 border-gray-200/50 dark:border-gray-700/50 hover:shadow-xl hover:scale-105'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-lg">
                        <span className="flex items-center gap-3">
                          <ChevronDown className={`h-6 w-6 transition-transform ${activeChapterIdx === cIdx ? 'rotate-0' : '-rotate-90'}`} />
                          {chapter.title}
                        </span>
                        <span className="text-sm opacity-80">{chapter.pages.length} pages</span>
                      </div>

                      {activeChapterIdx === cIdx && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="mt-4 space-y-2"
                        >
                          {chapter.pages.map((page, pIdx) => (
                            <motion.div
                              key={pIdx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: pIdx * 0.05 }}
                              onClick={(e) => { e.stopPropagation(); setActivePageIdx(pIdx); }}
                              className={`px-5 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer backdrop-blur-md ${
                                activePageIdx === pIdx
                                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shadow-md'
                                  : 'bg-white/50 dark:bg-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-600/50'
                              }`}
                            >
                              {page.title}
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={closeStory}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white font-bold text-center shadow-xl hover:shadow-2xl cursor-pointer flex items-center justify-center gap-3"
                  >
                    <Home className="h-6 w-6" />
                    Back to Gallery
                  </motion.div>
                </div>
              </div>

              {/* MAIN CONTENT */}
              <div className="flex-1 flex flex-col bg-gradient-to-br from-white/80 via-blue-50/40 to-purple-50/30 dark:from-gray-900/80 dark:via-slate-900/40 dark:to-purple-900/30">
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-3xl border-b border-gray-200/50 dark:border-gray-700/50 p-4 flex items-center justify-between">
                  <div
                    onClick={() => setShowMenu(true)}
                    className="md:hidden p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <Menu className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-4 text-sm font-semibold">
                    <span className="text-gray-600 dark:text-gray-400">{currentPageTitle}</span>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                      Chapter {activeChapterIdx + 1}
                    </span>
                  </div>
                  <div
                    onClick={closeStory}
                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 md:p-14">
                  <article className="max-w-5xl mx-auto">
                    <motion.div
                      key={`${activeChapterIdx}-${activePageIdx}`}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="prose prose-lg dark:prose-invert max-w-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50"
                      dangerouslySetInnerHTML={{ __html: currentPageContent }}
                    />
                  </article>
                </div>

                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-3xl border-t border-gray-200/50 dark:border-gray-700/50 p-4 flex items-center justify-between">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (activePageIdx > 0) setActivePageIdx(activePageIdx - 1);
                      else if (activeChapterIdx > 0) {
                        setActiveChapterIdx(activeChapterIdx - 1);
                        const pages = chapters[activeChapterIdx - 1].pages;
                        setActivePageIdx(pages.length - 1);
                      }
                    }}
                    className={`flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
                      isFirstPage
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 hover:shadow-lg'
                    }`}
                  >
                    <ChevronLeft className="h-6 w-6" /> Previous
                  </motion.div>

                  <div className="flex items-center gap-3 text-lg font-bold">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                      Page {activePageIdx + 1}
                    </span>
                    <span className="text-gray-400">of</span>
                    <span className="text-gray-600 dark:text-gray-300">{totalPagesInChapter}</span>
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (activePageIdx < totalPagesInChapter - 1) {
                        setActivePageIdx(activePageIdx + 1);
                      } else if (activeChapterIdx < chapters.length - 1) {
                        setActiveChapterIdx(activeChapterIdx + 1);
                        setActivePageIdx(0);
                      }
                    }}
                    className={`flex items-center gap-3 px-7 py-3.5 rounded-2xl font-bold transition-all cursor-pointer ${
                      isLastPage
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl'
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

      {/* === GALLERY === */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
        <section className="relative overflow-hidden py-20 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-3xl" />
          <div className="relative max-w-7xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
            >
              Discover Life Stories
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-gray-700 dark:text-gray-200 font-medium"
            >
              Tap any story to dive into a full immersive reading experience.
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
                  placeholder="Search by title, author, or excerpt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/50 text-lg"
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
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-5 py-3 rounded-xl bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
                ))}
              </select>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="px-5 py-3 rounded-xl bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {countries.map(c => (
                  <option key={c} value={c}>{c === "All" ? "All Countries" : c}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-5 py-3 rounded-xl bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rating">Top Rated</option>
                <option value="views">Most Viewed</option>
                <option value="readTime">Quick Reads</option>
              </select>
              <div
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="p-3 rounded-xl bg-white/70 dark:bg-gray-700/70 backdrop-blur-md border border-gray-200/50 dark:border-gray-600/50 hover:bg-white dark:hover:bg-gray-600 cursor-pointer"
              >
                {viewMode === "grid" ? <Grid className="h-6 w-6" /> : <ListIcon className="h-6 w-6" />}
              </div>
            </div>
            <div className="text-base font-medium text-gray-600 dark:text-gray-300 flex items-center gap-4">
              <span>{filteredBiographies.length} stories</span>
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
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {filteredBiographies.map((bio, i) => (
                    <StoryCard key={bio.id} bio={bio} index={i} onRead={() => openStory(bio)} />
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
                  {filteredBiographies.map((bio, i) => (
                    <StoryListItem key={bio.id} bio={bio} index={i} onRead={() => openStory(bio)} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {filteredBiographies.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-32"
              >
                <BookOpen className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">No Stories Found</h3>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">Try adjusting your filters.</p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSearchTerm(""); setSelectedCategory("All"); setSelectedCountry("All"); }}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-xl hover:shadow-2xl cursor-pointer"
                >
                  Clear Filters
                </motion.div>
              </motion.div>
            )}
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto text-center">
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-extrabold mb-6"
            >
              Your Story Awaits
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-90 font-medium"
            >
              Join thousands sharing their legacy with the world.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                href={isLoggedIn ? "/story" : "/signup"}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-blue-600 font-extrabold text-xl shadow-2xl hover:shadow-3xl transition-all"
              >
                {isLoggedIn ? "Write Now" : "Start Free"} <ArrowRight className="h-7 w-7" />
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}

// === STORY CARD ===
function StoryCard({ bio, index, onRead }: { bio: Biography; index: number; onRead: () => void }) {
  const safeImage = bio.coverImage || "https://via.placeholder.com/400x600.png?text=No+Cover";

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
        <img src={safeImage} alt={bio.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <div className="flex items-center justify-between">
            <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-sm font-bold shadow-lg">
              {bio.category}
            </span>
            <div className="flex items-center gap-1.5">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span className="text-lg font-bold">{(bio.rating || 4.5).toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-3 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {bio.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 text-base line-clamp-2 leading-relaxed">{bio.excerpt}</p>
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-5">
          <span className="font-semibold text-gray-900 dark:text-gray-100">by {bio.author}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{bio.readTime}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{formatNumber(bio.views)}</span>
            </span>
          </div>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-center shadow-lg hover:shadow-xl"
        >
          Read Story
        </motion.div>
      </div>
    </motion.div>
  );
}

// === LIST ITEM ===
function StoryListItem({ bio, index, onRead }: { bio: Biography; index: number; onRead: () => void }) {
  const safeImage = bio.coverImage || "https://via.placeholder.com/400x600.png?text=No+Cover";

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
        <img src={safeImage} alt={bio.title} className="w-36 h-48 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 shadow-lg" />
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold shadow-md">
          {bio.category}
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">{bio.title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4 text-base line-clamp-2 leading-relaxed">{bio.excerpt}</p>
        <div className="flex items-center justify-between text-base">
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100">by {bio.author}</p>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-3 mt-1">
              <Clock className="h-4 w-4" /> {bio.readTime} • <Eye className="h-4 w-4" /> {formatNumber(bio.views)} views
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-yellow-500">
              <Star className="h-6 w-6 fill-current" />
              <span className="text-xl font-bold">{(bio.rating || 4.5).toFixed(1)}</span>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl"
            >
              Read Now
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// === HELPER ===
const formatNumber = (num: number | undefined): string => (num ?? 0).toLocaleString();