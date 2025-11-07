"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle,
  MessageCircle,
  BookOpen,
  Trash2,
  Eye,
  Globe,
  GlobeLock,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseconfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.email) return;
    setLoading(true);

    try {
      // 1. Get all user's books
      const booksQuery = query(
        collection(db, "books"),
        where("authorEmail", "==", user.email)
      );
      const booksSnap = await getDocs(booksQuery);
      const books: Book[] = booksSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Book[];

      // 2. Generate notifications from publish status & reads
      const notifs: Notification[] = [];
      const now = new Date();

      books.forEach((book) => {
        book.chapters.forEach((chapter) => {
          const chapterDocRef = doc(db, "books", book.id);

          // Published notification
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

          // Read count update (only if > 0)
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

      // Sort by timestamp desc
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

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification removed");
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All marked as read");
  };

  const filteredNotifications = filter === "unread"
    ? notifications.filter((n) => !n.read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Please log in to view notifications
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-3">
            <Bell className="h-10 w-10 text-indigo-600 dark:text-purple-400" />
            Notifications
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                {unreadCount} unread
              </span>
            )}
            {unreadCount === 0 && "You're all caught up!"}
          </p>
        </motion.div>

        {/* Actions Bar */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all shadow-sm ${
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all shadow-sm ${
              filter === "unread"
                ? "bg-indigo-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            Unread ({unreadCount})
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-3 bg-emerald-600 text-white rounded-2xl font-medium hover:bg-emerald-700 transition"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        )}

        {/* Empty State */}
        <AnimatePresence>
          {!loading && filteredNotifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <Bell className="mx-auto h-20 w-20 text-gray-300 dark:text-gray-700 mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No notifications yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Publish a chapter to get started!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications List */}
        <ul className="space-y-4">
          <AnimatePresence>
            {filteredNotifications.map((notif, idx) => (
              <motion.li
                key={notif.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg border ${
                  !notif.read
                    ? "border-indigo-300 dark:border-purple-600 ring-2 ring-indigo-200 dark:ring-purple-800/30"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
                      notif.type === "published"
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                    }`}
                  >
                    {notif.type === "published" ? (
                      <Globe className="h-6 w-6" />
                    ) : (
                      <Eye className="h-6 w-6" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className={`font-bold text-lg ${!notif.read ? "text-indigo-600 dark:text-purple-400" : "text-gray-900 dark:text-gray-100"}`}>
                          {notif.type === "published" ? "Chapter Published!" : "Readers Are Loving It!"}
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 mt-1 font-medium">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">in</span>
                          <Link
                            href={`/story-studio/${notif.bookId}`}
                            className="font-semibold text-indigo-600 dark:text-purple-400 hover:underline"
                          >
                            {notif.bookTitle}
                          </Link>
                          <span className="text-gray-500 dark:text-gray-400">→</span>
                          <span className="font-medium truncate max-w-[180px]">
                            {notif.chapterTitle}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!notif.read && (
                          <button
                            onClick={() => markAsRead(notif.id)}
                            className="p-2 rounded-xl bg-indigo-100 dark:bg-purple-900/50 hover:bg-indigo-200 dark:hover:bg-purple-800 transition"
                          >
                            <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-purple-400" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800 transition"
                        >
                          <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
                      {notif.timestamp.toLocaleTimeString()} • {notif.timestamp.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* Back Link */}
        <div className="mt-12 text-center">
          <Link
            href="/story"
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-purple-400 hover:underline text-lg font-medium"
          >
            ← Back to My Stories
          </Link>
        </div>
      </div>
    </div>
  );
}