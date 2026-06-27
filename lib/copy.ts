export const copy = {
  landing: {
    tagline: "Autopilot UBI",
    headline: "Your UBI, on autopilot.",
    subhead:
      "GoClaim creates a smart account that claims GoodDollar for you every day and sends G$ straight to your wallet.",
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
          "G$ is claimed daily and sent to your wallet automatically.",
      },
    ],
  },
  auth: {
    connectWallet: "Connect GoodDollar wallet",
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
  },
  onboarding: {
    title: "Set up GoClaim",
    step1: {
      title: "Smart account created",
      body: "Your GoClaim smart account is ready. It will claim G$ and send it to your wallet.",
      showAddress: "Show smart account address",
      celoscanTitle: "Why does the address look empty on Celoscan?",
      celoscanBody:
        "Your smart account activates on its first claim. Until then, block explorers may show a normal wallet address — that is expected.",
    },
    step2: {
      title: "Link to GoodDollar",
      body: "Approve one transaction from your wallet. This tells GoodDollar your smart account can claim for you.",
      cta: "Link smart account to GoodDollar",
    },
    step3: {
      title: "All set",
      bodyLinked: (claimSchedule: string) =>
        `First claim runs ${claimSchedule}. G$ goes to your wallet.`,
      bodyPending: (claimSchedule: string) =>
        `Complete step 2 to enable daily claims ${claimSchedule}.`,
    },
    goToDashboard: "Go to Dashboard",
  },
  connect: {
    cta: "Link smart account to GoodDollar",
    confirming: "Confirming...",
    confirmInWallet: "Confirm in wallet...",
    linked: "Smart account linked — you're all set",
    connectWalletFirst: "Connect your GoodDollar wallet first.",
    switchWallet: "Switch to the wallet you signed in with.",
    wrongWallet: "Connected wallet does not match your signed-in wallet.",
    technicalDetails: "Technical details",
    technicalLinking: (address: string) => `Linking address ${address}`,
  },
  dashboard: {
    headlineActive: "You're all set",
    headlineSetup: "Welcome back",
    subheadActive: (claimSchedule: string) =>
      `G$ is claimed ${claimSchedule} and sent to your wallet.`,
    subheadSetup: "Link your smart account to GoodDollar to start claiming.",
    loading: "Loading...",
    setupGoClaim: "Set up GoClaim",
    noAgent: "Your GoClaim smart account is not set up yet.",
    totalClaims: "Total claims",
    lastClaimed: "Last claimed",
    smartAccountLabel: "GoClaim smart account",
    smartAccountHint:
      "This smart account claims for you automatically.",
    walletLabel: "Your wallet (receives G$)",
    finishSetupBanner: "One step left: link your smart account to GoodDollar",
    finishSetupCta: "Finish setup",
    backToHome: "Back to home",
    signOut: "Sign out",
  },
  setupChecklist: {
    title: "Finish setup",
    signedIn: "Signed in",
    linkSmartAccount: "Link smart account to GoodDollar",
    claimsStart: "Daily claims start",
  },
  agentStatus: {
    cardTitle: "GoClaim status",
    active: {
      label: "Active",
      description: "G$ is claimed every day and sent to your wallet.",
    },
    pending: {
      label: "Setup incomplete",
      description: "Link your smart account to GoodDollar to start.",
    },
    linked_other: {
      label: "Wrong wallet linked",
      description:
        "This smart account is linked to a different wallet. Contact support or re-setup.",
    },
    inactive: {
      label: "Paused",
      description: "Claiming is turned off.",
    },
  },
  claimHistory: {
    title: "Claim history",
    empty: (claimSchedule: string) =>
      `No claims yet. After you link your smart account, the first claim runs ${claimSchedule}.`,
    date: "Date",
    status: "Status",
    amount: "Amount sent",
    receipt: "Receipt",
    viewOnCeloscan: "View on Celoscan",
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
          "GoClaim claims your daily GoodDollar UBI for you and sends G$ to your wallet automatically.",
      },
      {
        question: "Who can use it?",
        answer:
          "Anyone with a GoodDollar-verified root wallet on Celo. Linked wallets won't work — connect the wallet that receives your UBI.",
      },
      {
        question: "How does setup work?",
        answer:
          "Connect your wallet, sign in, then link your GoClaim smart account to GoodDollar once. After that, claims run on their own.",
      },
      {
        question: "When are claims made?",
        answer:
          "Every day at 12:00 PM UTC. G$ is sent to your wallet right after each claim.",
      },
      {
        question: "Where does my G$ go?",
        answer:
          "Straight to the root wallet you connected — the same wallet where you receive GoodDollar.",
      },
      {
        question: "What is the smart account?",
        answer:
          "A GoClaim-managed account on Celo that claims UBI on your behalf. You approve it once in GoodDollar, then it runs in the background.",
      },
      {
        question: "Do I need to come back every day?",
        answer:
          "No. After setup, GoClaim handles daily claims automatically. Check your dashboard anytime to see claim history.",
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
