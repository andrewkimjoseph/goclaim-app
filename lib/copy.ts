export const copy = {
  landing: {
    tagline: "Autopilot UBI",
    headline: "Your UBI, on autopilot.",
    subhead:
      "GoClaim creates a smart account that GoClaims GoodDollar for you every day and sends G$ straight to your wallet.",
    howItWorks: "How it works",
    steps: [
      {
        title: "Connect",
        description:
          "Connect the wallet where you receive GoodDollar.",
      },
      {
        title: "Link",
        description:
          "One quick approval links your GoClaim smart account to GoodDollar.",
      },
      {
        title: "Earn",
        description:
          "G$ is GoClaimed daily and sent to your wallet automatically.",
      },
    ],
  },
  auth: {
    connectWallet: "Connect wallet",
    walletCardLabel: "Your Connected Wallet",
    changeWallet: "Change wallet",
    signIn: "Sign in",
    signingIn: "Signing in...",
    signInHint:
      "Step 1 — connect your wallet. Step 2 — sign a free message to sign in.",
    sessionHint: "Sign once — your session lasts 30 days",
    checkingSession: "Checking session...",
    goToDashboard: "Go to Dashboard",
    connectToFinishSetup: "Connect wallet to finish setup",
    wrongNetwork: "Wrong network",
    walletMismatch:
      "Connected wallet differs from your signed-in wallet. Switch accounts or sign in again.",
    openingDashboard: "Opening dashboard...",
    checkingVerification: "Checking verification…",
    preparingWallet: "Preparing wallet…",
    verifiedBadge: "Verified",
    getVerified: "Get verified",
    confirmInWallet: "Confirm in wallet",
    signing: "Signing",
    linkedWalletHint:
      "Linked to another identity. Switch to your verified wallet.",
    walletChangedSigningOut: "Wallet changed - signing you out...",
  },
  onboarding: {
    title: "Set up GoClaim account",
    step1: {
      title: "Smart account created",
      body: "G$ GoClaimed to your wallet.",
    },
    step2: {
      title: "Link to GoodDollar",
      body: "Approve once.",
      cta: "Approve",
    },
    step3: {
      title: "All set",
      bodyLinked: "Daily GoClaims enabled.",
      bodyPending: "Finish step 2.",
    },
    goToDashboard: "See Dashboard",
  },
  connect: {
    cta: "Link smart account to GoodDollar",
    confirming: "Confirming...",
    confirmInWallet: "Confirm in wallet...",
    linked: "Linked — ready",
    connectWalletFirst: "Connect your GoodDollar wallet first.",
    switchWallet: "Switch to the wallet you signed in with.",
    wrongWallet: "Wrong wallet — switch to the one you signed in with.",
  },
  dashboard: {
    headlineActive: "You're all set",
    headlineSetup: "Welcome back",
    subheadActive: (claimSchedule: string) =>
      `GoClaims run ${claimSchedule}.`,
    subheadSetup: "Link to GoodDollar to start GoClaiming.",
    loading: "Loading...",
    setupGoClaim: "Set up GoClaim account",
    settingUpGoClaim: "Setting up account...",
    setupHeadline: "Set up GoClaim",
    setupSubhead: "Create account, approve once in GoodDollar.",
    setupStepsTitle: "How it works",
    setupSteps: [
      {
        title: "Create account",
        description: "Your GoClaim smart account is created.",
      },
      {
        title: "Link to GoodDollar",
        description: "Approve once in your wallet.",
      },
      {
        title: "Daily GoClaims",
        description: "G$ is sent to your wallet daily.",
      },
    ],
    noAgent: "Your GoClaim smart account is not set up yet.",
    streakLabel: "GoClaim Streak",
    streakDays: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    streakEmpty: "Your streak starts once your first GoClaim goes through.",
    streakDescription:
      "GoClaim runs automatically every day and claims your G$ for you. Your streak counts the consecutive days a GoClaim succeeds. If a day's GoClaim fails, the streak resets to zero.",
    streakClose: "Got it",
    totalGoClaims: "Total GoClaims",
    totalGGoClaimed: "Total G$ GoClaimed",
    rootGdBalance: "Current G$ balance",
    lastGoClaimed: "Last GoClaim",
    addressesLabel: "Addresses",
    smartAccountLabel: "GoClaim Smart Account",
    walletLabel: "Your Wallet",
    finishSetupCta: "Finish setup",
    backToHome: "Home",
    retry: "Retry",
    signOut: "Sign out",
    signOutConfirmTitle: "Sign out?",
    signOutConfirmBody:
      "You'll need to connect your wallet again to return to GoClaim.",
    signOutConfirmCta: "Sign out",
    signOutCancel: "Cancel",
    signOutConfirming: "Signing out...",
  },
  setupChecklist: {
    title: "Finish setup",
    signedIn: "Signed in",
    linkSmartAccount: "Link smart account to GoodDollar",
    goClaimsStart: "Daily GoClaims start",
  },
  goclaimStatus: {
    cardTitle: "GoClaim status",
    active: {
      label: "Active",
      description: "G$ is GoClaimed every day and sent to your wallet.",
    },
    pending: {
      label: "Setup incomplete",
      description: "Link to GoodDollar to start GoClaiming.",
    },
    linked_other: {
      label: "Wrong wallet linked",
      description:
        "This smart account is linked to a different wallet. Contact support or re-setup.",
    },
    inactive: {
      label: "Paused",
      description: "GoClaiming is turned off.",
    },
  },
  goClaimHistory: {
    title: "GoClaim History",
    empty: "No GoClaims yet.",
    date: "Date",
    status: "Status",
    amount: "G$ sent",
    receipt: "Receipt",
    view: "View",
    viewAllHistory: "View all GoClaims",
    backToDashboard: "Dashboard",
    pageSummary: (count: number, totalGd: string) =>
      `${count} GoClaims · ${totalGd} G$ sent`,
  },
  time: {
    claimScheduleUtc: "daily at 12:00 PM UTC",
    claimScheduleShort: "12:00 PM UTC daily",
    claimScheduleYourTime: "your time",
  },
  faqs: {
    title: "FAQs",
    subtitle: "Quick answers about how GoClaim works.",
    backToDashboard: "Dashboard",
    homeLink: "Questions? Read the FAQs",
    headerButton: "FAQs",
    items: [
      {
        question: "What is GoClaim?",
        answer:
          "GoClaim GoClaims your daily GoodDollar UBI for you and sends G$ to your wallet automatically.",
      },
      {
        question: "Who can use it?",
        answer:
          "Anyone with a GoodDollar-verified root wallet on Celo. Linked wallets won't work — connect the wallet that receives your UBI.",
      },
      {
        question: "How does setup work?",
        answer:
          "Connect your wallet, sign in, then link your GoClaim smart account to GoodDollar once. After that, GoClaims run on their own.",
      },
      {
        question: "When are GoClaims made?",
        answer:
          "Every day at 12:00 PM UTC. G$ is sent to your wallet right after each GoClaim.",
      },
      {
        question: "Where does my G$ go?",
        answer:
          "Straight to the root wallet you connected — the same wallet where you receive GoodDollar.",
      },
      {
        question: "What is the smart account?",
        answer:
          "A GoClaim-managed account on Celo that GoClaims UBI on your behalf. You approve it once in GoodDollar, then it runs in the background.",
      },
      {
        question: "Do I need to come back every day?",
        answer:
          "No. After setup, GoClaim handles daily GoClaims automatically. Check your dashboard anytime to see GoClaim history.",
      },
      {
        question: "Is sign-in free?",
        answer:
          "Yes. Sign-in uses a free wallet message — no gas fee. You only pay gas for the one-time GoodDollar link step.",
      },
    ],
  },
} as const;

/** Client-only: UTC schedule plus local equivalent when in browser. */
export function formatClaimSchedule(): string {
  const base = copy.time.claimScheduleUtc;
  if (typeof window === "undefined") return base;

  try {
    const now = new Date();
    const utcNoon = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        12,
        0,
        0
      )
    );
    const local = utcNoon.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    if (utcNoon.getTimezoneOffset() === 0) return base;

    return `${base} (${local} ${copy.time.claimScheduleYourTime})`;
  } catch {
    return base;
  }
}
