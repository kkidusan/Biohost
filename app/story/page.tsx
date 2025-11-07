"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
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
  getDoc,               // <-- NEW
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [books, setBooks] = useState<BookData[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [settingsBook, setSettingsBook] = useState<BookData | null>(null);
  const [savingChapterId, setSavingChapterId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<"publish" | "unpublish" | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [emailNotifs, setEmailNotifs] = useState<boolean | null>(null); // null = not loaded

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  // -----------------------------------------------------------------
  // Load user notification preference from "settings" collection
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!user?.uid) {
      setEmailNotifs(null);
      return;
    }

    const loadNotifSetting = async () => {
      try {
        const settingsRef = doc(db, "settings", user.uid);
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data = snap.data();
          setEmailNotifs(data.emailNotifs ?? true); // default true
        } else {
          setEmailNotifs(true); // default true for new users
        }
      } catch (err) {
        console.error("Failed to load notification setting:", err);
        setEmailNotifs(true); // fallback
      }
    };

    loadNotifSetting();
  }, [user?.uid]);

  const fetchBooks = useCallback(async () => {
    if (!user?.email) return;
    setLoadingBooks(true);
    try {
      const q = query(
        collection(db, "books"),
        where("authorEmail", "==", user.email)
      );
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
    if (book) {
      setSettingsBook(book);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  };

  // -----------------------------------------------------------------
  // SEND EMAIL ONLY IF emailNotifs === true OR null (not loaded)
  // -----------------------------------------------------------------
  const sendPublishEmail = async (chapterTitle: string, published: boolean) => {
    if (emailNotifs === false) {
      console.log("Email notifications disabled – skipping send.");
      return;
    }

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
      console.warn("Email send failed (non-critical):", err);
      // Don't show toast – user already got success for publish
    }
  };

  const togglePublish = async (chapterId: string) => {
    if (!settingsBook || savingChapterId || !user) return;
    setSavingChapterId(chapterId);

    const chapter = settingsBook.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const newPublish = !chapter.publish;
    const updatedChapters = settingsBook.chapters.map((ch) =>
      ch.id === chapterId
        ? { ...ch, publish: newPublish, isRead: newPublish ? 0 : ch.isRead }
        : ch
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
      setBooks((prev) =>
        prev.map((b) => (b.id === settingsBook.id ? updatedBook : b))
      );

      // SEND EMAIL ONLY IF NOTIFS ENABLED
      await sendPublishEmail(chapter.title, newPublish);

      toast.success(
        newPublish
          ? "Chapter published & reads reset!"
          : "Chapter unpublished"
      );
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

    const updatedChapters = settingsBook.chapters.map(ch => 
      ch.publish ? ch : { ...ch, publish: true, isRead: 0 }
    );

    await saveChaptersBatch(updatedChapters, "All unpublished chapters published!");
  };

  const unpublishAll = async () => {
    if (!settingsBook || batchLoading) return;
    setBatchLoading("unpublish");

    const updatedChapters = settingsBook.chapters.map(ch => 
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
      setBooks((prev) =>
        prev.map((b) => (b.id === settingsBook.id ? updatedBook : b))
      );

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
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Please log in
      </div>
    );
  }

  const publishedCount = settingsBook
    ? settingsBook.chapters.filter((c) => c.publish).length
    : 0;

  return (
    <>
      <Toaster position="top-center" />

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
        <div className={`min-h-screen flex flex-col ${settingsBook ? "blur-sm" : ""}`}>
          <div className="flex-1 p-4 pt-8 pb-24">
            <div className="w-full max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  My Story Studio
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                  Your stories, beautifully told
                </p>
              </div>

              <button
                onClick={createNewBook}
                className="w-full mb-10 p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4 text-xl font-semibold hover:shadow-2xl transition-shadow"
              >
                <Plus className="h-8 w-8" />
                Create New Book
              </button>

              {loadingBooks ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                </div>
              ) : books.length === 0 ? (
                <div className="text-center py-20">
                  <BookOpen className="h-24 w-24 mx-auto mb-6 opacity-30" />
                  <p className="text-xl text-gray-500">No books yet. Start writing!</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
                  {books.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => enterEditor(b.id)}
                      className="group relative bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer transition-transform hover:scale-[1.02] h-full flex flex-col"
                    >
                      <div className="aspect-3/4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 relative overflow-hidden">
                        {b.cover ? (
                          <img
                            src={b.cover}
                            alt={b.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <BookOpen className="h-16 w-16 text-gray-400 mb-3" />
                            <span className="text-sm text-gray-500">No cover</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-xl truncate">{b.title}</h3>
                          <p className="text-sm text-gray-500 mt-2">
                            {b.chapters.length} chapters •{" "}
                            {b.wordCount.toLocaleString()} words
                          </p>
                        </div>
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            enterEditor(b.id);
                          }}
                          className="p-4 rounded-full bg-white shadow-lg hover:scale-110 transition"
                        >
                          <Edit2 className="h-6 w-6 text-indigo-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBook(b.id);
                          }}
                          className="p-4 rounded-full bg-white shadow-lg hover:scale-110 transition"
                        >
                          <Trash2 className="h-6 w-6 text-red-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openSettings(b.id);
                          }}
                          className="p-4 rounded-full bg-white shadow-lg hover:scale-110 transition"
                        >
                          <Settings className="h-6 w-6 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {settingsBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div
            className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden my-8 max-h-screen flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex-shrink-0">
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

            <div className="p-6 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl">
                  <p className="text-3xl font-bold text-indigo-600">
                    {settingsBook.chapters.length}
                  </p>
                  <p className="text-xs text-gray-500">Chapters</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl">
                  <p className="text-3xl font-bold text-purple-600">
                    {settingsBook.wordCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">Words</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl">
                  <p className="text-3xl font-bold text-emerald-600">
                    {publishedCount}
                  </p>
                  <p className="text-xs text-gray-500">Published</p>
                </div>
              </div>
            </div>

            <div className="px-6 pt-4 pb-2 flex gap-3 flex-shrink-0">
              <button
                onClick={publishAll}
                disabled={batchLoading !== null}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {batchLoading === "publish" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Globe className="h-5 w-5" />
                )}
                Publish All
              </button>
              <button
                onClick={unpublishAll}
                disabled={batchLoading !== null}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {batchLoading === "unpublish" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GlobeLock className="h-5 w-5" />
                )}
                Unpublish All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2 z-10">
                Publish Status
              </h3>
              <div className="space-y-3">
                {settingsBook.chapters.map((chapter, idx) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{chapter.title}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {chapter.publish ? (
                            <>
                              <Eye className="h-3 w-3" /> Published ({chapter.isRead} reads)
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" /> Draft
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => togglePublish(chapter.id)}
                      disabled={savingChapterId === chapter.id || batchLoading !== null}
                      className={`relative w-16 h-9 rounded-full transition-all ${
                        chapter.publish ? "bg-emerald-500" : "bg-gray-300"
                      } ${savingChapterId === chapter.id ? "opacity-75" : ""}`}
                    >
                      <div
                        className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow-md transition-transform ${
                          chapter.publish ? "translate-x-7" : "translate-x-1"
                        } flex items-center justify-center`}
                      >
                        {savingChapterId === chapter.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => setSettingsBook(null)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:opacity-90 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}