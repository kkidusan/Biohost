"use client";
// app/student/profile/page.tsx
import React, { useState, useEffect, useMemo } from "react";
import { User, ShieldCheck, BookOpen, MapPin, Upload, Loader2, CheckCircle2, Plus, Trash2, Calendar, Navigation } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseconfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface ScheduleRule {
  day: string;
  timeSlot: string;
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gradeLevel, setGradeLevel] = useState("High School");
  const [learningMode, setLearningMode] = useState<"Online" | "In-Person" | "Both">("Online");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200");
  const [subjects, setSubjects] = useState<string[]>(["Mathematics", "English"]);
  const [schedules, setSchedules] = useState<ScheduleRule[]>([
    { day: "Monday", timeSlot: "3:00 PM - 5:00 PM" }
  ]);

  const [initialData, setInitialData] = useState<{
    name: string;
    gradeLevel: string;
    learningMode: "Online" | "In-Person" | "Both";
    location: string;
    bio: string;
    avatar: string;
    subjects: string[];
    schedules: ScheduleRule[];
  }>({
    name: "",
    gradeLevel: "High School",
    learningMode: "Online",
    location: "",
    bio: "",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    subjects: ["Mathematics", "English"],
    schedules: [{ day: "Monday", timeSlot: "3:00 PM - 5:00 PM" }],
  });

  const [newSubject, setNewSubject] = useState("");
  const [newDay, setNewDay] = useState("Monday");
  const [newTimeSlot, setNewTimeSlot] = useState("");

  const [uploading, setUploading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    if (user) {
      const initialName = user.fullName || "";
      const initialEmail = user.email || "";
      setName(initialName);
      setEmail(initialEmail);

      const fetchStudentProfile = async () => {
        try {
          const docRef = doc(db, "customers", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const loadedName = data.fullName || data.name || initialName;
            const loadedGrade = data.gradeLevel || "High School";
            const loadedMode = data.learningMode || "Online";
            const loadedLocation = data.location || "";
            const loadedBio = data.bio || "";
            const loadedAvatar = data.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
            const loadedSubjects = data.subjects && Array.isArray(data.subjects) ? data.subjects : ["Mathematics", "English"];
            const loadedSchedules = data.schedules && Array.isArray(data.schedules) ? data.schedules : [{ day: "Monday", timeSlot: "3:00 PM - 5:00 PM" }];

            setName(loadedName);
            setGradeLevel(loadedGrade);
            setLearningMode(loadedMode);
            setLocation(loadedLocation);
            setBio(loadedBio);
            setAvatar(loadedAvatar);
            setSubjects(loadedSubjects);
            setSchedules(loadedSchedules);

            setInitialData({
              name: loadedName,
              gradeLevel: loadedGrade,
              learningMode: loadedMode,
              location: loadedLocation,
              bio: loadedBio,
              avatar: loadedAvatar,
              subjects: loadedSubjects,
              schedules: loadedSchedules,
            });
          } else {
            setInitialData({
              name: initialName,
              gradeLevel: "High School",
              learningMode: "Online",
              location: "",
              bio: "",
              avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
              subjects: ["Mathematics", "English"],
              schedules: [{ day: "Monday", timeSlot: "3:00 PM - 5:00 PM" }],
            });
          }
        } catch (err) {
          console.error("Error fetching student profile:", err);
        }
      };
      fetchStudentProfile();
    }
  }, [user]);

  const hasChanges = useMemo(() => {
    return (
      name !== initialData.name ||
      gradeLevel !== initialData.gradeLevel ||
      learningMode !== initialData.learningMode ||
      location !== initialData.location ||
      bio !== initialData.bio ||
      avatar !== initialData.avatar ||
      JSON.stringify(subjects) !== JSON.stringify(initialData.subjects) ||
      JSON.stringify(schedules) !== JSON.stringify(initialData.schedules)
    );
  }, [name, gradeLevel, learningMode, location, bio, avatar, subjects, schedules, initialData]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "vacancy");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dkifgcmpy";
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Cloudinary upload failed");

      setAvatar(data.secure_url);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      alert(err.message || "Failed to upload avatar.");
    } finally {
      setUploading(false);
    }
  };

  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      const ipData = await ipRes.json();
      if (ipData && ipData.city && ipData.country_name) {
        setLocation(`${ipData.city}, ${ipData.country_name}`);
        setDetectingLocation(false);
        return;
      }
    } catch (ipErr) {
      console.warn("IP geolocation fallback active...", ipErr);
    }

    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      setDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.state || "";
            const country = data.address.country || "";
            setLocation(city && country ? `${city}, ${country}` : city || country || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          } else {
            setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          }
        } catch (err) {
          setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        alert("Unable to detect location automatically.");
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    if (!subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
    }
    setNewSubject("");
  };

  const handleRemoveSubject = (subj: string) => {
    setSubjects(subjects.filter(s => s !== subj));
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimeSlot.trim()) {
      alert("Please enter a time slot.");
      return;
    }
    setSchedules([...schedules, { day: newDay, timeSlot: newTimeSlot.trim() }]);
    setNewTimeSlot("");
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasChanges) return;

    setSaving(true);
    try {
      const payload = {
        fullName: name,
        email,
        gradeLevel,
        learningMode,
        location,
        bio,
        avatar,
        subjects,
        schedules,
        role: "student",
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "customers", user.uid), payload, { merge: true });

      setInitialData({
        name,
        gradeLevel,
        learningMode,
        location,
        bio,
        avatar,
        subjects,
        schedules,
      });

      alert("Student profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 text-xs">
      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Personal Info */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4 shadow-xl">
            <h2 className="font-serif font-bold text-white text-sm flex items-center gap-2 border-b border-stone-800 pb-2">
              <User className="w-4 h-4 text-amber-500" /> Personal Information
            </h2>

            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border border-stone-800 bg-stone-950 shrink-0">
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  </div>
                )}
              </div>
              <label className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-semibold cursor-pointer transition border border-stone-700">
                <Upload className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Change Photo
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Grade Level</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="High School">High School</option>
                    <option value="University">University</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Learning Mode</label>
                  <select
                    value={learningMode}
                    onChange={(e) => setLearningMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Online">Online</option>
                    <option value="In-Person">In-Person</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Location</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    {detectingLocation ? "Detecting..." : "Detect Location"}
                  </button>
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. New York, NY"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Subjects & Schedule */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="font-serif font-bold text-white text-sm flex items-center gap-2 border-b border-stone-800 pb-2">
                <BookOpen className="w-4 h-4 text-amber-500" /> Subjects & Schedule
              </h2>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((subj, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-stone-950 text-amber-400 border border-stone-800 rounded-lg text-[11px] font-semibold flex items-center gap-1.5">
                      {subj}
                      <button type="button" onClick={() => handleRemoveSubject(subj)} className="text-stone-500 hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add subject..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="flex-1 px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                  <button type="button" onClick={handleAddSubject} className="px-3 py-2 bg-amber-500 text-stone-950 font-bold rounded-lg text-xs cursor-pointer">Add</button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-800">
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {schedules.map((sch, idx) => (
                    <div key={idx} className="p-2 bg-stone-950 border border-stone-800 rounded-lg flex justify-between items-center text-[11px] font-mono text-stone-300">
                      <span>{sch.day}: {sch.timeSlot}</span>
                      <button type="button" onClick={() => handleRemoveSchedule(idx)} className="text-stone-500 hover:text-red-400">×</button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                    className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200"
                  >
                    {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. 3 PM - 5 PM"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200"
                  />
                </div>
                <button type="button" onClick={handleAddSchedule} className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-semibold">
                  + Add Slot
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!hasChanges || saving}
                className={`w-full py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  hasChanges && !saving
                    ? "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/25 cursor-pointer opacity-100"
                    : "bg-stone-800 text-stone-500 cursor-not-allowed opacity-50"
                }`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {saving ? "Saving..." : hasChanges ? "Save Profile Changes" : "No Changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
