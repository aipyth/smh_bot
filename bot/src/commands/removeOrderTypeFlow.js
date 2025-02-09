const { Markup, Scenes } = require('telegraf');
const prisma = require('../prisma');
const responses = require('../responses.json');

function formatMessage(template, params) {
  return template.replace(/{(\w+)}/g, (_, key) => params[key] || '');
}

const removeOrderTypeWizard = new Scenes.WizardScene(
  'remove-order-type-wizard',
  // Step 1: Check admin rights and list order types inline.
  async (ctx) => {
    const telegramId = ctx.from && ctx.from.id.toString();
    if (!telegramId) {
      await ctx.reply("Unable to determine your Telegram ID.");
      return ctx.scene.leave();
    }
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || !user.isAdmin) {
      await ctx.reply("🚫 You are not authorized to remove order types.");
      return ctx.scene.leave();
    }
    const orderTypes = await prisma.orderType.findMany();
    if (orderTypes.length === 0) {
      await ctx.reply(responses.removeOrderType.noOrderTypes);
      return ctx.scene.leave();
    }
    const buttons = orderTypes.map((ot) =>
      Markup.button.callback(`${ot.id}: ${ot.name}`, `remove_select_${ot.id}`)
    );
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    await ctx.reply(responses.removeOrderType.selectPrompt, Markup.inlineKeyboard(keyboard));
    return ctx.wizard.next();
  },
  // Step 2: Handle inline selection and show details with confirmation.
  async (ctx) => {
    if (ctx.update.callback_query && ctx.update.callback_query.data.startsWith("remove_select_")) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      const orderTypeId = parseInt(ctx.update.callback_query.data.replace("remove_select_", ""));
      ctx.scene.state.orderTypeId = orderTypeId;
      const orderType = await prisma.orderType.findUnique({ where: { id: orderTypeId } });
      if (!orderType) {
        await ctx.reply(`Order type with ID ${orderTypeId} not found.`);
        return ctx.scene.leave();
      }
      ctx.scene.state.orderType = orderType;
      const details = formatMessage(responses.removeOrderType.details, {
        id: orderType.id,
        name: orderType.name,
        basePrice: orderType.basePrice.toFixed(2)
      });
      await ctx.reply(details, Markup.inlineKeyboard([
        [
          Markup.button.callback(responses.removeOrderType.confirmRemove, 'remove_confirm'),
          Markup.button.callback(responses.removeOrderType.cancel, 'remove_cancel')
        ]
      ]));
      return ctx.wizard.next();
    } else {
      await ctx.reply("Please select an order type using the inline buttons.");
      return;
    }
  },
  // Step 3: Handle confirmation inline selection.
  async (ctx) => {
    if (ctx.update.callback_query) {
      const action = ctx.update.callback_query.data;
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      if (action === 'remove_confirm') {
        try {
          await prisma.orderType.delete({ where: { id: ctx.scene.state.orderTypeId } });
          await ctx.reply(responses.removeOrderType.removeSuccess);
        } catch (error) {
          console.error(error);
          await ctx.reply(responses.removeOrderType.removeError);
        }
        return ctx.scene.leave();
      } else if (action === 'remove_cancel') {
        await ctx.reply("Removal cancelled.");
        return ctx.scene.leave();
      }
    }
    return;
  }
);

module.exports = { removeOrderTypeWizard };
