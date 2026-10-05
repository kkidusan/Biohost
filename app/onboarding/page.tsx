"use client";
// app/onboarding/page.tsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseconfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User, ShieldCheck, BookOpen, MapPin, DollarSign, Clock, CheckCircle2, Loader2, Navigation, ExternalLink, Globe } from "lucide-react";

interface ScheduleRule {
  day: string;
  timeSlot: string;
}

export default function OnboardingProfilePage() {
  const { user, isLoggedIn } = useAuth();
  const router = useRouter();

  const [role, setRole] = useState<"student" | "tutor">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Location & Coordinates state
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Student fields
  const [gradeLevel, setGradeLevel] = useState("High School");
  const [learningMode, setLearningMode] = useState<"Online" | "In-Person" | "Both">("Online");
  const [bio, setBio] = useState("");
  const [subjects, setSubjects] = useState<string[]>(["Mathematics"]);
  const [newSubject, setNewSubject] = useState("");
  const [schedules, setSchedules] = useState<ScheduleRule[]>([
    { day: "Monday", timeSlot: "3:00 PM - 5:00 PM" }
  ]);
  const [newDay, setNewDay] = useState("Monday");
  const [newTimeSlot, setNewTimeSlot] = useState("");

  // Tutor fields
  const [tutorSubject, setTutorSubject] = useState("Mathematics");
  const [tutorGradeLevel, setTutorGradeLevel] = useState("Grades 9-10");
  const [hourlyRate, setHourlyRate] = useState<number>(45);
  const [monthlyRate, setMonthlyRate] = useState<number>(350);
  const [credentials, setCredentials] = useState("");
  const [experience, setExperience] = useState("");
  const [availabilityStr, setAvailabilityStr] = useState("Mon 3:00 PM, Wed 4:00 PM");

  useEffect(() => {
    if (user) {
      setName(user.fullName || "");
      setEmail(user.email || "");
      if (user.role) {
        setRole(user.role === "tutor" ? "tutor" : "student");
      }

      const fetchExisting = async () => {
        try {
          const docSnap = await getDoc(doc(db, "customers", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.role) setRole(data.role === "tutor" ? "tutor" : "student");
            if (data.fullName || data.name) setName(data.fullName || data.name);
            if (data.email) setEmail(data.email);
            if (data.gradeLevel) {
              setGradeLevel(data.gradeLevel);
              setTutorGradeLevel(data.gradeLevel);
            }
            if (data.learningMode) setLearningMode(data.learningMode);
            if (data.location) setLocation(data.location);
            if (data.latitude) setLatitude(data.latitude);
            if (data.longitude) setLongitude(data.longitude);
            if (data.bio) setBio(data.bio);
            if (data.subjects && Array.isArray(data.subjects)) setSubjects(data.subjects);
            if (data.schedules && Array.isArray(data.schedules)) setSchedules(data.schedules);
            if (data.subject) setTutorSubject(data.subject);
            if (data.hourlyRate) setHourlyRate(data.hourlyRate);
            if (data.monthlyRate) setMonthlyRate(data.monthlyRate);
            if (data.credentials) setCredentials(data.credentials);
            if (data.experience) setExperience(data.experience);
            if (data.availabilityStr) setAvailabilityStr(data.availabilityStr);
          }
        } catch (err) {
          console.error("Error loading onboarding profile:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchExisting();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDetectLocation = async () => {
    setDetectingLocation(true);

    if (!navigator.geolocation) {
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        const ipData = await ipRes.json();
        if (ipData && ipData.city) {
          const place = ipData.city;
          const region = ipData.region || ipData.country_name || "";
          setLocation(region ? `${place}, ${region}` : place);
          if (ipData.latitude && ipData.longitude) {
            setLatitude(ipData.latitude);
            setLongitude(ipData.longitude);
          }
          setDetectingLocation(false);
          return;
        }
      } catch (ipErr) {
        console.warn("IP geolocation failed", ipErr);
      }
      alert("Geolocation is not supported by your browser.");
      setDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data && data.address) {
            const villageOrCity = data.address.village || data.address.town || data.address.city || data.address.suburb || data.address.hamlet || "";
            const regionOrState = data.address.state || data.address.county || data.address.country || "";
            const formatted = villageOrCity && regionOrState ? `${villageOrCity}, ${regionOrState}` : villageOrCity || regionOrState || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            setLocation(formatted);
          } else {
            setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          }
        } catch (err) {
          setLocation(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } finally {
          setDetectingLocation(false);
        }
      },
      async () => {
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          const ipData = await ipRes.json();
          if (ipData && ipData.city) {
            const place = ipData.city;
            const region = ipData.region || ipData.country_name || "";
            setLocation(region ? `${place}, ${region}` : place);
            if (ipData.latitude && ipData.longitude) {
              setLatitude(ipData.latitude);
              setLongitude(ipData.longitude);
            }
            setDetectingLocation(false);
            return;
          }
        } catch (e) {}
        alert("Unable to detect location automatically. Please enter manually.");
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
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
    if (!newTimeSlot.trim()) return;
    setSchedules([...schedules, { day: newDay, timeSlot: newTimeSlot.trim() }]);
    setNewTimeSlot("");
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in first.");
      router.push("/login");
      return;
    }

    if (!name.trim() || !location.trim() || !bio.trim()) {
      alert("Please fill out all required fields.");
      return;
    }

    if (role === "student" && subjects.length === 0) {
      alert("Please add at least one subject.");
      return;
    }

    setSaving(true);
    try {
      const payload = role === "student" ? {
        fullName: name.trim(),
        email: email.trim(),
        role: "student",
        gradeLevel,
        learningMode,
        location: location.trim(),
        latitude: latitude !== null ? latitude : null,
        longitude: longitude !== null ? longitude : null,
        bio: bio.trim(),
        subjects,
        schedules,
        updatedAt: new Date().toISOString(),
      } : {
        fullName: name.trim(),
        email: email.trim(),
        role: "tutor",
        subject: tutorSubject,
        gradeLevel: tutorGradeLevel,
        hourlyRate: Number(hourlyRate),
        monthlyRate: Number(monthlyRate),
        learningMode,
        location: location.trim(),
        latitude: latitude !== null ? latitude : null,
        longitude: longitude !== null ? longitude : null,
        credentials: credentials.trim(),
        experience: experience.trim(),
        bio: bio.trim(),
        availabilityStr: availabilityStr.trim(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "customers", user.uid), payload, { merge: true });

      alert("Profile configuration completed successfully!");
      router.push(role === "tutor" ? "/tutor/dashboard" : "/student/dashboard");
    } catch (err: any) {
      console.error("Error saving onboarding profile:", err);
      alert(err.message || "Failed to save profile configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex items-center justify-center p-6 selection:bg-amber-500 selection:text-stone-950">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-10 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-serif font-bold text-white">
            Complete Your {role === "tutor" ? "Tutor" : "Student"} Profile
          </h1>
          <p className="text-stone-400 text-xs">
            All fields are required to configure your account before accessing your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Email Address (Read-only)</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3 py-2 bg-stone-950/60 border border-stone-800 rounded-xl text-xs text-stone-500 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Village / City / Region *</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    className="text-[10px] text-amber-400 hover:underline font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" />
                    {detectingLocation ? "Detecting..." : "Detect Live Location"}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Woldia, Amhara"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />

                {/* Real-time Interactive Map Preview (2025 OpenStreetMap Embed) */}
                {latitude !== null && longitude !== null ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono bg-stone-950 px-2.5 py-1.5 rounded-lg border border-stone-800">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                        Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}
                      </span>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:underline flex items-center gap-0.5 shrink-0 ml-2"
                      >
                        Open Full Map <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="w-full h-32 rounded-xl overflow-hidden border border-stone-800 relative bg-stone-950">
                      <iframe
                        title="Live User Location Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight={0}
                        marginWidth={0}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                        style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-1.5 text-[10px] text-stone-500 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-stone-400" /> Click &quot;Detect Live Location&quot; to pin your accurate village/city on the map.
                  </div>
                )}
              </div>
            </div>

            {role === "student" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Grade Level *</label>
                    <select
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                      required
                    >
                      <option value="High School">High School</option>
                      <option value="University">University</option>
                      <option value="Elementary">Elementary</option>
                      <option value="Middle School">Middle School</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Learning Mode *</label>
                    <select
                      value={learningMode}
                      onChange={(e) => setLearningMode(e.target.value as any)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                      required
                    >
                      <option value="Online">Online</option>
                      <option value="In-Person">In-Person</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                </div>

                {/* Subjects */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Subjects Needed *</label>
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
                      placeholder="Add subject (e.g. Calculus)..."
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="flex-1 px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <button type="button" onClick={handleAddSubject} className="px-3 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs cursor-pointer">Add</button>
                  </div>
                </div>

                {/* Schedules */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold">Preferred Schedule Slots *</label>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {schedules.map((sch, idx) => (
                      <div key={idx} className="p-2 bg-stone-950 border border-stone-800 rounded-xl flex justify-between items-center text-[11px] font-mono text-stone-300">
                        <span>{sch.day}: {sch.timeSlot}</span>
                        <button type="button" onClick={() => handleRemoveSchedule(idx)} className="text-stone-500 hover:text-red-400">×</button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value)}
                      className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200"
                    >
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="e.g. 3 PM - 5 PM"
                      value={newTimeSlot}
                      onChange={(e) => setNewTimeSlot(e.target.value)}
                      className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200"
                    />
                  </div>
                  <button type="button" onClick={handleAddSchedule} className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-[11px] font-semibold cursor-pointer">
                    + Add Schedule Slot
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Primary Subject *</label>
                    <input
                      type="text"
                      required
                      value={tutorSubject}
                      onChange={(e) => setTutorSubject(e.target.value)}
                      placeholder="e.g. Mathematics"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Grade Level Group *</label>
                    <input
                      type="text"
                      required
                      value={tutorGradeLevel}
                      onChange={(e) => setTutorGradeLevel(e.target.value)}
                      placeholder="e.g. High School / College"
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Hourly Rate ($) *</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Monthly Rate ($) *</label>
                    <input
                      type="number"
                      required
                      min={50}
                      value={monthlyRate}
                      onChange={(e) => setMonthlyRate(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Credentials & Degrees *</label>
                  <input
                    type="text"
                    required
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    placeholder="e.g. Ph.D. Mathematics, Columbia University"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Teaching Experience *</label>
                  <input
                    type="text"
                    required
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 8 Years Full-time Tutoring"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Availability Slots *</label>
                  <input
                    type="text"
                    required
                    value={availabilityStr}
                    onChange={(e) => setAvailabilityStr(e.target.value)}
                    placeholder="e.g. Mon 3:00 PM, Wed 4:00 PM, Sat 10:00 AM"
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-stone-400 font-semibold mb-1">Professional / Academic Bio *</label>
              <textarea
                required
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a brief introduction about your goals or teaching philosophy..."
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? "Saving Profile..." : "Save & Access Dashboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
