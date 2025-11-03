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

/* ──────────────────────── TIPTAP EXTENSIONS ──────────────────────── */
import StarterKit from "@tiptap/starter-kit"; // ← includes History by default
import { Image } from "@tiptap/extension-image";
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

/* ──────────────────────── ICONS ──────────────────────── */
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Strikethrough,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Table as TableIcon,
  CheckSquare,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Sparkles,
  Loader2,
  Check,
  X,
  BookOpen,
  Zap,
  PenTool,
  Heart,
  Upload,
  AlertCircle,
  GripVertical,
  Undo2,
  Redo2,
  FileText,
  WifiOff,
  Type,
  ImagePlus,
  ChevronDown,
} from "lucide-react";

/* ──────────────────────── FIREBASE & AUTH ──────────────────────── */
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseconfig";
import {
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
  collection,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

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
  { name: "Memoir", icon: BookOpen, prompt: "Write in a warm, reflective tone…" },
  { name: "Adventure", icon: Zap, prompt: "Epic, vivid, sensory details…" },
  { name: "Journal", icon: PenTool, prompt: "Today I felt… Here's what happened…" },
  { name: "Poetry", icon: Heart, prompt: "Free verse, metaphors, rhythm…" },
];
const LOCAL_BACKUP_KEY = "storyStudio_backup";

