// DREAM BOAT — 5-language strings (th / en / ko / zh / hi)
export const LANGS = [
  { code: 'th', label: 'ไทย' },
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'hi', label: 'हिन्दी' },
];

const S = {
  subtitle: { th: 'เรือน้อยล่องไปในความฝัน', en: 'A little boat drifting through dreams', ko: '꿈속을 달리는 작은 보트', zh: '梦中漂流的小船', hi: 'सपनों में बहती एक नन्ही नाव' },
  intro: {
    th: 'นั่งเรือไม้ลำเล็ก ล่องผ่านแปดสถานที่ดั่งความฝัน ตั้งแต่ยามเย็นจนถึงรุ่งเช้า ไม่ต้องรีบ แค่ชมวิวและฟังเพลง',
    en: 'Ride a small wooden boat from sunset to dawn through eight dreamlike places. No hurry — just watch and listen.',
    ko: '작은 나무 보트를 타고 노을에서 새벽까지, 꿈같은 여덟 곳을 흘러가요. 서두를 필요 없이 바라보고 들어 보세요.',
    zh: '乘一叶小木舟，从黄昏到黎明，漂过八个梦一般的地方。不必着急，只需观赏与聆听。',
    hi: 'एक छोटी लकड़ी की नाव में सूर्यास्त से भोर तक आठ सपनीली जगहों से गुज़रें। कोई जल्दी नहीं — बस देखें और सुनें।',
  },
  start: { th: 'เริ่มล่องเรือ', en: 'Set sail', ko: '출발하기', zh: '启航', hi: 'यात्रा शुरू करें' },
  hintTouch: {
    th: 'กดค้างที่ปุ่มพาย (หรือหน้าจอ) เพื่อพายเรือ · ลากเพื่อมองรอบๆ',
    en: 'Hold the row button (or the screen) to row · Drag to look around',
    ko: '노 젓기 버튼(또는 화면)을 길게 누르면 노를 저어요 · 드래그로 둘러보기',
    zh: '按住划桨按钮（或屏幕）划船 · 拖动环顾四周',
    hi: 'नाव खेने के लिए बटन (या स्क्रीन) दबाकर रखें · चारों ओर देखने के लिए खींचें',
  },
  hintKeys: {
    th: 'กด Space / W ค้างไว้เพื่อพาย · ลากเมาส์หรือ ← → เพื่อมองรอบๆ',
    en: 'Hold Space / W to row · Drag the mouse or use ← → to look around',
    ko: 'Space / W를 누르고 있으면 노를 저어요 · 마우스 드래그 또는 ← →로 둘러보기',
    zh: '按住 Space / W 划桨 · 拖动鼠标或按 ← → 环顾四周',
    hi: 'नाव खेने के लिए Space / W दबाए रखें · देखने के लिए माउस खींचें या ← → दबाएँ',
  },
  row: { th: 'พาย', en: 'Row', ko: '노 젓기', zh: '划桨', hi: 'खेना' },
  mute: { th: 'ปิดเสียง', en: 'Mute', ko: '소리 끄기', zh: '静音', hi: 'आवाज़ बंद' },
  unmute: { th: 'เปิดเสียง', en: 'Sound on', ko: '소리 켜기', zh: '开启声音', hi: 'आवाज़ चालू' },
  language: { th: 'ภาษา', en: 'Language', ko: '언어', zh: '语言', hi: 'भाषा' },
  sample: { th: 'การเดินทางในฝัน · 8 สถานที่', en: 'A dream journey · 8 places', ko: '꿈의 여정 · 장소 8곳', zh: '梦之旅 · 8 个地点', hi: 'सपनों की यात्रा · 8 जगहें' },
  z1name: { th: 'แม่น้ำยามอัสดง', en: 'Sunset River', ko: '노을 강', zh: '晚霞之河', hi: 'सूर्यास्त की नदी' },
  z1sub: { th: 'ที่ซึ่งวันค่อยๆ ละลายเป็นสีทอง', en: 'Where the day slowly melts into gold', ko: '하루가 천천히 금빛으로 녹아드는 곳', zh: '白昼慢慢融化成金色的地方', hi: 'जहाँ दिन धीरे-धीरे सुनहरे रंग में घुल जाता है' },
  z2name: { th: 'สะพานโคมไฟ', en: 'Lantern Bridge', ko: '등불 다리', zh: '灯火之桥', hi: 'लालटेन पुल' },
  z2sub: { th: 'แสงดวงน้อยนำทางเราเข้าสู่ราตรี', en: 'Little lights guide you into the night', ko: '작은 불빛들이 밤으로 길을 밝혀 줘요', zh: '点点灯火引你步入夜色', hi: 'नन्ही रोशनियाँ रात की ओर राह दिखाती हैं' },
  z3name: { th: 'ทุ่งต้นอ้อสีทอง', en: 'Golden Reeds', ko: '황금 갈대밭', zh: '金色芦苇荡', hi: 'सुनहरे सरकंडे' },
  z3sub: { th: 'สายลมพาเพลงลอดผ่านต้นอ้อ', en: 'The wind carries a song through the reeds', ko: '바람이 갈대 사이로 노래를 실어 와요', zh: '风穿过芦苇，送来一支歌', hi: 'हवा सरकंडों के बीच से एक गीत ले आती है' },
  z4name: { th: 'สะพานไม้เก่า', en: 'Old Wooden Bridges', ko: '나무 다리', zh: '古老木桥', hi: 'पुराने लकड़ी के पुल' },
  z4sub: { th: 'ล่องผ่านใต้สะพานไม้เก่าอย่างช้าๆ', en: 'Drift slowly beneath the old bridges', ko: '오래된 다리 아래로 천천히 지나가요', zh: '缓缓穿过古老的木桥下', hi: 'पुराने पुलों के नीचे से धीरे-धीरे गुज़रें' },
  z5name: { th: 'หุบเขาสายหมอก', en: 'Misty Valley', ko: '안개 골짜기', zh: '雾之谷', hi: 'धुंध की घाटी' },
  z5sub: { th: 'หมอกนุ่มๆ โอบกอดโลกทั้งใบ', en: 'A soft mist holds the whole world close', ko: '포근한 안개가 세상을 감싸 안아요', zh: '柔软的雾轻轻拥抱整个世界', hi: 'कोमल धुंध पूरी दुनिया को गले लगा लेती है' },
  z6name: { th: 'ป่าหิ่งห้อย', en: 'Firefly Forest', ko: '반딧불 숲', zh: '萤火森林', hi: 'जुगनुओं का जंगल' },
  z6sub: { th: 'ดวงดาวดวงน้อยเริงระบำระหว่างต้นไม้', en: 'Little stars dance between the trees', ko: '작은 별들이 나무 사이에서 춤춰요', zh: '小小的星星在林间起舞', hi: 'नन्हे तारे पेड़ों के बीच नाचते हैं' },
  z7name: { th: 'ทะเลสาบแสงดาว', en: 'Starlight Lake', ko: '별빛 호수', zh: '星光之湖', hi: 'तारों की झील' },
  z7sub: { th: 'ค่ำคืนที่ฟ้ากับน้ำกลายเป็นหนึ่งเดียว', en: 'A night where sky and water become one', ko: '하늘과 물이 하나가 되는 밤', zh: '天空与湖水合而为一的夜晚', hi: 'वह रात जब आसमान और पानी एक हो जाते हैं' },
  z8name: { th: 'ทะเลเมฆยามรุ่งอรุณ', en: 'Dawn Cloud Sea', ko: '새벽 구름바다', zh: '黎明云海', hi: 'भोर का बादल-सागर' },
  z8sub: { th: 'ที่ปลายฝัน เช้าวันใหม่รอเราอยู่', en: 'At the end of the dream, a new morning waits', ko: '꿈의 끝에서 새로운 아침이 기다려요', zh: '在梦的尽头，新的清晨正在等待', hi: 'सपने के छोर पर एक नई सुबह इंतज़ार करती है' },
  places: { th: 'เลือกสถานที่', en: 'Choose a place', ko: '장소 선택', zh: '选择地点', hi: 'जगह चुनें' },
  placesSub: { th: 'เลือกสถานที่ที่เคยไปถึงแล้ว เพื่อล่องเรือจากที่นั่น', en: 'Pick any place you have reached and sail from there', ko: '가 본 곳 중 하나를 골라 그곳부터 항해해요', zh: '选择一个去过的地方，从那里启航', hi: 'जहाँ आप पहुँच चुके हैं, उनमें से कोई जगह चुनें और वहीं से यात्रा करें' },
  fromStart: { th: 'ล่องเรือใหม่ตั้งแต่ต้น', en: 'Sail again from the start', ko: '처음부터 다시 항해하기', zh: '从头再次启航', hi: 'शुरुआत से फिर यात्रा करें' },
  locked: { th: 'ยังไปไม่ถึง', en: 'Not reached yet', ko: '아직 가 보지 않은 곳', zh: '尚未抵达', hi: 'अभी तक नहीं पहुँचे' },
  back: { th: 'กลับ', en: 'Back', ko: '돌아가기', zh: '返回', hi: 'वापस' },
  endTitle: { th: 'คุณล่องมาถึงปลายฝันแล้ว', en: 'You have reached the end of the dream', ko: '꿈의 끝에 닿았어요', zh: '你已抵达梦的尽头', hi: 'आप सपने के छोर तक पहुँच गए' },
  endSub: { th: 'คุณล่องผ่านความฝันทั้งแปดแห่ง และพบกับเช้าวันใหม่', en: 'You drifted through all eight dreams and met a new morning', ko: '여덟 곳의 꿈을 모두 지나 새 아침을 만났어요', zh: '你漂过了全部八个梦境，迎来了新的清晨', hi: 'आप आठों सपनों से गुज़रकर एक नई सुबह से मिले' },
  again: { th: 'ล่องเรืออีกครั้ง', en: 'Sail again', ko: '다시 항해하기', zh: '再次启航', hi: 'फिर से यात्रा करें' },
  provider: { th: 'ผู้ให้บริการ: MOTOR AA', en: 'Provided by MOTOR AA', ko: '제공: MOTOR AA', zh: '提供方：MOTOR AA', hi: 'प्रदाता: MOTOR AA' },
  musicNote: { th: 'ดนตรีสร้างขึ้นสดๆ ด้วยโค้ดของโปรเจกต์', en: 'Music is generated live by the project’s own code', ko: '음악은 프로젝트 코드로 실시간 생성돼요', zh: '音乐由项目代码实时生成', hi: 'संगीत प्रोजेक्ट के अपने कोड से लाइव बनता है' },
};

const KEY = 'dreamboat.lang';

export function detectLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LANGS.some(l => l.code === saved)) return saved;
  } catch (e) {}
  const list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
  for (const raw of list) {
    const p = String(raw).toLowerCase().split(/[-_]/)[0];
    if (LANGS.some(l => l.code === p)) return p;
  }
  return 'en';
}

let current = 'en';
export function setLang(code, save = true) {
  current = LANGS.some(l => l.code === code) ? code : 'en';
  if (save) { try { localStorage.setItem(KEY, current); } catch (e) {} }
  document.documentElement.lang = current;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
export function getLang() { return current; }
export function t(key) { const e = S[key]; if (!e) return key; return e[current] || e.en; }
