export const copy = {
  landing: {
    tagline: "Autopilot UBI",
    headline: "Your UBI, on autopilot.",
    subhead:
      "GoClaim creates a smart account that GoClaims GoodDollar for you every day and sends G$ straight to your wallet.",
    footer: "GoClaim — built on Celo + GoodDollar",
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
    walletCardHint: "Connect to begin",
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
    verifiedBadge: "Verified",
    getVerified: "Get verified",
    preparingVerification: "Preparing…",
    redirectingVerification: "Redirecting…",
    linkedWalletHint:
      "Linked to another identity. Switch to your verified wallet.",
    walletChangedSigningOut: "Wallet changed - signing you out...",
  },
  onboarding: {
    title: "Set up GoClaim",
    step1: {
      title: "Smart account created",
      body: "Your GoClaim smart account is ready. It will GoClaim G$ and send it to your wallet.",
    },
    step2: {
      title: "Link to GoodDollar",
      body: "Confirm once in your wallet.",
      cta: "Approve",
    },
    step3: {
      title: "All set",
      bodyLinked: (claimSchedule: string) =>
        `First GoClaim runs ${claimSchedule}. G$ goes to your wallet.`,
      bodyPending: (claimSchedule: string) =>
        `Complete step 2 to enable daily GoClaims ${claimSchedule}.`,
    },
    goToDashboard: "Go to Dashboard",
  },
  connect: {
    cta: "Link smart account to GoodDollar",
    confirming: "Confirming...",
    confirmInWallet: "Confirm in wallet...",
    linked: "Smart account linked — GoClaim is ready",
    connectWalletFirst: "Connect your GoodDollar wallet first.",
    switchWallet: "Switch to the wallet you signed in with.",
    wrongWallet: "Connected wallet does not match your signed-in wallet.",
  },
  dashboard: {
    headlineActive: "You're all set",
    headlineSetup: "Welcome back",
    subheadActive: (claimSchedule: string) =>
      `G$ is GoClaimed ${claimSchedule} and sent to your wallet.`,
    subheadSetup:
      "Link your smart account to GoodDollar to start GoClaiming.",
    loading: "Loading...",
    setupGoClaim: "Set up GoClaim",
    noAgent: "Your GoClaim smart account is not set up yet.",
    totalGoClaims: "Total GoClaims",
    totalGGoClaimed: "Total G$ GoClaimed",
    rootGdBalance: "Current G$ balance",
    lastGoClaimed: "Last GoClaim",
    smartAccountLabel: "GoClaim smart account",
    smartAccountHint:
      "This GoClaim smart account claims for you automatically.",
    walletLabel: "Your wallet (receives G$)",
    finishSetupCta: "Finish setup",
    backToHome: "Back to home",
    signOut: "Sign out",
  },
  setupChecklist: {
    title: "Finish setup",
    signedIn: "Signed in",
    linkSmartAccount: "Link smart account to GoodDollar",
    goClaimsStart: "Daily GoClaims start",
  },
  agentStatus: {
    cardTitle: "GoClaim status",
    active: {
      label: "Active",
      description: "G$ is GoClaimed every day and sent to your wallet.",
    },
    pending: {
      label: "Setup incomplete",
      description: "Link your smart account to GoodDollar to start GoClaiming.",
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
    title: "GoClaim history",
    empty: (claimSchedule: string) =>
      `No GoClaims yet. After you link your smart account, the first GoClaim runs ${claimSchedule}.`,
    date: "Date",
    status: "Status",
    amount: "G$ sent",
    receipt: "Receipt",
    viewOnCeloscan: "View on Celoscan",
    viewAllHistory: "View all GoClaims",
    backToDashboard: "Dashboard",
    pageSubtitle: "All your GoClaim runs",
  },
  time: {
    claimScheduleUtc: "every day at 12:00 PM UTC",
    claimScheduleShort: "12:00 PM UTC daily",
  },
  faqs: {
    title: "FAQs",
    subtitle: "Quick answers about how GoClaim works.",
    backToHome: "HOME",
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
      timeZoneName: "short",
    });
    return `${base} (${local} for you)`;
  } catch {
    return base;
  }
}
