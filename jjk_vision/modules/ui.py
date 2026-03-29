import cv2
import numpy as np

class UIRenderer:
    def __init__(self):
        self.font_main = cv2.FONT_HERSHEY_TRIPLEX
        self.font_sub = cv2.FONT_HERSHEY_SIMPLEX

    def render(self, frame, state):
        # 1. Character Name Badge
        char = state["character"]
        name = "GOJO SATORU" if char == "gojo" else "RYOMEN SUKUNA"
        color = (200, 50, 50) if char == "gojo" else (50, 50, 200)
        
        cv2.rectangle(frame, (20, 20), (350, 80), (30, 30, 30), -1)
        cv2.rectangle(frame, (20, 20), (350, 80), color, 2)
        cv2.putText(frame, name, (40, 60), self.font_main, 1.0, (255, 255, 255), 2)

        # 2. Gesture Confidence Bar
        conf = state["confidence"]
        if conf > 0.82:
            cv2.putText(frame, "CURSED TECHNIQUE READY", (20, frame.shape[0] - 60), self.font_sub, 0.6, color, 1)
            bar_w = int(conf * 200)
            cv2.rectangle(frame, (20, frame.shape[0] - 40), (20 + bar_w, frame.shape[0] - 32), color, -1)

        # 3. Speed Meter
        speed = state["hand_speed"]
        cv2.putText(frame, "CURSED ENERGY OUTPUT", (frame.shape[1] - 300, frame.shape[0] - 60), self.font_sub, 0.6, (255, 255, 255), 1)
        
        max_speed = 2500.0
        ratio = min(1.0, speed / max_speed)
        meter_h = int(ratio * 150)
        
        # Color ramp: Green (0, 255, 0) to Red (0, 0, 255) in BGR
        color = (0, int(255 * (1 - ratio)), int(255 * ratio))
        
        cv2.rectangle(frame, (frame.shape[1] - 50, frame.shape[0] - 50 - meter_h), (frame.shape[1] - 30, frame.shape[0] - 50), color, -1)
        cv2.rectangle(frame, (frame.shape[1] - 50, frame.shape[0] - 200), (frame.shape[1] - 30, frame.shape[0] - 50), (100, 100, 100), 1)
        
        cv2.putText(frame, f"{int(speed)} px/s", (frame.shape[1] - 150, frame.shape[0] - 30), self.font_sub, 0.5, (255, 255, 255), 1)

        # 4. Black Flash Counter
        cv2.putText(frame, f"BLACK FLASH x{state['black_flash_count']}", (frame.shape[1] - 300, 60), self.font_main, 1.0, (255, 255, 255), 2)
