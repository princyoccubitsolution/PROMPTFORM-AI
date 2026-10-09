/**
 * Regression test: team invitation -> acceptance -> persisted membership.
 * Usage: npx ts-node src/scripts/testTeamInviteAcceptFlow.ts [baseUrl]
 *   baseUrl defaults to http://127.0.0.1:5050 (e.g. https://promptform-api.onrender.com for production).
 * Uses throwaway @example.org accounts (example.org accepts no mail, so no email is sent)
 * and deletes the test team at the end.
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:5050').replace(/\/+$/, '') + '/api';

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`);
}

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data: any = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function register(label: string) {
  const email = `pf-invite-test-${label}-${Date.now()}@example.org`;
  const password = `T3st!${Math.random().toString(36).slice(2, 10)}Aa`;
  const r = await call('POST', '/auth/register', undefined, { email, password, name: `Invite Test ${label}` });
  if (!r.data?.accessToken) throw new Error(`register ${label} failed: ${r.status} ${JSON.stringify(r.data)}`);
  return { email, password, token: r.data.accessToken as string };
}

async function main() {
  console.log(`Target: ${BASE}`);
  const owner = await register('owner');
  const invitee = await register('invitee');
  const stranger = await register('stranger');

  const team = await call('POST', '/teams', owner.token, { name: `Invite Regression ${Date.now()}` });
  check('owner creates team', team.status === 201, team);
  const teamId = team.data.id;

  const before = await call('GET', `/teams/${teamId}`, owner.token);
  const startCount = before.data.members?.length;
  check('team starts with 1 member (owner)', startCount === 1, before.data.members?.length);

  const inv = await call('POST', `/teams/${teamId}/members`, owner.token, { email: invitee.email, role: 'editor' });
  check('owner invites user (invite created)', inv.status === 201 && !!inv.data.token, inv);
  const token = inv.data.token;

  const verify = await call('GET', `/teams/invitations/verify/${token}`);
  check('invite token verifies to correct team/email', verify.status === 200 && verify.data.teamId === teamId && verify.data.email === invitee.email, verify);

  const wrongUser = await call('POST', `/teams/invitations/accept/${token}`, stranger.token);
  check('different account cannot accept (403)', wrongUser.status === 403, wrongUser);
  const ownerAccept = await call('POST', `/teams/invitations/accept/${token}`, owner.token);
  check('team owner cannot consume invite (403)', ownerAccept.status === 403, ownerAccept);
  const stillPending = await call('GET', `/teams/invitations/verify/${token}`);
  check('invite still pending after rejected attempts', stillPending.status === 200, stillPending);

  const unauth = await call('POST', `/teams/invitations/accept/${token}`);
  check('unauthenticated accept rejected (401)', unauth.status === 401, unauth);

  const accept = await call('POST', `/teams/invitations/accept/${token}`, invitee.token);
  check('invited user accepts (200)', accept.status === 200 && accept.data.teamId === teamId, accept);

  const after = await call('GET', `/teams/${teamId}`, owner.token);
  const member = after.data.members?.find((m: any) => m.user?.email === invitee.email);
  check('member count increased exactly once', after.data.members?.length === startCount + 1, after.data.members?.length);
  check('accepted user listed with invited role', member?.role === 'editor', member);

  const listOwner = await call('GET', '/teams', owner.token);
  const listed = listOwner.data.find?.((t: any) => t.id === teamId);
  check('team list memberCount reflects persisted members', listed?.memberCount === startCount + 1, listed?.memberCount);

  const usedVerify = await call('GET', `/teams/invitations/verify/${token}`);
  check('invite status is now accepted', usedVerify.status === 400 && /accepted/.test(usedVerify.data.error || ''), usedVerify);

  const dup = await call('POST', `/teams/invitations/accept/${token}`, invitee.token);
  check('duplicate accept rejected', dup.status === 400 || dup.status === 409, dup);
  const afterDup = await call('GET', `/teams/${teamId}`, owner.token);
  check('no double-counting after duplicate accept', afterDup.data.members?.length === startCount + 1, afterDup.data.members?.length);

  const bad = await call('POST', `/teams/invitations/accept/not-a-real-token`, invitee.token);
  check('invalid token rejected (404)', bad.status === 404, bad);

  // Fresh login as the invitee: membership must persist
  const relog = await call('POST', '/auth/login', undefined, { email: invitee.email, password: invitee.password });
  const inviteeTeams = await call('GET', '/teams', relog.data.accessToken);
  check('membership persists after new login', relog.status === 200 && !!inviteeTeams.data.find?.((t: any) => t.id === teamId), inviteeTeams.status);
  const inviteeView = await call('GET', `/teams/${teamId}`, relog.data.accessToken);
  check('invitee can open team workspace with editor role', inviteeView.status === 200 && inviteeView.data.permissions?.userRole === 'editor', inviteeView.data.permissions);
  check('stats.totalMembers matches persisted members', inviteeView.data.stats?.totalMembers === startCount + 1, inviteeView.data.stats);

  const del = await call('DELETE', `/teams/${teamId}`, owner.token);
  console.log(`cleanup: delete test team -> ${del.status}`);

  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exitCode = failures ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
