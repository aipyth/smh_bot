function loggingMiddleware(ctx, next) {
  let updateType = "Unknown";
  let contentPreview = "";

  // Determine update type and content preview.
  if (ctx.message) {
    if (ctx.message.text) {
      if (ctx.message.text.startsWith("/")) {
        updateType = "Command";
      } else {
        updateType = "Text Message";
      }
      const { text } = ctx.message;
      const previewLength = 30;
      if (text.length > 60) {
        contentPreview = `${text.slice(0, previewLength)}...${text.slice(-previewLength)}`;
      } else {
        contentPreview = text;
      }
    } else if (ctx.message.document) {
      updateType = "Document";
      contentPreview = "document";
    } else if (ctx.message.photo) {
      updateType = "Photo";
      contentPreview = "photo";
    } else {
      updateType = "Message (Other)";
    }
  } else if (ctx.update.callback_query) {
    updateType = "Callback Query";
    contentPreview = ctx.update.callback_query.data;
  } else if (ctx.update.inline_query) {
    updateType = "Inline Query";
    contentPreview = ctx.update.inline_query.query;
  } else {
    updateType = "Other Update";
  }

  // Get chat information.
  let chatInfo = "Unknown Chat";
  if (ctx.chat) {
    chatInfo = `ChatID: ${ctx.chat.id} (${ctx.chat.type})`;
  }

  // Get sender details.
  const telegramId = ctx.from ? ctx.from.id.toString() : "Unknown";
  const username = ctx.from && ctx.from.username;

  // If we're in a scene, include scene and step info.
  let sceneInfo = "";
  if (ctx.scene) {
    sceneInfo = `[Scene: ${ctx.scene.current || "none"}, Step: ${ctx.scene.step}] `;
  }

  console.log(
    `[${new Date().toISOString()}] [Incoming] [User: ${telegramId}${username ? ` (${username})` : ""}] ${sceneInfo}[UpdateType: ${updateType}] [Content: ${contentPreview}] [${chatInfo}]`,
  );
  return next();
}

function errorLogger(err, ctx) {
  let updateType = "Unknown";
  let contentPreview = "";

  if (ctx.message) {
    if (ctx.message.text) {
      if (ctx.message.text.startsWith("/")) {
        updateType = "Command";
      } else {
        updateType = "Text Message";
      }
      const { text } = ctx.message;
      const previewLength = 30;
      if (text.length > 60) {
        contentPreview = `${text.slice(0, previewLength)}...${text.slice(-previewLength)}`;
      } else {
        contentPreview = text;
      }
    } else if (ctx.message.document) {
      updateType = "Document";
      contentPreview = "document";
    } else if (ctx.message.photo) {
      updateType = "Photo";
      contentPreview = "photo";
    } else {
      updateType = "Message (Other)";
    }
  } else if (ctx.update.callback_query) {
    updateType = "Callback Query";
    contentPreview = ctx.update.callback_query.data;
  } else if (ctx.update.inline_query) {
    updateType = "Inline Query";
    contentPreview = ctx.update.inline_query.query;
  } else {
    updateType = "Other Update";
  }

  let chatInfo = "Unknown Chat";
  if (ctx.chat) {
    chatInfo = `ChatID: ${ctx.chat.id} (${ctx.chat.type})`;
  }

  const telegramId = ctx.from ? ctx.from.id.toString() : "Unknown";
  const username = ctx.from && ctx.from.username;

  let sceneInfo = "";
  if (ctx.scene) {
    sceneInfo = `[Scene: ${ctx.scene.current || "none"}, Step: ${ctx.scene.step}] `;
  }

  console.error(
    `[${new Date().toISOString()}] [ERROR] [User: ${telegramId}${username ? ` (${username})` : ""}] ${sceneInfo}[UpdateType: ${updateType}] [Content: ${contentPreview}] [${chatInfo}] Error: ${err}`,
  );
}

module.exports = { loggingMiddleware, errorLogger };
