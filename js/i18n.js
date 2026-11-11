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
    th: 'นั่งเรือไม้ลำเล็ก ล่องผ่านแม่น้ำยามเย็นและแสงโคมไฟ ไม่ต้องรีบ แค่ชมวิวและฟังเพลง',
    en: 'Ride a small wooden boat through a sunset river and lantern light. No hurry — just watch and listen.',
    ko: '작은 나무 보트를 타고 노을 강과 등불 사이를 흘러가요. 서두를 필요 없이 바라보고 들어 보세요.',
    zh: '乘一叶小木舟，穿过晚霞之河与点点灯火。不必着急，只需观赏与聆听。',
    hi: 'एक छोटी लकड़ी की नाव में सूर्यास्त की नदी और लालटेनों की रोशनी से गुज़रें। कोई जल्दी नहीं — बस देखें और सुनें।',
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
  sample: { th: 'ตัวอย่างแรก · 2 สถานที่', en: 'First sample · 2 places', ko: '첫 샘플 · 장소 2곳', zh: '首个试玩版 · 2 个地点', hi: 'पहला नमूना · 2 जगहें' },
  z1name: { th: 'แม่น้ำยามอัสดง', en: 'Sunset River', ko: '노을 강', zh: '晚霞之河', hi: 'सूर्यास्त की नदी' },
  z1sub: { th: 'ที่ซึ่งวันค่อยๆ ละลายเป็นสีทอง', en: 'Where the day slowly melts into gold', ko: '하루가 천천히 금빛으로 녹아드는 곳', zh: '白昼慢慢融化成金色的地方', hi: 'जहाँ दिन धीरे-धीरे सुनहरे रंग में घुल जाता है' },
  z2name: { th: 'สะพานโคมไฟ', en: 'Lantern Bridge', ko: '등불 다리', zh: '灯火之桥', hi: 'लालटेन पुल' },
  z2sub: { th: 'แสงดวงน้อยนำทางเราเข้าสู่ราตรี', en: 'Little lights guide you into the night', ko: '작은 불빛들이 밤으로 길을 밝혀 줘요', zh: '点点灯火引你步入夜色', hi: 'नन्ही रोशनियाँ रात की ओर राह दिखाती हैं' },
  endTitle: { th: 'คุณล่องมาถึงปลายฝันแล้ว', en: 'You have reached the end of the dream', ko: '꿈의 끝에 닿았어요', zh: '你已抵达梦的尽头', hi: 'आप सपने के छोर तक पहुँच गए' },
  endSub: { th: 'แล้วพบกันใหม่ในความฝันถัดไป', en: 'See you in the next dream', ko: '다음 꿈에서 또 만나요', zh: '下一个梦里再见', hi: 'अगले सपने में फिर मिलेंगे' },
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
