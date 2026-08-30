import {
  supabase, getSession, readCloudState, activateUser,
  makeFreshState, clearLocalState
} from "../shared/motionc-supabase.js?v=20260820-2";

const $ = (id) => document.getElementById(id);
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const ACTIVE_USER_KEY = "motionc-auth-active-user";
const AUTH_TIMEOUT_MS = 15000;
let mode = "signin";
let activeSession = null;
let passwordMode = "recovery";
let usernameCheckTimer = null;
let usernameCheckSequence = 0;

function setAccountMessage(message = "", state = "info") {
  const output = $("formMessage");
  output.textContent = message;
  output.dataset.state = message ? state : "";
  output.setAttribute("aria-live", state === "error" ? "assertive" : "polite");
}

function setAccountBusy(busy) {
  const button = $("submitButton");
  const creating = mode === "create";
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  $("accountForm").setAttribute("aria-busy", String(busy));
  button.textContent = busy
    ? (creating ? "Creating account…" : "Signing in…")
    : (creating ? "Create account" : "Sign in");
}

function withTimeout(promise, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), AUTH_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}
const params = new URLSearchParams(location.search);
const requestedNext = params.get("next");
const safeNext = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : null;
let referrerReturn = null;
try {
  const referrer = new URL(document.referrer);
  if (referrer.origin === location.origin && !referrer.pathname.startsWith("/auth")) {
    referrerReturn = `${referrer.pathname}${referrer.search}${referrer.hash}`;
  }
} catch {
  // Direct visits have no usable same-site referrer.
}
$("accountBack").href = safeNext || referrerReturn || "/landing-page/";
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

