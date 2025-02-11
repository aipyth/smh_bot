const prisma = require("../prisma");
const responses = require("../responses.json");

async function startCommand(ctx) {
  const telegramId = ctx.from && ctx.from.id.toString();
  if (telegramId) {
    let user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          username: ctx.from.username || "",
          isAdmin: false,
        },
      });
    }
  }
  await ctx.reply(responses.start.welcome);
}

module.exports = { startCommand };
