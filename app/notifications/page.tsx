"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, MessageCircle, BookOpen, Trash2, Eye } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: "info" | "success" | "warning";
  read: boolean;
  timestamp: string;
  action?: { label: string; href: string };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    // Simulate fetching notifications (replace with API)
    const sampleNotifications: Notification[] = [
      {
        id: "1",
        title: "New Story Published",
        description: "Your story 'Bio Adventures' is now live!",
        type: "success",
        read: false,
        timestamp: "2 min ago",
        action: { label: "View Story", href: "/story" },
      },
      {
        id: "2",
        title: "Welcome to BioHost",
        description: "Get started with our quick tour.",
        type: "info",
        read: true,
        timestamp: "1 day ago",
      },
      {
        id: "3",
        title: "New Follower",
        description: "John Doe started following you.",
        type: "info",
        read: false,
        timestamp: "3 hours ago",
        action: { label: "View Profile", href: "/profile/john-doe" },
      },
      {
        id: "4",
        title: "Comment on Your Post",
        description: "Someone commented on your recent bio update.",
        type: "warning",
        read: true,
        timestamp: "5 days ago",
        action: { label: "View Comment", href: "/story/123/comments" },
      },
    ];
    setNotifications(sampleNotifications);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const filteredNotifications = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center gap-2">
            <Bell className="h-8 w-8 text-blue-600 dark:text-yellow-400" />
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredNotifications.length} {filter === "unread" ? "unread" : "total"} notifications
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              filter === "unread"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
          >
            Unread
          </button>
        </div>

        {/* Empty State */}
        <AnimatePresence>
          {filteredNotifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <Bell className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No notifications</h3>
              <p className="text-gray-500 dark:text-gray-400">You're all caught up!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications List */}
        <ul className="space-y-4">
          <AnimatePresence>
            {filteredNotifications.map((notification) => (
              <motion.li
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white dark:bg-gray-800/95 rounded-2xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    notification.type === "success" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                    notification.type === "warning" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400" :
                    "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  }`}>
                    {notification.type === "success" && <CheckCircle className="h-5 w-5" />}
                    {notification.type === "info" && <MessageCircle className="h-5 w-5" />}
                    {notification.type === "warning" && <BookOpen className="h-5 w-5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-semibold text-sm ${
                          !notification.read ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"
                        }`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{notification.description}</p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-2 flex-shrink-0"
                        >
                          <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{notification.timestamp}</p>
                    {notification.action && (
                      <Link
                        href={notification.action.href}
                        className="inline-block mt-2 text-xs font-medium text-blue-600 dark:text-yellow-400 hover:underline"
                      >
                        {notification.action.label}
                      </Link>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="ml-2 flex-shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-yellow-400 hover:underline text-sm"
          >
            ← Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}