import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createLibrary,
  defineComponent,
  Renderer,
} from "@openuidev/react-lang";
import { z } from "zod/v4";
import { summarize } from "./ledger";
import "./style.css";

const scenarios = [
  { title: "两笔退款均成功", first: 1000, second: 2000, status: "成功" },
  { title: "第二笔退款处理中", first: 1000, second: 2000, status: "处理中" },
  { title: "两笔同额退款", first: 1000, second: 1000, status: "成功" },
  {
    title: "跨月全额退款",
    first: 8000,
    second: 2000,
    status: "成功",
    crossMonth: true,
  },
];
const money = (cents) =>
  (cents / 100).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function Report({ title }) {
  const [index, setIndex] = useState(0);
  const [month, setMonth] = useState("");
  const [channel, setChannel] = useState("");
  const scenario = scenarios[index];
  const orders = [
    {
      id: "A",
      channel: "线上",
      payment: { date: "2026-10-02", cents: 10000 },
      status: scenario.crossMonth ? "已退款" : "已支付",
    },
    {
      id: "B",
      channel: "门店",
      payment: { date: "2026-10-04", cents: 20000 },
      status: "已支付",
    },
    { id: "C", channel: "线上", payment: null, status: "待支付" },
  ];
  const refunds = [
    {
      id: "R1",
      orderId: "A",
      cents: scenario.first,
      status: "成功",
      date: "2026-10-12",
      route: "线上",
    },
    {
      id: "R2",
      orderId: "A",
      cents: scenario.second,
      status: scenario.status,
      date: scenario.crossMonth ? "2026-11-01" : "2026-10-13",
      route: scenario.crossMonth ? "门店" : "线上",
    },
  ];
  const rows = summarize(orders, refunds, month).filter(
    (row) => !channel || row.channel === channel,
  );
  const total = rows.reduce((sum, row) => sum + row.net, 0);
  return (
    <article>
      <header>
        <h1>{title}</h1>
        <p>示例账簿 · 人民币元</p>
      </header>
      <section className="filters" aria-label="查询条件">
        <label>
          样例
          <select
            aria-label="样例"
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
          >
            {scenarios.map((s, i) => (
              <option key={s.title} value={i}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          统计期间
          <select
            aria-label="统计期间"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            <option value="">全部期间</option>
            <option>2026-10</option>
            <option>2026-11</option>
          </select>
        </label>
        <label>
          销售渠道
          <select
            aria-label="销售渠道"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="">全部渠道</option>
            <option>线上</option>
            <option>门店</option>
          </select>
        </label>
      </section>
      <section className="summary">
        <h2>净实收合计</h2>
        <output aria-live="polite">{money(total)}</output>
      </section>
      <table>
        <caption>渠道对账</caption>
        <thead>
          <tr>
            {["销售渠道", "实付", "成功退款", "净实收"].map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.channel}>
              <th scope="row">{r.channel}</th>
              <td>{money(r.paid)}</td>
              <td>{money(r.refunded)}</td>
              <td>{money(r.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details>
        <summary>查看完整样例流水</summary>
        <ul>
          {orders.map((o) => (
            <li key={o.id}>
              订单 {o.id} · {o.channel} · {o.status} ·{" "}
              {o.payment
                ? o.payment.date + " 实付 " + money(o.payment.cents) + " 元"
                : "无支付流水"}
            </li>
          ))}
          {refunds.map((r) => (
            <li key={r.id}>
              退款 {r.id} · 订单 {r.orderId} · {r.date} · {money(r.cents)} 元 ·{" "}
              {r.status} · 退款途径：{r.route}
            </li>
          ))}
        </ul>
      </details>
      <p>支付按支付日入账，成功退款按成功日冲减原销售渠道。</p>
    </article>
  );
}

const report = defineComponent({
  name: "ReceiptReport",
  description: "按销售渠道和月份核对样例支付与成功退款。",
  props: z.object({ title: z.string() }),
  component: ({ props }) => <Report title={props.title} />,
});
const library = createLibrary({ root: "ReceiptReport", components: [report] });
createRoot(document.getElementById("root")).render(
  <Renderer
    library={library}
    response={'root = ReceiptReport("渠道净实收")'}
    isStreaming={false}
  />,
);
