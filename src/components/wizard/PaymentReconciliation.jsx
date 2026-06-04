import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "../../api";
import { Card, Button, StatusBadge } from "../Common";

export default function PaymentReconciliation({ ctx }) {
  const navigate = useNavigate();
  const { caseState } = ctx;

  const claimId = caseState.claim_id || caseState.draftData?.claim_id;
  const claimCorrelationId = caseState.claimCorrelationId;

  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [acknowledging, setAcknowledging] = useState({});
  const [ackResults, setAckResults] = useState({});

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const res = claimId
        ? await api.searchPaymentStatus({ claim_id: claimId })
        : claimCorrelationId
        ? await api.getPaymentStatus(claimCorrelationId)
        : await api.searchPaymentStatus({});
      setPaymentData(res);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayment();
  }, []);

  const handleAcknowledge = async (event) => {
    const ref = event.payment_reference;
    setAcknowledging((prev) => ({ ...prev, [ref]: true }));
    try {
      const res = await api.acknowledgePayment({ payment_reference: ref });
      setAckResults((prev) => ({ ...prev, [ref]: { success: true, correlation_id: res.correlation_id } }));
      await fetchPayment();
    } catch (err) {
      setAckResults((prev) => ({ ...prev, [ref]: { success: false, message: err.message } }));
    } finally {
      setAcknowledging((prev) => ({ ...prev, [ref]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex-center py-20 flex-col">
        <div className="spinner mb-4" />
        <p className="text-muted">Fetching payment status…</p>
      </div>
    );
  }

  const isNotFound = !paymentData || paymentData.status === "not_found" || paymentData.total_events === 0;

  return (
    <div className="wizard-step">
      <Card title="Payment Reconciliation">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {paymentData?.settled && (
              <span className="badge-modern badge-success">SETTLED</span>
            )}
            {paymentData?.latest_stage && (
              <span className="badge-modern badge-info" style={{ fontSize: "11px" }}>
                {paymentData.latest_stage?.replace("PAYMENT_", "")}
              </span>
            )}
            {paymentData?.total_events != null && (
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {paymentData.total_events} event{paymentData.total_events !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Button variant="outline" size="small" icon={RefreshCw} onClick={fetchPayment}>Refresh</Button>
        </div>

        {isNotFound ? (
          <div className="empty-view py-10 text-center">
            <h3>No Payment Events Yet</h3>
            <p className="text-muted">The payer initiates payment notices on their schedule — typically hours to days after claim approval. The backend will auto-acknowledge when it arrives.</p>
          </div>
        ) : (
          <div>
            {paymentData?.settled && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", padding: "14px 16px", background: "rgba(16,185,129,0.1)", borderRadius: "12px", border: "1px solid var(--success)" }}>
                <CheckCircle2 color="var(--success)" size={26} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--success)" }}>Payment Settled</div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>All payment events for this claim are shown below.</div>
                </div>
              </div>
            )}

            <div className="table-responsive-wrapper">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Payment Ref</th>
                    <th>Date</th>
                    <th>Stage</th>
                    <th style={{ textAlign: "right" }}>Gross</th>
                    <th style={{ textAlign: "right" }}>TDS</th>
                    <th style={{ textAlign: "right" }}>Net Paid</th>
                    <th>UTR</th>
                    <th>Ack</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentData.events?.map((pay, i) => {
                    const ref = pay.payment_reference;
                    const ackResult = ackResults[ref];
                    const isAcknowledging = acknowledging[ref];
                    const needsRetry = pay.acknowledgement_status === "failed" && !ackResult?.success;
                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{ref}</td>
                        <td style={{ fontSize: "12px" }}>{pay.payment_date || "—"}</td>
                        <td>
                          <StatusBadge status={pay.payment_stage?.replace("PAYMENT_", "").toLowerCase()} />
                        </td>
                        <td style={{ textAlign: "right" }}>₹{pay.gross_amount?.toLocaleString()}</td>
                        <td style={{ textAlign: "right", color: "var(--error)" }}>-₹{pay.tds_amount?.toLocaleString()}</td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--success)" }}>
                          ₹{pay.net_payment_amount?.toLocaleString()}
                        </td>
                        <td>{pay.utr ? <code style={{ fontSize: "11px" }}>{pay.utr}</code> : <span className="text-muted">—</span>}</td>
                        <td>
                          {pay.acknowledgement_status === "submitted" && !needsRetry ? (
                            <span className="badge-modern badge-success" style={{ fontSize: "10px" }}>Acked</span>
                          ) : pay.acknowledgement_status === "pending" ? (
                            <span className="badge-modern badge-info" style={{ fontSize: "10px" }}>Pending</span>
                          ) : (
                            <div>
                              <Button
                                size="small"
                                variant="outline"
                                disabled={isAcknowledging}
                                onClick={() => handleAcknowledge(pay)}
                              >
                                {isAcknowledging ? "…" : "Retry Ack"}
                              </Button>
                              {pay.acknowledgement_error && (
                                <div style={{ fontSize: "10px", color: "var(--error)", marginTop: "4px" }}>{pay.acknowledgement_error}</div>
                              )}
                            </div>
                          )}
                          {ackResult && (
                            <div style={{ fontSize: "10px", color: ackResult.success ? "var(--success)" : "var(--error)", marginTop: "4px" }}>
                              {ackResult.success ? "Submitted ✓" : ackResult.message}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        <Button variant="primary" onClick={() => navigate("/dashboard")} icon={Home}>
          Done & Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
