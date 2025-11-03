// app/page.tsx
"use client";

import { motion, useInView } from "framer-motion";
import {
  BookOpen,
  Server,
  User,
  Share2,
  Star,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Sparkles,
  QrCode,
  Activity,
  Calendar,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [stats, setStats] = useState({ bios: 0, users: 0, stories: 0 });

  const services = [
    {
      title: "Biography Creation",
      slug: "biography-creation",
      description: "Craft compelling life stories with AI-powered writing and human refinement.",
      icon: BookOpen,
      color: "from-blue-500 to-purple-600",
      darkColor: "from-blue-400 to-purple-500",
    },
    {
      title: "Secure Hosting",
      slug: "secure-hosting",
      description: "Host your biography on enterprise-grade, encrypted, global servers.",
      icon: Server,
      color: "from-green-500 to-teal-600",
      darkColor: "from-emerald-400 to-cyan-500",
    },
    {
      title: "Customization",
      slug: "customization",
      description: "Personalize every pixel with themes, media, and interactive elements.",
      icon: User,
      color: "from-purple-500 to-pink-600",
      darkColor: "from-violet-400 to-pink-500",
    },
    {
      title: "Easy Sharing",
      slug: "easy-sharing",
      description: "Share instantly with QR, embeds, social, and track engagement.",
      icon: Share2,
      color: "from-orange-500 to-red-600",
      darkColor: "from-orange-400 to-rose-500",
    },
  ];

  const testimonials = [
    {
      quote: "Transformed my family history into a beautiful online legacy!",
      author: "Jane Doe",
      role: "Author & Grandmother",
      rating: 5,
    },
    {
      quote: "Professional hosting with zero downtime. Highly recommend!",
      author: "John Smith",
      role: "Entrepreneur",
      rating: 5,
    },
    {
      quote: "The customization options are endless. My bio looks stunning!",
      author: "Maria Garcia",
      role: "Artist",
      rating: 5,
    },
  ];

  // Stats Counter
  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  useEffect(() => {
    if (inView) {
      const interval = setInterval(() => {
        setStats((s) => ({
          bios: s.bios < 10500 ? s.bios + 137 : 10500,
          users: s.users < 3200 ? s.users + 41 : 3200,
          stories: s.stories < 8500 ? s.stories + 112 : 8500,
        }));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [inView]);

  return (
    <div className="min-h-screen">
      {/* Floating CTA - ONLY FOR GUESTS */}
      {!isLoggedIn && (
        <motion.a
          href="/signup"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white px-5 py-3 rounded-full shadow-2xl font-semibold text-sm md:text-base backdrop-blur-xl border border-white/20"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Start Free <Sparkles className="h-4 w-4 animate-pulse" />
        </motion.a>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 blur-3xl">
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

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 text-sm font-medium text-white">
              <Zap className="inline h-4 w-4 mr-1" />
              Trusted by 3,200+ storytellers
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400"
          >
            {isLoggedIn ? "Your Legacy, Live" : "Host Your Life Story"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-xl md:text-2xl mb-10 max-w-4xl mx-auto text-gray-700 dark:text-gray-200"
          >
            {isLoggedIn
              ? "Your biography is live, secure, and ready to share with the world."
              : "Create, customize, and share professional biographies with secure hosting."}
          </motion.p>

          {/* CTA BUTTONS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {!isLoggedIn && (
              <motion.a
                href="/signup"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 shadow-xl backdrop-blur-xl border border-white/20 flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="h-5 w-5" />
              </motion.a>
            )}
          </motion.div>
        </div>
      </section>

      {/* LIVE STATS – "Countries" → "Active Stories" */}
      <section className="py-16 px-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border-y border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto">
          <div ref={statsRef} className="grid grid-cols-3 gap-8 text-center">
            {[
              { label: "Bios Hosted", value: stats.bios, suffix: "+" },
              { label: "Happy Users", value: stats.users, suffix: "+" },
              { label: "Active Stories", value: stats.stories, suffix: "+" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.2 }}
              >
                <div className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                  {stat.value.toLocaleString()}{stat.suffix}
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-300 font-medium">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LOGGED IN DASHBOARD – NO "Create New Bio" / "View My Bio" */}
      {isLoggedIn && (
        <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                Your Bio Dashboard
              </h2>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
                Manage, share, and track your legacy.
              </p>
            </motion.div>

            {/* QUICK ACTIONS – ONLY "Share & QR" */}
            <div className="flex justify-center mb-12">
              <motion.a
                href="/share"
                whileHover={{ y: -8, scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden w-full max-w-md"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 p-3 mb-4 shadow-lg">
                  <QrCode className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Share & QR
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate QR, embed, or share your bio instantly.
                </p>
                <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all group-hover:translate-x-1" />
              </motion.a>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 mb-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {[
                  { action: "Updated bio title", time: "2 hours ago", icon: Calendar },
                  { action: "Shared with 12 people", time: "5 hours ago", icon: Share2 },
                  { action: "Added new photo", time: "1 day ago", icon: BookOpen },
                ].map((act, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-2">
                      <act.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {act.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {act.time}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* PROFILE PREVIEW */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl"
            >
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/30 flex items-center justify-center">
                  <User className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Welcome back, Alex!</h3>
                  <p className="text-white/80">Your bio has been viewed 342 times</p>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">87 shares</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm">4.9 rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* SERVICES */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              From creation to global sharing — all in one platform.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.slug}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div
                    className={`p-3 rounded-xl mb-4 w-fit bg-gradient-to-r ${s.color} dark:${s.darkColor} shadow-lg`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {s.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {s.description}
                  </p>

                  <motion.div
                    className="mt-5"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                  >
                    <Link
                      href={`/learn?service=${s.slug}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:gap-2.5 transition-all duration-200"
                    >
                      Learn more
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -80, 0], y: [0, 60, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-orange-500/20 rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 drop-shadow-lg">
              Loved by Storytellers Worldwide
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-medium">
              Real voices. Real legacies. Real impact.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40, rotateX: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.15,
                  type: "spring",
                  stiffness: 80,
                }}
                whileHover={{
                  y: -12,
                  rotateX: 5,
                  rotateY: 5,
                  scale: 1.03,
                }}
                className="group relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                <div className="relative h-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(6)].map((_, s) => (
                      <motion.div
                        key={s}
                        animate={{
                          y: [0, -20, 0],
                          opacity: [0.3, 1, 0.3],
                          scale: [1, 1.3, 1],
                        }}
                        transition={{
                          duration: 3 + s * 0.5,
                          repeat: Infinity,
                          delay: s * 0.3,
                        }}
                        className="absolute"
                        style={{
                          top: `${20 + s * 15}%`,
                          left: `${10 + s * 12}%`,
                        }}
                      >
                        <Star className="h-3 w-3 text-yellow-400 fill-current opacity-60" />
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex items-center mb-5">
                    {[...Array(t.rating)].map((_, j) => (
                      <motion.div
                        key={j}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + j * 0.05 }}
                      >
                        <Star className="h-6 w-6 text-yellow-400 fill-current drop-shadow-md" />
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-lg md:text-xl font-medium text-gray-700 dark:text-gray-200 italic mb-6 leading-relaxed relative z-10">
                    "{t.quote}"
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500 p-0.5">
                      <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600 dark:text-yellow-400" />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">
                        {t.author}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </div>

                <motion.div
                  className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.4 }}
                />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="flex justify-center gap-8 mt-16 flex-wrap"
          >
            {["SSL Secured", "GDPR Compliant", "99.9% Uptime", "24/7 Support"].map(
              (badge, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  className="px-4 py-2 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur-md border border-white/30 text-sm font-medium text-white"
                >
                  {badge}
                </motion.div>
              )
            )}
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 rounded-3xl p-10 shadow-2xl backdrop-blur-xl border border-white/20"
        >
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {isLoggedIn ? "Keep Sharing Your Story" : "Ready to Share Your Story?"}
          </h3>
          <p className="text-white/90 mb-8 text-lg">
            {isLoggedIn
              ? "Your legacy is live. Keep sharing and inspiring."
              : "Join thousands who’ve preserved their legacy with BioHost."}
          </p>
          <motion.a
            href={isLoggedIn ? "/share" : "/signup"}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-blue-600 dark:text-blue-600 font-bold text-lg shadow-lg"
          >
            {isLoggedIn ? "Share Now" : "Get Started Now"} <Shield className="h-5 w-5" />
          </motion.a>
        </motion.div>
      </section>
    </div>
  );
}