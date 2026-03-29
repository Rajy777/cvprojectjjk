import speech_recognition as sr
import threading
import queue
from enum import Enum

class VoiceEvent(Enum):
    DOMAIN_EXPANSION = 1
    GOJO_DOMAIN = 2
    SUKUNA_DOMAIN = 3
    BLACK_FLASH = 4
    SWITCH_GOJO = 5
    SWITCH_SUKUNA = 6

class VoiceModule:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.event_queue = queue.Queue()
        self.running = True
        self.thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.thread.start()

    def _listen_loop(self):
        while self.running:
            try:
                with self.microphone as source:
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    audio = self.recognizer.listen(source, timeout=3, phrase_time_limit=4)
                
                text = self.recognizer.recognize_google(audio).lower()
                print(f"Voice: {text}")
                
                if "domain expansion" in text:
                    self.event_queue.put(VoiceEvent.DOMAIN_EXPANSION)
                elif "infinite void" in text:
                    self.event_queue.put(VoiceEvent.GOJO_DOMAIN)
                elif "malevolent shrine" in text:
                    self.event_queue.put(VoiceEvent.SUKUNA_DOMAIN)
                elif "black flash" in text:
                    self.event_queue.put(VoiceEvent.BLACK_FLASH)
                elif any(x in text for x in ["gojo", "satoru"]):
                    self.event_queue.put(VoiceEvent.SWITCH_GOJO)
                elif any(x in text for x in ["sukuna", "ryomen"]):
                    self.event_queue.put(VoiceEvent.SWITCH_SUKUNA)
                    
            except Exception:
                continue

    def get_next_event(self):
        try:
            return self.event_queue.get_nowait()
        except queue.Empty:
            return None

    def stop(self):
        self.running = False
