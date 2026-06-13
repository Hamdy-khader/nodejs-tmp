import { useEffect, useState } from "react";
import { Btn, Empty, Field, Spinner, StatusBadge } from "@/components/admin/ui";
import { adminApi, type Clinic } from "@/lib/admin/api";

type BillingCycle = "Monthly" | "Yearly";
type SubscriptionStatus = "active" | "expired" | "pending" | "cancelled";
type PaymentStatus = "paid" | "pending" | "failed" | "refunded";
type TicketStatus = "open" | "in_progress" | "closed";

interface SubscriptionRow {
  clinicName: string;
  plan: string;
  startDate: string;
  endDate: string;
  billing: BillingCycle;
  status: SubscriptionStatus;
}

interface PaymentRow {
  clinicName: string;
  invoiceNumber: string;
  amount: number;
  method: string;
  paymentDate: string;
  status: PaymentStatus;
}

interface TicketRow {
  clinicName: string;
  subject: string;
  message: string;
  date: string;
  status: TicketStatus;
}

const subscriptions: SubscriptionRow[] = [
  {
    clinicName: "Bright Dental Studio",
    plan: "Professional",
    startDate: "2026-06-01",
    endDate: "2027-05-31",
    billing: "Yearly",
    status: "active",
  },
  {
    clinicName: "Pearl Orthodontics",
    plan: "Starter",
    startDate: "2026-05-15",
    endDate: "2026-06-14",
    billing: "Monthly",
    status: "pending",
  },
  {
    clinicName: "City Smile Center",
    plan: "Enterprise",
    startDate: "2025-06-01",
    endDate: "2026-05-31",
    billing: "Yearly",
    status: "expired",
  },
];

const payments: PaymentRow[] = [
  {
    clinicName: "Bright Dental Studio",
    invoiceNumber: "INV-2026-0612",
    amount: 1200,
    method: "Card",
    paymentDate: "2026-06-08",
    status: "paid",
  },
  {
    clinicName: "Pearl Orthodontics",
    invoiceNumber: "INV-2026-0609",
    amount: 129,
    method: "Bank transfer",
    paymentDate: "2026-06-09",
    status: "pending",
  },
  {
    clinicName: "City Smile Center",
    invoiceNumber: "INV-2026-0602",
    amount: 350,
    method: "Card",
    paymentDate: "2026-06-02",
    status: "failed",
  },
];

const tickets: TicketRow[] = [
  {
    clinicName: "Bright Dental Studio",
    subject: "Invoice copy request",
    message: "Please resend the yearly subscription invoice to the owner email.",
    date: "2026-06-11",
    status: "open",
  },
  {
    clinicName: "Pearl Orthodontics",
    subject: "Upgrade plan",
    message: "The clinic wants to switch from Starter to Professional next cycle.",
    date: "2026-06-10",
    status: "in_progress",
  },
  {
    clinicName: "City Smile Center",
    subject: "Billing method updated",
    message: "Card details were updated after a failed payment.",
    date: "2026-06-04",
    status: "closed",
  },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString();
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="adm-page-hdr">
      <div>
        <div className="adm-page-title">{title}</div>
        <div className="adm-page-sub">{subtitle}</div>
      </div>
    </div>
  );
}

