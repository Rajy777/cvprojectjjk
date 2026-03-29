import numpy as np
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

def train():
    data = np.load("gesture_data.npz")
    X, y = data['X'], data['y']
    
    print(f"Loaded {len(X)} samples.")
    unique, counts = np.unique(y, return_counts=True)
    print(dict(zip(unique, counts)))
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', RandomForestClassifier(n_estimators=200, max_depth=12, random_state=42))
    ])
    
    pipeline.fit(X_train, y_train)
    
    y_pred = pipeline.predict(X_test)
    print(classification_report(y_test, y_pred))
    
    with open("gesture_model.pkl", "wb") as f:
        pickle.dump(pipeline, f)
    print("Model saved to gesture_model.pkl")

if __name__ == "__main__":
    train()
