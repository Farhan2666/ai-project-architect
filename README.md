# AI Project Architect 🚀

AI Project Architect adalah platform berbasis web interaktif yang dirancang untuk membantu developer, product manager, dan desainer dalam merancang konsep aplikasi dari awal hingga siap dikodekan secara terstruktur. Dipandu oleh AI berpersona **Senior Fullstack Developer**, pengguna dapat melakukan riset, merumuskan PRD, SRS, arsitektur sistem, alur UI/UX, hingga backlog task secara otomatis dan bertahap.

---

## 🌟 Fitur Utama

### 1. Proses Pipeline Terstruktur (6 Tahap Diskusi)
Aplikasi ini membagi proses perancangan proyek menjadi 6 tahapan terpisah:
1. **Brand & Identity:** Menentukan nama aplikasi, konsep inti, warna, vibe UI, dan konsep logo.
2. **PRD (Product Requirements Document):** Merumuskan masalah utama (core problem), audiens sasaran, fitur MVP, dan user journey.
3. **SRS (Software Requirements Specification):** Menetapkan logika bisnis, edge cases, validasi form, role user, dan penanganan error.
4. **SDD (System Design Document):** Memilih tech stack, mendesain skema database (schema), arsitektur API, dan integrasi pihak ketiga.
5. **UI/UX Flow:** Memetakan alur antar-layar (screen breakdown), penggunaan modal, alur navigasi, dan interaksi utama.
6. **Task Breakdown:** Memecah proyek menjadi backlog tugas-tugas sprint (Epic ke sub-task) yang actionable dari awal sampai selesai.

### 2. Magic Expand (✨)
Bagi pengguna yang hanya memiliki ide mentah/kasar (misal: "saya mau bikin aplikasi ojek online khusus hewan peliharaan"), fitur **Magic Expand** akan bekerja secara instan dalam 1 klik untuk:
- Menganalisis pasar konsep tersebut.
- Mengidentifikasi 2-3 kompetitor nyata beserta kelebihan & kelemahannya.
- Merancang Unique Selling Proposition (USP) yang inovatif.
- Menyusun rekomendasi awal arsitektur dan fungsionalitas utama.

### 3. Pemisahan Diskusi vs Dokumentasi (📝 Finalisasi)
Untuk memberikan pengalaman yang fleksibel, pengguna dapat berdiskusi bolak-balik (tanya-jawab) dengan AI sepuasnya di panel chat kiri. Ketika kesepakatan ide tercapai, tombol **Finalisasi & Buat Dokumen** ditekan untuk mengompilasi kesimpulan diskusi menjadi dokumen resmi di panel kanan.

### 4. Live Preview Document (Panel Kanan)
Dokumen final dirender secara real-time menggunakan format Markdown terstruktur yang rapi. Pengguna dapat:
- Melakukan penyuntingan manual secara langsung (fitur **Edit**).
- Mengunduh cadangan data proyek ke format kustom `.fictify` (JSON).
- Mengekspor dokumen lengkap ke berbagai ekstensi file: `.md` (Markdown), `.txt` (Text), `.html` (Web Page), atau `.cursorrules` (untuk digunakan sebagai basis prompt AI IDE seperti Cursor).

### 5. Multi-Provider API Key (BYOK - Bring Your Own Key)
Keamanan kunci API adalah prioritas. Seluruh kunci API disimpan secara aman di sisi klien (`localStorage` browser) dan tidak pernah dikirim ke server luar selain untuk komunikasi chat. Mendukung berbagai penyedia AI:
- OpenAI (GPT-4o, GPT-4o-mini, dll.)
- Anthropic (Claude 3.5 Sonnet, Claude Haiku, dll.)
- Google Gemini (Gemini 2.5 Flash, Gemini 2.5 Pro, dll.)
- OpenRouter, DeepSeek, Groq, hingga Endpoint API Kustom.

### 6. Voice to Text & Fallback Browser
Memungkinkan input pesan melalui suara. Dilengkapi deteksi kompatibilitas browser (seperti Firefox yang tidak mendukung Speech Recognition bawaan) untuk menyembunyikan tombol mikrofon secara dinamis guna mencegah crash sistem.

---

## 🛠️ Teknologi & Dependensi

Proyek ini dibangun menggunakan teknologi modern untuk performa terbaik:
- **Core Framework:** Next.js 16 (App Router) & React 19.
- **Styling:** Tailwind CSS 4 (menyediakan performa styling modern dengan utility classes dan optimalisasi build).
- **Styling Components:** Base UI, Framer Motion (untuk animasi transisi halus), Lucide React (untuk set ikon).
- **State Management:** Zustand (untuk sinkronisasi instan antara state chat, API Key, dan data dokumen proyek).
- **Penyimpanan Lokal:** IndexedDB (melalui utilitas kustom di `src/lib/db.ts`) untuk performa penyimpanan dokumen berukuran besar tanpa membebani limit memori LocalStorage.
- **AI Integration:** Vercel AI SDK (`ai` & `@ai-sdk/react`) untuk streaming response teks dari LLM secara langsung.

