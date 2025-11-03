"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  Mail,
  Calendar,
  BookOpen,
  Eye,
  PenTool,
  Sparkles,
  Edit2,
  Loader2,
  Save,
  X,
  Upload,
  Trash2,
  Copy,
  Share2,
  Camera,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseconfig";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";

// Cloudinary Config (from .env.local)
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

interface ProfileData {
  fullName: string;
  email: string;
  bio?: string;
  photoURL?: string;
  joinedAt: Date;
  storiesPublished: number;
  totalReads: number;
}

const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23e5e7eb'%3E%3Cpath d='M50 10c22.091 0 40 17.909 40 40s-17.909 40-40 40S10 72.091 10 50s17.909-40 40-40zm0 10c-16.569 0-30 13.431-30 30 0 7.732 2.927 14.777 7.727 20.109 5.332-5.795 13.07-9.109 21.273-9.109 8.203 0 15.941 3.314 21.273 9.109C72.073 64.777 75 57.732 75 50c0-16.569-13.431-30-30-30zm0 10c6.075 0 11 4.925 11 11s-4.925 11-11 11-11-4.925-11-11 4.925-11 11-11z'/%3E%3C/svg%3E";

export default function ProfilePage() {
  const { user, isLoggedIn } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileDocId, setProfileDocId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit states
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [bioText, setBioText] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  /* -------------------------- FETCH PROFILE -------------------------- */
  const fetchProfile = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setError("");

      const q = query(
        collection(db, "customers"),
        where("email", "==", user.email)
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Profile not found.");
        return;
      }

      const d = snap.docs[0];
      const data = d.data();
      setProfileDocId(d.id);

      const profileData: ProfileData = {
        fullName: data.fullName ?? "User",
        email: data.email,
        bio: data.bio ?? "",
        photoURL: data.photoURL ?? undefined,
        joinedAt:
          data.createdAt?.toDate?.() ??
          new Date(data.createdAt) ??
          new Date(),
        storiesPublished: data.stories?.length ?? 0,
        totalReads: data.totalReads ?? 0,
      };

      setProfile(profileData);
      setEditingName(profileData.fullName);
    } catch (e) {
      console.error(e);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isLoggedIn && user?.email) fetchProfile();
  }, [isLoggedIn, user?.email, fetchProfile]);

  /* -------------------------- NAME EDIT -------------------------- */
  const startNameEdit = () => {
    setEditingName(profile?.fullName || "");
    setIsNameEditing(true);
  };

  const saveName = async () => {
    if (!profileDocId || editingName.trim() === profile?.fullName) {
      setIsNameEditing(false);
      return;
    }

    setSavingName(true);
    try {
      const docRef = doc(db, "customers", profileDocId); // Fixed typo
      await updateDoc(docRef, { fullName: editingName.trim() });
      setProfile((p) => (p ? { ...p, fullName: editingName.trim() } : p));
      toast.success("Name updated!");
      setIsNameEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  const cancelNameEdit = () => {
    setEditingName(profile?.fullName || "");
    setIsNameEditing(false);
  };

  /* -------------------------- BIO -------------------------- */
  const openBioModal = () => {
    setBioText(profile?.bio ?? "");
    setIsBioModalOpen(true);
  };

  const saveBio = async () => {
    if (!profileDocId) return;
    try {
      setSavingBio(true);
      const refDoc = doc(db, "customers", profileDocId);
      await updateDoc(refDoc, { bio: bioText });
      setProfile((p) => (p ? { ...p, bio: bioText } : p));
      setIsBioModalOpen(false);
      toast.success("Bio updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save bio.");
    } finally {
      setSavingBio(false);
    }
  };

  /* -------------------------- AVATAR (CLOUDINARY) -------------------------- */
  const openAvatarModal = () => setIsAvatarModalOpen(true);
  const closeAvatarModal = () => {
    setIsAvatarModalOpen(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image.");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragEnter = () => {
    dragCounter.current++;
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const uploadToCloudinary = async (): Promise<string> => {
    if (!avatarFile) throw new Error("No file selected");

    const formData = new FormData();
    formData.append("file", avatarFile);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message ?? "Upload failed");
    }

    const data = await res.json();
    return data.secure_url;
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !profileDocId) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary();
      const docRef = doc(db, "customers", profileDocId);
      await updateDoc(docRef, { photoURL: url });

      setProfile((p) => (p ? { ...p, photoURL: url } : p));
      toast.success("Profile picture updated!");
      closeAvatarModal();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Failed to upload picture.");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!profileDocId || !profile?.photoURL) return;

    try {
      const docRef = doc(db, "customers", profileDocId);
      await updateDoc(docRef, { photoURL: "" });
      setProfile((p) => (p ? { ...p, photoURL: undefined } : p));
      toast.success("Picture removed.");
      closeAvatarModal();
    } catch (err) {
      toast.error("Could not remove picture.");
    }
  };

  /* -------------------------- UI HELPERS -------------------------- */
  const copyEmail = () => {
    navigator.clipboard.writeText(profile?.email ?? "");
    toast.success("Email copied!");
  };

  const shareProfile = () => {
    const link = `${window.location.origin}/@${profile?.fullName
      .toLowerCase()
      .replace(/\s+/g, "")}`;
    navigator.clipboard.writeText(link);
    toast.success("Profile link copied!");
  };

  const formattedJoinDate = profile?.joinedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* -------------------------- RENDER -------------------------- */
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Please log in to view your profile.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-yellow-400" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-black pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="relative p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* ==== AVATAR ==== */}
                <div className="relative group">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-lg cursor-pointer ring-4 ring-white/50 dark:ring-gray-700/50"
                    onClick={openAvatarModal}
                  >
                    <img
                      src={profile.photoURL ?? DEFAULT_AVATAR}
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </div>

                {/* ==== INFO ==== */}
                <div className="flex-1 text-center md:text-left">
                  {/* FULL NAME - CLICK TO EDIT */}
                  <div className="relative">
                    {isNameEditing ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveName();
                            if (e.key === "Escape") cancelNameEdit();
                          }}
                          className="text-4xl md:text-5xl font-bold bg-transparent border-b-2 border-blue-500 outline-none px-1 py-2 text-gray-800 dark:text-white"
                          autoFocus
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={saveName}
                          disabled={savingName}
                          className="p-2 rounded-full bg-green-500 text-white"
                        >
                          {savingName ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Check className="h-5 w-5" />
                          )}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={cancelNameEdit}
                          className="p-2 rounded-full bg-red-500 text-white"
                        >
                          <X className="h-5 w-5" />
                        </motion.button>
                      </motion.div>
                    ) : (
                      <h1
                        onClick={startNameEdit}
                        className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500 cursor-pointer inline-block group"
                      >
                        {profile.fullName}
                        <motion.span
                          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          whileHover={{ scale: 1.2 }}
                        >
                          <Edit2 className="h-5 w-5 inline text-gray-500" />
                        </motion.span>
                      </h1>
                    )}
                  </div>

                  <p
                    className="mt-2 text-lg text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2 cursor-pointer"
                    onClick={copyEmail}
                  >
                    <Mail className="h-5 w-5" />
                    {profile.email}
                    <Copy className="h-4 w-4 ml-1 opacity-60 hover:opacity-100" />
                  </p>

                  {/* BIO */}
                  {profile.bio ? (
                    <motion.div
                      className="mt-4 relative max-w-2xl group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <p className="text-gray-700 dark:text-gray-200">{profile.bio}</p>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={openBioModal}
                        className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-gradient-to-r from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500 shadow-md"
                        title="Edit Bio"
                      >
                        <Edit2 className="h-4 w-4 text-white" />
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div
                      className="mt-4 flex items-center gap-3 text-gray-500 dark:text-gray-400 italic group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={openBioModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 dark:bg-gray-700/70 text-gray-700 dark:text-gray-200 font-medium shadow-sm border border-gray-200 dark:border-gray-600 transition-all"
                      >
                        <PenTool className="h-4 w-4 text-blue-500 dark:text-yellow-400" />
                        <span>Add Bio</span>
                      </motion.button>
                      <span>No bio yet. Tell your story!</span>
                    </motion.div>
                  )}

                  <div className="mt-6 flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    Joined {formattedJoinDate}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={shareProfile}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-md"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Profile
                  </motion.button>
                </div>
              </div>

              {/* ==== STATS ==== */}
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard
                  icon={<BookOpen className="h-6 w-6" />}
                  label="Stories Published"
                  value={profile.storiesPublished}
                />
                <StatCard
                  icon={<Eye className="h-6 w-6" />}
                  label="Total Reads"
                  value={profile.totalReads}
                />
                <StatCard
                  icon={<Sparkles className="h-6 w-6" />}
                  label="Member For"
                  value={
                    profile.joinedAt
                      ? `${Math.floor(
                          (Date.now() - profile.joinedAt.getTime()) /
                            (1000 * 60 * 60 * 24)
                        )} days`
                      : "-"
                  }
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ====================== BIO MODAL ====================== */}
      <AnimatePresence>
        {isBioModalOpen && (
          <ModalBackdrop onClick={() => setIsBioModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Edit Bio
                </h2>
                <button onClick={() => setIsBioModalOpen(false)}>
                  <X className="h-6 w-6 text-gray-500 hover:text-red-500" />
                </button>
              </div>

              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value.slice(0, 200))}
                placeholder="Write something meaningful about yourself..."
                className="w-full h-32 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none border border-gray-300 dark:border-gray-600 resize-none"
              />

              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {bioText.length}/200
                </p>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={saveBio}
                  disabled={savingBio}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {savingBio ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </motion.button>
              </div>
            </motion.div>
          </ModalBackdrop>
        )}
      </AnimatePresence>

      {/* ====================== AVATAR MODAL ====================== */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <ModalBackdrop onClick={closeAvatarModal}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Change Profile Picture
                </h2>
                <button onClick={closeAvatarModal}>
                  <X className="h-6 w-6 text-gray-500 hover:text-red-500" />
                </button>
              </div>

              <div
                className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-full h-48 object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <Upload className="h-12 w-12 mb-2" />
                    <p className="text-sm">Drop image here or click to browse</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFileSelect(e.target.files[0])
                  }
                />
              </div>

              <div className="flex justify-between mt-6">
                {profile?.photoURL && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={removeAvatar}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </motion.button>
                )}

                <div className="flex gap-2 ml-auto">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium"
                  >
                    Choose File
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={uploadAvatar}
                    disabled={!avatarFile || uploading}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500 text-white font-semibold shadow-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </ModalBackdrop>
        )}
      </AnimatePresence>
    </>
  );
}

/* ====================== REUSABLE COMPONENTS ====================== */
function ModalBackdrop({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      {children}
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-gradient-to-br from-white/70 to-gray-50 dark:from-gray-800/70 dark:to-gray-900/70 rounded-2xl p-5 shadow-md border border-gray-200/50 dark:border-gray-700/50"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-teal-500 text-white">
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}