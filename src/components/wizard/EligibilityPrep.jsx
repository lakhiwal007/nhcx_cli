import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, AlertCircle, RefreshCw, Clock } from "lucide-react";
import { api } from "../../api";
import { Card, Button, StatusBadge } from "../Common";

const POLL_INTERVAL_MS = 7000;
const TERMINAL_STATUSES = ["complete", "failed"];

function InsurancePlanPanel({ plan }) {
  if (!plan) return null;
  return (
    <Card title="Insurance Plan">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <StatusBadge status={plan.status} />
        {plan.correlation_id && (
          <code style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {plan.correlation_id.slice(0, 24)}…
          </code>
        )}
      </div>

      {plan.status === "pending" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px", padding: "8px 0" }}>
          <Clock size={14} /> Awaiting insurer response…
        </div>
      )}

      {plan.status === "complete" && (
        <>
          {plan.pricing && (
            <div style={{ padding: "8px 12px", background: "var(--bg-main)", borderRadius: "8px", marginBottom: "12px", fontSize: "13px" }}>
              Sum Insured:{" "}
              <strong style={{ color: "var(--primary)" }}>
                {plan.pricing.currency} {plan.pricing.sum_insured?.toLocaleString()}
              </strong>
            </div>
          )}
          {plan.inclusions?.length > 0 && (
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Inclusions</div>
              {plan.inclusions.map((inc, i) => (
                <div key={i} style={{ fontSize: "12px", padding: "4px 0", display: "flex", gap: "8px", alignItems: "center", borderBottom: "1px solid var(--border-color)" }}>
                  <span className="badge-modern badge-success" style={{ fontSize: "10px" }}>{inc.code}</span>
                  {inc.name}
                </div>
              ))}
            </div>
          )}
          {plan.exclusions?.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Exclusions</div>
              {plan.exclusions.map((exc, i) => (
                <div key={i} style={{ fontSize: "12px", padding: "4px 0", display: "flex", gap: "8px", alignItems: "center", borderBottom: "1px solid var(--border-color)" }}>
                  <span className="badge-modern badge-error" style={{ fontSize: "10px" }}>{exc.code}</span>
                  {exc.name}
                </div>
              ))}
            </div>
          )}
          {plan.document_requirements?.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Required Documents</div>
              {plan.document_requirements.map((d, i) => (
                <div key={i} style={{ fontSize: "12px", display: "flex", gap: "6px", alignItems: "center", padding: "3px 0" }}>
                  <FileText size={12} color="var(--text-muted)" /> {d.name}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {plan.errors?.length > 0 && (
        <div style={{ marginTop: "8px" }}>
          {plan.errors.map((err, i) => (
            <div key={i} style={{ fontSize: "12px", color: "var(--error)", background: "rgba(239,68,68,0.05)", borderRadius: "6px", padding: "6px 8px", marginBottom: "4px" }}>
              {err.message || err.code}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CoverageEligibilityPanel({ ce }) {
  if (!ce) return null;
  const allItems = ce.insurance_items?.flatMap((ins) => ins.items || []) ?? [];
  return (
    <Card title="Coverage Eligibility">
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        <StatusBadge status={ce.status} />
        {ce.inforce !== null && ce.inforce !== undefined && (
          <span className={`badge-modern badge-${ce.inforce ? "success" : "error"}`} style={{ fontSize: "10px" }}>
            {ce.inforce ? "IN-FORCE" : "NOT IN-FORCE"}
          </span>
        )}
        {ce.auth_required !== null && ce.auth_required !== undefined && (
          <span className={`badge-modern badge-${ce.auth_required ? "warning" : "success"}`} style={{ fontSize: "10px" }}>
            {ce.auth_required ? "PREAUTH REQUIRED" : "NO PREAUTH NEEDED"}
          </span>
        )}
      </div>

      {ce.status === "pending" && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px", padding: "8px 0" }}>
          <Clock size={14} /> Awaiting payer eligibility response…
        </div>
      )}

      {ce.disposition && (
        <div style={{ fontSize: "13px", marginBottom: "12px", color: "var(--text-main)" }}>{ce.disposition}</div>
      )}

      {allItems.length > 0 && (
        <div className="table-responsive-wrapper">
          <table className="table-modern" style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Auth Req.</th>
                <th style={{ textAlign: "right" }}>Allowed</th>
                <th style={{ textAlign: "right" }}>Used</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.product_or_service?.display || item.product_or_service?.code}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.category?.display}</div>
                  </td>
                  <td>
                    <span className={`badge-modern badge-${item.authorization_required ? "warning" : "success"}`} style={{ fontSize: "10px" }}>
                      {item.authorization_required ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {item.benefit?.[0]?.allowed?.value != null
                      ? `₹${item.benefit[0].allowed.value.toLocaleString()}`
                      : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {item.benefit?.[0]?.used?.value != null
                      ? `₹${item.benefit[0].used.value.toLocaleString()}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ce.errors?.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          {ce.errors.map((err, i) => (
            <div key={i} style={{ fontSize: "12px", color: "var(--warning)", background: "rgba(245,158,11,0.08)", borderRadius: "6px", padding: "6px 8px", marginBottom: "4px" }}>
              {err.detail || err.code?.display || err.message}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function EligibilityPrep({ ctx }) {
  const navigate = useNavigate();
  const { patient, caseState, setCashlessCase, updateCaseState } = ctx;
  const { payer, policy, admission_id } = caseState;

  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!patient || !payer || !policy) {
      navigate("../payer", { replace: true });
      return;
    }

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.prepareCashless({
          child_id: patient.child_id,
          payer_code: payer.participant_code,
          policy_number: policy.policy_number,
          ...(admission_id && { admission_id }),
        });
        setCaseData(res);
        setCashlessCase(res);
        updateCaseState({
          cashless_case_id: res.cashless_case_id,
          claim_id: res.claim_id,
          eligibility_correlation_id: res.coverage_eligibility?.correlation_id,
        });
        if (!TERMINAL_STATUSES.includes(res.status)) {
          setPolling(true);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!polling || !caseData?.cashless_case_id) return;
    const doPoll = async () => {
      try {
        const res = await api.getCashlessStatus(caseData.cashless_case_id);
        setCaseData(res);
        updateCaseState({
          eligibility_correlation_id: res.coverage_eligibility?.correlation_id,
        });
        if (TERMINAL_STATUSES.includes(res.status)) {
          setPolling(false);
        }
      } catch (_) {}
    };
    pollRef.current = setInterval(doPoll, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [polling, caseData?.cashless_case_id]);

  const manualRefresh = () => {
    if (!polling && caseData?.cashless_case_id) setPolling(true);
  };

  if (loading) {
    return (
      <div className="flex-center py-20 flex-col">
        <div className="spinner mb-4" />
        <p className="text-muted">Initiating eligibility preparation…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
          <AlertCircle color="var(--error)" size={24} />
          <div>
            <div style={{ fontWeight: 700, color: "var(--error)" }}>Preparation failed</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{error}</div>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("../payer")}>← Back to Payer</Button>
      </Card>
    );
  }

  const isComplete = caseData?.status === "complete";
  const isFailed = caseData?.status === "failed";
  const canProceed = isComplete && caseData?.next_actions?.includes("prepare_preauth");

  return (
    <div className="wizard-step">
      <Card className="mb-6">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {polling ? (
              <div className="spinner" style={{ width: "24px", height: "24px", borderTopColor: "var(--warning)" }} />
            ) : (
              <CheckCircle2 size={24} color={isComplete ? "var(--success)" : "var(--text-muted)"} />
            )}
            <div>
              <div style={{ fontWeight: 700 }}>
                Cashless Case {caseData?.cashless_case_id ? `#${caseData.cashless_case_id}` : ""}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {caseData?.current_step?.replace(/_/g, " ")}
                {polling ? " — polling for updates…" : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <StatusBadge status={caseData?.status} />
            {!polling && !isComplete && !isFailed && (
              <Button variant="outline" size="small" icon={RefreshCw} onClick={manualRefresh}>
                Refresh
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid-1-to-2" style={{ gap: "24px", marginBottom: "24px" }}>
        <InsurancePlanPanel plan={caseData?.insurance_plan} />
        <CoverageEligibilityPanel ce={caseData?.coverage_eligibility} />
      </div>

      <Card title="Procedures" className="mb-6">
        {caseData?.procedures?.source && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>
            Source: <strong>{caseData.procedures.source}</strong>
          </div>
        )}
        {caseData?.procedures?.items?.length > 0 ? (
          caseData.procedures.items.map((proc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid var(--border-color)", fontSize: "13px" }}>
              <FileText size={14} color="var(--primary)" />
              <span style={{ fontWeight: 600 }}>{proc.name}</span>
              <code style={{ fontSize: "11px", color: "var(--text-muted)" }}>({proc.code})</code>
              {proc.category && (
                <span className="badge-modern badge-info" style={{ fontSize: "10px", marginLeft: "auto" }}>{proc.category}</span>
              )}
            </div>
          ))
        ) : (
          <div className="text-muted" style={{ fontSize: "13px" }}>No procedures found in clinical records for this visit.</div>
        )}
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Button variant="text" onClick={() => navigate("../payer")}>← Back</Button>
        <Button variant="primary" disabled={!canProceed} onClick={() => navigate("../review")}>
          {polling ? "Awaiting Eligibility…" : canProceed ? "Proceed to Preauth Draft" : isComplete ? "Preparing…" : "Eligibility Pending"}
          <ArrowRight size={18} style={{ marginLeft: "8px" }} />
        </Button>
      </div>
    </div>
  );
}
