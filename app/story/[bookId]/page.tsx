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
  Check,
  X,
  Menu,
  Edit2,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseconfig";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { useRouter, useParams } from "next/navigation";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const LOCAL_BACKUP_KEY = "storyStudio_backup";

/* ───── Types ───── */
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

/* ───── FontSize extension ───── */
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
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}px` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ commands }) =>
        commands.setMark("textStyle", { fontSize: size }),
      unsetFontSize: () => ({ commands }) =>
        commands.setMark("textStyle", { fontSize: null }),
    };
  },
});

/* ───── Mobile detection ───── */
const useIsMobile = () => {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
};

/* ───── Main Editor ───── */
export default function StoryEditor() {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();
  const { bookId } = useParams() as { bookId: string };
  const isMobile = useIsMobile();

  /* ───── UI state ───── */
  const [bookTitle, setBookTitle] = useState("My Life Story");
  const [coverImage, setCoverImage] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [activeChapterIdx, setActiveChapterIdx] = useState(0);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [style, setStyle] = useState<WritingStyle>(STYLES[0]);
  const [activeTab, setActiveTab] = useState<"home" | "insert" | "style">("home");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline" | "error">(
    "saved"
  );
  const [isPreview, setIsPreview] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUnsaved = useRef(false);
  const navConfirmed = useRef(false);
  const isOnline = useRef(true);

  /* ───── Tiptap ───── */
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
        class:
          "prose prose-lg max-w-none focus:outline-none min-h-full p-0 m-0",
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

  const currentChapter = chapters[activeChapterIdx] ?? null;
  const currentPages = currentChapter?.pages ?? [];

  /* ───── Load book ───── */
  useEffect(() => {
    if (!bookId || !user?.email) return;
    loadBook(bookId);
  }, [bookId, user?.email]);

  const loadBook = async (docId: string) => {
    try {
      const snap = await getDoc(doc(db, "books", docId));
      let data: any = {};
      if (snap.exists()) data = snap.data();
      else {
        const backup = localStorage.getItem(LOCAL_BACKUP_KEY);
        if (backup) {
          data = JSON.parse(backup);
          toast.success("Recovered offline backup");
        }
      }

      const defaultChapter: Chapter = {
        id: "1",
        title: "Chapter 1: My Journey Begins",
        pages: [{ id: "p1", title: "Page 1", content: null, html: "" }],
      };

      setBookTitle(data.title ?? "My Life Story");
      setCoverImage(data.coverImage ?? "");
      setChapters(data.chapters?.length ? data.chapters : [defaultChapter]);
      setStyle(STYLES.find((s) => s.name === data.style) ?? STYLES[0]);
      setActiveChapterIdx(0);
      setActivePageIdx(0);
      setOpenChapters(new Set([data.chapters?.[0]?.id ?? "1"]));
      hasUnsaved.current = false;
      setSaveStatus("saved");
    } catch {
      toast.error("Failed to load book");
    }
  };

  /* ───── Save logic ───── */
  const triggerSave = async () => {
    if (!bookId || !user?.email) return;
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
      hasUnsaved.current = true;
      return;
    }

    setSaveStatus("saving");
    hasUnsaved.current = true;
    try {
      await updateDoc(doc(db, "books", bookId), {
        title: bookTitle,
        authorEmail: user.email,
        coverImage,
        chapters,
        style: style.name,
        wordCount: totalWords,
        updatedAt: serverTimestamp(),
      });
      setSaveStatus("saved");
      hasUnsaved.current = false;
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

  /* ───── Editor ↔ UI sync ───── */
  useEffect(() => {
    if (!editor || !currentChapter) return;
    const page = currentChapter.pages[activePageIdx];
    if (page?.content) editor.commands.setContent(page.content);
    else editor.commands.setContent("");
    editor.commands.focus();
  }, [activeChapterIdx, activePageIdx, editor, currentChapter]);

  /* ───── Update placeholder when style changes ───── */
  useEffect(() => {
    if (editor) {
      const placeholderExt = editor.extensionManager.extensions.find(
        (ext) => ext.name === "placeholder"
      );
      if (placeholderExt && "options" in placeholderExt) {
        // @ts-ignore - accessing internal options
        placeholderExt.options.placeholder = style.prompt;
        // Force re-render of placeholder
        editor.view.dispatch(editor.state.tr);
      }
    }
  }, [style.prompt, editor]);

  /* ───── Online / offline ───── */
  useEffect(() => {
    const online = () => {
      isOnline.current = true;
      triggerSave();
    };
    const offline = () => {
      isOnline.current = false;
      setSaveStatus("offline");
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  /* ───── Chapter CRUD ───── */
  const addChapter = () => {
    const newCh: Chapter = {
      id: Date.now().toString(),
      title: `Chapter ${chapters.length + 1}`,
      pages: [{ id: Date.now() + "-p", title: "Page 1", content: null, html: "" }],
    };
    setChapters((c) => [...c, newCh]);
    setActiveChapterIdx(chapters.length);
    setActivePageIdx(0);
    setOpenChapters((s) => new Set([...s, newCh.id]));
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
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  /* ───── Page CRUD ───── */
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
      c.map((ch, i) =>
        i === activeChapterIdx ? { ...ch, pages: newOrder } : ch
      )
    );
    triggerSave();
  };

  /* ───── Image upload ───── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  /* ───── Publish ───── */
  const publish = async () => {
    if (!user?.email) return toast.error("User missing");
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
      navConfirmed.current = true;
      router.push("/read");
    } catch (e) {
      console.error(e);
      toast.error("Publish failed");
    } finally {
      setIsPublishing(false);
    }
  };

  /* ───── Unsaved-changes guard ───── */
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (hasUnsaved.current && !navConfirmed.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const pop = () => {
      if (hasUnsaved.current && !navConfirmed.current) {
        setShowUnsaved(true);
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("beforeunload", before);
    window.addEventListener("popstate", pop);
    window.history.pushState(null, "", window.location.href);
    return () => {
      window.removeEventListener("beforeunload", before);
      window.removeEventListener("popstate", pop);
    };
  }, []);

  const confirmLeave = async (saveFirst = false) => {
    if (saveFirst) await triggerSave();
    navConfirmed.current = true;
    setShowUnsaved(false);
    router.push("/story");
  };

  /* ───── Shared Sidebar UI ───── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
      {/* Cover */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative cursor-pointer overflow-hidden rounded-2xl shadow-lg"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="h-48 border-2 border-dashed border-gray-300 bg-linear-to-br from-gray-50 to-gray-100 dark:border-gray-600 dark:from-gray-800 dark:to-gray-700">
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        className="hidden"
      />

      {/* Chapters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
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

        {chapters.map((ch, ci) => {
          const open = openChapters.has(ch.id);
          return (
            <div key={ch.id} className="space-y-1">
              <motion.div
                layout
                className={`group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${
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
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                  className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>

              <AnimatePresence>
                {open && (
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
        className="w-full py-3 rounded-xl bg-linear-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {isPublishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        {isPublishing ? "Publishing…" : "Publish My Story"}
      </motion.button>
    </div>
  );

  /* ───── Desktop Layout ───── */
  if (!isMobile) {
    return (
      <>
        <Toaster position="top-center" />
        {/* Unsaved dialog */}
        <AnimatePresence>
          {showUnsaved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
              onClick={() => setShowUnsaved(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                  <h3 className="text-xl font-bold">Unsaved Changes</h3>
                </div>
                <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                  Save now before leaving?
                </p>
                <div className="flex justify-end gap-2 text-sm">
                  <button
                    onClick={() => setShowUnsaved(false)}
                    className="rounded-xl bg-gray-100 px-4 py-2 hover:bg-gray-200 dark:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => confirmLeave(false)}
                    className="rounded-xl bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                  >
                    Leave
                  </button>
                  <button
                    onClick={() => confirmLeave(true)}
                    className="rounded-xl bg-linear-to-r from-green-500 to-emerald-500 px-4 py-2 font-medium text-white"
                  >
                    Save & Leave
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed inset-0 flex">
          {/* Sidebar */}
          <div className="w-80 flex flex-col bg-white/90 backdrop-blur-xl dark:bg-gray-800/90">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200/50 p-4 dark:border-gray-700/50">
              <button
                onClick={() => router.push("/story")}
                className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => {
                  setBookTitle(e.target.value);
                  triggerSave();
                }}
                className="mx-3 flex-1 bg-transparent text-2xl font-bold outline-none"
                placeholder="My Life Story"
              />
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {totalWords} words
                </div>
                <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-700">
                  {saveStatus === "saved" && <Check className="h-3 w-3 text-green-500" />}
                  {saveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
                  {saveStatus === "offline" && <X className="h-3 w-3 text-red-500" />}
                  {saveStatus === "error" && <X className="h-3 w-3 text-red-500" />}
                  <span className="ml-1">
                    {saveStatus === "saved"
                      ? "Saved"
                      : saveStatus === "saving"
                      ? "Saving…"
                      : saveStatus === "offline"
                      ? "Offline"
                      : "Error"}
                  </span>
                </div>
              </div>
            </div>

            <SidebarContent />
          </div>

          {/* Right panel */}
          <div className="flex flex-1 flex-col">
            {/* Toolbar tabs */}
            <div className="flex border-b border-gray-200/50 bg-white/90 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-800/90">
              {(["home", "insert", "style"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex flex-1 items-center justify-center gap-2 py-3 px-6 font-medium transition ${
                    activeTab === tab
                      ? "bg-linear-to-r from-indigo-500 to-purple-500 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab === "home" && <Home className="h-5 w-5" />}
                  {tab === "insert" && <ImageIcon className="h-5 w-5" />}
                  {tab === "style" && <Palette className="h-5 w-5" />}
                  <span className="capitalize">{tab}</span>
                </button>
              ))}
            </div>

            {/* Toolbar content */}
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto border-b border-gray-200/50 bg-white/90 p-3 backdrop-blur-md dark:border-gray-700/50 dark:bg-gray-800/90">
              {activeTab === "home" && (
                <>
                  <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2.5 rounded-xl ${editor?.isActive("bold") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><BoldIcon className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2.5 rounded-xl ${editor?.isActive("italic") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><ItalicIcon className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().toggleStrike().run()} className={`p-2.5 rounded-xl ${editor?.isActive("strike") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><Strikethrough className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2.5 rounded-xl ${editor?.isActive("heading", { level: 1 }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><Heading1 className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2.5 rounded-xl ${editor?.isActive("heading", { level: 2 }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><Heading2 className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2.5 rounded-xl ${editor?.isActive("bulletList") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><List className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`p-2.5 rounded-xl ${editor?.isActive("orderedList") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><ListOrdered className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().setTextAlign("left").run()} className={`p-2.5 rounded-xl ${editor?.isActive({ textAlign: "left" }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><AlignLeft className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().setTextAlign("center").run()} className={`p-2.5 rounded-xl ${editor?.isActive({ textAlign: "center" }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><AlignCenter className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().setTextAlign("right").run()} className={`p-2.5 rounded-xl ${editor?.isActive({ textAlign: "right" }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><AlignRight className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().setTextAlign("justify").run()} className={`p-2.5 rounded-xl ${editor?.isActive({ textAlign: "justify" }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><AlignJustify className="h-5 w-5" /></button>
                  <button onClick={() => editor?.chain().focus().toggleHighlight().run()} className={`p-2.5 rounded-xl ${editor?.isActive("highlight") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-50 dark:bg-gray-700"}`}><Highlighter className="h-5 w-5" /></button>
                </>
              )}
              {activeTab === "insert" && (
                <label className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 cursor-pointer flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-sm">Insert Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
              {activeTab === "style" && (
                <div className="flex gap-2">
                  {STYLES.map((s) => (
                    <motion.button
                      key={s.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setStyle(s);
                        triggerSave();
                      }}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                        style.name === s.name
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                      }`}
                    >
                      <s.icon className="h-6 w-6 mb-1 text-indigo-600" />
                      <span className="text-xs font-medium">{s.name}</span>
                    </motion.button>
                  ))}
                </div>
              )}
              <div className="ml-auto flex gap-2">
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 disabled:opacity-50"><Undo2 className="h-5 w-5" /></motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700 disabled:opacity-50"><Redo2 className="h-5 w-5" /></motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setIsPreview((p) => !p)} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700">
                  {isPreview ? <Edit2 className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </motion.button>
              </div>
            </div>

            {/* Editor / Preview */}
            <div className="flex-1 overflow-auto bg-white dark:bg-gray-50">
              {isPreview ? (
                <div
                  className="prose prose-lg max-w-none p-8"
                  dangerouslySetInnerHTML={{
                    __html: currentChapter?.pages[activePageIdx]?.html ?? "",
                  }}
                />
              ) : (
                <EditorContent
                  editor={editor}
                  className="h-full w-full p-0 m-0"
                />
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ───── Mobile Layout ───── */
  return (
    <>
      <Toaster position="top-center" />
      {/* Unsaved dialog */}
      <AnimatePresence>
        {showUnsaved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
            onClick={() => setShowUnsaved(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-amber-500" />
                <h3 className="text-xl font-bold">Unsaved Changes</h3>
              </div>
              <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
                Save now before leaving?
              </p>
              <div className="flex justify-end gap-2 text-sm">
                <button
                  onClick={() => setShowUnsaved(false)}
                  className="rounded-xl bg-gray-100 px-4 py-2 hover:bg-gray-200 dark:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmLeave(false)}
                  className="rounded-xl bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                >
                  Leave
                </button>
                <button
                  onClick={() => confirmLeave(true)}
                  className="rounded-xl bg-linear-to-r from-green-500 to-emerald-500 px-4 py-2 font-medium text-white"
                >
                  Save & Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Top Bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-white/95 p-3 backdrop-blur-xl shadow-md dark:bg-gray-800/95">
        <button
          onClick={() => router.push("/story")}
          className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <input
          type="text"
          value={bookTitle}
          onChange={(e) => {
            setBookTitle(e.target.value);
            triggerSave();
          }}
          className="flex-1 mx-2 bg-transparent text-lg font-semibold outline-none truncate"
          placeholder="My Life Story"
        />

        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Floating Toolbar */}
      <div className="fixed inset-x-0 top-14 z-30 flex flex-wrap items-center gap-2 overflow-x-auto bg-white/95 p-2 backdrop-blur-xl shadow-sm dark:bg-gray-800/95">
        {activeTab === "home" && (
          <>
            <button onClick={() => editor?.chain().focus().toggleBold().run()} className={`p-2 rounded-lg ${editor?.isActive("bold") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-100 dark:bg-gray-700"}`}><BoldIcon className="h-5 w-5" /></button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg ${editor?.isActive("italic") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-100 dark:bg-gray-700"}`}><ItalicIcon className="h-5 w-5" /></button>
            <button onClick={() => editor?.chain().focus().toggleStrike().run()} className={`p-2 rounded-lg ${editor?.isActive("strike") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-100 dark:bg-gray-700"}`}><Strikethrough className="h-5 w-5" /></button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded-lg ${editor?.isActive("heading", { level: 1 }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-100 dark:bg-gray-700"}`}><Heading1 className="h-5 w-5" /></button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded-lg ${editor?.isActive("heading", { level: 2 }) ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-100 dark:bg-gray-700"}`}><Heading2 className="h-5 w-5" /></button>
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg ${editor?.isActive("bulletList") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-100 dark:bg-gray-700"}`}><List className="h-5 w-5" /></button>
            <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-lg ${editor?.isActive("orderedList") ? "bg-indigo-100 dark:bg-indigo-900/50" : "bg-gray-100 dark:bg-gray-700"}`}><ListOrdered className="h-5 w-5" /></button>
          </>
        )}
        {activeTab === "insert" && (
          <label className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 cursor-pointer flex items-center gap-1.5">
            <ImageIcon className="h-5 w-5" />
            <span className="text-xs">Image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        )}
        {activeTab === "style" && (
          <div className="flex gap-1.5">
            {STYLES.map((s) => (
              <motion.button
                key={s.name}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setStyle(s);
                  triggerSave();
                }}
                className={`p-2 rounded-lg border-2 transition-all flex flex-col items-center ${
                  style.name === s.name
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <s.icon className="h-5 w-5 text-indigo-600" />
                <span className="text-xs">{s.name}</span>
              </motion.button>
            ))}
          </div>
        )}
        <div className="ml-auto flex gap-1.5">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"><Undo2 className="h-5 w-5" /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50"><Redo2 className="h-5 w-5" /></motion.button>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsPreview((p) => !p)} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
            {isPreview ? <Edit2 className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </motion.button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="fixed inset-x-0 top-22 z-30 flex justify-center gap-2 bg-white/95 p-1 backdrop-blur-xl dark:bg-gray-800/95">
        {(["home", "insert", "style"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {tab === "home" && <Home className="h-4 w-4" />}
            {tab === "insert" && <ImageIcon className="h-4 w-4" />}
            {tab === "style" && <Palette className="h-4 w-4" />}
            <span className="capitalize">{tab}</span>
          </button>
        ))}
      </div>

      {/* Editor / Preview */}
      <div className="pt-28 pb-16 overflow-auto h-screen bg-white dark:bg-gray-50">
        {isPreview ? (
          <div
            className="prose prose-lg max-w-none p-6"
            dangerouslySetInnerHTML={{
              __html: currentChapter?.pages[activePageIdx]?.html ?? "",
            }}
          />
        ) : (
          <EditorContent editor={editor} className="h-full w-full p-0 m-0" />
        )}
      </div>

      {/* Mobile Sidebar Sheet */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 bg-white/98 backdrop-blur-xl dark:bg-gray-800/98"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <h2 className="text-xl font-bold">Book</h2>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-4rem)] overflow-y-auto">
              <SidebarContent />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between bg-white/95 p-3 backdrop-blur-xl shadow-lg dark:bg-gray-800/95">
        <span className="text-sm font-medium">{totalWords} words</span>
        <div className="flex items-center gap-1 text-xs">
          {saveStatus === "saved" && <Check className="h-3 w-3 text-green-500" />}
          {saveStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin text-amber-500" />}
          {saveStatus === "offline" && <X className="h-3 w-3 text-red-500" />}
          {saveStatus === "error" && <X className="h-3 w-3 text-red-500" />}
          <span className="ml-1">
            {saveStatus === "saved"
              ? "Saved"
              : saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "offline"
              ? "Offline"
              : "Error"}
          </span>
        </div>
      </div>
    </>
  );
}