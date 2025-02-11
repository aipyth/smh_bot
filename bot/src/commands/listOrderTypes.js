const prisma = require("../prisma");
const responses = require("../responses.json");

function formatMessage(template, params) {
  return template.replace(/{(\w+)}/g, (_, key) => params[key] || "");
}

async function listOrderTypesCommand(ctx) {
  const orderTypes = await prisma.orderType.findMany();
  if (orderTypes.length === 0) {
    await ctx.reply(responses.listOrderTypes.noOrderTypes);
    return;
  }
  let message = responses.listOrderTypes.header;
  orderTypes.forEach((ot) => {
    message += formatMessage(responses.listOrderTypes.line, {
      id: ot.id,
      name: ot.name,
      basePrice: ot.basePrice.toFixed(2),
    });
  });
  await ctx.reply(message);
}

module.exports = { listOrderTypesCommand };
