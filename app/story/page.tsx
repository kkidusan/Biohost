// src/app/story-studio/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, BookOpen, Settings, Eye, EyeOff, X } from "lucide-react";
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
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Chapter {
  id: string;
  title: string;
  publish: boolean;
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

  useEffect(() => {
    if (!user?.email) return;
    fetchBooks();
  }, [user?.email]);

  const fetchBooks = async () => {
    try {
      const q = query(collection(db, "books"), where("authorEmail", "==", user.email));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "Untitled",
          cover: data.coverImage,
          chapters: (data.chapters || []).map((ch: any) => ({
            id: ch.id,
            title: ch.title,
            publish: ch.publish ?? false,
          })),
          wordCount: data.wordCount || 0,
        };
      });
      setBooks(list);
    } catch {
      toast.error("Failed to load books");
    } finally {
      setLoadingBooks(false);
    }
  };

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
        },
      ],
      style: "Memoir",
      wordCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "books", newId), defaultData);
      setBooks(prev => [...prev, {
        id: newId,
        title: defaultData.title,
        cover: "",
        chapters: defaultData.chapters.map((ch: any) => ({
          id: ch.id,
          title: ch.title,
          publish: ch.publish ?? false,
        })),
        wordCount: 0,
      }]);
      router.push(`/story-studio/${newId}`);
      toast.success("New book created!");
    } catch {
      toast.error("Failed to create book");
    }
  };

  const deleteBook = async (id: string) => {
    if (!confirm("Delete this book forever?")) return;
    try {
      await deleteDoc(doc(db, "books", id));
      setBooks(b => b.filter(x => x.id !== id));
      toast.success("Book deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const enterEditor = (id: string) => router.push(`/story-studio/${id}`);

  const openSettings = (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    if (book) setSettingsBook(book);
  };

  const togglePublish = async (chapterId: string) => {
    if (!settingsBook || savingChapterId) return;
    setSavingChapterId(chapterId);

    const updatedChapters = settingsBook.chapters.map(ch =>
      ch.id === chapterId ? { ...ch, publish: !ch.publish } : ch
    );

    try {
      await updateDoc(doc(db, "books", settingsBook.id), {
        chapters: updatedChapters,
        updatedAt: serverTimestamp(),
      });
      const updatedBook = { ...settingsBook, chapters: updatedChapters };
      setSettingsBook(updatedBook);
      setBooks(prev => prev.map(b => b.id === settingsBook.id ? updatedBook : b));
      toast.success(`Chapter ${updatedChapters.find(c => c.id === chapterId)?.publish ? "published" : "unpublished"}`);
    } catch {
      toast.error("Update failed");
    } finally {
      setSavingChapterId(null);
    }
  };

  if (!isLoggedIn) {
    return <div className="flex items-center justify-center min-h-screen text-gray-600">Please log in</div>;
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const publishedCount = settingsBook ? settingsBook.chapters.filter(c => c.publish).length : 0;

  return (
    <>
      <Toaster position="top-center" />

      {/* MAIN LIST */}
      <div className={`min-h-screen bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900 flex items-center justify-center p-4 ${settingsBook ? "blur-sm" : ""}`}>
        <div className="w-full max-w-6xl">
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-6xl font-bold bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              My Story Studio
            </h1>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">Your stories, beautifully told</p>
          </div>

          <button
            onClick={createNewBook}
            className="w-full mb-10 p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-4 text-xl font-semibold"
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {books.map((b) => (
                <div
                  key={b.id}
                  onClick={() => enterEditor(b.id)}
                  className="group relative bg-white dark:bg-gray-800 rounded-3xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer"
                >
                  <div className="aspect-3/4 bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                    {b.cover ? (
                      <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <BookOpen className="h-16 w-16 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-500">No cover</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-xl truncate">{b.title}</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      {b.chapters.length} chapters • {b.wordCount} words
                    </p>
                  </div>

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                    <button
                      onClick={(e) => { e.stopPropagation(); enterEditor(b.id); }}
                      className="p-4 rounded-full bg-white"
                    >
                      <Edit2 className="h-6 w-6 text-indigo-600" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBook(b.id); }}
                      className="p-4 rounded-full bg-white"
                    >
                      <Trash2 className="h-6 w-6 text-red-600" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openSettings(b.id); }}
                      className="p-4 rounded-full bg-white"
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

      {/* SETTINGS MODAL */}
      {settingsBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setSettingsBook(null)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-linear-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Book Settings</h2>
                  <p className="text-sm opacity-90">{settingsBook.title}</p>
                </div>
                <button
                  onClick={() => setSettingsBook(null)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl">
                  <p className="text-3xl font-bold text-indigo-600">{settingsBook.chapters.length}</p>
                  {!isMobile && <p className="text-sm text-gray-600 mt-1">Chapters</p>}
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl">
                  <p className="text-3xl font-bold text-purple-600">{settingsBook.wordCount}</p>
                  {!isMobile && <p className="text-sm text-gray-600 mt-1">Words</p>}
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl">
                  <p className="text-3xl font-bold text-emerald-600">{publishedCount}</p>
                  {!isMobile && <p className="text-sm text-gray-600 mt-1">Published</p>}
                </div>
              </div>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Publish Status</h3>
              <div className="space-y-3">
                {settingsBook.chapters.map((chapter, idx) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-linear-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{chapter.title}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {chapter.publish ? (
                            <> <Eye className="h-3 w-3" /> Published </>
                          ) : (
                            <> <EyeOff className="h-3 w-3" /> Draft </>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => togglePublish(chapter.id)}
                      disabled={savingChapterId === chapter.id}
                      className={`relative w-16 h-9 rounded-full transition-all ${chapter.publish ? "bg-emerald-500" : "bg-gray-300"}`}
                    >
                      <div
                        className={`absolute top-1 w-7 h-7 bg-white rounded-full shadow transition-transform ${chapter.publish ? "translate-x-7" : "translate-x-1"}`}
                      >
                        {savingChapterId === chapter.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600 mx-auto mt-1.5" />
                        )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSettingsBook(null)}
                className="w-full py-3 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl"
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