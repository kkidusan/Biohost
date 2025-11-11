// components/NotificationsPage.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Bell,
  CheckCircle,
  Trash2,
  Eye,
  Globe,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext"; // Added for theme-aware gradients
import { db } from "../firebaseconfig";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { toast } from "react-hot-toast";

interface Chapter {
  id: string;
  title: string;
  publish: boolean;
  isRead: number;
}

interface Book {
  id: string;
  title: string;
  chapters: Chapter[];
}

interface Notification {
  id: string;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  bookTitle: string;
  type: "published" | "read_update";
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function NotificationsPage() {
  const { user, isLoggedIn } = useAuth();
  const { theme } = useTheme(); // For dynamic gradients
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.email) return;
    setLoading(true);

    try {
      const booksQuery = query(
        collection(db, "books"),
        where("authorEmail", "==", user.email)
      );
      const booksSnap = await getDocs(booksQuery);
      const books: Book[] = booksSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Book[];

      const notifs: Notification[] = [];
      const now = new Date();

      books.forEach((book) => {
        book.chapters.forEach((chapter) => {
          if (chapter.publish) {
            notifs.push({
              id: `${book.id}_${chapter.id}_published`,
              bookId: book.id,
              chapterId: chapter.id,
              bookTitle: book.title,
              chapterTitle: chapter.title,
              type: "published",
              message: `Chapter "${chapter.title}" is now live!`,
              timestamp: now,
              read: false,
            });
          }

          if (chapter.isRead > 0) {
            notifs.push({
              id: `${book.id}_${chapter.id}_reads_${chapter.isRead}`,
              bookId: book.id,
              chapterId: chapter.id,
              bookTitle: book.title,
              chapterTitle: chapter.title,
              type: "read_update",
              message: `Your chapter has been read ${chapter.isRead} time${chapter.isRead > 1 ? "s" : ""}`,
              timestamp: now,
              read: false,
            });
          }
        });
      });

      notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setNotifications(notifs);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchNotifications();
  }, [isLoggedIn, user?.email]);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification removed");
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All marked as read");
  };

  const filteredNotifications = filter === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-black text-gray-700 dark:text-gray-300">
        <p className="text-xl font-medium">Please log in to view notifications</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 dark:from-blue-500/5 dark:via-purple-500/5 dark:to-pink-500/5">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 120, 0], y: [0, -80, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-orange-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 mb-4">
            <Bell className="h-6 w-6 text-purple-400" />
            <span className="font-semibold text-white">Notifications</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 drop-shadow-lg">
            Your Story Updates
          </h1>

          <p className="mt-3 text-lg text-gray-700 dark:text-gray-300">
            {unreadCount > 0 ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                <strong>{unreadCount} unread</strong> — stay in the loop!
              </span>
            ) : (
              "You're all caught up! <Sparkles className=\"inline h-5 w-5 text-yellow-400\" />"
            )}
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-8"
        >
          {[
            { label: "All", value: "all", count: notifications.length },
            { label: "Unread", value: "unread", count: unreadCount },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-lg transition-all shadow-lg backdrop-blur-xl border ${
                filter === tab.value
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white border-white/30 shadow-purple-500/30"
                  : "bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-white/70 dark:hover:bg-gray-700/70"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}

          {unreadCount > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={markAllAsRead}
              className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold shadow-lg backdrop-blur-xl border border-white/20 flex items-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Mark All
            </motion.button>
          )}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-20"
          >
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-purple-500 border-t-transparent"></div>
          </motion.div>
        )}

        {/* Empty State */}
        <AnimatePresence>
          {!loading && filteredNotifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-24"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Bell className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-600 mb-6" />
              </motion.div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Publish your first chapter to get started!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications List */}
        <motion.ul
          className="space-y-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AnimatePresence>
            {filteredNotifications.map((notif, idx) => (
              <NotificationCard
                key={notif.id}
                notif={notif}
                index={idx}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
                theme={theme}
              />
            ))}
          </AnimatePresence>
        </motion.ul>

        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <Link
            href="/story"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-white/70 dark:hover:bg-gray-700/70 transition-all shadow-md"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to My Stories
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

// Extracted Reusable Notification Card
function NotificationCard({
  notif,
  index,
  onMarkRead,
  onDelete,
  theme,
}: {
  notif: Notification;
  index: number;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  theme: "light" | "dark";
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  const gradient = notif.type === "published"
    ? "from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-cyan-500"
    : "from-purple-500 to-pink-600 dark:from-violet-400 dark:to-pink-500";

  return (
    <motion.li
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Hover Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-0 group-hover:opacity-70 transition duration-500" />

      <div className="relative z-10 flex items-start gap-4">
        {/* Icon */}
        <div className={`p-3 rounded-2xl bg-gradient-to-r ${gradient} shadow-lg`}>
          {notif.type === "published" ? (
            <Globe className="h-7 w-7 text-white" />
          ) : (
            <Eye className="h-7 w-7 text-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {notif.type === "published" ? "Chapter Published!" : "Readers Are Loving It!"}
          </h3>
          <p className="mt-1 text-gray-700 dark:text-gray-300 font-medium">
            {notif.message}
          </p>

          <div className="flex items-center gap-2 mt-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">in</span>
            <Link
              href={`/story-studio/${notif.bookId}`}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {notif.bookTitle}
            </Link>
            <span className="text-gray-500 dark:text-gray-400">→</span>
            <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
              {notif.chapterTitle}
            </span>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            {notif.timestamp.toLocaleString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!notif.read && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onMarkRead(notif.id)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
            >
              <CheckCircle className="h-5 w-5" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(notif.id)}
            className="p-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md"
          >
            <Trash2 className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Unread Indicator */}
      {!notif.read && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-6 right-6 h-3 w-3 bg-red-500 rounded-full"
        />
      )}
    </motion.li>
  );
}