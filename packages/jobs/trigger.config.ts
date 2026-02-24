import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
  // Your project ref from the Trigger.dev dashboard
  // Set this in your .env file or replace with your actual project ref
  project: process.env.TRIGGER_PROJECT_REF || 'proj_your_project_ref',

  // Runtime configuration - using Bun
  runtime: 'bun',

  // Directories containing your tasks
  dirs: ['./src/trigger'],

  // Retry configuration
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      factor: 2,
      randomize: true,
    },
  },

  // Max duration of a task in seconds (1 hour)
  maxDuration: 3600,
});
