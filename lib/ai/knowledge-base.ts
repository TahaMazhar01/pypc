import { CONTACT_EMAIL } from '@/lib/constants'
import {
  RETRIEVAL_STOP_WORDS,
  expandQueryForRetrieval,
  type AssistantLanguage
} from './language'
/**
 * PYPC AI Assistant knowledge base.
 *
 * The assistant always answers from this curated, organisation-approved content
 * first. If OPENAI_API_KEY is present, the same content is supplied to the model
 * as grounding context so answers stay accurate and on-brand; if the key is not
 * configured the assistant still works using keyword matching below.
 */

export type KnowledgeEntry = {
  id: string
  question: string
  answer: string
  keywords: string[]
  href?: string
  hrefLabel?: string
  /** Roman-Urdu keywords — "kaise", "kitni fees", "shamil" — matched by token. */
  keywordsRoman?: string[]
  /** Urdu-script keywords — "رکنیت", "فیس", "تصدیق" — matched by token. */
  keywordsUrdu?: string[]
  /** Urdu answer (Arabic script). Shown when the visitor writes in Urdu. */
  answerUrdu?: string
  /** Roman-Urdu answer. Shown when the visitor writes Roman Urdu/English. */
  answerRoman?: string
  /** Live database lookup used by real-time answers, e.g. 'plans' | 'certificates'. */
  live?: LiveScope
}

/**
 * Real-time scopes. When an entry declares one, the assistant queries the
 * database at answer time and appends the *current* figures — so "fees kitni
 * hain?" answers with today's seeded prices and "kitne events hain?" with the
 * events that are actually published right now, never a stale sentence.
 */
export type LiveScope =
  | 'plans'
  | 'membership_plans'
  | 'programmes'
  | 'events'
  | 'opportunities'
  | 'certificates'
  | 'members'
  | 'international'

