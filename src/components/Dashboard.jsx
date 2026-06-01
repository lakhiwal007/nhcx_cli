import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  CreditCard,
  Users,
  PlayCircle,
  X,
  User,
  Phone,
  Calendar,
  Stethoscope,
  Receipt,
  BadgeIndianRupee,
  Building2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";
import { api } from "../api";
import { listActiveWorkflows, routeLabel } from "../workflowStorage";
import { Card, Button, StatusBadge } from "./Common";

// ─── Patient Detail Modal ─────────────────────────────────────────────────────
const PatientModal = ({ patient, onClose, onStartWorkflow }) => {
  const [expandedVisit, setExpandedVisit] = useState(0);
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  if (!patient) return null;

  const lc = patient.latest_claim;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 28, stiffness: 350 }}
        className="patient-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="patient-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="patient-avatar-lg">
              {patient.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2
                style={{
                  fontSize: "22px",
                  fontWeight: 800,
                  marginBottom: "4px",
                }}
              >
                {patient.name}
              </h2>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <span
                  className="badge-modern badge-info"
                  style={{ fontSize: "11px" }}
                >
                  #{patient.child_id}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    textTransform: "capitalize",
                  }}
                >
                  {patient.gender}
                </span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  DOB: {patient.dob}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Button
              variant="primary"
              icon={PlayCircle}
              onClick={() => {
                onClose();
                onStartWorkflow(patient);
              }}
            >
              Start Workflow
            </Button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: "8px",
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="patient-modal-body">
          {/* ── Quick Info ── */}
          <div className="pm-section-grid">
            {[
              { icon: User, label: "Full Name", value: patient.name },
              { icon: Phone, label: "Mobile", value: patient.mobile || "—" },
              {
                icon: Calendar,
                label: "Date of Birth",
                value: patient.dob || "—",
              },
              {
                icon: Users,
                label: "Gender",
                value: patient.gender,
                capitalize: true,
              },
              {
                icon: Building2,
                label: "Cashless Cases",
                value: patient.cashless_cases_count,
              },
              {
                icon: Calendar,
                label: "Registered",
                value: patient.created_at
                  ? new Date(patient.created_at).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                    })
                  : "—",
              },
            ].map(({ icon: Icon, label, value, capitalize }) => (
              <div key={label} className="pm-info-chip">
                <div className="pm-info-icon">
                  <Icon size={15} />
                </div>
                <div>
                  <div className="pm-info-label">{label}</div>
                  <div
                    className="pm-info-value"
                    style={capitalize ? { textTransform: "capitalize" } : {}}
                  >
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Latest Claim / Case ── */}
          {lc && (
            <div className="pm-section">
              <div className="pm-section-title">
                <CreditCard size={15} /> Latest Cashless Case
              </div>
              <div className="pm-card">
                <div className="pm-row-grid">
                  <div>
                    <span className="pm-field-label">Case ID</span>
                    <span className="pm-field-val">#{lc.cashless_case_id}</span>
                  </div>
                  <div>
                    <span className="pm-field-label">Claim ID</span>
                    <span className="pm-field-val">#{lc.claim_id}</span>
                  </div>
                  <div>
                    <span className="pm-field-label">Status</span>
                    <StatusBadge status={lc.status} />
                  </div>
                  <div>
                    <span className="pm-field-label">Preauth Status</span>
                    <StatusBadge status={lc.preauth_status || "N/A"} />
                  </div>
                  <div>
                    <span className="pm-field-label">Payer</span>
                    <span className="pm-field-val">{lc.payer_code}</span>
                  </div>
                  <div>
                    <span className="pm-field-label">Policy</span>
                    <span
                      className="pm-field-val"
                      style={{ fontFamily: "monospace", fontSize: "12px" }}
                    >
                      {lc.policy_number}
                    </span>
                  </div>
                  <div>
                    <span className="pm-field-label">Current Step</span>
                    <span
                      className="pm-field-val"
                      style={{ color: "var(--primary)" }}
                    >
                      {lc.current_step?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <span className="pm-field-label">Created</span>
                    <span className="pm-field-val">
                      {new Date(lc.created_at).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Visits ── */}
          {patient.visits?.length > 0 && (
            <div className="pm-section">
              <div className="pm-section-title">
                <Stethoscope size={15} /> Visits & Admissions
              </div>
              {patient.visits.map((visit, vi) => (
                <div key={vi} className="pm-visit-block">
                  {/* Visit header — clickable to expand */}
                  <div
                    className="pm-visit-header"
                    onClick={() =>
                      setExpandedVisit(expandedVisit === vi ? null : vi)
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        className="badge-modern badge-info"
                        style={{ fontSize: "11px", textTransform: "uppercase" }}
                      >
                        {visit.visit_type}
                      </span>
                      <strong style={{ fontSize: "14px" }}>
                        {visit.admission_no || `Visit ${vi + 1}`}
                      </strong>
                      <StatusBadge status={visit.status} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        color: "var(--text-muted)",
                        fontSize: "12px",
                      }}
                    >
                      <span>
                        {visit.started_at
                          ? new Date(visit.started_at).toLocaleDateString(
                              "en-IN",
                              { dateStyle: "medium" },
                            )
                          : "—"}
                      </span>
                      {expandedVisit === vi ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedVisit === vi && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pm-visit-body"
                      >
                        {/* Visit meta */}
                        <div
                          className="pm-row-grid"
                          style={{ marginBottom: "16px" }}
                        >
                          <div>
                            <span className="pm-field-label">Diagnosis</span>
                            <span className="pm-field-val">
                              {visit.diagnosis || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="pm-field-label">Reason</span>
                            <span className="pm-field-val">
                              {visit.reason || "—"}
                            </span>
                          </div>
                          {visit.primary_doctor && (
                            <div style={{ gridColumn: "span 2" }}>
                              <span className="pm-field-label">
                                Primary Doctor
                              </span>
                              <span className="pm-field-val">
                                {visit.primary_doctor.name} ·{" "}
                                {visit.primary_doctor.specialization}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Invoices */}
                        {visit.invoices?.length > 0 && (
                          <div style={{ marginBottom: "16px" }}>
                            <div className="pm-sub-title">
                              <Receipt size={13} /> Invoices
                            </div>
                            {visit.invoices.map((inv, ii) => (
                              <div key={ii} className="pm-invoice-block">
                                <div
                                  className="pm-invoice-header"
                                  onClick={() =>
                                    setExpandedInvoice(
                                      expandedInvoice === `${vi}-${ii}`
                                        ? null
                                        : `${vi}-${ii}`,
                                    )
                                  }
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "12px",
                                      alignItems: "center",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "13px",
                                      }}
                                    >
                                      {inv.invoice_no}
                                    </span>
                                    <StatusBadge status={inv.billing_status} />
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      {inv.invoice_date}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "16px",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div style={{ textAlign: "right" }}>
                                      <div
                                        style={{
                                          fontSize: "10px",
                                          color: "var(--text-muted)",
                                        }}
                                      >
                                        Billed
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          fontSize: "14px",
                                        }}
                                      >
                                        ₹{inv.amount_billed?.toLocaleString()}
                                      </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <div
                                        style={{
                                          fontSize: "10px",
                                          color: "var(--success)",
                                        }}
                                      >
                                        Final
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: 800,
                                          fontSize: "15px",
                                          color: "var(--success)",
                                        }}
                                      >
                                        ₹{inv.final_amount?.toLocaleString()}
                                      </div>
                                    </div>
                                    {expandedInvoice === `${vi}-${ii}` ? (
                                      <ChevronDown size={14} />
                                    ) : (
                                      <ChevronRight size={14} />
                                    )}
                                  </div>
                                </div>

                                <AnimatePresence>
                                  {expandedInvoice === `${vi}-${ii}` && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                    >
                                      {/* Invoice summary strip */}
                                      <div className="pm-inv-summary">
                                        <div>
                                          <span className="pm-field-label">
                                            Discount
                                          </span>
                                          <span
                                            className="pm-field-val"
                                            style={{ color: "var(--warning)" }}
                                          >
                                            -₹
                                            {inv.final_discount?.toLocaleString()}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="pm-field-label">
                                            Type
                                          </span>
                                          <span className="pm-field-val">
                                            {inv.invoice_type?.toUpperCase()}
                                          </span>
                                        </div>
                                      </div>
                                      {/* Line items */}
                                      {inv.line_items?.length > 0 && (
                                        <table
                                          style={{
                                            width: "100%",
                                            borderCollapse: "collapse",
                                            fontSize: "12px",
                                          }}
                                        >
                                          <thead>
                                            <tr
                                              style={{
                                                borderBottom:
                                                  "1px solid var(--border-color)",
                                              }}
                                            >
                                              {[
                                                "Code",
                                                "Item",
                                                "Category",
                                                "Qty",
                                                "Unit Price",
                                                "Net Amount",
                                              ].map((h) => (
                                                <th
                                                  key={h}
                                                  style={{
                                                    padding: "6px 10px",
                                                    textAlign: "left",
                                                    color: "var(--text-muted)",
                                                    fontWeight: 600,
                                                    fontSize: "11px",
                                                    textTransform: "uppercase",
                                                  }}
                                                >
                                                  {h}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {inv.line_items.map((li, li_i) => (
                                              <tr
                                                key={li_i}
                                                style={{
                                                  borderBottom:
                                                    "1px solid var(--border-color)",
                                                }}
                                              >
                                                <td
                                                  style={{
                                                    padding: "8px 10px",
                                                  }}
                                                >
                                                  <code
                                                    style={{
                                                      background:
                                                        "var(--primary-light)",
                                                      color: "var(--primary)",
                                                      padding: "2px 6px",
                                                      borderRadius: "4px",
                                                      fontWeight: 700,
                                                    }}
                                                  >
                                                    {li.code}
                                                  </code>
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "8px 10px",
                                                    fontWeight: 600,
                                                  }}
                                                >
                                                  {li.name}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "8px 10px",
                                                    color: "var(--text-muted)",
                                                  }}
                                                >
                                                  {li.category}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "8px 10px",
                                                    textAlign: "center",
                                                  }}
                                                >
                                                  {li.quantity}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "8px 10px",
                                                  }}
                                                >
                                                  ₹
                                                  {li.unit_price?.toLocaleString()}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "8px 10px",
                                                    fontWeight: 700,
                                                    color: "var(--primary)",
                                                  }}
                                                >
                                                  ₹
                                                  {li.net_amount?.toLocaleString()}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Claims for this visit */}
                        {visit.claims?.length > 0 && (
                          <div>
                            <div className="pm-sub-title">
                              <BadgeIndianRupee size={13} /> Claims
                            </div>
                            {visit.claims.map((claim, ci) => (
                              <div
                                key={ci}
                                className="pm-row-grid pm-card"
                                style={{ marginBottom: "8px" }}
                              >
                                <div>
                                  <span className="pm-field-label">
                                    Claim ID
                                  </span>
                                  <span className="pm-field-val">
                                    #{claim.claim_id}
                                  </span>
                                </div>
                                <div>
                                  <span className="pm-field-label">
                                    Case ID
                                  </span>
                                  <span className="pm-field-val">
                                    #{claim.cashless_case_id}
                                  </span>
                                </div>
                                <div>
                                  <span className="pm-field-label">Status</span>
                                  <StatusBadge status={claim.status} />
                                </div>
                                <div>
                                  <span className="pm-field-label">
                                    Use Type
                                  </span>
                                  <span
                                    className="badge-modern badge-info"
                                    style={{ fontSize: "11px" }}
                                  >
                                    {claim.use_type}
                                  </span>
                                </div>
                                <div>
                                  <span className="pm-field-label">Payer</span>
                                  <span className="pm-field-val">
                                    {claim.payer_name || claim.payer_code}
                                  </span>
                                </div>
                                <div>
                                  <span className="pm-field-label">Policy</span>
                                  <span
                                    className="pm-field-val"
                                    style={{
                                      fontFamily: "monospace",
                                      fontSize: "11px",
                                    }}
                                  >
                                    {claim.policy_number}
                                  </span>
                                </div>
                                <div>
                                  <span className="pm-field-label">
                                    Total Billed
                                  </span>
                                  <strong
                                    style={{
                                      color: "var(--primary)",
                                      fontSize: "15px",
                                    }}
                                  >
                                    ₹{claim.total_billed?.toLocaleString()}
                                  </strong>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ onSelectPatient, onResume }) => {
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [modalPatient, setModalPatient] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeWorkflows] = useState(() => listActiveWorkflows());
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const fetchClaims = useCallback(async () => {
    try {
      const data = await api.getDashboardClaims({ limit: 20, offset: 0 });
      setClaims(data.claims || []);
    } catch (error) {
      console.error("Error fetching claims:", error);
    } finally {
      setClaimsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchClaims();
  }, [fetchStats, fetchClaims]);

  const openPatientModal = async (childId, patientName) => {
    setModalLoading(true);
    setModalPatient({ name: patientName, child_id: childId }); // show skeleton immediately
    try {
      const res = await api.searchChildren({
        child_id: childId,
        name: patientName,
      });
      const found = res.children?.find((c) => c.child_id === childId);
      setModalPatient(found || { name: patientName, child_id: childId });
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const getClaimRowAction = (claim) => {
    if (!claim.status || claim.status === "draft") {
      const hasInProgress = activeWorkflows.some(wf => wf.patient?.child_id === claim.child_id);
      if (hasInProgress) {
        return { label: "Resume Workflow", variant: "secondary", action: "resume" };
      }
      return { label: "Start Workflow", variant: "primary", route: "payer" };
    }
    if (claim.claim_decision === "QUERIED")
      return { label: "Open Query Task", variant: "outline", route: "reprocess" };
    if (
      claim.claim_decision === "APPROVED" ||
      claim.claim_decision === "PARTIALLY_APPROVED"
    )
      return { label: "View Payment", variant: "outline", route: "payment" };
    if (claim.payment_status === "PAYMENT_SETTLED")
      return { label: "View UTR", variant: "outline", route: "payment" };
    if (claim.status === "pending")
      return { label: "View Status", variant: "outline", route: "status" };
    return { label: "View", variant: "outline", route: "payer" };
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  const statCards = stats
    ? [
        {
          label: "Total Claims",
          value: stats.claims.total,
          icon: FileText,
          colorClass: "stat-icon-primary",
        },
        {
          label: "Pending",
          value: stats.claims.pending,
          icon: Clock,
          colorClass: "stat-icon-warning",
        },
        {
          label: "Partial",
          value: stats.claims.partial,
          icon: AlertTriangle,
          colorClass: "stat-icon-info",
        },
        {
          label: "Complete",
          value: stats.claims.complete,
          icon: CheckCircle,
          colorClass: "stat-icon-success",
        },
        {
          label: "Failed",
          value: stats.claims.failed,
          icon: ShieldAlert,
          colorClass: "stat-icon-error",
        },
        {
          label: "Preauth Pending",
          value: stats.claims.preauth_pending,
          icon: CreditCard,
          colorClass: "stat-icon-warning",
        },
        {
          label: "Children with Claims",
          value: stats.children.with_claims,
          icon: Users,
          colorClass: "stat-icon-info",
        },
      ]
    : [];

  return (
    <div className="dashboard-modern">
      {/* Title */}
      <div className="page-header-modern">
        <h1>Cashless Claims Dashboard</h1>
        <p>
          Overview of all cashless cases. Click a patient name to view full
          details.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="stats-grid-modern"
        >
          {statCards.map((s) => (
            <motion.div
              key={s.label}
              variants={item}
              className="stat-card-modern"
            >
              <div className="stat-card-num">
                <div className={`stat-icon-wrapper ${s.colorClass}`}>
                  <s.icon size={22} />
                </div>
                <span className="stat-value-modern">{s.value}</span>
              </div>
              <span className="stat-label-modern">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Claims table */}
      <Card title="Cashless Claims">
        <div className="table-container-modern">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Claim ID</th>
                <th>Use Type</th>
                <th>Status</th>
                <th>Decision</th>
                <th>Approved Amt</th>
                <th>Payment</th>
                <th>UTR</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {claimsLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-muted">
                    Loading claims...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="text-center py-12">
                      <FileText
                        size={40}
                        className="text-muted mb-4 mx-auto"
                        style={{ opacity: 0.2 }}
                      />
                      <p className="text-muted">No cashless cases yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => {
                  const rowAction = getClaimRowAction(claim);
                  return (
                    <motion.tr key={claim.id} layoutId={`claim-${claim.id}`}>
                      <td>
                        <button
                          onClick={() =>
                            openPatientModal(
                              claim.child_id,
                              claim.patient_name || claim.child_name,
                            )
                          }
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            fontWeight: 700,
                            color: "var(--primary)",
                            fontSize: "14px",
                            textDecoration: "underline",
                            textDecorationStyle: "dotted",
                            textUnderlineOffset: "3px",
                          }}
                        >
                          {claim.patient_name || claim.child_name}
                        </button>
                      </td>
                      <td>
                        <code
                          style={{
                            background: "var(--primary-light)",
                            color: "var(--primary)",
                            padding: "3px 7px",
                            borderRadius: "5px",
                            fontWeight: 700,
                          }}
                        >
                          #{claim.id}
                        </code>
                      </td>
                      <td>
                        <span
                          className="badge-modern badge-info"
                          style={{ fontSize: "11px" }}
                        >
                          {claim.use_type || "—"}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={claim.status} />
                      </td>
                      <td>
                        {claim.claim_decision ? (
                          <StatusBadge status={claim.claim_decision} />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {claim.approved_amount ? (
                          <strong>
                            ₹{claim.approved_amount.toLocaleString()}
                          </strong>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {claim.payment_status ? (
                          <StatusBadge status={claim.payment_status} />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {claim.latest_utr ? (
                          <code
                            style={{
                              fontSize: "11px",
                              color: "var(--success)",
                            }}
                          >
                            {claim.latest_utr}
                          </code>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <Button
                          variant={rowAction.variant}
                          icon={rowAction.action === 'resume' ? RotateCcw : undefined}
                          onClick={() => {
                            if (rowAction.action === "resume") {
                              onResume && onResume(claim.child_id);
                            } else {
                              onSelectPatient &&
                                onSelectPatient(
                                  {
                                    child_id: claim.child_id,
                                    name: claim.patient_name,
                                  },
                                  rowAction.route
                                );
                            }
                          }}
                        >
                          {rowAction.label}
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Patient detail modal */}
      <AnimatePresence>
        {modalPatient && (
          <PatientModal
            patient={modalLoading ? modalPatient : modalPatient}
            loading={modalLoading}
            onClose={() => setModalPatient(null)}
            onStartWorkflow={(p, route) => onSelectPatient && onSelectPatient(p, route)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
