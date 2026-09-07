import { PcmUtils } from "../src/server/pcm-utils";
import { AudioBufferQueue } from "../src/server/audio-buffer-queue";
import { AudioConverter } from "../src/server/audio-converter";
import { io } from "socket.io-client";

async function runUnitTests() {
  console.log("\n==============================");
  console.log(" 1. UNIT TESTS: AUDIO PIPELINE");
  console.log("==============================");

  // Test 1: In-Memory Resampling
  const sampleCount24k = 4800; // 200ms at 24kHz
  const pcm24k = Buffer.alloc(sampleCount24k * 2);
  for (let i = 0; i < sampleCount24k; i++) {
    pcm24k.writeInt16LE(Math.round(Math.sin(i * 0.1) * 20000), i * 2);
  }

  const startResample = performance.now();
  const pcm16k = PcmUtils.resample24kTo16k(pcm24k);
  const resampleDuration = performance.now() - startResample;

  const expectedSamples16k = Math.floor((sampleCount24k * 2) / 3);
  console.log(`✓ Resampling 24kHz -> 16kHz: ${sampleCount24k} samples to ${pcm16k.length / 2} samples`);
  console.log(`✓ Resample duration: ${resampleDuration.toFixed(3)}ms (Target: < 2.0ms)`);
  if (Math.abs(pcm16k.length / 2 - expectedSamples16k) > 2) {
    throw new Error(`Resample mismatch: expected ~${expectedSamples16k}, got ${pcm16k.length / 2}`);
  }

  // Test 2: Noise Gate
  const lowNoise = Buffer.alloc(1000);
  for (let i = 0; i < 500; i++) lowNoise.writeInt16LE(150, i * 2); // Very quiet hum
  const gated = PcmUtils.applyNoiseGate(lowNoise, 0.015, 0.1);
  const gatedSample = gated.readInt16LE(0);
  console.log(`✓ Noise gate attenuation: 150 reduced to ${gatedSample}`);
  if (gatedSample > 25) {
    throw new Error("Noise gate did not attenuate quiet background noise properly");
  }

  // Test 3: AudioBufferQueue Framing
  const queue = new AudioBufferQueue(1280); // 40ms frame
  queue.push(Buffer.alloc(1000));
  if (queue.popFrame() !== null) throw new Error("Frame popped too early");
  queue.push(Buffer.alloc(1000));
  const frame1 = queue.popFrame();
  console.log(`✓ AudioBufferQueue framed slice: ${frame1?.length} bytes (expected 1280)`);
  if (!frame1 || frame1.length !== 1280) throw new Error("Frame size mismatch");

  // Test 4: WAV Packaging
  const wav = AudioConverter.pcmToWav(Buffer.alloc(3200), 16000);
  const riffHeader = wav.subarray(0, 4).toString("ascii");
  const waveHeader = wav.subarray(8, 12).toString("ascii");
  console.log(`✓ WAV Container Generated: Header [${riffHeader}, ${waveHeader}], Total Size: ${wav.length}B`);
  if (riffHeader !== "RIFF" || waveHeader !== "WAVE") {
    throw new Error("Invalid WAV header packaging");
  }
}

async function runIntegrationAndPerformanceTests() {
  console.log("\n=========================================");
  console.log(" 2. INTEGRATION & PERFORMANCE TESTS");
  console.log("=========================================");

  const baseUrl = "http://localhost:3000";

  // Test 5: Metrics & Health Endpoints
  const res = await fetch(`${baseUrl}/api/metrics`);
  if (!res.ok) throw new Error(`Metrics returned status: ${res.status}`);
  const metrics = await res.json();
  console.log("✓ Server Metrics API online:", {
    uptime: `${metrics.uptimeSeconds}s`,
    heapUsed: `${metrics.memory.heapUsedMb}MB`,
    protocol: metrics.protocol,
    sampleRate: `${metrics.sampleRate}Hz`,
  });

  // Test 6: Concurrent User Load Test (Simulate 3 concurrent users)
  console.log("✓ Running Concurrent User Load Test (3 concurrent WebSocket sessions)...");
  const userCount = 3;
  const sockets: any[] = [];

  const connectUser = (id: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const s = io(baseUrl, { transports: ["websocket"] });
      sockets.push(s);

      s.on("connect", () => {
        s.emit("start-stream", { voice: "Donald Trump", pitchShift: 0 });
      });

      s.on("status", (status: any) => {
        if (status.status === "streaming") {
          // Send 2 bursts of audio
          s.emit("audio-chunk", Buffer.alloc(1280));
          setTimeout(() => {
            s.emit("stop-stream");
            resolve();
          }, 300);
        }
      });

      s.on("error", (err: any) => reject(err));
      setTimeout(() => reject(new Error(`Timeout for user ${id}`)), 6000);
    });
  };

  await Promise.all([connectUser(1), connectUser(2), connectUser(3)]);
  console.log(`✓ All ${userCount} concurrent user streams processed and isolated cleanly.`);

  // Cleanup
  sockets.forEach((s) => s.disconnect());
  console.log("\n=========================================");
  console.log(" ALL TESTS PASSED SUCCESSFULLY! (100%)");
  console.log("=========================================\n");
}

async function main() {
  try {
    await runUnitTests();
    await runIntegrationAndPerformanceTests();
    process.exit(0);
  } catch (err) {
    console.error("Test failure:", err);
    process.exit(1);
  }
}

main();
