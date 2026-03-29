import cv2
import numpy as np
from modules.gesture import GestureRecognizer

def main():
    cap = cv2.VideoCapture(0)
    recognizer = GestureRecognizer()
    
    X = []
    y = []
    
    current_label = "NEUTRAL"
    
    print("Controls: G: GOJO_OPEN, F: SUKUNA_FIST, C: SUKUNA_CLAW, X: GOJO_CROSS, N: NEUTRAL, S: SAVE, Q: QUIT")

    while True:
        ret, frame = cap.read()
        if not ret: break
        frame = cv2.flip(frame, 1)
        
        label, conf, landmarks = recognizer.recognize(frame)
        
        if landmarks:
            for hand_lms in landmarks:
                features = recognizer.extract_features(hand_lms)
                
                key = cv2.waitKey(1) & 0xFF
                if key == ord('g'):
                    X.append(features); y.append("GOJO_OPEN"); print("Collected GOJO_OPEN")
                elif key == ord('f'):
                    X.append(features); y.append("SUKUNA_FIST"); print("Collected SUKUNA_FIST")
                elif key == ord('c'):
                    X.append(features); y.append("SUKUNA_CLAW"); print("Collected SUKUNA_CLAW")
                elif key == ord('x'):
                    X.append(features); y.append("GOJO_CROSS"); print("Collected GOJO_CROSS")
                elif key == ord('n'):
                    X.append(features); y.append("NEUTRAL"); print("Collected NEUTRAL")
                elif key == ord('s'):
                    np.savez("gesture_data.npz", X=np.array(X), y=np.array(y))
                    print(f"Saved {len(X)} samples.")
                elif key == ord('q'):
                    return

        cv2.putText(frame, f"Samples: {len(X)} | Current: {current_label}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.imshow("Data Collection", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
