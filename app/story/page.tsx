"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import { Image as TiptapImage } from "@tiptap/extension-image";
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
import { RgbColorPicker } from "react-colorful";
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
  Image as ImageIcon,
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
  Check,
  X,
  FileText,
  Layout,
  Type,
  Send,
  Droplet,
  Palette,
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
  { name: "Memoir", icon: BookOpen, prompt: "Write in a warm, reflective tone…" },
  { name: "Adventure", icon: Zap, prompt: "Epic, vivid, sensory details…" },
  { name: "Journal", icon: PenTool, prompt: "Today I felt… Here's what happened…" },
  { name: "Poetry", icon: Heart, prompt: "Free verse, metaphors, rhythm…" },
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

/* ────── MOBILE DETECTION ────── */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
};

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */
export default function StoryStudio() {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ────── GLOBAL STATE ────── */
  const [mode, setMode] = useState<"list" | "editor">("list");
  const [books, setBooks] = useState<Array<{ id: string; title: string; cover?: string }>>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  /* ────── EDITOR STATE ────── */
  const [bookId, setBookId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("My Life Story");
  const [coverImage, setCoverImage] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [style, setStyle] = useState<WritingStyle>(STYLES[0]);
  const [activeTab, setActiveTab] = useState<"home" | "insert" | "style">("home");
  const [isPreview, setIsPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Picker States
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorMode, setColorMode] = useState<"text" | "highlight">("text");
  const [currentColor, setCurrentColor] = useState({ r: 99, g: 102, b: 241 });

  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showFontFamilyPicker, setShowFontFamilyPicker] = useState(false);

  const fontSizes = [
    { label: "Small", value: "12" },
    { label: "Normal", value: "16" },
    { label: "Large", value: "20" },
    { label: "Huge", value: "24" },
    { label: "Giant", value: "32" },
  ];

  const fontFamilies = [
    { label: "Georgia", value: "Georgia, serif", preview: "Georgia" },
    { label: "Inter", value: "'Inter', sans-serif", preview: "Inter" },
    { label: "Playfair", value: "'Playfair Display', serif", preview: "Playfair" },
    { label: "Roboto", value: "'Roboto', sans-serif", preview: "Roboto" },
    { label: "Mono", value: "'Fira Mono', monospace", preview: "Mono" },
  ];

  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasUnsavedChanges = useRef(false);
  const navigationConfirmed = useRef(false);
  const isOnline = useRef(true);
  const saveTimeout = useRef<NodeJS.Timeout>();

  /* ────── TIPTAP EDITOR ────── */
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
        class: "prose prose-lg max-w-none focus:outline-none min-h-full p-8 m-0",
        style: "font-family: Georgia, serif; line-height: 1.7;",
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
      const firstChapterId = data.chapters?.[0]?.id || "1";
      setOpenChapterId(firstChapterId);
      hasUnsavedChanges.current = false;
    } catch {
      toast.error("Failed to load book");
    }
  };

  /* ────── DEBOUNCED SAVE ────── */
  const triggerSave = useCallback(() => {
    if (!bookId || !user?.email) return;
    const backup = { title: bookTitle, coverImage, chapters, style: style.name, wordCount: totalWords };
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(backup));
    if (!isOnline.current) {
      hasUnsavedChanges.current = true;
      return;
    }
    clearTimeout(saveTimeout.current);
    hasUnsavedChanges.current = true;
    saveTimeout.current = setTimeout(async () => {
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
        hasUnsavedChanges.current = false;
        localStorage.removeItem(LOCAL_BACKUP_KEY);
      } catch {
        toast.error("Save failed");
      }
    }, 1000);
  }, [bookId, user?.email, bookTitle, coverImage, chapters, style.name, totalWords]);

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
    const currentJSON = editor.getJSON();
    if (page?.content && JSON.stringify(currentJSON) !== JSON.stringify(page.content)) {
      editor.commands.setContent(page.content);
      editor.commands.focus();
    } else if (!page?.content && currentJSON.content?.length) {
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
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [triggerSave]);

  /* ────── CHAPTER CRUD ────── */
  const addChapter = () => {
    const newCh: Chapter = {
      id: Date.now().toString(),
      title: `Chapter ${chapters.length + 1}`,
      pages: [{ id: Date.now() + "-p", title: "Page 1", content: null, html: "" }],
    };
    setChapters((c) => [...c, newCh]);
    const newIdx = chapters.length;
    setActiveChapterIdx(newIdx);
    setActivePageIdx(0);
    setOpenChapterId(newCh.id);
    toast.success("Chapter added");
    triggerSave();
  };

  const deleteChapter = (idx: number) => {
    if (chapters.length === 1) return toast.error("Keep at least one chapter");
    setChapters((c) => c.filter((_, i) => i !== idx));
    if (activeChapterIdx >= chapters.length - 1) {
      setActiveChapterIdx(Math.max(0, chapters.length - 2));
      setActivePageIdx(0);
      setOpenChapterId(chapters[Math.max(0, chapters.length - 2)]?.id || null);
    }
    toast.success("Chapter removed");
    triggerSave();
  };

  const toggleChapter = (chapterId: string, idx: number) => {
    if (openChapterId === chapterId) {
      setOpenChapterId(null);
    } else {
      setOpenChapterId(chapterId);
      setActiveChapterIdx(idx);
      setActivePageIdx(0);
    }
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

  /* ────── APPLY STYLES ────── */
  const applyColor = () => {
    const rgb = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
    if (colorMode === "text") {
      editor?.chain().focus().setColor(rgb).run();
    } else {
      editor?.chain().focus().setHighlight({ color: rgb }).run();
    }
    setShowColorPicker(false);
  };

  const applyFontSize = (size: string) => {
    editor?.chain().focus().setFontSize(size).run();
    setShowFontSizePicker(false);
  };

  const applyFontFamily = (family: string) => {
    editor?.chain().focus().setFontFamily(family).run();
    setShowFontFamilyPicker(false);
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

  /* ────── TOOL BUTTON & DIVIDER ────── */
  const ToolButton = ({ children, active = false, disabled = false, onClick }: {
    children: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
  }) => (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.1 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-all ${
        active
          ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </motion.button>
  );
  const Divider = () => <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />;

  /* ────── COLOR PICKER POPOVER ────── */
  const ColorPickerPopover = () => (
    <AnimatePresence>
      {showColorPicker && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed top-32 left-80 right-0 z-50 flex justify-center pointer-events-none"
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 w-full max-w-xs pointer-events-auto border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{colorMode === "text" ? "Text Color" : "Highlight Color"}</h3>
              <button onClick={() => setShowColorPicker(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setColorMode("text")}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                  colorMode === "text" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setColorMode("highlight")}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                  colorMode === "highlight" ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                Highlight
              </button>
            </div>
            <div className="flex justify-center mb-3">
              <RgbColorPicker color={currentColor} onChange={setCurrentColor} />
            </div>
            <button
              onClick={applyColor}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
            >
              <Check className="h-4 w-4" />
              Apply
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  /* ────── FONT SIZE PICKER POPOVER ────── */
  const FontSizePickerPopover = () => {
    const currentSize = editor?.getAttributes("textStyle")?.fontSize || "16";
    return (
      <AnimatePresence>
        {showFontSizePicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-32 left-80 right-0 z-50 flex justify-center pointer-events-none"
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 w-full max-w-xs pointer-events-auto border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Font Size</h3>
                <button onClick={() => setShowFontSizePicker(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {fontSizes.map((fs) => (
                  <button
                    key={fs.value}
                    onClick={() => applyFontSize(fs.value)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${
                      currentSize === fs.value
                        ? "bg-indigo-100 dark:bg-indigo-900/50 font-medium text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span>{fs.label}</span>
                    <span className="text-xs opacity-70">{fs.value}px</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  /* ────── FONT FAMILY PICKER POPOVER ────── */
  const FontFamilyPickerPopover = () => {
    const currentFont = editor?.getAttributes("textStyle")?.fontFamily || "Georgia, serif";
    const currentLabel = fontFamilies.find(f => f.value === currentFont)?.label || "Georgia";
    return (
      <AnimatePresence>
        {showFontFamilyPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-32 left-80 right-0 z-50 flex justify-center pointer-events-none"
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 w-full max-w-xs pointer-events-auto border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Font Style</h3>
                <button onClick={() => setShowFontFamilyPicker(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {fontFamilies.map((ff) => (
                  <button
                    key={ff.value}
                    onClick={() => applyFontFamily(ff.value)}
                    style={{ fontFamily: ff.value }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-base transition-all ${
                      currentFont === ff.value
                        ? "bg-indigo-100 dark:bg-indigo-900/50 font-medium text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {ff.preview}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
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
                      <div className="aspect-3/4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
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

  /* ────── EDITOR SCREEN ────── */
  return (
    <>
      <Toaster position="top-center" />
      <ColorPickerPopover />
      <FontSizePickerPopover />
      <FontFamilyPickerPopover />

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

      {/* TOP HEADER */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (hasUnsavedChanges.current && !navigationConfirmed.current) {
                setShowUnsavedDialog(true);
              } else {
                setMode("list");
              }
            }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => { setBookTitle(e.target.value); triggerSave(); }}
            className="text-xl font-bold bg-transparent outline-none max-w-[180px] md:max-w-none truncate"
            placeholder="My Life Story"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
            <FileText className="h-3.5 w-3.5" />
            <span>{totalWords} words</span>
          </div>
          {!isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={publish}
              disabled={isPublishing}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium text-sm flex items-center gap-1.5 shadow-lg"
            >
              {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPublishing ? "Publishing…" : "Publish"}
            </motion.button>
          )}
        </div>
      </div>

      {/* Desktop Toolbar */}
      {!isMobile && (
        <>
          <div className="fixed top-16 left-80 right-0 z-40 flex border-b border-gray-200/30 dark:border-gray-700/30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl">
            {(["home", "insert", "style"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-6 font-medium text-sm capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {tab === "home" && "Format"}
                {tab === "insert" && "Insert"}
                {tab === "style" && "Style"}
              </button>
            ))}
          </div>
          <div className="fixed top-28 left-80 right-0 z-30 flex items-center gap-1.5 p-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200/30 dark:border-gray-700/30 overflow-x-auto">
            {activeTab === "home" && (
              <>
                <div className="flex items-center gap-1">
                  <ToolButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><BoldIcon className="h-4 w-4" /></ToolButton>
                  <ToolButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><ItalicIcon className="h-4 w-4" /></ToolButton>
                  <ToolButton active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolButton>
                </div>
                <Divider />
                <div className="flex items-center gap-1">
                  <ToolButton active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolButton>
                  <ToolButton active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolButton>
                </div>
                <Divider />
                <div className="flex items-center gap-1">
                  <ToolButton active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
                  <ToolButton active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
                </div>
                <Divider />
                <div className="flex items-center gap-1">
                  <ToolButton active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></ToolButton>
                  <ToolButton active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></ToolButton>
                  <ToolButton active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></ToolButton>
                  <ToolButton active={editor?.isActive({ textAlign: "justify" })} onClick={() => editor?.chain().focus().setTextAlign("justify").run()}><AlignJustify className="h-4 w-4" /></ToolButton>
                </div>
                <Divider />
                {/* Font Family */}
                <ToolButton
                  onClick={() => setShowFontFamilyPicker(true)}
                  active={showFontFamilyPicker}
                >
                  <Type className="h-4 w-4" />
                  <span className="ml-1 text-xs font-medium">
                    {fontFamilies.find(f => f.value === (editor?.getAttributes("textStyle")?.fontFamily || "Georgia, serif"))?.label || "Georgia"}
                  </span>
                </ToolButton>
                {/* Font Size */}
                <ToolButton
                  onClick={() => setShowFontSizePicker(true)}
                  active={showFontSizePicker}
                >
                  <Type className="h-4 w-4" />
                  <span className="ml-1 text-xs">{editor?.getAttributes("textStyle")?.fontSize || "16"}px</span>
                </ToolButton>
                {/* Color */}
                <ToolButton
                  onClick={() => {
                    setCurrentColor({ r: 99, g: 102, b: 241 });
                    setColorMode("text");
                    setShowColorPicker(true);
                  }}
                >
                  <Droplet className="h-4 w-4" />
                </ToolButton>
              </>
            )}
            {activeTab === "insert" && (
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium cursor-pointer hover:shadow-md transition-shadow">
                <ImageIcon className="h-4 w-4" />
                Insert Image
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
            {activeTab === "style" && (
              <div className="flex gap-2 items-center">
                {STYLES.map((s) => (
                  <motion.button
                    key={s.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setStyle(s); triggerSave(); }}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col items-center text-xs font-medium ${
                      style.name === s.name
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 shadow-sm"
                        : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                    }`}
                  >
                    <s.icon className="h-5 w-5 mb-1" />
                    {s.name}
                  </motion.button>
                ))}
              </div>
            )}
            <div className="ml-auto flex items-center gap-1">
              <ToolButton disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolButton>
              <ToolButton disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolButton>
              <ToolButton onClick={() => setIsPreview(!isPreview)}>
                {isPreview ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </ToolButton>
            </div>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-around py-2">
            <button onClick={() => setActiveTab("home")} className={`p-3 rounded-xl ${activeTab === "home" ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-500"}`}><Type className="h-5 w-5" /></button>
            <button onClick={() => setActiveTab("insert")} className={`p-3 rounded-xl ${activeTab === "insert" ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-500"}`}><ImageIcon className="h-5 w-5" /></button>
            <button onClick={() => setActiveTab("style")} className={`p-3 rounded-xl ${activeTab === "style" ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-500"}`}><Palette className="h-5 w-5" /></button>
            <button onClick={() => setSidebarOpen(true)} className="p-3 rounded-xl text-gray-500"><Layout className="h-5 w-5" /></button>
            <button onClick={() => setIsPreview(!isPreview)} className={`p-3 rounded-xl ${isPreview ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-500"}`}>
              {isPreview ? <Edit2 className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Toolbars */}
      {isMobile && activeTab === "home" && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex items-center justify-center gap-1.5 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 overflow-x-auto">
          <ToolButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><BoldIcon className="h-4 w-4" /></ToolButton>
          <ToolButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><ItalicIcon className="h-4 w-4" /></ToolButton>
          <ToolButton active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></ToolButton>
          <Divider />
          <ToolButton active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></ToolButton>
          <ToolButton active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolButton>
          <Divider />
          <ToolButton active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolButton>
          <ToolButton active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></ToolButton>
          <Divider />
          {/* Font Family */}
          <ToolButton
            onClick={() => setShowFontFamilyPicker(true)}
            active={showFontFamilyPicker}
          >
            <Type className="h-4 w-4" />
            <span className="ml-1 text-xs font-medium">
              {fontFamilies.find(f => f.value === (editor?.getAttributes("textStyle")?.fontFamily || "Georgia, serif"))?.label || "Georgia"}
            </span>
          </ToolButton>
          {/* Font Size */}
          <ToolButton
            onClick={() => setShowFontSizePicker(true)}
            active={showFontSizePicker}
          >
            <Type className="h-4 w-4" />
            <span className="ml-1 text-xs">{editor?.getAttributes("textStyle")?.fontSize || "16"}px</span>
          </ToolButton>
          {/* Color */}
          <ToolButton
            onClick={() => {
              setCurrentColor({ r: 99, g: 102, b: 241 });
              setColorMode("text");
              setShowColorPicker(true);
            }}
          >
            <Droplet className="h-4 w-4" />
          </ToolButton>
          <div className="ml-auto flex gap-1">
            <ToolButton disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></ToolButton>
            <ToolButton disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></ToolButton>
          </div>
        </div>
      )}
      {isMobile && activeTab === "insert" && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex items-center justify-center p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50">
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium cursor-pointer hover:shadow-md transition-shadow">
            <ImageIcon className="h-4 w-4" />
            Insert Image
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
      )}
      {isMobile && activeTab === "style" && (
        <div className="fixed bottom-16 left-0 right-0 z-40 flex gap-2 p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 overflow-x-auto">
          {STYLES.map((s) => (
            <motion.button
              key={s.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setStyle(s); triggerSave(); }}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center text-xs font-medium ${
                style.name === s.name
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md"
                  : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
              }`}
            >
              <s.icon className="h-6 w-6 mb-1 text-indigo-600" />
              {s.name}
            </motion.button>
          ))}
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="fixed left-0 top-16 w-80 h-full bg-gradient-to-b from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900/50 border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto">
          <div className="p-4 space-y-4">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="relative group cursor-pointer rounded-xl overflow-hidden shadow-md h-32"
              onClick={() => coverInputRef.current?.click()}
            >
              <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600">
                {coverImage ? (
                  <img src={coverImage} alt="cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                    <Upload className="h-6 w-6 mb-1" />
                    <span>Tap to upload</span>
                  </div>
                )}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </motion.div>
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-gray-800 dark:text-gray-100">
                  <BookOpen className="h-4 w-4 text-indigo-600" /> Chapters
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addChapter}
                  className="p-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs shadow"
                >
                  <Plus className="h-3.5 w-3.5" />
                </motion.button>
              </div>
              {chapters.map((ch, ci) => {
                const isOpen = openChapterId === ch.id;
                const isActive = activeChapterIdx === ci;
                return (
                  <div key={ch.id} className="space-y-1">
                    <motion.div
                      layout
                      className={`flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all text-sm ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => toggleChapter(ch.id, ci)}
                    >
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-indigo-600" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
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
                        className="flex-1 bg-transparent outline-none font-medium text-xs"
                      />
                      <span className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                        {ch.pages.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChapter(ci);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600"
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
                          className="ml-6 space-y-1 pb-2"
                        >
                          <Reorder.Group
                            axis="y"
                            values={ch.pages}
                            onReorder={(newOrder) => {
                              setChapters((c) =>
                                c.map((ch2, i) => (i === ci ? { ...ch2, pages: newOrder } : ch2))
                              );
                              triggerSave();
                            }}
                          >
                            {ch.pages.map((page, pi) => (
                              <Reorder.Item key={page.id} value={page}>
                                <motion.div
                                  layout
                                  whileHover={{ x: 3 }}
                                  className={`flex items-center gap-1.5 p-1.5 rounded cursor-grab active:cursor-grabbing transition-all text-xs ${
                                    activePageIdx === pi
                                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                                      : "hover:bg-gray-50 dark:hover:bg-gray-600"
                                  }`}
                                  onClick={() => setActivePageIdx(pi)}
                                >
                                  <GripVertical className="h-3.5 w-3.5 text-gray-400" />
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
                                    className="flex-1 bg-transparent outline-none text-xs"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePage(pi);
                                    }}
                                    className="p-0.5 rounded opacity-0 hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
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
                            className="w-full py-1 text-xs text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1"
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
          </div>
        </div>
      )}

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "85vh" }}
          >
            <div className="flex justify-center pt-2">
              <div className="w-16 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 2rem)" }}>
              <div className="space-y-5 mt-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative group cursor-pointer rounded-2xl overflow-hidden shadow-lg h-40"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600">
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
                <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-indigo-600" /> Chapters
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
                    const isOpen = openChapterId === ch.id;
                    const isActive = activeChapterIdx === ci;
                    return (
                      <div key={ch.id} className="space-y-1">
                        <motion.div
                          layout
                          className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                            isActive
                              ? "bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          onClick={() => toggleChapter(ch.id, ci)}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4 text-indigo-600" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
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
                          <span className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                            {ch.pages.length}
                          </span>
                        </motion.div>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="ml-6 space-y-1"
                            >
                              <Reorder.Group
                                axis="y"
                                values={ch.pages}
                                onReorder={(newOrder) => {
                                  setChapters((c) =>
                                    c.map((ch2, i) => (i === ci ? { ...ch2, pages: newOrder } : ch2))
                                  );
                                  triggerSave();
                                }}
                              >
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
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={publish}
                  disabled={isPublishing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                >
                  {isPublishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  {isPublishing ? "Publishing…" : "Publish My Story"}
                </motion.button>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN EDITOR AREA */}
      <div
        className={`${
          isMobile
            ? "fixed left-0 right-0 top-16 bottom-16"
            : "fixed left-80 right-0 top-40 bottom-0"
        } bg-white dark:bg-gray-50 overflow-auto`}
      >
        {isPreview ? (
          <div
            className="prose prose-lg max-w-none p-8"
            dangerouslySetInnerHTML={{
              __html: currentChapter?.pages[activePageIdx]?.html || "",
            }}
          />
        ) : (
          <EditorContent
            editor={editor}
            className="h-full w-full"
          />
        )}
      </div>
    </>
  );
}