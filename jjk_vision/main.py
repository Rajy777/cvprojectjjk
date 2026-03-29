import cv2
import numpy as np
import time
import pygame
import os
from scipy.io import wavfile

from modules.gesture import GestureRecognizer
from modules.motion import MotionTracker
from modules.effects import EffectsEngine
from modules.ui import UIRenderer
from modules.voice import VoiceModule, VoiceEvent
from modules.sequencer import CinematicSequencer
from modules.particle import ParticleSystem

def generate_sounds():
    if not os.path.exists("assets/sounds"):
        os.makedirs("assets/sounds")
    
    sample_rate = 44100
    
    # Domain Expansion
    t = np.linspace(0, 2.0, int(sample_rate * 2.0))
    rumble = np.sin(2 * np.pi * 40 * t)
    sweep = np.sin(2 * np.pi * np.linspace(200, 800, len(t)) * t)
    noise = np.random.normal(0, 0.1, len(t))
    audio = (rumble + sweep + noise) * 0.3
    wavfile.write("assets/sounds/domain_expansion.wav", sample_rate, (audio * 32767).astype(np.int16))
    
    # Black Flash
    t = np.linspace(0, 0.4, int(sample_rate * 0.4))
    spike = np.exp(-100 * t) * np.sin(2 * np.pi * 8000 * t)
    thump = np.exp(-10 * t) * np.sin(2 * np.pi * 60 * t)
    audio = (spike + thump) * 0.5
    wavfile.write("assets/sounds/black_flash.wav", sample_rate, (audio * 32767).astype(np.int16))

def main():
    generate_sounds()
    pygame.mixer.init()
    sounds = {
        "domain": pygame.mixer.Sound("assets/sounds/domain_expansion.wav"),
        "black_flash": pygame.mixer.Sound("assets/sounds/black_flash.wav")
    }

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    recognizer = GestureRecognizer()
    tracker = MotionTracker()
    effects = EffectsEngine((720, 1280))
    ui = UIRenderer()
    voice = VoiceModule()
    sequencer = CinematicSequencer((720, 1280))
    particles = ParticleSystem()
    
    state = {
        "character": "gojo",
        "gesture": "NEUTRAL",
        "confidence": 0.0,
        "domain_active": False,
        "domain_t": 0.0,
        "black_flash_active": False,
        "black_flash_t": 0.0,
        "black_flash_intensity": 0.0,
        "black_flash_count": 0,
        "hand_speed": 0.0,
        "particles": particles
    }
    
    last_time = time.time()
    domain_start_time = 0
    bf_start_time = 0
    bf_origin = np.array([0, 0])

    while True:
        curr_time = time.time()
        dt = curr_time - last_time
        last_time = curr_time
        
        ret, frame = cap.read()
        if not ret: continue
        frame = cv2.flip(frame, 1)
        
        # 1. Gesture
        label, conf, landmarks = recognizer.recognize(frame)
        state["gesture"] = label
        state["confidence"] = conf
        
        # 2. Character Switch
        if label in ["GOJO_OPEN", "GOJO_CROSS"]: state["character"] = "gojo"
        elif label in ["SUKUNA_FIST", "SUKUNA_CLAW"]: state["character"] = "sukuna"
        
        # 3. Voice
        v_event = voice.get_next_event()
        if v_event in [VoiceEvent.DOMAIN_EXPANSION, VoiceEvent.GOJO_DOMAIN, VoiceEvent.SUKUNA_DOMAIN]:
            if v_event == VoiceEvent.GOJO_DOMAIN: state["character"] = "gojo"
            elif v_event == VoiceEvent.SUKUNA_DOMAIN: state["character"] = "sukuna"
            
            state["domain_active"] = not state["domain_active"]
            if state["domain_active"]:
                domain_start_time = curr_time
                sounds["domain"].play()
        elif v_event == VoiceEvent.SWITCH_GOJO: state["character"] = "gojo"
        elif v_event == VoiceEvent.SWITCH_SUKUNA: state["character"] = "sukuna"
        elif v_event == VoiceEvent.BLACK_FLASH:
            state["black_flash_active"] = True
            state["black_flash_intensity"] = 1.0
            state["black_flash_count"] += 1
            bf_start_time = curr_time
            bf_origin = np.array([frame.shape[1]//2, frame.shape[0]//2])
            sounds["black_flash"].play()
            particles.emit_black_flash(bf_origin, 1.0)
        
        # 4. Motion
        if landmarks:
            bf_triggers = tracker.update(landmarks, frame.shape)
            for bf in bf_triggers:
                state["black_flash_active"] = True
                state["black_flash_intensity"] = bf["intensity"]
                state["black_flash_count"] += 1
                bf_start_time = curr_time
                bf_origin = bf["pos"]
                sounds["black_flash"].play()
                particles.emit_black_flash(bf_origin, bf["intensity"])
            
            # Update speed for HUD
            if len(tracker.hands[0]["velocity_history"]) > 0:
                state["hand_speed"] = np.linalg.norm(tracker.hands[0]["velocity_history"][-1])

        # 5. Rendering
        if state["domain_active"]:
            state["domain_t"] = curr_time - domain_start_time
            if state["domain_t"] > 4.0: state["domain_active"] = False
            frame = sequencer.update(frame, state, effects)
        else:
            # Base effect at reduced alpha
            if state["character"] == "gojo":
                void_frame = effects.apply_infinite_void(frame)
                frame = cv2.addWeighted(frame, 0.8, void_frame, 0.2, 0)
            else:
                shrine_frame = effects.apply_malevolent_shrine(frame)
                frame = cv2.addWeighted(frame, 0.8, shrine_frame, 0.2, 0)

        if state["black_flash_active"]:
            bf_t = curr_time - bf_start_time
            if bf_t > 0.35: state["black_flash_active"] = False
            else: frame = effects.apply_black_flash(frame, bf_t, state["black_flash_intensity"], bf_origin)

        # Particles & Trails
        particles.update(dt)
        particles.render(frame)
        
        if landmarks:
            for i in range(len(landmarks)):
                trail = tracker.get_motion_trail(i)
                effects.apply_motion_trail(frame, trail, state["character"])

        # HUD
        ui.render(frame, state)
        
        cv2.imshow("JJK VISION ENGINE", frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == 27: break
        elif key == ord('d'):
            state["domain_active"] = True
            domain_start_time = curr_time
            sounds["domain"].play()

    voice.stop()
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
