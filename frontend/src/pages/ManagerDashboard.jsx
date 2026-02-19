/**
 * Manager Dashboard
 *
 * Provides an overview of all requests across all agents.
 * Features: KPI cards, filterable requests table, request detail panel, reassignment.
 */

import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseClient';
import { authenticatedFetch } from '../utils/api';

const ACTION_LABELS = {
  REQUEST_CREATED:    'Request created',
  STATUS_CHANGED:     'Status changed',
  NOTES_UPDATED:      'Notes updated',
  REMINDER_CONFIRMED: 'Customer reminded (call)',
  REQUEST_REOPENED:   'Request reopened',
  REVIEW_APPROVED:    'Approved by manager/agent',
  REVIEW_REJECTED:    'Rejected — customer must re-upload',
  REQUEST_REASSIGNED: 'Reassigned to another agent',
  CUSTOMER_SUBMITTED: 'Customer submitted documents'
};

const ACTION_ICONS = {
  REQUEST_CREATED:    '🆕',
  STATUS_CHANGED:     '🔄',
  NOTES_UPDATED:      '📝',
  REMINDER_CONFIRMED: '📞',
  REQUEST_REOPENED:   '🔓',
  REVIEW_APPROVED:    '✅',
  REVIEW_REJECTED:    '❌',
  REQUEST_REASSIGNED: '↩️',
  CUSTOMER_SUBMITTED: '📤'
};

const STATUS_COLORS = {
  OPEN:        { bg: '#d1ecf1', color: '#0c5460' },
  IN_PROGRESS: { bg: '#fff3cd', color: '#856404' },
  SUBMITTED:   { bg: '#cce5ff', color: '#004085' },
  COMPLETED:   { bg: '#d4edda', color: '#155724' },
  EXPIRED:     { bg: '#f8d7da', color: '#721c24' }
};

const REVIEW_COLORS = {
  PENDING:  { bg: '#e2e3e5', color: '#383d41' },
  APPROVED: { bg: '#d4edda', color: '#155724' },
  REJECTED: { bg: '#f8d7da', color: '#721c24' }
};

