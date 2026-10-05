"use client";
// app/tutor/profile/page.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseconfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User, ShieldCheck, Award, BookOpen, DollarSign, MapPin, Clock, Upload, Loader2, CheckCircle2 } from "lucide-react";

export default function TutorProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [gradeLevel, setGradeLevel] = useState("Grades 9-10");
  const [hourlyRate, setHourlyRate] = useState(45);
  const [monthlyRate, setMonthlyRate] = useState(350);
  const [learningMode, setLearningMode] = useState<"Online" | "In-Person" | "Both">("Both");
  const [location, setLocation] = useState("New York, NY");
  const [credentials, setCredentials] = useState("Ph.D. Mathematics, Columbia University");
  const [experience, setExperience] = useState("8 Years Full-time Tutoring & University Teaching");
  const [avatar, setAvatar] = useState("https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200");
  const [bio, setBio] = useState("Ph.D. in Applied Mathematics from Columbia University with 8+ years of experience helping students excel in Calculus, Algebra, and SAT Math.");
  const [availabilityStr, setAvailabilityStr] = useState("Mon 3:00 PM, Wed 4:00 PM, Fri 2:00 PM, Sat 10:00 AM");

  // Options fetched from database
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([
    "Mathematics", "General Science", "English Language", "Information Technology", "Civics & Ethical Education", "Physics"
  ]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([
    "Grades 1-4", "Grades 5-6", "Grades 7-8", "Grades 9-10", "Grades 11-12", "University"
  ]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch options from database (adminMetadata/specialtiesConfig)
    const fetchDropdownOptions = async () => {
      try {
        const configDoc = await getDoc(doc(db, "adminMetadata", "specialtiesConfig"));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data.specialties && Array.isArray(data.specialties)) {
            setAvailableSpecialties(data.specialties.map((s: any) => s.name));
          }
          if (data.gradeLevels && Array.isArray(data.gradeLevels)) {
            setAvailableGrades(data.gradeLevels.map((g: any) => g.name));
          }
        }
      } catch (err) {
        console.error("Error fetching specialties and grades from database:", err);
      }
    };
    fetchDropdownOptions();

    if (user) {
      setName(user.fullName || "");
      setEmail(user.email || "");
      
      const fetchTutorProfile = async () => {
        try {
          const docRef = doc(db, "customers", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.subject) setSubject(data.subject);
            if (data.gradeLevel) setGradeLevel(data.gradeLevel);
            if (data.hourlyRate) setHourlyRate(data.hourlyRate);
            if (data.monthlyRate) setMonthlyRate(data.monthlyRate);
            if (data.learningMode) setLearningMode(data.learningMode);
            if (data.location) setLocation(data.location);
            if (data.credentials) setCredentials(data.credentials);
            if (data.experience) setExperience(data.experience);
            if (data.bio) setBio(data.bio);
            if (data.avatar) setAvatar(data.avatar);
            if (data.availabilityStr) setAvailabilityStr(data.availabilityStr);
          }
        } catch (err) {
          console.error("Error fetching tutor profile:", err);
        }
      };
      fetchTutorProfile();
    }
  }, [user]);

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
      if (!res.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      setAvatar(data.secure_url);
      alert("Avatar successfully uploaded to Cloudinary!");
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      alert(err.message || "Failed to upload avatar. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in.");
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        fullName: name,
        email,
        subject,
        gradeLevel,
        hourlyRate,
        monthlyRate,
        learningMode,
        location,
        credentials,
        experience,
        avatar,
        bio,
        availabilityStr,
        updatedAt: new Date().toISOString(),
      };

      const docRef = doc(db, "customers", user.uid);
      await setDoc(docRef, profileData, { merge: true });

      alert("Tutor profile and credentials saved successfully to database!");
    } catch (err: any) {
      console.error("Save error:", err);
      alert(err.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto text-xs">
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Card: Personal & Avatar */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="font-serif font-bold text-sm text-white border-b border-stone-800 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-amber-500" /> Personal Information 
          </h2>

          {/* Avatar Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-stone-950 rounded-xl border border-stone-800">
            <div className="relative">
              <img src={avatar} alt="Avatar Preview" className="w-20 h-20 rounded-full object-cover border-2 border-amber-500 shadow-xl" />
              {uploading && (
                <div className="absolute inset-0 bg-stone-950/80 rounded-full flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1">
              <h3 className="font-serif font-bold text-white text-xs">Profile Photo</h3>
              <p className="text-stone-400 text-[11px]">Upload via Cloudinary</p>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] transition cursor-pointer shadow">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading..." : "Upload Photo"}
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Location / City</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Professional Bio</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Card: Rates & Credentials */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <h2 className="font-serif font-bold text-sm text-white border-b border-stone-800 pb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" /> Teaching Specialties, Rates & Qualifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Subject Specialty (Fetched from DB)</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  required
                >
                  {availableSpecialties.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Grade Level (Fetched from DB)</label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  required
                >
                  {availableGrades.map((g, idx) => (
                    <option key={idx} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Hourly Rate ($)</label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Monthly Rate ($)</label>
                <input
                  type="number"
                  value={monthlyRate}
                  onChange={(e) => setMonthlyRate(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Learning Mode</label>
              <select
                value={learningMode}
                onChange={(e) => setLearningMode(e.target.value as "Online" | "In-Person" | "Both")}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Online">Online</option>
                <option value="In-Person">In-Person</option>
                <option value="Both">Both (Online & In-Person)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Credentials / Degrees</label>
              <input
                type="text"
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Experience Summary</label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Availability Slots (comma separated)</label>
              <input
                type="text"
                value={availabilityStr}
                onChange={(e) => setAvailabilityStr(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving to Database..." : "Save Complete Profile & Cloudinary Avatar"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
