const { Markup, Scenes } = require('telegraf');
const prisma = require('../prisma');
const responses = require('../responses.json');

// Helper to format templates with placeholders.
function formatMessage(template, params) {
  return template.replace(/{(\w+)}/g, (_, key) => params[key] || '');
}

const newOrderFlow = new Scenes.WizardScene(
  'new-order-flow',
  // Step 1: List available order types (inline selection).
  async (ctx) => {
    const orderTypes = await prisma.orderType.findMany();
    if (orderTypes.length === 0) {
      await ctx.reply(responses.global.noOrderTypes);
      return ctx.scene.leave();
    }
    const buttons = orderTypes.map((ot) => {
      const buttonText = formatMessage(responses.newOrder.orderTypeButton, {
        name: ot.name,
        basePrice: parseFloat(ot.basePrice).toFixed(2)
      });
      return Markup.button.callback(buttonText, `orderType_${ot.id}`);
    });
    const keyboard = buttons.map((btn) => [btn]);
    await ctx.reply(responses.newOrder.selectOrderType, Markup.inlineKeyboard(keyboard));
    return ctx.wizard.next();
  },
  // Step 2: Process order type selection and then prompt for topic.
  async (ctx) => {
    if (ctx.update.callback_query && ctx.update.callback_query.data.startsWith("orderType_")) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      const orderTypeId = parseInt(ctx.update.callback_query.data.replace("orderType_", ""));
      ctx.scene.state.orderTypeId = orderTypeId;
      const orderType = await prisma.orderType.findUnique({ where: { id: orderTypeId } });
      if (!orderType) {
        await ctx.reply(responses.global.invalidSelection);
        return ctx.scene.leave();
      }
      ctx.scene.state.orderTypeName = orderType.name;
      ctx.scene.state.orderTypeBasePrice = orderType.basePrice;
      // Prompt for topic.
      await ctx.reply(responses.newOrder.promptTopic);
      return ctx.wizard.next();
    } else {
      await ctx.reply(responses.global.invalidSelection);
    }
  },
  // Step 3: Capture topic and prompt for deadline.
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply(responses.newOrder.invalidTopic);
      return ctx.scene.leave();
    }
    ctx.scene.state.topic = ctx.message.text;
    await ctx.reply(responses.newOrder.promptDeadline);
    return ctx.wizard.next();
  },
  // Step 4: Capture deadline and prompt for number of pages.
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply(responses.newOrder.invalidDeadline);
      return ctx.scene.leave();
    }
    ctx.scene.state.deadline = ctx.message.text;
    await ctx.reply(responses.newOrder.promptPages);
    return ctx.wizard.next();
  },
  // Step 5: Capture number of pages and prompt for additional comments.
  async (ctx) => {
    const pages = parseInt(ctx.message && ctx.message.text);
    if (isNaN(pages)) {
      await ctx.reply(responses.newOrder.invalidPages);
      return ctx.scene.leave();
    }
    ctx.scene.state.pages = pages;
    await ctx.reply(responses.newOrder.promptComments);
    return ctx.wizard.next();
  },
  // Step 6: Capture comments and prompt for file attachments.
  async (ctx) => {
    let comments = ctx.message && ctx.message.text;
    if (!comments || comments.trim() === "-") {
      comments = "";
    }
    ctx.scene.state.comments = comments;
    ctx.scene.state.attachments = [];
    await ctx.reply(responses.newOrder.promptAttachments,
      Markup.inlineKeyboard([
        [Markup.button.callback(responses.newOrder.finishAttachmentsButton, "finish_attachments")]
      ]),
    );
    return ctx.wizard.next();
  },
  // Step 7: Collect attachments until user clicks button to finish.
  // This step loops until the user presses a button to finish.
  async (ctx) => {
    // Check if the update is a callback query for finishing attachments.
    if (ctx.update.callback_query && ctx.update.callback_query.data === "finish_attachments") {
      await ctx.answerCbQuery(); // Acknowledge the button press.
      // Proceed to summary.
      const attachmentsText = ctx.scene.state.attachments.length > 0
        ? ctx.scene.state.attachments
          .map((att, i) =>
            formatMessage("Attachment {num}: [{type}]", {
              num: i + 1,
              type: att.type,
              fileId: att.fileId
            })
          )
          .join("\n")
        : "Немає";
      const summary = formatMessage(responses.newOrder.summary, {
        orderType: ctx.scene.state.orderTypeName,
        topic: ctx.scene.state.topic,
        deadline: ctx.scene.state.deadline,
        pages: ctx.scene.state.pages,
        comments: ctx.scene.state.comments || "Немає",
        attachments: attachmentsText
      });
      await ctx.reply(summary, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(responses.newOrder.confirmButton, 'order_confirm')],
          [Markup.button.callback(responses.newOrder.cancelButton, 'order_cancel')]
        ])
      });
      return ctx.wizard.next();
    }
    // Check for file attachments.
    if (ctx.message) {
      let attachment = null;
      if (ctx.message.document) {
        attachment = { fileId: ctx.message.document.file_id, type: 'document' };
      } else if (ctx.message.photo) {
        // For photos, select the highest resolution.
        attachment = { fileId: ctx.message.photo.slice(-1)[0].file_id, type: 'photo' };
      }
      if (attachment) {
        ctx.scene.state.attachments.push(attachment);
        // After receiving an attachment, send a reply with an inline button to finish attachments.
        await ctx.reply(
          responses.newOrder.attachmentReceived,
          Markup.inlineKeyboard([
            [Markup.button.callback(responses.newOrder.finishAttachmentsButton, "finish_attachments")]
          ])
        );
        return; // Stay in the same step.
      }
    }
    await ctx.reply(responses.newOrder.attachmentInvalid);
  },
  // Step 8: Process confirmation, create order, and forward details plus attachments with captions.
  async (ctx) => {
    if (ctx.update.callback_query) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      const action = ctx.update.callback_query.data;
      if (action === 'order_confirm') {
        try {
          // Create the order using the deadline string.
          const order = await prisma.order.create({
            data: {
              topic: ctx.scene.state.topic,
              deadline: ctx.scene.state.deadline, // Deadline is now a string.
              specialRequirements: ctx.scene.state.comments,
              price: ctx.scene.state.orderTypeBasePrice, // Use base price.
              orderType: { connect: { id: ctx.scene.state.orderTypeId } },
              user: { connect: { telegramId: ctx.from.id.toString() } }
            }
          });
          // Save each attachment.
          for (const att of ctx.scene.state.attachments) {
            await prisma.attachment.create({
              data: {
                url: att.fileId,
                order: { connect: { id: order.id } }
              }
            });
          }
          // Build a caption for each forwarded attachment.
          const caption = formatMessage(responses.newOrder.attachmentCaption, {
            orderType: ctx.scene.state.orderTypeName,
            topic: ctx.scene.state.topic,
            username: ctx.from.username || ctx.from.first_name || "Unknown"
          });
          // Build a link for the user.
          // If a username exists, use the https link; otherwise, use the tg:// scheme.
          const userLink = ctx.from.username
            ? `https://t.me/${ctx.from.username}`
            : `tg://user?id=${ctx.from.id}`;
          const displayName = ctx.from.username || ctx.from.first_name || "Unknown";
          // Build the admin message with the user link.
          const adminMessage = formatMessage(
            "New Order Received:\n\nType: {orderType}\nTopic: {topic}\nDeadline: {deadline}\nPages: {pages}\nComments: {comments}\nUser: [{displayName}]({userLink})",
            {
              orderType: ctx.scene.state.orderTypeName,
              topic: ctx.scene.state.topic,
              deadline: ctx.scene.state.deadline,
              pages: ctx.scene.state.pages,
              comments: ctx.scene.state.comments || "Немає",
              userLink: userLink,
              displayName: displayName
            }
          );
          const adminChatId = process.env.ADMIN_CHAT_ID;
          if (adminChatId) {
            console.log(`Sending new order to chat id ${adminChatId}`)
            // Send the admin message using HTML parse mode.
            await ctx.telegram.sendMessage(adminChatId, adminMessage, {
              parse_mode: 'Markdown'
            });
            // Forward each attachment with the caption.
            for (const att of ctx.scene.state.attachments) {
              if (att.type === 'document') {
                await ctx.telegram.sendDocument(adminChatId, att.fileId, { caption });
              } else if (att.type === 'photo') {
                await ctx.telegram.sendPhoto(adminChatId, att.fileId, { caption });
              }
            }
          }
          await ctx.reply(responses.newOrder.orderSent);
        } catch (error) {
          console.error(error);
          await ctx.reply(responses.newOrder.orderCreationError);
        }
        return ctx.scene.leave();
      } else if (action === 'order_cancel') {
        await ctx.reply(responses.newOrder.orderCancelled);
        return ctx.scene.leave();
      }
    }
    return;
  }
);

module.exports = { newOrderFlow };
