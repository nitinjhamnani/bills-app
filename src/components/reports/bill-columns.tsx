import { StatusBadge } from "@/components/StatusBadge";
import { formatInr, formatIstDate, formatIstDateTime } from "@/lib/report-format";
import type { BillPayment } from "@/lib/types";
import type { ReportColumn } from "@/components/reports/ReportTable";

export function clientBillColumns(opts?: { includePaidAt?: boolean; includeOrgStatus?: boolean }): ReportColumn<BillPayment>[] {
  const columns: ReportColumn<BillPayment>[] = [
    {
      key: "biller",
      label: "Biller",
      render: (p) => (
        <>
          <p className="font-medium text-slate-900">{p.billerName}</p>
          <p className="text-[11px] text-slate-400">{p.billServiceName}</p>
        </>
      ),
      exportValue: (p) => `${p.billerName} (${p.billServiceName})`,
    },
    {
      key: "consumer",
      label: "Consumer no.",
      render: (p) => <span className="font-mono text-xs">{p.customerBillAccountNumber}</span>,
      exportValue: (p) => p.customerBillAccountNumber,
    },
    {
      key: "billNumber",
      label: "Bill no.",
      render: (p) => p.billNumber ?? "—",
      exportValue: (p) => p.billNumber ?? "",
    },
    {
      key: "amount",
      label: "Amount",
      render: (p) => formatInr(p.amount),
      exportValue: (p) => p.amount,
    },
    {
      key: "dueDate",
      label: "Due date",
      render: (p) => formatIstDate(p.dueDate),
      exportValue: (p) => p.dueDate ?? "",
    },
    {
      key: "paymentStatus",
      label: "Payment status",
      render: (p) => <StatusBadge status={p.paymentStatus} />,
      exportValue: (p) => p.paymentStatus,
    },
  ];
  if (opts?.includeOrgStatus) {
    columns.push({
      key: "orgStatus",
      label: "Org status",
      render: (p) => <StatusBadge status={p.orgStatus} />,
      exportValue: (p) => p.orgStatus,
    });
  }
  if (opts?.includePaidAt) {
    columns.push({
      key: "paidAt",
      label: "Paid at",
      render: (p) => formatIstDateTime(p.clientPaidAt),
      exportValue: (p) => (p.clientPaidAt ? formatIstDateTime(p.clientPaidAt) : ""),
    });
  }
  columns.push({
    key: "createdAt",
    label: "Created",
    render: (p) => formatIstDate(p.createdAt),
    exportValue: (p) => formatIstDate(p.createdAt),
  });
  return columns;
}
