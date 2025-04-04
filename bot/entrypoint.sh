#!/bin/sh
# Run prisma client generation
npx prisma generate
# Run Prisma migrations (if any) before starting the bot.
npx prisma migrate deploy

# Start the application
exec node src/bot.js
