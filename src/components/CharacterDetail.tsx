import { motion, AnimatePresence } from "motion/react";
import { Character } from "../types";
import { X, Shield, Zap, Info } from "lucide-react";
import Markdown from "react-markdown";

interface CharacterDetailProps {
  character: Character | null;
  onClose: () => void;
}

export function CharacterDetail({ character, onClose }: CharacterDetailProps) {
  if (!character) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl md:p-12"
        onClick={onClose}
      >
        <motion.div
          layoutId={`card-${character.id}`}
          className="relative grid h-full max-h-[900px] w-full max-w-6xl grid-cols-1 overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl halftone md:grid-cols-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-20 border border-white/10 bg-black/50 p-3 text-white backdrop-blur-md transition-all hover:bg-rose-600 hover:text-white"
          >
            <X size={24} />
          </button>

          <div className="relative h-[40vh] overflow-hidden md:h-full">
            <motion.img
              layoutId={`image-${character.id}`}
              src={character.image}
              alt={character.name}
              className="h-full w-full object-cover grayscale contrast-125"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:bg-gradient-to-r" />
            
            {/* Technical Overlay */}
            <div className="absolute top-12 left-12 z-10 hidden flex-col gap-1 md:flex">
              <span className="text-[8px] font-mono uppercase tracking-[0.5em] text-rose-600">Identification</span>
              <span className="text-2xl font-black uppercase tracking-tighter italic text-white">{character.id.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex flex-col overflow-y-auto p-8 md:p-16">
            <div className="mb-12 flex items-center gap-4">
              <div className="h-[1px] w-12 bg-rose-600" />
              <motion.p
                layoutId={`alias-${character.id}`}
                className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-rose-500"
              >
                {character.alias}
              </motion.p>
            </div>

            <motion.h2
              layoutId={`name-${character.id}`}
              className="mb-12 text-6xl font-black tracking-tighter uppercase italic text-white md:text-8xl"
            >
              {character.name}
            </motion.h2>

            <div className="mb-16 grid grid-cols-2 gap-12 border-y border-white/5 py-8">
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-600">
                  <Shield size={10} /> Grade
                </p>
                <p className="text-xl font-black uppercase tracking-tighter italic text-rose-600">{character.grade}</p>
              </div>
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-600">
                  <Info size={10} /> Role
                </p>
                <p className="text-xl font-black uppercase tracking-tighter italic text-white">{character.role}</p>
              </div>
            </div>

            <div className="mb-16 space-y-6">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-600">Biography</p>
              <div className="prose prose-invert max-w-none text-lg leading-relaxed text-zinc-400">
                <Markdown>{character.description}</Markdown>
              </div>
            </div>

            <div className="space-y-8">
              <p className="flex items-center gap-2 font-mono text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-600">
                <Zap size={10} /> Cursed Techniques
              </p>
              <div className="flex flex-wrap gap-4">
                {character.techniques.map((tech) => (
                  <span
                    key={tech}
                    className="border border-white/10 bg-white/5 px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-white backdrop-blur-sm transition-all hover:border-rose-600"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="mt-auto pt-16 font-mono text-[8px] font-bold uppercase tracking-[0.5em] text-zinc-800"
            >
              RECORD_ID: {Math.random().toString(36).substring(7).toUpperCase()} // TOKYO_HIGH
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
