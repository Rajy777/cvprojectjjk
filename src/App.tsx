import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Info, Shield, Zap, X, Menu, Github, Twitter, Instagram, Activity } from "lucide-react";
import { CharacterCard } from "./components/CharacterCard";
import { CharacterDetail } from "./components/CharacterDetail";
import { VisionEngine } from "./components/VisionEngine";
import { CHARACTERS } from "./constants";
import { Character } from "./types";
import { cn } from "./lib/utils";

export default function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisionEngineOpen, setIsVisionEngineOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredCharacters = CHARACTERS.filter((char) =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    char.alias?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black font-sans text-white selection:bg-rose-500 selection:text-white">
      {/* Navigation */}
      <nav
        className={cn(
          "fixed top-0 z-50 w-full px-6 py-4 transition-all duration-500 md:px-12",
          isScrolled ? "bg-black/90 backdrop-blur-md border-b border-white/5" : "bg-transparent"
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-12">
            <h1 className="group cursor-pointer text-2xl font-black tracking-tighter uppercase italic">
              <span className="transition-colors group-hover:text-rose-600">JJK</span>
              <span className="text-rose-600 transition-colors group-hover:text-white">.</span>
              EXPLORER
            </h1>
            <div className="hidden items-center gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 md:flex">
              <a href="#" className="transition-colors hover:text-white">Sorcerers</a>
              <a href="#" className="transition-colors hover:text-white">Curses</a>
              <a href="#" className="transition-colors hover:text-white">Techniques</a>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsVisionEngineOpen(true)}
              className="hidden items-center gap-2 rounded-full border border-rose-500/50 bg-rose-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-500 transition-all hover:bg-rose-500 hover:text-white md:flex"
            >
              <Activity size={12} />
              Vision Engine
            </button>
            <button className="text-white transition-transform hover:scale-110">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Editorial Style */}
      <header className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(225,29,72,0.15),transparent_70%)]" />
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" 
          />
          <motion.img
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
            src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop"
            className="h-full w-full object-cover grayscale contrast-150"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Vertical Text Rails */}
        <div className="absolute top-0 left-12 bottom-0 z-10 hidden flex-col justify-between py-24 md:flex">
          <span className="writing-mode-vertical rotate-180 text-[10px] font-bold uppercase tracking-[0.8em] text-zinc-700">TOKYO JUJUTSU HIGH</span>
          <div className="h-32 w-[1px] bg-zinc-800" />
          <span className="writing-mode-vertical rotate-180 text-[10px] font-bold uppercase tracking-[0.8em] text-zinc-700">EST. 19XX</span>
        </div>

        <div className="absolute top-0 right-12 bottom-0 z-10 hidden flex-col justify-between py-24 md:flex">
          <span className="writing-mode-vertical text-[10px] font-bold uppercase tracking-[0.8em] text-zinc-700">CURSED ENERGY DETECTED</span>
          <div className="h-32 w-[1px] bg-rose-900/50" />
          <span className="writing-mode-vertical text-[10px] font-bold uppercase tracking-[0.8em] text-rose-900">GRADE: SPECIAL</span>
        </div>

        {/* Main Content */}
        <div className="relative z-20 flex w-full max-w-7xl flex-col px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mb-4"
          >
            <span className="inline-block bg-rose-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-white">
              Classified Archives
            </span>
          </motion.div>

          <div className="relative">
            <motion.h2
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-[15vw] font-black leading-[0.85] tracking-tighter uppercase italic md:text-[12vw]"
            >
              JUJUTSU<br />
              <span className="text-rose-600">KAISEN</span>
            </motion.h2>
            
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 1.5, delay: 0.8 }}
              className="mt-4 h-2 w-full origin-left bg-white"
            />
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-12 md:flex-row md:items-end">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="max-w-xl text-lg font-medium leading-relaxed text-zinc-400 md:text-2xl"
            >
              Where human emotions manifest as monsters, and the only line of defense is a group of sorcerers willing to sacrifice everything.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <button 
                onClick={() => setIsVisionEngineOpen(true)}
                className="group relative flex items-center gap-4 overflow-hidden bg-white px-10 py-5 text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-rose-600 hover:text-white"
              >
                <Activity size={18} />
                Enter Domain
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              </button>
              <button className="border border-white/20 bg-white/5 px-10 py-5 text-sm font-black uppercase tracking-widest text-white backdrop-blur-md transition-all hover:bg-white/10">
                The Archives
              </button>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-12 flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-600">Scroll</span>
            <div className="h-[1px] w-12 bg-zinc-800" />
            <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-600">Explore</span>
          </div>
        </motion.div>
      </header>

      {/* Feature Section - Bento Grid Style */}
      <section className="relative z-10 bg-black px-6 py-32 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-24 grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="col-span-1 flex flex-col justify-between border border-white/10 bg-zinc-900/30 p-8 md:col-span-8 md:row-span-1"
            >
              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-rose-500">System Analysis</h4>
                <h3 className="text-4xl font-black tracking-tighter uppercase italic">Cursed Energy <span className="text-rose-600">Dynamics</span></h3>
              </div>
              <p className="mt-8 max-w-md text-zinc-500">Every negative emotion fuels the power of a sorcerer. Understanding the flow is the difference between life and a gruesome end.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="col-span-1 aspect-square border border-white/10 bg-rose-600 p-8 md:col-span-4 md:row-span-1"
            >
              <Zap size={48} className="text-white" />
              <h3 className="mt-8 text-2xl font-black uppercase tracking-tighter italic text-white">Black Flash</h3>
              <p className="mt-4 text-rose-100/60 text-sm">A distortion in space that occurs when cursed energy is applied within 0.000001 seconds of a physical hit.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="col-span-1 border border-white/10 bg-zinc-900/30 p-8 md:col-span-4 md:row-span-1"
            >
              <Shield size={32} className="text-zinc-500" />
              <h3 className="mt-8 text-xl font-black uppercase tracking-tighter italic">Jujutsu High</h3>
              <p className="mt-4 text-zinc-500 text-sm">The training ground for the next generation of protectors.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="col-span-1 flex items-center justify-center border border-white/10 bg-[url('https://images.unsplash.com/photo-1541560052-5e137f229371?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center grayscale md:col-span-8 md:row-span-1"
            >
              <div className="absolute inset-0 bg-black/60 transition-opacity hover:opacity-40" />
              <button className="relative z-10 text-xs font-bold uppercase tracking-[0.5em] text-white underline underline-offset-8">View All Techniques</button>
            </motion.div>
          </div>

          <div className="mb-16 flex flex-col items-end justify-between gap-8 md:flex-row md:items-center">
            <div className="space-y-2">
              <h3 className="text-5xl font-black tracking-tighter uppercase italic md:text-7xl">
                The <span className="text-rose-600">Vanguard</span>
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-600">
                Grade 1 & Special Grade Personnel
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative">
                <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-zinc-600" size={14} />
                <input
                  type="text"
                  placeholder="FILTER BY NAME..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 border-b border-white/10 bg-transparent py-2 pr-4 pl-10 text-[10px] font-bold uppercase tracking-widest outline-none transition-all focus:border-rose-600"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onClick={() => setSelectedCharacter(character)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black px-6 py-24 md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
            <div className="md:col-span-4">
              <h2 className="mb-8 text-2xl font-black tracking-tighter uppercase italic">
                JJK<span className="text-rose-600">.</span>EXPLORER
              </h2>
              <p className="max-w-xs text-sm font-medium leading-relaxed text-zinc-500">
                The definitive archive of the Jujutsu world. Classified information for authorized sorcerers only.
              </p>
              <div className="mt-12 flex gap-6">
                <a href="#" className="text-zinc-600 transition-colors hover:text-rose-600"><Twitter size={20} /></a>
                <a href="#" className="text-zinc-600 transition-colors hover:text-rose-600"><Github size={20} /></a>
                <a href="#" className="text-zinc-600 transition-colors hover:text-rose-600"><Instagram size={20} /></a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 md:col-span-8 md:grid-cols-3">
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-700">Navigation</h4>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-widest text-zinc-500">
                  <li><a href="#" className="transition-colors hover:text-white">The Archives</a></li>
                  <li><a href="#" className="transition-colors hover:text-white">Sorcerers</a></li>
                  <li><a href="#" className="transition-colors hover:text-white">Curses</a></li>
                  <li><a href="#" className="transition-colors hover:text-white">Techniques</a></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-700">Resources</h4>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-widest text-zinc-500">
                  <li><a href="#" className="transition-colors hover:text-white">Vision Engine</a></li>
                  <li><a href="#" className="transition-colors hover:text-white">Cursed Tools</a></li>
                  <li><a href="#" className="transition-colors hover:text-white">Domain Rules</a></li>
                  <li><a href="#" className="transition-colors hover:text-white">Grade System</a></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-700">Legal</h4>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-widest text-zinc-500">
                  <li><a href="#" className="transition-colors hover:text-white">Privacy Protocol</a></li>
                  <li><a href="#" className="transition-colors hover:text-white">Terms of Binding</a></li>
                  <li><a href="#" className="transition-colors hover:text-white">Security Clearance</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-24 flex flex-col items-center justify-between gap-8 border-t border-white/5 pt-12 md:flex-row">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-800">
              © 2026 TOKYO JUJUTSU HIGH ARCHIVES. ALL RIGHTS RESERVED.
            </p>
            <div className="flex items-center gap-4">
              <div className="h-1 w-1 rounded-full bg-rose-600" />
              <span className="font-mono text-[10px] uppercase tracking-[0.5em] text-zinc-800">System Status: Optimal</span>
            </div>
          </div>
        </div>

        {/* Global Cursed Energy Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 100 + "%", 
                y: Math.random() * 100 + "%", 
                opacity: 0,
                scale: 0 
              }}
              animate={{ 
                y: [null, "-20%"], 
                opacity: [0, 0.1, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{ 
                duration: 10 + Math.random() * 10, 
                repeat: Infinity, 
                delay: Math.random() * 5,
                ease: "easeInOut"
              }}
              className="absolute h-32 w-32 rounded-full bg-rose-900/10 blur-[80px]"
            />
          ))}
        </div>
      </footer>

      {/* Character Detail Modal */}
      <CharacterDetail
        character={selectedCharacter}
        onClose={() => setSelectedCharacter(null)}
      />

      {/* Vision Engine Overlay */}
      <AnimatePresence>
        {isVisionEngineOpen && (
          <VisionEngine onClose={() => setIsVisionEngineOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
