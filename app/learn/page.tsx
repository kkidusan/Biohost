// app/learn/page.tsx
"use client";

import { motion, useInView } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Server,
  User,
  Share2,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  Zap,
  Shield,
  Globe,
  Play,
  Volume2,
  ChevronRight,
  Star,
  Clock,
  Users,
  Lock,
  MessageCircle,
  Send,
  Bot,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";

// ————————————————————————————————————————
// SERVICE DATA
// ————————————————————————————————————————
interface ServiceData {
  title: string;
  icon: any;
  gradient: string;
  darkGradient: string;
  description: string;
  details: string[];
  features: { title: string; desc: string; icon: any }[];
  steps: { title: string; desc: string; time: string }[];
  stats: { value: string; label: string; icon: any }[];
}

const services: Record<string, ServiceData> = {
  "biography-creation": {
    title: "Biography Creation",
    icon: BookOpen,
    gradient: "from-blue-500 to-purple-600",
    darkGradient: "from-blue-400 to-purple-500",
    description: "Craft compelling life stories with AI-powered writing and human refinement.",
    details: [
      "AI + Human Editing",
      "50+ Languages",
      "Voice-to-Text Recording",
      "Timeline Auto-Builder",
      "Photo OCR & Tagging",
      "Export to PDF, EPUB, Web",
    ],
    features: [
      { title: "Smart Interview", desc: "Answer guided questions — we build your story.", icon: Zap },
      { title: "Voice Recording", desc: "Speak your memories, we transcribe & enhance.", icon: Volume2 },
      { title: "Legacy Mode", desc: "Preserve for generations with encryption.", icon: Lock },
    ],
    steps: [
      { title: "Answer 5 Questions", desc: "We generate your draft in 60 seconds.", time: "1 min" },
      { title: "Review & Edit", desc: "AI suggests improvements, you approve.", time: "5 min" },
      { title: "Finalize & Publish", desc: "One-click to your live bio.", time: "30 sec" },
    ],
    stats: [
      { value: "10K+", label: "Bios Created", icon: BookOpen },
      { value: "98%", label: "User Satisfaction", icon: Star },
      { value: "24/7", label: "AI Support", icon: Clock },
    ],
  },
  "secure-hosting": {
    title: "Secure Hosting",
    icon: Server,
    gradient: "from-green-500 to-teal-600",
    darkGradient: "from-emerald-400 to-cyan-500",
    description: "Host your biography on enterprise-grade, encrypted, global servers.",
    details: [
      "99.99% Uptime",
      "AES-256 Encryption",
      "Daily Backups",
      "Custom Domain",
      "Password Protection",
      "Global CDN",
    ],
    features: [
      { title: "Instant Deploy", desc: "Live in under 60 seconds.", icon: Zap },
      { title: "SSL Auto-Renew", desc: "Free Let’s Encrypt certificates.", icon: Shield },
      { title: "Analytics", desc: "Track views, locations, devices.", icon: Globe },
    ],
    steps: [
      { title: "Upload Bio", desc: "Drag & drop or paste content.", time: "10 sec" },
      { title: "Enable SSL", desc: "Auto-configured in 2 seconds.", time: "2 sec" },
      { title: "Go Live", desc: "Your bio is now global & secure.", time: "1 sec" },
    ],
    stats: [
      { value: "0 ms", label: "Downtime", icon: Shield },
      { value: "100%", label: "Encrypted", icon: Lock },
      { value: "Global", label: "CDN Coverage", icon: Globe },
    ],
  },
  customization: {
    title: "Customization",
    icon: User,
    gradient: "from-purple-500 to-pink-600",
    darkGradient: "from-violet-400 to-pink-500",
    description: "Personalize every pixel with themes, media, and interactive elements.",
    details: [
      "50+ Themes",
      "Drag & Drop Builder",
      "Video & Audio Embed",
      "Interactive Family Tree",
      "Custom Fonts",
      "Mobile Optimized",
    ],
    features: [
      { title: "Theme Studio", desc: "Mix colors, fonts, layouts live.", icon: Sparkles },
      { title: "Rich Media", desc: "YouTube, Spotify, 360° photos.", icon: Play },
      { title: "Live Preview", desc: "See changes instantly.", icon: Zap },
    ],
    steps: [
      { title: "Pick Theme", desc: "Choose from 50+ modern designs.", time: "15 sec" },
      { title: "Add Media", desc: "Drag photos, videos, audio.", time: "1 min" },
      { title: "Publish", desc: "Your custom bio is live.", time: "5 sec" },
    ],
    stats: [
      { value: "50+", label: "Themes", icon: Sparkles },
      { value: "100%", label: "Responsive", icon: Globe },
      { value: "0", label: "Code Needed", icon: Users },
    ],
  },
  "easy-sharing": {
    title: "Easy Sharing",
    icon: Share2,
    gradient: "from-orange-500 to-red-600",
    darkGradient: "from-orange-400 to-rose-500",
    description: "Share instantly with QR, embeds, social, and track engagement.",
    details: [
      "QR Code Generator",
      "Social Auto-Share",
      "Website Embed",
      "View Analytics",
      "Scheduled Publish",
      "Guestbook",
    ],
    features: [
      { title: "One-Click Share", desc: "Email, SMS, LinkedIn, WhatsApp.", icon: Share2 },
      { title: "Engagement Stats", desc: "Who read, where, when.", icon: Globe },
      { title: "Guestbook", desc: "Let visitors leave messages.", icon: Users },
    ],
    steps: [
      { title: "Generate Link", desc: "Get your unique bio URL.", time: "1 sec" },
      { title: "Share Anywhere", desc: "Email, social, print QR.", time: "10 sec" },
      { title: "Track Views", desc: "See real-time analytics.", time: "Live" },
    ],
    stats: [
      { value: "1M+", label: "Shares", icon: Share2 },
      { value: "Real-time", label: "Analytics", icon: Zap },
      { value: "100%", label: "Trackable", icon: Globe },
    ],
  },
};