/* ──────────────────────── FONT-SIZE EXTENSION ──────────────────────── */
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize.replace("px", ""),
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ commands }) => {
          return commands.setMark("textStyle", { fontSize: size });
        },
      unsetFontSize:
        () =>
        ({ commands }) => {
          return commands.setMark("textStyle", { fontSize: null });
        },
    };
  },
});

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */
export default function StoryStudio() {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();

  /* ────── STATE ────── */
  const [bookTitle, setBookTitle] = useState("My Life Story");
  const [coverImage, setCoverImage] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [style, setStyle] = useState<WritingStyle>(STYLES[0]);

  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "offline" | "error"
  >("saved");
  const [isPreview, setIsPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);

  const [selectedFont, setSelectedFont] = useState("Inter");
  const [selectedSize, setSelectedSize] = useState("16");
  const [selectedColor, setSelectedColor] = useState("#000000");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUnsavedChanges = useRef(false);
  const navigationConfirmed = useRef(false);
  const isOnline = useRef(true);
  const activePageIdx = useRef(0);

  /* ────── TIPTAP EDITOR ────── */
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({}), // ← History is included here
      Image.configure({ inline: true, allowBase64: true }),
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
        class:
          "prose prose-lg dark:prose-invert max-w-none focus:outline-none p-4 min-h-[600px]",
        style: "font-family: Inter, sans-serif;",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      updatePageContent(json, html);
      triggerSave();
    },
  });

  /* ────── WORD COUNT & PROGRESS ────── */
  const totalWords = useMemo(() => {
    return chapters.reduce((acc, ch) => {
      return (
        acc +
        ch.pages.reduce((pacc, p) => {
          const txt =
            p.content?.content
              ?.map((n: any) => (n.type === "text" ? n.text : ""))
              .join(" ") || "";
          return pacc + txt.split(/\s+/).filter(Boolean).length;
        }, 0)
      );
    }, 0);
  }, [chapters]);

  const progress = Math.min(100, (totalWords / 5000) * 100);

  /* ────── CURRENT PAGE ────── */
  const currentChapter = chapters[activeChapterIdx] ?? null;
  const currentPages = currentChapter?.pages ?? [];

  const setActivePageIdx = (idx: number) => {
    activePageIdx.current = idx;
    setChapters((c) => [...c]);
  };

  /* ────── LOAD BOOK ────── */
  useEffect(() => {
    if (!user?.uid) return;
    loadBook();
  }, [user?.uid]);

  const loadBook = async () => {
    try {
      const snap = await getDoc(doc(db, "books", user!.uid));
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
      activePageIdx.current = 0;
      hasUnsavedChanges.current = false;
      setSaveStatus("saved");
    } catch {
      toast.error("Failed to load book");
    }
  };

  /* ────── SAVE LOGIC ────── */
  const triggerSave = async () => {
    if (!user?.uid) return;

    const backup = {
      title: bookTitle,
      coverImage,
      chapters,
      style: style.name,
      wordCount: totalWords,
    };
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
        doc(db, "books", user.uid),
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
                pi === activePageIdx.current
                  ? { ...p, content: json, html }
                  : p
              ),
            }
          : ch
      )
    );
  };

  /* ────── EDITOR SYNC ────── */
  useEffect(() => {
    if (!editor || !currentChapter) return;

    const page = currentChapter.pages[activePageIdx.current];
    if (page?.content) {
      editor.commands.setContent(page.content);
      editor.commands.focus();
    } else {
      editor.commands.setContent("");
    }
  }, [activeChapterIdx, activePageIdx.current, editor, currentChapter]);

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
      pages: [
        {
          id: Date.now() + "-p",
          title: "Page 1",
          content: null,
          html: "",
        },
      ],
    };
    setChapters((c) => [...c, newCh]);
    setActiveChapterIdx(chapters.length);
    activePageIdx.current = 0;
    toast.success("Chapter added");
    triggerSave();
  };

  const deleteChapter = (idx: number) => {
    if (chapters.length === 1) return toast.error("Keep at least one chapter");
    setChapters((c) => c.filter((_, i) => i !== idx));
    if (activeChapterIdx >= chapters.length - 1) {
      setActiveChapterIdx(Math.max(0, chapters.length - 2));
      activePageIdx.current = 0;
    }
    toast.success("Chapter removed");
    triggerSave();
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
        i === activeChapterIdx
          ? { ...ch, pages: [...ch.pages, newPage] }
          : ch
      )
    );
    setActivePageIdx(currentPages.length);
    toast.success("Page added");
    triggerSave();
  };

  const deletePage = (pageIdx: number) => {
    if (currentPages.length === 1)
      return toast.error("Keep at least one page");
    setChapters((c) =>
      c.map((ch, i) =>
        i === activeChapterIdx
          ? { ...ch, pages: ch.pages.filter((_, pi) => pi !== pageIdx) }
          : ch
      )
    );
    if (activePageIdx.current >= currentPages.length - 1)
      setActivePageIdx(0);
    toast.success("Page removed");
    triggerSave();
  };

  const reorderPages = (newOrder: Page[]) => {
    setChapters((c) =>
      c.map((ch, i) =>
        i === activeChapterIdx ? { ...ch, pages: newOrder } : ch
      )
    );
    triggerSave();
  };

  /* ────── IMAGE UPLOAD ────── */
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: form }
      );
      const data = await res.json();
      if (data.secure_url) {
        editor.chain().focus().setImage({ src: data.secure_url }).run();
        toast.success("Image inserted");
      }
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleCoverUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", UPLOAD_PRESET);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: form }
      );
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

      const q = query(
        collection(db, "biographies"),
        where("authorEmail", "==", user.email)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, payload);
        toast.success("Story updated!");
      } else {
        await addDoc(collection(db, "biographies"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
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
    window.history.back();
  };

  /* ────── UI HELPERS ────── */
  const fontFamilies = [
    "Inter",
    "Arial",
    "Georgia",
    "Courier New",
    "Comic Sans MS",
    "Times New Roman",
  ];
  const fontSizes = ["12", "14", "16", "18", "20", "24", "32", "48"];
  const colors = [
    "#000000",
    "#ff0000",
    "#00b300",
    "#0066ff",
    "#ff9900",
    "#9933ff",
    "#ff66cc",
    "#66cccc",
  ];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Please log in
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />

      {/* ────── UNSAVED DIALOG ────── */}
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
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                Save now before leaving?
              </p>
              <div className="flex gap-2 justify-end text-sm">
                <button
                  onClick={() => setShowUnsavedDialog(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmLeave(false)}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
                >
                  Leave
                </button>
                <button
                  onClick={() => confirmLeave(true)}
                  className="px-4 py-2 rounded-xl bg-linear-to-r from-green-500 to-emerald-500 text-white font-medium"
                >
                  Save & Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────── INSERT MENU ────── */}
      <AnimatePresence>
        {showInsertMenu && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 z-40 border border-gray-200 dark:border-gray-700"
          >
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Insert
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowInsertMenu(false);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col items-center gap-1 text-sm"
              >
                <ImagePlus className="h-5 w-5" />
                Image
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run();
                  setShowInsertMenu(false);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col items-center gap-1 text-sm"
              >
                <TableIcon className="h-5 w-5" />
                Table
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  editor?.chain().focus().toggleTaskList().run();
                  setShowInsertMenu(false);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-col items-center gap-1 text-sm"
              >
                <CheckSquare className="h-5 w-5" />
                Task List
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────── MAIN LAYOUT ────── */}
      <div className="min-h-screen bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
        <div className="max-w-7xl mx-auto p-4 pt-20 md:p-6 md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-gray-700/60 overflow-hidden"
          >
            {/* HEADER */}
            <div className="p-4 md:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-linear-to-r from-indigo-500/5 to-purple-500/5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="text"
                    value={bookTitle}
                    onChange={(e) => {
                      setBookTitle(e.target.value);
                      triggerSave();
                    }}
                    className="text-3xl md:text-4xl font-bold bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none transition-all flex-1"
                    placeholder="My Life Story"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    by {user?.email}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    {saveStatus === "saving" && (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    )}
                    {saveStatus === "saved" && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {saveStatus === "offline" && (
                      <WifiOff className="h-4 w-4 text-orange-500" />
                    )}
                    {saveStatus === "error" && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">
                      {saveStatus === "saving"
                        ? "Saving..."
                        : saveStatus === "saved"
                        ? "Saved"
                        : saveStatus === "offline"
                        ? "Offline"
                        : "Failed"}
                    </span>
                  </div>
                  <div className="font-bold">{totalWords} words</div>
                  <div className="w-24 md:w-40 bg-gray-200 dark:bg-gray-700 rounded-full h-2 md:h-3 overflow-hidden">
                    <motion.div
                      className="bg-linear-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 md:p-8">
              {/* SIDEBAR */}
              <div className="space-y-6 order-2 lg:order-1">
                {/* Cover */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative group cursor-pointer rounded-2xl overflow-hidden shadow-lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="h-48 md:h-56 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt="cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Upload className="h-10 w-10 mb-2" />
                        <p className="text-sm font-medium">Upload Cover</p>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-white" />
                  </div>
                </motion.div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />

                {/* Chapters */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <BookOpen className="h-5 w-5" /> Chapters
                    </h3>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addChapter}
                      className="p-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </motion.button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {chapters.map((ch, i) => (
                      <motion.div
                        key={ch.id}
                        layout
                        whileHover={{ scale: 1.02 }}
                        className={`group relative p-3 rounded-2xl bg-linear-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 shadow-sm hover:shadow-md transition-all cursor-pointer border-2 ${
                          activeChapterIdx === i
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/50"
                            : "border-transparent"
                        }`}
                        onClick={() => {
                          setActiveChapterIdx(i);
                          activePageIdx.current = 0;
                        }}
                      >
                        <div
                          className={`flex items-center gap-3 ${
                            activeChapterIdx === i
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <BookOpen className="h-5 w-5 shrink-0" />
                          <input
                            type="text"
                            value={ch.title}
                            onChange={(e) => {
                              setChapters((c) =>
                                c.map((ch, ci) =>
                                  ci === i ? { ...ch, title: e.target.value } : ch
                                )
                              );
                              triggerSave();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 bg-transparent outline-none font-semibold text-sm"
                          />
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
                            {ch.pages.length} p
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChapter(i);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Pages */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Pages
                    </h4>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addPage}
                      className="p-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </motion.button>
                  </div>

                  <Reorder.Group
                    values={currentPages}
                    onReorder={reorderPages}
                    className="space-y-2 max-h-80 overflow-y-auto"
                  >
                    {currentPages.map((page, i) => (
                      <Reorder.Item key={page.id} value={page}>
                        <motion.div
                          layout
                          drag
                          whileDrag={{ scale: 1.05, zIndex: 10 }}
                          className={`group relative pl-8 pr-3 py-3 rounded-xl bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-2 ${
                            activePageIdx.current === i
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30"
                              : "border-transparent"
                          }`}
                          onClick={() => setActivePageIdx(i)}
                        >
                          <GripVertical className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={page.title}
                            onChange={(e) => {
                              setChapters((c) =>
                                c.map((ch, ci) =>
                                  ci === activeChapterIdx
                                    ? {
                                        ...ch,
                                        pages: ch.pages.map((p, pi) =>
                                          pi === i
                                            ? { ...p, title: e.target.value }
                                            : p
                                        ),
                                      }
                                    : ch
                                )
                              );
                              triggerSave();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="block w-full bg-transparent outline-none font-medium text-sm"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(i);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                </div>

                {/* Style */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Type className="h-5 w-5" /> Style
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {STYLES.map((s) => (
                      <motion.button
                        key={s.name}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setStyle(s);
                          triggerSave();
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all text-sm ${
                          style.name === s.name
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg"
                            : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                        }`}
                      >
                        <s.icon className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {s.prompt.slice(0, 30)}...
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Publish */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={publish}
                  disabled={isPublishing}
                  className="w-full py-4 rounded-2xl bg-linear-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-bold text-lg shadow-xl flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {isPublishing ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Sparkles className="h-6 w-6" />
                  )}
                  {isPublishing ? "Publishing..." : "Publish My Story"}
                </motion.button>
              </div>

              {/* EDITOR AREA */}
              <div className="lg:col-span-3 order-1 lg:order-2">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/50 dark:border-gray-700/50 overflow-hidden shadow-2xl">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-1 p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50">
                    {/* Basic Marks */}
                    <div className="flex gap-1 p-1 bg-white dark:bg-gray-700 rounded-lg">
                      {[
                        { icon: BoldIcon, cmd: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold") },
                        { icon: ItalicIcon, cmd: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic") },
                        { icon: UnderlineIcon, cmd: () => editor?.chain().focus().toggleUnderline().run(), active: editor?.isActive("underline") },
                        { icon: Strikethrough, cmd: () => editor?.chain().focus().toggleStrike().run(), active: editor?.isActive("strike") },
                        { icon: CodeIcon, cmd: () => editor?.chain().focus().toggleCode().run(), active: editor?.isActive("code") },
                      ].map((t, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={t.cmd}
                          className={`p-2 rounded-lg transition-all ${
                            t.active
                              ? "bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                              : "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <t.icon className="h-4 w-4" />
                        </motion.button>
                      ))}
                    </div>

                    {/* Headings, Lists, Quote */}
                    <div className="flex gap-1 p-1 bg-white dark:bg-gray-700 rounded-lg ml-2">
                      {[
                        { icon: Heading1, cmd: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive("heading", { level: 1 }) },
                        { icon: Heading2, cmd: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }) },
                        { icon: Heading3, cmd: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), active: editor?.isActive("heading", { level: 3 }) },
                        { icon: List, cmd: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList") },
                        { icon: ListOrdered, cmd: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList") },
                        { icon: Quote, cmd: () => editor?.chain().focus().toggleBlockquote().run(), active: editor?.isActive("blockquote") },
                      ].map((t, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={t.cmd}
                          className={`p-2 rounded-lg transition-all ${
                            t.active
                              ? "bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                              : "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <t.icon className="h-4 w-4" />
                        </motion.button>
                      ))}
                    </div>

                    {/* Alignment */}
                    <div className="flex gap-1 p-1 bg-white dark:bg-gray-700 rounded-lg ml-2">
                      {[
                        { icon: AlignLeft, cmd: () => editor?.chain().focus().setTextAlign("left").run(), active: editor?.isActive({ textAlign: "left" }) },
                        { icon: AlignCenter, cmd: () => editor?.chain().focus().setTextAlign("center").run(), active: editor?.isActive({ textAlign: "center" }) },
                        { icon: AlignRight, cmd: () => editor?.chain().focus().setTextAlign("right").run(), active: editor?.isActive({ textAlign: "right" }) },
                        { icon: AlignJustify, cmd: () => editor?.chain().focus().setTextAlign("justify").run(), active: editor?.isActive({ textAlign: "justify" }) },
                      ].map((t, i) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={t.cmd}
                          className={`p-2 rounded-lg transition-all ${
                            t.active
                              ? "bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-lg"
                              : "bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <t.icon className="h-4 w-4" />
                        </motion.button>
                      ))}
                    </div>

                    {/* Font Family */}
                    <div className="relative ml-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setShowFontFamilyMenu(!showFontFamilyMenu)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg text-sm"
                      >
                        <span className="font-medium">{selectedFont}</span>
                        <ChevronDown className="h-4 w-4" />
                      </motion.button>
                      <AnimatePresence>
                        {showFontFamilyMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-full mt-1 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-10"
                          >
                            {fontFamilies.map((f) => (
                              <button
                                key={f}
                                onClick={() => {
                                  editor?.chain().focus().setFontFamily(f).run();
                                  setSelectedFont(f);
                                  setShowFontFamilyMenu(false);
                                }}
                                className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                                style={{ fontFamily: f }}
                              >
                                {f}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Font Size */}
                    <div className="relative ml-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg text-sm"
                      >
                        <span className="font-medium">{selectedSize}px</span>
                        <ChevronDown className="h-4 w-4" />
                      </motion.button>
                      <AnimatePresence>
                        {showFontSizeMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-full mt-1 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-10"
                          >
                            {fontSizes.map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  editor?.chain().focus().setFontSize(s).run();
                                  setSelectedSize(s);
                                  setShowFontSizeMenu(false);
                                }}
                                className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                              >
                                {s}px
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Text Color */}
                    <div className="relative ml-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setShowColorMenu(!showColorMenu)}
                        className="p-2 rounded-lg bg-white dark:bg-gray-700"
                      >
                        <div
                          className="w-5 h-5 rounded border border-gray-400"
                          style={{ backgroundColor: selectedColor }}
                        />
                      </motion.button>
                      <AnimatePresence>
                        {showColorMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute top-full mt-1 grid grid-cols-4 gap-1 p-2 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-10"
                          >
                            {colors.map((c) => (
                              <button
                                key={c}
                                onClick={() => {
                                  editor?.chain().focus().setColor(c).run();
                                  setSelectedColor(c);
                                  setShowColorMenu(false);
                                }}
                                className="w-8 h-8 rounded border border-gray-300"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Highlight */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => editor?.chain().focus().toggleHighlight().run()}
                      className="p-2 rounded-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 ml-2"
                    >
                      <Highlighter className="h-4 w-4" />
                    </motion.button>

                    {/* Insert */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowInsertMenu(true)}
                      className="p-2 rounded-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 ml-2"
                    >
                      <Plus className="h-4 w-4" />
                    </motion.button>

                    {/* Undo / Redo */}
                    <div className="flex gap-1 ml-auto">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => editor?.chain().focus().undo().run()}
                        disabled={!editor?.can().undo()}
                        className="p-2 rounded-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                      >
                        <Undo2 className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => editor?.chain().focus().redo().run()}
                        disabled={!editor?.can().redo()}
                        className="p-2 rounded-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                      >
                        <Redo2 className="h-4 w-4" />
                      </motion.button>

                      {/* Preview Toggle */}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsPreview(!isPreview)}
                        className="p-2 rounded-lg bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 ml-1"
                      >
                        {isPreview ? (
                          <Edit2 className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Editor / Preview */}
                  {editor ? (
                    isPreview ? (
                      <div className="p-8 md:p-12 prose prose-lg dark:prose-invert max-w-none bg-linear-to-b from-transparent to-gray-50/50 dark:to-gray-900/50">
                        <h1 className="text-3xl md:text-5xl font-bold mb-8">
                          {currentPages[activePageIdx.current]?.title}
                        </h1>
                        <div
                          dangerouslySetInnerHTML={{
                            __html:
                              currentPages[activePageIdx.current]?.html || "",
                          }}
                        />
                      </div>
                    ) : (
                      <EditorContent
                        editor={editor}
                        className="min-h-[600px] md:min-h-[700px] p-8 md:p-12 prose prose-lg dark:prose-invert max-w-none focus:outline-none"
                      />
                    )
                  ) : (
                    <div className="min-h-[600px] flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hidden file input for editor images */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
    </>
  );
}