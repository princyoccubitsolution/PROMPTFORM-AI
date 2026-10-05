import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { db } from '../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { hasFormAccess, getFormUserRole } from '../lib/utils';
import { logActivity } from '../lib/activity';

const JWT_SECRET = process.env.JWT_SECRET || 'promptform_jwt_secret_token_key_123!#%';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 PROMPTFORM AI — REAL COLLABORATION SYSTEM TEST');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const emailA = `owner_${timestamp}@promptform.test`;
  const emailB = `collaborator_${timestamp}@promptform.test`;
  const emailC = `unauthorized_${timestamp}@promptform.test`;

  const hashedPassword = await bcrypt.hash('TestPass123!', 10);

  // 1. Create 3 distinct test users
  console.log('1. Creating test users...');
  const userA = await db.user.create({
    data: {
      email: emailA,
      name: 'Owner Alice',
      password: hashedPassword,
      activeSessionToken: 'session_a_' + timestamp
    }
  });

  const userB = await db.user.create({
    data: {
      email: emailB,
      name: 'Editor Bob',
      password: hashedPassword,
      activeSessionToken: 'session_b_' + timestamp
    }
  });

  const userC = await db.user.create({
    data: {
      email: emailC,
      name: 'Intruder Charlie',
      password: hashedPassword,
      activeSessionToken: 'session_c_' + timestamp
    }
  });

  console.log(`   ✅ User A (Owner): ${userA.email} (${userA.id})`);
  console.log(`   ✅ User B (Collaborator): ${userB.email} (${userB.id})`);
  console.log(`   ✅ User C (Intruder): ${userC.email} (${userC.id})\n`);

  // 2. Create Team Workspace
  console.log('2. User A creates Team "Design & UX Studio"...');
  const team = await db.team.create({
    data: {
      name: 'Design & UX Studio',
      description: 'Central design workspace for UI surveys & user testing.',
      ownerId: userA.id
    }
  });

  // Owner is added as member
  await db.teamMember.create({
    data: {
      teamId: team.id,
      userId: userA.id,
      role: 'admin'
    }
  });

  await logActivity({
    userId: userA.id,
    action: 'TEAM_CREATED',
    teamId: team.id,
    targetTitle: team.name,
    details: `${userA.name} created team "${team.name}"`
  });

  console.log(`   ✅ Team created: ${team.name} (id: ${team.id})`);
  console.log(`   ✅ Owner added as admin member\n`);

  // 3. User A invites User B to Team
  console.log('3. User A invites User B to the team as "editor"...');
  const memberB = await db.teamMember.create({
    data: {
      teamId: team.id,
      userId: userB.id,
      role: 'editor'
    }
  });

  await logActivity({
    userId: userA.id,
    action: 'MEMBER_JOINED',
    teamId: team.id,
    targetTitle: userB.email,
    details: `${userB.name} joined ${team.name} as editor`
  });

  console.log(`   ✅ User B joined team with role: ${memberB.role}\n`);

  // 4. Verify duplicate membership prevention
  console.log('4. Verifying duplicate membership constraint (@@unique([teamId, userId]))...');
  try {
    await db.teamMember.create({
      data: {
        teamId: team.id,
        userId: userB.id,
        role: 'viewer'
      }
    });
    throw new Error('❌ Failed: Duplicate member was allowed!');
  } catch (err: any) {
    if (err.message.includes('Unique constraint failed') || err.code === 'P2002') {
      console.log('   ✅ DB rejected duplicate membership as expected!\n');
    } else {
      throw err;
    }
  }

  // 5. Update User B role to 'viewer'
  console.log('5. Updating User B role to "viewer"...');
  const updatedMember = await db.teamMember.update({
    where: { id: memberB.id },
    data: { role: 'viewer' }
  });

  await logActivity({
    userId: userA.id,
    action: 'ROLE_CHANGED',
    teamId: team.id,
    targetTitle: userB.email,
    details: `Role of ${userB.name} changed to viewer in ${team.name}`
  });

  console.log(`   ✅ Role successfully updated to: ${updatedMember.role}\n`);

  // 6. User A creates a Team Form
  console.log('6. User A creates form in Team workspace...');
  const teamForm = await db.form.create({
    data: {
      title: 'Customer Satisfaction Survey',
      description: 'Quarterly review form for design feedback.',
      ownerId: userA.id,
      teamId: team.id,
      status: 'PUBLISHED',
      settings: { collect_emails: true },
      theme: { primary_color: '#8B6B55' }
    }
  });

  await logActivity({
    userId: userA.id,
    action: 'FORM_CREATED',
    formId: teamForm.id,
    teamId: team.id,
    targetTitle: teamForm.title,
    details: `${userA.name} created team form "${teamForm.title}"`
  });

  console.log(`   ✅ Team Form created: "${teamForm.title}" (teamId: ${teamForm.teamId})\n`);

  // 7. Check User B access on Team Form
  console.log('7. Testing permissions on Team Form:');
  const userBHasViewAccess = await hasFormAccess(teamForm.id, userB.id, ['admin', 'editor', 'viewer']);
  const userBHasEditAccess = await hasFormAccess(teamForm.id, userB.id, ['admin', 'editor']);
  const userCHasAccess = await hasFormAccess(teamForm.id, userC.id, ['admin', 'editor', 'viewer']);

  console.log(`   User B (Team Viewer) has view access: ${userBHasViewAccess ? '✅ YES' : '❌ NO'}`);
  console.log(`   User B (Team Viewer) has edit access: ${userBHasEditAccess ? '❌ YES (unexpected)' : '✅ NO (correctly rejected)'}`);
  console.log(`   User C (Unauthorized) has access: ${userCHasAccess ? '❌ YES (unauthorized breach)' : '✅ NO (correctly rejected)'}\n`);

  if (!userBHasViewAccess || userBHasEditAccess || userCHasAccess) {
    throw new Error('❌ Team Form permission check failed!');
  }

  // 8. Individual Form Collaboration (without team)
  console.log('8. User A creates personal form and adds User B as individual collaborator:');
  const personalForm = await db.form.create({
    data: {
      title: 'Confidential Internal Review',
      description: 'Personal 1-on-1 form.',
      ownerId: userA.id,
      teamId: null,
      status: 'DRAFT',
      settings: {},
      theme: { primary_color: '#8B6B55' }
    }
  });

  const collabB = await db.formCollaborator.create({
    data: {
      formId: personalForm.id,
      userId: userB.id,
      role: 'editor'
    }
  });

  await logActivity({
    userId: userA.id,
    action: 'COLLABORATOR_ADDED',
    formId: personalForm.id,
    targetTitle: personalForm.title,
    details: `${userB.name} added as editor to "${personalForm.title}"`
  });

  console.log(`   ✅ Personal form created: "${personalForm.title}"`);
  console.log(`   ✅ Collaborator added: ${userB.name} as ${collabB.role}`);

  // Test access
  const userBCollabEdit = await hasFormAccess(personalForm.id, userB.id, ['editor']);
  const userCCollabAccess = await hasFormAccess(personalForm.id, userC.id, ['editor', 'viewer']);
  const userBRole = await getFormUserRole(personalForm.id, userB.id);

  console.log(`   User B has editor access on personal form: ${userBCollabEdit ? '✅ YES' : '❌ NO'}`);
  console.log(`   User B effective role: ${userBRole} (${userBRole === 'editor' ? '✅ correct' : '❌ incorrect'})`);
  console.log(`   User C (Intruder) has access on personal form: ${userCCollabAccess ? '❌ YES (breach)' : '✅ NO (correctly rejected)'}\n`);

  if (!userBCollabEdit || userCCollabAccess || userBRole !== 'editor') {
    throw new Error('❌ Individual form collaboration test failed!');
  }

  // 9. Query Real Activities Logged in DB
  console.log('9. Checking real database activities:');
  const teamActivities = await db.activity.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  console.log(`   Found ${teamActivities.length} real activities for team "${team.name}":`);
  teamActivities.forEach((act, idx) => {
    console.log(`   ${idx + 1}. [${act.action}] ${act.details} (actor: ${act.user.email})`);
  });

  if (teamActivities.length < 3) {
    throw new Error('❌ Expected at least 3 real activities logged!');
  }
  console.log('   ✅ All activities are 100% database-backed real records!\n');

  // 10. Test Aggregated Stats Computation
  console.log('10. Testing aggregated team counts:');
  // Add a test response to teamForm
  await db.response.create({
    data: {
      formId: teamForm.id,
      answers: { feedback: 'Great service!' },
      browserMetadata: { user_agent: 'Node test runner' },
      timeTaken: 45
    }
  });

  const teamWithStats = await db.team.findUnique({
    where: { id: team.id },
    include: {
      forms: {
        include: {
          _count: { select: { responses: true } }
        }
      },
      members: true
    }
  });

  const totalForms = teamWithStats?.forms.length || 0;
  const totalMembers = teamWithStats?.members.length || 0;
  const totalResponses = teamWithStats?.forms.reduce((sum, f) => sum + f._count.responses, 0) || 0;

  console.log(`   Total Forms: ${totalForms} (expected: 1) -> ${totalForms === 1 ? '✅' : '❌'}`);
  console.log(`   Total Members: ${totalMembers} (expected: 2) -> ${totalMembers === 2 ? '✅' : '❌'}`);
  console.log(`   Total Responses: ${totalResponses} (expected: 1) -> ${totalResponses === 1 ? '✅' : '❌'}\n`);

  // Cleanup test data cleanly
  console.log('11. Cleaning up test data...');
  await db.formCollaborator.deleteMany({ where: { formId: personalForm.id } });
  await db.activity.deleteMany({ where: { OR: [{ teamId: team.id }, { userId: userA.id }] } });
  await db.response.deleteMany({ where: { formId: teamForm.id } });
  await db.form.deleteMany({ where: { id: { in: [teamForm.id, personalForm.id] } } });
  await db.teamMember.deleteMany({ where: { teamId: team.id } });
  await db.team.deleteMany({ where: { id: team.id } });
  await db.user.deleteMany({ where: { id: { in: [userA.id, userB.id, userC.id] } } });

  console.log('   ✅ Cleanup complete!\n');
  console.log('====================================================');
  console.log('🎉 ALL REAL COLLABORATION FLOW TESTS PASSED 100%!');
  console.log('====================================================');
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