const eyeIcon = (visible) => visible
  ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 6 9 6a16.5 16.5 0 0 1-2.1 2.8M6.6 6.6C4.3 8.1 3 10 3 10s3.5 6 9 6c1 0 2-.2 2.9-.5"/></svg>`
  : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>`;

function setPasswordVisibility(input, visible) {
  const button = input.parentElement?.querySelector(".password-toggle");
  input.type = visible ? "text" : "password";
  if (!button) return;
  button.setAttribute("aria-pressed", String(visible));
  button.setAttribute("aria-label", visible ? "Hide password" : "Show password");
  button.title = visible ? "Hide password" : "Show password";
  button.innerHTML = eyeIcon(visible);
}

function installPasswordToggles() {
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    const control = document.createElement("span");
    control.className = "password-control";
    input.parentNode.insertBefore(control, input);
    control.appendChild(input);
    const button = document.createElement("button");
    button.className = "password-toggle";
    button.type = "button";
    control.appendChild(button);
    setPasswordVisibility(input, false);
    button.addEventListener("click", () => {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      setPasswordVisibility(input, input.type === "password");
      input.focus({ preventScroll: true });
      if (start !== null && end !== null) input.setSelectionRange(start, end);
    });
  });
}

function openPasswordDialog(nextMode) {
  passwordMode = nextMode;
  const authenticatedChange = passwordMode === "authenticated";
  $("passwordEyebrow").textContent = authenticatedChange ? "ACCOUNT SECURITY" : "EMAIL CONFIRMED";
  $("passwordDialogTitle").textContent = authenticatedChange ? "Change your password" : "Choose a new password";
  $("currentPasswordField").classList.toggle("hidden", !authenticatedChange);
  $("currentPassword").required = authenticatedChange;
  $("passwordForm").reset();
  ["currentPassword", "newPassword", "confirmPassword"].forEach((id) => setPasswordVisibility($(id), false));
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
  $("username").setCustomValidity("");
  $("usernameAvailability").textContent = "";
  $("createPasswordConfirmationField").classList.toggle("hidden", !creating);
  $("createPasswordConfirmation").required = creating;
  if (!creating) {
    $("createPasswordConfirmation").value = "";
    setPasswordVisibility($("createPasswordConfirmation"), false);
  }
  setAccountBusy(false);
  $("password").autocomplete = creating ? "new-password" : "current-password";
  $("passwordRequirements").classList.toggle("hidden", !creating);
  $("forgotPasswordButton").classList.toggle("hidden", creating);
  setAccountMessage();
}

async function checkUsernameAvailability() {
  if (mode !== "create") return true;
  const username = $("username").value.trim();
  const status = $("usernameAvailability");
  if (!USERNAME_PATTERN.test(username)) {
    $("username").setCustomValidity("");
    status.textContent = "";
    return false;
  }

  const sequence = ++usernameCheckSequence;
  status.textContent = "Checking username…";
  status.classList.remove("available", "unavailable");
  const { data, error } = await supabase.rpc("motionc_username_available", { candidate: username });
  if (sequence !== usernameCheckSequence) return false;
  if (error) throw error;

  const available = data === true;
  $("username").setCustomValidity(available ? "" : "That username is already in use.");
  status.textContent = available ? "Username is available." : "That username is already in use.";
  status.classList.toggle("available", available);
  status.classList.toggle("unavailable", !available);
  return available;
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
  if (stayOnAccount) {
    $("currentUsername").textContent = username;
    show("signedInPanel");
    return;
  }
  location.assign(safeNext || "/landing-page/");
}

$("signInTab").addEventListener("click", () => setMode("signin"));
$("createTab").addEventListener("click", () => setMode("create"));
$("username").addEventListener("input", () => {
  window.clearTimeout(usernameCheckTimer);
  usernameCheckSequence += 1;
  $("username").setCustomValidity("");
  $("usernameAvailability").textContent = "";
  $("usernameAvailability").classList.remove("available", "unavailable");
  if (mode === "create" && USERNAME_PATTERN.test($("username").value.trim())) {
    usernameCheckTimer = window.setTimeout(() => {
      checkUsernameAvailability().catch(() => {
        $("usernameAvailability").textContent = "Username check is temporarily unavailable.";
      });
    }, 350);
  }
});
$("username").addEventListener("blur", () => {
  window.clearTimeout(usernameCheckTimer);
  if (mode === "create" && USERNAME_PATTERN.test($("username").value.trim())) {
    checkUsernameAvailability().catch(() => {
      $("usernameAvailability").textContent = "Username check is temporarily unavailable.";
    });
  }
});

$("accountForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    setAccountMessage("Check the highlighted email and password fields, then try again.", "error");
    return;
  }
  setAccountBusy(true);
  setAccountMessage();
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    let result;
    if (mode === "create") {
      const username = $("username").value.trim();
      if (!USERNAME_PATTERN.test(username)) throw new Error("Choose a username using 3–24 letters, numbers, or underscores.");
      if (!await checkUsernameAvailability()) {
        $("username").focus();
        throw new Error("That username is already in use.");
      }
      if (password !== $("createPasswordConfirmation").value) throw new Error("The passwords do not match.");
      result = await withTimeout(
        supabase.auth.signUp({ email, password, options: { emailRedirectTo: confirmationReturn, data: { username } } }),
        "Account creation is taking longer than expected. Check your connection and try again."
      );
    } else {
      result = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        "Sign-in is taking longer than expected. Check your connection and try again."
      );
    }
    if (result.error) throw result.error;
    if (!result.data.session) {
      setAccountMessage("Check your email and select Confirm. The link will return you safely to MotionC.", "success");
      return;
    }
    await withTimeout(
      finishLogin(result.data.session),
      "You are signed in, but restoring your MotionC data is taking longer than expected. Refresh this page to continue."
    );
  } catch (error) {
    const message = error?.message === "Invalid login credentials"
      ? "That email and password did not match. Try again or use Forgot password."
      : (error.message || "The account could not be opened. Please try again.");
    setAccountMessage(message, "error");
    $("password").focus();
    $("password").select();
  } finally {
    setAccountBusy(false);
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

installPasswordToggles();
setMode(requestedMode === "create" ? "create" : "signin");
show("signedOutPanel");
window.motioncAuthReady = true;
const recoveryRequested = requestedMode === "recovery" || location.hash.includes("type=recovery");
const existing = await getSession();
if (recoveryRequested) {
  openPasswordDialog("recovery");
} else if (existing && manageRequested) {
  try {
    await finishLogin(existing, { stayOnAccount: true });
  } catch (error) {
    $("formMessage").textContent = error.message || "The account could not be opened.";
    show("signedOutPanel");
  }
} else if (params.get("confirmed")) {
  $("formMessage").textContent = "Email confirmed. Sign in to continue.";
}
