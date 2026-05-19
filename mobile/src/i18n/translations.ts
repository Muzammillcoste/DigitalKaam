import type { Language } from '@/store/settingsStore';

/**
 * Translation dictionary. `en` is the source of truth for the key set;
 * `ur` must provide the same keys (enforced by the `Translations` type).
 */
const en = {
  // ── Common ────────────────────────────────────────────────
  'common.save': 'Save Changes',
  'common.cancel': 'Cancel',
  'common.add': 'Add',
  'common.done': 'Done',
  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.back': 'Back',
  'common.appName': 'DigitalKaam',
  'common.version': 'DigitalKaam v1.0.0',

  // ── Drawer / Sidebar ──────────────────────────────────────
  'drawer.newChat': 'New Chat',
  'drawer.bookings': 'Bookings',
  'drawer.startEarning': 'Start Earning',
  'drawer.recentChats': 'Recent Chats',
  'drawer.noRecentChats': 'No recent chats yet',
  'drawer.settings': 'Settings',
  'drawer.untitledChat': 'New conversation',

  // ── Chat ──────────────────────────────────────────────────
  'chat.title': 'DigitalKaam AI',
  'chat.subtitle': 'Always ready to help',
  'chat.inputPlaceholder': 'Type or speak your request…',
  'chat.welcome':
    "Assalam-o-Alaikum! 👋\n\nI'm your DigitalKaam assistant. Tell me what service you need — for example:\n\n\"Mera AC kharab hai, Gulshan mein kal subah mistri chahiye\"\n\nor\n\n\"I need a plumber in DHA today afternoon\"",
  'chat.connectionError':
    'Sorry, I could not connect to the service. Please try again.',
  'chat.typing': 'DigitalKaam is typing…',
  'chat.transcribing': 'Transcribing your voice…',
  'chat.voiceError': 'Could not transcribe the recording. Please try again.',
  'chat.micDenied': 'Microphone permission denied',

  // ── Settings ──────────────────────────────────────────────
  'settings.title': 'Settings',
  'settings.profile': 'Profile',
  'settings.permissions': 'Permissions',
  'settings.colorMode': 'Color Mode',
  'settings.language': 'Language',
  'settings.logout': 'Logout',
  'settings.logoutSuccess': 'Signed out successfully',
  'settings.colorMode.light': 'Light',
  'settings.colorMode.dark': 'Dark',
  'settings.colorMode.system': 'System',
  'settings.language.english': 'English',
  'settings.language.urdu': 'اردو',
  'settings.permissions.title': 'Permissions',
  'settings.permissions.location': 'Location',
  'settings.permissions.locationDesc':
    'Used to find service providers near you.',
  'settings.permissions.microphone': 'Microphone',
  'settings.permissions.microphoneDesc': 'Used for voice service requests.',
  'settings.permissions.notifications': 'Notifications',
  'settings.permissions.notificationsDesc':
    'Booking updates and provider messages.',
  'settings.permissions.granted': 'Granted',
  'settings.permissions.denied': 'Denied',
  'settings.permissions.openSettings': 'Open device settings',

  // ── Profile ───────────────────────────────────────────────
  'profile.title': 'Profile',
  'profile.editProfile': 'Edit Profile',
  'profile.becomeProvider': 'Become a Provider',
  'profile.switchToProvider': 'Switch to Provider Mode',
  'profile.switchToCustomer': 'Switch to Customer Mode',
  'profile.switchedToProvider': 'Switched to Provider Mode',
  'profile.switchedToCustomer': 'Switched to Customer Mode',
  'profile.welcome': 'Welcome',
  'profile.fullName': 'Full Name',
  'profile.phone': 'Phone Number',
  'profile.homeArea': 'Home Area',
  'profile.nameRequired': 'Name is required',
  'profile.updated': 'Profile updated!',
  'profile.updateFailed': 'Failed to update profile',

  // ── Become a Provider ─────────────────────────────────────
  'provider.registerTitle': 'Register as Provider',
  'provider.registerSubtitle':
    'Earn money by offering your professional services to customers in your area.',
  'provider.serviceType': 'Service Type',
  'provider.serviceTypePlaceholder': 'Select a service type',
  'provider.specialization': 'Specialization',
  'provider.specializationPlaceholder':
    'e.g. Split AC Service & Installation',
  'provider.experience': 'Experience (Years)',
  'provider.experiencePlaceholder': 'e.g. 5',
  'provider.hourlyRate': 'Hourly Rate (PKR)',
  'provider.hourlyRatePlaceholder': 'e.g. 800',
  'provider.serviceArea': 'Primary Service Area',
  'provider.serviceAreaPlaceholder': 'Select an area',
  'provider.travelRadius': 'Travel Radius (km)',
  'provider.travelRadiusPlaceholder': 'e.g. 15',
  'provider.skills': 'Skills',
  'provider.skillsPlaceholder': 'Add a skill and tap +',
  'provider.submit': 'Submit Registration',
  'provider.specializationRequired':
    'Specialization is required (e.g. Inverter AC Repair)',
  'provider.experienceInvalid':
    'Please enter a valid number for experience years',
  'provider.rateInvalid': 'Hourly rate must be between 100 and 50000 PKR',
  'provider.success': 'Congratulations! You are now a Service Provider! 🎉',
  'provider.failed': 'Registration failed. Please try again.',
  'provider.alreadyProvider': 'You already have a provider profile.',

  // ── Bookings ──────────────────────────────────────────────
  'bookings.title': 'My Bookings',
  'bookings.empty': 'No bookings yet',
} as const;

