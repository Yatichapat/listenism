"""
Basic collaborative filtering recommender training script for Listenism ML service.
"""
import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
import pickle
import os

# Dummy data path (replace with real data source in production)
DATA_PATH = os.getenv("DATA_PATH", "user_song_interactions.csv")
MODEL_PATH = os.getenv("MODEL_PATH", "models/cf_model.pkl")


def load_data():
    # For demo: generate random user-song interaction matrix
    # In production: load from database or file
    n_users, n_songs = 10, 20
    np.random.seed(42)
    data = np.random.randint(0, 2, size=(n_users, n_songs))
    df = pd.DataFrame(data, columns=[f"song_{i+1}" for i in range(n_songs)])
    df["user_id"] = range(1, n_users + 1)
    return df.set_index("user_id")


def train_model():
    df = load_data()
    model = NearestNeighbors(metric="cosine", algorithm="brute")
    model.fit(df.values)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({"model": model, "matrix": df}, f)
    print(f"Model trained and saved to {MODEL_PATH}")


if __name__ == "__main__":
    train_model()
