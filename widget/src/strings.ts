// Minimal widget localization (English + Hindi). The privacy notice text itself
// comes from the tenant's published notice; these are the widget's own UI labels.

export interface Strings {
  bannerTitle: (business: string) => string;
  bannerBody: string;
  acceptAll: string;
  rejectOptional: string;
  choose: string;
  prefsTitle: string;
  prefsBody: string;
  essential: string;
  viewNotice: string;
  hideNotice: string;
  cancel: string;
  save: string;
  disclaimer: string;
  manage: string;
  minorCheck: string;
  guardianPlaceholder: string;
  minorHint: string;
  minorToast: string;
  dataRights: string;
}

const en: Strings = {
  bannerTitle: (b) => `${b || "This site"} uses your data with your consent`,
  bannerBody:
    "We ask permission for each specific purpose before using your personal data. You can accept, decline, or choose what you're comfortable with — and change your mind any time.",
  acceptAll: "Accept all",
  rejectOptional: "Reject optional",
  choose: "Choose purposes",
  prefsTitle: "Your privacy preferences",
  prefsBody:
    "Turn each purpose on or off. Essential purposes are needed to provide the service and can't be switched off.",
  essential: "Essential",
  viewNotice: "View full privacy notice",
  hideNotice: "Hide privacy notice",
  cancel: "Cancel",
  save: "Save preferences",
  disclaimer:
    "This consent tool helps this business honour your choices. It doesn't provide legal advice.",
  manage: "Manage preferences",
  minorCheck: "This is for someone under 18 (needs a parent/guardian)",
  guardianPlaceholder: "Parent/guardian email",
  minorHint:
    "We'll email the parent/guardian to confirm before recording consent.",
  minorToast: "We've emailed the parent/guardian to confirm consent.",
  dataRights: "Your data rights (access, correct or delete your data) →",
};

const hi: Strings = {
  bannerTitle: (b) => `${b || "यह साइट"} आपकी सहमति से आपके डेटा का उपयोग करती है`,
  bannerBody:
    "आपके व्यक्तिगत डेटा का उपयोग करने से पहले हम हर विशिष्ट उद्देश्य के लिए अनुमति माँगते हैं। आप स्वीकार, अस्वीकार या अपनी पसंद चुन सकते हैं — और कभी भी बदल सकते हैं।",
  acceptAll: "सभी स्वीकारें",
  rejectOptional: "वैकल्पिक अस्वीकारें",
  choose: "उद्देश्य चुनें",
  prefsTitle: "आपकी गोपनीयता प्राथमिकताएँ",
  prefsBody:
    "हर उद्देश्य को चालू या बंद करें। आवश्यक उद्देश्य सेवा प्रदान करने के लिए ज़रूरी हैं और बंद नहीं किए जा सकते।",
  essential: "आवश्यक",
  viewNotice: "पूरी गोपनीयता सूचना देखें",
  hideNotice: "गोपनीयता सूचना छिपाएँ",
  cancel: "रद्द करें",
  save: "प्राथमिकताएँ सहेजें",
  disclaimer:
    "यह सहमति उपकरण इस व्यवसाय को आपकी पसंद का पालन करने में मदद करता है। यह कानूनी सलाह नहीं देता।",
  manage: "प्राथमिकताएँ प्रबंधित करें",
  minorCheck: "यह 18 वर्ष से कम आयु के लिए है (माता-पिता/अभिभावक आवश्यक)",
  guardianPlaceholder: "माता-पिता/अभिभावक ईमेल",
  minorHint:
    "सहमति दर्ज करने से पहले हम माता-पिता/अभिभावक को पुष्टि के लिए ईमेल करेंगे।",
  minorToast: "हमने सहमति की पुष्टि के लिए माता-पिता/अभिभावक को ईमेल किया है।",
  dataRights: "आपके डेटा अधिकार (डेटा देखें, सुधारें या हटाएँ) →",
};

export function getStrings(lang: string): Strings {
  return lang === "hi" ? hi : en;
}
