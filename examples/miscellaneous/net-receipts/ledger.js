// Inputs are synthetic ledger entries. Amounts are integer fen; dates are local business dates.
export function summarize(orders, refunds, month = "") {
  const byOrder = new Map();
  const byChannel = new Map();
  const inPeriod = (date) => !month || date.slice(0, 7) === month;
  for (const order of orders) {
    byOrder.set(order.id, order);
    if (!byChannel.has(order.channel)) {
      byChannel.set(order.channel, {
        channel: order.channel,
        paid: 0,
        refunded: 0,
        net: 0,
      });
    }
    if (order.payment && inPeriod(order.payment.date)) {
      byChannel.get(order.channel).paid += order.payment.cents;
    }
  }
  for (const refund of refunds) {
    if (refund.status !== "成功" || !inPeriod(refund.date)) continue;
    const order = byOrder.get(refund.orderId);
    if (!order) throw new Error("退款缺少原订单：" + refund.orderId);
    byChannel.get(order.channel).refunded += refund.cents;
  }
  return Array.from(byChannel.values(), (row) => ({
    ...row,
    net: row.paid - row.refunded,
  }));
}
