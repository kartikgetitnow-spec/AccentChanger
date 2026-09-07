import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ws", "express", "socket.io"],
};

export default nextConfig;
