// Mots secrets par langue et catégorie. Si une langue manque une catégorie, on prend l'anglais.
const WORDS = {
  fr: {
    pays: ["France", "Japon", "Brésil", "Maroc", "Canada", "Égypte", "Italie", "Mexique", "Norvège", "Inde", "Australie", "Portugal"],
    objets: ["Parapluie", "Lampe", "Clé", "Miroir", "Horloge", "Bouteille", "Ciseaux", "Chaise", "Stylo", "Ballon", "Valise", "Téléphone"],
    sports: ["Football", "Tennis", "Natation", "Basketball", "Judo", "Cyclisme", "Rugby", "Ski", "Golf", "Boxe", "Escrime", "Volley"],
    lieux: ["Aéroport", "Plage", "Bibliothèque", "Hôpital", "Musée", "Marché", "Cinéma", "Gare", "Piscine", "Stade", "Château", "Forêt"],
    animaux: ["Lion", "Pingouin", "Dauphin", "Girafe", "Hibou", "Chameau", "Panda", "Serpent", "Papillon", "Requin", "Koala", "Renard"],
    vehicules: ["Vélo", "Train", "Avion", "Bateau", "Trottinette", "Camion", "Tramway", "Hélicoptère", "Moto", "Sous-marin", "Fusée", "Taxi"]
  },
  en: {
    pays: ["France", "Japan", "Brazil", "Morocco", "Canada", "Egypt", "Italy", "Mexico", "Norway", "India", "Australia", "Portugal"],
    objets: ["Umbrella", "Lamp", "Key", "Mirror", "Clock", "Bottle", "Scissors", "Chair", "Pen", "Balloon", "Suitcase", "Phone"],
    sports: ["Football", "Tennis", "Swimming", "Basketball", "Judo", "Cycling", "Rugby", "Skiing", "Golf", "Boxing", "Fencing", "Volleyball"],
    lieux: ["Airport", "Beach", "Library", "Hospital", "Museum", "Market", "Cinema", "Train station", "Swimming pool", "Stadium", "Castle", "Forest"],
    animaux: ["Lion", "Penguin", "Dolphin", "Giraffe", "Owl", "Camel", "Panda", "Snake", "Butterfly", "Shark", "Koala", "Fox"],
    vehicules: ["Bicycle", "Train", "Airplane", "Boat", "Scooter", "Truck", "Tram", "Helicopter", "Motorbike", "Submarine", "Rocket", "Taxi"]
  },
  es: {
    pays: ["Francia", "Japón", "Brasil", "Marruecos", "Canadá", "Egipto", "Italia", "México", "Noruega", "India", "Australia", "Portugal"],
    objets: ["Paraguas", "Lámpara", "Llave", "Espejo", "Reloj", "Botella", "Tijeras", "Silla", "Bolígrafo", "Globo", "Maleta", "Teléfono"],
    sports: ["Fútbol", "Tenis", "Natación", "Baloncesto", "Judo", "Ciclismo", "Rugby", "Esquí", "Golf", "Boxeo", "Esgrima", "Voleibol"],
    lieux: ["Aeropuerto", "Playa", "Biblioteca", "Hospital", "Museo", "Mercado", "Cine", "Estación", "Piscina", "Estadio", "Castillo", "Bosque"],
    animaux: ["León", "Pingüino", "Delfín", "Jirafa", "Búho", "Camello", "Panda", "Serpiente", "Mariposa", "Tiburón", "Koala", "Zorro"],
    vehicules: ["Bicicleta", "Tren", "Avión", "Barco", "Patinete", "Camión", "Tranvía", "Helicóptero", "Moto", "Submarino", "Cohete", "Taxi"]
  },
  ar: {
    pays: ["فرنسا", "اليابان", "البرازيل", "المغرب", "كندا", "مصر", "إيطاليا", "المكسيك", "النرويج", "الهند", "أستراليا", "البرتغال"],
    objets: ["مظلة", "مصباح", "مفتاح", "مرآة", "ساعة", "قارورة", "مقص", "كرسي", "قلم", "بالون", "حقيبة", "هاتف"],
    sports: ["كرة القدم", "التنس", "السباحة", "كرة السلة", "الجودو", "ركوب الدراجات", "الرغبي", "التزلج", "الغولف", "الملاكمة", "المبارزة", "الكرة الطائرة"],
    lieux: ["مطار", "شاطئ", "مكتبة", "مستشفى", "متحف", "سوق", "سينما", "محطة قطار", "مسبح", "ملعب", "قلعة", "غابة"],
    animaux: ["أسد", "بطريق", "دلفين", "زرافة", "بومة", "جمل", "باندا", "ثعبان", "فراشة", "قرش", "كوالا", "ثعلب"],
    vehicules: ["دراجة هوائية", "قطار", "طائرة", "قارب", "سكوتر", "شاحنة", "ترام", "مروحية", "دراجة نارية", "غواصة", "صاروخ", "سيارة أجرة"]
  }
};


// 81 pays connus (sélection validée). Noms fournis par le navigateur dans chaque langue.
const COUNTRY_CODES = ["FR","DE","GB","ES","IT","PT","NL","BE","CH","AT","GR","TR","PL","SE","NO","DK","FI","IS","IE","UA","RU","US","CA","MX","CU","JM","BR","AR","CL","CO","PE","VE","EC","BO","UY","MA","DZ","TN","EG","LY","SD","ET","KE","TZ","NG","GH","SN","CI","ZA","CD","AO","SA","AE","QA","IL","PS","IR","IQ","JO","LB","SY","YE","IN","PK","AF","BD","CN","JP","KR","KP","TH","VN","ID","PH","MY","SG","MM","KZ","AU","NZ","PG"];
const _countryCache = {};
function countryNames(lang) {
  if (_countryCache[lang]) return _countryCache[lang];
  let names = null;
  try {
    const dn = new Intl.DisplayNames([lang], { type: 'region' });
    names = [...new Set(COUNTRY_CODES.map((c) => dn.of(c)).filter((n) => n && n !== 'XX'))];
    names = names.map((n) => (n === 'Myanmar (Birmanie)' ? 'Birmanie' : n));
  } catch (e) {}
  if (!names || names.length < 70) names = WORDS.en.pays.slice();
  _countryCache[lang] = names;
  return names;
}

const CATEGORY_KEYS = ["pays", "objets", "sports", "lieux", "animaux", "vehicules"];

function wordsFor(lang, cat) {
  if (cat === 'pays') return countryNames(lang);
  const l = WORDS[lang] && WORDS[lang][cat] ? WORDS[lang] : WORDS.en;
  return l[cat] || WORDS.en[cat];
}