export const knowledgeBase: KnowledgeEntry[] = [
  {
    id: 'about',
    question: 'What is PYPC?',
    keywordsRoman: ['pypc kya hai', 'pypc kya hy', 'ye kya hai', 'kaun hai', 'tanzim', 'idara'],
    keywordsUrdu: ['پی وائی پی سی کیا ہے', 'کیا ہے', 'تنظیم', 'ادارہ', 'کون'],
    answerRoman:
      'Pakistan Youth Parliamentary Council (PYPC) ek qaumi, ghair-siyasi platform hai jo naujawanon ko parliamentary engagement, public policy, leadership development, climate action, technology aur civic responsibility se jorta hai. Hamara motto hai "Lead. Innovate. Reform. Inspire."',
    answerUrdu:
      'پاکستان یوتھ پارلیمانی کونسل (PYPC) ایک قومی، غیر سیاسی پلیٹ فارم ہے جو نوجوانوں کو پارلیمانی مصروفیت، پبلک پالیسی، قیادت کی تربیت، ماحولیاتی اقدام، ٹیکنالوجی اور شہری ذمہ داری سے جوڑتا ہے۔ ہمارا نعرہ ہے: "Lead. Innovate. Reform. Inspire."',    answer:
      'The Pakistan Youth Parliamentary Council (PYPC) is a national, non-partisan platform that connects young people with parliamentary engagement, public policy, leadership development, climate action, technology and civic responsibility. Its motto is "Lead. Innovate. Reform. Inspire."',
    keywords: ['what is pypc', 'about pypc', 'organisation', 'organization', 'who are you', 'council'],
    href: '/about',
    hrefLabel: 'Read about PYPC'
  },
  {
    id: 'membership',
    question: 'How do I become a member?',
    keywordsRoman: ['rukniyat kaise', 'member kaise', 'membership kaise', 'shamil kaise', 'join kaise', 'fees kitni', 'fee kitni', 'qrkin', 'rukniyat', 'mujhe member'],
    keywordsUrdu: ['رکنیت کیسے', 'ممبر کیسے', 'شامل کیسے', 'فیس کتنی', 'رکن کیسے بنیں'],
    answerRoman:
      'Pehle muft account banayein, phir Membership page se plan chunein. Chaar tiers hain: Free Community (bilkul muft), Associate, Executive aur Institutional. Payment JazzCash, Easypaisa ya international card (Stripe) se hoti hai; Free tier bina kisi payment ke foran activate ho jata hai, aur baqi tiers payment confirm hone par khud-ba-khud activate ho jate hain. Fees ki taza tafseel neeche di gayi hai.',
    answerUrdu:
      'پہلے مفت اکاؤنٹ بنائیں، پھر ممبرشپ صفحے سے پلان منتخب کریں۔ تین درجے ہیں: ایسوسی ایٹ، ایگزیکٹو اور انسٹیٹیوشنل۔ ادائیگی جاز کیش، ایزی پیسہ یا بین الاقوامی کارڈ سے ہوتی ہے، اور تصدیق کے بعد رکنیت خود بخود فعال ہو جاتی ہے۔',
    live: 'membership_plans',    answer:
      'Create a free account, then choose a membership plan on the Membership page. Four tiers are published: Free Community (no charge at all), Associate, Executive and Institutional partnership. Payment can be made by JazzCash, Easypaisa or an international card; the free tier activates instantly without any payment, and the paid tiers activate automatically once payment is confirmed.',
    keywords: ['membership', 'become a member', 'join', 'sign up', 'register', 'tier', 'plan', 'fee'],
    href: '/membership',
    hrefLabel: 'View membership plans'
  },
  {
    id: 'programmes',
    question: 'What programmes does PYPC run?',
    answer:
      'PYPC runs programmes across seven thematic pillars: Youth Parliament, Climate Action, AI & Technology, Human Rights, Entrepreneurship, Leadership Fellowships and Justice Reform. Programmes are delivered in hybrid mode with mentorship, simulations, committees and practical assignments.',
    keywords: ['programme', 'program', 'course', 'training', 'workshop', 'pillar', 'youth parliament', 'climate', 'ai'],
    keywordsRoman: ['kaunse programme', 'programme kya', 'konsa program', 'courses kaunse', 'taleem', 'training', 'sabaq'],
    keywordsUrdu: ['پروگرام کون سے', 'پروگرامز', 'کورس', 'تربیت', 'کون سی سرگرمیاں'],
    answerRoman:
      'PYPC saat thematic pillars par programmes chalata hai: Youth Parliament, Climate Action, AI & Technology, Human Rights, Entrepreneurship, Leadership Fellowships aur Justice Reform. Delivery hybrid hoti hai — mentorship, simulations, committees aur practical assignments ke saath. Neeche mojooda programmes ki taza list hai.',
    answerUrdu:
      'پی وائی پی سی سات موضوعاتی شعبوں میں پروگرام چلاتی ہے: یوتھ پارلیمنٹ، کلائمیٹ ایکشن، اے آئی اور ٹیکنالوجی، انسانی حقوق، کاروباری صلاحیت، لیڈرشپ فیلوشپ اور جسٹس ریفارم۔ تربیت ہائبرڈ ہوتی ہے — رہنمائی، سمیولیشن، کمیٹیاں اور عملی کام۔',
    live: 'programmes',
    href: '/programmes',
    hrefLabel: 'Browse programmes'
  },
  {
    id: 'certificates',
    question: 'How does certificate verification work?',
    keywordsRoman: ['certificate kaise', 'sertificate', 'tasdeeq', 'verify kaise', 'qr kaise', 'sach hai ya nahi'],
    keywordsUrdu: ['سند کیسے', 'تصدیق کیسے', 'سرٹیفکیٹ', 'کیو آر کوڈ', 'جائز'],
    answerRoman:
      'Har PYPC certificate par ek unique code (PYPC-XXXX-XXXX-XXXX) aur QR code hota hai. Koi bhi — employer, university ya partner — Verify page khol kar ya QR scan kar ke live record dekh sakta hai: naam, programme, tariq-e-jari aur mojooda status (Valid, Expired ya Revoked).',
    answerUrdu:
      'ہر پی وائی پی سی سند پر منفرد کوڈ اور کیو آر کوڈ ہوتا ہے۔ کوئی بھی تصدیق کے صفحے سے یا کیو آر اسکین کر کے جاری ریکارڈ دیکھ سکتا ہے: نام، پروگرام، تاریخ اور موجودہ حیثیت۔',
    live: 'certificates',    answer:
      'Every PYPC certificate carries a unique code (PYPC-XXXX-XXXX-XXXX) and a QR code. Anyone — employers, universities or partners — can open the Verify page or scan the QR to see the live record: recipient, programme, issue date and current status (Valid, Expired or Revoked).',
    keywords: ['certificate', 'verify', 'verification', 'qr', 'code', 'valid', 'fake', 'authentic'],
    href: '/verify',
    hrefLabel: 'Verify a certificate'
  },
  {
    id: 'apply',
    question: 'How do I apply for an opportunity?',
    keywordsRoman: ['apply kaise', 'darkhwast kaise', 'form kaise', 'shamil hona', 'mauqa', 'deadline kab'],
    keywordsUrdu: ['درخواست کیسے', 'اپلائی کیسے', 'فارم', 'آخری تاریخ', 'موقع'],
    answerRoman:
      'Sign in karein, phir kisi programme ya opportunity ka page kholein aur dashboard se application form jama karwayein. Status track hota hai: Pending, Under Review, Shortlisted, Approved ya Rejected — har tabdeeli par notification milti hai.',
    answerUrdu:
      'لاگ ان کریں، پھر کسی پروگرام یا موقع کا صفحہ کھولیں اور ڈیش بورڈ سے درخواست جمع کرائیں۔ حیثیت ٹریک ہوتی ہے اور ہر تبدیلی پر اطلاع ملتی ہے۔',
    live: 'opportunities',    answer:
      'Sign in, open an opportunity or programme page, and submit the application form from your dashboard. Applications are tracked with clear statuses: Pending, Under Review, Shortlisted, Approved or Rejected. You will receive a notification whenever the status changes.',
    keywords: ['apply', 'application', 'opportunity', 'fellowship', 'scholarship', 'internship', 'deadline'],
    href: '/opportunities',
    hrefLabel: 'See opportunities'
  },
  {
    id: 'payments',
    question: 'Which payment methods are accepted?',
    keywordsRoman: ['payment kaise', 'adaigi kaise', 'paisa kaise', 'jazzcash', 'easypaisa', 'card se', 'bank transfer'],
    keywordsUrdu: ['ادائیگی کیسے', 'رقم کیسے', 'جاز کیش', 'ایزی پیسہ', 'بینک ٹرانسفر', 'کارڈ'],
    answerRoman:
      'International cards Stripe ke zariye, aur Pakistani members ke liye JazzCash aur Easypaisa. Bank transfer bhi mumkin hai — staff payment ko admin panel se approve karta hai. Koi gateway active na ho to checkout par woh disabled nazar aata hai, chup-chaap fail nahi hota.',
    answerUrdu:
      'بین الاقوامی کارڈز اسٹرائپ کے ذریعے، اور پاکستانی ممبران کے لیے جاز کیش اور ایزی پیسہ۔ بینک ٹرانسفر بھی ممکن ہے جسے اسٹاف منظوری دیتا ہے۔ اگر کوئی گیٹ وے فعال نہ ہو تو وہ چیک آؤٹ پر غیر فعال دکھائی دیتا ہے۔',    answer:
      'International cards through Stripe, and JazzCash and Easypaisa for Pakistani members. Gateway availability is controlled by configuration — if a gateway is not yet activated on the platform, it appears disabled in checkout rather than failing silently.',
    keywords: ['payment', 'pay', 'jazzcash', 'easypaisa', 'stripe', 'card', 'refund'],
    href: '/refund-policy',
    hrefLabel: 'Refund policy'
  },
  {
    id: 'events',
    question: 'How do events and registrations work?',
    keywordsRoman: ['event kaise', 'conference kab', 'register kaise', 'taqreeb', 'jalsa kab', 'kab hai'],
    keywordsUrdu: ['تقریب کب', 'ایونٹ کب', 'کانفرنس کب', 'رجسٹریشن کیسے', 'جلسہ'],
    answerRoman:
      'PYPC conferences, workshops, bootcamps, webinars aur ceremonies Events page par publish karta hai. Members ek click mein register karte hain aur updates dashboard par aate hain. Attendance hi certificate ki eligibility banati hai. Aane wale events ki taza list neeche hai.',
    answerUrdu:
      'پی وائی پی سی کانفرنسز، ورکشاپس، بُوٹ کیمپس، ویبینارز اور تقریبات ایونٹس صفحے پر شائع کرتی ہے۔ ممبران ایک کلک میں رجسٹر ہوتے ہیں اور اپ ڈیٹس ڈیش بورڈ پر ملتے ہیں۔ حاضری ہی سند کی اہلیت بناتی ہے۔',
    live: 'events',    answer:
      'PYPC publishes conferences, workshops, bootcamps, webinars and ceremonies on the Events page. Members register in one click from the event page and receives updates in the dashboard. Attendance records feed directly into certificate eligibility.',
    keywords: ['event', 'conference', 'workshop', 'webinar', 'bootcamp', 'register event'],
    href: '/events',
    hrefLabel: 'Upcoming events'
  },
  {
    id: 'privacy',
    question: 'How is my data protected?',
    keywordsRoman: ['mera data', 'password mehfooz', 'privacy kaise', 'maloomat kahan', 'security'],
    keywordsUrdu: ['میرا ڈیٹا', 'رازداری', 'پاس ورڈ', 'سیکیورٹی', 'معلومات محفوظ'],
    answerRoman:
      'Passwords bcrypt hash mein mehfooz hote hain, session signed HTTP-only cookie se chalta hai, aur har administrative action audit log mein likha jata hai. Zaati maloomat kabhi farokht nahi hoti, aur member Support Centre se export ya deletion ki darkhwast de sakta hai.',
    answerUrdu:
      'پاس ورڈز اپنی محفوظ شکل میں رکھے جاتے ہیں، سیشن دستخط شدہ کوکی سے چلتا ہے، اور ہر انتظامی عمل آڈٹ لاگ میں درج ہوتا ہے۔ ذاتی معلومات کبھی فروخت نہیں کی جاتیں۔',    answer:
      'Passwords are stored as bcrypt hashes, sessions use signed HTTP-only cookies, and every administrative action is written to an audit log. Personal data is never sold, and members can request export or deletion through the Support Centre.',
    keywords: ['privacy', 'data', 'gdpr', 'security', 'password', 'personal information'],
    href: '/privacy',
    hrefLabel: 'Privacy policy'
  },
  {
    id: 'contact',
    question: 'How can I contact the PYPC secretariat?',
    keywordsRoman: ['rabta kaise', 'raabta', 'email kya', 'number kya', 'phone number', 'whatsapp', 'baat karni'],
    keywordsUrdu: ['رابطہ کیسے', 'ای میل', 'نمبر', 'فون', 'واٹس ایپ', 'بات کرنی ہے'],
    answerRoman:
      'Contact page se message bhejein, ya seedha email karein. Members dashboard ke Support tab se tracked ticket bhi bana sakte hain. Phone aur WhatsApp bhi mojood hain — tafseel neeche di gayi hai.',
    answerUrdu:
      'رابطہ کے صفحے سے پیغام بھیجیں یا براہ راست ای میل کریں۔ ممبران ڈیش بورڈ کے سپورٹ ٹیب سے ٹکٹ بھی بنا سکتے ہیں۔ فون اور واٹس ایپ بھی دستیاب ہیں۔',    answer:
      `Use the Contact page to send a message to the secretariat, or email ${CONTACT_EMAIL}. Members can also raise a support request directly from the dashboard, which creates a tracked ticket for the team.`,
    keywords: ['contact', 'email', 'phone', 'support', 'help', 'helpline', 'office'],
    href: '/contact',
    hrefLabel: 'Contact the secretariat'
  },
  {
    id: 'social-channels',
    question: 'Where can I follow PYPC on social media?',
    answer:
      'PYPC publishes under one handle — pypcofficial — on Instagram, Facebook and YouTube, plus the LinkedIn company page: pakistan-youth-parliamentary-council. All four are linked in the footer of every page and on the Contact page. Messages sent by email or WhatsApp reach the secretariat directly. An account is only official if it carries that name.',
    keywords: ['social', 'social media', 'follow', 'facebook', 'instagram', 'youtube', 'linkedin', 'page', 'channel', 'handle'],
    keywordsRoman: [
      'social media',
      'social',
      'facebook',
      'instagram',
      'youtube',
      'linkedin',
      'page kahan',
      'follow karna',
      'handle',
      'account'
    ],
    keywordsUrdu: [
      'سوشل میڈیا',
      'سوشل',
      'فیس بک',
      'انسٹاگرام',
      'یوٹیوب',
      'لنکڈان',
      'صفحہ',
      'صفحات',
      'اکاؤنٹ',
      'ہینڈل',
      'فالو'
    ],
    answerRoman:
      'PYPC ka ek hi handle hai — pypcofficial — Instagram, Facebook aur YouTube par, aur LinkedIn company page pakistan-youth-parliamentary-council ke naam se. Chaaron har page ke footer aur Contact page par linked hain. Email aur WhatsApp par direct jawab bhi milta hai. Sirf inhi official handles ko asli samjhein.',
    answerUrdu:
      'پی وائی پی سی کا ایک ہی ہینڈل ہے — pypcofficial — انسٹاگرام، فیس بک اور یوٹیوب پر، اور لنکڈان کمپنی پیج pakistan-youth-parliamentary-council کے نام سے۔ چاروں ہر صفحے کے فوٹر اور رابطہ صفحے پر لنک ہیں۔ ای میل اور واٹس ایپ پر براہِ راست جواب بھی ملتا ہے۔ صرف انہی سرکاری ہینڈلز کو اصل سمجھیں۔',
    href: '/contact',
    hrefLabel: 'All official channels'
  },
  {
    id: 'fees',
    question: 'What are the membership fees?',
    answer:
      'Membership fees depend on the tier you choose and are listed live on the Membership page in both PKR and USD. Associates, Executives and Institutions each have their own rate, and international members can pay in USD.',
    keywords: ['fees', 'fee', 'price', 'cost', 'how much', 'amount', 'charges', 'rate', 'usd', 'pkr'],
    keywordsRoman: ['fees kitni', 'fee kitni', 'kitne paise', 'kitna paisa', 'rate kya', 'price kya', 'dollar mein'],
    keywordsUrdu: ['فیس کتنی', 'رقم کتنی', 'قیمت', 'کتنے پیسے', 'ڈالر'],
    answerRoman:
      'Membership fees tier ke mutabiq hain aur Membership page par PKR aur USD dono mein live dikhayi jati hain. Neeche aaj ki mojooda rates hain.',
    answerUrdu: 'رکنیت فیس درجے کے مطابق ہے اور ممبرشپ صفحے پر پاکستانی روپے اور ڈالر دونوں میں موجودہ نرخ کے ساتھ دکھائی جاتی ہے۔',
    live: 'membership_plans',
    href: '/membership',
    hrefLabel: 'Membership plans and fees'
  },
  {
    id: 'international',
    question: 'Can international students join PYPC?',
    answer:
      'Yes. Every country can register, membership can be paid in USD by international card, and visa invitation letters are issued for accepted participants. Applications are reviewed in the sender\'s own time zone.',
    keywords: ['international', 'foreign', 'abroad', 'overseas', 'visa', 'invitation letter', 'usd', 'outside pakistan'],
    keywordsRoman: ['bahar se', 'ghair mulk', 'bairoon mulk', 'viza letter', 'visa chahiye', 'foreign se', 'dollar'],
    keywordsUrdu: ['بین الاقوامی', 'بیرون ملک', 'غیر ملکی', 'ویزا', 'دعوت نامہ', 'ڈالر'],
    answerRoman:
      'Ji haan. Har mulk se registration khula hai, international card se USD mein payment ho jati hai, aur selected participants ke liye visa invitation letter jari hota hai. Jawab aap ke apne time zone ke mutabiq diya jata hai.',
    answerUrdu:
      'جی ہاں۔ ہر ملک سے رجسٹریشن کھلی ہے، بین الاقوامی کارڈ سے ڈالر میں ادائیگی ہو جاتی ہے، اور منتخب شرکاء کے لیے ویزا دعوت نامہ جاری ہوتا ہے۔ جواب آپ کے اپنے ٹائم زون کے مطابق دیا جاتا ہے۔',
    live: 'international',
    href: '/international',
    hrefLabel: 'International participation'
  },
  {
    id: 'live-status',
    question: 'How many members and events does PYPC have right now?',
    answer:
      'The platform keeps these figures live rather than publishing a fixed claim: the counts below were read from the PYPC database at the moment you asked.',
    keywords: ['how many', 'count', 'total', 'statistics', 'numbers', 'members count', 'how many members', 'how many events'],
    keywordsRoman: ['kitne members', 'kitne log', 'kitni tadaad', 'total kitne', 'statistics'],
    keywordsUrdu: ['کتنے ممبران', 'کتنے لوگ', 'کل تعداد', 'اعداد و شمار'],
    answerRoman: 'Yeh figures live hain — neeche di gayi tadaad aap ke sawal ke waqt PYPC database se parhi gayi hai.',
    answerUrdu: 'یہ اعداد و شمار لائیو ہیں — نیچے دی گئی تعداد آپ کے سوال کے وقت پی وائی پی سی ڈیٹا بیس سے پڑھی گئی ہے۔',
    live: 'members'
  },
  {
    id: 'secretariat-numbers',
    question: 'What is the official phone number and email address?',
    answer:
      'The secretariat answers on the official phone and WhatsApp line and on both official mailboxes. These are the only addresses PYPC will ever contact you from.',
    keywords: [
      'phone number',
      'contact number',
      'email address',
      'whatsapp number',
      'helpline',
      'call',
      'write to',
      'who runs',
      'who leads',
      'leadership',
      'chairperson',
      'founder',
      'chief executive',
      'officers',
      'secretariat',
      'team'
    ],
    keywordsRoman: [
      'number kya hai',
      'phone number',
      'email kya hai',
      'whatsapp number',
      'rabta number',
      'kaun chalata',
      'sarbarah',
      'officers kaun'
    ],
    keywordsUrdu: ['نمبر کیا ہے', 'فون نمبر', 'ای میل ایڈریس', 'واٹس ایپ نمبر', 'سربراہ کون', 'قیادت'],
    answerRoman: 'Tafseel neeche di gayi hai. Sirf inhi official channels se PYPC rabta karti hai.',
    answerUrdu: 'تفصیل نیچے دی گئی ہے۔ پی وائی پی سی صرف انہی سرکاری ذرائع سے رابطہ کرتی ہے۔',
    href: '/contact',
    hrefLabel: 'Contact page'
  },
  {
    id: 'imun-2027',
    question: 'What is IMUN 2027?',
    answer:
      'IMUN 2027 is the International Model United Nations conference hosted by PYPC in Islamabad in 2027 — committees, a diplomatic simulation, training tracks and an international delegate body. The conference page carries the full concept note: at-a-glance figures, committees, the programme, fees, delegate benefits, the venue plan and the leadership contacts.',
    keywords: [
      'imun',
      'imun 2027',
      'model united nations',
      'mun',
      'conference 2027',
      'delegate',
      'committee',
      'diplomatic simulation'
    ],
    keywordsRoman: ['imun kya hai', 'mun conference', 'delegate kaise banein', 'conference kab hai'],
    keywordsUrdu: ['ماڈل یونائیٹڈ نیشنز', 'ایم یو این', 'کانفرنس کب ہے', 'منڈوب کیسے بنیں'],
    answerRoman:
      'IMUN 2027 PYPC ki International Model United Nations conference hai jo Islamabad mein hone wali hai — committees, diplomatic simulation, training tracks aur international delegates. Poori tafseel conference page par mojood hai.',
    answerUrdu:
      'آئی ایم یو این 2027 پی وائی پی سی کی بین الاقوامی ماڈل یونائیٹڈ نیشنز کانفرنس ہے جو اسلام آباد میں منعقد ہوگی — کمیٹیاں، سفارتی مشق، تربیتی مراحل اور بین الاقوامی مندوبین۔ مکمل تفصیل کانفرنس کے صفحے پر موجود ہے۔',
    href: '/conferences/imun-2027',
    hrefLabel: 'IMUN 2027 conference page',
    live: 'events'
  }
]

