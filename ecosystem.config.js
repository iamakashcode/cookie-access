// PM2 process config for the single Next.js app (dashboard + public site + API).
// Usage on the server:
//   npm ci && npm run build
//   pm2 start ecosystem.config.js && pm2 save
module.exports = {
  apps: [
    {
      name: "dpdp",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "600M",
    },
  ],
};