// ————————————————————————————————————————
// AI KNOWLEDGE BASE
// ————————————————————————————————————————
const knowledgeBase: { [key: string]: string } = {
  "how do i start writing my biography": "Just answer 5 simple questions — our AI generates your full draft in 60 seconds!",
  "can i record my voice": "Yes! Use Voice Recording to speak your memories. We transcribe and enhance them automatically.",
  "does it support other languages": "Yes, 50+ languages with AI translation and native refinement.",
  "how long does it take": "From start to publish: ~6 minutes. Draft in 60s, edit in 5min, publish in 30s.",
  "can i export my bio": "Export to PDF, EPUB, or live web page with one click.",

  "is my bio secure": "Yes, AES-256 encryption, password protection, and daily backups.",
  "can i use my own domain": "Absolutely. Connect your custom domain in 2 clicks.",
  "will it go down": "99.99% uptime with global CDN — zero downtime recorded.",
  "do i get ssl": "Free auto-renewing SSL certificates included.",

  "can i change the design": "Choose from 50+ themes or build your own with Theme Studio.",
  "can i add videos": "Yes! Embed YouTube, Vimeo, Spotify, 360° photos, and more.",
  "is it mobile friendly": "100% responsive on all devices.",

  "how do i share my bio": "One-click share via email, SMS, WhatsApp, LinkedIn, or generate a QR code.",
  "can people leave comments": "Yes! Enable Guestbook for visitors to leave messages.",
  "can i see who viewed it": "Real-time analytics: views, locations, devices, and time spent.",

  "is there a free trial": "Yes! Start free, upgrade anytime for premium features.",
  "do i need to code": "No coding required. Drag, drop, done.",
  "can i edit later": "Edit anytime. Changes go live instantly.",
  "is there support": "24/7 AI + human support. Ask anything!",
};

const normalize = (str: string) => str.toLowerCase().replace(/[^\w\s]/g, "").trim();

