import { createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dummyPayments, dummyReceipts, dummyStudents } from "@/data/dummyData";
import type { Payment, Receipt, Student } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Eye,
  FileText,
  Mail,
  MessageCircle,
  Printer,
  Search,
  Share2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const fmt = (ts: bigint) =>
  new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const fmtRupee = (n: bigint) => `₹${Number(n).toLocaleString("en-IN")}`;

interface ViewReceiptState {
  receipt: Receipt;
  student: Student | undefined;
  payment: Payment | undefined;
}

export default function Receipts() {
  const { actor, isFetching } = useActor(createActor);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [viewReceipt, setViewReceipt] = useState<ViewReceiptState | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: receipts = dummyReceipts } = useQuery<Receipt[]>({
    queryKey: ["receipts"],
    queryFn: async () => {
      if (!actor) return dummyReceipts;
      return actor.getReceipts(null) as Promise<Receipt[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: students = dummyStudents } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      if (!actor) return dummyStudents;
      return actor.getStudents() as Promise<Student[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const { data: payments = dummyPayments } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      if (!actor) return dummyPayments;
      return actor.getPayments(null) as Promise<Payment[]>;
    },
    enabled: !!actor && !isFetching,
  });

  const studentMap = useMemo(
    () => new Map(students.map((s) => [String(s.id), s])),
    [students],
  );
  const paymentMap = useMemo(
    () => new Map(payments.map((p) => [String(p.id), p])),
    [payments],
  );

  const filtered = useMemo(() => {
    let list = [...receipts].sort(
      (a, b) => Number(b.generatedAt) - Number(a.generatedAt),
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (studentMap.get(String(r.studentId))?.name ?? "")
            .toLowerCase()
            .includes(q) || r.receiptNumber.toLowerCase().includes(q),
      );
    }
    if (dateFrom) {
      const from = BigInt(new Date(dateFrom).getTime()) * 1_000_000n;
      list = list.filter((r) => r.generatedAt >= from);
    }
    if (dateTo) {
      const to =
        BigInt(new Date(dateTo).setHours(23, 59, 59, 999)) * 1_000_000n;
      list = list.filter((r) => r.generatedAt <= to);
    }
    return list;
  }, [receipts, search, dateFrom, dateTo, studentMap]);

  const handleDownload = (r: Receipt) => {
    const student = studentMap.get(String(r.studentId));
    const content = `FMS Pro - Payment Receipt\n\nReceipt No: ${r.receiptNumber}\nStudent: ${student?.name ?? "-"}\nAmount: ${fmtRupee(r.amount)}\nDate: ${fmt(r.generatedAt)}\n\nThank you for your payment.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.receiptNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded");
  };

  const handlePrint = () => {
    window.print();
    toast.success("Sent to printer");
  };

  const handleShareEmail = (r: Receipt) => {
    const student = studentMap.get(String(r.studentId));
    toast.success("Receipt emailed", {
      description: `${r.receiptNumber} sent to ${student?.email ?? "student"}.`,
    });
  };

  const handleShareWhatsApp = (r: Receipt) => {
    const student = studentMap.get(String(r.studentId));
    toast.success("Receipt sent via WhatsApp", {
      description: `${r.receiptNumber} delivered to ${student?.phone ?? "student"}.`,
    });
  };

  const thisMonthCount = receipts.filter((r) => {
    const d = new Date(Number(r.generatedAt) / 1_000_000);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  return (
    <AppLayout title="Receipts">
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Total Receipts",
              value: receipts.length,
              color: "text-primary",
            },
            {
              label: "This Month",
              value: thisMonthCount,
              color: "text-emerald-600",
            },
            {
              label: "Total Value",
              value: fmtRupee(receipts.reduce((s, r) => s + r.amount, 0n)),
              color: "text-primary",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-xl p-4 shadow-subtle"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {stat.label}
              </p>
              <p
                className={`text-2xl font-bold font-display mt-1 ${stat.color}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by student name or receipt #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              data-ocid="receipts.search_input"
            />
          </div>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 text-sm w-40"
            aria-label="Date from"
            data-ocid="receipts.date_from_input"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 text-sm w-40"
            aria-label="Date to"
            data-ocid="receipts.date_to_input"
          />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {[
                    "Receipt #",
                    "Student",
                    "Amount",
                    "Payment Date",
                    "Generated Date",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <FileText size={32} className="mx-auto mb-2 opacity-30" />
                      No receipts found
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const student = studentMap.get(String(r.studentId));
                    const payment = paymentMap.get(String(r.paymentId));
                    return (
                      <tr
                        key={String(r.id)}
                        className="hover:bg-muted/30 transition-colors"
                        data-ocid={`receipts.item.${i + 1}`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                            {r.receiptNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                          {student?.name ?? `Student #${r.studentId}`}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {fmtRupee(r.amount)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {payment ? fmt(payment.createdAt) : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {fmt(r.generatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-smooth"
                              onClick={() =>
                                setViewReceipt({ receipt: r, student, payment })
                              }
                              title="View receipt"
                              data-ocid={`receipts.view_button.${i + 1}`}
                              aria-label="View receipt"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth"
                              onClick={() => handleDownload(r)}
                              title="Download"
                              data-ocid={`receipts.download_button.${i + 1}`}
                              aria-label="Download receipt"
                            >
                              <Download size={14} />
                            </button>
                            <div className="relative group">
                              <button
                                type="button"
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth"
                                title="Share"
                                aria-label="Share receipt"
                                data-ocid={`receipts.share_button.${i + 1}`}
                              >
                                <Share2 size={14} />
                              </button>
                              <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-elevated opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-smooth min-w-[160px]">
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-smooth"
                                  onClick={() => handleShareEmail(r)}
                                  data-ocid={`receipts.email_button.${i + 1}`}
                                >
                                  <Mail size={13} /> Send via Email
                                </button>
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-smooth"
                                  onClick={() => handleShareWhatsApp(r)}
                                  data-ocid={`receipts.whatsapp_button.${i + 1}`}
                                >
                                  <MessageCircle size={13} /> Send via WhatsApp
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewReceipt && (
        <Modal
          title="Payment Receipt"
          onClose={() => setViewReceipt(null)}
          size="md"
          footer={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleShareEmail(viewReceipt.receipt)}
                data-ocid="viewreceipt.email_button"
              >
                <Mail size={14} className="mr-1.5" /> Email
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleShareWhatsApp(viewReceipt.receipt)}
                data-ocid="viewreceipt.whatsapp_button"
              >
                <MessageCircle size={14} className="mr-1.5" /> WhatsApp
              </Button>
              <Button
                type="button"
                onClick={handlePrint}
                data-ocid="viewreceipt.print_button"
              >
                <Printer size={14} className="mr-1.5" /> Print / Download
              </Button>
            </div>
          }
        >
          <div ref={printRef} className="space-y-5">
            <div className="text-center pb-4 border-b border-border">
              <div className="w-12 h-12 rounded-xl bg-gradient-primary mx-auto mb-2 flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <h2 className="text-lg font-bold text-foreground font-display">
                FMS Pro
              </h2>
              <p className="text-xs text-muted-foreground">
                Student Fee Management System
              </p>
              <p className="text-xs text-muted-foreground">
                support@fmspro.in · fmspro.in
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Receipt Number</p>
                <p className="font-mono font-bold text-primary text-lg">
                  {viewReceipt.receipt.receiptNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Date Generated</p>
                <p className="font-semibold text-foreground">
                  {fmt(viewReceipt.receipt.generatedAt)}
                </p>
              </div>
            </div>
            <div className="bg-muted/40 rounded-xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                Student Details
              </p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Name", viewReceipt.student?.name ?? "—"],
                  ["Email", viewReceipt.student?.email ?? "—"],
                  ["Phone", viewReceipt.student?.phone ?? "—"],
                  [
                    "Payment ID",
                    viewReceipt.payment?.transactionId ??
                      `PMT-${viewReceipt.receipt.paymentId}`,
                  ],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="font-semibold text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Payment Breakdown
              </div>
              <div className="divide-y divide-border">
                {[
                  [
                    "Payment Method",
                    viewReceipt.payment
                      ? String(viewReceipt.payment.method)
                      : "Online",
                  ],
                  [
                    "Payment Date",
                    viewReceipt.payment
                      ? fmt(viewReceipt.payment.createdAt)
                      : "—",
                  ],
                  ["Confirmed By", "FMS Accounts Team"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium capitalize">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 bg-primary/5">
                  <span className="font-bold text-foreground">
                    Total Amount Paid
                  </span>
                  <span className="font-bold text-primary text-lg">
                    {fmtRupee(viewReceipt.receipt.amount)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-4 border-t border-border">
              <div className="text-center">
                <div className="w-24 border-b-2 border-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  Student Signature
                </p>
              </div>
              <div className="text-center">
                <div className="w-24 border-b-2 border-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  Authorised Signatory
                </p>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              This is a computer-generated receipt and is valid without a
              physical signature.
            </p>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
