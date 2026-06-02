"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Zap, Users, Radio, Shield, Calendar } from "lucide-react";

const features = [
  { icon: Shield, title: "Identity Authorized", desc: "Exclusive access for @iiitnr.edu.in accounts. Automatic batch & branch detection.", color: "from-neonCyan to-blue-500" },
  { icon: MessageSquare, title: "Hierarchical Chat", desc: "College → Batch → Branch → Custom channels. Real-time messaging with WebSockets.", color: "from-neonPurple to-pink-500" },
  { icon: Radio, title: "Reels Feed", desc: "TikTok-style vertical scroll feed. Share videos, photos, and campus moments.", color: "from-neonCyan to-green-400" },
  { icon: Calendar, title: "Event Tracker", desc: "Never miss a fest. Events auto-sorted into Previous, Present, and Upcoming.", color: "from-yellow-400 to-orange-500" },
  { icon: Zap, title: "Instant Notices", desc: "AI-summarized college notices pushed in real-time via automated bots.", color: "from-neonPurple to-neonCyan" },
  { icon: Users, title: "Mentor Connect", desc: "Find mentors by batch and branch. Direct message for guidance.", color: "from-pink-500 to-neonPurple" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(0,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Floating orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
        style={{ background: 'hsl(180, 100%, 50%)' }}
        animate={{ x: [0, 120, -80, 0], y: [0, -100, 80, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '-10%', left: '-5%' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
        style={{ background: 'hsl(280, 100%, 65%)' }}
        animate={{ x: [0, -100, 120, 0], y: [0, 80, -60, 0], scale: [1, 0.8, 1.1, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ bottom: '-5%', right: '-5%' }}
      />

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-block mb-6"
          >
            <span className="px-4 py-2 rounded-full glass-panel border border-gray-700 text-xs text-gray-400 uppercase tracking-widest">
              Built for IIIT Naya Raipur
            </span>
          </motion.div>

          <h1 className="text-7xl md:text-8xl font-black tracking-tighter mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neonCyan via-blue-400 to-neonPurple">
              Uni
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neonPurple via-pink-400 to-neonCyan">
              Connect
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The only networking platform your campus needs. Real-time chats, event tracking, 
            reels feed, and more — exclusively for <span className="text-neonCyan font-medium">@iiitnr.edu.in</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/auth" className="px-8 py-4 rounded-2xl font-bold text-black bg-gradient-to-r from-neonCyan to-blue-400 hover:shadow-neonCyan transition-all hover:scale-105 text-center">
              Get Started →
            </Link>
            <Link href="/auth" className="px-8 py-4 rounded-2xl font-bold glass-panel border border-gray-700 text-gray-300 hover:border-neonPurple transition-all hover:scale-105 text-center">
              Sign In
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-gray-600 flex items-start justify-center p-1.5">
            <motion.div
              className="w-1.5 h-2.5 rounded-full bg-neonCyan"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Bento Grid Features */}
      <section className="relative z-10 px-4 py-24 max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold text-center mb-4"
        >
          Everything you need.{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-neonCyan to-neonPurple">Nothing you don't.</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-gray-500 text-center mb-16 max-w-lg mx-auto"
        >
          A purpose-built platform designed around the real needs of IIITNR students.
        </motion.p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="glass-panel rounded-2xl p-8 border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA Footer */}
      <section className="relative z-10 px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center glass-panel rounded-3xl p-12 border border-gray-800"
        >
          <h3 className="text-3xl font-bold mb-4">Ready to connect?</h3>
          <p className="text-gray-400 mb-8">Join your batchmates, find mentors, and never miss a campus update.</p>
          <Link href="/auth" className="inline-block px-10 py-4 rounded-2xl font-bold text-black bg-gradient-to-r from-neonCyan to-neonPurple hover:shadow-neonCyan transition-all hover:scale-105">
            Launch UniConnect
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
