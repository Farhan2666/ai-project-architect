import { MAGIC_APP_ANALYSIS } from "@/lib/system-prompts";

export interface PipelineContext {
  masterStructure: string;
  expandedSections: string[];
  compressedSummary: string;
  lore: Record<string, string[]>;
  dataModels?: Record<string, EntitySchema>;
  featureSpecs?: Record<string, FeatureSpec>;
  apiContracts?: ApiContract[];
  stateMachines?: Record<string, StateMachine>;
}

export interface EntitySchema {
  name: string;
  fields: EntityField[];
  relations: EntityRelation[];
}

export interface EntityField {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  default?: string;
  description?: string;
}

export interface EntityRelation {
  type: "one-to-many" | "many-to-many" | "one-to-one";
  targetEntity: string;
  viaField?: string;
}

export interface FeatureSpec {
  name: string;
  purpose: string;
  inputFormat: string;
  outputFormat: string;
  logicFlow: string[];
  dataStructures: string[];
}

export interface ApiContract {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
  errorCodes?: string[];
}

export interface StateMachine {
  name: string;
  states: string[];
  transitions: StateTransition[];
  initial: string;
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
}

const DEFAULT_LORE: Record<string, string[]> = {
  app_name: [],
  core_concept: [],
  design_vibe: [],
  target_audience: [],
  tech_stack: [],
  features: [],
  data_models: [],
  business_logic: [],
  user_roles: [],
  integrations: [],
  unresolved_questions: [],
};

export function extractLore(text: string, existing: Record<string, string[]> = DEFAULT_LORE): Record<string, string[]> {
  const lore = { ...existing };
  const lines = text.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes("app name") || lower.includes("application name") || lower.includes("project name") || lower.includes("nama aplikasi")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && !lore.app_name.includes(val)) lore.app_name.push(val);
    }
    if (lower.includes("concept") || lower.includes("does") || lower.includes("solves") || lower.includes("konsep")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && val.length > 5 && !lore.core_concept.includes(val)) lore.core_concept.push(val);
    }
    if (lower.includes("vibe") || lower.includes("design") || lower.includes("ui") || lower.includes("style") || lower.includes("tampilan")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && !lore.design_vibe.includes(val)) lore.design_vibe.push(val);
    }
    if (lower.includes("audience") || lower.includes("user") || lower.includes("customer") || lower.includes("pengguna") || lower.includes("target")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && !lore.target_audience.includes(val)) lore.target_audience.push(val);
    }
    if (lower.includes("tech") || lower.includes("stack") || lower.includes("react") || lower.includes("database") || lower.includes("api") || lower.includes("teknologi")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && !lore.tech_stack.includes(val)) lore.tech_stack.push(val);
    }
    if (lower.includes("fitur") || lower.includes("feature") || lower.includes("fungsi")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && val.length > 4 && !lore.features.includes(val)) lore.features.push(val);
    }
    if (lower.includes("model") || lower.includes("entity") || lower.includes("schema") || lower.includes("tabel") || lower.includes("database") || lower.includes("struktur data")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && val.length > 3 && !lore.data_models.includes(val)) lore.data_models.push(val);
    }
    if (lower.includes("bisnis") || lower.includes("logic") || lower.includes("alur") || lower.includes("proses") || lower.includes("workflow")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && val.length > 5 && !lore.business_logic.includes(val)) lore.business_logic.push(val);
    }
    if (lower.includes("role") || lower.includes("peran") || lower.includes("admin") || lower.includes("user") || lower.includes("izin") || lower.includes("permission")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && !lore.user_roles.includes(val)) lore.user_roles.push(val);
    }
    if (lower.includes("integrasi") || lower.includes("integration") || lower.includes("api") || lower.includes("third party") || lower.includes("pihak ketiga")) {
      const val = line.replace(/^.*?[::\-â€“–]\s*/, "").trim();
      if (val && !lore.integrations.includes(val)) lore.integrations.push(val);
    }
  }

  return lore;
}

