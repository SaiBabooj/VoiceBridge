import type { Commitment, Driver, DriverRequest, LangCode, RiskLevel, VehicleType } from '../types'
import { formatINR } from './utils'

type Localized = Record<LangCode, string>

export interface DriverFilters {
  language?: LangCode | 'all'
  vehicle?: VehicleType | 'all'
  sort?: 'recommended' | 'price' | 'rating'
}

export const SAMPLE_DRIVERS: Driver[] = [
  {
    id: 'drv-ravi',
    name: 'Ravi Kumar',
    avatarVariant: 0,
    car: 'Maruti Suzuki Dzire',
    vehicleType: 'sedan',
    languages: ['ta', 'en'],
    primaryLanguage: 'ta',
    rating: 4.9,
    trips: 1840,
    priceMin: 2900,
    priceMax: 3500,
    waitingCharge: 200,
    verified: true,
    available: true,
    is_sample: true,
    intro: {
      ta: 'வணக்கம்! நான் ரவி, சென்னையில் பிறந்து வளர்ந்தவன். கோயில்கள், கடற்கரை, சுவையான உணவு — எல்லாம் எனக்குத் தெரியும்.',
      hi: 'वणक्कम! मैं रवि हूँ, चेन्नई में पैदा हुआ और बड़ा हुआ। मंदिर, बीच और बढ़िया स्थानीय खाना — सब मुझे पता है।',
      en: 'Vanakkam! I am Ravi, born and raised in Chennai. I know the temples, the beach and the best local food.',
    },
  },
  {
    id: 'drv-murugan',
    name: 'Murugan S',
    avatarVariant: 1,
    car: 'Toyota Innova Crysta',
    vehicleType: 'suv',
    languages: ['ta', 'hi'],
    primaryLanguage: 'ta',
    rating: 4.8,
    trips: 1520,
    priceMin: 3800,
    priceMax: 4600,
    waitingCharge: 250,
    verified: true,
    available: true,
    is_sample: true,
    intro: {
      ta: 'வணக்கம், நான் முருகன். குடும்பங்களுடன் பயணம் செய்வதில் அனுபவம் அதிகம். நிறைய இடைவெளி, நிறைய பொறுமை.',
      hi: 'वणक्कम, मैं मुरुगन हूँ। परिवारों के साथ सफ़र कराने का मुझे अच्छा अनुभव है। आराम और धैर्य, दोनों मिलेंगे।',
      en: 'Vanakkam, I am Murugan. I have years of experience with families. Plenty of space, plenty of patience.',
    },
  },
  {
    id: 'drv-karthik',
    name: 'Karthik R',
    avatarVariant: 2,
    car: 'Maruti Baleno',
    vehicleType: 'hatchback',
    languages: ['ta', 'en'],
    primaryLanguage: 'ta',
    rating: 4.7,
    trips: 980,
    priceMin: 2300,
    priceMax: 2800,
    waitingCharge: 180,
    verified: true,
    available: true,
    is_sample: true,
    intro: {
      ta: 'ஹாய், கார்த்திக் இங்கே. சிறிய கார், பெரிய மனம். மெரினா பீச் சுற்றி என் ஃபேவரிட் ரூட் உண்டு.',
      hi: 'हैलो, मैं कार्तिक हूँ। छोटी गाड़ी, बड़ा दिल। मरीना बीच के आसपास मेरा पसंदीदा रास्ता है।',
      en: 'Hi, Karthik here. Small car, big heart. I have a favourite route around Marina Beach.',
    },
  },
  {
    id: 'drv-arjun',
    name: 'Arjun P',
    avatarVariant: 3,
    car: 'Maruti Ertiga',
    vehicleType: 'suv',
    languages: ['ta', 'hi', 'en'],
    primaryLanguage: 'ta',
    rating: 4.9,
    trips: 2100,
    priceMin: 3200,
    priceMax: 3900,
    waitingCharge: 200,
    verified: true,
    available: false,
    is_sample: true,
    intro: {
      ta: 'நான் அர்ஜுன். ஆங்கிலம், தமிழ், ஹிந்தி பேசுவேன். ஒரு நாளில் சென்னையின் மறைவான இடங்களைக் காட்டுவேன்.',
      hi: 'मैं अर्जुन हूँ। तमिल, हिंदी और अंग्रेज़ी बोलता हूँ। एक दिन में चेन्नई की छिपी जगहें दिखाऊँगा।',
      en: 'I am Arjun. I speak Tamil, Hindi and English. I will show you Chennai hidden corners in a day.',
    },
  },
  {
    id: 'drv-suresh',
    name: 'Suresh M',
    avatarVariant: 4,
    car: 'Honda City',
    vehicleType: 'sedan',
    languages: ['ta', 'hi'],
    primaryLanguage: 'ta',
    rating: 4.6,
    trips: 760,
    priceMin: 3000,
    priceMax: 3600,
    waitingCharge: 200,
    verified: false,
    available: true,
    is_sample: true,
    intro: {
      ta: 'வணக்கம், சுரேஷ். சுத்தமான கார், நேரத்துக்கு வருவேன். டாலர் இல்ல, ரூபாய் மட்டும்!',
      hi: 'वणक्कम, सुरेश। साफ़ गाड़ी, समय पर पहुँचूँगा। डॉलर नहीं, सिर्फ़ रुपये!',
      en: 'Vanakkam, Suresh. Clean car, I arrive on time. No dollars, rupees only!',
    },
  },
  {
    id: 'drv-vignesh',
    name: 'Vignesh K',
    avatarVariant: 5,
    car: 'Maruti Swift',
    vehicleType: 'hatchback',
    languages: ['ta', 'en'],
    primaryLanguage: 'ta',
    rating: 4.8,
    trips: 1230,
    priceMin: 2100,
    priceMax: 2600,
    waitingCharge: 180,
    verified: true,
    available: true,
    is_sample: true,
    intro: {
      ta: 'நான் விக்னேஷ். காலை எட்டு மணிக்கே தயார். சாலை நெரிசலைத் தவிர்க்க நான் வழி தெரியும்.',
      hi: 'मैं विग्नेश हूँ। सुबह आठ बजे तैयार। ट्रैफ़िक से बचने का रास्ता मुझे पता है।',
      en: 'I am Vignesh. Ready at eight sharp. I know how to skip the traffic.',
    },
  },
  {
    id: 'drv-prakash',
    name: 'Prakash N',
    avatarVariant: 6,
    car: 'Mahindra XUV700',
    vehicleType: 'suv',
    languages: ['ta', 'en'],
    primaryLanguage: 'ta',
    rating: 4.9,
    trips: 1670,
    priceMin: 4200,
    priceMax: 5000,
    waitingCharge: 250,
    verified: true,
    available: true,
    is_sample: true,
    intro: {
      ta: 'வணக்கம், பிரகாஷ். பெரிய SUV, ஏசி, தண்ணீர் எப்போதும் இருக்கும். மாமல்லபுரம் சுற்றுலாவுக்கு ஏற்றவன்.',
      hi: 'वणक्कम, प्रकाश। बड़ी SUV, एसी, पानी हमेशा रहेगा। महाबलीपुरम घूमने के लिए बढ़िया।',
      en: 'Vanakkam, Prakash. Big SUV, AC, water always on board. Great for a Mahabalipuram day.',
    },
  },
  {
    id: 'drv-anand',
    name: 'Anand B',
    avatarVariant: 7,
    car: 'Maruti Ciaz',
    vehicleType: 'sedan',
    languages: ['ta', 'hi'],
    primaryLanguage: 'ta',
    rating: 4.5,
    trips: 540,
    priceMin: 2900,
    priceMax: 3500,
    waitingCharge: 200,
    verified: false,
    available: true,
    is_sample: true,
    intro: {
      ta: 'நான் ஆனந்த். அமைதியான ஓட்டுநர். உங்கள் திட்டத்தைச் சொன்னால், நான் பாதையைத் தயார் செய்வேன்.',
      hi: 'मैं आनंद हूँ। शांत ड्राइवर। आपका प्लान बताइए, मैं रास्ता तैयार कर दूँगा।',
      en: 'I am Anand. A calm driver. Tell me your plan and I will prepare the route.',
    },
  },
  {
    id: 'drv-dinesh',
    name: 'Dinesh V',
    avatarVariant: 8,
    car: 'Maruti WagonR',
    vehicleType: 'hatchback',
    languages: ['ta'],
    primaryLanguage: 'ta',
    rating: 4.7,
    trips: 890,
    priceMin: 1900,
    priceMax: 2400,
    waitingCharge: 150,
    verified: false,
    available: true,
    is_sample: true,
    intro: {
      ta: 'வணக்கம், தினேஷ். பட்ஜெட்டுக்கு ஏற்ற பயணம். சென்னை எல்லா மூலைக்கும் எனக்குத் தெரியும்.',
      hi: 'वणक्कम, दिनेश। बजट में अच्छा सफ़र। चेन्नई का हर कोना मुझे पता है।',
      en: 'Vanakkam, Dinesh. A budget-friendly ride. I know every corner of Chennai.',
    },
  },
  {
    id: 'drv-senthil',
    name: 'Senthil K',
    avatarVariant: 9,
    car: 'Toyota Innova',
    vehicleType: 'suv',
    languages: ['ta', 'hi'],
    primaryLanguage: 'ta',
    rating: 4.8,
    trips: 1990,
    priceMin: 3600,
    priceMax: 4300,
    waitingCharge: 250,
    verified: true,
    available: false,
    is_sample: true,
    intro: {
      ta: 'நான் செந்தில். கோயில் வழிபாட்டு பயணங்களுக்கு வசதி. முன்பதிவு செய்தால் நிச்சயம் வருவேன்.',
      hi: 'मैं सेंथिल हूँ। मंदिर यात्राओं के लिए अनुकूल। बुक करें तो ज़रूर आऊँगा।',
      en: 'I am Senthil. Comfortable for temple trips. Book me and I will be there.',
    },
  },
  {
    id: 'drv-ganesh',
    name: 'Ganesh T',
    avatarVariant: 10,
    car: 'Hyundai Verna',
    vehicleType: 'sedan',
    languages: ['ta', 'en'],
    primaryLanguage: 'ta',
    rating: 4.6,
    trips: 640,
    priceMin: 3000,
    priceMax: 3600,
    waitingCharge: 200,
    verified: false,
    available: true,
    is_sample: true,
    intro: {
      ta: 'வணக்கம், கணேஷ். ஏசி கார், நல்ல இசை. நீங்கள் ஓய்வெடுங்கள், நான் ஓட்டுகிறேன்.',
      hi: 'वणक्कम, गणेश। एसी कार, अच्छा संगीत। आप आराम करें, मैं चलाता हूँ।',
      en: 'Vanakkam, Ganesh. AC car, good music. You rest, I drive.',
    },
  },
  {
    id: 'drv-hari',
    name: 'Hari R',
    avatarVariant: 11,
    car: 'Maruti Ertiga',
    vehicleType: 'suv',
    languages: ['ta', 'hi', 'en'],
    primaryLanguage: 'ta',
    rating: 4.9,
    trips: 1410,
    priceMin: 3200,
    priceMax: 3900,
    waitingCharge: 200,
    verified: true,
    available: true,
    is_sample: true,
    intro: {
      ta: 'நான் ஹரி. மூன்று மொழிகள் பேசுவேன். உணவு பிரியர்களுக்கு சிறந்த உணவகங்களைக் காட்டுவேன்.',
      hi: 'मैं हरि हूँ। तीन भाषाएँ बोलता हूँ। खाने के शौक़ीन लोगों को बढ़िया रेस्टोरेंट दिखाऊँगा।',
      en: 'I am Hari. I speak three languages. For food lovers, I know the best spots.',
    },
  },
]

