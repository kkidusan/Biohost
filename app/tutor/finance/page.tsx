"use client";
import React from "react";
import { DollarSign, ShieldCheck, CreditCard } from "lucide-react";

export default function TutorFinancePage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <span className="text-amber-500 text-xs font-semibold tracking-widest uppercase">Finance Hub</span>
        <h1 className="text-3xl font-serif font-bold text-white mt-1">Earnings & Payouts</h1>
        <p className="text-stone-400 text-sm font-light mt-1">Total earnings, pending escrow releases, and bank account settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-white text-lg">Total Earnings</h3>
            <DollarSign className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-4xl font-serif font-bold text-amber-400">$3,450.00</p>
          <button onClick={() => alert("Request payout...")} className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition shadow-lg">
            Withdraw Payout
          </button>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif font-bold text-white text-lg">Bank Account</h3>
            <CreditCard className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-white">Bank of America •••• 8821</p>
          <span className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full font-semibold inline-block">Verified & Active</span>
        </div>
      </div>
    </div>
  );
}
