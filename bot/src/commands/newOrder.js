async function newOrderCommand(ctx) {
  ctx.scene.enter('new-order-flow');
}

module.exports = { newOrderCommand };
