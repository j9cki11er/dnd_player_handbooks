module.exports = {
  apps: [
    {
      name: 'dnd-player-handbook',
      script: './scripts/deploy.sh',
      cwd: __dirname,
      interpreter: 'bash',
      env: {
        DEPLOY_PORT: process.env.DEPLOY_PORT || '4280',
      },
    },
  ],
}