export const PLAN_COPY: Record<string, Localized> = {
  pickup: { en: 'Hotel pickup', hi: 'होटल से पिकअप', ta: 'ஹோட்டலில் இருந்து பிக்அப்' },
  temple: {
    en: 'Kapaleeshwarar Temple',
    hi: 'कपालेश्वर मंदिर',
    ta: 'கபாலீஸ்வரர் கோயில்',
  },
  beach: { en: 'Marina Beach', hi: 'मरीना बीच', ta: 'மெரினா கடற்கரை' },
  lunch: {
    en: 'Lunch in Mylapore',
    hi: 'मायलापुर में दोपहर का खाना',
    ta: 'மயிலாப்பூரில் மதிய உணவு',
  },
  coffee: {
    en: 'Filter coffee stop',
    hi: 'फ़िल्टर कॉफ़ी स्टॉप',
    ta: 'ஃபில்டர் காபி நிறுத்தம்',
  },
  dinner: { en: 'Dinner stop', hi: 'रात के खाने का स्टॉप', ta: 'இரவு உணவு நிறுத்தம்' },
}

export interface ScriptLine {
  original: Localized
  risk: RiskLevel
  confirmKind?: 'time'
}

export const TRAVELLER_SCRIPT: ScriptLine[] = [
  {
    risk: 'low',
    original: {
      en: "Hello! We'd love to see Kapaleeshwarar Temple and Marina Beach, and finish with dinner somewhere local. There's no rush — we're happy to take our time.",
      hi: 'नमस्ते! हम कपालेश्वर मंदिर और मरीना बीच देखना चाहेंगे, और आख़िर में कहीं स्थानीय जगह पर रात का खाना। कोई जल्दी नहीं — हम आराम से घूमना चाहते हैं।',
      ta: 'வணக்கம்! கபாலீஸ்வரர் கோயிலும் மெரினா கடற்கரையும் பார்க்க ஆசை, கடைசியாக ஏதாவது ஊர் உணவகத்தில் இரவு உணவு. அவசரம் இல்லை — நிதானமாகச் சுற்றலாம்.',
    },
  },
  {
    risk: 'commitment',
    confirmKind: 'time',
    original: {
      en: 'Would it be alright to start around 8 in the morning and be back by 5? If that feels too tight, we can adjust.',
      hi: 'क्या हम सुबह करीब 8 बजे निकलकर शाम 5 बजे तक लौट सकते हैं? अगर ज़्यादा जल्दी लगे तो हम बदल सकते हैं।',
      ta: 'காலை சுமார் 8 மணிக்குத் தொடங்கி மாலை 5 மணிக்குத் திரும்பலாமா? அது அவசரமாக இருந்தால் மாற்றிக்கொள்ளலாம்.',
    },
  },
  {
    risk: 'low',
    original: {
      en: "That sounds lovely, thank you. If there's time, a proper filter coffee stop would make our day.",
      hi: 'बहुत अच्छा लगा, धन्यवाद। अगर समय हो तो एक अच्छी फ़िल्टर कॉफ़ी की जगह हमारा दिन बना देगी।',
      ta: 'மிக நன்றாக இருக்கும், நன்றி. நேரம் இருந்தால் சரியான ஃபில்டர் காபி நிறுத்தம் எங்கள் நாளை முழுமையாக்கும்.',
    },
  },
  {
    risk: 'low',
    original: {
      en: "Thank you so much — please send the plan whenever you get a moment. We're really looking forward to it.",
      hi: 'बहुत-बहुत धन्यवाद — जब समय मिले, प्लान भेज दीजिए। हम बहुत उत्साहित हैं।',
      ta: 'மிக்க நன்றி — நேரம் கிடைக்கும்போது திட்டத்தை அனுப்புங்கள். நாங்கள் மிகவும் ஆவலாக இருக்கிறோம்.',
    },
  },
]

