import numpy as np
from collections import deque
import time

class MotionTracker:
    def __init__(self):
        # Track two hands
        self.hands = {
            0: {"pos_history": deque(maxlen=12), "velocity_history": deque(maxlen=8)},
            1: {"pos_history": deque(maxlen=12), "velocity_history": deque(maxlen=8)}
        }
        self.last_black_flash_time = 0
        self.black_flash_cooldown = 1.2

    def update(self, hand_landmarks, frame_shape):
        h, w = frame_shape[:2]
        current_time = time.time()
        
        triggers = []

        for i, landmarks in enumerate(hand_landmarks):
            if i >= 2: break
            
            # Wrist is landmark 0
            wrist = landmarks.landmark[0]
            pos = np.array([wrist.x * w, wrist.y * h])
            
            history = self.hands[i]["pos_history"]
            vel_history = self.hands[i]["velocity_history"]
            
            if len(history) > 0:
                prev_pos, prev_time = history[-1]
                dt = current_time - prev_time
                if dt > 0:
                    velocity = (pos - prev_pos) / dt
                    vel_history.append(velocity)
                    
                    if len(vel_history) > 1:
                        prev_velocity = vel_history[-2]
                        acceleration = (velocity - prev_velocity) / dt
                        
                        speed = np.linalg.norm(velocity)
                        accel_mag = np.linalg.norm(acceleration)
                        
                        # Black Flash Detection
                        if self._check_black_flash(i, speed, accel_mag, current_time):
                            intensity = min(1.0, speed / 2500) * min(1.0, accel_mag / 8000)
                            triggers.append({"hand": i, "pos": pos, "intensity": intensity})
                            self.last_black_flash_time = current_time

            history.append((pos, current_time))
            
        return triggers

    def _check_black_flash(self, hand_idx, speed, accel_mag, current_time):
        if current_time - self.last_black_flash_time < self.black_flash_cooldown:
            return False
            
        if speed < 900 or accel_mag < 4000:
            return False
            
        vel_history = self.hands[hand_idx]["velocity_history"]
        if len(vel_history) < 4:
            return False
            
        # Direction change >= 110 degrees
        v_curr = vel_history[-1]
        v_prev = vel_history[-4]
        
        norm_curr = np.linalg.norm(v_curr)
        norm_prev = np.linalg.norm(v_prev)
        
        if norm_curr > 0 and norm_prev > 0:
            cos_theta = np.dot(v_curr, v_prev) / (norm_curr * norm_prev)
            angle = np.degrees(np.arccos(np.clip(cos_theta, -1.0, 1.0)))
            if angle >= 110:
                return True
        
        return False

    def is_thrusting(self, hand_idx, landmarks):
        # Simplified thrust detection
        vel_history = self.hands[hand_idx]["velocity_history"]
        if len(vel_history) == 0: return False
        
        velocity = vel_history[-1]
        speed = np.linalg.norm(velocity)
        
        # Check Z coordinate change (MediaPipe world coords)
        # wrist = landmarks.landmark[0]
        # We'd need history of Z as well, but for now let's use speed + direction
        return speed > 600

    def get_motion_trail(self, hand_idx, n=8):
        history = self.hands[hand_idx]["pos_history"]
        return [p[0] for p in list(history)[-n:]]
