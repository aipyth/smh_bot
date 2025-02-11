const { Markup } = require("telegraf");
const prisma = require("../prisma");
const responses = require("../responses.json");

async function menuCommand(ctx) {
  const telegramId = ctx.from && ctx.from.id.toString();
  let isAdmin = false;
  if (telegramId) {
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (user && user.isAdmin) {
      isAdmin = true;
    }
  }
  const buttons = [
    [Markup.button.callback(responses.menu.newOrder, "new_order")],
  ];
  if (isAdmin) {
    buttons.push([
      Markup.button.callback(responses.menu.addOrderType, "add_order_type"),
    ]);
    buttons.push([
      Markup.button.callback(
        responses.menu.modifyOrderType,
        "modify_order_type",
      ),
    ]);
    buttons.push([
      Markup.button.callback(
        responses.menu.removeOrderType,
        "remove_order_type",
      ),
    ]);
  }
  await ctx.reply(responses.menu.menuText, Markup.inlineKeyboard(buttons));
}

module.exports = { menuCommand };