export const assistantSystemPrompt = `You are the official AI Assistant of the Pakistan Youth Parliamentary Council (PYPC).
Rules:
- Answer only using the PYPC knowledge base provided. If the answer is not covered, say so and offer to connect the user with the secretariat.
- Be concise: 2-5 sentences, warm, professional, non-partisan.
- Never invent fees, dates, names, phone numbers, statistics or policies.
- Never promise membership, selection, funding or certificates.
- Never give legal, medical or financial advice. Direct such questions to qualified professionals.
- Do not discuss party politics or endorse candidates.
- Where a relevant page exists, point the user to it.`

/**
 * Escapes a keyword for safe use inside a RegExp.
 */
function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Whole-word / whole-phrase containment test.
 *
 * The previous version used `normalised.includes(keyword)`, which produced false
 * positives that made the assistant look broken: the Roman-Urdu word "kaise"
 * matched inside "said", "ksi" matched "pharmacy", and a question like
 * "membership kaise lein" could be answered from an unrelated entry. Boundary
 * matching (Unicode-aware, so Urdu script works too) removes that class of bug
 * entirely.
 */
/**
 * Does `haystack` contain `term` as a word?
 *
 * Plain `includes()` was wrong in both directions: "kaise" matched "said", and
 * "said" matched "kaise" — a Roman-Urdu question would pull in English entries
 * and vice versa (this was a real bug the audit caught). A boundary-aware match
 * fixes the false positives, but a strict boundary then missed inflections —
 * "programme" would not match "programmes", which is how people actually write.
 *
 * So: boundaries on both sides, plus the ordinary English inflections (plural,
 * -ing, -ed) allowed at the end. Urdu terms are unaffected — the suffix list is
 * Latin-only, so "فیس" still matches only "فیس".
 */