---

## 📂 Struktur Direktori Proyek

Berikut adalah peta file utama dalam direktori `src/`:

```
src/
├── app/
│   ├── api/chat/
│   │   └── route.ts         # Endpoint backend untuk streaming chat & rate limiting
│   ├── globals.css          # Pengaturan CSS global & skema warna Tailwind
│   ├── layout.tsx           # Struktur layout HTML global Next.js
│   └── page.tsx             # Halaman utama aplikasi (Split Screen Renderer)
├── components/
│   ├── ui/                  # Komponen dasar Shadcn/Tailwind (button, input, select, dll.)
│   ├── byok-modal.tsx       # Modal pengaturan API Key & pemilihan model AI
│   ├── chat-panel.tsx       # Panel diskusi interaktif (kiri) & logika mikrofon
│   ├── document-panel.tsx   # Panel editor dokumen, export, & backup (kanan)
│   ├── split-screen.tsx     # Komponen pembagi layar responsif
│   └── toast.tsx            # Komponen notifikasi pop-up (Toast)
├── lib/
│   ├── db.ts                # Handler IndexedDB untuk menyimpan data proyek secara lokal
│   ├── system-prompts.ts    # Prompt dasar sistem
│   └── utils.ts             # Utility helper (clsx/tailwind-merge)
├── store/
│   ├── api-key.ts           # State management untuk API Key & provider
│   └── project.ts           # State management untuk tahapan aktif & dokumen
└── utils/
    ├── ai.ts                # Konfigurasi / inisialisasi AI
    ├── pipeline.ts          # Generator prompt sistem berbasis stage & mode magic
    ├── sanitize.ts          # Sanitizer parsing JSON & pengekspor dokumen (html/txt)
    └── typewriter.ts        # Efek animasi teks berjalan
```

---

## 🔄 Arsitektur Kode & Alur Data

1. **Inisialisasi Halaman (`src/app/page.tsx`):**
   - Halaman memeriksa ketersediaan API Key di `localStorage`.
   - Mengambil data proyek tersimpan dari **IndexedDB** untuk memulihkan sesi terakhir.
2. **Kirim Pesan / Magic Expand (`src/components/chat-panel.tsx`):**
   - Pesan yang diketik dikirim ke API internal `/api/chat` bersama dengan data tahapan aktif (Stage 1-6).
   - Jika pengguna menekan tombol **Magic Expand (✨)**, pesan akan otomatis dibungkus dengan perintah investigasi pasar mendalam (`[MODE MAGIC]`).
3. **Endpoint API Chat (`src/app/api/chat/route.ts`):**
   - Melakukan pengecekan **Rate Limiting** berbasis IP dan kunci API untuk mencegah penyalahgunaan.
   - Membaca stage dan memeriksa apakah mode adalah `[MODE MAGIC]`.
   - Mengambil System Prompt dari `src/utils/pipeline.ts` yang disesuaikan secara dinamis (apakah harus berdiskusi bolak-balik atau langsung menyusun riset pasar mandiri).
   - Memulai koneksi streaming ke provider LLM yang dipilih (OpenAI, Anthropic, Gemini, dll.) menggunakan Vercel AI SDK dan mengembalikan data secara real-time ke antarmuka chat.
4. **Rendering Chat Bubble (`src/components/chat-panel.tsx`):**
   - Chat bubble merender respons AI menggunakan **`ReactMarkdown`** yang dipadukan dengan styling Tailwind Typography (`prose prose-sm prose-invert`) agar seluruh heading, list, kode, dan tabel tampil dengan visual yang sangat rapi.
   - Raw prompt yang panjang untuk Magic Expand secara otomatis disembunyikan secara visual dari layar chat agar percakapan tetap bersih.
5. **Kompilasi Dokumen (`src/components/document-panel.tsx`):**
   - Setelah pengguna menekan tombol **📝 Finalisasi & Buat Dokumen**, teks rangkuman final dari tahapan tersebut disimpan ke Zustand Store dan IndexedDB.
   - Panel kanan akan memperbarui tampilannya secara langsung dengan dokumen Markdown terbaru.

---

## 🚀 Cara Menjalankan Secara Lokal

1. **Instalasi Dependensi:**
   ```bash
   npm install
   ```

2. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000).

3. **Membangun Aplikasi untuk Production:**
   ```bash
   npm run build
   ```

4. **Menjalankan Aplikasi Production:**
   ```bash
   npm run start
   ```

---

## 🌐 Penyebaran (Deployment)

Aplikasi ini siap di-*deploy* langsung ke **Vercel** secara otomatis cukup dengan menghubungkan repositori GitHub ke akun Vercel Anda. Pengaturan `vercel.json` dan skrip build Next.js sudah dioptimalkan untuk performa deployment maksimal.