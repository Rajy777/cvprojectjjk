import { motion } from "motion/react";
import { Character } from "../types";
import { cn } from "../lib/utils";

interface CharacterCardProps {
  character: Character;
  onClick: () => void;
}

export function CharacterCard({ character, onClick }: CharacterCardProps) {
  return (
    <motion.div
      layoutId={`card-${character.id}`}
      onClick={onClick}
      className="group relative aspect-[3/4] cursor-pointer overflow-hidden border border-white/10 bg-zinc-950 halftone"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.img
        layoutId={`image-${character.id}`}
        src={character.image}
        alt={character.name}
        className="h-full w-full object-cover opacity-40 grayscale transition-all duration-500 group-hover:opacity-60 group-hover:grayscale-0"
        referrerPolicy="no-referrer"
      />
      
      {/* Technical Overlays */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-600">Grade Level</span>
          <span className="text-xs font-black uppercase tracking-tighter italic text-rose-600">{character.grade}</span>
        </div>
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: character.color }} />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      
      <div className="absolute bottom-0 left-0 w-full p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-white/10" />
          <span className="text-[8px] font-mono uppercase tracking-[0.4em] text-zinc-700">Classified</span>
          <div className="h-[1px] flex-1 bg-white/10" />
        </div>

        <motion.p
          layoutId={`alias-${character.id}`}
          className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-rose-500"
        >
          {character.alias}
        </motion.p>
        <motion.h3
          layoutId={`name-${character.id}`}
          className="text-4xl font-black tracking-tighter uppercase italic text-white"
        >
          {character.name}
        </motion.h3>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mt-6 flex flex-wrap gap-2"
        >
          {character.techniques.slice(0, 2).map((tech) => (
            <span
              key={tech}
              className="border border-white/10 bg-white/5 px-3 py-1 font-mono text-[8px] uppercase tracking-widest text-zinc-400 backdrop-blur-sm transition-colors hover:border-rose-600 hover:text-white"
            >
              {tech}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Corner Accents */}
      <div className="absolute bottom-0 right-0 h-8 w-8 border-r border-b border-rose-600/30" />
      <div className="absolute top-0 left-0 h-8 w-8 border-l border-t border-rose-600/30" />
    </motion.div>
  );
}
