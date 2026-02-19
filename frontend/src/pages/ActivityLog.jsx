/**
 * Activity Log Page
 *
 * Global feed of all actions across all requests — manager only.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseClient';
import { authenticatedFetch } from '../utils/api';

const ACTION_LABELS = {
  REQUEST_CREATED:    'Request created',
  STATUS_CHANGED:     'Status changed',
  NOTES_UPDATED:      'Notes updated',
  REMINDER_CONFIRMED: 'Customer reminded (call)',
  REQUEST_REOPENED:   'Request reopened',
  REVIEW_APPROVED:    'Approved',
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

const ACTION_COLORS = {
  REQUEST_CREATED:    '#17a2b8',
  STATUS_CHANGED:     '#ffc107',
  NOTES_UPDATED:      '#6c757d',
  REMINDER_CONFIRMED: '#fd7e14',
  REQUEST_REOPENED:   '#6f42c1',
  REVIEW_APPROVED:    '#28a745',
  REVIEW_REJECTED:    '#dc3545',
  REQUEST_REASSIGNED: '#007bff',
  CUSTOMER_SUBMITTED: '#20c997'
};

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
}

function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    authenticatedFetch('/api/manager/activity?limit=200')
      .then(data => setLogs((data.logs || []).filter(l => l.action !== 'CUSTOMER_UPLOADED_DOCUMENT')))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const term = search.toLowerCase();
  const filtered = term
    ? logs.filter(l =>
        l.actorName?.toLowerCase().includes(term) ||
        l.requestNumber?.toLowerCase().includes(term) ||
        l.customerName?.toLowerCase().includes(term) ||
        ACTION_LABELS[l.action]?.toLowerCase().includes(term)
      )
    : logs;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/manager')}
            style={{ padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #ced4da', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', color: '#495057' }}
          >
            ← Manager Dashboard
          </button>
          <h1 style={{ margin: 0 }}>Activity Log</h1>
        </div>
        <button
          onClick={handleLogout}
          style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* Search + count */}
      <div style={{
        backgroundColor: '#fff',
        padding: '14px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <input
          type="text"
          placeholder="Search by agent, customer, REQ# or action…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '14px' }}
        />
        <span style={{ fontSize: '13px', color: '#6c757d', whiteSpace: 'nowrap' }}>
          {filtered.length} event{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Feed */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', padding: '8px 0' }}>
        {loading && (
          <p style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>Loading…</p>
        )}
        {error && (
          <p style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>{error}</p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p style={{ padding: '40px', textAlign: 'center', color: '#adb5bd' }}>
            {search ? 'No events match your search.' : 'No activity yet.'}
          </p>
        )}
        {!loading && !error && filtered.map((log, i) => {
          const color = ACTION_COLORS[log.action] || '#6c757d';
          return (
            <div
              key={log.id}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '14px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid #f1f3f5' : 'none',
                alignItems: 'flex-start'
              }}
            >
              {/* Coloured dot + icon */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: color + '20',
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0
              }}>
                {ACTION_ICONS[log.action] || '📋'}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#212529' }}>
                    {ACTION_LABELS[log.action] || log.action}
                  </span>
                  <span style={{ fontSize: '12px', color: '#adb5bd', whiteSpace: 'nowrap' }}>
                    {formatTime(log.timestamp)}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '3px' }}>
                  <span style={{ fontWeight: '500', color: '#495057' }}>{log.actorName}</span>
                  {log.requestNumber && (
                    <span>
                      {' · '}
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', backgroundColor: '#f1f3f5', padding: '1px 5px', borderRadius: '3px' }}>
                        {log.requestNumber}
                      </span>
                    </span>
                  )}
                  {log.customerName && (
                    <span style={{ marginLeft: '6px' }}>— {log.customerName}</span>
                  )}
                </div>

                {/* Extra detail from metadata */}
                {log.metadata?.comment && (
                  <div style={{ fontSize: '12px', color: '#868e96', marginTop: '4px', fontStyle: 'italic' }}>
                    "{log.metadata.comment}"
                  </div>
                )}
                {log.action === 'REQUEST_REASSIGNED' && log.metadata?.newAgentName && (
                  <div style={{ fontSize: '12px', color: '#868e96', marginTop: '4px' }}>
                    {log.metadata.oldAgentName
                      ? <><strong>From:</strong> {log.metadata.oldAgentName} &nbsp;→&nbsp; <strong>To:</strong> {log.metadata.newAgentName}</>
                      : <><strong>Assigned to:</strong> {log.metadata.newAgentName}</>
                    }
                  </div>
                )}
                {log.metadata?.rejectedDocumentTypes?.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#868e96', marginTop: '4px' }}>
                    Docs to re-upload: {log.metadata.rejectedDocumentTypes.map(d => d.replace(/_/g, ' ')).join(', ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActivityLog;
