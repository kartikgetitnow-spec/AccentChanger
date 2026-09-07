module.exports = {
  apps: [
    {
      name: "voice-clone-live",
      script: "node_modules/.bin/tsx",
      args: "server.ts",
      instances: 1, // 1 instance per socket state; scale horizontally with Redis adapter if multiple instances
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "1G",
      error_file: "logs/err.log",
      out_file: "logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
