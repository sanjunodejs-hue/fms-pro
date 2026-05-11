import { Role, createActor } from "@/backend";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  Key,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Receipt,
  Save,
  Smartphone,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type TabId = "general" | "payment" | "notifications";

const TABS: {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "general",
    label: "General",
    icon: <Building2 size={14} />,
    description: "Company info & branding",
  },
  {
    id: "payment",
    label: "Payment",
    icon: <CreditCard size={14} />,
    description: "Gateway & receipt config",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell size={14} />,
    description: "Email, WhatsApp & SMS",
  },
];

function SectionCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-5 space-y-4">{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-border bg-muted/20">
          {footer}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <Label className="text-xs font-medium">{label}</Label>
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleField({
  label,
  description,
  value,
  onChange,
  ocid,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  ocid?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "flex items-center transition-smooth",
          value ? "text-primary" : "text-muted-foreground",
        )}
        data-ocid={ocid}
        aria-label={label}
      >
        {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  );
}

function SaveButton({
  saving,
  onClick,
  ocid,
}: { saving: boolean; onClick: () => void; ocid?: string }) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="gap-2"
      data-ocid={ocid}
    >
      {saving ? (
        <>
          <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />{" "}
          Saving…
        </>
      ) : (
        <>
          <Save size={14} /> Save Changes
        </>
      )}
    </Button>
  );
}

function SavedBanner() {
  return (
    <div className="flex items-center gap-2 text-emerald-600 text-sm">
      <CheckCircle2 size={14} />
      <span>Changes saved</span>
    </div>
  );
}

