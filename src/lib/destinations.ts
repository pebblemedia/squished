// Upload limits for common destinations. Every entry links to the official page
// it came from; LIMITS_CHECKED is the date the set was last verified.

export type DestinationGroup = "email" | "chat" | "social" | "marketplace" | "jobs" | "web";
export type RuleKind = "image" | "video" | "audio" | "pdf" | "any";

export interface DestinationRule {
  kind: RuleKind;
  maxBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  formats?: string[];
  label?: string;
}

export interface Destination {
  slug: string;
  name: string;
  group: DestinationGroup;
  rules: DestinationRule[];
  source: string;
  note?: string;
}

export const LIMITS_CHECKED = "2026-11-25";

export const GROUP_LABELS: Record<DestinationGroup, string> = {
  email: "Email",
  chat: "Chat",
  social: "Social",
  marketplace: "Selling & business",
  jobs: "Jobs, school & forms",
  web: "Web",
};

const KB = 1024;
const MB = 1024 * KB;

// Units: sources don't say whether MB is 1000 or 1024 bytes, so we use 1024.
export const DESTINATIONS: Destination[] = [
  {
    slug: "gmail", name: "Gmail", group: "email",
    rules: [{ kind: "any", maxBytes: 25 * MB, label: "Attachments, personal accounts" }],
    source: "https://support.google.com/mail/answer/6584",
    note: "Google Workspace admins can set their own limit.",
  },
  {
    slug: "outlook-com", name: "Outlook.com", group: "email",
    rules: [{ kind: "any", maxBytes: 25 * MB, label: "Whole email, including text and attachments" }],
    source: "https://support.microsoft.com/office/unable-to-attach-files-in-outlook-com-9e1f02c0-ac68-4e7b-b6fe-7a4075976e42",
    note: "Desktop Outlook with internet accounts is 20 MB.",
  },
  {
    slug: "yahoo-mail", name: "Yahoo Mail", group: "email",
    rules: [{ kind: "any", maxBytes: 25 * MB, label: "All attachments in one message" }],
    source: "https://help.yahoo.com/kb/SLN5673.html",
  },
  {
    slug: "icloud-mail", name: "iCloud Mail", group: "email",
    rules: [{ kind: "any", maxBytes: 20 * MB, label: "Message size" }],
    source: "https://support.apple.com/en-us/102198",
    note: "Up to 5 GB with Mail Drop turned on.",
  },
  {
    slug: "discord", name: "Discord", group: "chat",
    rules: [
      { kind: "any", maxBytes: 20 * MB, label: "Free accounts" },
      { kind: "any", maxBytes: 50 * MB, label: "Nitro Basic" },
      { kind: "any", maxBytes: 1024 * MB, label: "Nitro" },
    ],
    source: "https://support.discord.com/hc/en-us/articles/25444343291031-File-Attachments-FAQ",
    note: "Free limit rose from 10 MB to 20 MB in August 2026; Discord says it is still testing limits with some users.",
  },
  {
    slug: "slack", name: "Slack", group: "chat",
    rules: [{ kind: "any", maxBytes: 1024 * MB, label: "Per file" }],
    source: "https://slack.com/help/articles/201330736-Add-files-to-Slack",
  },
  {
    slug: "whatsapp", name: "WhatsApp", group: "chat",
    rules: [
      { kind: "video", maxBytes: 100 * MB, maxHeight: 720, label: "Video, faster connections (720p)" },
      { kind: "video", maxBytes: 64 * MB, maxHeight: 480, label: "Video, slower connections (480p)" },
      { kind: "any", maxBytes: 2048 * MB, label: "Sent as a document" },
    ],
    source: "https://faq.whatsapp.com/453914586839706/?cms_platform=web",
    note: "No published size limit for photos.",
  },
  {
    slug: "telegram", name: "Telegram", group: "chat",
    rules: [
      { kind: "any", maxBytes: 2048 * MB, label: "Free" },
      { kind: "any", maxBytes: 4096 * MB, label: "Telegram Premium" },
    ],
    source: "https://telegram.org/faq",
  },
  {
    slug: "facebook-messenger", name: "Facebook Messenger", group: "chat",
    rules: [
      { kind: "image", maxBytes: 25 * MB, label: "Photos, GIFs, stickers" },
      { kind: "audio", maxBytes: 25 * MB, label: "Voice messages" },
    ],
    source: "https://www.messenger.com/help/messenger-app/141024792690630/?locale=en_GB",
    note: "No published limit for videos or documents.",
  },
  {
    slug: "x-images", name: "X (Twitter) images", group: "social",
    rules: [
      { kind: "image", maxBytes: 5 * MB, formats: ["jpg", "png", "gif"], label: "Photos" },
      { kind: "image", maxBytes: 15 * MB, formats: ["gif"], label: "Animated GIF, web" },
    ],
    source: "https://help.x.com/en/using-x/posting-gifs-and-pictures",
    note: "BMP and TIFF are not accepted.",
  },
  {
    slug: "x-video", name: "X (Twitter) video", group: "social",
    rules: [
      { kind: "video", maxBytes: 512 * MB, label: "Non-subscribers, up to 140 seconds" },
      { kind: "video", maxBytes: 16384 * MB, maxHeight: 1080, label: "Premium, under 4 hours" },
    ],
    source: "https://help.x.com/en/using-x/x-videos",
  },
  {
    slug: "facebook-photos", name: "Facebook photos", group: "social",
    rules: [{ kind: "image", maxBytes: 15 * MB, formats: ["jpg", "bmp", "png", "gif", "tiff"], label: "Recommended maximum" }],
    source: "https://www.facebook.com/help/121317464722113",
    note: "A recommendation, not a hard cap. PNGs over 1 MB may look pixelated.",
  },
  {
    slug: "linkedin-images", name: "LinkedIn post images", group: "social",
    rules: [{ kind: "image", maxBytes: 5 * MB, minWidth: 552, minHeight: 276, label: "Photo in a post" }],
    source: "https://www.linkedin.com/help/linkedin/answer/a527229",
    note: "Aspect ratio 3:1 to 4:5; 1080 px wide recommended.",
  },
  {
    slug: "linkedin-video", name: "LinkedIn post video", group: "social",
    rules: [{ kind: "video", maxBytes: 5120 * MB, minWidth: 256, minHeight: 144, maxWidth: 4096, maxHeight: 2304, label: "Video in a post" }],
    source: "https://www.linkedin.com/help/linkedin/answer/a548372",
    note: "Minimum 75 KB; up to 15 minutes from desktop.",
  },
  {
    slug: "tiktok", name: "TikTok", group: "social",
    rules: [{ kind: "video", maxBytes: 30720 * MB, label: "TikTok Studio web upload, up to 60 min" }],
    source: "https://www.tiktok.com/creator-academy/article/power-of-tiktok-studio-web",
    note: "No published limit for app uploads.",
  },
  {
    slug: "youtube-thumbnail", name: "YouTube thumbnail", group: "social",
    rules: [{ kind: "image", maxBytes: 50 * MB, minWidth: 640, formats: ["jpg", "png"], label: "Custom video thumbnail" }],
    source: "https://support.google.com/youtube/answer/72431?hl=en",
    note: "3840x2160 (16:9) recommended.",
  },
  {
    slug: "pinterest", name: "Pinterest", group: "social",
    rules: [{ kind: "image", maxBytes: 20 * MB, formats: ["bmp", "jpg", "png", "tiff", "webp"], label: "Image Pin, web upload" }],
    source: "https://help.pinterest.com/en/article/review-pin-specs",
  },
  {
    slug: "etsy", name: "Etsy listing photo", group: "marketplace",
    rules: [{ kind: "image", maxBytes: 1 * MB, formats: ["jpg", "gif", "png", "svg", "heic"], label: "Listing photo" }],
    source: "https://help.etsy.com/hc/en-us/articles/115015663347-Requirements-and-Best-Practices-for-Images-in-Your-Etsy-Shop",
    note: "Etsy says files over 1 MB may not finish uploading; at least 2000 px recommended.",
  },
  {
    slug: "shopify", name: "Shopify product image", group: "marketplace",
    rules: [{ kind: "image", maxBytes: 20 * MB, formats: ["jpg", "png", "gif", "heic", "webp"], label: "Store image" }],
    source: "https://help.shopify.com/en/manual/online-store/images/theme-images",
    note: "Also capped at 20 megapixels.",
  },
  {
    slug: "ebay", name: "eBay listing photo", group: "marketplace",
    rules: [{ kind: "image", maxBytes: 12 * MB, minWidth: 500, minHeight: 500, label: "Listing photo" }],
    source: "https://www.ebay.com/help/selling/listings/adding-pictures-listings?id=4148",
    note: "About 1600x1600 recommended; up to 24 photos.",
  },
  {
    slug: "google-business-profile", name: "Google Business Profile", group: "marketplace",
    rules: [
      { kind: "image", maxBytes: 5 * MB, minWidth: 250, minHeight: 250, formats: ["jpg", "png"], label: "Photo" },
      { kind: "video", maxBytes: 75 * MB, minHeight: 720, label: "Video, up to 30 seconds" },
    ],
    source: "https://support.google.com/business/answer/6103862?hl=en",
    note: "Photos must be at least 10 KB; 720x720 recommended.",
  },
  {
    slug: "zillow", name: "Zillow listing photo", group: "marketplace",
    rules: [{ kind: "image", maxBytes: 25 * MB, minWidth: 1024, minHeight: 768, maxWidth: 2048, maxHeight: 1536, label: "Listing photo" }],
    source: "https://www.zillow.com/c/info/photo-uploading-tips/",
  },
  {
    slug: "airbnb", name: "Airbnb listing photo", group: "marketplace",
    rules: [{ kind: "image", maxBytes: 10 * MB, minWidth: 1200, minHeight: 800, label: "Listing photo" }],
    source: "https://www.airbnb.com/resources/hosting-homes/a/how-to-take-great-photos-for-your-listing-687",
    note: "Guidance (\"up to about 10 megabytes\"), not a hard cap.",
  },
  {
    slug: "linkedin-resume", name: "LinkedIn resume (Easy Apply)", group: "jobs",
    rules: [{ kind: "pdf", maxBytes: 2 * MB, formats: ["pdf", "doc", "docx"], label: "Resume" }],
    source: "https://www.linkedin.com/help/linkedin/answer/a510363",
    note: "LinkedIn recommends staying under 2 MB.",
  },
  {
    slug: "canvas-lms", name: "Canvas LMS", group: "jobs",
    rules: [
      { kind: "video", maxBytes: 500 * MB, label: "Media tool" },
      { kind: "audio", maxBytes: 500 * MB, label: "Media tool" },
      { kind: "any", maxBytes: 5120 * MB, label: "Most files" },
    ],
    source: "https://community.instructure.com/en/kb/articles/387061-canvas-file-quotas",
    note: "Default storage quota is 50 MB per user; schools can change it.",
  },
  {
    slug: "common-app", name: "Common App", group: "jobs",
    rules: [{ kind: "pdf", maxBytes: 2000 * KB, label: "SAT score report PDF" }],
    source: "https://appsupport.commonapp.org/s/article/SAT-score-report-PDF-file-size-2000-KB",
  },
  {
    slug: "uscis", name: "USCIS online filing", group: "jobs",
    rules: [{ kind: "any", maxBytes: 12 * MB, formats: ["pdf", "jpg", "jpeg"], label: "Per evidence file" }],
    source: "https://www.uscis.gov/file-online/tips-for-filing-forms-online",
  },
  {
    slug: "wordpress", name: "WordPress media upload", group: "web",
    rules: [{ kind: "any", maxBytes: 2 * MB, label: "PHP default (upload_max_filesize)" }],
    source: "https://www.php.net/manual/en/ini.core.php",
    note: "Set by your host; 2 MB is PHP's default and most hosts allow more.",
  },
];

export const DESTINATIONS_BY_SLUG: Record<string, Destination> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.slug, d])
);
