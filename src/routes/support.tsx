import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LifeBuoy,
  Mail,
  MessageSquareText,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clinicApi } from "@/lib/admin/api";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support - Treatly" },
      {
        name: "description",
        content: "Contact the admin quickly for any clinic support request.",
      },
    ],
  }),
  component: SupportPage,
});

const ADMIN_EMAIL = "support@treatlyonline.de";
const ADMIN_PHONE = "+49 000 000 0000";

function SupportPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    clinicName: "",
    senderName: "",
    senderEmail: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    let cancelled = false;

    clinicApi
      .me()
      .then(({ clinic, clinic_user }) => {
        if (cancelled) return;
        setForm((current) => ({
          ...current,
          clinicName: current.clinicName || clinic.name || "",
          senderName: current.senderName || clinic_user.full_name || "",
          senderEmail: current.senderEmail || clinic_user.email || "",
        }));
      })
      .catch(() => {
        // Keep the page usable even if profile data couldn't be loaded.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const mailtoHref = useMemo(() => {
    const params = new URLSearchParams({
      subject: form.subject || "Support Request",
      body: [
        `Clinic: ${form.clinicName || "-"}`,
        `Name: ${form.senderName || "-"}`,
        `Email: ${form.senderEmail || "-"}`,
        "",
        form.message || "",
      ].join("\n"),
    });

    return `mailto:${ADMIN_EMAIL}?${params.toString()}`;
  }, [form]);

  const updateField =
    (field: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.senderName.trim() || !form.senderEmail.trim() || !form.subject.trim() || !form.message.trim()) {
      toast.error("Please complete the required fields first.");
      return;
    }

    setIsSubmitting(true);
    try {
      window.location.href = mailtoHref;
      toast.success("Your email app is ready. Send the message to contact the admin.");
      setForm((current) => ({
        ...current,
        subject: "",
        message: "",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background via-background to-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_360px]">
          <section className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
                <LifeBuoy className="h-3 w-3" />
                Support
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight lg:text-4xl">
                Contact Admin
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Send a quick message for billing, technical issues, account access, or any clinic setup help.
              </p>
            </div>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Send a message</CardTitle>
                <CardDescription>
                  Fill in the details below and we will prepare the message for the admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Clinic name">
                      <Input
                        value={form.clinicName}
                        onChange={updateField("clinicName")}
                        placeholder="Clinic name"
                      />
                    </Field>
                    <Field label="Your name *">
                      <Input
                        value={form.senderName}
                        onChange={updateField("senderName")}
                        placeholder="Your full name"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Your email *">
                      <Input
                        type="email"
                        value={form.senderEmail}
                        onChange={updateField("senderEmail")}
                        placeholder="name@clinic.com"
                      />
                    </Field>
                    <Field label="Subject *">
                      <Input
                        value={form.subject}
                        onChange={updateField("subject")}
                        placeholder="What do you need help with?"
                      />
                    </Field>
                  </div>

                  <Field label="Message *">
                    <Textarea
                      value={form.message}
                      onChange={updateField("message")}
                      placeholder="Describe the issue or request clearly..."
                      className="min-h-40 resize-none"
                    />
                  </Field>

                  <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                      <p>
                        The page opens your email app with the message details already filled in.
                      </p>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="min-w-40">
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Preparing..." : "Send to admin"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Direct contact</CardTitle>
                <CardDescription>
                  Use the fastest way that suits you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ContactRow
                  icon={Mail}
                  title="Email"
                  value={ADMIN_EMAIL}
                  href={`mailto:${ADMIN_EMAIL}`}
                />
                <ContactRow
                  icon={Phone}
                  title="Phone"
                  value={ADMIN_PHONE}
                  href={`tel:${ADMIN_PHONE.replace(/\s+/g, "")}`}
                />
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>Common requests</CardTitle>
                <CardDescription>
                  A few examples you can send from this page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Login or access problem",
                  "Patient data or plan issue",
                  "Price list or templates update",
                  "Billing or subscription question",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 text-sm"
                  >
                    <MessageSquareText className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function ContactRow({
  icon: Icon,
  title,
  value,
  href,
}: {
  icon: typeof Mail;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 transition hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</div>
        <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
      </div>
    </a>
  );
}
