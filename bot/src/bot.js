const { Telegraf, session, Scenes } = require("telegraf");
const responses = require("./responses.json");
const prisma = require("./prisma");
const { loggingMiddleware, errorLogger } = require("./logger");

const { addOrderTypeWizard } = require("./commands/addOrderTypeFlow");
const { modifyOrderTypeWizard } = require("./commands/modifyOrderTypeFlow");
const { removeOrderTypeWizard } = require("./commands/removeOrderTypeFlow");
const { menuCommand } = require("./commands/menu");
const { startCommand } = require("./commands/start");
const { newOrderCommand } = require("./commands/newOrder");
const { listOrderTypesCommand } = require("./commands/listOrderTypes");
const { newOrderFlow } = require("./commands/newOrderFlow");

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined in environment variables");
}

const bot = new Telegraf(BOT_TOKEN);

bot.use(session());
// Global logging middleware
bot.use(loggingMiddleware);

const stage = new Scenes.Stage([
  addOrderTypeWizard,
  modifyOrderTypeWizard,
  removeOrderTypeWizard,
  newOrderFlow,
]);
bot.use(stage.middleware());

// Global error handler
bot.catch(errorLogger);

// Public commands.
bot.start(startCommand);
bot.command("menu", menuCommand);
bot.command("new_order", newOrderCommand);
bot.command("list_order_types", listOrderTypesCommand);

// Admin-only commands.
bot.command("add_order_type", async (ctx) => {
  const telegramId = ctx.from && ctx.from.id.toString();
  if (!telegramId) {
    await ctx.reply("Unable to determine your Telegram ID.");
    return;
  }
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || !user.isAdmin) {
    await ctx.reply("🚫 You are not authorized to add order types.");
    return;
  }
  ctx.scene.enter("add-order-type-wizard");
});
bot.command("modify_order_type", async (ctx) => {
  const telegramId = ctx.from && ctx.from.id.toString();
  if (!telegramId) {
    await ctx.reply("Unable to determine your Telegram ID.");
    return;
  }
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || !user.isAdmin) {
    await ctx.reply("🚫 You are not authorized to modify order types.");
    return;
  }
  ctx.scene.enter("modify-order-type-wizard");
});
bot.command("remove_order_type", async (ctx) => {
  const telegramId = ctx.from && ctx.from.id.toString();
  if (!telegramId) {
    await ctx.reply("Unable to determine your Telegram ID.");
    return;
  }
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user || !user.isAdmin) {
    await ctx.reply("🚫 You are not authorized to remove order types.");
    return;
  }
  ctx.scene.enter("remove-order-type-wizard");
});

// Inline button actions from the menu.
bot.action("new_order", async (ctx) => {
  await ctx.answerCbQuery();
  // await ctx.reply('Please use /new_order command to create a new order.');
  ctx.scene.enter("new-order-flow");
});
bot.action("add_order_type", async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from && ctx.from.id.toString();
  const user = telegramId
    ? await prisma.user.findUnique({ where: { telegramId } })
    : null;
  if (!user || !user.isAdmin) {
    await ctx.reply("🚫 You are not authorized to add order types.");
    return;
  }
  ctx.scene.enter("add-order-type-wizard");
});
bot.action("modify_order_type", async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from && ctx.from.id.toString();
  const user = telegramId
    ? await prisma.user.findUnique({ where: { telegramId } })
    : null;
  if (!user || !user.isAdmin) {
    await ctx.reply("🚫 You are not authorized to modify order types.");
    return;
  }
  ctx.scene.enter("modify-order-type-wizard");
});
bot.action("remove_order_type", async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from && ctx.from.id.toString();
  const user = telegramId
    ? await prisma.user.findUnique({ where: { telegramId } })
    : null;
  if (!user || !user.isAdmin) {
    await ctx.reply("🚫 You are not authorized to remove order types.");
    return;
  }
  ctx.scene.enter("remove-order-type-wizard");
});

bot.launch(async () => {
  const { botInfo } = bot;
  console.log(`Running bot ${botInfo?.first_name} @${botInfo?.username}...`);
});
