export const NAV_LINKS = [
  { href: "#parcours", labelKey: "landing.navParcours" },
  { href: "#choisir", labelKey: "landing.navWhy" },
  { href: "#couverture", labelKey: "landing.navCoverage" },
  { href: "#services", labelKey: "landing.navServices" },
  { href: "#faq", labelKey: "landing.navFaq" },
  { href: "#contact", labelKey: "landing.navContact" },
] as const;

/** Premium journey labels for the hero status marquee (not back-office chips). */
export const MARQUEE_STAT_KEYS = [
  "landing.marqueePickup",
  "landing.marqueeTransit",
  "landing.marqueeOut",
  "landing.marqueeDelivered",
  "landing.marqueeCod",
  "landing.marqueeReturns",
  "landing.marqueeSameDay",
  "landing.marqueeNationwide",
] as const;

export const HERO_PHRASE_KEYS = [
  "landing.heroPhrase1",
  "landing.heroPhrase2",
  "landing.heroPhrase3",
] as const;

export const JOURNEY_STEP_KEYS = [
  {
    titleKey: "landing.stepPickupTitle",
    bodyKey: "landing.stepPickupBody",
    icon: "pickup",
    tone: "cream" as const,
    at: 0.1,
    style: { left: "14%", top: "48%" },
  },
  {
    titleKey: "landing.stepFastTitle",
    bodyKey: "landing.stepFastBody",
    icon: "fast",
    tone: "red" as const,
    at: 0.28,
    style: { left: "33%", top: "6%" },
  },
  {
    titleKey: "landing.stepLocalTitle",
    bodyKey: "landing.stepLocalBody",
    icon: "local",
    tone: "white" as const,
    at: 0.42,
    style: { left: "48%", top: "44%" },
  },
  {
    titleKey: "landing.stepSafeTitle",
    bodyKey: "landing.stepSafeBody",
    icon: "safe",
    tone: "ink" as const,
    at: 0.56,
    style: { left: "58%", top: "8%" },
  },
  {
    titleKey: "landing.stepCodTitle",
    bodyKey: "landing.stepCodBody",
    icon: "cod",
    tone: "cream" as const,
    at: 0.72,
    style: { left: "72%", top: "48%" },
  },
  {
    titleKey: "landing.stepOnTimeTitle",
    bodyKey: "landing.stepOnTimeBody",
    icon: "ontime",
    tone: "red" as const,
    at: 0.88,
    style: { left: "86%", top: "12%" },
  },
] as const;

export const CONTACT_INTEREST_KEYS = [
  { value: "Pickup", labelKey: "landing.interestPickup" },
  { value: "Livraison", labelKey: "landing.interestDelivery" },
  { value: "COD", labelKey: "landing.interestCod" },
  { value: "Suivi", labelKey: "landing.interestTrack" },
  { value: "Console", labelKey: "landing.interestConsole" },
  { value: "Retours", labelKey: "landing.interestReturns" },
] as const;

export const WHY_POINTS = [
  { n: "01", titleKey: "landing.why1Title", bodyKey: "landing.why1Body" },
  { n: "02", titleKey: "landing.why2Title", bodyKey: "landing.why2Body" },
  { n: "03", titleKey: "landing.why3Title", bodyKey: "landing.why3Body" },
  { n: "04", titleKey: "landing.why4Title", bodyKey: "landing.why4Body" },
] as const;

export const SERVICES = [
  { n: "01", titleKey: "landing.svc1Title", bodyKey: "landing.svc1Body" },
  { n: "02", titleKey: "landing.svc2Title", bodyKey: "landing.svc2Body" },
  { n: "03", titleKey: "landing.svc3Title", bodyKey: "landing.svc3Body" },
  { n: "04", titleKey: "landing.svc4Title", bodyKey: "landing.svc4Body" },
  { n: "05", titleKey: "landing.svc5Title", bodyKey: "landing.svc5Body" },
  { n: "06", titleKey: "landing.svc6Title", bodyKey: "landing.svc6Body" },
] as const;

export const FAQ_ITEMS = [
  { qKey: "landing.faq1q", aKey: "landing.faq1a" },
  { qKey: "landing.faq2q", aKey: "landing.faq2a" },
  { qKey: "landing.faq3q", aKey: "landing.faq3a" },
  { qKey: "landing.faq4q", aKey: "landing.faq4a" },
  { qKey: "landing.faq5q", aKey: "landing.faq5a" },
  { qKey: "landing.faq6q", aKey: "landing.faq6a" },
] as const;
