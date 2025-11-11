// app/learn/page.tsx
"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
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
// Assuming you have this context file in the correct path
import { useTheme } from "../context/ThemeContext";

// ————————————————————————————————————————
// SERVICE DATA
// ————————————————————————————————————————
interface ServiceData {
  title: string;
  icon: any;
  color: string;
  darkColor: string;
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
    color: "from-blue-500 to-purple-600",
    darkColor: "from-blue-400 to-purple-500",
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
    color: "from-green-500 to-teal-600",
    darkColor: "from-emerald-400 to-cyan-500",
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
    color: "from-purple-500 to-pink-600",
    darkColor: "from-violet-400 to-pink-500",
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
    color: "from-orange-500 to-red-600",
    darkColor: "from-orange-400 to-rose-500",
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
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Refs for the main container, chat button, and chat window
  const containerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null); 
  const buttonRef = useRef<HTMLButtonElement>(null); 
  
  const inView = useInView(containerRef, { once: true, amount: 0.2 });

  const rawSlug = searchParams.get("service");
  const validSlug = rawSlug && rawSlug in services ? rawSlug : "biography-creation";
  const [activeSlug, setActiveSlug] = useState(validSlug);

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
  const gradient = theme === "dark" ? service.darkColor : service.color;

  // Text Color Classes
  const textPrimary = theme === "dark" ? "text-white" : "text-gray-900";
  const textSecondary = theme === "dark" ? "text-gray-200" : "text-gray-600";
  const textMuted = theme === "dark" ? "text-gray-400" : "text-gray-500";

  // AI Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi! I'm your BioHost AI assistant. Ask me anything about creating, hosting, or sharing your biography!" },
  ]);

  // Handle Click-Away to close chat 
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click target is NOT within the chat window AND NOT within the chat button
      if (
        chatOpen &&
        chatRef.current &&
        !chatRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setChatOpen(false);
      }
    };

    // Attach the listener to the document when the chat is open
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Clean up the listener when the component unmounts or chatOpen changes
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [chatOpen]);

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

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -100, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -150, 0], y: [0, 100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-tr from-pink-400/30 to-orange-500/30 rounded-full blur-3xl"
        />
      </div>

    
      {/* Hero */}
      <section className="pt-32 pb-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="mb-6"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 text-sm font-medium text-white shadow-md">
              <Zap className="inline h-4 w-4 mr-1" />
              Trusted by 3,200+ storytellers
            </span>
          </motion.div>

          <motion.h1
            key={activeSlug + "-title"}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 drop-shadow-lg"
          >
            {service.title}
          </motion.h1>

          <motion.p
            key={activeSlug + "-desc"}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.8 }}
            className={`mt-6 text-xl md:text-2xl max-w-4xl mx-auto font-medium ${textSecondary}`}
          >
            {service.description}
          </motion.p>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(services).map(([slug, data]) => {
            const TabIcon = data.icon;
            const isActive = activeSlug === slug;
            const tabGradient = theme === "dark" ? data.darkColor : data.color;

            return (
              <motion.button
                key={slug}
                onClick={() => switchTab(slug)}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 }}
                className={`group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden transition-all`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${tabGradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative z-10 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-r ${tabGradient} shadow-md`}>
                    <TabIcon className="h-6 w-6 text-white" />
                  </div>
                  <span className={`font-bold ${isActive ? "text-white" : textPrimary}`}>
                    {data.title}
                  </span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r opacity-20"
                    style={{ borderRadius: "1rem" }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        key={activeSlug}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-start"
      >
        {/* Left */}
        <div className="space-y-10">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl bg-gradient-to-r ${gradient} shadow-xl`}>
              <Icon className="h-12 w-12 text-white" />
            </div>
            <div>
              <h2 className={`text-3xl font-bold ${textPrimary}`}>{service.title}</h2>
              <p className={`mt-1 ${textSecondary}`}>{service.description}</p>
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
                <div className={`text-3xl font-bold ${textPrimary}`}>
                  {stat.value}
                </div>
                <div className={`text-sm flex items-center justify-center gap-1 mt-1 ${textMuted}`}>
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
                <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                <p className={`font-medium ${textPrimary}`}>{item}</p>
              </motion.div>
            ))}
          </div>

          <motion.a
            href="/signup"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white font-bold text-lg shadow-2xl backdrop-blur-xl border border-white/20"
          >
            Start Now <Sparkles className="h-5 w-5" />
          </motion.a>
        </div>

        {/* Right */}
        <div className="space-y-10">
          <div>
            <h3 className={`text-2xl font-bold mb-6 flex items-center gap-2 ${textPrimary}`}>
              <Zap className="h-6 w-6 text-yellow-400" />
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
                  <div className={`absolute left-0 top-0 w-10 h-10 rounded-full bg-gradient-to-r ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {i + 1}
                  </div>
                  {i < service.steps.length - 1 && (
                    <div className="absolute left-5 top-10 w-0.5 h-16 bg-gradient-to-b from-blue-500 to-purple-500 opacity-30" />
                  )}
                  <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-gray-200/50 dark:border-gray-700/50 group-hover:shadow-xl transition-shadow">
                    <h4 className={`font-bold flex items-center justify-between ${textPrimary}`}>
                      {step.title}
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full">
                        {step.time}
                      </span>
                    </h4>
                    <p className={`mt-1 ${textSecondary}`}>{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h3 className={`text-2xl font-bold mb-6 ${textPrimary}`}>
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
                    className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${gradient} shadow-lg`}>
                        <FIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className={`font-bold ${textPrimary}`}>{feat.title}</h4>
                        <p className={`mt-1 ${textSecondary}`}>{feat.desc}</p>
                      </div>
                    </div>
                    <motion.div
                      className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                    />
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
          <Sparkles className="mx-auto h-14 w-14 text-white mb-4 animate-pulse" />
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
            className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-white text-blue-600 dark:text-blue-600 font-bold text-xl shadow-lg hover:shadow-xl transition"
          >
            Get Started Free <ChevronRight className="h-6 w-6" />
          </motion.a>
        </motion.div>
      </section>

      {/* AI Chat */}
      <>
        <motion.button
          ref={buttonRef} // Reference for click-away detection
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white shadow-2xl backdrop-blur-xl border border-white/20"
          whileHover={{ scale: 1.1, rotate: 360 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          {chatOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </motion.button>

        <AnimatePresence>
          {chatOpen && (
            <motion.div
              ref={chatRef} // Reference for click-away detection
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-24 right-6 w-96 h-96 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 flex flex-col overflow-hidden z-50"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-75" />

              {/* Chat Header: Text is intentionally white for contrast against the gradient background */}
              <div className="relative z-10 p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center gap-3 rounded-t-3xl">
                <Bot className="h-6 w-6" />
                <div>
                  <div className="font-bold">BioHost AI</div>
                  <div className="text-xs opacity-90">Ask me anything</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl shadow-md ${
                          msg.role === "user"
                            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                            : `bg-white/70 dark:bg-gray-700/70 ${textPrimary}`
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="p-3 border-t dark:border-gray-700 flex gap-2">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask me anything..."
                  className={`flex-1 px-4 py-2 rounded-full bg-white/70 dark:bg-gray-700/70 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-xl ${textPrimary}`}
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={sendMessage}
                  className="p-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                >
                  <Send className="h-5 w-5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    </div>
  );
}