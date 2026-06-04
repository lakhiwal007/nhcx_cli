import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Send, ArrowRight, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../api";
import { Card, Button, DocumentChecklist, DecisionBanner, AmountGrid, MissingFieldsAlert } from "../Common";

const POLL_INTERVAL_MS = 7000;
const PATIENT_CONTEXT_FIELDS = [
  { key: "abha", label: "ABHA Number", placeholder: "91-XXXX-XXXX-XXXX" },
  { key: "member_id", label: "Member / PMJAY ID", placeholder: "PMJAY-MEM-XXXXX" },
  { key: "dob", label: "Date of Birth", type: "date" },
  { key: "admission_date", label: "Admission Date", type: "date" },
  { key: "discharge_date", label: "Discharge Date", type: "date" },
];

function Drawer({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 90 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(520px, 95vw)", background: "var(--bg-card)", borderLeft: "1px solid var(--border-color)", zIndex: 91, display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>{title}</h3>
              <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                <X size={22} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PatientContextForm({ claimId, onResolved }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patchPatientContext(claimId, { patient_context: values });
      onResolved(res.missing_fields ?? []);
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {PATIENT_CONTEXT_FIELDS.map((f) => (
        <div key={f.key}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>{f.label}</label>
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
  );
}

export default function ClaimsScreen({ ctx }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { caseState, updateCaseState } = ctx;

  const [loading, setLoading] = useState(true);
  const [claimDraft, setClaimDraft] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(location.state?.tab || "draft");

  const [dischargeCorrelationId, setDischargeCorrelationId] = useState(null);
  const [finalCorrelationId, setFinalCorrelationId] = useState(
    caseState.claimCorrelationId || null
  );
  const [claimStatus, setClaimStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  const [showQueryDrawer, setShowQueryDrawer] = useState(false);
  const [showResubmitDrawer, setShowResubmitDrawer] = useState(false);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [queryAnswer, setQueryAnswer] = useState("");

  // caseState.claim_id may be null (set from cashless prepare), so always prefer location.state if caseState has null
  const claimId = caseState.claim_id || location.state?.claim_id;

  const loadDraft = async (id, params) => {
    setLoading(true);
    try {
      const queryParams = params || (id || claimId ? { claim_id: id || claimId } : {});
      const res = await api.prepareClaimDraft(queryParams);
      setClaimDraft(res);
      setMissingFields(res.missing_fields ?? []);
      // Persist claim_id if backend returns one and we don't already have a valid one
      if (res.claim_id && !claimId) {
        updateCaseState({ claim_id: res.claim_id });
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (finalCorrelationId) {
      setActiveTab("decision");
      setPolling(true);
    } else {
      const resolvedClaimId = caseState.claim_id || location.state?.claim_id;
      const resolvedCashlessCaseId = caseState.cashless_case_id;

      if (!resolvedClaimId && !resolvedCashlessCaseId) {
        // Show a no-claim-id error state rather than making a broken API call
        setLoading(false);
        setClaimDraft({ _error: "No claim ID available. Please complete the preauth step first." });
        return;
      }

      const params = {};
      if (resolvedClaimId) params.claim_id = resolvedClaimId;
      else if (resolvedCashlessCaseId) params.cashless_case_id = resolvedCashlessCaseId;

      loadDraft(null, params);
    }
  }, []);

  useEffect(() => {
    if (!polling || !finalCorrelationId) {
      clearInterval(pollRef.current);
      return;
    }
    const doPoll = async () => {
      try {
        const res = await api.getClaimStatus(finalCorrelationId);
        setClaimStatus(res);
        if (res.status === "complete" || res.status === "not_found") {
          setPolling(false);
          clearInterval(pollRef.current);
        }
      } catch (_) {}
    };
    doPoll();
    pollRef.current = setInterval(doPoll, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [polling, finalCorrelationId]);

  const handleUpload = (doc) => {
    setClaimDraft((prev) => ({
      ...prev,
      supporting_documents: prev.supporting_documents.map((d) =>
        d.code === doc.code ? { ...d, url: "https://hospital.example/mock/doc.pdf" } : d
      ),
    }));
  };

  const handleSubmitDischarge = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitDischargeClaim({
        claim_id: claimDraft.claim_id,
        supporting_documents: claimDraft.supporting_documents,
      });
      setDischargeCorrelationId(res.correlation_id);
      setActiveTab("final");
    } catch (_) {
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitFinal = async () => {
    setSubmitting(true);
    try {
      const res = await api.submitFinalClaim({
        claim_id: claimDraft.claim_id,
        supporting_documents: claimDraft.supporting_documents,
      });
      setFinalCorrelationId(res.correlation_id);
      updateCaseState({ claimCorrelationId: res.correlation_id });
      setActiveTab("decision");
      setPolling(true);
    } catch (_) {
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuerySubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.respondClaimQuery({
        claim_id: claimDraft?.claim_id || claimId,
        ...(queryAnswer && {
          questionnaire_response: {
            status: "completed",
            item: [{ linkId: "query-1", answer: [{ valueString: queryAnswer }] }],
          },
        }),
      });
      setShowQueryDrawer(false);
      setFinalCorrelationId(res.correlation_id);
      updateCaseState({ claimCorrelationId: res.correlation_id });
      setActiveTab("decision");
      setPolling(true);
    } catch (_) {
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmitClaim = async () => {
    setSubmitting(true);
    try {
      const res = await api.resubmitClaim({ claim_id: claimDraft?.claim_id || claimId });
      setShowResubmitDrawer(false);
      setFinalCorrelationId(res.correlation_id);
      updateCaseState({ claimCorrelationId: res.correlation_id });
      setActiveTab("decision");
      setPolling(true);
    } catch (_) {
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: "draft", label: "Claim Draft" },
    { id: "discharge", label: "Discharge Claim" },
    { id: "final", label: "Final Claim" },
    { id: "decision", label: "Claim Decision" },
  ];

  const hasMissingFields = missingFields.length > 0;
  const hasPreauthRef = !!claimDraft?.preauth_ref;
  const hasMissingDocs = claimDraft?.supporting_documents?.some((d) => !d.optional && !d.url);
  const canSubmit = !hasMissingFields && hasPreauthRef && !hasMissingDocs && !submitting;

  const claimDecision = claimStatus?.decision;
  const isClaimQueried = claimDecision === "QUERIED";
  const isClaimRejected = claimDecision === "REJECTED" || claimDecision === "PARTIALLY_APPROVED";

  if (loading) {
    return (
      <div className="flex-center py-20 flex-col">
        <div className="spinner mb-4" />
        <p className="text-muted">Building claim draft…</p>
      </div>
    );
  }

  if (claimDraft?._error) {
    return (
      <Card>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "8px 0" }}>
          <AlertCircle size={22} color="var(--error)" />
          <div>
            <div style={{ fontWeight: 700, color: "var(--error)", marginBottom: "4px" }}>Cannot load claim</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{claimDraft._error}</div>
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <Button variant="outline" onClick={() => navigate("../status")}>← Back to Preauth Status</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="wizard-step">
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "24px", overflowX: "auto" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 20px",
              background: activeTab === tab.id ? "var(--primary)" : "transparent",
              color: activeTab === tab.id ? "white" : "var(--text-muted)",
              border: `1px solid ${activeTab === tab.id ? "var(--primary)" : "var(--border-color)"}`,
              borderRadius: "20px",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? 600 : 400,
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "draft" && (
        <Card title="Claim Draft">
          {hasMissingFields && (
            <div style={{ marginBottom: "16px" }}>
              <MissingFieldsAlert fields={missingFields} onResolve={() => setShowContextDrawer(true)} />
            </div>
          )}
          {!hasPreauthRef && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid var(--error)", borderRadius: "10px", marginBottom: "16px", fontSize: "13px", color: "var(--error)", fontWeight: 600 }}>
              <AlertCircle size={14} />
              No approved preauth reference on this claim. Submit and await preauth before proceeding.
            </div>
          )}
          <div style={{ display: "flex", gap: "24px", marginBottom: "20px", fontSize: "13px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Admission</div>
              <div style={{ fontWeight: 600 }}>{claimDraft?.admission_date || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Discharge</div>
              <div style={{ fontWeight: 600 }}>{claimDraft?.discharge_date || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Preauth Ref</div>
              <div style={{ fontWeight: 600, color: hasPreauthRef ? "var(--primary)" : "var(--error)" }}>
                {claimDraft?.preauth_ref || "Missing"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Total</div>
              <div style={{ fontWeight: 700, color: "var(--primary)" }}>₹{claimDraft?.total_amount?.toLocaleString()}</div>
            </div>
          </div>
          <div className="table-responsive-wrapper" style={{ marginBottom: "20px" }}>
            <table className="table-modern" style={{ fontSize: "13px" }}>
              <thead>
                <tr>
                  <th>Final Bill Items</th>
                  <th>Qty</th>
                  <th style={{ textAlign: "right" }}>Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {claimDraft?.items?.map((item, i) => (
                  <tr key={i}>
                    <td>{item.service_name}</td>
                    <td>{item.quantity}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>₹{item.net_amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" disabled={!hasPreauthRef || hasMissingFields} onClick={() => setActiveTab("discharge")}>
              Proceed to Discharge Docs <ArrowRight size={16} style={{ marginLeft: "8px" }} />
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "discharge" && (
        <Card title="Discharge Documents">
          <DocumentChecklist documents={claimDraft?.supporting_documents} onUpload={handleUpload} />
          {dischargeCorrelationId && (
            <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.06)", border: "1px solid var(--success)", borderRadius: "8px", fontSize: "12px", marginBottom: "16px" }}>
              Discharge claim submitted — correlation: <code>{dischargeCorrelationId}</code>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
            <Button variant="text" onClick={() => setActiveTab("draft")}>Back</Button>
            <Button
              variant="primary"
              disabled={!canSubmit || !!dischargeCorrelationId}
              onClick={handleSubmitDischarge}
            >
              {submitting ? "Submitting…" : dischargeCorrelationId ? "Discharge Submitted ✓" : "Submit Discharge Claim"}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "final" && (
        <Card title="Final Claim">
          <div style={{ display: "flex", gap: "24px", marginBottom: "20px", fontSize: "13px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Discharge</div>
              <div style={{ fontWeight: 600 }}>{claimDraft?.discharge_date || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Preauth Ref</div>
              <div style={{ fontWeight: 600 }}>{claimDraft?.preauth_ref || "—"}</div>
            </div>
          </div>
          <div className="table-responsive-wrapper" style={{ marginBottom: "24px" }}>
            <table className="table-modern" style={{ fontSize: "13px" }}>
              <thead>
                <tr>
                  <th>Final Bill Items</th>
                  <th>Qty</th>
                  <th style={{ textAlign: "right" }}>Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {claimDraft?.items?.map((item, i) => (
                  <tr key={i}>
                    <td>{item.service_name}</td>
                    <td>{item.quantity}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>₹{item.net_amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: "center", marginBottom: "16px", padding: "20px", background: "var(--bg-main)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>Final Claim Total</div>
            <div style={{ fontSize: "32px", fontWeight: 800, color: "var(--primary)" }}>₹{claimDraft?.total_amount?.toLocaleString()}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="primary"
              size="large"
              icon={Send}
              disabled={!canSubmit || submitting}
              onClick={handleSubmitFinal}
            >
              {submitting ? "Submitting…" : "Submit Final Claim"}
            </Button>
          </div>
        </Card>
      )}

      {activeTab === "decision" && (
        <div>
          {(!claimStatus || polling) ? (
            <Card className="mb-6">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="spinner" style={{ width: "24px", height: "24px" }} />
                <div>
                  <div style={{ fontWeight: 700 }}>Claim Adjudication in Progress</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {finalCorrelationId} · polling every {POLL_INTERVAL_MS / 1000}s
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <DecisionBanner decision={claimDecision} approvedAmount={claimStatus?.approved_amount} />
              <Card title="Adjudication Summary" className="mb-6">
                <AmountGrid totals={claimStatus?.totals} />
              </Card>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Button variant="outline" onClick={() => navigate("/")}>Save & Close</Button>
                <div style={{ display: "flex", gap: "12px" }}>
                  {isClaimQueried && (
                    <>
                      <Button variant="outline" onClick={() => setShowQueryDrawer(true)}>Respond to Query</Button>
                      <Button variant="outline" onClick={() => setShowResubmitDrawer(true)}>Resubmit Claim</Button>
                    </>
                  )}
                  {isClaimRejected && (
                    <>
                      <Button variant="outline" onClick={() => setShowResubmitDrawer(true)}>Resubmit Claim</Button>
                      <Button variant="outline" onClick={() => navigate("../reprocess")}>Appeal / Reprocess</Button>
                    </>
                  )}
                  <Button variant="primary" onClick={() => navigate("../payment")}>
                    Proceed to Payment <ArrowRight size={18} style={{ marginLeft: "8px" }} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <Drawer open={showQueryDrawer} onClose={() => setShowQueryDrawer(false)} title="Respond to Claim Query">
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
          Provide a clarification and attach any documents the payer requested.
        </p>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Clarification</label>
          <textarea
            className="input-modern"
            style={{ height: "100px", resize: "vertical" }}
            placeholder="Describe your response to the payer's query…"
            value={queryAnswer}
            onChange={(e) => setQueryAnswer(e.target.value)}
          />
        </div>
        <Button variant="primary" className="w-full" disabled={!queryAnswer || submitting} onClick={handleQuerySubmit} style={{ justifyContent: "center" }}>
          {submitting ? "Submitting…" : "Submit Response"}
        </Button>
      </Drawer>

      <Drawer open={showResubmitDrawer} onClose={() => setShowResubmitDrawer(false)} title="Resubmit Claim">
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
          Correct clinical or billing data. Only the fields you change are sent; everything else is re-derived from the hospital DB.
        </p>
        <div className="table-responsive-wrapper" style={{ marginBottom: "20px" }}>
          <table className="table-modern" style={{ fontSize: "13px" }}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Qty</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {claimDraft?.items?.map((item, i) => (
                <tr key={i}>
                  <td>{item.service_name}</td>
                  <td>{item.quantity}</td>
                  <td style={{ textAlign: "right" }}>₹{item.net_amount?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="primary" className="w-full" disabled={submitting} onClick={handleResubmitClaim} style={{ justifyContent: "center" }}>
          {submitting ? "Resubmitting…" : "Resubmit Claim"}
        </Button>
      </Drawer>

      <Drawer open={showContextDrawer} onClose={() => setShowContextDrawer(false)} title="Supply Missing Patient Attributes">
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
          These attributes are required by NHCX but could not be resolved from the hospital DB. They are saved to the cashless case and do not need to be re-sent on submission.
        </p>
        <PatientContextForm
          claimId={claimDraft?.claim_id || claimId}
          onResolved={(remaining) => {
            setMissingFields(remaining);
            if (remaining.length === 0) {
              setShowContextDrawer(false);
              loadDraft(claimDraft?.claim_id || claimId);
            }
          }}
        />
      </Drawer>
    </div>
  );
}