export type TranslationKey = keyof typeof en;
type Translations = Record<TranslationKey, string>;

const ur: Translations = {
  'common.save': 'تبدیلیاں محفوظ کریں',
  'common.cancel': 'منسوخ کریں',
  'common.add': 'شامل کریں',
  'common.done': 'مکمل',
  'common.loading': 'لوڈ ہو رہا ہے…',
  'common.retry': 'دوبارہ کوشش کریں',
  'common.back': 'واپس',
  'common.appName': 'ڈیجیٹل کام',
  'common.version': 'ڈیجیٹل کام v1.0.0',

  'drawer.newChat': 'نئی گفتگو',
  'drawer.bookings': 'بکنگز',
  'drawer.startEarning': 'کمائی شروع کریں',
  'drawer.recentChats': 'حالیہ گفتگوئیں',
  'drawer.noRecentChats': 'ابھی کوئی حالیہ گفتگو نہیں',
  'drawer.settings': 'ترتیبات',
  'drawer.untitledChat': 'نئی گفتگو',

  'chat.title': 'ڈیجیٹل کام اے آئی',
  'chat.subtitle': 'ہمیشہ مدد کے لیے تیار',
  'chat.inputPlaceholder': 'اپنی درخواست لکھیں یا بولیں…',
  'chat.welcome':
    'السلام علیکم! 👋\n\nمیں آپ کا ڈیجیٹل کام اسسٹنٹ ہوں۔ مجھے بتائیں آپ کو کون سی سروس چاہیے — مثلاً:\n\n"میرا اے سی خراب ہے، گلشن میں کل صبح مستری چاہیے"\n\nیا\n\n"مجھے ڈی ایچ اے میں آج دوپہر پلمبر چاہیے"',
  'chat.connectionError':
    'معذرت، سروس سے رابطہ نہیں ہو سکا۔ براہ کرم دوبارہ کوشش کریں۔',
  'chat.typing': 'ڈیجیٹل کام جواب لکھ رہا ہے…',
  'chat.transcribing': 'آپ کی آواز کو متن میں بدلا جا رہا ہے…',
  'chat.voiceError':
    'ریکارڈنگ کو متن میں تبدیل نہیں کیا جا سکا۔ براہ کرم دوبارہ کوشش کریں۔',
  'chat.micDenied': 'مائیکروفون کی اجازت مسترد کر دی گئی',

  'settings.title': 'ترتیبات',
  'settings.profile': 'پروفائل',
  'settings.permissions': 'اجازتیں',
  'settings.colorMode': 'رنگ موڈ',
  'settings.language': 'زبان',
  'settings.logout': 'لاگ آؤٹ',
  'settings.logoutSuccess': 'کامیابی سے سائن آؤٹ ہو گئے',
  'settings.colorMode.light': 'روشن',
  'settings.colorMode.dark': 'گہرا',
  'settings.colorMode.system': 'سسٹم',
  'settings.language.english': 'English',
  'settings.language.urdu': 'اردو',
  'settings.permissions.title': 'اجازتیں',
  'settings.permissions.location': 'مقام',
  'settings.permissions.locationDesc':
    'آپ کے قریب سروس فراہم کنندگان تلاش کرنے کے لیے۔',
  'settings.permissions.microphone': 'مائیکروفون',
  'settings.permissions.microphoneDesc': 'آواز کی درخواستوں کے لیے۔',
  'settings.permissions.notifications': 'اطلاعات',
  'settings.permissions.notificationsDesc':
    'بکنگ اپڈیٹس اور فراہم کنندہ کے پیغامات۔',
  'settings.permissions.granted': 'اجازت ہے',
  'settings.permissions.denied': 'اجازت نہیں',
  'settings.permissions.openSettings': 'ڈیوائس کی ترتیبات کھولیں',

  'profile.title': 'پروفائل',
  'profile.editProfile': 'پروفائل میں ترمیم',
  'profile.becomeProvider': 'فراہم کنندہ بنیں',
  'profile.switchToProvider': 'فراہم کنندہ موڈ پر جائیں',
  'profile.switchToCustomer': 'کسٹمر موڈ پر جائیں',
  'profile.switchedToProvider': 'فراہم کنندہ موڈ پر منتقل ہو گئے',
  'profile.switchedToCustomer': 'کسٹمر موڈ پر منتقل ہو گئے',
  'profile.welcome': 'خوش آمدید',
  'profile.fullName': 'پورا نام',
  'profile.phone': 'فون نمبر',
  'profile.homeArea': 'علاقہ',
  'profile.nameRequired': 'نام درکار ہے',
  'profile.updated': 'پروفائل اپڈیٹ ہو گئی!',
  'profile.updateFailed': 'پروفائل اپڈیٹ نہیں ہو سکی',

  'provider.registerTitle': 'بطور فراہم کنندہ رجسٹر کریں',
  'provider.registerSubtitle':
    'اپنے علاقے کے صارفین کو پیشہ ورانہ خدمات فراہم کر کے کمائیں۔',
  'provider.serviceType': 'سروس کی قسم',
  'provider.serviceTypePlaceholder': 'سروس کی قسم منتخب کریں',
  'provider.specialization': 'مہارت',
  'provider.specializationPlaceholder':
    'مثلاً اسپلٹ اے سی سروس اور تنصیب',
  'provider.experience': 'تجربہ (سال)',
  'provider.experiencePlaceholder': 'مثلاً 5',
  'provider.hourlyRate': 'فی گھنٹہ ریٹ (روپے)',
  'provider.hourlyRatePlaceholder': 'مثلاً 800',
  'provider.serviceArea': 'بنیادی سروس علاقہ',
  'provider.serviceAreaPlaceholder': 'علاقہ منتخب کریں',
  'provider.travelRadius': 'سفر کی حد (کلومیٹر)',
  'provider.travelRadiusPlaceholder': 'مثلاً 15',
  'provider.skills': 'ہنر',
  'provider.skillsPlaceholder': 'ہنر لکھیں اور + دبائیں',
  'provider.submit': 'رجسٹریشن جمع کرائیں',
  'provider.specializationRequired':
    'مہارت درکار ہے (مثلاً انورٹر اے سی مرمت)',
  'provider.experienceInvalid':
    'براہ کرم تجربے کے سالوں کا درست نمبر درج کریں',
  'provider.rateInvalid': 'فی گھنٹہ ریٹ 100 سے 50000 روپے کے درمیان ہونا چاہیے',
  'provider.success': 'مبارک ہو! اب آپ سروس فراہم کنندہ ہیں! 🎉',
  'provider.failed': 'رجسٹریشن ناکام۔ براہ کرم دوبارہ کوشش کریں۔',
  'provider.alreadyProvider': 'آپ کے پاس پہلے سے فراہم کنندہ پروفائل موجود ہے۔',

  'bookings.title': 'میری بکنگز',
  'bookings.empty': 'ابھی کوئی بکنگ نہیں',
};

export const dictionaries: Record<Language, Translations> = { en, ur };
