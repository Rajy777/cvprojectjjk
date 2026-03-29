import cv2
import numpy as np
import random
import time

class EffectsEngine:
    def __init__(self, frame_shape):
        self.h, self.w = frame_shape[:2]
        self.center = (self.w // 2, self.h // 2)
        
        # Pre-compute Gojo assets
        self.stars = [(random.randint(0, self.w), random.randint(0, self.h)) for _ in range(120)]
        self.vignette_mask = self._build_vignette(0.45)
        self.heavy_vignette_mask = self._build_vignette(0.3) # mask^1.6 approx

    def _build_vignette(self, sigma_scale):
        kernel_x = cv2.getGaussianKernel(self.w, self.w * sigma_scale)
        kernel_y = cv2.getGaussianKernel(self.h, self.h * sigma_scale)
        mask = kernel_y @ kernel_x.T
        mask = mask / mask.max()
        return mask

    def apply_infinite_void(self, frame):
        res = frame.copy()
        
        # Pass 1: Desaturation
        gray = cv2.cvtColor(res, cv2.COLOR_BGR2GRAY)
        gray_3ch = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        res = cv2.addWeighted(res, 0.3, gray_3ch, 0.7, 0)
        
        # Pass 2: Blue Tint
        blue_layer = np.zeros_like(res)
        blue_layer[:,:,0] = 200
        blue_layer[:,:,2] = 30
        res = cv2.addWeighted(res, 0.65, blue_layer, 0.35, 0)
        
        # Pass 3: Radial Blur
        for k in [1, 3, 5, 8]:
            scale = 1 + k * 0.003
            M = cv2.getRotationMatrix2D(self.center, 0, scale)
            zoomed = cv2.warpAffine(res, M, (self.w, self.h))
            res = cv2.addWeighted(res, 0.82, zoomed, 0.18, 0)
            
        # Pass 4: Star Field
        for x, y in self.stars:
            if random.random() > 0.15:
                cv2.circle(res, (x, y), 1, (255, 255, 255), -1)
                
        # Pass 5: Vignette
        res = (res * self.vignette_mask[..., np.newaxis]).astype(np.uint8)
        
        # Pass 6: Central Glow
        glow = np.zeros_like(res)
        cv2.circle(glow, self.center, 15, (255, 255, 255), -1)
        glow = cv2.GaussianBlur(glow, (31, 31), 0)
        res = cv2.addWeighted(res, 1.0, glow, 0.5, 0)
        
        return np.clip(res, 0, 255).astype(np.uint8)

    def apply_malevolent_shrine(self, frame):
        res = frame.copy()
        
        # Pass 1: Edge Sharpening
        kernel = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]])
        sharpened = cv2.filter2D(res, -1, kernel)
        res = cv2.addWeighted(res, 0.6, sharpened, 0.4, 0)
        
        # Pass 2: Red Aura
        red_layer = np.zeros_like(res)
        red_layer[:,:,2] = 180
        res = cv2.addWeighted(res, 0.55, red_layer, 0.45, 0)
        
        # Pass 3: Heavy Vignette
        mask = np.power(self.vignette_mask, 1.6)
        res = (res * mask[..., np.newaxis]).astype(np.uint8)
        
        # Pass 5: Chromatic Aberration
        ca_res = res.copy()
        ca_res[:, :self.w-3, 2] = res[:, 3:, 2] # R shift
        ca_res[:, 3:, 0] = res[:, :self.w-3, 0] # B shift
        res = ca_res
        
        return np.clip(res, 0, 255).astype(np.uint8)

    def apply_black_flash(self, frame, t, intensity, origin):
        res = frame.copy()
        
        if t < 0.05:
            # Freeze + White Flash
            flash = np.full(res.shape, 255, dtype=np.uint8)
            res = cv2.addWeighted(res, 0.05, flash, 0.95, 0)
        elif t < 0.15:
            # Distortion (simplified)
            res = cv2.GaussianBlur(res, (15, 15), 0)
        elif t < 0.35:
            # Shockwave
            radius = int((t - 0.15) / 0.2 * 300)
            alpha = 1.0 - (t - 0.15) / 0.2
            color = (int(255 * alpha + 100 * (1-alpha)), 
                     int(255 * alpha + 100 * (1-alpha)), 
                     int(255 * alpha + 180 * (1-alpha)))
            cv2.circle(res, tuple(origin.astype(int)), radius, color, max(1, int(4 * alpha)))
            cv2.circle(res, tuple(origin.astype(int)), int(radius * 0.6), color, max(1, int(2 * alpha)))

        # White vignette flash
        alpha_flash = max(0, 1.0 - t / 0.35)
        flash = np.full(res.shape, 255, dtype=np.uint8)
        res = cv2.addWeighted(res, 1 - alpha_flash * 0.9, flash, alpha_flash * 0.9, 0)
        
        return np.clip(res, 0, 255).astype(np.uint8)

    def apply_motion_trail(self, frame, trail, character):
        overlay = frame.copy()
        color = (255, 100, 0) if character == "gojo" else (0, 0, 200)
        for i, pos in enumerate(trail):
            alpha = (i / len(trail)) * 0.5
            radius = int(3 + i * 0.8)
            cv2.circle(overlay, tuple(pos.astype(int)), radius, color, -1)
        
        cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)
