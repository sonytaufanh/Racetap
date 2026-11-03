import type { Lang } from './types';

export interface ServiceItem {
  icon: string;
  tone: string;
  title: string;
  body: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  body: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  title: string;
  updated: string;
  sections: LegalSection[];
}

export interface Content {
  stats: StatItem[];
  services: ServiceItem[];
  serviceHighlights: string[];
  process: ProcessStep[];
  partners: string[];
  testimonials: Testimonial[];
  faqTeaser: FaqItem[];
  aboutValues: ServiceItem[];
  faq: FaqItem[];
  clients: {
    testimonials: Testimonial[];
    partners: string[];
    stats: StatItem[];
  };
  legal: { privacy: LegalDoc; terms: LegalDoc };
  eventProcess: ServiceItem[];
}

const PARTNERS_BASE = [
  'Dahana Run',
  'AHY Run',
  'Monkey Forest Ubud Run',
  'UKSW Salatiga 10K',
  'TNI Run',
  'Unnes Run',
  'Jember 10K',
  'Sarkororun'
];

export const CONTENT: Record<Lang, Content> = {
  id: {
    stats: [
      { value: '11+', label: 'Event Terselesaikan' },
      { value: '2+', label: 'Tahun Pengalaman Event' },
      { value: '100%', label: 'Event Terlaksana' },
      { value: '8+', label: 'Kota Penyelenggaraan' }
    ],
    services: [
      {
        icon: 'bi-upc-scan',
        tone: 'primary',
        title: 'RFID Timing System',
        body: 'Pencatatan waktu otomatis dan real-time dengan chip RFID (bib/shoe tag), timing mat di start, split, dan finish, plus backup data agar hasil tidak hilang.'
      },
      {
        icon: 'bi-trophy',
        tone: 'secondary',
        title: 'Race Result Management',
        body: 'Pengolahan data hasil lomba: klasifikasi kategori (overall, age group, gender), hasil online dan PDF, serta export data untuk sponsor atau media.'
      },
      {
        icon: 'bi-stopwatch',
        tone: 'success',
        title: 'Event Timing Support',
        body: 'Tim operasional di lapangan: survey lokasi dan layout race, setup dan testing sistem, operator timing saat race, serta troubleshooting selama event.'
      },
      {
        icon: 'bi-sliders',
        tone: 'primary',
        title: 'Custom Timing Solutions',
        body: 'Solusi timing fleksibel dan scalable untuk fun run, trail run, city run, hingga event hybrid sesuai kebutuhan Anda.'
      }
    ],
    serviceHighlights: ['Akurat', 'Minim human error', 'Cocok untuk event skala kecil hingga besar'],
    process: [
      { number: '01', title: 'Prepare', body: 'Kami mempersiapkan kebutuhan timing, data peserta, perangkat, dan sistem sesuai karakteristik event.' },
      { number: '02', title: 'Setup', body: 'Perangkat RFID timing dipasang dan diuji untuk memastikan sistem siap digunakan sebelum race dimulai.' },
      { number: '03', title: 'Timing', body: 'Waktu peserta dicatat secara otomatis dan real-time selama race dengan sistem timing yang akurat.' },
      { number: '04', title: 'Results', body: 'Data timing diproses menjadi hasil lomba yang akurat, cepat, transparan, dan siap dipublikasikan.' }
    ],
    partners: PARTNERS_BASE,
    testimonials: [
      {
        quote: 'Hasil lomba keluar cepat dan rapi. Peserta bisa langsung cek waktu dan sertifikat.',
        author: 'Race Director',
        role: 'Road Race 10K'
      },
      {
        quote: 'Koordinasi teknis jelas dari briefing sampai hari-H, termasuk saat rute berubah mendadak.',
        author: 'Event Organizer',
        role: 'Charity Run'
      },
      {
        quote: 'Pencarian foto berdasarkan BIB sangat membantu peserta dan tim media kami.',
        author: 'Media Lead',
        role: 'Trail Run'
      }
    ],
    faqTeaser: [
      {
        q: 'Bagaimana cara mencari hasil lomba saya?',
        a: 'Buka halaman Results, pilih event, lalu cari dengan nama atau nomor BIB.'
      },
      {
        q: 'Apakah sertifikat tersedia untuk semua peserta?',
        a: 'Sertifikat digital tersedia untuk peserta dengan status finisher pada data resmi event.'
      },
      {
        q: 'Bagaimana cara menemukan foto saya?',
        a: 'Buka halaman Photos, pilih event, lalu masukkan nomor BIB Anda.'
      }
    ],
    aboutValues: [
      {
        icon: 'bi-bullseye',
        tone: 'primary',
        title: 'Akurasi dan Ketepatan',
        body: 'Kami mengutamakan pencatatan waktu dan pengolahan hasil lomba yang akurat untuk mendukung penilaian peserta secara objektif.'
      },
      {
        icon: 'bi-chat-square-text',
        tone: 'secondary',
        title: 'Koordinasi yang Jelas',
        body: 'Koordinasi dengan penyelenggara dilakukan secara terarah agar kebutuhan teknis dan pelaksanaan timing berjalan sesuai rencana.'
      },
      {
        icon: 'bi-gem',
        tone: 'success',
        title: 'Layanan Profesional',
        body: 'Setiap tahapan, mulai dari persiapan perangkat hingga publikasi hasil lomba, ditangani dengan memperhatikan kualitas layanan.'
      },
      {
        icon: 'bi-arrow-repeat',
        tone: 'primary',
        title: 'Solusi yang Adaptif',
        body: 'Kami menyediakan solusi timing yang dapat disesuaikan dengan format lomba, jumlah peserta, karakteristik rute, dan kebutuhan penyelenggara.'
      }
    ],
    faq: [
      { q: 'Bagaimana cara mencari hasil lomba saya?', a: 'Buka halaman Results, pilih event, lalu cari menggunakan nama atau nomor BIB. Anda juga bisa memakai tombol pencarian di navbar untuk mencari lintas event.' },
      { q: 'Apakah sertifikat tersedia untuk semua peserta?', a: 'Sertifikat digital tersedia untuk peserta dengan status finisher. Tombol sertifikat muncul pada tabel hasil dan pada detail peserta.' },
      { q: 'Bagaimana cara menemukan foto saya?', a: 'Buka halaman Photos, pilih event, lalu masukkan nomor BIB. Setiap foto sudah melewati OCR sehingga bisa dicari berdasarkan nomor dada.' },
      { q: 'Berapa lama hasil lomba dipublikasikan?', a: 'Untuk sebagian besar event, hasil dipublikasikan kurang dari 24 jam setelah finish. Pada event dengan live results, hasil dapat dilihat hampir real-time.' },
      { q: 'Apakah bisa request kategori atau age group khusus?', a: 'Bisa. Kategori, age group, dan aturan ranking disesuaikan saat briefing teknis sebelum event.' },
      { q: 'Bagaimana jika data hasil terlihat belum lengkap?', a: 'Data dapat masih dalam proses pembaruan. Muat ulang halaman beberapa saat lagi, atau hubungi kami melalui WhatsApp bila masih belum lengkap.' },
      { q: 'Apakah Racetap menyediakan perangkat timing sendiri?', a: 'Ya. Kami menyediakan timing mat, reader RFID, chip, serta operator teknis untuk hari-H sesuai skala event.' }
    ],
    clients: {
      testimonials: [
        { quote: 'Hasil lomba keluar cepat dan rapi. Peserta bisa langsung cek waktu dan sertifikat tanpa harus menunggu lama.', author: 'Race Director', role: 'Road Race 10K, Jawa Tengah' },
        { quote: 'Koordinasi teknis jelas dari briefing sampai hari-H. Saat ada perubahan rute mendadak, tim tetap sigap menyesuaikan titik timing.', author: 'Event Organizer', role: 'Charity Run, Yogyakarta' },
        { quote: 'Pencarian foto berdasarkan BIB sangat membantu peserta. Traffic halaman foto tetap stabil meski diakses bersamaan.', author: 'Media & Documentation Lead', role: 'Trail Run, Bali' }
      ],
      partners: [...PARTNERS_BASE, 'Rupiah Borobudur Playon', 'Ungarun'],
      stats: [
        { value: '15+', label: 'Event ditangani' },
        { value: '50K+', label: 'Peserta tercatat' },
        { value: '15+', label: 'Halaman hasil publik' },
        { value: '< 24 jam', label: 'Publikasi hasil' }
      ]
    },
    legal: {
      privacy: {
        title: 'Kebijakan Privasi',
        updated: 'Diperbarui: Oktober 2026',
        sections: [
          { heading: 'Data yang kami kumpulkan', body: 'Kami mengumpulkan data yang Anda kirimkan melalui formulir kontak (nama, email, nomor telepon, nama event, dan pesan) serta data teknis dasar seperti alamat IP untuk mencegah penyalahgunaan formulir.' },
          { heading: 'Data peserta event', body: 'Data hasil lomba (nama, nomor BIB, kategori, waktu, dan peringkat) dipublikasikan sebagai bagian dari layanan hasil event. Data ini berasal dari penyelenggara event.' },
          { heading: 'Penggunaan data', body: 'Data digunakan untuk merespons pertanyaan, menyiapkan penawaran layanan, dan meningkatkan kualitas layanan. Kami tidak menjual data kepada pihak ketiga.' },
          { heading: 'Foto event', body: 'Foto event dipublikasikan untuk kebutuhan dokumentasi. Pencarian foto menggunakan nomor BIB. Jika Anda ingin foto tertentu dihapus, hubungi kami.' },
          { heading: 'Penyimpanan dan keamanan', body: 'Data disimpan pada server yang kami kelola dengan pembatasan akses. Akses administratif dilindungi autentikasi dan tercatat dalam audit log.' },
          { heading: 'Hubungi kami', body: 'Untuk pertanyaan terkait privasi, silakan gunakan halaman Contact atau WhatsApp resmi kami.' }
        ]
      },
      terms: {
        title: 'Syarat & Ketentuan',
        updated: 'Diperbarui: Oktober 2026',
        sections: [
          { heading: 'Layanan', body: 'Racetap menyediakan layanan race timing, pengelolaan hasil lomba, publikasi hasil, dan dokumentasi foto event sesuai kesepakatan dengan penyelenggara.' },
          { heading: 'Hasil lomba', body: 'Hasil lomba disusun berdasarkan data timing dan keputusan penyelenggara. Koreksi hasil hanya dapat dilakukan melalui penyelenggara event.' },
          { heading: 'Sertifikat', body: 'Sertifikat digital diterbitkan berdasarkan status peserta pada data resmi event. Penyalahgunaan atau pemalsuan sertifikat menjadi tanggung jawab pengguna.' },
          { heading: 'Konten dan foto', body: 'Foto event dapat digunakan untuk dokumentasi dan promosi event. Penggunaan komersial foto oleh pihak lain memerlukan izin.' },
          { heading: 'Batasan tanggung jawab', body: 'Racetap tidak bertanggung jawab atas keputusan penyelenggara terkait diskualifikasi, kategori, maupun hasil akhir event.' },
          { heading: 'Perubahan ketentuan', body: 'Ketentuan dapat diperbarui sewaktu-waktu. Versi terbaru selalu tersedia di halaman ini.' }
        ]
      }
    },
    eventProcess: [
      { icon: 'bi-clipboard-check', tone: 'primary', title: 'Persiapan', body: 'Survey rute, kalibrasi perangkat, dan uji baca chip peserta.' },
      { icon: 'bi-stopwatch', tone: 'primary', title: 'Hari-H', body: 'Operator timing di start, split, dan finish dengan pemantauan langsung.' },
      { icon: 'bi-file-earmark-bar-graph', tone: 'primary', title: 'Pengolahan', body: 'Validasi data, penyusunan kategori, dan pengecekan peringkat.' },
      { icon: 'bi-globe2', tone: 'primary', title: 'Publikasi', body: 'Hasil online, sertifikat, dan tautan yang siap dibagikan peserta.' }
    ]
  },

  en: {
    stats: [
      { value: '11+', label: 'Events delivered' },
      { value: '2+', label: 'Years of event experience' },
      { value: '100%', label: 'Events completed' },
      { value: '8+', label: 'Cities covered' }
    ],
    services: [
      {
        icon: 'bi-upc-scan',
        tone: 'primary',
        title: 'RFID Timing System',
        body: 'Automatic, real-time timing with RFID chips (bib/shoe tag), timing mats at start, split and finish, plus data backup so results are never lost.'
      },
      {
        icon: 'bi-trophy',
        tone: 'secondary',
        title: 'Race Result Management',
        body: 'Complete results processing: category classification (overall, age group, gender), online and PDF results, and data export for sponsors or media.'
      },
      {
        icon: 'bi-stopwatch',
        tone: 'success',
        title: 'Event Timing Support',
        body: 'On-site operations team: route survey and race layout, system setup and testing, race-day timing operators and live troubleshooting.'
      },
      {
        icon: 'bi-sliders',
        tone: 'primary',
        title: 'Custom Timing Solutions',
        body: 'Flexible, scalable timing for fun runs, trail runs, city runs and hybrid events tailored to your needs.'
      }
    ],
    serviceHighlights: ['Accurate', 'Minimal human error', 'Suits small to large events'],
    process: [
      { number: '01', title: 'Prepare', body: 'We prepare the timing requirements, participant data, hardware and system around your event.' },
      { number: '02', title: 'Setup', body: 'RFID timing hardware is installed and tested so the system is ready before the race starts.' },
      { number: '03', title: 'Timing', body: 'Participant times are captured automatically and in real time throughout the race.' },
      { number: '04', title: 'Results', body: 'Timing data is processed into accurate, fast, transparent and publish-ready results.' }
    ],
    partners: PARTNERS_BASE,
    testimonials: [
      {
        quote: 'Results were published fast and clean. Runners could check their times and certificates immediately.',
        author: 'Race Director',
        role: 'Road Race 10K'
      },
      {
        quote: 'Technical coordination was clear from briefing to race day, even when the route changed suddenly.',
        author: 'Event Organizer',
        role: 'Charity Run'
      },
      {
        quote: 'Bib-based photo search helped both runners and our media team a lot.',
        author: 'Media Lead',
        role: 'Trail Run'
      }
    ],
    faqTeaser: [
      { q: 'How do I find my race results?', a: 'Open Results, pick your event, then search by name or bib number.' },
      { q: 'Are certificates available for every participant?', a: 'Digital certificates are available for participants marked as finishers in the official event data.' },
      { q: 'How do I find my photos?', a: 'Open Photos, pick your event, then enter your bib number.' }
    ],
    aboutValues: [
      { icon: 'bi-bullseye', tone: 'primary', title: 'Accuracy first', body: 'We prioritise accurate time recording and result processing so participant scoring stays objective.' },
      { icon: 'bi-chat-square-text', tone: 'secondary', title: 'Clear coordination', body: 'We coordinate directly with organisers so technical needs and timing operations follow the plan.' },
      { icon: 'bi-gem', tone: 'success', title: 'Professional service', body: 'Every step, from hardware preparation to results publishing, is handled with service quality in mind.' },
      { icon: 'bi-arrow-repeat', tone: 'primary', title: 'Adaptive solutions', body: 'Our timing solutions adapt to race format, participant volume, route characteristics and organiser needs.' }
    ],
    faq: [
      { q: 'How do I find my race results?', a: 'Open Results, pick your event, then search by name or bib number. The search button in the navbar also searches across events.' },
      { q: 'Are certificates available for every participant?', a: 'Digital certificates are available for finishers. The certificate button appears in the results table and the participant detail.' },
      { q: 'How do I find my photos?', a: 'Open Photos, pick your event, then enter your bib number. Every photo is OCR processed so bibs can be searched.' },
      { q: 'How soon are results published?', a: 'For most events results are published within 24 hours of the finish. Events with live results can be followed almost in real time.' },
      { q: 'Can we request custom categories or age groups?', a: 'Yes. Categories, age groups and ranking rules are agreed during the technical briefing before the event.' },
      { q: 'What if the results look incomplete?', a: 'Data may still be updating. Reload the page shortly, or contact us on WhatsApp if it still looks incomplete.' },
      { q: 'Does Racetap provide the timing hardware?', a: 'Yes. We provide timing mats, RFID readers, chips and technical operators for race day depending on event size.' }
    ],
    clients: {
      testimonials: [
        { quote: 'Results were published fast and clean. Runners could check their times and certificates immediately.', author: 'Race Director', role: 'Road Race 10K, Central Java' },
        { quote: 'Technical coordination was clear from briefing to race day, even when the route changed suddenly.', author: 'Event Organizer', role: 'Charity Run, Yogyakarta' },
        { quote: 'Bib-based photo search helped runners a lot, and the photo page stayed stable under load.', author: 'Media & Documentation Lead', role: 'Trail Run, Bali' }
      ],
      partners: [...PARTNERS_BASE, 'Rupiah Borobudur Playon', 'Ungarun'],
      stats: [
        { value: '15+', label: 'Events handled' },
        { value: '50K+', label: 'Participants recorded' },
        { value: '15+', label: 'Public result pages' },
        { value: '< 24 hours', label: 'Results publishing' }
      ]
    },
    legal: {
      privacy: {
        title: 'Privacy Policy',
        updated: 'Updated: October 2026',
        sections: [
          { heading: 'Data we collect', body: 'We collect the data you submit through the contact form (name, email, phone, event name and message) plus basic technical data such as IP address to prevent form abuse.' },
          { heading: 'Participant data', body: 'Race result data (name, bib number, category, times and ranks) is published as part of the event results service. This data comes from the event organiser.' },
          { heading: 'How we use data', body: 'Data is used to answer enquiries, prepare service proposals and improve our service. We do not sell data to third parties.' },
          { heading: 'Event photos', body: 'Event photos are published for documentation. Photo search uses bib numbers. Contact us if you want a specific photo removed.' },
          { heading: 'Storage and security', body: 'Data is stored on servers we manage with restricted access. Administrative access is authenticated and recorded in an audit log.' },
          { heading: 'Contact us', body: 'For privacy questions, use the Contact page or our official WhatsApp.' }
        ]
      },
      terms: {
        title: 'Terms & Conditions',
        updated: 'Updated: October 2026',
        sections: [
          { heading: 'Service', body: 'Racetap provides race timing, results management, results publishing and event photo documentation as agreed with the organiser.' },
          { heading: 'Race results', body: 'Results are produced from timing data and organiser decisions. Corrections can only be made through the event organiser.' },
          { heading: 'Certificates', body: 'Digital certificates are issued based on participant status in the official event data. Misuse or forgery of certificates is the user responsibility.' },
          { heading: 'Content and photos', body: 'Event photos may be used for documentation and event promotion. Commercial use by third parties requires permission.' },
          { heading: 'Limitation of liability', body: 'Racetap is not responsible for organiser decisions regarding disqualification, categories or final event results.' },
          { heading: 'Changes', body: 'These terms may be updated at any time. The latest version is always available on this page.' }
        ]
      }
    },
    eventProcess: [
      { icon: 'bi-clipboard-check', tone: 'primary', title: 'Preparation', body: 'Route survey, hardware calibration and participant chip testing.' },
      { icon: 'bi-stopwatch', tone: 'primary', title: 'Race day', body: 'Timing operators at start, split and finish with live monitoring.' },
      { icon: 'bi-file-earmark-bar-graph', tone: 'primary', title: 'Processing', body: 'Data validation, category assignment and ranking checks.' },
      { icon: 'bi-globe2', tone: 'primary', title: 'Publishing', body: 'Online results, certificates and shareable links for participants.' }
    ]
  }
};