export interface DriverReply {
  text: Localized | ((commitment: Commitment) => Localized)
  risk: RiskLevel
  confirmKind?: 'price'
}

export const DRIVER_REPLIES: DriverReply[] = [
  {
    risk: 'commitment',
    confirmKind: 'price',
    text: ({ price, hours, waitingCharge }) => ({
      ta: `வணக்கம்! முழு நாளுக்கு — ${hours} மணி நேரம் — ${formatINR(price)}, பெட்ரோல் மற்றும் பார்க்கிங் உட்பட. அதற்குப் பிறகு காத்திருப்பு மணிக்கு ${formatINR(waitingCharge)}, ஆனால் நேரத்தைக் காப்பாற்ற என்னால் முடிந்ததைச் செய்வேன்.`,
      hi: `वणक्कम! पूरे दिन के लिए — ${hours} घंटे — ${formatINR(price)}, पेट्रोल और पार्किंग सहित। उसके बाद इंतज़ार ${formatINR(waitingCharge)} प्रति घंटा, लेकिन मैं समय पर रखने की पूरी कोशिश करूँगा।`,
      en: `Vanakkam! For the full day — ${hours} hours — it's ${formatINR(price)}, with fuel and parking included. Waiting after that is ${formatINR(waitingCharge)} an hour, but I'll do my best to keep us on time.`,
    }),
  },
  {
    risk: 'low',
    text: {
      ta: 'எட்டு மணி வசதியாக இருக்கும். 7:50க்கே ஹோட்டலுக்கு வந்துவிடுகிறேன் — அவசரமில்லாமல் கிளம்பலாம்.',
      hi: 'आठ बजे आराम से हो जाएगा। मैं 7:50 तक होटल पहुँच जाऊँगा, ताकि हम बिना जल्दबाज़ी के निकल सकें।',
      en: "Eight o'clock is comfortable. I'll be at your hotel by 7:50 so we can leave gently, without rushing.",
    },
  },
  {
    risk: 'low',
    text: {
      ta: 'மயிலாப்பூருக்கு அருகில் பழைய அழகான காபி கடை ஒன்று இருக்கிறது. அதைத் திட்டத்தில் சேர்க்கிறேன் — அங்கே ஃபில்டர் காபி நிற்கவே தகுந்தது.',
      hi: 'मायलापुर के पास एक पुरानी और प्यारी कॉफ़ी की जगह है। मैं इसे प्लान में जोड़ दूँगा — वहाँ की फ़िल्टर कॉफ़ी सच में रुकने लायक है।',
      en: "There's a lovely old coffee place near Mylapore. I'll add it to the plan — the filter coffee there is really worth the stop.",
    },
  },
  {
    risk: 'low',
    text: {
      ta: 'நாளை காலை 7:50க்கு ஹோட்டல் வாசலில் இருப்பேன். எதற்கும் கவலைப்படாதீர்கள் — உங்கள் நாளை நன்றாகவே கவனித்துக்கொள்கிறேன்.',
      hi: 'कल सुबह 7:50 पर होटल के दरवाज़े पर मिलूँगा। आप कुछ भी चिंता न करें — आपका दिन मैं अच्छे से संभालूँगा।',
      en: "I'll be at your hotel entrance at 7:50 tomorrow. Please don't worry about a thing — I'll take good care of your day.",
    },
  },
]

