import {
  supabase, getSession, readCloudState, activateUser,
  makeFreshState, clearLocalState
} from "../shared/motionc-supabase.js?v=20260819-2";

const $ = (id) => document.getElementById(id);
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const ACTIVE_USER_KEY = "motionc-auth-active-user";
let mode = "signin";
let activeSession = null;
let passwordMode = "recovery";
const params = new URLSearchParams(location.search);
const requestedNext = params.get("next");
const safeNext = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null;
const requestedMode = params.get("mode");
const manageRequested = params.get("manage") === "1";
const recoveryReturn = `${location.origin}/auth/?mode=recovery`;
const confirmationReturn = `${location.origin}/auth/?confirmed=1`;

function show(name) {
  ["signedOutPanel", "usernamePanel", "signedInPanel"].forEach((id) => $(id).classList.toggle("hidden", id !== name));
}

function openDialog(id) {
  const dialog = $(id);
  if (dialog.open) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(id) {
  const dialog = $(id);
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function openPasswordDialog(nextMode) {
  passwordMode = nextMode;
  const authenticatedChange = passwordMode === "authenticated";
  $("passwordEyebrow").textContent = authenticatedChange ? "ACCOUNT SECURITY" : "EMAIL CONFIRMED";
  $("passwordDialogTitle").textContent = authenticatedChange ? "Change your password" : "Choose a new password";
  $("currentPasswordField").classList.toggle("hidden", !authenticatedChange);
  $("currentPassword").required = authenticatedChange;
  $("passwordForm").reset();
  $("passwordMessage").textContent = "";
  openDialog("passwordDialog");
}

function setMode(next) {
  mode = next;
  const creating = mode === "create";
  $("signInTab").classList.toggle("active", !creating);
  $("createTab").classList.toggle("active", creating);
  $("usernameField").classList.toggle("hidden", !creating);
  $("username").required = creating;
  $("submitButton").textContent = creating ? "Create account" : "Sign in";
  $("password").autocomplete = creating ? "new-password" : "current-password";
  $("forgotPasswordButton").classList.toggle("hidden", creating);
  $("formMessage").textContent = "";
}

async function readOrCreateProfile(user) {
  const metadataName = String(user.user_metadata?.username || "").trim();
  let { data, error } = await supabase.from("motionc_profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  if (!data?.display_name && USERNAME_PATTERN.test(metadataName)) {
    const result = await supabase.from("motionc_profiles").upsert({
      user_id: user.id, display_name: metadataName, updated_at: new Date().toISOString()
    }).select("display_name").single();
    if (result.error?.code === "23505") {
      $("profileUsername").value = metadataName;
      $("usernameMessage").textContent = "That username is already in use. Please choose another.";
      return "";
    }
    if (result.error) throw result.error;
    data = result.data;
  }
  return data?.display_name || "";
}

async function finishLogin(session, { stayOnAccount = false } = {}) {
  activeSession = session;
  const cloud = await readCloudState(session.user.id);
  const accountState = Object.keys(cloud.state?.storage || {}).length ? cloud.state : makeFreshState();
  await activateUser(session.user.id, accountState);
  const username = await readOrCreateProfile(session.user);
  if (!username) {
    show("usernamePanel");
    return;
  }
  if (safeNext) {
    location.assign(safeNext);
    return;
  }
  if (!stayOnAccount) {
    location.assign("/landing-page/");
    return;
  }
  $("currentUsername").textContent = username;
  show("signedInPanel");
}

$("signInTab").addEventListener("click", () => setMode("signin"));
$("createTab").addEventListener("click", () => setMode("create"));

$("accountForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("formMessage").textContent = "Working…";
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    let result;
    if (mode === "create") {
      const username = $("username").value.trim();
      if (!USERNAME_PATTERN.test(username)) throw new Error("Choose a username using 3–24 letters, numbers, or underscores.");
      result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: confirmationReturn, data: { username } } });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    if (result.error) throw result.error;
    if (!result.data.session) {
      $("formMessage").textContent = "Check your email and select Confirm. The link will return you safely to MotionC.";
      return;
    }
    await finishLogin(result.data.session);
  } catch (error) {
    $("formMessage").textContent = error.message || "The account could not be opened.";
  }
});