function BusinessStats({
  items,
}: {
  items: { label: string; value: string | number; sub?: string; color: string }[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
        marginBottom: 24,
      }}
    >
      {items.map((item) => (
        <div className={`adm-stat ${item.color}`} key={item.label}>
          <div className="adm-stat-label">{item.label}</div>
          <div
            className="adm-stat-val"
            style={{ fontSize: typeof item.value === "string" && item.value.length > 7 ? 26 : 32 }}
          >
            {item.value}
          </div>
          {item.sub && <div className="adm-stat-sub">{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function useClinics(limit = 50) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.clinics
      .list({ page: 1, limit })
      .then((res) => setClinics(res.data))
      .catch(() => setClinics([]))
      .finally(() => setLoading(false));
  }, [limit]);

  return { clinics, loading };
}

export function SubscriptionManagement() {
  return (
    <>
      <PageHeader
        title="Subscription Management"
        subtitle="Manage clinic plans, renewals, billing cycles, and subscription status."
      />
      <BusinessStats
        items={[
          {
            label: "Active Subscriptions",
            value: subscriptions.filter((s) => s.status === "active").length,
            color: "c-teal",
            sub: "Paid access",
          },
          {
            label: "Pending",
            value: subscriptions.filter((s) => s.status === "pending").length,
            color: "c-gold",
            sub: "Awaiting confirmation",
          },
          {
            label: "Expired",
            value: subscriptions.filter((s) => s.status === "expired").length,
            color: "c-coral",
            sub: "Needs renewal",
          },
          {
            label: "Yearly Billing",
            value: subscriptions.filter((s) => s.billing === "Yearly").length,
            color: "c-blue",
            sub: "Annual contracts",
          },
        ]}
      />
      <div className="adm-card" style={{ marginBottom: 18 }}>
        <div className="adm-actions">
          <Btn variant="primary">Create Subscription</Btn>
          <Btn>Renew Subscription</Btn>
          <Btn>Upgrade Plan</Btn>
          <Btn>Downgrade Plan</Btn>
          <Btn variant="danger">Cancel Subscription</Btn>
        </div>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Plan</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Billing</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((row) => (
              <tr key={`${row.clinicName}-${row.startDate}`}>
                <td>{row.clinicName}</td>
                <td>{row.plan}</td>
                <td>{dateLabel(row.startDate)}</td>
                <td>{dateLabel(row.endDate)}</td>
                <td>{row.billing}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function FinancialManagement() {
  const revenueThisMonth = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const outstanding = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader
        title="Financial Management"
        subtitle="Track clinic invoices, payments, revenue, and outstanding balances."
      />
      <BusinessStats
        items={[
          {
            label: "Revenue This Month",
            value: money(revenueThisMonth),
            color: "c-teal",
            sub: "Paid invoices",
          },
          {
            label: "Revenue This Year",
            value: money(revenueThisMonth),
            color: "c-blue",
            sub: "Current sample period",
          },
          {
            label: "Total Paid Clinics",
            value: payments.filter((p) => p.status === "paid").length,
            color: "c-purple",
            sub: "Successful payments",
          },
          {
            label: "Outstanding Payments",
            value: money(outstanding),
            color: "c-gold",
            sub: "Pending invoices",
          },
        ]}
      />
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Invoice</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Payment Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.invoiceNumber}>
                <td>{row.clinicName}</td>
                <td>{row.invoiceNumber}</td>
                <td>{money(row.amount)}</td>
                <td>{row.method}</td>
                <td>{dateLabel(row.paymentDate)}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>
                  <div className="adm-actions">
                    <Btn size="sm">View Invoice</Btn>
                    <Btn size="sm" variant="teal">
                      Mark as Paid
                    </Btn>
                    <Btn size="sm">Download Invoice</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function HighLevelUsersManagement() {
  const { clinics, loading } = useClinics();

  return (
    <>
      <PageHeader
        title="Users Management"
        subtitle="Manage clinic accounts at a high level only."
      />
      {loading ? (
        <Spinner label="Loading clinic accounts..." />
      ) : clinics.length === 0 ? (
        <Empty message="No clinic accounts found." />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Clinic Account</th>
                <th>Status</th>
                <th>Subscription Plan</th>
                <th>Registration Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic, index) => (
                <tr key={clinic.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{clinic.name}</div>
                    <div style={{ fontSize: 11, color: "var(--adm-muted2)" }}>{clinic.email}</div>
                  </td>
                  <td>
                    <StatusBadge status={clinic.status} />
                  </td>
                  <td>{["Starter", "Professional", "Enterprise"][index % 3]}</td>
                  <td>{dateLabel(clinic.created_at)}</td>
                  <td>
                    <div className="adm-actions">
                      <a className="adm-btn ghost sm" href={`/admin/clinics/${clinic.id}`}>
                        View
                      </a>
                      <a className="adm-btn ghost sm" href={`/admin/clinics/${clinic.id}/edit`}>
                        Edit
                      </a>
                      {clinic.status === "active" ? (
                        <Btn size="sm" variant="danger">
                          Suspend
                        </Btn>
                      ) : (
                        <Btn size="sm" variant="teal">
                          Activate
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function SupportCenter() {
  return (
    <>
      <PageHeader
        title="Support Center"
        subtitle="Email-backed clinic support requests and replies."
      />
      <div className="adm-card" style={{ marginBottom: 18 }}>
        <div className="adm-section-title">Notification Flow</div>
        <p style={{ margin: 0, color: "var(--adm-muted)", fontSize: 13, lineHeight: 1.65 }}>
          New clinic support requests notify the Super Admin by email and appear here. Replies are
          sent to the clinic by email.
        </p>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Clinic</th>
              <th>Subject</th>
              <th>Message</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={`${ticket.clinicName}-${ticket.subject}`}>
                <td>{ticket.clinicName}</td>
                <td>{ticket.subject}</td>
                <td style={{ maxWidth: 360 }}>{ticket.message}</td>
                <td>{dateLabel(ticket.date)}</td>
                <td>
                  <StatusBadge status={ticket.status} />
                </td>
                <td>
                  <div className="adm-actions">
                    <Btn size="sm" variant="primary">
                      Reply to Clinic
                    </Btn>
                    <Btn size="sm">Close Ticket</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function BranchStatistics() {
  const { clinics, loading } = useClinics();
  const branchRows = clinics.map((clinic, index) => ({
    clinic,
    branches: (index % 4) + 1,
    activeBranches: Math.max((index % 4) + 1 - (index % 2), 1),
  }));
  const totalBranches = branchRows.reduce((sum, row) => sum + row.branches, 0);
  const activeBranches = branchRows.reduce((sum, row) => sum + row.activeBranches, 0);

  return (
    <>
      <PageHeader
        title="Branch Statistics"
        subtitle="High-level branch counts only, without branch editing screens."
      />
      {loading ? (
        <Spinner label="Loading branch statistics..." />
      ) : (
        <>
          <BusinessStats
            items={[
              {
                label: "Total Branches",
                value: totalBranches,
                color: "c-blue",
                sub: "Across all clinics",
              },
              {
                label: "Active Branches",
                value: activeBranches,
                color: "c-teal",
                sub: "Operational branches",
              },
              {
                label: "Clinics With Branches",
                value: branchRows.length,
                color: "c-gold",
                sub: "Registered clinics",
              },
            ]}
          />
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Clinic</th>
                  <th>Branches per Clinic</th>
                  <th>Active Branches</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map(({ clinic, branches, activeBranches: active }) => (
                  <tr key={clinic.id}>
                    <td>{clinic.name}</td>
                    <td>{branches}</td>
                    <td>{active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export function BackupManagement() {
  return (
    <>
      <PageHeader
        title="Backup Management"
        subtitle="Backup actions are visible but disabled until the backend feature is ready."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {["Create Backup", "Restore Backup", "Download Backup"].map((feature) => (
          <div className="adm-card" key={feature}>
            <div className="adm-section-title">{feature}</div>
            <StatusBadge status="pending" />
            <p style={{ color: "var(--adm-muted)", fontSize: 13, lineHeight: 1.6 }}>Coming Soon</p>
            <Btn disabled>{feature}</Btn>
          </div>
        ))}
      </div>
    </>
  );
}

export function SystemSettings() {
  return (
    <>
      <PageHeader
        title="System Settings"
        subtitle="Basic business configuration for the subscription platform."
      />
      <div className="adm-card">
        <div className="adm-form-grid">
          <Field label="System Name">
            <input className="adm-input" defaultValue="Treatly Online" />
          </Field>
          <Field label="System Logo">
            <input className="adm-input" type="file" />
          </Field>
          <Field label="Payment Methods">
            <input className="adm-input" defaultValue="Card, Bank transfer, Cash" />
          </Field>
          <Field label="Subscription Plans">
            <input className="adm-input" defaultValue="Starter, Professional, Enterprise" />
          </Field>
        </div>
        <Field label="Company Information">
          <textarea
            className="adm-textarea"
            defaultValue="Company name, billing address, tax number, and support email."
          />
        </Field>
        <Btn variant="primary">Save Settings</Btn>
      </div>
    </>
  );
}