export const TRAVELLER_REPLIES: Localized[] = [
  {
    en: "That sounds fair, thank you. We're very happy with that.",
    hi: 'यह ठीक लगता है, धन्यवाद। हमें यह बहुत अच्छा लगा।',
    ta: 'நியாயமாக இருக்கிறது, நன்றி. எங்களுக்கு இது மிகவும் திருப்தி.',
  },
  {
    en: "Perfect — eight in the morning suits us. We'll be ready in the lobby.",
    hi: 'बढ़िया — सुबह आठ बजे हमारे लिए ठीक है। हम लॉबी में तैयार होंगे।',
    ta: 'சரி — காலை எட்டு மணி எங்களுக்கு ஏற்றது. லாபியில் தயாராக இருப்போம்.',
  },
  {
    en: 'Yes please, the coffee stop sounds lovely. Thank you for thinking of it.',
    hi: 'हाँ ज़रूर, कॉफ़ी स्टॉप अच्छा लगेगा। सोचने के लिए धन्यवाद।',
    ta: 'ஆம், காபி நிறுத்தம் அருமை. நினைத்ததற்கு நன்றி.',
  },
  {
    en: "That's very kind of you. We're really looking forward to tomorrow.",
    hi: 'आप बहुत अच्छे हैं। हम कल का बहुत इंतज़ार कर रहे हैं।',
    ta: 'மிகவும் அன்பு. நாளைக்காக மிகவும் ஆவலாக இருக்கிறோம்.',
  },
]

