"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  Reorder,
} from "framer-motion";
import {
  useEditor,
  EditorContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Image as TiptapImage } from "@tiptap/extension-image"; // <-- Only for config
import { Placeholder } from "@tiptap/extension-placeholder";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import {
  Table,
  TableRow,
  TableHeader,
  TableCell,
} from "@tiptap/extension-table";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Extension } from "@tiptap/core";

import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Image as ImageIcon, // <-- This is the ICON, not Tiptap's Image
  Plus,
  Trash2,
  Edit2,
  Eye,
  Sparkles,
  Loader2,
  BookOpen,
  Zap,
  PenTool,
  Heart,
  Upload,
  AlertCircle,
  GripVertical,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Home,
  Palette,
  Save,
  ChevronUp,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseconfig";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

/* ──────────────────────── CONFIG ──────────────────────── */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const LOCAL_BACKUP_KEY = "storyStudio_backup";

/* ──────────────────────── TYPES ──────────────────────── */
interface Page {
  id: string;
  title: string;
  content: any;
  html?: string;
}
interface Chapter {
  id: string;
  title: string;
  pages: Page[];
}
interface WritingStyle {
  name: string;
  icon: any;
  prompt: string;
}
const STYLES: WritingStyle[] = [
  { name: "Memoir",   icon: BookOpen, prompt: "Write in a warm, reflective tone…" },
  { name: "Adventure",icon: Zap,      prompt: "Epic, vivid, sensory details…" },
  { name: "Journal",  icon: PenTool,  prompt: "Today I felt… Here's what happened…" },
  { name: "Poetry",   icon: Heart,    prompt: "Free verse, metaphors, rhythm…" },
];

