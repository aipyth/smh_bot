const { Markup, Scenes } = require("telegraf");
const prisma = require("../prisma");
const responses = require("../responses.json");

function formatMessage(template, params) {
  return template.replace(/{(\w+)}/g, (_, key) => params[key] || "");
}

const addOrderTypeWizard = new Scenes.WizardScene(
  "add-order-type-wizard",
  async (ctx) => {
    await ctx.reply(responses.addOrderType.promptName);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const name = ctx.message && ctx.message.text;
    if (!name) {
      await ctx.reply(responses.addOrderType.invalidName);
      return;
    }
    ctx.scene.state.name = name;
    await ctx.reply(responses.addOrderType.promptBasePrice);
    return ctx.wizard.next();
  },
  async (ctx) => {
    const text = ctx.message && ctx.message.text;
    const basePrice = parseFloat(text || "");
    if (isNaN(basePrice)) {
      await ctx.reply(responses.addOrderType.invalidPrice);
      return;
    }
    ctx.scene.state.basePrice = basePrice;
    const confirmationText = formatMessage(
      responses.addOrderType.confirmation,
      {
        name: ctx.scene.state.name,
        basePrice: basePrice.toFixed(2),
      },
    );
    await ctx.reply(confirmationText, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        Markup.button.callback(
          responses.addOrderType.confirmButton,
          "confirm_add",
        ),
        Markup.button.callback(
          responses.addOrderType.cancelButton,
          "cancel_add",
        ),
      ]),
    });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.update.callback_query) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      const action = ctx.update.callback_query.data;
      if (action === "confirm_add") {
        const telegramId = ctx.from && ctx.from.id.toString();
        if (!telegramId) {
          await ctx.reply(responses.addOrderType.unableToDetermineTelegramId);
          return ctx.scene.leave();
        }
        const user = await prisma.user.findUnique({ where: { telegramId } });
        if (!user || !user.isAdmin) {
          await ctx.reply(responses.addOrderType.unauthorized);
          return ctx.scene.leave();
        }
        const { name, basePrice } = ctx.scene.state;
        try {
          const orderType = await prisma.orderType.create({
            data: {
              name,
              basePrice,
              createdBy: { connect: { id: user.id } },
            },
          });
          await ctx.reply(
            formatMessage(responses.addOrderType.creationSuccess, {
              name: orderType.name,
              id: orderType.id,
            }),
            { parse_mode: "Markdown" },
          );
        } catch (error) {
          console.error(error);
          await ctx.reply(responses.addOrderType.creationError);
        }
        return ctx.scene.leave();
      }
      if (action === "cancel_add") {
        await ctx.reply(responses.addOrderType.cancelled);
        return ctx.scene.leave();
      }
    }
  },
);

module.exports = { addOrderTypeWizard };
