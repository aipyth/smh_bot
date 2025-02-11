const globalCommands = require("./globalCommands");

function withCommandExit(fn) {
  return async (ctx) => {
    if (
      ctx.message &&
      ctx.message.text &&
      ctx.message.text.trim().startsWith("/")
    ) {
      const command = ctx.message.text.trim().split(" ")[0]; // get the command part only
      console.log(
        `Exiting scene "${ctx.scene?.current?.id || "none"}" due to command: ${command}`,
      );
      if (ctx.scene && ctx.scene.current) {
        ctx.scene.leave();
      }
      // Check if a global command handler exists for this command.
      if (globalCommands[command]) {
        // Call the global command handler with the same context.
        return globalCommands[command](ctx);
      }
      // Otherwise, simply return.
      return;
    }
    return fn(ctx);
  };
}

module.exports = withCommandExit;