export const CONFIRM_COPY = {
  price: {
    backTranslation: ({ price, hours, waitingCharge }: Commitment): Localized => ({
      en: `${formatINR(price)} for ${hours} hours · waiting ${formatINR(waitingCharge)} an hour`,
      hi: `${formatINR(price)} में ${hours} घंटे · इंतज़ार ${formatINR(waitingCharge)} प्रति घंटा`,
      ta: `${hours} மணி நேரத்திற்கு ${formatINR(price)} · காத்திருப்பு மணிக்கு ${formatINR(waitingCharge)}`,
    }),
    question: {
      en: 'Does this match what you said?',
      hi: 'क्या यह वही है जो आपने कहा?',
      ta: 'நீங்கள் சொன்னது இதுதானா?',
    },
  },
  time: {
    backTranslation: {
      en: 'Start 8:00 AM and finish 5:00 PM',
      hi: 'सुबह 8:00 से शाम 5:00 तक',
      ta: 'காலை 8:00 முதல் மாலை 5:00 வரை',
    },
    question: {
      en: 'Did you mean 8:00 AM to 5:00 PM?',
      hi: 'क्या आपका मतलब सुबह 8:00 से शाम 5:00 तक था?',
      ta: 'காலை 8:00 முதல் மாலை 5:00 வரை என்று சொன்னீர்களா?',
    },
  },
  place: {
    backTranslation: {
      en: 'Add a filter coffee stop at 4:00 PM',
      hi: 'शाम 4:00 बजे फ़िल्टर कॉफ़ी स्टॉप जोड़ें',
      ta: 'மாலை 4:00 மணிக்கு ஃபில்டர் காபி நிறுத்தம் சேர்க்கவா?',
    },
    question: {
      en: 'Should I add this stop to the plan?',
      hi: 'क्या मैं यह स्टॉप प्लान में जोड़ूँ?',
      ta: 'இந்த நிறுத்தத்தைத் திட்டத்தில் சேர்க்கலாமா?',
    },
  },
  followUp: {
    price: {
      en: 'No problem at all — what price feels fair to you?',
      hi: 'कोई बात नहीं — आपके लिए कौन-सी कीमत ठीक लगेगी?',
      ta: 'பரவாயில்லை — உங்களுக்கு எந்த விலை நியாயமாகத் தோன்றுகிறது?',
    },
    time: {
      en: "Of course — tell me a time that works better and we'll adjust.",
      hi: 'बिलकुल — जो समय ठीक लगे बताइए, हम बदल लेंगे।',
      ta: 'நிச்சயம் — உங்களுக்கு வசதியான நேரம் சொல்லுங்கள், மாற்றிக்கொள்வோம்.',
    },
    place: {
      en: "That's alright — we can skip it and keep the day simple.",
      hi: 'कोई बात नहीं — हम इसे छोड़कर दिन आसान रख सकते हैं।',
      ta: 'பரவாயில்லை — இதைத் தவிர்த்து நாளை எளிதாக வைத்துக்கொள்ளலாம்.',
    },
    text: {
      en: 'No problem — tell me what to change and I will fix it.',
      hi: 'कोई बात नहीं — क्या बदलना है बताइए, मैं ठीक कर दूँगा।',
      ta: 'பரவாயில்லை — என்ன மாற்ற வேண்டும் சொல்லுங்கள், சரிசெய்கிறேன்.',
    },
  },
  driverConfirmed: {
    en: 'Thank you — I have confirmed it on my side too.',
    hi: 'धन्यवाद — मैंने भी अपनी तरफ़ से पुष्टि कर दी है।',
    ta: 'நன்றி — நானும் என் பக்கத்தில் உறுதி செய்துவிட்டேன்.',
  },
  travellerThanks: {
    en: 'Wonderful — thank you, everything looks perfect.',
    hi: 'बहुत बढ़िया — धन्यवाद, सब कुछ सही लग रहा है।',
    ta: 'அருமை — நன்றி, எல்லாம் சரியாக இருக்கிறது.',
  },
} as const

