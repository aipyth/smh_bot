const { Markup, Scenes } = require('telegraf');
const prisma = require('../prisma');
const responses = require('../responses.json');

function formatMessage(template, params) {
  return template.replace(/{(\w+)}/g, (_, key) => params[key] || '');
}

const modifyOrderTypeWizard = new Scenes.WizardScene(
  'modify-order-type-wizard',
  // Step 1: Check admin rights and list order types inline.
  async (ctx) => {
    const telegramId = ctx.from && ctx.from.id.toString();
    if (!telegramId) {
      await ctx.reply(responses.modifyOrderType.invalidSelection);
      return ctx.scene.leave();
    }
    const user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user || !user.isAdmin) {
      await ctx.reply("🚫 You are not authorized to modify order types.");
      return ctx.scene.leave();
    }
    const orderTypes = await prisma.orderType.findMany();
    if (orderTypes.length === 0) {
      await ctx.reply(responses.modifyOrderType.noOrderTypes);
      return ctx.scene.leave();
    }
    const buttons = orderTypes.map((ot) =>
      Markup.button.callback(`${ot.id}: ${ot.name}`, `modify_select_${ot.id}`)
    );
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    await ctx.reply(responses.modifyOrderType.selectPrompt, Markup.inlineKeyboard(keyboard));
    return ctx.wizard.next();
  },
  // Step 2: Handle inline selection and show details with edit options.
  async (ctx) => {
    if (ctx.update.callback_query && ctx.update.callback_query.data.startsWith("modify_select_")) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      const orderTypeId = parseInt(ctx.update.callback_query.data.replace("modify_select_", ""));
      ctx.scene.state.orderTypeId = orderTypeId;
      const orderType = await prisma.orderType.findUnique({ where: { id: orderTypeId } });
      if (!orderType) {
        await ctx.reply(`Order type with ID ${orderTypeId} not found.`);
        return ctx.scene.leave();
      }
      ctx.scene.state.orderType = orderType;
      const details = formatMessage(responses.modifyOrderType.details, {
        id: orderType.id,
        name: orderType.name,
        basePrice: orderType.basePrice.toFixed(2)
      });
      await ctx.reply(details, Markup.inlineKeyboard([
        [
          Markup.button.callback(responses.modifyOrderType.editName, 'modify_edit_name'),
          Markup.button.callback(responses.modifyOrderType.editPrice, 'modify_edit_price')
        ],
        [Markup.button.callback(responses.modifyOrderType.cancel, 'modify_cancel')]
      ]));
      return ctx.wizard.next();
    } else {
      await ctx.reply(responses.modifyOrderType.invalidSelection);
      return;
    }
  },
  // Step 3: Handle option selection (edit name, edit price, or cancel).
  async (ctx) => {
    if (ctx.update.callback_query) {
      const action = ctx.update.callback_query.data;
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      if (action === 'modify_edit_name') {
        ctx.scene.state.editField = 'name';
        await ctx.reply(responses.modifyOrderType.promptNewName);
        return ctx.wizard.next();
      } else if (action === 'modify_edit_price') {
        ctx.scene.state.editField = 'basePrice';
        await ctx.reply(responses.modifyOrderType.promptNewPrice);
        return ctx.wizard.next();
      } else if (action === 'modify_cancel') {
        await ctx.reply("Modification cancelled.");
        return ctx.scene.leave();
      }
    }
    return;
  },
  // Step 4: Receive new value and update the order type.
  async (ctx) => {
    const editField = ctx.scene.state.editField;
    if (!editField) {
      await ctx.reply("No field selected.");
      return ctx.scene.leave();
    }
    const input = ctx.message && ctx.message.text;
    if (!input) {
      await ctx.reply("Invalid input. Operation cancelled.");
      return ctx.scene.leave();
    }
    let newValue;
    if (editField === 'basePrice') {
      newValue = parseFloat(input);
      if (isNaN(newValue)) {
        await ctx.reply(responses.modifyOrderType.invalidNumber);
        return ctx.scene.leave();
      }
    } else {
      newValue = input;
    }
    try {
      const updateData = {};
      updateData[editField] = newValue;
      await prisma.orderType.update({
        where: { id: ctx.scene.state.orderTypeId },
        data: updateData
      });
      await ctx.reply(responses.modifyOrderType.updateSuccess);
    } catch (error) {
      console.error(error);
      await ctx.reply(responses.modifyOrderType.updateError);
    }
    return ctx.scene.leave();
  }
);

module.exports = { modifyOrderTypeWizard };