/* ────── Font-Size Extension ────── */
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize.replace("px", ""),
          renderHTML: (attrs) => (!attrs.fontSize ? {} : { style: `font-size: ${attrs.fontSize}px` }),
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ commands }) => commands.setMark("textStyle", { fontSize: size }),
      unsetFontSize: () => ({ commands }) => commands.setMark("textStyle", { fontSize: null }),
    };
  },
});

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */
export default function StoryStudio() {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();

  /* ────── GLOBAL STATE ────── */
  const [mode, setMode] = useState<"list" | "editor">("list");
  const [books, setBooks] = useState<Array<{ id: string; title: string; cover?: string }>>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [showMyStories, setShowMyStories] = useState(false);

  /* ────── EDITOR STATE ────── */
  const [bookId, setBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("My Life Story");
  const [coverImage, setCoverImage] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [style, setStyle] = useState<WritingStyle>(STYLES[0]);
  const [activeTab, setActiveTab] = useState<"home" | "insert" | "style">("home");

  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline" | "error">("saved");
  const [isPreview, setIsPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUnsavedChanges = useRef(false);
  const navigationConfirmed = useRef(false);
  const isOnline = useRef(true);

  /* ────── TIPTAP EDITOR (FULL SCREEN PAGE) ────── */
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({ placeholder: style.prompt }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-full",
        style: "font-family: Georgia, serif; line-height: 1.7; padding: 2.5cm 2cm;",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      updatePageContent(json, html);
      triggerSave();
    },
  });

  /* ────── WORD COUNT ────── */
  const totalWords = useMemo(() => {
    return chapters.reduce((acc, ch) => {
      return (
        acc +
        ch.pages.reduce((pacc, p) => {
          const txt = p.content?.content?.map((n: any) => (n.type === "text" ? n.text : "")).join(" ") || "";
          return pacc + txt.split(/\s+/).filter(Boolean).length;
        }, 0)
      );
    }, 0);
  }, [chapters]);

  const currentChapter = chapters[activeChapterIdx] ?? null;
  const currentPages = currentChapter?.pages ?? [];

  /* ────── FETCH USER BOOKS ────── */
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      try {
        const q = query(collection(db, "books"), where("authorEmail", "==", user.email));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title ?? "Untitled",
          cover: d.data().coverImage,
        }));
        setBooks(list);
      } catch {
        toast.error("Failed to load your books");
      } finally {
        setLoadingBooks(false);
      }
    })();
  }, [user?.email]);

  /* ────── CREATE NEW BOOK ────── */
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
        },
      ],
      style: "Memoir",
      wordCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "books", newId), defaultData);
      setBooks((prev) => [...prev, { id: newId, title: defaultData.title, cover: "" }]);
      enterEditor(newId);
      toast.success("New book created!");
    } catch {
      toast.error("Could not create book");
    }
  };

  /* ────── DELETE BOOK ────── */
  const deleteBook = async (id: string) => {
    if (!confirm("Delete this book permanently?")) return;
    try {
      await deleteDoc(doc(db, "books", id));
      setBooks((b) => b.filter((x) => x.id !== id));
      if (bookId === id) setMode("list");
      toast.success("Book deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ────── ENTER EDITOR ────── */
  const enterEditor = async (id: string) => {
    setBookId(id);
    setMode("editor");
    await loadBook(id);
  };

  /* ────── LOAD BOOK ────── */
  const loadBook = async (docId: string) => {
    try {
      const snap = await getDoc(doc(db, "books", docId));
      let data: any = {};

      if (snap.exists()) {
        data = snap.data();
      } else {
        const local = localStorage.getItem(LOCAL_BACKUP_KEY);
        if (local) {
          data = JSON.parse(local);
          toast.success("Recovered offline backup");
        }
      }

      const defaultChapter: Chapter = {
        id: "1",
        title: "Chapter 1: My Journey Begins",
        pages: [{ id: "p1", title: "Page 1", content: null, html: "" }],
      };

      setBookTitle(data.title || "My Life Story");
      setCoverImage(data.coverImage || "");
      setChapters(data.chapters?.length ? data.chapters : [defaultChapter]);
      setStyle(STYLES.find((s) => s.name === data.style) || STYLES[0]);
      setActiveChapterIdx(0);
      setActivePageIdx(0);
      setOpenChapters(new Set([data.chapters?.[0]?.id || "1"]));
      hasUnsavedChanges.current = false;
      setSaveStatus("saved");
    } catch {
      toast.error("Failed to load book");
    }
  };

  /* ────── SAVE LOGIC ────── */
  const triggerSave = async () => {
    if (!bookId || !user?.email) return;

    const backup = { title: bookTitle, coverImage, chapters, style: style.name, wordCount: totalWords };
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(backup));

    if (!isOnline.current) {
      setSaveStatus("offline");
      hasUnsavedChanges.current = true;
      return;
    }

    setSaveStatus("saving");
    hasUnsavedChanges.current = true;

    try {
      await setDoc(
        doc(db, "books", bookId),
        {
          title: bookTitle,
          authorEmail: user.email,
          coverImage,
          chapters,
          style: style.name,
          wordCount: totalWords,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveStatus("saved");
      hasUnsavedChanges.current = false;
      localStorage.removeItem(LOCAL_BACKUP_KEY);
    } catch {
      setSaveStatus("error");
    }
  };

  const updatePageContent = (json: any, html: string) => {
    setChapters((prev) =>
      prev.map((ch, ci) =>
        ci === activeChapterIdx
          ? {
              ...ch,
              pages: ch.pages.map((p, pi) =>
                pi === activePageIdx ? { ...p, content: json, html } : p
              ),
            }
          : ch
      )
    );
  };

  /* ────── EDITOR SYNC ────── */
  useEffect(() => {
    if (!editor || !currentChapter) return;
    const page = currentChapter.pages[activePageIdx];
    if (page?.content) {
      editor.commands.setContent(page.content);
      editor.commands.focus();
    } else {
      editor.commands.setContent("");
    }
  }, [activeChapterIdx, activePageIdx, editor, currentChapter]);

  /* ────── ONLINE / OFFLINE ────── */
  useEffect(() => {
    const goOnline = () => {
      isOnline.current = true;
      triggerSave();
    };
    const goOffline = () => {
      isOnline.current = false;
      setSaveStatus("offline");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* ────── CHAPTER CRUD ────── */
  const addChapter = () => {
    const newCh: Chapter = {
      id: Date.now().toString(),
      title: `Chapter ${chapters.length + 1}`,
      pages: [{ id: Date.now() + "-p", title: "Page 1", content: null, html: "" }],
    };
    setChapters((c) => [...c, newCh]);
    setActiveChapterIdx(chapters.length);
    setActivePageIdx(0);
    setOpenChapters((s) => new Set([newCh.id]));
    toast.success("Chapter added");
    triggerSave();
  };

  const deleteChapter = (idx: number) => {
    if (chapters.length === 1) return toast.error("Keep at least one chapter");
    setChapters((c) => c.filter((_, i) => i !== idx));
    if (activeChapterIdx >= chapters.length - 1) {
      setActiveChapterIdx(Math.max(0, chapters.length - 2));
      setActivePageIdx(0);
    }
    toast.success("Chapter removed");
    triggerSave();
  };

  const toggleChapter = (id: string) => {
    setOpenChapters((s) => {
      const copy = new Set(s);
      copy.clear();
      copy.add(id);
      return copy;
    });
  };

  /* ────── PAGE CRUD ────── */
  const addPage = () => {
    const newPage: Page = {
      id: Date.now().toString(),
      title: `Page ${currentPages.length + 1}`,
      content: null,
      html: "",
    };
    setChapters((c) =>
      c.map((ch, i) =>
        i === activeChapterIdx ? { ...ch, pages: [...ch.pages, newPage] } : ch
      )
    );
    setActivePageIdx(currentPages.length);
    toast.success("Page added");
    triggerSave();
  };

  const deletePage = (pageIdx: number) => {
    if (currentPages.length === 1) return toast.error("Keep at least one page");
    setChapters((c) =>
      c.map((ch, i) =>
        i === activeChapterIdx
          ? { ...ch, pages: ch.pages.filter((_, pi) => pi !== pageIdx) }
          : ch
      )
    );
    if (activePageIdx >= currentPages.length - 1) setActivePageIdx(0);
    toast.success("Page removed");
    triggerSave();
  };

  const reorderPages = (newOrder: Page[]) => {
    setChapters((c) =>
      c.map((ch, i) => (i === activeChapterIdx ? { ...ch, pages: newOrder } : ch))
    );
    triggerSave();
  };

  /* ────── IMAGE UPLOAD ────── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.secure_url) {
        editor.chain().focus().setImage({ src: data.secure_url }).run();
        toast.success("Image inserted");
      }
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.secure_url) {
        setCoverImage(data.secure_url);
        triggerSave();
        toast.success("Cover updated");
      }
    } catch {
      toast.error("Cover upload failed");
    }
  };

  /* ────── PUBLISH ────── */
  const publish = async () => {
    if (!user?.email) return toast.error("User email missing");
    setIsPublishing(true);
    try {
      const excerpt =
        chapters[0]?.pages[0]?.content?.content
          ?.map((n: any) => (n.type === "text" ? n.text : ""))
          .join(" ")
          .slice(0, 200) + "...";

      const payload = {
        title: bookTitle,
        author: user.fullName || user.email,
        authorEmail: user.email,
        authorId: user.uid,
        content: chapters,
        excerpt,
        coverImage,
        category: style.name,
        chapters: chapters.length,
        wordCount: totalWords,
        updatedAt: serverTimestamp(),
      };

      const q = query(collection(db, "biographies"), where("authorEmail", "==", user.email));
      const snap = await getDocs(q);

      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, payload);
        toast.success("Story updated!");
      } else {
        await addDoc(collection(db, "biographies"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Story published!");
      }

      navigationConfirmed.current = true;
      router.push("/read");
    } catch (e) {
      console.error(e);
      toast.error("Publish failed");
    } finally {
      setIsPublishing(false);
    }
  };

  /* ────── UNSAVED CHANGES GUARD ────── */
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current && !navigationConfirmed.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const popState = () => {
      if (hasUnsavedChanges.current && !navigationConfirmed.current) {
        setShowUnsavedDialog(true);
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", popState);
    window.history.pushState(null, "", window.location.href);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", popState);
    };
  }, []);

  const confirmLeave = async (saveFirst = false) => {
    if (saveFirst) await triggerSave();
    navigationConfirmed.current = true;
    setShowUnsavedDialog(false);
    setMode("list");
  };

  /* ────── RENDER ────── */
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Please log in
      </div>
    );
  }

  /* ────── LIST SCREEN ────── */
  if (mode === "list") {
    return (
      <>
        <Toaster position="top-center" />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                My Story Studio
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Pick or create your story</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={createNewBook}
              className="w-full mb-8 p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-3 text-lg font-medium"
            >
              <Plus className="h-6 w-6" />
              Create New Book
            </motion.button>

            {loadingBooks ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : null}

            <AnimatePresence>
              {books.length > 0 && !loadingBooks && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {books.map((b) => (
                    <motion.div
                      key={b.id}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      whileHover={{ y: -4 }}
                      className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer"
                      onClick={() => enterEditor(b.id)}
                    >
                      <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                        {b.cover ? (
                          <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <BookOpen className="h-12 w-12 mb-2" />
                            <span className="text-sm">No cover</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg truncate">{b.title}</h3>
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); enterEditor(b.id); }}
                          className="p-3 rounded-full bg-white/90 text-indigo-600"
                        >
                          <Edit2 className="h-5 w-5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); deleteBook(b.id); }}
                          className="p-3 rounded-full bg-white/90 text-red-600"
                        >
                          <Trash2 className="h-5 w-5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {!loadingBooks && books.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>No books yet. Click “Create New Book” to start writing!</p>
              </div>
            )}
          </motion.div>
        </div>
      </>
    );
  }

  /* ────── EDITOR SCREEN (FULL SCREEN PAGE, NO SCROLL) ────── */
  return (
    <>
      <Toaster position="top-center" />

      {/* UNSAVED DIALOG */}
      <AnimatePresence>
        {showUnsavedDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowUnsavedDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <h3 className="text-xl font-bold">Unsaved Changes</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">Save now before leaving?</p>
              <div className="flex gap-2 justify-end text-sm">
                <button onClick={() => setShowUnsavedDialog(false)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200">Cancel</button>
                <button onClick={() => confirmLeave(false)} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Leave</button>
                <button onClick={() => confirmLeave(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium">Save & Leave</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN PAGE (NO SCROLL) */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900 overflow-hidden">
        {/* TOP BAR */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode("list")}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={bookTitle}
              onChange={(e) => { setBookTitle(e.target.value); triggerSave(); }}
              className="text-2xl font-bold bg-transparent outline-none"
              placeholder="My Life Story"
            />
          </div>

          {/* MY STORIES + SAVE STATUS */}
          <div className="relative">
            <button
              onClick={() => setShowMyStories(!showMyStories)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium"
            >
              <Save className="h-4 w-4" />
              <span>
                {saveStatus === "saving" ? "Saving..." :
                 saveStatus === "saved" ? "Saved" :
                 saveStatus === "offline" ? "Offline" : "Error"}
              </span>
              {showMyStories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence>
              {showMyStories && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                >
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">My Stories</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {books.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { enterEditor(b.id); setShowMyStories(false); }}
                        className={`w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition ${
                          b.id === bookId ? "bg-indigo-100 dark:bg-indigo-900/50 font-medium" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span className="truncate">{b.title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => { createNewBook(); setShowMyStories(false); }}
                      className="w-full py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Plus className="h-4 w-4" /> New Book
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="fixed top-16 left-0 right-0 z-40 flex border-b border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex-1 py-3 px-6 font-medium transition ${
              activeTab === "home" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <Home className="h-5 w-5 inline mr-2" /> Home
          </button>
          <button
            onClick={() => setActiveTab("insert")}
            className={`flex-1 py-3 px-6 font-medium transition ${
              activeTab === "insert" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <ImageIcon className="h-5 w-5 inline mr-2" /> Insert
          </button>
          <button
            onClick={() => setActiveTab("style")}
            className={`flex-1 py-3 px-6 font-medium transition ${
              activeTab === "style" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <Palette className="h-5 w-5 inline mr-2" /> Style
          </button>
        </div>

        {/* TOOLBAR CONTENT */}
        <div className="fixed top-28 left-0 right-0 z-30 flex flex-wrap items-center gap-1 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 overflow-x-auto">
          {activeTab === "home" && (
            <>
              <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded-lg ${editor?.isActive("bold") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><BoldIcon className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg ${editor?.isActive("italic") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><ItalicIcon className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleStrike().run()} className={`p-2 rounded-lg ${editor?.isActive("strike") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><Strikethrough className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded-lg ${editor?.isActive("heading", { level: 1 }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><Heading1 className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded-lg ${editor?.isActive("heading", { level: 2 }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><Heading2 className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg ${editor?.isActive("bulletList") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><List className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-lg ${editor?.isActive("orderedList") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><ListOrdered className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().setTextAlign("left").run()} className={`p-2 rounded-lg ${editor?.isActive({ textAlign: "left" }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><AlignLeft className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().setTextAlign("center").run()} className={`p-2 rounded-lg ${editor?.isActive({ textAlign: "center" }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><AlignCenter className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().setTextAlign("right").run()} className={`p-2 rounded-lg ${editor?.isActive({ textAlign: "right" }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><AlignRight className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().setTextAlign("justify").run()} className={`p-2 rounded-lg ${editor?.isActive({ textAlign: "justify" }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><AlignJustify className="h-4 w-4" /></button>
              <button onClick={() => editor?.chain().focus().toggleHighlight().run()} className={`p-2 rounded-lg ${editor?.isActive("highlight") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><Highlighter className="h-4 w-4" /></button>
            </>
          )}

          {activeTab === "insert" && (
            <label className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer">
              <ImageIcon className="h-4 w-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}

          {activeTab === "style" && (
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {STYLES.map((s) => (
                <motion.button
                  key={s.name}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setStyle(s); triggerSave(); }}
                  className={`p-3 rounded-xl border-2 transition-all text-xs ${
                    style.name === s.name
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                  }`}
                >
                  <s.icon className="h-5 w-5 mx-auto mb-1 text-indigo-600" />
                  <p className="font-medium">{s.name}</p>
                </motion.button>
              ))}
            </div>
          )}

          <div className="ml-auto flex gap-1">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 disabled:opacity-50"><Undo2 className="h-4 w-4" /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 disabled:opacity-50"><Redo2 className="h-4 w-4" /></motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setIsPreview(!isPreview)} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
              {isPreview ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </motion.button>
          </div>
        </div>

        {/* SIDEBAR (LEFT) */}
        <div className="fixed left-0 top-40 bottom-0 w-80 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Cover */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative group cursor-pointer rounded-2xl overflow-hidden shadow-lg"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600">
                {coverImage ? (
                  <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Upload className="h-10 w-10 mb-2" />
                    <p className="text-sm font-medium">Upload Cover</p>
                  </div>
                )}
              </div>
            </motion.div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />

            {/* Chapters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Chapters
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addChapter}
                  className="p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>

              {chapters.map((ch, ci) => {
                const isOpen = openChapters.has(ch.id);
                return (
                  <div key={ch.id} className="space-y-1">
                    <motion.div
                      layout
                      className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${
                        activeChapterIdx === ci
                          ? "bg-indigo-100 dark:bg-indigo-900/50"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => {
                        setActiveChapterIdx(ci);
                        setActivePageIdx(0);
                        toggleChapter(ch.id);
                      }}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <input
                        type="text"
                        value={ch.title}
                        onChange={(e) => {
                          setChapters((c) =>
                            c.map((c2, i) => (i === ci ? { ...c2, title: e.target.value } : c2))
                          );
                          triggerSave();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent outline-none font-medium text-sm"
                      />
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                        {ch.pages.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChapter(ci);
                        }}
                        className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </motion.div>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="ml-6 space-y-1"
                        >
                          <Reorder.Group axis="y" values={ch.pages} onReorder={reorderPages}>
                            {ch.pages.map((page, pi) => (
                              <Reorder.Item key={page.id} value={page}>
                                <motion.div
                                  layout
                                  whileHover={{ x: 4 }}
                                  className={`flex items-center gap-2 p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                                    activePageIdx === pi
                                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                                      : "hover:bg-gray-50 dark:hover:bg-gray-600"
                                  }`}
                                  onClick={() => setActivePageIdx(pi)}
                                >
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                  <input
                                    type="text"
                                    value={page.title}
                                    onChange={(e) => {
                                      setChapters((c) =>
                                        c.map((c2, i) =>
                                          i === ci
                                            ? {
                                                ...c2,
                                                pages: c2.pages.map((p, j) =>
                                                  j === pi ? { ...p, title: e.target.value } : p
                                                ),
                                              }
                                            : c2
                                        )
                                      );
                                      triggerSave();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 bg-transparent outline-none text-sm"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePage(pi);
                                    }}
                                    className="p-1 rounded-full opacity-0 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </motion.div>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>

                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              addPage();
                            }}
                            className="w-full py-1.5 text-xs text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add page
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Publish */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={publish}
              disabled={isPublishing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isPublishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {isPublishing ? "Publishing…" : "Publish My Story"}
            </motion.button>
          </div>
        </div>

        {/* FULL SCREEN EDITOR PAGE (NO SCROLL) */}
        <div
          className="fixed left-80 right-0 top-40 bottom-0 bg-white shadow-2xl overflow-hidden"
          style={{
            width: "calc(100vw - 320px)",
            height: "calc(100vh - 160px)",
            padding: "2.5cm 2cm",
            fontFamily: "Georgia, serif",
            lineHeight: "1.7",
          }}
        >
          {isPreview ? (
            <div
              className="prose prose-lg max-w-none h-full"
              dangerouslySetInnerHTML={{
                __html: currentChapter?.pages[activePageIdx]?.html || "",
              }}
            />
          ) : (
            <EditorContent
              editor={editor}
              className="h-full prose prose-lg max-w-none focus:outline-none"
            />
          )}
        </div>
      </div>
    </>
  );
}