export function compressContext(text: string, maxTokens: number = 2000): string {
  const words = text.split(/\s+/);
  if (words.length <= maxTokens) return text;

  const sections = text.split(/(?=^###?\s)/m);
  const kept: string[] = [];
  let total = 0;

  for (const section of sections) {
    const sectionWords = section.split(/\s+/).length;
    if (total + sectionWords <= maxTokens) {
      kept.push(section);
      total += sectionWords;
    } else {
      const remaining = maxTokens - total;
      if (remaining > 50) {
        kept.push(section.split(/\s+/).slice(0, remaining).join(" ") + "\n\n[...truncated]");
      }
      break;
    }
  }

  return kept.join("\n");
}

export function getPipelineSystemPrompt(
  stage: number,
  isMagicMode: boolean = false,
  previousStageSummaries?: Record<string, string>,
): string {
  const commonInstruction = "\n\nINSTRUKSI PENTING: \n1. Gunakan Bahasa Indonesia yang ramah dan profesional. \n2. Jadilah konsultan yang proaktif. Jangan langsung membuat dokumen final, tapi berikan masukan, ide kreatif, atau kritik membangun atas ide pengguna. \n3. Diskusikan secara bolak-balik sampai pengguna merasa idenya matang.\n4. JIKA pengguna secara spesifik meminta untuk dirangkum, difinalisasi, atau dibuatkan dokumen akhir, barulah hasilkan rangkuman terstruktur dalam format Markdown sesuai tahap ini (tanpa basa-basi).";

  if (isMagicMode) {
    const magicInstruction = "\n\n" + MAGIC_APP_ANALYSIS;

    const basePrompts: Record<number, string> = {
      [-1]: "Kamu adalah Market Research Analyst yang ahli. Tugasmu adalah langsung meriset pasar dan merumuskan analisis kompetitor secara mendalam, faktual, dan lengkap (Identifikasi 3 kompetitor nyata, analisis kelebihan/kekurangan, USP, target market underserved). Hasilkan dokumen Markdown yang rapi tanpa basa-basi.",
      0: "Kamu adalah Brand Strategist yang ahli. Tugasmu adalah langsung merumuskan identitas brand lengkap untuk konsep aplikasi pengguna.\n\n" +
          "Wajib sertakan: Nama Aplikasi, Konsep Inti, Warna, Vibe UI, Konsep Logo.\n" +
          "Jelaskan alasan di balik setiap keputusan brand agar AI agent lain paham konteksnya." + magicInstruction,
      1: "Kamu adalah Product Manager yang ahli. Tugasmu adalah langsung merumuskan PRD lengkap untuk konsep aplikasi pengguna.\n\n" +
          "FOKUS UTAMA: Untuk SETIAP fitur, definisikan SPESIFIKASI KONKRIT:\n" +
          "- Nama Fitur & Tujuan\n" +
          "- Input Format: data apa yang masuk (field, tipe, format)\n" +
          "- Output Format: data apa yang dihasilkan\n" +
          "- Logic Flow: langkah-langkah detail cara fitur bekerja\n" +
          "- Data Structures: entity/objek yang terlibat (field, tipe, constraint)\n" +
          "Sertakan juga: Core Problem (dengan User Stories), Target Audience (persona), User Flow, Non-functional Requirements." + magicInstruction,
      2: "Kamu adalah Systems Analyst yang ahli. Tugasmu adalah langsung merumuskan SRS lengkap untuk konsep aplikasi pengguna.\n\n" +
          "WAJIB:\n" +
          "1. Data Models — entity, field, tipe data, constraint, relasi (tulis dalam format \\`\\`\\`typescript)\n" +
          "2. Business Logic — langkah detail tiap proses bisnis\n" +
          "3. State Machines — untuk fitur stateful (contoh: message: sending→sent→delivered→read)\n" +
          "4. Permission Matrix — role × action × resource\n" +
          "5. Validation Rules — untuk setiap input\n" +
          "6. Edge Cases — skenario error + penanganan" + magicInstruction,
      3: (() => {
        const base = "Kamu adalah Software Architect yang ahli. Tugasmu adalah langsung merumuskan SDD lengkap untuk konsep aplikasi pengguna.\n\n" +
            "WAJIB:\n" +
            "1. Database Schema — tabel, kolom, tipe, FK, index (format \\`\\`\\`sql atau \\`\\`\\`typescript)\n" +
            "2. API Contracts — endpoint, method, request body, response body, error codes (format \\`\\`\\`typescript)\n" +
            "3. Event / Message Schemas — WebSocket, pub/sub payloads\n" +
            "4. State Machine Implementation — bagaimana state ditangani di sistem\n" +
            "5. Tech Stack + alasan pemilihan\n" +
            "6. Integrasi pihak ketiga";
        const infra = previousStageSummaries
          ? buildInfrastructurePrompt(detectInfrastructureContext(previousStageSummaries))
          : "\n\n7. Infrastruktur — hosting, deployment, security, caching, scaling yang spesifik untuk jenis aplikasi ini";
        return base + infra + magicInstruction;
      })(),
      4: "Kamu adalah UX Designer yang ahli. Tugasmu adalah langsung merumuskan alur UI/UX lengkap untuk konsep aplikasi pengguna.\n\n" +
          "WAJIB:\n" +
          "1. Screen Specifications — tiap screen: route, komponen, layout, state\n" +
          "2. Interaction Specifications — User action → System process → Response\n" +
          "3. Navigation Flow — graph antar screen + params\n" +
          "4. Component Hierarchy — parent-child\n" +
          "5. States per komponen — loading, empty, error, success" + magicInstruction,
      5: "Kamu adalah Agile Project Manager yang ahli. Tugasmu adalah langsung memecah konsep aplikasi pengguna menjadi tugas-tugas sprint yang actionable (Fase 1 hingga selesai).\n\n" +
          "Setiap task wajib: judul, estimasi (S/M/L/XL), referensi ke spesifikasi fitur dari stage sebelumnya, dependensi ke task lain.\n" +
          "Atur dalam sprint 1-2 minggu." + magicInstruction,
    };
    return basePrompts[stage] || basePrompts[0];
  }

  const basePrompts: Record<number, string> = {
    [-1]: "Kamu adalah Market Research Analyst yang ahli. Tugasmu adalah mewawancarai pengguna dan membantu melakukan riset pasar serta analisis kompetitor." + commonInstruction,
    0: "Kamu adalah Brand Strategist yang ahli. Tugasmu adalah mewawancarai pengguna dan menggali identitas brand mereka (Nama Aplikasi, Konsep Inti, Warna, Vibe UI, dan Konsep Logo)." + commonInstruction,
    1: "Kamu adalah Product Manager yang ahli. Tugasmu adalah mewawancarai pengguna dan mendefinisikan PRD.\n\n" +
        "Untuk SETIAP fitur, pastikan pengguna menjelaskan secara konkrit:\n" +
        "- Cara kerja fitur tersebut\n" +
        "- Data apa yang masuk dan keluar\n" +
        "- Alur logikanya bagaimana\n" +
        "Bantu pengguna merinci fiturnya dengan contoh konkrit (misal: aplikasi chat perlu jelaskan format pesan, cara pengiriman, status pesan)." + commonInstruction,
    2: "Kamu adalah Systems Analyst yang ahli. Tugasmu adalah mewawancarai pengguna dan mendefinisikan SRS (Business Logic, Edge Cases, Form Validations, User Roles, Error Handling).\n\n" +
        "Bantu pengguna mendetailkan:\n" +
        "- Data Models/Entity: apa saja objek utama di sistem, field-nya apa, tipe datanya\n" +
        "- State Machine: apakah ada fitur yang punya status/state (contoh: status pesan, status pesanan)\n" +
        "- Permission: siapa bisa akses apa" + commonInstruction,
    3: (() => {
      const base = "Kamu adalah Software Architect yang ahli. Tugasmu adalah mewawancarai pengguna dan mendefinisikan SDD (Tech Stack, Database Schema, API Architecture, Integrations).\n\n" +
          "WAJIB digali:\n" +
          "- Database Schema: tabel, kolom, tipe, foreign key, index\n" +
          "- API Contracts: untuk setiap fitur, endpoint apa yang dibutuhkan\n" +
          "- Message/Event Schemas: untuk fitur real-time\n" +
          "- Arsitektur keseluruhan";
      const infra = previousStageSummaries
        ? buildInfrastructurePrompt(detectInfrastructureContext(previousStageSummaries))
        : "\n\nSelain Tech Stack, Database Schema, API Architecture, dan Integrations, kamu JUGA harus memberikan rekomendasi infrastruktur (hosting, deployment, security, monitoring, CI/CD, caching, scaling) yang relevan dengan jenis aplikasi ini.";
      return base + commonInstruction + infra;
    })(),
    4: "Kamu adalah UX Designer yang ahli. Tugasmu adalah mewawancarai pengguna dan memetakan alur UI/UX (Screen breakdown, Modals, Navigation, Key Interactions).\n\n" +
        "Gali detail per screen:\n" +
        "- Apa saja komponen di screen ini?\n" +
        "- Data apa yang ditampilkan?\n" +
        "- Interaksi apa yang terjadi?\n" +
        "- State apa saja yang mungkin (loading, error, empty)?" + commonInstruction,
    5: "Kamu adalah Agile Project Manager yang ahli. Tugasmu adalah mewawancarai pengguna dan memecah proyek menjadi tugas-tugas sprint yang actionable (Fase 1 hingga selesai)." + commonInstruction,
  };
  return basePrompts[stage] || basePrompts[0];
}

// ============================================================
// INFRASTRUCTURE CONTEXT DETECTION & RECOMMENDATIONS
// ============================================================

interface InfrastructureContext {
  appType: string;
  scale: "small" | "medium" | "enterprise";
  needsAuth: boolean;
  needsRealtime: boolean;
  needsFileUpload: boolean;
  needsPayment: boolean;
  needsSearch: boolean;
  needsEmail: boolean;
  isPublicFacing: boolean;
  hasUserRole: boolean;
}

function detectInfrastructureContext(
  previousStageSummaries?: Record<string, string>,
): InfrastructureContext {
  const allText = previousStageSummaries
    ? Object.values(previousStageSummaries).join(" ").toLowerCase()
    : "";

  const ctx: InfrastructureContext = {
    appType: "general",
    scale: "small",
    needsAuth: false,
    needsRealtime: false,
    needsFileUpload: false,
    needsPayment: false,
    needsSearch: false,
    needsEmail: false,
    isPublicFacing: true,
    hasUserRole: false,
  };

  // Detect app type keywords
  const typeKeywords: Record<string, string[]> = {
    novel: ["novel", "baca", "reading", "cerita", "story", "fiction", "buku", "book", "literature", "fiksi"],
    ecommerce: ["ecommerce", "e-commerce", "toko", "store", "shop", "jualan", "jual", "beli", "checkout", "cart", "keranjang", "payment", "bayar", "transaksi"],
    social: ["social", "sosial", "chat", "messaging", "forum", "komunitas", "community", "post", "feed", "timeline"],
    dashboard: ["dashboard", "admin", "panel", "analytics", "monitoring", "report", "laporan"],
    education: ["education", "edukasi", "belajar", "learning", "course", "kursus", "sekolah", "school", "quiz", "ujian"],
    portfolio: ["portfolio", "portofolio", "personal", "blog", "website pribadi"],
    landing: ["landing", "promo", "marketing", "company profile"],
    ai: ["ai", "machine learning", "ml", "openai", "llm", "chatbot", "generative"],
    finance: ["finance", "keuangan", "banking", "investasi", "investment", "wallet", "dompet", "uang"],
    health: ["health", "kesehatan", "medical", "dokter", "doctor", "appointment", "booking", "clinic"],
    food: ["food", "makanan", "restaurant", "restoran", "order", "pesanan", "delivery", "外卖"],
    music: ["music", "musik", "audio", "podcast", "streaming"],
    game: ["game", "gaming", "leaderboard", "achievement"],
    booking: ["booking", "reservation", "jadwal", "schedule", "appointment"],
  };

  for (const [type, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some((kw) => allText.includes(kw))) {
      ctx.appType = type;
      break;
    }
  }

  // Detect features from summaries
  ctx.needsAuth = /auth|login|register|akun|profil|user.*account|sign.?in|sign.?up/i.test(allText);
  ctx.needsRealtime = /realtime|real.?time|live|chat|pesan|message|notif/i.test(allText);
  ctx.needsFileUpload = /upload|file|image|gambar|foto|dokumen|pdf|lampiran/i.test(allText);
  ctx.needsPayment = /payment|bayar|transaksi|checkout|cart|keranjang|midtrans|xendit|stripe/i.test(allText);
  ctx.needsSearch = /search|cari|filter|filtering|query/i.test(allText);
  ctx.needsEmail = /email|notif|notification|newsletter/i.test(allText);
  ctx.hasUserRole = /role|admin|moderator|permission|hak akses|otorisasi/i.test(allText);

  // Detect scale from complexity signals
  const enterpriseSignals = /enterprise|perusahaan|korporat|scalab|high.?traffic|ribuan|jutaan|multi.?tenant|banyak.*user/i;
  const mediumSignals = /multi.?user|team|collaboration|several|hundreds|payment|real.?time/i;
  if (enterpriseSignals.test(allText)) ctx.scale = "enterprise";
  else if (mediumSignals.test(allText)) ctx.scale = "medium";

  return ctx;
}

function buildInfrastructurePrompt(ctx: InfrastructureContext): string {
  const sections: string[] = [];

  sections.push(`\n\n## INFRASTRUCTURE & DEVOPS RECOMMENDATIONS`);
  sections.push(`Berdasarkan jenis aplikasi "${ctx.appType}" dengan skala ${ctx.scale}, berikut rekomendasi infrastruktur yang RELEVAN. Sertakan hanya yang sesuai — JANGAN sertakan aspek yang tidak relevan dengan aplikasi ini.`);

  // 1. API & Backend
  sections.push(`\n### 1. API & Backend Architecture`);
  if (ctx.appType === "novel" || ctx.appType === "portfolio" || ctx.appType === "landing") {
    sections.push(`- API sederhana untuk CRUD data konten\n- Pertimbangkan serverless functions (Vercel/Cloudflare Workers) untuk cost efficiency\n- Gunakan REST API untuk kemudahan development`);
  } else if (ctx.scale === "enterprise") {
    sections.push(`- Microservices atau modular monolith dengan clear domain boundaries\n- API Gateway untuk rate limiting, auth, dan routing\n- GraphQL atau REST tergantung kebutuhan frontend\n- Message queue (Redis/RabbitMQ) untuk async processing`);
  } else {
    sections.push(`- REST API dengan express/fastify/nestjs\n- Struktur endpoint yang terorganisir per domain\n- Middleware untuk auth, validation, dan error handling`);
  }

  // 2. Database & Storage
  sections.push(`\n### 2. Database & Storage`);
  if (ctx.appType === "novel") {
    sections.push(`- PostgreSQL atau SQLite untuk data novel/konten\n- File storage (Supabase Storage/R2) untuk cover buku dan gambar\n- Tidak perlu real-time database`);
  } else if (ctx.appType === "ecommerce") {
    sections.push(`- PostgreSQL untuk data produk, pesanan, dan user\n- Redis untuk cart session dan caching produk\n- Object storage (S3/R2) untuk gambar produk\n- Indexing strategis untuk product search`);
  } else if (ctx.appType === "social") {
    sections.push(`- PostgreSQL untuk user data dan posts\n- Redis untuk real-time features dan caching\n- Full-text search (Meilisearch/Typesense) untuk konten\n- File storage untuk media uploads`);
  } else if (ctx.scale === "enterprise") {
    sections.push(`- PostgreSQL dengan read replicas untuk scaling\n- Redis cluster untuk caching dan session\n- Object storage (S3/MinIO) untuk file\n- Database migration strategy (Prisma/Drizzle)`);
  } else {
    sections.push(`- PostgreSQL atau MySQL untuk data utama\n- Redis untuk caching (jika diperlukan)\n- ORM (Prisma/Drizzle/TypeORM) untuk database access\n- Backup strategy otomatis`);
  }

  // 3. Authentication & Authorization
  if (ctx.needsAuth) {
    sections.push(`\n### 3. Authentication & Authorization`);
    if (ctx.appType === "social" || ctx.scale === "enterprise") {
      sections.push(`- OAuth2 (Google, GitHub, Apple) + email/password\n- JWT dengan refresh token rotation\n- Role-based access control (RBAC)\n- Session management dengan Redis\n- Rate limiting pada auth endpoints`);
    } else {
      sections.push(`- JWT atau session-based auth\n- OAuth2 (Google) untuk social login\n- Password hashing dengan bcrypt/argon2\n- Middleware auth untuk protected routes`);
    }
  }

  // 4. Hosting & Deployment
  sections.push(`\n### 4. Hosting & Deployment`);
  if (ctx.scale === "enterprise") {
    sections.push(`- Docker containers dengan Kubernetes atau Docker Compose\n- Multi-environment: dev → staging → production\n- Blue-green atau canary deployment\n- Infrastructure as Code (Terraform/Pulumi)\n- CDN (Cloudflare/Fastly) untuk static assets`);
  } else if (ctx.scale === "medium") {
    sections.push(`- Vercel/Netlify (frontend) + Railway/Render (backend)\n- Staging environment untuk testing\n- Docker untuk consistent builds\n- CDN bawaan platform hosting`);
  } else {
    sections.push(`- Vercel/Netlify untuk full-stack deployment\n- atau Railway/Render untuk backend + static frontend\n- Environment variables untuk konfigurasi\n- Deploy otomatis dari Git push`);
  }

  // 5. Cloud Compute
  if (ctx.scale !== "small") {
    sections.push(`\n### 5. Cloud Compute`);
    if (ctx.appType === "ai") {
      sections.push(`- GPU instances (HuggingFace Spaces/Replicate/Modal) untuk model inference\n- Serverless functions untuk API endpoints\n- Consider cost optimization: batch processing vs real-time`);
    } else if (ctx.scale === "enterprise") {
      sections.push(`- Auto-scaling groups atau Kubernetes horizontal pod autoscaler\n- Multiple availability zones untuk high availability\n- Container orchestration (ECS/GKE/AKS)`);
    } else {
      sections.push(`- Serverless functions (Lambda/Cloud Run) untuk cost efficiency\n- Atau small VPS (Hetzner/DigitalOcean) untuk simplicity`);
    }
  }

  // 6. CI/CD
  sections.push(`\n### 6. CI/CD & Version Control`);
  if (ctx.scale === "enterprise") {
    sections.push(`- GitHub Actions/GitLab CI untuk automated pipeline\n- Linting + type checking + unit tests + e2e tests\n- Automated deployment ke staging (manual promote ke prod)\n- Branch protection rules + PR reviews\n- Semantic versioning + changelog generation`);
  } else {
    sections.push(`- GitHub Actions untuk lint + build check\n- Deploy otomatis ke Vercel/Netlify dari main branch\n- Pre-commit hooks untuk code quality\n- Basic branch protection`);
  }

  // 7. Row Level Security (only if has user roles)
  if (ctx.hasUserRole) {
    sections.push(`\n### 7. Row Level Security`);
    if (ctx.needsAuth) {
      sections.push(`- Supabase RLS policies atau application-level filtering\n- User hanya bisa akses data miliknya sendiri\n- Admin/moderator punya akses lebih luas\n- Test RLS policies dengan berbagai user roles`);
    } else {
      sections.push(`- Application-level data isolation\n- Validate ownership setiap query\n- API middleware untuk auto-filter by user`);
    }
  }

  // 8. Rate Limiting
  sections.push(`\n8. Rate Limiting`);
  if (ctx.scale === "enterprise" || ctx.needsPayment) {
    sections.push(`- Tiered rate limits: anonymous < authenticated < premium\n- Upstash Redis atau Cloudflare Rate Limiting\n- Per-endpoint limits (auth endpoints lebih ketat)\n- DDoS protection (Cloudflare/AWS Shield)`);
  } else {
    sections.push(`- Basic rate limiting dengan Redis atau in-memory\n- 30-100 requests per minute per IP\n- Stricter limits pada auth dan payment endpoints`);
  }

  // 9. Cache & CDN
  sections.push(`\n### 9. Cache & CDN`);
  if (ctx.appType === "novel" || ctx.appType === "portfolio" || ctx.appType === "landing") {
    sections.push(`- CDN untuk static assets (images, CSS, JS)\n- ISR (Incremental Static Regeneration) untuk konten statis\n- Browser caching dengan proper cache headers\n- Tidak perlu server-side caching kompleks`);
  } else if (ctx.scale === "enterprise") {
    sections.push(`- Multi-layer caching: browser → CDN → application → database\n- Redis cache untuk query results\n- CDN (Cloudflare/Fastly) untuk global distribution\n- Cache invalidation strategy yang jelas`);
  } else {
    sections.push(`- CDN untuk static assets\n- Redis caching untuk frequently accessed data\n- Cache headers yang proper\n- Pertimbangkan ISR untuk Next.js`);
  }

  // 10. Load Balancer & Scaling
  if (ctx.scale !== "small") {
    sections.push(`\n### 10. Load Balancer & Scaling`);
    if (ctx.scale === "enterprise") {
      sections.push(`- Load balancer (Nginx/HAProxy/cloud LB) untuk traffic distribution\n- Horizontal scaling dengan auto-scaling\n- Database read replicas untuk read-heavy workloads\n- Health checks dan circuit breakers\n- Stateless services untuk easy scaling`);
    } else {
      sections.push(`- Platform managed scaling (Vercel auto-scale, Railway sleep)\n- Stateless architecture untuk horizontal scaling\n- Database connection pooling (PgBouncer)\n- Monitoring utilization sebelum scaling`);
    }
  }

  // 11. Error Tracking & Logs
  sections.push(`\n### 11. Error Tracking & Logs`);
  if (ctx.scale === "enterprise") {
    sections.push(`- Sentry atau Datadog untuk error tracking + APM\n- Structured logging (JSON) dengan log levels\n- Centralized logging (ELK/Loki)\n- Alerting pada error rate threshold\n- Uptime monitoring (BetterStack/Pingdom)`);
  } else {
    sections.push(`- Sentry (free tier) untuk error tracking\n- Structured logging di backend\n- Console error boundaries di frontend\n- Basic uptime monitoring (UptimeRobot free)`);
  }

  // 12. Availability & Recovery (only for production apps)
  if (ctx.scale !== "small") {
    sections.push(`\n### 12. Availability & Recovery`);
    if (ctx.scale === "enterprise") {
      sections.push(`- Automated database backups (daily + point-in-time)\n- Multi-region deployment untuk disaster recovery\n- Runbook untuk common failure scenarios\n- SLA monitoring dan status page\n- Load testing sebelum launch`);
    } else {
      sections.push(`- Database backup otomatis (daily)\n- Recovery procedure documentation\n- Graceful error handling di semua endpoints\n- Basic monitoring dan alerting`);
    }
  }

  // Always add security basics
  sections.push(`\n### Security Basics`);
  sections.push(`- Environment variables untuk secrets (jangan hardcode)\n- HTTPS enforcement\n- Input validation dan sanitization\n- CORS configuration yang ketat\n- CSP headers untuk XSS prevention`);

  return sections.join("\n");
}

export function buildPipelineMessages(
  stage: number,
  userInput: string,
  loreContext?: Record<string, string[]>,
  history?: { role: string; content: string }[],
): { role: string; content: string }[] {
  const messages: { role: string; content: string }[] = [];

  const systemContent = getPipelineSystemPrompt(stage);
  messages.push({ role: "system", content: systemContent });

  if (loreContext) {
    const loreStr = Object.entries(loreContext)
      .filter(([, v]) => v.length > 0)
      .map(([k, v]) => `[${k}]: ${v.join(", ")}`)
      .join("\n");
    if (loreStr) {
      messages.push({ role: "system", content: `Current context:\n${loreStr}` });
    }
  }

  if (history && history.length > 0) {
    const trimmed = history.slice(-6);
    for (const msg of trimmed) {
      messages.push(msg);
    }
  }

  messages.push({ role: "user", content: userInput });

  return messages;
}


