# AccentChanger

> Real-time conversational AI voice & accent converter powered by **Gemini Multimodal Live API**, **RVC (Retrieval-based Voice Conversion)**, **Next.js**, and **WebSockets**.

---

## 🌟 Key Features

- **Bidirectional Accent Conversion**:
  - 🇺🇸 ➔ 🇬🇧 **American to UK**: Converts conversational American English into authentic British English (Received Pronunciation / BBC English) with tailored vocabulary, idioms, and non-rhotic prosody.
  - 🇬🇧 ➔ 🇺🇸 **UK to USA**: Converts conversational British English into natural General American English with crisp rhotic pronunciation.
- **Direct Regional Accents & Personas**:
  - 🇬🇧 **British (UK)** (Refined, articulate RP English)
  - 🇺🇸 **General American (USA)** (Energetic, natural American)
  - 🇦🇺 **Australian (Aussie)** (Friendly, colloquial Aussie slang)
  - 🎙️ **Donald Trump** (Cloned voice signature via RVC)
  - 🎙️ **Joe Rogan** (Podcast voice persona via RVC)
- **Ultra-Low Latency Streaming**:
  - Direct linear PCM streaming (16kHz, 16-bit mono) via `ScriptProcessorNode` and Web Audio API.
  - Sub-millisecond in-memory audio resampling and noise gating.
- **Mobile Hardware Adaptive**:
  - Automatic resampling of mobile microphone sample rates (44.1kHz / 48kHz on iOS/Android) to clean 16kHz PCM.
  - AudioContext auto-unlock on user gesture for seamless mobile speaker playback.
  - Built-in HTTPS / WSS support for mobile microphone access.
- **Dual Real-time Visualizers & Controls**:
  - Live frequency spectrums for both microphone input and AI voice output.
  - Push-to-Talk and Click-to-Talk toggle modes.
  - Live latency tracking and transcript history.

---

## 🏗️ Architecture

```
Browser (Next.js + Web Audio API)
       │  ▲
       │  │ Bidirectional WebSocket / WSS (16kHz PCM Audio & Transcripts)
       ▼  │
Custom Node.js Server (Express + Socket.IO + Session Manager)
       │  ▲
       │  │ Low-latency in-memory Audio Buffer Queue & Framing
       ▼  │
Gemini Multimodal Live API (Bidirectional WebSocket)
       │
       ▼ (24kHz PCM Audio Stream)
RVC Engine / DSP Voice Transformation (Pitch Shift & Formant Resonators)
       │
       ▼ (WAV Packaged Audio Stream)
Frontend AudioPlayer (Seamless lookahead scheduled playback)
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ or 20+
- A Google Gemini API key with access to Gemini Live

### 2. Installation
```bash
git clone https://github.com/kartikgetitnow-spec/AccentChanger.git
cd AccentChanger
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Gemini credentials:
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=models/gemini-3.1-flash-live-preview
PORT=3000
```

### 4. Run Development or Production Server
```bash
# Build production bundle
npm run build

# Start server
npm start
```
Open **`https://localhost:3000`** in your browser.

---

## 📱 Mobile Access (LAN)

To open the app from a smartphone on your local Wi-Fi:
1. Ensure the server is running.
2. Find your local IP (e.g. `10.75.98.210`).
3. Open `https://<YOUR_IP>:3000` on Safari or Chrome on your mobile device.
4. Accept the local SSL certificate and tap **TALK**!

---

## 📜 License
MIT License.
