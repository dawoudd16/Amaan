require('dotenv').config();
const { admin, db } = require('../src/firebase');
const crypto = require('crypto');

async function cleanRequests() {
  // Delete all existing requests
  const existing = await db.collection('requests').get();
  const deletePromises = existing.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);
  console.log(`Deleted ${existing.docs.length} existing requests`);

  // Reset counter
  await db.collection('counters').doc('requests').set({ count: 0 });

  // Get agents
  const farisSnap = await db.collection('users').where('name', '==', 'Faris Alghamdi').get();
  if (farisSnap.empty) { console.error('Could not find Faris Alghamdi'); process.exit(1); }
  const farisId = farisSnap.docs[0].id;

  const ahmedSnap = await db.collection('users').where('name', '==', 'Ahmed Al-Sayed').get();
  const hasAhmed = !ahmedSnap.empty;
  const ahmedId = hasAhmed ? ahmedSnap.docs[0].id : farisId;
  const ahmedName = hasAhmed ? 'Ahmed Al-Sayed' : 'Faris Alghamdi';

  const counterRef = db.collection('counters').doc('requests');
  const now = new Date();

  const requests = [
    {
      customerName: 'Khalid Al-Rashidi',
      customerPhone: '+966501112233',
      notes: 'Toyota Camry 2025 — financing',
      agentId: farisId,
      agentName: 'Faris Alghamdi',
      status: 'COMPLETED',
      reviewStatus: 'APPROVED',
      completionPercent: 100,
      needsReminderLevel: 0,
      lastReminderAt: null,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      customerName: 'Norah Al-Harbi',
      customerPhone: '+966502223344',
      notes: 'Toyota RAV4 2025 — full purchase',
      agentId: farisId,
      agentName: 'Faris Alghamdi',
      status: 'SUBMITTED',
      reviewStatus: 'PENDING',
      completionPercent: 100,
      needsReminderLevel: 0,
      lastReminderAt: null,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      customerName: 'Abdullah Al-Qahtani',
      customerPhone: '+966503334455',
      notes: 'Toyota Land Cruiser — enquiry',
      agentId: farisId,
      agentName: 'Faris Alghamdi',
      status: 'OPEN',
      reviewStatus: null,
      completionPercent: 50,
      needsReminderLevel: 1,
      lastReminderAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      customerName: 'Sara Al-Zahrani',
      customerPhone: '+966501234567',
      notes: 'Toyota Corolla 2025 — financing',
      agentId: farisId,
      agentName: 'Faris Alghamdi',
      status: 'OPEN',
      reviewStatus: null,
      completionPercent: 0,
      needsReminderLevel: 2,
      lastReminderAt: new Date(now.getTime() - 50 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      customerName: 'Mohammed Al-Otaibi',
      customerPhone: '+966509876543',
      notes: 'Lexus LX 2025 — full purchase',
      agentId: ahmedId,
      agentName: ahmedName,
      status: 'COMPLETED',
      reviewStatus: 'APPROVED',
      completionPercent: 100,
      needsReminderLevel: 0,
      lastReminderAt: null,
      createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      customerName: 'Layla Al-Ghamdi',
      customerPhone: '+966507778899',
      notes: 'Toyota Prado 2025 — financing',
      agentId: ahmedId,
      agentName: ahmedName,
      status: 'OPEN',
      reviewStatus: null,
      completionPercent: 75,
      needsReminderLevel: 0,
      lastReminderAt: null,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
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
        agentId: r.agentId,
        status: r.status,
        reviewStatus: r.reviewStatus,
        completionPercent: r.completionPercent,
        needsReminderLevel: r.needsReminderLevel,
        lastReminderAt: r.lastReminderAt ? admin.firestore.Timestamp.fromDate(r.lastReminderAt) : null,
        secureToken: token,
        createdAt: admin.firestore.Timestamp.fromDate(r.createdAt),
        updatedAt: admin.firestore.Timestamp.fromDate(now),
      });
    });

    console.log(`✓ Created ${requestNumber} for ${r.customerName} [${r.status}] — Agent: ${r.agentName}`);
  }

  console.log('\nDone! Manager Dashboard is ready for the screenshot.');
  process.exit(0);
}

cleanRequests().catch((err) => { console.error(err); process.exit(1); });
