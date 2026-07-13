// Shariatpur Sadar Upazila — 11 union parishads + municipality
export const ZONES = [
  'শরীয়তপুর পৌরসভা',
  'অঙ্গারিয়া ইউনিয়ন',
  'বিনোদপুর ইউনিয়ন',
  'চন্দ্রপুর ইউনিয়ন',
  'চিকান্দি ইউনিয়ন',
  'চিতালিয়া ইউনিয়ন',
  'ডোমসার ইউনিয়ন',
  'মাহমুদপুর ইউনিয়ন',
  'পালং ইউনিয়ন',
  'রুদ্রকর ইউনিয়ন',
  'শাউলপাড়া ইউনিয়ন',
  'তুলাসার ইউনিয়ন',
]

// Common trees of Shariatpur / Bangladesh
export const TREE_SUGGESTIONS = [
  { name: 'সেগুন', scientific: 'Tectona grandis' },
  { name: 'নিম', scientific: 'Azadirachta indica' },
  { name: 'আম', scientific: 'Mangifera indica' },
  { name: 'কাঁঠাল', scientific: 'Artocarpus heterophyllus' },
  { name: 'বাঁশ', scientific: 'Bambusoideae' },
  { name: 'অর্জুন', scientific: 'Terminalia arjuna' },
  { name: 'রেইনট্রি', scientific: 'Samanea saman' },
  { name: 'কৃষ্ণচূড়া', scientific: 'Delonix regia' },
  { name: 'নারকেল', scientific: 'Cocos nucifera' },
  { name: 'হিজল', scientific: 'Barringtonia acutangula' },
  { name: 'করই', scientific: 'Albizia procera' },
  { name: 'শিমুল', scientific: 'Bombax ceiba' },
  { name: 'বহেরা', scientific: 'Terminalia bellirica' },
  { name: 'হরীতকী', scientific: 'Terminalia chebula' },
  { name: 'আমলকী', scientific: 'Phyllanthus emblica' },
  { name: 'কদম', scientific: 'Neolamarckia cadamba' },
  { name: 'শিরীষ', scientific: 'Albizia lebbeck' },
  { name: 'ইউক্যালিপটাস', scientific: 'Eucalyptus globulus' },
  { name: 'মেহগনি', scientific: 'Swietenia mahagoni' },
  { name: 'জাম', scientific: 'Syzygium cumini' },
  { name: 'লিচু', scientific: 'Litchi chinensis' },
  { name: 'পেয়ারা', scientific: 'Psidium guajava' },
  { name: 'জামরুল', scientific: 'Syzygium samarangense' },
  { name: 'তাল', scientific: 'Borassus flabellifer' },
  { name: 'খেজুর', scientific: 'Phoenix sylvestris' },
]

// Shariatpur Sadar map bounds
export const MAP_CONFIG = {
  center: [23.2170, 90.3500] as [number, number],
  zoom: 12,
  minZoom: 10,
  maxZoom: 19,
  bounds: {
    south: 23.05,
    north: 23.30,
    west:  90.10,
    east:  90.35,
  },
}

export const TARGET_TREES = 30_000