export function quoteForDriver(driver: Driver): number {
  return Math.round((driver.priceMin + driver.priceMax) / 200) * 100
}

export const INCOMING_REQUEST: DriverRequest = {
  id: 'req-priya',
  travellerName: 'Priya Sharma',
  travellerLanguage: 'hi',
  pickup: {
    en: 'Hotel pickup — T. Nagar',
    hi: 'होटल से पिकअप — टी. नगर',
    ta: 'ஹோட்டலில் இருந்து பிக்அப் — டி. நகர்',
  },
  stops: [PLAN_COPY.temple, PLAN_COPY.beach, PLAN_COPY.lunch],
  hours: 8,
  distanceKm: 78,
  groupSize: 2,
  offeredPrice: 3200,
  is_sample: true,
}

export const TIP_DRAFT = {
  travellerName: 'Priya S.',
  amount: 200,
  note: {
    en: 'Very polite family. Kept the car clean and offered me coffee at the breakfast stop.',
    hi: 'बहुत विनम्र परिवार। गाड़ी साफ़ रखी और नाश्ते के स्टॉप पर मुझे कॉफ़ी पिलाई।',
    ta: 'மிகவும் பணிவான குடும்பம். காரைச் சுத்தமாக வைத்தார்கள், காலை உணவு நிறுத்தத்தில் எனக்குக் காபி வாங்கித் தந்தார்கள்.',
  },
  tags: ['polite', 'clean', 'onTime'],
  transcript: {
    en: 'Priya madam gave two hundred rupees extra. Very polite family, and they left the car so clean.',
    hi: 'प्रिया मैडम ने दो सौ रुपये अतिरिक्त दिए। बहुत अच्छा परिवार, गाड़ी बहुत साफ़ छोड़ी।',
    ta: 'பிரியா மேடம் இருநூறு ரூபாய் கூடுதலாகக் கொடுத்தார். மிகவும் நல்ல குடும்பம், காரை மிகச் சுத்தமாக விட்டார்கள்.',
  },
} as const

export function findDriver(id: string): Driver | undefined {
  return SAMPLE_DRIVERS.find((driver) => driver.id === id)
}