$("usernameForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = $("profileUsername").value.trim();
  if (!USERNAME_PATTERN.test(username)) {
    $("usernameMessage").textContent = "Use 3–24 letters, numbers, or underscores.";
    return;
  }
  $("usernameMessage").textContent = "Saving…";
  const { error } = await supabase.from("motionc_profiles").upsert({
    user_id: activeSession.user.id, display_name: username, updated_at: new Date().toISOString()
  });
  if (error) {
    $("usernameMessage").textContent = error.code === "23505" ? "That username is already in use." : error.message;
    return;
  }
  await supabase.auth.updateUser({ data: { username } });
  location.assign(safeNext || "/landing-page/");
});

$("forgotPasswordButton").addEventListener("click", () => {
  $("resetEmail").value = $("email").value.trim();
  $("forgotMessage").textContent = "";
  openDialog("forgotDialog");
});

$("forgotForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("forgotMessage").textContent = "Sending…";
  const { error } = await supabase.auth.resetPasswordForEmail($("resetEmail").value.trim(), { redirectTo: recoveryReturn });
  $("forgotMessage").textContent = error ? error.message : "If that email belongs to a MotionC account, a password-reset link is on its way.";
});

$("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("newPassword").value;
  if (password !== $("confirmPassword").value) {
    $("passwordMessage").textContent = "The passwords do not match.";
    return;
  }
  $("passwordMessage").textContent = "Updating…";
  const update = { password };
  if (passwordMode === "authenticated") update.current_password = $("currentPassword").value;
  const { error } = await supabase.auth.updateUser(update);
  if (error) {
    $("passwordMessage").textContent = error.message;
    return;
  }
  closeDialog("passwordDialog");
  if (passwordMode === "authenticated") {
    $("syncStatus").textContent = "Password updated successfully.";
  } else {
    await supabase.auth.signOut();
    history.replaceState({}, "", "/auth/?password=updated");
    setMode("signin");
    show("signedOutPanel");
    $("formMessage").textContent = "Password updated. Sign in with your new password.";
  }
});

$("changePasswordButton").addEventListener("click", () => openPasswordDialog("authenticated"));
$("closePasswordDialog").addEventListener("click", () => closeDialog("passwordDialog"));

$("deleteAccountButton").addEventListener("click", () => {
  $("deleteConfirmation").value = "";
  $("deleteMessage").textContent = "";
  openDialog("deleteDialog");
});

$("deleteForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if ($("deleteConfirmation").value !== "DELETE") return;
  const button = event.submitter;
  button.disabled = true;
  $("deleteMessage").textContent = "Deleting your account and MotionC data…";
  try {
    const { error } = await supabase.functions.invoke("delete-account", { body: { confirmation: "DELETE" } });
    if (error) throw error;
    await supabase.auth.signOut({ scope: "local" });
    clearLocalState();
    localStorage.removeItem(ACTIVE_USER_KEY);
    closeDialog("deleteDialog");
    $("accountForm").reset();
    setMode("signin");
    show("signedOutPanel");
    $("formMessage").textContent = "Your MotionC account and associated data were permanently deleted.";
  } catch (error) {
    $("deleteMessage").textContent = error.message || "The account could not be deleted.";
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => closeDialog(button.dataset.closeDialog));
});

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") openPasswordDialog("recovery");
});

setMode(requestedMode === "create" ? "create" : "signin");
show("signedOutPanel");
const recoveryRequested = requestedMode === "recovery" || location.hash.includes("type=recovery");
const existing = await getSession();
if (recoveryRequested) {
  openPasswordDialog("recovery");
} else if (existing) {
  try {
    await finishLogin(existing, { stayOnAccount: manageRequested });
  } catch (error) {
    $("formMessage").textContent = error.message || "The account could not be opened.";
    show("signedOutPanel");
  }
} else if (params.get("confirmed")) {
  $("formMessage").textContent = "Email confirmed. Sign in to continue.";
}
