/**
 * Script to create a new Manager user
 * 
 * This script creates:
 * 1. A Firebase Authentication user
 * 2. A user document in Firestore with agent role
 * 
 * Usage: node scripts/createManagerUser.js <email> <password> <name>
 * 
 * Example: node scripts/createManagerUser.js agent2@example.com password123 "John Doe"
 */

require('dotenv').config();
const { admin, db } = require('../src/firebase');

async function createManagerUser(email, password, name) {
  if (!email || !password || !name) {
    console.error('❌ Error: Missing required parameters');
    console.log('\nUsage: node scripts/createManagerUser.js <email> <password> <name>');
    console.log('\nExample:');
    console.log('  node scripts/createManagerUser.js agent2@example.com password123 "John Doe"');
    process.exit(1);
  }

  try {
    console.log('=== Creating Manager User ===\n');
    console.log(`Email: ${email}`);
    console.log(`Name: ${name}`);
    console.log('');

    // 1. Check if user already exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('⚠️  User already exists in Firebase Authentication');
      console.log(`   User ID: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create it
        console.log('Creating new Firebase Authentication user...');
        userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          displayName: name,
          emailVerified: false
        });
        console.log(`✓ Created Firebase Auth user: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }

    // 2. Check if user document exists in Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    
    if (userDoc.exists) {
      const existingData = userDoc.data();
      console.log('⚠️  User document already exists in Firestore');
      console.log(`   Current role: ${existingData.role || 'NOT SET'}`);
      console.log(`   Current name: ${existingData.name || 'NOT SET'}`);
      
      // Ask if we should update it
      console.log('\nUpdating user document with agent role...');
      await db.collection('users').doc(userRecord.uid).update({
        name: name,
        email: email,
        role: 'manager',
        updatedAt: new Date()
      });
      console.log('✓ Updated user document');
    } else {
      // Create user document in Firestore
      console.log('Creating user document in Firestore...');
      await db.collection('users').doc(userRecord.uid).set({
        name: name,
        email: email,
        role: 'manager',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✓ Created user document');
    }

    console.log('\n✅ Success!');
    console.log('\nUser Details:');
    console.log(`  User ID: ${userRecord.uid}`);
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log(`  Role: manager`);
    console.log('\nThe user can now log in with:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);

  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.log('\nThe email is already registered. Use a different email or update the existing user.');
    } else if (error.code === 'auth/invalid-email') {
      console.log('\nInvalid email format. Please use a valid email address.');
    } else if (error.code === 'auth/weak-password') {
      console.log('\nPassword is too weak. Please use a stronger password (at least 6 characters).');
    }
    process.exit(1);
  }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

// Run the script
createManagerUser(email, password, name)
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });












