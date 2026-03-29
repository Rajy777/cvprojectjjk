import cv2
import mediapipe as mp
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

class GestureRecognizer:
    def __init__(self, model_path="gesture_model.pkl"):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            max_num_hands=2,
            min_detection_confidence=0.75,
            min_tracking_confidence=0.75
        )
        self.model_path = model_path
        self.model = self._load_model()
        self.gesture_buffer = []
        self.buffer_size = 5

    def _load_model(self):
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                return pickle.load(f)
        return None

    def extract_features(self, hand_landmarks):
        # 21 landmarks x (x,y,z) = 63 features
        landmarks = []
        wrist = hand_landmarks.landmark[0]
        
        # Normalize relative to wrist
        for lm in hand_landmarks.landmark:
            landmarks.extend([lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z])
        
        # Hand size for scaling
        hand_size = np.linalg.norm(np.array([hand_landmarks.landmark[9].x - wrist.x, 
                                            hand_landmarks.landmark[9].y - wrist.y]))
        
        landmarks = [l / (hand_size + 1e-6) for l in landmarks]
        
        # Derived features
        finger_angles = []
        finger_extensions = []
        
        # MCP joints: 2, 5, 9, 13, 17
        # Tips: 4, 8, 12, 16, 20
        mcp_indices = [2, 5, 9, 13, 17]
        tip_indices = [4, 8, 12, 16, 20]
        
        for mcp, tip in zip(mcp_indices, tip_indices):
            # Extension ratio
            dist_tip = np.linalg.norm(np.array([hand_landmarks.landmark[tip].x - wrist.x, 
                                               hand_landmarks.landmark[tip].y - wrist.y]))
            dist_mcp = np.linalg.norm(np.array([hand_landmarks.landmark[mcp].x - wrist.x, 
                                               hand_landmarks.landmark[mcp].y - wrist.y]))
            finger_extensions.append(dist_tip / (dist_mcp + 1e-6))
            
            # Angle (simplified)
            v1 = np.array([hand_landmarks.landmark[mcp].x - wrist.x, hand_landmarks.landmark[mcp].y - wrist.y])
            v2 = np.array([hand_landmarks.landmark[tip].x - hand_landmarks.landmark[mcp].x, 
                          hand_landmarks.landmark[tip].y - hand_landmarks.landmark[mcp].y])
            
            cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
            finger_angles.append(np.arccos(np.clip(cos_angle, -1.0, 1.0)))

        # Palm normal
        v_idx = np.array([hand_landmarks.landmark[5].x - wrist.x, hand_landmarks.landmark[5].y - wrist.y, hand_landmarks.landmark[5].z - wrist.z])
        v_pnk = np.array([hand_landmarks.landmark[17].x - wrist.x, hand_landmarks.landmark[17].y - wrist.y, hand_landmarks.landmark[17].z - wrist.z])
        palm_normal = np.cross(v_idx, v_pnk)
        
        hand_openness = np.mean(finger_extensions)
        spread = np.std([hand_landmarks.landmark[t].x for t in tip_indices])
        
        feature_vector = landmarks + finger_angles + finger_extensions + list(palm_normal) + [hand_openness, spread]
        return np.array(feature_vector)

    def _rule_based_fallback(self, hand_lms):
        """
        Rule-based fallback for gesture detection if model is missing or low confidence.
        """
        landmarks = hand_lms.landmark
        # 0: Wrist, 4: Thumb Tip, 8: Index Tip, 12: Middle Tip, 16: Ring Tip, 20: Pinky Tip
        # 2: Thumb MCP, 6: Index PIP, 10: Middle PIP, 14: Ring PIP, 18: Pinky PIP
        tips = [4, 8, 12, 16, 20]
        pips = [2, 6, 10, 14, 18]
        
        extended = []
        # Thumb: compare x relative to index mcp (simplified)
        thumb_tip = landmarks[4]
        thumb_mcp = landmarks[2]
        index_mcp = landmarks[5]
        
        # Check if thumb is extended away from palm
        if index_mcp.x > landmarks[17].x: # Right hand (palm facing camera)
            extended.append(thumb_tip.x < thumb_mcp.x)
        else: # Left hand
            extended.append(thumb_tip.x > thumb_mcp.x)
            
        for i in range(1, 5):
            # Finger is extended if tip is above pip (lower y value)
            extended.append(landmarks[tips[i]].y < landmarks[pips[i]].y)
            
        # GOJO_OPEN: All fingers extended
        if all(extended):
            return "GOJO_OPEN", 0.6
            
        # SUKUNA_FIST: All fingers closed
        if not any(extended):
            return "SUKUNA_FIST", 0.6
            
        # GOJO_CROSS: Index and Middle extended, others closed
        if extended[1] and extended[2] and not extended[3] and not extended[4]:
            return "GOJO_CROSS", 0.6
            
        # SUKUNA_CLAW: Fingers partially closed (simplified)
        if not extended[0] and all(extended[1:]):
            return "SUKUNA_CLAW", 0.5
            
        return "NEUTRAL", 0.3

    def recognize(self, frame):
        results = self.hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
        if not results.multi_hand_landmarks:
            return "NEUTRAL", 0.0, []

        best_label = "NEUTRAL"
        max_conf = 0.0
        
        for hand_lms in results.multi_hand_landmarks:
            features = self.extract_features(hand_lms).reshape(1, -1)
            
            label = "NEUTRAL"
            conf = 0.0
            
            if self.model:
                probs = self.model.predict_proba(features)[0]
                idx = np.argmax(probs)
                conf = probs[idx]
                label = self.model.classes_[idx]
                
            if not self.model or conf < 0.6:
                # Fallback rule-based
                label, conf = self._rule_based_fallback(hand_lms)
            
            if conf > max_conf:
                max_conf = conf
                best_label = label

        # Buffer logic
        self.gesture_buffer.append(best_label)
        if len(self.gesture_buffer) > self.buffer_size:
            self.gesture_buffer.pop(0)
            
        if len(self.gesture_buffer) == self.buffer_size and all(x == self.gesture_buffer[0] for x in self.gesture_buffer):
            confirmed_label = self.gesture_buffer[0]
        else:
            confirmed_label = "NEUTRAL"
            
        return confirmed_label, max_conf, results.multi_hand_landmarks
