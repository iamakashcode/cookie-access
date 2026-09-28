module.exports = {
  apps: [
    {
      name: "cookie-access",
      script: "npm",
      args: "start",
      cwd: "/root/cookie-access",
      env: {
        NODE_ENV: "production",
        PORT: 7019
      }
    }
  ]
};
