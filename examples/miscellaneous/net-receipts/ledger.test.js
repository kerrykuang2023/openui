import test from "node:test";
import assert from "node:assert/strict";
import { summarize } from "./ledger.js";

const orders = [
  { id: "A", channel: "线上", payment: { date: "2026-10-02", cents: 10000 } },
  { id: "B", channel: "门店", payment: { date: "2026-10-04", cents: 20000 } },
  { id: "C", channel: "线上", dueCents: 5000, payment: null },
];
const refund = (cents, status = "成功", date = "2026-10-12") => ({
  orderId: "A",
  cents,
  status,
  date,
});

test("应付未付不计实收，渠道分别归集", () => {
  assert.deepEqual(summarize(orders, []), [
    { channel: "线上", paid: 10000, refunded: 0, net: 10000 },
    { channel: "门店", paid: 20000, refunded: 0, net: 20000 },
  ]);
});
for (const [a, b, s1, s2, total] of [
  [1000, 2000, "成功", "成功", 27000],
  [1000, 1000, "成功", "成功", 28000],
  [4000, 6000, "成功", "成功", 20000],
  [1000, 2000, "成功", "处理中", 29000],
  [1000, 2000, "处理中", "处理中", 30000],
]) {
  test(`退款 ${a} 分（${s1}）及 ${b} 分（${s2}）后净额 ${total} 分`, () => {
    const rows = summarize(orders, [refund(a, s1), refund(b, s2)]);
    assert.equal(rows.find((r) => r.channel === "门店").net, 20000);
    assert.equal(rows.find((r) => r.channel === "线上").net, total - 20000);
    assert.equal(
      rows.reduce((sum, r) => sum + r.net, 0),
      total,
    );
  });
}
test("全额退款保留原支付，跨月按成功日冲减原销售渠道", () => {
  const paid = [
    { ...orders[0], status: "已退款" },
    { ...orders[1], payment: null },
  ];
  const returns = [
    refund(8000),
    { ...refund(2000, "成功", "2026-11-01"), route: "门店" },
  ];
  for (const [month, net] of [
    ["2026-10", 2000],
    ["2026-11", -2000],
    ["", 0],
  ]) {
    const rows = summarize(paid, returns, month);
    assert.equal(rows.find((r) => r.channel === "线上").net, net);
    assert.equal(rows.find((r) => r.channel === "门店").net, 0);
  }
});
