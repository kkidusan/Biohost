// src/app/story-studio/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useMemo, useCallback, createContext, useContext } from "react";
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
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  Eye,
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
  Save,
  Palette,
  Home,
  Sparkles,
  Baseline,
  Droplet,
  Moon,
  Sun,
  Settings,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseconfig";
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

// ────── CONSTANTS ──────
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const LOCAL_BACKUP_KEY = "storyStudio_backup";

// ────── TYPES ──────
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
  publish: boolean;
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

// ────── Theme Context ──────
interface ThemeContextType {
  theme: "light" | "dark" | "auto";
  setTheme: (theme: "light" | "dark" | "auto") => void;
  autoSave: boolean;
  toggleAutoSave: () => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};

// ────── Editor Extensions ──────
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: "16px",
          parseHTML: (el) => el.style.fontSize || "16px",
          renderHTML: (attrs) => ({ style: `font-size: ${attrs.fontSize}` }),
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ commands }) => {
        return commands.setMark("textStyle", { fontSize: size });
      },
    };
  },
});

const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        lineHeight: {
          default: "1.7",
          parseHTML: (el) => el.style.lineHeight || "1.7",
          renderHTML: (attrs) => ({ style: `line-height: ${attrs.lineHeight}` }),
        },
      },
    }];
  },
  addCommands() {
    return {
      setLineHeight: (height: string) => ({ commands }) => {
        return commands.updateAttributes("paragraph", { lineHeight: height }) ||
               commands.updateAttributes("heading", { lineHeight: height });
      },
    };
  },
});

