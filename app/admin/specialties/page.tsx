"use client";
// app/admin/specialties/page.tsx
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Search, X, Check, Loader2 } from "lucide-react";
import { db } from "../../firebaseconfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function AdminSpecialtiesPage() {
  const [activeTab, setActiveTab] = useState<"specialties" | "grades" | "rates">("specialties");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavedInDB, setIsSavedInDB] = useState(true);

  // Tab 1: Subject Specialties State
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newCategory, setNewCategory] = useState("STEM");
  const [specialties, setSpecialties] = useState([
    { id: "sp-1", name: "Mathematics", category: "STEM", tutorsCount: 45, status: "Active" },
    { id: "sp-2", name: "General Science", category: "STEM", tutorsCount: 38, status: "Active" },
    { id: "sp-3", name: "English Language", category: "Languages", tutorsCount: 30, status: "Active" },
    { id: "sp-4", name: "Information Technology", category: "Technology", tutorsCount: 28, status: "Active" },
    { id: "sp-5", name: "Civics & Ethical Education", category: "Humanities", tutorsCount: 19, status: "Active" },
    { id: "sp-6", name: "Physics", category: "STEM", tutorsCount: 22, status: "Active" },
  ]);

  // Tab 2: Grade Levels State (Ethiopian Standard + Other)
  const [selectedGradeOption, setSelectedGradeOption] = useState("Grades 1-4");
  const [customGradeInput, setCustomGradeInput] = useState("");
  const [gradeLevels, setGradeLevels] = useState([
    { id: "g-1", name: "Grades 1-4", levelGroup: "Primary First Cycle", tutorsCount: 32, status: "Active" },
    { id: "g-2", name: "Grades 5-6", levelGroup: "Primary Second Cycle", tutorsCount: 40, status: "Active" },
    { id: "g-3", name: "Grades 7-8", levelGroup: "Upper Primary", tutorsCount: 45, status: "Active" },
    { id: "g-4", name: "Grades 9-10", levelGroup: "Secondary First Cycle", tutorsCount: 55, status: "Active" },
    { id: "g-5", name: "Grades 11-12", levelGroup: "Preparatory", tutorsCount: 38, status: "Active" },
    { id: "g-6", name: "University", levelGroup: "Higher Education", tutorsCount: 35, status: "Active" },
  ]);

  // Tab 3: Hourly Rates State
  const [newTierName, setNewTierName] = useState("");
  const [newMinRate, setNewMinRate] = useState("");
  const [newMaxRate, setNewMaxRate] = useState("");
  const [newRateDesc, setNewRateDesc] = useState("");
  const [hourlyRates, setHourlyRates] = useState([
    { id: "r-1", tierName: "Standard Tier (Grades 1-8)", range: "$15 - $30 /hr", minRate: 15, maxRate: 30, description: "For primary and middle school tutoring", tutorsCount: 42, status: "Active" },
    { id: "r-2", tierName: "Secondary Tier (Grades 9-12)", range: "$30 - $55 /hr", minRate: 30, maxRate: 55, description: "For high school and preparatory national exam preparation", tutorsCount: 50, status: "Active" },
    { id: "r-3", tierName: "University & Advanced", range: "$55 - $100 /hr", minRate: 55, maxRate: 100, description: "For university coursework and specialized professional training", tutorsCount: 24, status: "Active" },
  ]);

  // Fetch from database on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "adminMetadata", "specialtiesConfig");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.specialties) setSpecialties(data.specialties);
          if (data.gradeLevels) setGradeLevels(data.gradeLevels);
          if (data.hourlyRates) setHourlyRates(data.hourlyRates);
          setIsSavedInDB(true);
        } else {
          // Initialize document in Firestore with defaults if not present
          await setDoc(docRef, {
            specialties,
            gradeLevels,
            hourlyRates,
            updatedAt: new Date().toISOString()
          });
          setIsSavedInDB(true);
        }
      } catch (err) {
        console.error("Error fetching specialties configuration from database:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const markAsModified = () => {
    setIsSavedInDB(false);
  };

  const handleSaveToDatabase = async () => {
    try {
      setIsLoading(true);
      const docRef = doc(db, "adminMetadata", "specialtiesConfig");
      await setDoc(docRef, {
        specialties,
        gradeLevels,
        hourlyRates,
        updatedAt: new Date().toISOString()
      });
      setIsSavedInDB(true);
      alert("Defaults successfully saved to database!");
    } catch (err) {
      console.error("Error saving to database:", err);
      alert("Failed to save changes to database.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for Tab 1: Specialties
  const handleAddSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecialty.trim()) return;
    const item = {
      id: `sp-${Date.now()}`,
      name: newSpecialty.trim(),
      category: newCategory.trim() || "General",
      tutorsCount: 0,
      status: "Active"
    };
    setSpecialties([item, ...specialties]);
    setNewSpecialty("");
    setIsModalOpen(false);
    markAsModified();
  };

  const handleDeleteSpecialty = (id: string) => {
    setSpecialties(specialties.filter(s => s.id !== id));
    markAsModified();
  };

  // Handlers for Tab 2: Grade Levels
  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const finalGradeName = selectedGradeOption === "Other" ? customGradeInput.trim() : selectedGradeOption;
    if (!finalGradeName) return;

    let group = "Preparatory";
    if (selectedGradeOption === "Grades 1-4") group = "Primary First Cycle";
    else if (selectedGradeOption === "Grades 5-6") group = "Primary Second Cycle";
    else if (selectedGradeOption === "Grades 7-8") group = "Upper Primary";
    else if (selectedGradeOption === "Grades 9-10") group = "Secondary First Cycle";
    else if (selectedGradeOption === "Grades 11-12") group = "Preparatory";
    else if (selectedGradeOption === "University") group = "Higher Education";
    else group = "Custom Category";

    const item = {
      id: `g-${Date.now()}`,
      name: finalGradeName,
      levelGroup: group,
      tutorsCount: 0,
      status: "Active"
    };
    setGradeLevels([item, ...gradeLevels]);
    setCustomGradeInput("");
    setSelectedGradeOption("Grades 1-4");
    setIsModalOpen(false);
    markAsModified();
  };

  const handleDeleteGrade = (id: string) => {
    setGradeLevels(gradeLevels.filter(g => g.id !== id));
    markAsModified();
  };

  // Handlers for Tab 3: Hourly Rates
  const handleAddRateTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName.trim() || !newMinRate || !newMaxRate) return;
    const min = Number(newMinRate);
    const max = Number(newMaxRate);
    const item = {
      id: `r-${Date.now()}`,
      tierName: newTierName.trim(),
      range: `$${min} - $${max} /hr`,
      minRate: min,
      maxRate: max,
      description: newRateDesc.trim() || "Custom rate tier",
      tutorsCount: 0,
      status: "Active"
    };
    setHourlyRates([item, ...hourlyRates]);
    setNewTierName("");
    setNewMinRate("");
    setNewMaxRate("");
    setNewRateDesc("");
    setIsModalOpen(false);
    markAsModified();
  };

  const handleDeleteRateTier = (id: string) => {
    setHourlyRates(hourlyRates.filter(r => r.id !== id));
    markAsModified();
  };

  const getAddButtonLabel = () => {
    if (activeTab === "specialties") return "Add Specialty";
    if (activeTab === "grades") return "Add Grade Level";
    return "Add Rate Tier";
  };

  if (isLoading && specialties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 text-[11px] text-stone-300 px-2 py-2">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-lg">
        <div>
          <span className="text-amber-500 text-[9px] font-semibold tracking-wider uppercase">Admin Management</span>
          <h1 className="text-lg font-serif font-bold text-white mt-0.5">Specialties, Grades & Rates</h1>
          <p className="text-stone-400 text-[10px] font-light">Synced directly with database: subject specialties, Ethiopian standard grade levels, and hourly rate tiers.</p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {!isSavedInDB && (
            <button
              onClick={handleSaveToDatabase}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition shadow cursor-pointer flex items-center gap-1 shrink-0 animate-pulse disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save Defaults
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] transition shadow cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> {getAddButtonLabel()}
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Plain Text Only, Compact) */}
      <div className="flex border-b border-stone-800 gap-1 pb-1">
        <button
          onClick={() => { setActiveTab("specialties"); setSearchQuery(""); }}
          className={`px-4 py-2 font-serif font-bold text-[11px] transition cursor-pointer border-b-2 ${
            activeTab === "specialties"
              ? "border-amber-500 text-amber-400 bg-stone-900/40 rounded-t-lg"
              : "border-transparent text-stone-400 hover:text-stone-200"
          }`}
        >
          Subject Specialty
        </button>

        <button
          onClick={() => { setActiveTab("grades"); setSearchQuery(""); }}
          className={`px-4 py-2 font-serif font-bold text-[11px] transition cursor-pointer border-b-2 ${
            activeTab === "grades"
              ? "border-amber-500 text-amber-400 bg-stone-900/40 rounded-t-lg"
              : "border-transparent text-stone-400 hover:text-stone-200"
          }`}
        >
          Grade Level
        </button>

        <button
          onClick={() => { setActiveTab("rates"); setSearchQuery(""); }}
          className={`px-4 py-2 font-serif font-bold text-[11px] transition cursor-pointer border-b-2 ${
            activeTab === "rates"
              ? "border-amber-500 text-amber-400 bg-stone-900/40 rounded-t-lg"
              : "border-transparent text-stone-400 hover:text-stone-200"
          }`}
        >
          Hourly Rate ($)
        </button>
      </div>

      {/* TAB 1: SUBJECT SPECIALTY */}
      {activeTab === "specialties" && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-stone-950 font-serif font-bold text-[11px] text-white flex items-center justify-between border-b border-stone-800">
            <span>Subject Specialties ({specialties.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-stone-300">
              <thead className="bg-stone-950/50 uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-2.5 px-4">Specialty Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Associated Tutors</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {specialties
                  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.category.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-stone-950/40">
                      <td className="py-2.5 px-4 font-semibold text-white">{item.name}</td>
                      <td className="py-2.5 px-4 text-stone-300 font-mono text-[10px]">{item.category}</td>
                      <td className="py-2.5 px-4 font-mono text-amber-400 text-[10px]">{item.tutorsCount} Tutors</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteSpecialty(item.id)}
                          className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GRADE LEVEL */}
      {activeTab === "grades" && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-stone-950 font-serif font-bold text-[11px] text-white flex items-center justify-between border-b border-stone-800">
            <span>Ethiopian Standard Academic Grade Levels ({gradeLevels.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-stone-300">
              <thead className="bg-stone-950/50 uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-2.5 px-4">Grade Level Name</th>
                  <th className="py-2.5 px-4">Category Group</th>
                  <th className="py-2.5 px-4">Associated Tutors</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {gradeLevels
                  .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.levelGroup.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-stone-950/40">
                      <td className="py-2.5 px-4 font-semibold text-white">{item.name}</td>
                      <td className="py-2.5 px-4 text-stone-300 font-mono text-[10px]">{item.levelGroup}</td>
                      <td className="py-2.5 px-4 font-mono text-amber-400 text-[10px]">{item.tutorsCount} Tutors</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteGrade(item.id)}
                          className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HOURLY RATE ($) */}
      {activeTab === "rates" && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 bg-stone-950 font-serif font-bold text-[11px] text-white flex items-center justify-between border-b border-stone-800">
            <span>Hourly Rate Pricing Tiers ({hourlyRates.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-stone-300">
              <thead className="bg-stone-950/50 uppercase tracking-wider text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="py-2.5 px-4">Pricing Tier Name</th>
                  <th className="py-2.5 px-4">Hourly Rate Range ($)</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4">Associated Tutors</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {hourlyRates
                  .filter(r => r.tierName.toLowerCase().includes(searchQuery.toLowerCase()) || r.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-stone-950/40">
                      <td className="py-2.5 px-4 font-semibold text-white">{item.tierName}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-400">{item.range}</td>
                      <td className="py-2.5 px-4 text-stone-400 max-w-xs truncate text-[10px]">{item.description}</td>
                      <td className="py-2.5 px-4 font-mono text-stone-300 text-[10px]">{item.tutorsCount} Tutors</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteRateTier(item.id)}
                          className="px-2 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CENTERED MODAL POPUP FOR ADDING */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl w-full max-w-md p-5 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-serif font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                {activeTab === "specialties" && "Add New Subject Specialty"}
                {activeTab === "grades" && "Add Ethiopian Standard Grade Level"}
                {activeTab === "rates" && "Add New Hourly Rate Tier ($)"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form for Specialties */}
            {activeTab === "specialties" && (
              <form onSubmit={handleAddSpecialty} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-stone-400 mb-1">Specialty Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Organic Chemistry, Calculus..."
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-stone-400 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="STEM">STEM</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Technology">Technology</option>
                    <option value="Languages">Languages</option>
                    <option value="Arts">Arts</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[11px] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] transition shadow cursor-pointer"
                  >
                    Add Specialty
                  </button>
                </div>
              </form>
            )}

            {/* Form for Ethiopian Standard Grades + Other */}
            {activeTab === "grades" && (
              <form onSubmit={handleAddGrade} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-stone-400 mb-1">Select Ethiopian Grade Standard</label>
                  <select
                    value={selectedGradeOption}
                    onChange={(e) => setSelectedGradeOption(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Grades 1-4">Grades 1-4 (Primary First Cycle)</option>
                    <option value="Grades 5-6">Grades 5-6 (Primary Second Cycle)</option>
                    <option value="Grades 7-8">Grades 7-8 (Upper Primary)</option>
                    <option value="Grades 9-10">Grades 9-10 (Secondary First Cycle)</option>
                    <option value="Grades 11-12">Grades 11-12 (Preparatory)</option>
                    <option value="University">University / Higher Education</option>
                    <option value="Other">Other (Custom Grade Level)</option>
                  </select>
                </div>

                {selectedGradeOption === "Other" && (
                  <div>
                    <label className="block text-[10px] font-medium text-stone-400 mb-1">Custom Grade Level Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Kindergarten, TVET, Postgraduate..."
                      value={customGradeInput}
                      onChange={(e) => setCustomGradeInput(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[11px] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] transition shadow cursor-pointer"
                  >
                    Add Grade Level
                  </button>
                </div>
              </form>
            )}

            {/* Form for Rates */}
            {activeTab === "rates" && (
              <form onSubmit={handleAddRateTier} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-stone-400 mb-1">Pricing Tier Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Master Level..."
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-stone-400 mb-1">Min Rate ($/hr)</label>
                    <input
                      type="number"
                      placeholder="15"
                      value={newMinRate}
                      onChange={(e) => setNewMinRate(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-stone-400 mb-1">Max Rate ($/hr)</label>
                    <input
                      type="number"
                      placeholder="40"
                      value={newMaxRate}
                      onChange={(e) => setNewMaxRate(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-stone-400 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g., For specialized national exam preparation..."
                    value={newRateDesc}
                    onChange={(e) => setNewRateDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-[11px] text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[11px] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] transition shadow cursor-pointer"
                  >
                    Add Rate Tier
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