// ————————————————————————————————————————
// MAIN COMPONENT
// ————————————————————————————————————————
export default function LearnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.2 });

  // Active tab from URL
  const rawSlug = searchParams.get("service");
  const validSlug = rawSlug && rawSlug in services ? rawSlug : "biography-creation";
  const [activeSlug, setActiveSlug] = useState(validSlug);

  // Sync URL ↔ State
  useEffect(() => {
    const urlSlug = searchParams.get("service");
    if (urlSlug && urlSlug !== activeSlug && urlSlug in services) {
      setActiveSlug(urlSlug);
    }
  }, [searchParams, activeSlug]);

  const switchTab = useCallback(
    (slug: string) => {
      setActiveSlug(slug);
      router.replace(`/learn?service=${slug}`, { scroll: false });
    },
    [router]
  );

  const service = useMemo(() => services[activeSlug], [activeSlug]);
  const Icon = service.icon;

  // ——————————————————— AI CHAT ———————————————————
  const [chatOpen, setChatOpen] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi! I'm your BioHost AI assistant. Ask me anything about creating, hosting, or sharing your biography!" },
  ]);

  const getAIResponse = (input: string): string => {
    const normalized = normalize(input);
    let bestMatch = "";
    let highestScore = 0;

    for (const [question, answer] of Object.entries(knowledgeBase)) {
      const qWords = normalize(question).split(" ");
      const matchCount = qWords.filter(word => normalized.includes(word)).length;
      const score = matchCount / qWords.length;
      if (score > highestScore && score > 0.4) {
        highestScore = score;
        bestMatch = answer;
      }
    }

    return bestMatch || "I don't have an answer for that yet, but our team is here 24/7! Try asking about creating a bio, security, or sharing.";
  };

  const sendMessage = () => {
    if (!userMessage.trim()) return;
    const msg = userMessage.trim();
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setUserMessage("");

    setTimeout(() => {
      const reply = getAIResponse(msg);
      setMessages(prev => [...prev, { role: "ai", text: reply }]);
    }, 600);
  };

  // ——————————————————— RENDER ———————————————————
  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/30 dark:to-purple-900/30"
    >
      {/* Floating Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        className="fixed top-6 left-6 z-50"
      >
      
      </motion.div>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            key={activeSlug + "-title"}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400"
          >
            {service.title}
          </motion.h1>
          <motion.p
            key={activeSlug + "-desc"}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-6 text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto font-medium"
          >
            {service.description}
          </motion.p>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <div className="flex flex-wrap justify-center gap-4">
          {Object.entries(services).map(([slug, data]) => {
            const TabIcon = data.icon;
            const isActive = activeSlug === slug;

            return (
              <motion.button
                key={slug}
                onClick={() => switchTab(slug)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.1 }}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-lg ${
                  isActive
                    ? `bg-gradient-to-r ${data.gradient} dark:${data.darkGradient} text-white`
                    : "bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50"
                }`}
              >
                <TabIcon className="h-6 w-6" />
                {data.title}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <motion.div
        key={activeSlug}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-start"
      >
        {/* Left: Details + Stats */}
        <div className="space-y-10">
          <div className="flex items-center gap-5">
            <div
              className={`p-4 rounded-2xl bg-gradient-to-r ${service.gradient} dark:${service.darkGradient} shadow-xl`}
            >
              <Icon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {service.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {service.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {service.stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1 mt-1">
                  <stat.icon className="h-4 w-4" />
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-4">
            {service.details.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="flex items-center gap-3"
              >
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                <p className="text-gray-700 dark:text-gray-200 font-medium">{item}</p>
              </motion.div>
            ))}
          </div>

          <motion.a
            href="/signup"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white font-bold text-lg shadow-2xl"
          >
            Start Now <Sparkles className="h-5 w-5" />
          </motion.a>
        </div>

        {/* Right: Steps + Features */}
        <div className="space-y-10">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-500" />
              How It Works
            </h3>
            <div className="space-y-6">
              {service.steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 30 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.6 + i * 0.15 }}
                  className="group relative pl-12"
                >
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {i + 1}
                  </div>
                  {i < service.steps.length - 1 && (
                    <div className="absolute left-5 top-10 w-0.5 h-16 bg-gradient-to-b from-blue-500 to-purple-500 opacity-30" />
                  )}
                  <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-gray-200/50 dark:border-gray-700/50 group-hover:shadow-xl transition-shadow">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center justify-between">
                      {step.title}
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
                        {step.time}
                      </span>
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Key Features
            </h3>
            <div className="grid gap-5">
              {service.features.map((feat, i) => {
                const FIcon = feat.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                        <FIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{feat.title}</h4>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">{feat.desc}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-1 w-0 group-hover:w-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 rounded-full" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Final CTA */}
      <section className="mt-24 py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 rounded-3xl p-12 shadow-2xl backdrop-blur-xl border border-white/20"
        >
          <Sparkles className="mx-auto h-14 w-14 text-white mb-4" />
          <h3 className="text-4xl font-extrabold text-white mb-4">
            Ready to Tell Your Story?
          </h3>
          <p className="text-white/90 mb-8 text-lg max-w-2xl mx-auto">
            Join 3,200+ storytellers who’ve preserved their legacy with BioHost.
          </p>
          <motion.a
            href="/signup"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white text-blue-600 dark:text-blue-600 font-bold text-xl shadow-lg"
          >
            Get Started Free <ChevronRight className="h-6 w-6" />
          </motion.a>
        </motion.div>
      </section>

      {/* AI Support Chat */}
      <>
        <motion.button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-2xl"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </motion.button>

        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="fixed bottom-24 right-6 w-96 h-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-50"
          >
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center gap-3">
              <Bot className="h-6 w-6" />
              <div>
                <div className="font-bold">BioHost AI Assistant</div>
                <div className="text-xs opacity-90">Always here to help</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-3 border-t dark:border-gray-700 flex gap-2">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </>
    </div>
  );
}