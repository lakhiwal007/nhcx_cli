import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, User, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../../api";
import { Card, Button, DocumentChecklist, MissingFieldsAlert } from "../Common";

const PATIENT_CONTEXT_FIELDS = [
  { key: "abha", label: "ABHA Number", placeholder: "91-XXXX-XXXX-XXXX" },
  { key: "member_id", label: "Member / PMJAY ID", placeholder: "PMJAY-MEM-XXXXX" },
  { key: "dob", label: "Date of Birth", placeholder: "YYYY-MM-DD", type: "date" },
  { key: "admission_date", label: "Admission Date", placeholder: "YYYY-MM-DD", type: "date" },
];

function PatientContextForm({ claimId, missingFields, onResolved }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);

  const relevantFields = PATIENT_CONTEXT_FIELDS.filter((f) =>
    missingFields.some((m) => m.toLowerCase().includes(f.key))
  );
  const allFields = relevantFields.length > 0 ? relevantFields : PATIENT_CONTEXT_FIELDS;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patchPatientContext(claimId, {
        patient_context: values,
      });
      onResolved(res.missing_fields ?? []);
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ border: "1px solid var(--error)", borderRadius: "12px", overflow: "hidden", marginBottom: "16px" }}>
      <div
        onClick={() => setOpen((p) => !p)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(239,68,68,0.06)", cursor: "pointer" }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center", fontWeight: 700, color: "var(--error)", fontSize: "14px" }}>
          <AlertCircle size={16} /> Supply Missing Patient Attributes
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {open && (
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {allFields.map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                {f.label}
              </label>
              <input
                className="input-modern"
                type={f.type || "text"}
                placeholder={f.placeholder}
                value={values[f.key] || ""}
                onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <Button variant="primary" size="small" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save & Refresh"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PreauthDraft({ ctx }) {
  const navigate = useNavigate();
  const { caseState, updateCaseState } = ctx;
  const { payer, policy, cashless_case_id, claim_id } = caseState;

  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadDraft = async () => {
    setLoading(true);
    try {
      const params = {};
      if (cashless_case_id) params.cashless_case_id = cashless_case_id;
      else if (claim_id) params.claim_id = claim_id;
      if (payer?.participant_code) params.payer_code = payer.participant_code;
      if (policy?.policyNumber || policy?.policy_number) params.policy_number = policy.policyNumber || policy.policy_number;

      const res = await api.preparePreauth(params);
      setDraft(res);
      setMissingFields(res.missing_fields ?? []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!caseState.cashless_case_id && !caseState.claim_id) {
      navigate("../payer", { replace: true });
      return;
    }
    loadDraft();
  }, []);

  const handleUpload = (doc) => {
    setDraft((prev) => ({
      ...prev,
      supporting_documents: prev.supporting_documents.map((d) =>
        d.code === doc.code ? { ...d, url: "https://hospital.example/mock/doc.pdf" } : d
      ),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body = {
        ...(cashless_case_id ? { cashless_case_id } : { claim_id: draft.claim_id }),
        ...(draft.payer_code && { payer_code: draft.payer_code }),
        ...(draft.policy_number && { policy_number: draft.policy_number }),
        ...(draft.eligibility?.correlation_id && {
          eligibility_correlation_id: draft.eligibility.correlation_id,
        }),
        total_amount: draft.total_amount,
        supporting_documents: draft.supporting_documents,
      };
      const res = await api.submitPreauth(body);
      updateCaseState({
        preauthCorrelationId: res.correlation_id,
        claim_id: draft.claim_id || claim_id,
      });
      navigate("../status");
    } catch (_) {
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center py-20 flex-col">
        <div className="spinner mb-4" />
        <p className="text-muted">Building preauth draft…</p>
      </div>
    );
  }

  const hasMissingFields = missingFields.length > 0;
  const hasMissingDocs = draft?.supporting_documents?.some((d) => !d.optional && !d.url);
  const canSubmit = !hasMissingFields && !hasMissingDocs && !submitting;

  return (
    <div className="wizard-step">
      {hasMissingFields && (
        <PatientContextForm
          claimId={draft?.claim_id || claim_id}
          missingFields={missingFields}
          onResolved={(remaining) => {
            setMissingFields(remaining);
            if (remaining.length === 0) loadDraft();
          }}
        />
      )}

      <div className="grid-1-to-3" style={{ gap: "24px" }}>
        <div style={{ gridColumn: "span 1", display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card title="Patient & Admission">
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "18px" }}>
                <User size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{draft?.patient?.name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {draft?.patient?.gender} · DOB: {draft?.patient?.dob}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "24px", fontSize: "13px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Admission</div>
                <div style={{ fontWeight: 600 }}>{draft?.admission_date || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>ABHA</div>
                <div style={{ fontWeight: 600 }}>{draft?.patient?.abha || "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Member ID</div>
                <div style={{ fontWeight: 600 }}>{draft?.patient?.member_id || "—"}</div>
              </div>
            </div>
          </Card>

          <Card title="Clinical Information">
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase" }}>Diagnoses</div>
              {draft?.diagnoses?.map((diag, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "8px", marginBottom: "8px" }}>
                  <span className="badge-modern badge-primary">ICD: {diag.code}</span>
                  <span style={{ fontSize: "14px", fontWeight: 600 }}>{diag.name}</span>
                  {diag.primary && (
                    <span className="badge-modern badge-success" style={{ marginLeft: "auto", fontSize: "10px" }}>PRIMARY</span>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase" }}>Line Items</div>
              <div className="table-responsive-wrapper">
                <table className="table-modern" style={{ fontSize: "13px" }}>
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: "right" }}>Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft?.items?.map((item, i) => (
                      <tr key={i}>
                        <td>{item.service_name} <code style={{ fontSize: "11px" }}>({item.service_code})</code></td>
                        <td>{item.quantity}</td>
                        <td>₹{item.unit_price?.toLocaleString()}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>₹{item.net_amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ textAlign: "right", fontWeight: 700 }}>Total Billed</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "var(--primary)", fontSize: "15px" }}>
                        ₹{draft?.total_amount?.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </Card>

          {draft?.care_team?.length > 0 && (
            <Card title="Care Team">
              {draft.care_team.map((doc, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid var(--border-color)" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
                    {doc.doc_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{doc.doc_name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {doc.speciality_display || doc.speciality}
                      {doc.registration_no && ` · Reg: ${doc.registration_no}`}
                    </div>
                    {doc.role && (
                      <span className="badge-modern badge-info" style={{ fontSize: "10px", marginTop: "4px" }}>{doc.role}</span>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card title="Required Documents">
            <DocumentChecklist documents={draft?.supporting_documents} onUpload={handleUpload} />
          </Card>

          <Card>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>Total Request</div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--primary)" }}>
                ₹{draft?.total_amount?.toLocaleString()}
              </div>
            </div>

            {hasMissingFields && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "10px", background: "rgba(239,68,68,0.06)", borderRadius: "8px", marginBottom: "12px", fontSize: "12px", color: "var(--error)", fontWeight: 600 }}>
                <AlertCircle size={14} />
                Resolve missing patient attributes above before submitting.
              </div>
            )}

            <Button
              variant="primary"
              className="w-full"
              icon={Send}
              disabled={!canSubmit}
              onClick={handleSubmit}
              style={{ justifyContent: "center" }}
            >
              {submitting ? "Submitting…" : "Submit to Payer"}
            </Button>

            {hasMissingDocs && !hasMissingFields && (
              <p style={{ fontSize: "11px", color: "var(--error)", textAlign: "center", marginTop: "12px", fontWeight: 600 }}>
                Upload all required documents before submitting.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
