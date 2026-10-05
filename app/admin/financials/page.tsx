"use client";
// app/admin/financials/page.tsx
import React, { useState, useEffect } from "react";
import { DollarSign, Lock, CreditCard, CheckCircle2, XCircle, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { initialBookings, Booking } from "../../lib/platformData";
import { db } from "../../firebaseconfig";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface TransactionReceipt {
  id: string;
  studentName: string;
  studentEmail: string;
  packageName: string;
  amount: number;
  receiptUrl: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

export default function FinancialsPage() {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [transactions, setTransactions] = useState<TransactionReceipt[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [payoutsProcessed, setPayoutsProcessed] = useState(false);

  const fetchTransactions = async () => {
    try {
      const snapshot = await getDocs(collection(db, "transactions"));
      const list: TransactionReceipt[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          studentName: data.studentName || "Student",
          studentEmail: data.studentEmail || "",
          packageName: data.packageName || "Package",
          amount: data.amount || 0,
          receiptUrl: data.receiptUrl || "",
          status: data.status || "Pending",
          createdAt: data.createdAt || "",
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(list);
    } catch (err) {
      console.error("Error fetching admin transactions:", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "Approved" | "Rejected") => {
    try {
      await updateDoc(doc(db, "transactions", id), { status: newStatus });
      setTransactions(transactions.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error("Error updating transaction status:", err);
      alert("Failed to update status.");
    }
  };

  const totalBookingEscrow = bookings.filter(b => b.escrowStatus === "Held in Escrow").reduce((acc, b) => acc + b.amount, 0);
  const approvedTransactionTotal = transactions.filter(t => t.status === "Approved").reduce((acc, t) => acc + t.amount, 0);
  const totalEscrow = totalBookingEscrow + approvedTransactionTotal;
  const platformCommission = totalEscrow * 0.1;
  const tutorPayoutTotal = totalEscrow * 0.9;

  const handleProcessPayouts = () => {
    setPayoutsProcessed(true);
    alert("Batch tutor payouts successfully initiated via Stripe Connect / Bank Wire!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Financial Hub</span>
        <h1 className="text-3xl font-serif font-bold text-white mt-1">Platform Commissions, Receipts & Payouts</h1>
        <p className="text-stone-400 text-sm font-light mt-1">Review student transaction receipt screenshots stored on Cloudinary, monitor escrow balances, and execute tutor payouts.</p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Total Escrow Pool</span>
          <p className="text-3xl font-serif font-bold text-amber-400">${totalEscrow}.00</p>
          <p className="text-[11px] text-stone-400 font-medium">Bookings + Verified Subscriptions</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Platform Commission (10%)</span>
          <p className="text-3xl font-serif font-bold text-emerald-400">${platformCommission.toFixed(2)}</p>
          <p className="text-[11px] text-emerald-400 font-medium">Net earnings revenue</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs uppercase tracking-wider text-stone-400 font-semibold">Pending Tutor Payouts (90%)</span>
          <p className="text-3xl font-serif font-bold text-amber-500">${tutorPayoutTotal.toFixed(2)}</p>
          <button
            onClick={handleProcessPayouts}
            disabled={payoutsProcessed}
            className="mt-2 w-full py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition shadow"
          >
            {payoutsProcessed ? "Payouts Processed ✓" : "Process Batch Payouts"}
          </button>
        </div>
      </div>

      {/* Student Transaction Receipt Verification Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-800 font-serif font-bold text-xl text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" /> Student Payment Receipt Screenshots (Cloudinary)
          </span>
          <span className="text-xs text-stone-400 font-sans">Total Receipts: {transactions.length}</span>
        </div>

        {loadingTransactions ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">
            No transaction receipt screenshots uploaded by students yet.
          </div>
        ) : (
          <div className="divide-y divide-stone-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif font-bold text-lg text-white">{tx.studentName}</h3>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      tx.status === "Approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
                      tx.status === "Rejected" ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                      "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300">Email: <strong className="text-stone-100">{tx.studentEmail}</strong></p>
                  <p className="text-xs text-stone-400 font-mono">
                    Package: <strong className="text-amber-400">{tx.packageName}</strong> | Amount: <strong className="text-white">${tx.amount}</strong>
                  </p>
                  <a
                    href={tx.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-mono pt-1"
                  >
                    View Screenshot on Cloudinary <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                  {/* Thumbnail Preview */}
                  <a href={tx.receiptUrl} target="_blank" rel="noopener noreferrer" className="block w-20 h-16 rounded-xl overflow-hidden border border-stone-800 bg-stone-950 hover:border-amber-500 transition shrink-0">
                    <img src={tx.receiptUrl} alt="Receipt Screenshot" className="w-full h-full object-cover" />
                  </a>

                  {tx.status === "Pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(tx.id, "Approved")}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow transition"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(tx.id, "Rejected")}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow transition"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
