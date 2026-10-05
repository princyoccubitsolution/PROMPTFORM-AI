import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { db } from '../lib/db';
import authRouter from '../routes/auth';
import teamsRouter from '../routes/teams';
import formsRouter from '../routes/forms';
import bcrypt from 'bcryptjs';

const PORT = 5555;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let server: any;

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json() as any);

  app.use('/api/auth', authRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/forms', formsRouter);

  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      console.log(`[TestServer] Running at ${BASE_URL}`);
      resolve(true);
    });
  });
}

async function stopServer() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    console.log('[TestServer] Stopped.');
  }
}

async function runComprehensiveCheck() {
  console.log('================================================================');
  console.log('🚀 PROMPTFORM AI — ENTIRE FUNCTIONALITY VALIDATION SUITE');
  console.log('================================================================\n');

  await startServer();

  const timestamp = Date.now();
  const password = 'Password@123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Setup Users
  const userAData = {
    email: `alice_${timestamp}@promptform.test`,
    name: 'Alice Owner',
    password: hashedPassword,
    activeSessionToken: `session_a_${timestamp}`
  };
  const userBData = {
    email: `bob_${timestamp}@promptform.test`,
    name: 'Bob Member',
    password: hashedPassword,
    activeSessionToken: `session_b_${timestamp}`
  };
  const userCData = {
    email: `charlie_${timestamp}@promptform.test`,
    name: 'Charlie Outsider',
    password: hashedPassword,
    activeSessionToken: `session_c_${timestamp}`
  };

  const userA = await db.user.create({ data: userAData });
  const userB = await db.user.create({ data: userBData });
  const userC = await db.user.create({ data: userCData });

  let tokenA = '';
  let tokenB = '';
  let tokenC = '';

  const results: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

  const recordResult = (test: string, passed: boolean, details?: string) => {
    results.push({ test, status: passed ? 'PASS' : 'FAIL', details });
    console.log(`${passed ? '  ✅ PASS' : '  ❌ FAIL'}: ${test} ${details ? `(${details})` : ''}`);
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: AUTHENTICATION
    // -------------------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & LOGIN ---');
    const loginResA = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password })
    });
    const loginDataA = await loginResA.json() as any;
    tokenA = loginDataA.accessToken;
    recordResult('Alice logs in and receives JWT token', loginResA.status === 200 && !!tokenA);

    const loginResB = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userB.email, password })
    });
    const loginDataB = await loginResB.json() as any;
    tokenB = loginDataB.accessToken;
    recordResult('Bob logs in and receives JWT token', loginResB.status === 200 && !!tokenB);

    const loginResC = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userC.email, password })
    });
    const loginDataC = await loginResC.json() as any;
    tokenC = loginDataC.accessToken;
    recordResult('Charlie logs in and receives JWT token', loginResC.status === 200 && !!tokenC);

    // -------------------------------------------------------------
    // TEST 2: CREATE TEAM WORKSPACE
    // -------------------------------------------------------------
    console.log('\n--- 2. CREATE TEAM WORKSPACE ---');
    const createTeamRes = await fetch(`${BASE_URL}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: 'Growth & Marketing Studio',
        description: 'Collaborative hub for customer acquisition & surveys.'
      })
    });
    const createdTeam = await createTeamRes.json() as any;
    recordResult(
      'Alice creates Team workspace "Growth & Marketing Studio"',
      createTeamRes.status === 201 && createdTeam.name === 'Growth & Marketing Studio',
      `ID: ${createdTeam.id}`
    );

    const teamId = createdTeam.id;

    // -------------------------------------------------------------
    // TEST 3: GET TEAMS LIST WITH AGGREGATED STATS
    // -------------------------------------------------------------
    console.log('\n--- 3. TEAMS LIST & METRICS AGGREGATION ---');
    const getTeamsRes = await fetch(`${BASE_URL}/teams`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const teamsList = await getTeamsRes.json() as any;
    const fetchedTeam = teamsList.find((t: any) => t.id === teamId);
    recordResult(
      'Teams list returns team with correct memberCount and userRole = "owner"',
      getTeamsRes.status === 200 &&
        fetchedTeam &&
        fetchedTeam.memberCount === 1 &&
        fetchedTeam.userRole === 'owner',
      `memberCount: ${fetchedTeam?.memberCount}, role: ${fetchedTeam?.userRole}`
    );

    // -------------------------------------------------------------
    // TEST 4: INVITE MEMBER TO TEAM
    // -------------------------------------------------------------
    console.log('\n--- 4. INVITE TEAM MEMBER ---');
    const inviteRes = await fetch(`${BASE_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        email: userB.email,
        role: 'editor'
      })
    });
    const invitedMember = await inviteRes.json() as any;
    recordResult(
      'Alice invites Bob as "editor"',
      inviteRes.status === 201 && invitedMember.role === 'editor',
      `Member ID: ${invitedMember.id}`
    );

    const memberBId = invitedMember.id;

    // Prevent duplicate invite
    const duplicateInviteRes = await fetch(`${BASE_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        email: userB.email,
        role: 'viewer'
      })
    });
    recordResult(
      'Duplicate invite rejected with 400 Bad Request',
      duplicateInviteRes.status === 400
    );

    // -------------------------------------------------------------
    // TEST 5: UPDATE MEMBER ROLE
    // -------------------------------------------------------------
    console.log('\n--- 5. CHANGE MEMBER ROLE ---');
    const updateRoleRes = await fetch(`${BASE_URL}/teams/${teamId}/members/${memberBId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ role: 'viewer' })
    });
    const updatedMember = await updateRoleRes.json() as any;
    recordResult(
      'Alice updates Bob role from editor to viewer',
      updateRoleRes.status === 200 && updatedMember.role === 'viewer',
      `New role: ${updatedMember.role}`
    );

    // -------------------------------------------------------------
    // TEST 6: CREATE FORM IN TEAM WORKSPACE
    // -------------------------------------------------------------
    console.log('\n--- 6. CREATE FORM IN TEAM WORKSPACE ---');
    const createTeamFormRes = await fetch(`${BASE_URL}/forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Q4 Customer Experience Pulse',
        description: 'Quarterly CSAT feedback form.',
        teamId: teamId,
        settings: { collect_emails: true },
        theme: { primary_color: '#8B6B55' }
      })
    });
    const teamForm = await createTeamFormRes.json() as any;
    recordResult(
      'Alice creates form linked to team workspace',
      createTeamFormRes.status === 201 && teamForm.teamId === teamId,
      `Form ID: ${teamForm.id}`
    );

    const teamFormId = teamForm.id;

    // -------------------------------------------------------------
    // TEST 7: TEAM FORMS QUERY, SEARCH & FILTER
    // -------------------------------------------------------------
    console.log('\n--- 7. TEAM FORMS FILTER & SEARCH ---');
    const getTeamFormsRes = await fetch(`${BASE_URL}/teams/${teamId}/forms?search=Customer`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const teamForms = await getTeamFormsRes.json() as any;
    recordResult(
      'Bob queries team forms with search query "Customer"',
      getTeamFormsRes.status === 200 && teamForms.length === 1 && teamForms[0].id === teamFormId,
      `Found: ${teamForms.length} forms`
    );

    // -------------------------------------------------------------
    // TEST 8: PERMISSIONS ON TEAM FORMS
    // -------------------------------------------------------------
    console.log('\n--- 8. PERMISSION ENFORCEMENT ON TEAM FORMS ---');
    // Bob is currently a viewer. Updating questions or form details should fail for viewers.
    const viewerEditAttempt = await fetch(`${BASE_URL}/forms/${teamFormId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ title: 'Hacked by Viewer' })
    });
    recordResult(
      'Viewer (Bob) forbidden from updating form details (403 Forbidden)',
      viewerEditAttempt.status === 403
    );

    // Now Alice promotes Bob to Editor
    await fetch(`${BASE_URL}/teams/${teamId}/members/${memberBId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ role: 'editor' })
    });

    // Bob can now edit the form as Editor
    const editorEditAttempt = await fetch(`${BASE_URL}/forms/${teamFormId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`
      },
      body: JSON.stringify({ title: 'Q4 Customer Experience Pulse (Refined)' })
    });
    const editorEditData = await editorEditAttempt.json() as any;
    recordResult(
      'Editor (Bob) successfully updates form details after promotion',
      editorEditAttempt.status === 200 && editorEditData.title.includes('Refined')
    );

    // -------------------------------------------------------------
    // TEST 9: FORM-LEVEL INDIVIDUAL COLLABORATION
    // -------------------------------------------------------------
    console.log('\n--- 9. FORM-LEVEL COLLABORATORS (WITHOUT TEAM) ---');
    // Alice creates a personal form (no team)
    const createPersonalRes = await fetch(`${BASE_URL}/forms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Private Product Architecture Draft',
        description: 'Confidential system architecture feedback.'
      })
    });
    const personalForm = await createPersonalRes.json() as any;
    const personalFormId = personalForm.id;

    // Bob shouldn't have access to Alice's private form
    const bobAccessAttempt = await fetch(`${BASE_URL}/forms/${personalFormId}/collaborators`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    recordResult(
      'Unshared personal form denies access to Bob (403 Forbidden)',
      bobAccessAttempt.status === 403
    );

    // Alice adds Bob as direct form collaborator (role: editor)
    const addCollabRes = await fetch(`${BASE_URL}/forms/${personalFormId}/collaborators`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        email: userB.email,
        role: 'editor'
      })
    });
    const collabData = await addCollabRes.json() as any;
    recordResult(
      'Alice adds Bob as direct collaborator to personal form',
      addCollabRes.status === 201 && collabData.role === 'editor',
      `Collab ID: ${collabData.id}`
    );

    const collabId = collabData.id;

    // Bob can now view collaborators and edit the form
    const bobCollabView = await fetch(`${BASE_URL}/forms/${personalFormId}/collaborators`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const bobCollabData = await bobCollabView.json() as any;
    recordResult(
      'Bob can now view collaborators of shared form',
      bobCollabView.status === 200 && bobCollabData.collaborators?.length === 2
    );

    // Bob sees the form in "Shared with Me"
    const sharedWithMeRes = await fetch(`${BASE_URL}/forms/collaborations/shared-with-me`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const sharedForms = await sharedWithMeRes.json() as any;
    const foundShared = sharedForms.find((f: any) => f.id === personalFormId);
    recordResult(
      'Shared form appears in Bob\'s "Shared with Me" list',
      sharedWithMeRes.status === 200 && !!foundShared && foundShared.accessRole === 'editor'
    );

    // Alice changes Bob's role to 'viewer'
    const updateCollabRoleRes = await fetch(`${BASE_URL}/forms/${personalFormId}/collaborators/${collabId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ role: 'viewer' })
    });
    recordResult(
      'Alice updates Bob\'s collaborator role to viewer',
      updateCollabRoleRes.status === 200
    );

    // -------------------------------------------------------------
    // TEST 10: UNAUTHORIZED USER INTRUSION ATTEMPTS
    // -------------------------------------------------------------
    console.log('\n--- 10. UNAUTHORIZED USER ISOLATION & SECURITY CHECKS ---');
    // Charlie tries to access Alice's team
    const charlieTeamAccess = await fetch(`${BASE_URL}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    recordResult(
      'Charlie rejected from accessing Team workspace (403 Forbidden)',
      charlieTeamAccess.status === 403
    );

    // Charlie tries to access Team forms
    const charlieFormsAccess = await fetch(`${BASE_URL}/teams/${teamId}/forms`, {
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    recordResult(
      'Charlie rejected from querying Team forms (403 Forbidden)',
      charlieFormsAccess.status === 403
    );

    // Charlie tries to invite someone to Alice's team
    const charlieInviteAttempt = await fetch(`${BASE_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenC}`
      },
      body: JSON.stringify({ email: 'fake@test.com', role: 'admin' })
    });
    recordResult(
      'Charlie rejected from inviting members to Team (403/404 Forbidden)',
      charlieInviteAttempt.status === 403 || charlieInviteAttempt.status === 404
    );

    // Charlie tries to delete Team form
    const charlieDeleteAttempt = await fetch(`${BASE_URL}/forms/${teamFormId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenC}` }
    });
    recordResult(
      'Charlie rejected from deleting Team form (403 Forbidden)',
      charlieDeleteAttempt.status === 403
    );

    // -------------------------------------------------------------
    // TEST 11: REAL ACTIVITY LOG GENERATION & PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n--- 11. DATABASE ACTIVITY AUDIT LOGS ---');
    const teamActivityRes = await fetch(`${BASE_URL}/teams/${teamId}/activity`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const teamActivities = await teamActivityRes.json() as any;
    recordResult(
      'Team activity history returns real logged records',
      teamActivityRes.status === 200 && teamActivities.length >= 3,
      `Total activities logged: ${teamActivities.length}`
    );

    const recentActivityRes = await fetch(`${BASE_URL}/teams/activity/recent`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const recentActivities = await recentActivityRes.json() as any;
    recordResult(
      'Cross-workspace recent activity feed returns live records',
      recentActivityRes.status === 200 && recentActivities.length >= 3
    );

    // -------------------------------------------------------------
    // TEST 12: FORM RESPONSES & TEAM AGGREGATION
    // -------------------------------------------------------------
    console.log('\n--- 12. PUBLIC SUBMISSION & LIVE TEAM COUNTS ---');
    // First publish form
    await fetch(`${BASE_URL}/forms/${teamFormId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ status: 'PUBLISHED' })
    });

    // Public submit response
    const submitRes = await fetch(`${BASE_URL}/forms/${teamFormId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: { question_1: 'Excellent UI redesign!' },
        browserMetadata: { user_agent: 'Automated Test Runner', tab_switches: 0 },
        timeTaken: 30,
        email: 'responder@test.com'
      })
    });
    recordResult(
      'Public response submitted to team form',
      submitRes.status === 200 || submitRes.status === 201
    );

    // Check team detail response count
    const teamDetailRes = await fetch(`${BASE_URL}/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const teamDetail = await teamDetailRes.json() as any;
    recordResult(
      'Team aggregated stats accurately reflect new response',
      teamDetail.stats?.totalResponses >= 1,
      `Total Responses in DB: ${teamDetail.stats?.totalResponses}`
    );

    // -------------------------------------------------------------
    // TEST 13: CLEANUP & LEAVE WORKSPACE
    // -------------------------------------------------------------
    console.log('\n--- 13. MEMBER REMOVAL & WORKSPACE CLEANUP ---');
    // Remove collaborator from personal form
    const removeCollabRes = await fetch(`${BASE_URL}/forms/${personalFormId}/collaborators/${collabId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    recordResult('Remove form collaborator', removeCollabRes.status === 200);

    // Remove member from team
    const removeMemberRes = await fetch(`${BASE_URL}/teams/${teamId}/members/${memberBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    recordResult('Remove member from team', removeMemberRes.status === 200);

    // Delete team
    const deleteTeamRes = await fetch(`${BASE_URL}/teams/${teamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    recordResult('Delete team (Owner only)', deleteTeamRes.status === 200);

  } catch (error: any) {
    console.error('❌ Unexpected Error during test execution:', error);
    recordResult('Execution without unhandled exceptions', false, error.message);
  } finally {
    // DB cleanup
    await db.formCollaborator.deleteMany({ where: { user: { email: { contains: `${timestamp}@promptform.test` } } } });
    await db.activity.deleteMany({ where: { user: { email: { contains: `${timestamp}@promptform.test` } } } });
    await db.response.deleteMany({ where: { form: { owner: { email: { contains: `${timestamp}@promptform.test` } } } } });
    await db.form.deleteMany({ where: { owner: { email: { contains: `${timestamp}@promptform.test` } } } });
    await db.teamMember.deleteMany({ where: { user: { email: { contains: `${timestamp}@promptform.test` } } } });
    await db.team.deleteMany({ where: { owner: { email: { contains: `${timestamp}@promptform.test` } } } });
    await db.user.deleteMany({ where: { email: { contains: `${timestamp}@promptform.test` } } });

    await stopServer();

    console.log('\n================================================================');
    console.log('📊 FINAL TEST RESULTS SUMMARY:');
    console.log('================================================================');
    const passedCount = results.filter(r => r.status === 'PASS').length;
    const totalCount = results.length;
    console.log(`Total Scenarios Tested: ${totalCount}`);
    console.log(`Passed: ${passedCount} / ${totalCount} (${Math.round((passedCount / totalCount) * 100)}%)`);
    if (passedCount === totalCount) {
      console.log('🎉 ALL FUNCTIONALITY VERIFICATIONS PASSED WITH 100% SUCCESS!');
    } else {
      console.log('⚠️ Some scenarios failed. Review log above.');
    }
    console.log('================================================================\n');

    process.exit(passedCount === totalCount ? 0 : 1);
  }
}

runComprehensiveCheck();
