const { startCommand } = require("./commands/start");
const { menuCommand } = require("./commands/menu");
const { newOrderCommand } = require("./commands/newOrder");
const { listOrderTypesCommand } = require("./commands/listOrderTypes");
// Add other commands as needed

module.exports = {
  "/start": startCommand,
  "/menu": menuCommand,
  "/new_order": newOrderCommand,
  "/list_order_types": listOrderTypesCommand,
  // etc.
};
