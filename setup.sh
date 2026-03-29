#!/bin/bash

# Setup script for JJK VISION ENGINE dependencies

OS="$(uname)"
if [ "$OS" == "Linux" ]; then
    echo "Detected Linux. Installing system dependencies..."
    sudo apt-get update
    sudo apt-get install -y portaudio19-dev python3-pyaudio libasound2-dev
elif [ "$OS" == "Darwin" ]; then
    echo "Detected macOS. Installing system dependencies..."
    brew install portaudio
else
    echo "Unsupported OS for automatic system dependency installation."
fi

pip install -r requirements.txt

echo "Setup complete."