function StatusBadge({ status, colorMap }) {
  const style = colorMap[status] || { bg: '#e2e3e5', color: '#383d41' };
  return (
    <span style={{
      padding: '3px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      backgroundColor: style.bg,
      color: style.color
    }}>
      {status}
    </span>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      borderTop: `4px solid ${color}`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color }}>{value ?? '—'}</div>
      <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function ManagerDashboard() {
  const [kpis, setKpis] = useState(null);
  const [requests, setRequests] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgentId, setFilterAgentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [newAgentId, setNewAgentId] = useState('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [rejectedDocTypes, setRejectedDocTypes] = useState([]);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const navigate = useNavigate();

  const loadKPIs = async () => {
    const data = await authenticatedFetch('/api/manager/kpis');
    setKpis(data.kpis);
  };

  const loadAgents = async () => {
    const data = await authenticatedFetch('/api/manager/agents');
    setAgents(data.agents);
  };

  const loadRequests = async (status, agentId) => {
    const params = [];
    if (status) params.push(`status=${status}`);
    if (agentId) params.push(`agentId=${agentId}`);
    const url = '/api/manager/requests' + (params.length ? '?' + params.join('&') : '');
    const data = await authenticatedFetch(url);
    setRequests(data.requests);
  };

  // Initial load
  useEffect(() => {
    Promise.all([loadKPIs(), loadAgents(), loadRequests('', '')]).finally(() => setLoading(false));
  }, []);

  const handleApplyFilters = async () => {
    await loadRequests(filterStatus, filterAgentId);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleReassign = async () => {
    if (!newAgentId || !selected) return;
    setReassigning(true);
    setReassignError(null);
    try {
      await authenticatedFetch(`/api/manager/requests/${selected.id}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ newAgentId })
      });
      await Promise.all([loadKPIs(), loadRequests(filterStatus, filterAgentId)]);
      // Update selected with new agent name
      const newAgent = agents.find(a => a.id === newAgentId);
      setSelected(prev => ({ ...prev, agentId: newAgentId, agentName: newAgent?.name }));
      setNewAgentId('');
    } catch (err) {
      setReassignError(err.message);
    } finally {
      setReassigning(false);
    }
  };

  const loadRequestHistory = async (requestId) => {
    setHistoryLoading(true);
    setRequestHistory([]);
    try {
      const data = await authenticatedFetch(`/api/manager/requests/${requestId}/audit`);
      setRequestHistory(data.auditLogs || []);
    } catch {
      setRequestHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewDecision) return;
    if (reviewDecision === 'REJECT' && rejectedDocTypes.length === 0) return;
    setReviewing(true);
    setReviewError(null);
    try {
      await authenticatedFetch(`/api/manager/requests/${selected.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision: reviewDecision,
          comment: reviewComment,
          rejectedDocumentTypes: reviewDecision === 'REJECT' ? rejectedDocTypes : []
        })
      });
      setReviewDecision('');
      setReviewComment('');
      setRejectedDocTypes([]);
      setSelected(null);
      await Promise.all([loadKPIs(), loadRequests(filterStatus, filterAgentId)]);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewing(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    try { return new Date(ts).toLocaleDateString(); } catch { return 'N/A'; }
  };

  const getAgentName = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? agent.name : agentId?.slice(0, 8) + '…';
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  }

  const term = searchTerm.toLowerCase();
  const filteredRequests = term
    ? requests.filter(r =>
        r.customerName?.toLowerCase().includes(term) ||
        r.customerPhone?.toLowerCase().includes(term) ||
        r.requestNumber?.toLowerCase().includes(term)
      )
    : requests;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Manager Dashboard</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/manager/activity')}
            style={{ padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #ced4da', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: '#495057', fontWeight: '500' }}
          >
            Activity Log
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <KpiCard label="Total"       value={kpis.total}       color="#6c757d" />
          <KpiCard label="Open"        value={kpis.open}        color="#17a2b8" />
          <KpiCard label="In Progress" value={kpis.inProgress}  color="#ffc107" />
          <KpiCard label="Submitted"   value={kpis.submitted}   color="#007bff" />
          <KpiCard label="Approved"    value={kpis.approved}    color="#28a745" />
          <KpiCard label="Rejected"    value={kpis.rejected}    color="#dc3545" />
          <KpiCard label="Expired"     value={kpis.expired}     color="#6c757d" />
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Left: filters + table */}
        <div style={{ flex: 1 }}>
          {/* Filters + Search */}
          <div style={{
            backgroundColor: '#fff',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            marginBottom: '16px',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Search</label>
              <input
                type="text"
                placeholder="Name, phone or REQ-XXXX…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Filter by Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="COMPLETED">Completed</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Filter by Agent</label>
              <select
                value={filterAgentId}
                onChange={e => setFilterAgentId(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">All Agents</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleApplyFilters}
              style={{ padding: '6px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', marginTop: '18px' }}
            >
              Apply
            </button>
            {(filterStatus || filterAgentId || searchTerm) && (
              <button
                onClick={() => { setFilterStatus(''); setFilterAgentId(''); setSearchTerm(''); loadRequests('', ''); }}
                style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', marginTop: '18px' }}
              >
                Clear All
              </button>
            )}
            <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#6c757d', marginTop: '18px' }}>
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>Req #</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Customer</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Agent</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Review</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>
                      {searchTerm ? 'No requests match your search.' : 'No requests found.'}
                    </td>
                  </tr>
                ) : filteredRequests.map((r, index) => (
                  <tr
                    key={r.id}
                    onClick={() => { setSelected(r); setNewAgentId(''); setReassignError(null); setReviewDecision(''); setReviewComment(''); setRejectedDocTypes([]); setReviewError(null); loadRequestHistory(r.id); }}
                    style={{
                      borderBottom: '1px solid #dee2e6',
                      cursor: 'pointer',
                      backgroundColor: selected?.id === r.id ? '#e8f4fd' : index % 2 === 0 ? '#fff' : '#f8f9fa'
                    }}
                    onMouseEnter={e => { if (selected?.id !== r.id) e.currentTarget.style.backgroundColor = '#e8f4fd'; }}
                    onMouseLeave={e => { if (selected?.id !== r.id) e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#fff' : '#f8f9fa'; }}
                  >
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#495057', fontWeight: '600' }}>
                        {r.requestNumber || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600' }}>{r.customerName}</div>
                      <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '2px' }}>{r.customerPhone}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#495057' }}>{getAgentName(r.agentId)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={r.status} colorMap={STATUS_COLORS} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={r.reviewStatus || 'PENDING'} colorMap={REVIEW_COLORS} />
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6c757d', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div style={{
            width: '340px',
            flexShrink: 0,
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Request Detail</h3>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6c757d' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#6c757d' }}>CUSTOMER</p>
              <p style={{ margin: '0 0 4px', fontWeight: '600' }}>{selected.customerName}</p>
              <p style={{ margin: '0 0 4px', fontSize: '14px' }}>{selected.customerPhone}</p>
              {selected.customerEmail && <p style={{ margin: '0', fontSize: '14px' }}>{selected.customerEmail}</p>}
            </div>

            <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#6c757d' }}>STATUS</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <StatusBadge status={selected.status} colorMap={STATUS_COLORS} />
                <StatusBadge status={selected.reviewStatus || 'PENDING'} colorMap={REVIEW_COLORS} />
              </div>
              {selected.reviewComment && (
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#495057', fontStyle: 'italic' }}>
                  "{selected.reviewComment}"
                </p>
              )}
            </div>

            <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#6c757d' }}>DETAILS</p>
              {selected.requestNumber && <p style={{ margin: '0 0 4px', fontSize: '14px' }}><strong>Request #:</strong> <span style={{ fontFamily: 'monospace' }}>{selected.requestNumber}</span></p>}
              <p style={{ margin: '0 0 4px', fontSize: '14px' }}><strong>Agent:</strong> {getAgentName(selected.agentId)}</p>
              <p style={{ margin: '0 0 4px', fontSize: '14px' }}><strong>Completion:</strong> {selected.completionPercent}%</p>
              <p style={{ margin: '0 0 4px', fontSize: '14px' }}><strong>Created:</strong> {formatDate(selected.createdAt)}</p>
              {selected.dealerId && <p style={{ margin: '0 0 4px', fontSize: '14px' }}><strong>Customer ID:</strong> {selected.dealerId}</p>}
              {selected.vehicleId && <p style={{ margin: '0 0 4px', fontSize: '14px' }}><strong>Vehicle ID:</strong> {selected.vehicleId}</p>}
              {selected.notes && <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#495057' }}><strong>Notes:</strong> {selected.notes}</p>}
            </div>

            {/* Review — only for SUBMITTED + PENDING */}
            {selected.status === 'SUBMITTED' && selected.reviewStatus === 'PENDING' && (
              <div style={{ marginBottom: '16px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
                <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#6c757d' }}>REVIEW REQUEST</p>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                  <label style={{ cursor: 'pointer', fontSize: '14px' }}>
                    <input type="radio" name="mgr-review" value="APPROVE"
                      checked={reviewDecision === 'APPROVE'}
                      onChange={() => { setReviewDecision('APPROVE'); setRejectedDocTypes([]); }}
                      style={{ marginRight: '6px' }}
                    />
                    Approve
                  </label>
                  <label style={{ cursor: 'pointer', fontSize: '14px' }}>
                    <input type="radio" name="mgr-review" value="REJECT"
                      checked={reviewDecision === 'REJECT'}
                      onChange={() => setReviewDecision('REJECT')}
                      style={{ marginRight: '6px' }}
                    />
                    Reject
                  </label>
                </div>

                {reviewDecision === 'REJECT' && (
                  <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600' }}>Documents to re-upload: <span style={{ color: 'red' }}>*</span></p>
                    {['ID', 'LICENCE', 'PROOF_OF_ADDRESS', 'BANK_STATEMENT'].map(doc => (
                      <label key={doc} style={{ display: 'block', fontSize: '13px', marginBottom: '4px', cursor: 'pointer' }}>
                        <input type="checkbox"
                          checked={rejectedDocTypes.includes(doc)}
                          onChange={e => setRejectedDocTypes(prev =>
                            e.target.checked ? [...prev, doc] : prev.filter(t => t !== doc)
                          )}
                          style={{ marginRight: '6px' }}
                        />
                        {doc.replace(/_/g, ' ')}
                      </label>
                    ))}
                  </div>
                )}

                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows="2"
                  placeholder={reviewDecision === 'REJECT' ? 'Explain what needs fixing… (required)' : 'Optional comment'}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px', resize: 'vertical' }}
                />

                {reviewError && <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#dc3545' }}>{reviewError}</p>}

                <button
                  onClick={handleReview}
                  disabled={!reviewDecision || reviewing || (reviewDecision === 'REJECT' && rejectedDocTypes.length === 0) || (reviewDecision === 'REJECT' && !reviewComment)}
                  style={{
                    width: '100%',
                    padding: '9px',
                    backgroundColor: reviewDecision === 'REJECT' ? '#dc3545' : reviewDecision === 'APPROVE' ? '#28a745' : '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: (!reviewDecision || reviewing) ? 0.6 : 1
                  }}
                >
                  {reviewing ? 'Submitting…' : reviewDecision === 'REJECT' ? 'Confirm Rejection' : reviewDecision === 'APPROVE' ? 'Confirm Approval' : 'Select a decision'}
                </button>
              </div>
            )}

            {/* History */}
            <div style={{ paddingTop: '12px', borderTop: '1px solid #dee2e6', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#6c757d' }}>HISTORY</p>
              {historyLoading ? (
                <p style={{ fontSize: '13px', color: '#6c757d' }}>Loading…</p>
              ) : requestHistory.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#adb5bd' }}>No history yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {requestHistory.map(log => (
                    <div key={log.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>
                        {ACTION_ICONS[log.action] || '📋'}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#212529' }}>
                          {ACTION_LABELS[log.action] || log.action}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {formatDate(log.timestamp)}
                          {log.metadata?.comment && (
                            <span style={{ marginLeft: '6px', fontStyle: 'italic' }}>— "{log.metadata.comment}"</span>
                          )}
                          {log.action === 'REQUEST_REASSIGNED' && log.metadata?.newAgentName && (
                            <span style={{ marginLeft: '6px' }}>
                              {log.metadata.oldAgentName ? `${log.metadata.oldAgentName} → ` : ''}{log.metadata.newAgentName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reassign */}
            <div style={{ paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#6c757d' }}>REASSIGN TO ANOTHER AGENT</p>
              <select
                value={newAgentId}
                onChange={e => setNewAgentId(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px', marginBottom: '8px' }}
              >
                <option value="">Select an agent…</option>
                {agents.filter(a => a.id !== selected.agentId).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {reassignError && (
                <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#dc3545' }}>{reassignError}</p>
              )}
              <button
                onClick={handleReassign}
                disabled={!newAgentId || reassigning}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: newAgentId ? '#007bff' : '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: newAgentId && !reassigning ? 'pointer' : 'not-allowed',
                  opacity: reassigning ? 0.6 : 1,
                  fontSize: '14px'
                }}
              >
                {reassigning ? 'Reassigning…' : 'Reassign Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagerDashboard;
