import time
import numpy as np
import cv2
from math import sin, cos, pi

class CinematicSequencer:
    def __init__(self, frame_shape):
        self.h, self.w = frame_shape[:2]
        self.cx, self.cy = self.w // 2, self.h // 2
        self._init_gojo_assets()
        self._init_sukuna_assets()

    def _init_gojo_assets(self):
        self.shards = []
        for _ in range(55):
            self.shards.append({
                "angle": random_angle(),
                "dist": np.random.uniform(60, 240),
                "length": np.random.uniform(18, 100),
                "width": np.random.uniform(1.5, 5),
                "rotation": random_angle(),
                "alpha": np.random.uniform(0.5, 1.0),
                "phase": random_angle()
            })
        self.chunks = []
        for _ in range(14):
            self.chunks.append({
                "angle": random_angle(),
                "dist": np.random.uniform(100, 260),
                "size": np.random.uniform(15, 70),
                "rotation": random_angle(),
                "angular_velocity": np.random.uniform(-0.008, 0.008),
                "phase": random_angle(),
                "points": self._gen_chunk_points()
            })

    def _gen_chunk_points(self):
        pts = []
        for i in range(6):
            a = i * (2*pi/6)
            r = np.random.uniform(0.5, 1.0)
            pts.append([cos(a)*r, sin(a)*r])
        return np.array(pts)

    def _init_sukuna_assets(self):
        self.clouds = []
        for _ in range(20):
            self.clouds.append({
                "cx_offset": np.random.uniform(-self.w, self.w),
                "cy_offset": np.random.uniform(-self.h*0.5, self.h*0.2),
                "rx": np.random.uniform(100, 300),
                "ry": np.random.uniform(40, 100),
                "vy": np.random.uniform(0.5, 2.0),
                "alpha_base": np.random.uniform(0.4, 0.6)
            })

    def update(self, frame, state, effects_engine):
        t = state["domain_t"]
        char = state["character"]
        
        res = frame.copy()
        
        # Cinematic Timeline
        if t < 0.30:
            # Dark Fade
            alpha = min(0.85, t / 0.30 * 0.85)
            black = np.zeros_like(res)
            res = cv2.addWeighted(res, 1 - alpha, black, alpha, 0)
        
        if 0.30 <= t < 0.50:
            # Character Flash
            flash_alpha = max(0, 1.0 - (t - 0.30) / 0.20)
            white = np.full(res.shape, 255, dtype=np.uint8)
            res = cv2.addWeighted(res, 1 - flash_alpha, white, flash_alpha, 0)
            
            # Huge Text
            name = "GOJO SATORU" if char == "gojo" else "RYOMEN SUKUNA"
            cv2.putText(res, name, (self.cx - 300, self.cy), cv2.FONT_HERSHEY_TRIPLEX, 2.5, (255, 255, 255), 5)

        if t >= 0.50:
            # Domain Backgrounds
            if char == "gojo":
                res = self._render_infinite_void(res, t)
            else:
                res = self._render_malevolent_shrine(res, t)
                
            # Letter by letter text
            full_text = "DOMAIN EXPANSION"
            chars_to_show = int((t - 0.50) * 20)
            display_text = full_text[:chars_to_show]
            
            cv2.putText(res, display_text, (self.cx - 400, self.cy - 100), cv2.FONT_HERSHEY_TRIPLEX, 2.8, (0, 0, 0), 7) # shadow
            cv2.putText(res, display_text, (self.cx - 400, self.cy - 100), cv2.FONT_HERSHEY_TRIPLEX, 2.8, (255, 255, 255), 5)

        return res

    def _render_infinite_void(self, frame, t):
        """
        Renders the Infinite Void background.
        Layer 1: Deep black void center.
        Layer 2: Expanding cyan rings.
        Layer 3: Floating glass shards.
        Layer 4: Distant star field.
        """
        res = frame.copy()
        
        # 1. Distant Star Field (Static-ish)
        for _ in range(100):
            x = np.random.randint(0, self.w)
            y = np.random.randint(0, self.h)
            size = np.random.randint(1, 3)
            cv2.circle(res, (x, y), size, (255, 255, 255), -1)
            
        # 2. Expanding Cyan Rings
        ring_p = (t * 2) % 1.0
        radius = int(200 * ring_p)
        alpha = 1.0 - ring_p
        cv2.circle(res, (self.cx, self.cy), radius, (255, 255, 0), int(5 * alpha) + 1, cv2.LINE_AA)
        
        # 3. Floating Glass Shards
        for shard in self.shards:
            shard["angle"] += 0.01
            shard["dist"] += 0.5
            if shard["dist"] > self.w: shard["dist"] = 50
            
            sx = int(self.cx + cos(shard["angle"]) * shard["dist"])
            sy = int(self.cy + sin(shard["angle"]) * shard["dist"])
            
            # Draw shard as a small polygon
            pts = np.array([
                [sx - 10, sy], [sx, sy - 20], [sx + 10, sy], [sx, sy + 10]
            ], np.int32)
            cv2.polylines(res, [pts], True, (255, 255, 255), 1, cv2.LINE_AA)
            
        # 4. Deep Black Void Center
        cv2.circle(res, (self.cx, self.cy), 100, (0, 0, 0), -1)
        cv2.circle(res, (self.cx, self.cy), 105, (255, 255, 0), 2, cv2.LINE_AA)
        
        return res

    def _render_malevolent_shrine(self, frame, t):
        """
        Renders the Malevolent Shrine background.
        Layer 1: Blood-red sky with dark clouds.
        Layer 2: Ground of skulls (simplified as dark texture).
        Layer 3: The Shrine silhouette.
        Layer 4: Floating embers.
        """
        res = frame.copy()
        
        # 1. Blood-Red Sky
        res[:, :] = [5, 0, 26] # Dark red
        
        # 2. Dark Clouds
        for cloud in self.clouds:
            cloud["cy_offset"] += cloud["vy"]
            if cloud["cy_offset"] > self.h: cloud["cy_offset"] = -100
            
            cx = int(self.cx + cloud["cx_offset"])
            cy = int(self.h * 0.3 + cloud["cy_offset"])
            cv2.ellipse(res, (cx, cy), (int(cloud["rx"]), int(cloud["ry"])), 0, 0, 360, (0, 0, 0), -1)
            
        # 3. Ground (Darker)
        cv2.rectangle(res, (0, int(self.h * 0.7)), (self.w, self.h), (2, 0, 13), -1)
        
        # 4. Shrine Silhouette (Simplified)
        shrine_pts = np.array([
            [self.cx - 150, self.h * 0.7], [self.cx - 100, self.h * 0.4],
            [self.cx + 100, self.h * 0.4], [self.cx + 150, self.h * 0.7]
        ], np.int32)
        cv2.fillPoly(res, [shrine_pts], (0, 0, 0))
        
        # 5. Floating Embers
        for _ in range(30):
            ex = np.random.randint(0, self.w)
            ey = np.random.randint(0, self.h)
            cv2.circle(res, (ex, ey), 2, (0, 165, 255), -1)
            
        return res

def random_angle():
    return np.random.uniform(0, 2*pi)