export default function Settings() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { actor, isFetching } = useActor(createActor);

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [saving, setSaving] = useState(false);
  const [savedTab, setSavedTab] = useState<TabId | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notification toggles (UI-only state, stored in form for simplicity)
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  const [form, setForm] = useState<AppSettings>({
    companyName: "FMS Pro Academy",
    companyEmail: "admin@fmspro.in",
    companyPhone: "+91 98765 00000",
    logoUrl: "",
    paymentBaseUrl: "https://pay.fmspro.in",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587n,
    smtpUser: "noreply@fmspro.in",
    whatsappApiKey: "",
    smsApiKey: "",
  } as AppSettings);

  useEffect(() => {
    if (role !== Role.admin) navigate("/dashboard", { replace: true });
  }, [role, navigate]);

  const { isLoading } = useQuery<AppSettings>({
    queryKey: ["appSettings"],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      const s = await actor.getSettings();
      setForm(s as unknown as AppSettings);
      return s as unknown as AppSettings;
    },
    enabled: !!actor && !isFetching,
  });

  const setField = (key: keyof AppSettings, value: string | bigint) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (tab: TabId) => {
    if (!actor) return;
    setSaving(true);
    try {
      const res = await actor.updateSettings(form as never);
      if (res.__kind__ === "err") throw new Error(res.err);
      toast.success("Settings saved successfully");
      setSavedTab(tab);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSavedTab(null), 3000);
      await qc.invalidateQueries({ queryKey: ["appSettings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-3xl space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground font-display">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your organization and notification preferences
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Sidebar-style tab navigation */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Tab nav */}
              <nav className="flex sm:flex-col gap-1 sm:w-52 shrink-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-smooth w-full",
                      activeTab === tab.id
                        ? "bg-primary/10 border border-primary/20 text-primary"
                        : "hover:bg-muted/50 text-muted-foreground",
                    )}
                    data-ocid={`settings.${tab.id}_tab`}
                  >
                    <span className="mt-0.5">{tab.icon}</span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          activeTab === tab.id
                            ? "text-primary"
                            : "text-foreground",
                        )}
                      >
                        {tab.label}
                      </p>
                      <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">
                        {tab.description}
                      </p>
                    </div>
                  </button>
                ))}
              </nav>

              {/* Tab content */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* ─── General ─── */}
                {activeTab === "general" && (
                  <SectionCard
                    title="General Settings"
                    description="Basic information about your organization."
                    footer={
                      <div className="flex items-center justify-between">
                        {savedTab === "general" ? <SavedBanner /> : <span />}
                        <SaveButton
                          saving={saving}
                          onClick={() => handleSave("general")}
                          ocid="settings.general_save_button"
                        />
                      </div>
                    }
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label="Company Name"
                        icon={<Building2 size={12} />}
                      >
                        <Input
                          value={form.companyName}
                          onChange={(e) =>
                            setField("companyName", e.target.value)
                          }
                          placeholder="e.g. FMS Academy"
                          data-ocid="settings.company_name_input"
                        />
                      </Field>
                      <Field label="Company Email" icon={<Mail size={12} />}>
                        <Input
                          type="email"
                          value={form.companyEmail}
                          onChange={(e) =>
                            setField("companyEmail", e.target.value)
                          }
                          placeholder="admin@company.com"
                          data-ocid="settings.company_email_input"
                        />
                      </Field>
                      <Field label="Company Phone" icon={<Phone size={12} />}>
                        <Input
                          value={form.companyPhone}
                          onChange={(e) =>
                            setField("companyPhone", e.target.value)
                          }
                          placeholder="+91 99999 00000"
                          data-ocid="settings.company_phone_input"
                        />
                      </Field>
                      <Field
                        label="Logo URL"
                        icon={<Globe size={12} />}
                        hint="Public URL to your company logo"
                      >
                        <Input
                          value={form.logoUrl}
                          onChange={(e) => setField("logoUrl", e.target.value)}
                          placeholder="https://example.com/logo.png"
                          data-ocid="settings.logo_url_input"
                        />
                      </Field>
                    </div>
                  </SectionCard>
                )}

                {/* ─── Payment ─── */}
                {activeTab === "payment" && (
                  <SectionCard
                    title="Payment Settings"
                    description="Configure payment gateway and receipt settings."
                    footer={
                      <div className="flex items-center justify-between">
                        {savedTab === "payment" ? <SavedBanner /> : <span />}
                        <SaveButton
                          saving={saving}
                          onClick={() => handleSave("payment")}
                          ocid="settings.payment_save_button"
                        />
                      </div>
                    }
                  >
                    <Field
                      label="Payment Gateway URL"
                      icon={<Globe size={12} />}
                      hint="Base URL for generating student payment links: {url}/pay/{studentId}"
                    >
                      <Input
                        value={form.paymentBaseUrl}
                        onChange={(e) =>
                          setField("paymentBaseUrl", e.target.value)
                        }
                        placeholder="https://pay.yourcompany.com"
                        data-ocid="settings.payment_base_url_input"
                      />
                    </Field>

                    <Field
                      label="API Key (Masked)"
                      icon={<Key size={12} />}
                      hint="Leave blank to keep existing key"
                    >
                      <div className="relative">
                        <Input
                          type="password"
                          placeholder="Enter API key…"
                          className="pr-9"
                          data-ocid="settings.payment_api_key_input"
                        />
                        <Lock
                          size={13}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                      </div>
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Currency" icon={<Receipt size={12} />}>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                          defaultValue="INR"
                          data-ocid="settings.currency_select"
                        >
                          <option value="INR">INR — Indian Rupee (₹)</option>
                          <option value="USD">USD — US Dollar ($)</option>
                          <option value="EUR">EUR — Euro (€)</option>
                        </select>
                      </Field>
                      <Field
                        label="Receipt Prefix"
                        icon={<Receipt size={12} />}
                        hint="e.g. RCP-2025-"
                      >
                        <Input
                          placeholder="RCP-2025-"
                          defaultValue="RCP-2025-"
                          data-ocid="settings.receipt_prefix_input"
                        />
                      </Field>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5">
                      <Lock
                        size={12}
                        className="shrink-0 mt-0.5 text-primary"
                      />
                      Payment links are generated as:{" "}
                      <code className="text-primary">
                        {form.paymentBaseUrl || "https://pay.example.com"}
                        /pay/&#123;studentId&#125;
                      </code>
                    </div>
                  </SectionCard>
                )}

                {/* ─── Notifications ─── */}
                {activeTab === "notifications" && (
                  <div className="space-y-4">
                    {/* SMTP */}
                    <SectionCard
                      title="Email (SMTP)"
                      description="Configure outgoing email for payment & reminder notifications."
                    >
                      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5 mb-3">
                        <Lock
                          size={12}
                          className="shrink-0 mt-0.5 text-primary"
                        />
                        SMTP credentials are stored securely. Use app passwords
                        for Gmail.
                      </div>
                      <ToggleField
                        label="Email Notifications"
                        description="Send payment confirmations, EMI reminders via email"
                        value={emailEnabled}
                        onChange={setEmailEnabled}
                        ocid="settings.email_toggle"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="SMTP Host" icon={<Mail size={12} />}>
                          <Input
                            value={form.smtpHost}
                            onChange={(e) =>
                              setField("smtpHost", e.target.value)
                            }
                            placeholder="smtp.gmail.com"
                            data-ocid="settings.smtp_host_input"
                          />
                        </Field>
                        <Field label="SMTP Port">
                          <Input
                            type="number"
                            value={String(form.smtpPort)}
                            onChange={(e) =>
                              setField(
                                "smtpPort",
                                BigInt(e.target.value || "587"),
                              )
                            }
                            placeholder="587"
                            data-ocid="settings.smtp_port_input"
                          />
                        </Field>
                        <Field label="SMTP User" icon={<Mail size={12} />}>
                          <Input
                            value={form.smtpUser}
                            onChange={(e) =>
                              setField("smtpUser", e.target.value)
                            }
                            placeholder="noreply@company.com"
                            data-ocid="settings.smtp_user_input"
                          />
                        </Field>
                      </div>
                    </SectionCard>

                    {/* WhatsApp */}
                    <SectionCard
                      title="WhatsApp Business API"
                      description="Automated WhatsApp messages for follow-ups and reminders."
                    >
                      <ToggleField
                        label="WhatsApp Notifications"
                        description="Send automated WhatsApp messages to students and counselors"
                        value={whatsappEnabled}
                        onChange={setWhatsappEnabled}
                        ocid="settings.whatsapp_toggle"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                          label="API URL"
                          icon={<MessageSquare size={12} />}
                        >
                          <Input
                            placeholder="https://api.whatsapp.example.com"
                            data-ocid="settings.whatsapp_api_url_input"
                          />
                        </Field>
                        <Field label="API Token" icon={<Key size={12} />}>
                          <Input
                            type="password"
                            value={form.whatsappApiKey}
                            onChange={(e) =>
                              setField("whatsappApiKey", e.target.value)
                            }
                            placeholder="wa_live_xxxxxxxxxx"
                            data-ocid="settings.whatsapp_api_key_input"
                          />
                        </Field>
                      </div>
                    </SectionCard>

                    {/* SMS */}
                    <SectionCard
                      title="SMS Gateway"
                      description="Text message alerts for payment and EMI reminders."
                      footer={
                        <div className="flex items-center justify-between">
                          {savedTab === "notifications" ? (
                            <SavedBanner />
                          ) : (
                            <span />
                          )}
                          <SaveButton
                            saving={saving}
                            onClick={() => handleSave("notifications")}
                            ocid="settings.notifications_save_button"
                          />
                        </div>
                      }
                    >
                      <ToggleField
                        label="SMS Notifications"
                        description="Send SMS alerts for overdue EMIs and payment confirmations"
                        value={smsEnabled}
                        onChange={setSmsEnabled}
                        ocid="settings.sms_toggle"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="API URL" icon={<Smartphone size={12} />}>
                          <Input
                            placeholder="https://sms.gateway.example.com"
                            data-ocid="settings.sms_api_url_input"
                          />
                        </Field>
                        <Field label="API Key" icon={<Key size={12} />}>
                          <Input
                            type="password"
                            value={form.smsApiKey}
                            onChange={(e) =>
                              setField("smsApiKey", e.target.value)
                            }
                            placeholder="sms_live_xxxxxxxxxx"
                            data-ocid="settings.sms_api_key_input"
                          />
                        </Field>
                      </div>
                    </SectionCard>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
