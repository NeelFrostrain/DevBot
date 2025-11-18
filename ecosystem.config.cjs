module.exports = {
  apps: [{
    name: 'dev-bot',
    script: './src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }, {
    name: 'dashboard',
    script: './src/dashboard/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/dashboard-error.log',
    out_file: './logs/dashboard-out.log',
    log_file: './logs/dashboard-combined.log',
    time: true
  }]
};
