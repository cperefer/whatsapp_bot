// pm2 process definition for production. Runs the bot straight through tsx
// (no build step), matching how it's run in development.
//
// CommonJS on purpose: the workspace is "type": "module", but pm2 loads
// config files with require(), so this file must stay .cjs.
module.exports = {
  apps: [
    {
      name: "whatsapp-bot",
      cwd: __dirname,
      script: "npm",
      args: "run start:prod",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: "30s",
      time: true,
    },
  ],
};
