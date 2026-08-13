import {
  supabase, getSession, readCloudState, activateUser, captureLocalState,
  makeFreshState, signOutAndClear
} from "../shared/motionc-supabase.js";

const $ = (id) => document.getElementById(id);
let mode = "signin";
let pendingSession = null;
let browserStateBeforeSignIn = null;
const requestedNext = new URLSearchParams(location.search).get("next");
const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null;

function continueAfterLogin() {
  if (safeNext) location.assign(safeNext);
}

function show(name) {
  ["signedOutPanel", "setupPanel", "signedInPanel"].forEach((id) => $(id).classList.toggle("hidden", id !== name));
}

function setMode(next) {
  mode = next;
  $("signInTab").classList.toggle("active", mode === "signin");
  $("createTab").classList.toggle("active", mode === "create");
  $("submitButton").textContent = mode === "signin" ? "Sign in" : "Create user";
  $("password").autocomplete = mode === "signin" ? "current-password" : "new-password";
  $("formMessage").textContent = "";
}

async function finishLogin(session) {
  const cloud = await readCloudState(session.user.id);
  const hasCloudData = Object.keys(cloud.state?.storage || {}).length > 0;
  if (!hasCloudData) {
    pendingSession = session;
    show("setupPanel");
    return;
  }
  await activateUser(session.user.id, cloud.state);
  if (safeNext) { continueAfterLogin(); return; }
  $("currentEmail").textContent = session.user.email;
  show("signedInPanel");
}

$("signInTab").addEventListener("click", () => setMode("signin"));
$("createTab").addEventListener("click", () => setMode("create"));

$("accountForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("formMessage").textContent = "Working…";
  browserStateBeforeSignIn = captureLocalState();
  const credentials = { email: $("email").value.trim(), password: $("password").value };
  try {
    const result = mode === "signin"
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);
    if (result.error) throw result.error;
    if (!result.data.session) {
      $("formMessage").textContent = "Check that email for the confirmation link, then return here and sign in.";
      return;
    }
    await finishLogin(result.data.session);
  } catch (error) {
    $("formMessage").textContent = error.message || "The account could not be opened.";
  }
});

$("importButton").addEventListener("click", async () => {
  await activateUser(pendingSession.user.id, browserStateBeforeSignIn || captureLocalState());
  if (safeNext) { continueAfterLogin(); return; }
  $("currentEmail").textContent = pendingSession.user.email;
  show("signedInPanel");
});

$("freshButton").addEventListener("click", async () => {
  await activateUser(pendingSession.user.id, makeFreshState());
  if (safeNext) { continueAfterLogin(); return; }
  $("currentEmail").textContent = pendingSession.user.email;
  show("signedInPanel");
});

$("switchButton").addEventListener("click", async () => {
  $("switchButton").disabled = true;
  $("syncStatus").textContent = "Saving this user before switching…";
  try {
    await signOutAndClear();
    $("accountForm").reset();
    setMode("signin");
    show("signedOutPanel");
  } catch (error) {
    $("syncStatus").textContent = error.message || "Could not save and switch.";
  } finally {
    $("switchButton").disabled = false;
  }
});

const existing = await getSession();
if (existing) await finishLogin(existing);
else show("signedOutPanel");
