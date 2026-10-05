"use client";
// app/student/billing/page.tsx
import React, { useState, useEffect } from "react";
import { ShieldCheck, Upload, CheckCircle, Clock, AlertCircle, Loader2, ExternalLink, Plus, X, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebaseconfig";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";

interface Transaction {
  id: string;
  packageName: string;
  amount: number;
  receiptUrl: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

export default function StudentBillingPage() {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState("3 Months Mentorship Package ($350)");
  const [selectedAmount, setSelectedAmount] = useState(350);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Modal / Wizard state for "I'm Paid" flow
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const fetchTransactions = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, "transactions"),
        where("uid", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const list: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          packageName: data.packageName,
          amount: data.amount,
          receiptUrl: data.receiptUrl,
          status: data.status,
          createdAt: data.createdAt,
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(list);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please upload your transaction receipt screenshot first.");
      return;
    }
    if (!user) {
      alert("You must be logged in.");
      return;
    }

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

      const receiptUrl = data.secure_url;

      await addDoc(collection(db, "transactions"), {
        uid: user.uid,
        studentName: user.fullName || "Student",
        studentEmail: user.email,
        packageName: selectedPackage,
        amount: selectedAmount,
        receiptUrl,
        status: "Pending",
        createdAt: new Date().toISOString(),
      });

      alert("Receipt successfully uploaded and sent to admin for verification!");
      setFile(null);
      setFileName("");
      setIsModalOpen(false);
      setStep(1);
      fetchTransactions();
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err.message || "Failed to upload receipt. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto text-xs">
      {/* Compact Header */}
      <div className="flex justify-between items-center bg-stone-900 border border-stone-800 p-5 rounded-xl shadow-xl">
        <div>
          <h1 className="text-xl font-serif font-bold text-white">Billing & Payment Receipts</h1>
          <p className="text-stone-400 text-[11px] font-light">Manage tutoring packages and submit payment receipt screenshots.</p>
        </div>
        <button
          onClick={() => {
            setStep(1);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition shadow cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> I'm Paid / Submit Receipt
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Receipts Table */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-stone-800 pb-3">
            <h3 className="font-serif font-bold text-white text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-500" /> Submitted Receipts Status
            </h3>
            <span className="text-[11px] text-stone-400 font-mono">Total: {transactions.length}</span>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-stone-950 p-8 rounded-xl border border-stone-800 text-center space-y-2">
              <Clock className="w-8 h-8 text-stone-600 mx-auto" />
              <p className="text-stone-300 font-medium">No receipts submitted yet.</p>
              <p className="text-[11px] text-stone-500">Click "I'm Paid" to upload your payment screenshot.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 uppercase tracking-wider text-stone-400 border-b border-stone-800 text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Package Name</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-stone-950/40">
                      <td className="py-3 px-3 font-semibold text-white">{tx.packageName}</td>
                      <td className="py-3 px-3 font-mono text-amber-400">${tx.amount}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          tx.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                          tx.status === "Rejected" ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <a
                          href={tx.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline font-mono"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bank & Packages Info */}
        <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="font-serif font-bold text-white text-xs border-b border-stone-800 pb-2">Bank Transfer Details</h3>
            <div className="text-[11px] text-stone-400 space-y-1">
              <p>Bank: <strong className="text-stone-200">Biruh Global Escrow</strong></p>
              <p className="font-mono text-amber-400 font-bold">Acct: 1002-9842-5501-1920</p>
              <p className="text-[10px] text-stone-500">Reference: Student Full Name</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Wizard Flow */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1 rounded-lg bg-stone-950 border border-stone-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-0.5">
              <span className="text-amber-500 text-[10px] font-semibold tracking-widest uppercase">
                Step {step} of 2
              </span>
              <h2 className="text-xl font-serif font-bold text-white">
                {step === 1 ? "Select Tutoring Package" : "Upload Receipt"}
              </h2>
            </div>

            {step === 1 && (
              <div className="space-y-3">
                {[
                  { name: "3 Months Mentorship Package", price: 350 },
                  { name: "1 Month Intensive Package", price: 130 },
                  { name: "Standard 10-Session Pack", price: 300 },
                ].map((pkg, idx) => {
                  const packageStr = `${pkg.name} ($${pkg.price})`;
                  const isSelected = selectedPackage === packageStr;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500 text-white shadow"
                          : "bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700"
                      }`}
                      onClick={() => {
                        setSelectedPackage(packageStr);
                        setSelectedAmount(pkg.price);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{pkg.name}</span>
                        <span className="text-amber-400 font-mono font-bold">${pkg.price}</span>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmitReceipt} className="space-y-4">
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-stone-400 text-[10px] block">Selected:</span>
                    <strong className="text-amber-400">{selectedPackage}</strong>
                  </div>
                  <button type="button" onClick={() => setStep(1)} className="text-stone-400 hover:text-white underline text-[11px]">Change</button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-stone-300">Upload Receipt Screenshot</label>
                  <div className="border-2 border-dashed border-stone-800 rounded-xl p-6 text-center hover:border-amber-500/50 transition bg-stone-950">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="modal-receipt-upload"
                    />
                    <label htmlFor="modal-receipt-upload" className="cursor-pointer space-y-1 block">
                      <Upload className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-xs text-stone-300">
                        {fileName ? <strong className="text-amber-400">{fileName}</strong> : "Click to browse or drop screenshot"}
                      </p>
                    </label>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-70 cursor-pointer"
                  >
                    {uploading ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Receipt"}
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
