require('dotenv').config();
const { admin, db } = require('../src/firebase');
const crypto = require('crypto');

async function createTestRequests() {
  const usersSnap = await db.collection('users').where('name', '==', 'Faris Alghamdi').get();
  if (usersSnap.empty) {
    console.error('Could not find agent Faris Alghamdi');
    process.exit(1);
  }
  const agentId = usersSnap.docs[0].id;
  const agentName = usersSnap.docs[0].data().name;
  console.log(`Found agent: ${agentName} (${agentId})`);

  const counterRef = db.collection('counters').doc('requests');
  const now = new Date();

  const requests = [
    {
      customerName: 'Khalid Al-Rashidi',
      customerPhone: '+966501112233',
      notes: 'Interested in Toyota Corolla 2025',
      status: 'OPEN',
      completionPercent: 0,
      needsReminderLevel: 0,
      lastReminderAt: null,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
    {
      customerName: 'Norah Al-Harbi',
      customerPhone: '+966502223344',
      notes: 'Financing application for Toyota RAV4',
      status: 'SUBMITTED',
      completionPercent: 100,
      needsReminderLevel: 0,
      lastReminderAt: null,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      customerName: 'Sara Al-Zahrani',
      customerPhone: '+966501234567',
      notes: 'Interested in Toyota Camry 2024',
      status: 'OPEN',
      completionPercent: 0,
      needsReminderLevel: 1, // yellow badge
      lastReminderAt: null,
      createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 72 hours ago
    },
    {
      customerName: 'Mohammed Al-Otaibi',
      customerPhone: '+966509876543',
      notes: 'Enquiry about Toyota Land Cruiser',
      status: 'OPEN',
      completionPercent: 0,
      needsReminderLevel: 2, // red badge
      lastReminderAt: new Date(now.getTime() - 50 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000), // 72 hours ago
    },
  ];

  for (const r of requests) {
    const ref = db.collection('requests').doc();
    const token = crypto.randomBytes(32).toString('hex');

    let requestNumber;
    await db.runTransaction(async (t) => {
      const counterDoc = await t.get(counterRef);
      const count = counterDoc.exists ? (counterDoc.data().count || 0) + 1 : 1;
      requestNumber = `REQ-${String(count).padStart(4, '0')}`;
      t.set(counterRef, { count }, { merge: true });
      t.set(ref, {
        id: ref.id,
        requestNumber,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        notes: r.notes,
        agentId,
        status: r.status,
        reviewStatus: r.status === 'SUBMITTED' ? 'PENDING' : null,
        completionPercent: r.completionPercent,
        needsReminderLevel: r.needsReminderLevel,
        lastReminderAt: r.lastReminderAt ? admin.firestore.Timestamp.fromDate(r.lastReminderAt) : null,
        secureToken: token,
        createdAt: admin.firestore.Timestamp.fromDate(r.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(now),
      });
    });

    const badge = r.needsReminderLevel === 1 ? ' — YELLOW badge' : r.needsReminderLevel === 2 ? ' — RED badge' : '';
    console.log(`✓ Created ${requestNumber} for ${r.customerName} [${r.status}]${badge}`);
  }

  console.log('\nDone! 4 requests created for Faris Alghamdi.');
  process.exit(0);
}

createTestRequests().catch((err) => { console.error(err); process.exit(1); });