function containsTerm(haystack: string, term: string) {
  const escaped = escapeForRegExp(term)
  const allowsInflection = /[a-z]$/i.test(term)
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}${allowsInflection ? '(?:s|es|ing|ed)?' : ''}(?![\\p{L}\\p{N}])`,
    'iu'
  )
  return pattern.test(haystack)
}

export type KnowledgeMatch = {
  entry: KnowledgeEntry
  score: number
  /** Which language the match came from — surfaced for tests and the audit log. */
  via: ('en' | 'roman' | 'urdu')[]
}

/**
 * Scores every entry against a query in all three languages and returns the
 * best matches, highest first.
 */
export function searchKnowledgeBaseDetailed(query: string, limit = 3): KnowledgeMatch[] {
  const original = (query ?? '').trim()
  if (!original) return []

  const expanded = expandQueryForRetrieval(original)
  const lowerOriginal = original.toLowerCase()
  const lowerExpanded = expanded.toLowerCase()

  // Latin tokens (length > 2, stop-words removed) and Urdu-script tokens.
  const latinTokens = lowerOriginal
    .split(/[^\p{L}\p{N}]+/u)
    .filter(token => /[a-z]/.test(token) && token.length > 2 && !RETRIEVAL_STOP_WORDS.has(token))

  /*
   * Urdu punctuation sits inside the Arabic block (U+060C ، U+061B ؛ U+061F ؟
   * U+06D4 ۔), so a naive split leaves "ہیں؟" glued together — and "ہیں؟" is not
   * the stop word "ہیں", which let a question-ending word score as a topic word.
   * Punctuation is stripped first, then the words are split.
   */
  const urduTokens = original
    .replace(/[\u060C\u061B\u061F\u06D4\u0640]/g, ' ')
    .split(/[^\u0600-\u06FF]+/u)
    .filter(token => token.length > 1 && !RETRIEVAL_STOP_WORDS.has(token))

  const scored = knowledgeBase.map(entry => {
    let score = 0
    const via = new Set<'en' | 'roman' | 'urdu'>()

    // English keywords — exact phrase or token match only.
    for (const keyword of entry.keywords) {
      if (containsTerm(lowerOriginal, keyword)) {
        score += keyword.split(' ').length * 3
        via.add('en')
      }
    }

    // Roman-Urdu keywords — the writer's own spelling wins.
    for (const keyword of entry.keywordsRoman ?? []) {
      if (containsTerm(lowerOriginal, keyword)) {
        score += keyword.split(' ').length * 3
        via.add('roman')
      }
    }

    // Urdu keywords — matched directly, and also against the transliterated
    // query so "fees" finds an entry indexed as "فیس".
    for (const keyword of entry.keywordsUrdu ?? []) {
      if (containsTerm(lowerExpanded, keyword)) {
        score += keyword.split(' ').length * 3
        via.add('urdu')
      }
    }

    // Topic overlap for words the knowledge base did not list as keywords.
    const haystack = `${entry.question} ${entry.answer} ${entry.answerRoman ?? ''} ${entry.answerUrdu ?? ''}`.toLowerCase()
    for (const token of latinTokens) {
      if (containsTerm(haystack, token)) score += 1
    }
    for (const token of urduTokens) {
      if (containsTerm(haystack, token)) score += 1
    }

    return { entry, score, via: [...via] }
  })

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit)
}

/** Backwards-compatible helper: the entries only. */
export function searchKnowledgeBase(query: string, limit = 3) {
  return searchKnowledgeBaseDetailed(query, limit).map(match => match.entry)
}

/**
 * Builds the grounding context handed to the model. Includes the language the
 * visitor used so the reply comes back in the same one.
 */
export function knowledgeBasePromptContext(entries: KnowledgeEntry[], language?: AssistantLanguage) {
  const source = entries.length ? entries : knowledgeBase.slice(0, 6)
  const body = source
    .map(entry => {
      const lines = [`Q: ${entry.question}`, `A: ${entry.answer}`]
      if (entry.answerRoman) lines.push(`Answer in Roman Urdu: ${entry.answerRoman}`)
      if (entry.answerUrdu) lines.push(`Answer in Urdu: ${entry.answerUrdu}`)
      if (entry.href) lines.push(`Link: ${entry.href}`)
      return lines.join('\n')
    })
    .join('\n\n')

  const instruction = language ? `\n\nReply in ${languageLabel(language)}.` : ''
  return body + instruction
}

export function languageLabel(language: AssistantLanguage) {
  if (language === 'ur') return 'Urdu (اردو script)'
  if (language === 'roman-ur') return 'Roman Urdu (Urdu written in Latin letters)'
  return 'English'
}
