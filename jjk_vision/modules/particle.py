import numpy as np
import cv2
import random
import time

class Particle:
    def __init__(self, pos, vel, life, decay_rate, color, size, ptype):
        self.pos = np.array(pos, dtype=np.float32)
        self.vel = np.array(vel, dtype=np.float32)
        self.life = life  # 0.0 to 1.0
        self.decay_rate = decay_rate
        self.color = color
        self.size = size
        self.type = ptype
        self.prev_pos = self.pos.copy()

class ParticleSystem:
    def __init__(self, max_particles=500):
        self.particles = []
        self.max_particles = max_particles

    def emit(self, origin, count, vel_range, color, ptype, spread=1.0):
        for _ in range(count):
            if len(self.particles) >= self.max_particles:
                self.particles.pop(0)
            
            # Velocity with gaussian noise
            vx = random.uniform(vel_range[0], vel_range[1]) + random.gauss(0, spread)
            vy = random.uniform(vel_range[2], vel_range[3]) + random.gauss(0, spread)
            
            life = random.uniform(0.6, 1.0)
            decay = random.uniform(0.5, 1.5)
            
            size = random.uniform(1, 4)
            if ptype == "orb":
                size = random.uniform(3, 8)
            
            p = Particle(origin, [vx, vy], life, decay, color, size, ptype)
            self.particles.append(p)

    def update(self, dt):
        alive_particles = []
        for p in self.particles:
            p.prev_pos = p.pos.copy()
            
            # Apply gravity
            if p.type == "spark":
                p.vel[1] += 200 * dt  # slight downward
            elif p.type == "dust":
                p.vel[1] += 500 * dt  # strong down
            # curse_energy: none
            
            p.pos += p.vel * dt
            p.life -= p.decay_rate * dt
            
            if p.life > 0:
                alive_particles.append(p)
        
        self.particles = alive_particles

    def render(self, frame):
        overlay = frame.copy()
        for p in self.particles:
            alpha = max(0, min(1, p.life))
            color = p.color
            
            if p.type == "spark":
                # Draw line from prev_pos to pos
                cv2.line(overlay, tuple(p.prev_pos.astype(int)), tuple(p.pos.astype(int)), color, int(p.size))
            
            cv2.circle(overlay, tuple(p.pos.astype(int)), int(p.size), color, -1)
            
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

    # Presets
    def emit_gojo_particles(self, origin):
        # Blue/white orbs, slow drift upward, large spread
        self.emit(origin, 8, [-50, 50, -150, -50], (255, 200, 100), "orb", spread=2.0)

    def emit_sukuna_particles(self, origin):
        # Red/black sparks, sharp outward burst, fast decay
        self.emit(origin, 12, [-300, 300, -300, 300], (0, 0, 180), "spark", spread=5.0)

    def emit_black_flash(self, origin, intensity):
        # White sparks + expanding ring
        count = int(20 * intensity)
        self.emit(origin, count, [-800, 800, -800, 800], (255, 255, 255), "spark", spread=10.0)