// ────── Mobile Hook ──────
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

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [bookTitle, setBookTitle] = useState("My Life Story");
  const [coverImage, setCoverImage] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [style, setStyle] = useState<WritingStyle>(STYLES[0]);
  const [activeTab, setActiveTab] = useState<"home" | "insert" | "style">("home");
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showLineHeightPicker, setShowLineHeightPicker] = useState(false);
  const [colorMode, setColorMode] = useState<"text" | "highlight">("text");
  const [currentColor, setCurrentColor] = useState({ r: 99, g: 102, b: 241 });
  const [showSettings, setShowSettings] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");
  const [autoSave, setAutoSave] = useState(true);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasUnsavedChanges = useRef(false);
  const navigationConfirmed = useRef(false);
  const isOnline = useRef(true);
  const saveTimeout = useRef<NodeJS.Timeout>();
  const sidebarRef = useRef<HTMLDivElement>(null);

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
      LineHeight,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-full p-8 m-0",
        style: "font-family: Georgia, serif; font-size: 16px; line-height: 1.7;",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const html = editor.getHTML();
      updatePageContent(json, html);
      if (autoSave) triggerSave();
    },
  });

  useEffect(() => {
    if (theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
    } else {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // FIXED: Guard against undefined pages + safer loading
  const totalWords = useMemo(() => {
    return chapters.reduce((acc: number, ch: Chapter) => {
      const pages = ch.pages ?? [];
      return (
        acc +
        pages.reduce((pacc: number, p: Page) => {
          const txt =
            p.content?.content
              ?.map((n: any) => (n.type === "text" ? n.text : ""))
              .join(" ") || "";
          return pacc + txt.split(/\s+/).filter(Boolean).length;
        }, 0)
      );
    }, 0);
  }, [chapters]);

  const currentChapter = chapters[activeChapterIdx] ?? null;
  const currentPages = currentChapter?.pages ?? [];

  // ────── LOAD BOOK ──────
  useEffect(() => {
    if (!id || !user?.email) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "books", id));
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
          publish: false,
        };
        setBookTitle(data.title || "My Life Story");
        setCoverImage(data.coverImage || "");
        const loadedChapters = data.chapters?.length 
          ? data.chapters.map((ch: any) => ({ 
              ...ch, 
              pages: ch.pages ?? [],
              publish: ch.publish ?? false 
            }))
          : [defaultChapter];
        setChapters(loadedChapters);
        setStyle(STYLES.find((s: WritingStyle) => s.name === data.style) || STYLES[0]);
        setActiveChapterIdx(0);
        setActivePageIdx(0);
        const firstChapterId = loadedChapters[0]?.id || "1";
        setOpenChapterId(firstChapterId);
        hasUnsavedChanges.current = false;
      } catch {
        toast.error("Failed to load book");
      }
    })();
  }, [id, user?.email]);

  // ────── AUTO-SAVE ──────
  const triggerSave = useCallback(async () => {
    if (!id || !user?.email) return;
    setIsSaving(true);
    const backup = { title: bookTitle, coverImage, chapters, style: style.name, wordCount: totalWords };
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(backup));
    if (!isOnline.current) {
      hasUnsavedChanges.current = true;
      setIsSaving(false);
      return;
    }
    clearTimeout(saveTimeout.current);
    hasUnsavedChanges.current = true;
    saveTimeout.current = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "books", id),
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
        toast.success("Saved");
      } catch {
        toast.error("Save failed");
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  }, [id, user?.email, bookTitle, coverImage, chapters, style.name, totalWords]);

  const updatePageContent = (json: any, html: string) => {
    setChapters((prev: Chapter[]) =>
      prev.map((ch: Chapter, ci: number) =>
        ci === activeChapterIdx
          ? {
              ...ch,
              pages: ch.pages.map((p: Page, pi: number) =>
                pi === activePageIdx ? { ...p, content: json, html } : p
              ),
            }
          : ch
      )
    );
  };

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

  useEffect(() => {
    const goOnline = () => {
      isOnline.current = true;
      if (autoSave) triggerSave();
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
  }, [triggerSave, autoSave]);

  // ────── CHAPTER & PAGE CRUD ──────
  const addChapter = () => {
    const newCh: Chapter = {
      id: Date.now().toString(),
      title: `Chapter ${chapters.length + 1}`,
      pages: [{ id: Date.now() + "-p", title: "Page 1", content: null, html: "" }],
      publish: false,
    };
    setChapters((c: Chapter[]) => [...c, newCh]);
    const newIdx = chapters.length;
    setActiveChapterIdx(newIdx);
    setActivePageIdx(0);
    setOpenChapterId(newCh.id);
    toast.success("Chapter added");
    triggerSave();
  };

  const deleteChapter = (idx: number) => {
    if (chapters.length === 1) return toast.error("Keep at least one chapter");
    setChapters((c: Chapter[]) => c.filter((_: Chapter, i: number) => i !== idx));
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

  const addPage = () => {
    const newPage: Page = {
      id: Date.now().toString(),
      title: `Page ${currentPages.length + 1}`,
      content: null,
      html: "",
    };
    setChapters((c: Chapter[]) =>
      c.map((ch: Chapter, i: number) =>
        i === activeChapterIdx ? { ...ch, pages: [...ch.pages, newPage] } : ch
      )
    );
    setActivePageIdx(currentPages.length);
    toast.success("Page added");
    triggerSave();
  };

  const deletePage = (pageIdx: number) => {
    if (currentPages.length === 1) return toast.error("Keep at least one page");
    setChapters((c: Chapter[]) =>
      c.map((ch: Chapter, i: number) =>
        i === activeChapterIdx
          ? { ...ch, pages: ch.pages.filter((_: Page, pi: number) => pi !== pageIdx) }
          : ch
      )
    );
    if (activePageIdx >= pageIdx && activePageIdx > 0) {
      setActivePageIdx(activePageIdx - 1);
    }
    toast.success("Page removed");
    triggerSave();
  };

  // ────── IMAGE & COVER UPLOAD ──────
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
    setShowFontPicker(false);
  };

  const applyLineHeight = (height: string) => {
    editor?.chain().focus().setLineHeight(height).run();
    setShowLineHeightPicker(false);
  };

  const save = async () => {
    if (!user?.email) return toast.error("User email missing");
    setIsSaving(true);
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
        toast.success("Story saved!");
      }
      navigationConfirmed.current = true;
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

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
    router.push("/story-studio");
  };

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
      } ${disabled ? "opacity-40 cursor not-allowed" : ""}`}
    >
      {children}
    </motion.button>
  );

  const Divider = () => <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />;

  // ────── TOOLBAR CONTENT (shared between desktop & mobile) ──────
  const ToolbarContent = () => (
    <>
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
          <ToolButton onClick={() => setShowColorPicker(true)}><Droplet className="h-4 w-4" /></ToolButton>
          <ToolButton onClick={() => setShowFontPicker(true)}><Type className="h-4 w-4" /></ToolButton>
          <ToolButton onClick={() => setShowLineHeightPicker(true)}><Baseline className="h-4 w-4" /></ToolButton>
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
          {STYLES.map((s: WritingStyle) => (
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
    </>
  );

  // ────── VERTICAL POPOVERS (CARD STYLE) ──────
  const VerticalPopover = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) => (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-20 right-4 z-50 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold">{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, autoSave, toggleAutoSave: () => setAutoSave(!autoSave) }}>
      <Toaster position="top-center" />

      {/* POPOVERS */}
      <VerticalPopover show={showColorPicker} onClose={() => setShowColorPicker(false)} title={colorMode === "text" ? "Text Color" : "Highlight Color"}>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setColorMode("text")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${colorMode === "text" ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-700"}`}>Text</button>
          <button onClick={() => setColorMode("highlight")} className={`flex-1 py-2 rounded-lg text-xs font-medium ${colorMode === "highlight" ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-gray-700"}`}>Highlight</button>
        </div>
        <RgbColorPicker color={currentColor} onChange={setCurrentColor} />
        <button onClick={applyColor} className="w-full mt-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
          <Check className="h-4 w-4" /> Apply
        </button>
      </VerticalPopover>

      <VerticalPopover show={showFontPicker} onClose={() => setShowFontPicker(false)} title="Font Size">
        {["12px", "14px", "16px", "18px", "20px", "24px", "32px"].map((size) => (
          <button key={size} onClick={() => applyFontSize(size)} className="w-full py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-3">
            {size.replace("px", "")} pt
          </button>
        ))}
      </VerticalPopover>

      <VerticalPopover show={showLineHeightPicker} onClose={() => setShowLineHeightPicker(false)} title="Line Height">
        {["1.0", "1.5", "1.7", "2.0", "2.5", "3.0"].map((height) => (
          <button key={height} onClick={() => applyLineHeight(height)} className="w-full py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-3">
            {height}
          </button>
        ))}
      </VerticalPopover>

      <VerticalPopover show={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setTheme("light")} className={`py-2 rounded-lg flex items-center justify-center gap-2 ${theme === "light" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 dark:bg-gray-700"}`}>
                <Sun className="h-4 w-4" /> Light
              </button>
              <button onClick={() => setTheme("dark")} className={`py-2 rounded-lg flex items-center justify-center gap-2 ${theme === "dark" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 dark:bg-gray-700"}`}>
                <Moon className="h-4 w-4" /> Dark
              </button>
              <button onClick={() => setTheme("auto")} className={`py-2 rounded-lg flex items-center justify-center gap-2 ${theme === "auto" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 dark:bg-gray-700"}`}>
                <Settings className="h-4 w-4" /> Auto
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Auto Save</label>
            <button onClick={() => setAutoSave(!autoSave)} className={`w-12 h-6 rounded-full transition-all ${autoSave ? "bg-indigo-600" : "bg-gray-300"} relative`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${autoSave ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </VerticalPopover>

      {/* UNSAVED DIALOG */}
      <AnimatePresence>
        {showUnsavedDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowUnsavedDialog(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
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
                router.push("/story-studio");
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={save}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium text-sm flex items-center gap-1.5 shadow-lg"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving…" : "Save"}
          </motion.button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* DESKTOP TOOLBAR */}
      {!isMobile && (
        <>
          <div className="fixed top-16 left-80 right-0 z-40 flex border-b border-gray-200/30 dark:border-gray-700/30 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl">
            {(["home", "insert", "style"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-6 font-medium text-sm capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab === "home" && "Format"}
                {tab === "insert" && "Insert"}
                {tab === "style" && "Style"}
              </button>
            ))}
          </div>
          <div className="fixed top-28 left-80 right-0 z-30 flex items-center gap-1.5 p-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-b border-gray-200/30 dark:border-gray-700/30 overflow-x-auto">
            <ToolbarContent />
          </div>
        </>
      )}

      {/* MOBILE BOTTOM NAV & TOOLBAR (FIXED: now renders real tools) */}
      {isMobile && (
        <>
          {/* Bottom navigation tabs */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-around py-2">
              <button onClick={() => setActiveTab("home")} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === "home" ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-500"}`}>
                <Home className="h-5 w-5" />
                <span className="text-xs">Format</span>
              </button>
              <button onClick={() => setActiveTab("insert")} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === "insert" ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-500"}`}>
                <ImageIcon className="h-5 w-5" />
                <span className="text-xs">Insert</span>
              </button>
              <button onClick={() => setActiveTab("style")} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === "style" ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-500"}`}>
                <Sparkles className="h-5 w-5" />
                <span className="text-xs">Style</span>
              </button>
              <button onClick={() => setSidebarOpen(true)} className="p-3 rounded-xl flex flex-col items-center gap-1 text-gray-500">
                <Layout className="h-5 w-5" />
                <span className="text-xs">Outline</span>
              </button>
              <button onClick={() => setIsPreview(!isPreview)} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${isPreview ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-gray-500"}`}>
                {isPreview ? <Edit2 className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                <span className="text-xs">{isPreview ? "Edit" : "View"}</span>
              </button>
            </div>
          </div>

          {/* Mobile floating toolbar - now shows ACTUAL tools */}
          <div className="fixed bottom-20 left-0 right-0 z-40 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200/30 dark:border-gray-700/30 shadow-lg">
            <div className="flex items-center gap-1.5 p-3 overflow-x-auto scrollbar-hide">
              <ToolbarContent />
            </div>
          </div>
        </>
      )}

      {/* SIDEBAR */}
      <div ref={sidebarRef} className={`fixed top-16 left-0 h-full w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 overflow-y-auto`}>
        {/* ... sidebar content unchanged ... */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-inherit z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Outline</h2>
            {isMobile && <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X className="h-5 w-5" /></button>}
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addChapter}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Chapter
            </motion.button>
            <label className="flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => coverInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                Cover
              </motion.button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          </div>
        </div>
        <Reorder.Group values={chapters} onReorder={setChapters}>
          <div className="p-4 space-y-3 pb-32">
            {chapters.map((ch: Chapter, chIdx: number) => (
              <Reorder.Item key={ch.id} value={ch} className="cursor-grab active:cursor-grabbing">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={ch.title}
                        onChange={(e) => {
                          setChapters(c => c.map((c, i) => i === chIdx ? { ...c, title: e.target.value } : c));
                          triggerSave();
                        }}
                        className="bg-transparent outline-none font-medium text-sm flex-1"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleChapter(ch.id, chIdx)} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                        {openChapterId === ch.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteChapter(chIdx)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {openChapterId === ch.id && (
                    <div className="ml-7 space-y-1">
                      {ch.pages.map((p: Page, pIdx: number) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            activeChapterIdx === chIdx && activePageIdx === pIdx
                              ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                              : "hover:bg-gray-200 dark:hover:bg-gray-600"
                          }`}
                          onClick={() => {
                            setActiveChapterIdx(chIdx);
                            setActivePageIdx(pIdx);
                            if (isMobile) setSidebarOpen(false);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                          <input
                            type="text"
                            value={p.title}
                            onChange={(e) => {
                              setChapters(c => c.map((cc, ci) => ci === chIdx ? {
                                ...cc,
                                pages: cc.pages.map((pp, pi) => pi === pIdx ? { ...pp, title: e.target.value } : pp)
                              } : cc));
                              triggerSave();
                            }}
                            className="bg-transparent outline-none text-sm flex-1"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(pIdx);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </motion.div>
                      ))}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          addPage();
                        }}
                        className="w-full mt-2 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Page
                      </motion.button>
                    </div>
                  )}
                </div>
              </Reorder.Item>
            ))}
          </div>
        </Reorder.Group>
      </div>

      {/* MAIN EDITOR */}
      <div className="pt-16 md:pl-80 min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="mb-8">
            <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl overflow-hidden shadow-xl">
              {coverImage ? (
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <BookOpen className="h-16 w-16 mb-3" />
                  <p className="text-sm">No cover image</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
            {isPreview ? (
              <div className="prose prose-lg max-w-none p-8" dangerouslySetInnerHTML={{ __html: currentPages[activePageIdx]?.html || "" }} />
            ) : (
              <EditorContent editor={editor} className="min-h-[600px]" />
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </ThemeContext.Provider>
  );
}