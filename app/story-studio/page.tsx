"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  BookOpen,
  Settings,
  Eye,
  EyeOff,
  X,
  Globe,
  GlobeLock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { db } from "../firebaseconfig";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Chapter {
  id: string;
  title: string;
  publish: boolean;
  isRead: number;
  pages?: any[];
}

interface BookData {
  id: string;
  title: string;
  cover?: string;
  chapters: Chapter[];
  wordCount: number;
}

export default function StoryList() {
  const { user, isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [books, setBooks] = useState<BookData[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [settingsBook, setSettingsBook] = useState<BookData | null>(null);
  const [savingChapterId, setSavingChapterId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<"publish" | "unpublish" | null>(null);
  const [emailNotifs, setEmailNotifs] = useState<boolean | null>(null);

  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  useEffect(() => {
    if (!user?.uid) {
      setEmailNotifs(null);
      return;
    }

    const loadNotifSetting = async () => {
      try {
        const settingsRef = doc(db, "settings", user.uid);
        const snap = await getDoc(settingsRef);
        setEmailNotifs(snap.exists() ? snap.data()?.emailNotifs ?? true : true);
      } catch (err) {
        console.error("Failed to load notification setting:", err);
        setEmailNotifs(true);
      }
    };

    loadNotifSetting();
  }, [user?.uid]);

  const fetchBooks = useCallback(async () => {
    if (!user?.email) return;
    setLoadingBooks(true);
    try {
      const q = query(collection(db, "books"), where("authorEmail", "==", user.email));
      const snap = await getDocs(q);
      const list: BookData[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "Untitled",
          cover: data.coverImage,
          chapters: (data.chapters || []).map((ch: any) => ({
            id: ch.id,
            title: ch.title ?? "Untitled Chapter",
            publish: ch.publish ?? false,
            isRead: ch.isRead ?? 0,
            pages: ch.pages || [],
          })),
          wordCount: data.wordCount || 0,
        };
      });
      setBooks(list);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load books");
    } finally {
      setLoadingBooks(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const createNewBook = async () => {
    if (!user?.email) return toast.error("Login required");

    const newId = Date.now().toString();
    const defaultData = {
      title: "My Life Story",
      authorId: user.uid,
      authorEmail: user.email,
      coverImage: "",
      chapters: [
        {
          id: "1",
          title: "Chapter 1: My Journey Begins",
          pages: [{ id: "p1", title: "Page 1", content: null, html: "" }],
          publish: false,
          isRead: 0,
        },
      ],
      style: "Memoir",
      wordCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "books", newId), defaultData);
      toast.success("New book created!");
      router.push(`/story-studio/${newId}`);
    } catch {
      toast.error("Failed to create book");
    }
  };

  const deleteBook = async (id: string) => {
    if (!confirm("Delete this book forever?")) return;
    try {
      await deleteDoc(doc(db, "books", id));
      setBooks((b) => b.filter((x) => x.id !== id));
      toast.success("Book deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const enterEditor = (id: string) => router.push(`/story-studio/${id}`);

  const openSettings = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (book) setSettingsBook(book);
  };

  const sendPublishEmail = async (chapterTitle: string, published: boolean) => {
    if (emailNotifs === false) return;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      await fetch("/api/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          bookTitle: settingsBook?.title,
          chapterTitle,
          published,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      console.warn("Email send failed:", err);
    }
  };

  const togglePublish = async (chapterId: string) => {
    if (!settingsBook || savingChapterId || !user) return;
    setSavingChapterId(chapterId);

    const chapter = settingsBook.chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const newPublish = !chapter.publish;
    const updatedChapters = settingsBook.chapters.map((ch) =>
      ch.id === chapterId ? { ...ch, publish: newPublish, isRead: newPublish ? 0 : ch.isRead } : ch
    );

    try {
      await updateDoc(doc(db, "books", settingsBook.id), {
        chapters: updatedChapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          publish: ch.publish,
          isRead: ch.isRead,
          pages: ch.pages || [],
        })),
        updatedAt: serverTimestamp(),
      });

      const updatedBook = { ...settingsBook, chapters: updatedChapters };
      setSettingsBook(updatedBook);
      setBooks((prev) => prev.map((b) => (b.id === settingsBook.id ? updatedBook : b)));

      await sendPublishEmail(chapter.title, newPublish);
      toast.success(newPublish ? "Chapter published!" : "Chapter unpublished");
    } catch (err: any) {
      console.error("Toggle error:", err);
      toast.error("Update failed – try again");
    } finally {
      setSavingChapterId(null);
    }
  };

  const publishAll = async () => {
    if (!settingsBook || batchLoading) return;
    setBatchLoading("publish");

    const updatedChapters = settingsBook.chapters.map((ch) =>
      ch.publish ? ch : { ...ch, publish: true, isRead: 0 }
    );

    await saveChaptersBatch(updatedChapters, "All chapters published!");
  };

  const unpublishAll = async () => {
    if (!settingsBook || batchLoading) return;
    setBatchLoading("unpublish");

    const updatedChapters = settingsBook.chapters.map((ch) =>
      !ch.publish ? ch : { ...ch, publish: false }
    );

    await saveChaptersBatch(updatedChapters, "All chapters unpublished!");
  };

  const saveChaptersBatch = async (updatedChapters: Chapter[], successMsg: string) => {
    if (!settingsBook) return;

    try {
      await updateDoc(doc(db, "books", settingsBook.id), {
        chapters: updatedChapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          publish: ch.publish,
          isRead: ch.isRead,
          pages: ch.pages || [],
        })),
        updatedAt: serverTimestamp(),
      });

      const updatedBook = { ...settingsBook, chapters: updatedChapters };
      setSettingsBook(updatedBook);
      setBooks((prev) => prev.map((b) => (b.id === settingsBook.id ? updatedBook : b)));

      toast.success(successMsg);
    } catch (err) {
      console.error(err);
      toast.error("Batch update failed");
    } finally {
      setBatchLoading(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600 dark:text-gray-400">
        Please log in
      </div>
    );
  }

  const publishedCount = settingsBook ? settingsBook.chapters.filter((c) => c.publish).length : 0;

  return (
    <>
      <Toaster position="top-center" />

      {/* Floating CTA */}
      <motion.a
        href="/story-studio"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white px-5 py-3 rounded-full shadow-2xl font-semibold text-sm backdrop-blur-xl border border-white/20"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        New Story <Sparkles className="h-4 w-4 animate-pulse" />
      </motion.a>

      <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-pink-50/50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 120, 0], y: [0, -80, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-orange-500/20 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 p-6 pt-10 pb-24">
          <div className="max-w-7xl mx-auto">
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 drop-shadow-lg">
                My Story Studio
              </h1>
              <p className="mt-4 text-xl text-gray-700 dark:text-gray-200">
                Craft, refine, and share your legacy
              </p>
            </motion.div>

            {/* Create New Book CTA */}
            <motion.button
              onClick={createNewBook}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full max-w-2xl mx-auto mb-16 p-8 rounded-3xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl shadow-xl border border-white/30 dark:border-gray-700/50 flex items-center justify-center gap-4 text-xl font-bold hover:shadow-2xl transition-all group"
            >
              <Plus className="h-10 w-10 text-indigo-600 dark:text-indigo-400 group-hover:rotate-90 transition-transform" />
              Create New Book
              <ArrowRight className="h-6 w-6 ml-auto text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Stats */}
            <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {[
                { label: "Total Books", value: books.length },
                { label: "Chapters Written", value: books.reduce((a, b) => a + b.chapters.length, 0) },
                { label: "Words Crafted", value: books.reduce((a, b) => a + b.wordCount, 0) },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.15 }}
                  className="p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 text-center"
                >
                  <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                    {stat.value.toLocaleString()}
                  </div>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Books Grid */}
            {loadingBooks ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-3xl animate-pulse" />
                ))}
              </div>
            ) : books.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <BookOpen className="h-24 w-24 mx-auto mb-6 opacity-30 text-gray-400" />
                <p className="text-xl text-gray-500 dark:text-gray-400">No stories yet. Start writing your legacy!</p>
                <motion.button
                  onClick={createNewBook}
                  whileHover={{ scale: 1.05 }}
                  className="mt-6 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium"
                >
                  Create Your First Book
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {books.map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-lg overflow-hidden border border-white/30 dark:border-gray-700/50 cursor-pointer"
                    onClick={() => enterEditor(b.id)}
                  >
                    <div className="aspect-3/4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 relative overflow-hidden">
                      {b.cover ? (
                        <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <BookOpen className="h-16 w-16 mb-2" />
                          <span className="text-sm">No cover</span>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="font-bold text-xl truncate text-gray-900 dark:text-white">{b.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {b.chapters.length} chapters • {b.wordCount.toLocaleString()} words
                      </p>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          enterEditor(b.id);
                        }}
                        className="p-4 rounded-full bg-white shadow-lg"
                      >
                        <Edit2 className="h-6 w-6 text-indigo-600" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBook(b.id);
                        }}
                        className="p-4 rounded-full bg-white shadow-lg"
                      >
                        <Trash2 className="h-6 w-6 text-red-600" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openSettings(b.id);
                        }}
                        className="p-4 rounded-full bg-white shadow-lg"
                      >
                        <Settings className="h-6 w-6 text-gray-700" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* SETTINGS MODAL */}
        {settingsBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSettingsBook(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Book Settings</h2>
                    <p className="text-sm opacity-90">{settingsBook.title}</p>
                  </div>
                  <button
                    onClick={() => setSettingsBook(null)}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6 bg-gray-50/80 dark:bg-gray-700/80 grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Chapters", value: settingsBook.chapters.length, color: "indigo" },
                  { label: "Words", value: settingsBook.wordCount.toLocaleString(), color: "purple" },
                  { label: "Published", value: publishedCount, color: "emerald" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 bg-white/70 dark:bg-gray-800/70 rounded-2xl backdrop-blur"
                  >
                    <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Batch Actions */}
              <div className="px-6 pt-4 pb-2 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={publishAll}
                  disabled={batchLoading !== null}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {batchLoading === "publish" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Globe className="h-5 w-5" />}
                  Publish All
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={unpublishAll}
                  disabled={batchLoading !== null}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {batchLoading === "unpublish" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GlobeLock className="h-5 w-5" />}
                  Unpublish All
                </motion.button>
              </div>

              {/* Chapter List */}
              <div className="max-h-96 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-indigo-100 dark:scrollbar-thumb-purple-600 dark:scrollbar-track-gray-800">
                <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur pb-2">
                  Chapter Visibility
                </h3>
                <div className="space-y-3">
                  {settingsBook.chapters.map((chapter, idx) => (
                    <motion.div
                      key={chapter.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{chapter.title}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            {chapter.publish ? (
                              <>Published ({chapter.isRead} reads)</>
                            ) : (
                              <>Draft</>
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => togglePublish(chapter.id)}
                        disabled={savingChapterId === chapter.id || batchLoading !== null}
                        className={`relative w-16 h-9 rounded-full transition-all ${
                          chapter.publish ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                        } ${savingChapterId === chapter.id ? "opacity-75" : ""}`}
                      >
                        <div
                          className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-md transition-transform flex items-center justify-center ${
                            chapter.publish ? "translate-x-7" : "translate-x-1"
                          }`}
                        >
                          {savingChapterId === chapter.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          )}
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSettingsBook(null)}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 transition"
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </>
  );
}