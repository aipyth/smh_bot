function loggingMiddleware(ctx, next) {
  const telegramId = ctx.from && ctx.from.id.toString();
  const username = ctx.from && ctx.from.username;
  let sceneInfo = "";
  if (ctx.scene) {
    sceneInfo = `[Scene: ${ctx.scene.current || "none"}, Step: ${ctx.scene.step}] `;
  }
  console.log(
    `[${new Date().toISOString()}] [Incoming] [User: ${telegramId}${username ? " (" + username + ")" : ""}] ${sceneInfo} Update: ${JSON.stringify(ctx.update)}`
  );
  return next();
}

function errorLogger(err, ctx) {
  const telegramId = ctx.from && ctx.from.id.toString();
  const username = ctx.from && ctx.from.username;
  let sceneInfo = "";
  if (ctx.scene) {
    sceneInfo = `[Scene: ${ctx.scene.current || "none"}, Step: ${ctx.scene.step}] `;
  }
  console.error(
    `[${new Date().toISOString()}] [ERROR] [User: ${telegramId}${username ? " (" + username + ")" : ""}] ${sceneInfo} Error: ${err}`
  );
}

module.exports = { loggingMiddleware, errorLogger };
