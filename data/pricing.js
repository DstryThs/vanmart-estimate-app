const PRODUCTS = [
  // --- EXTERIOR ---
  {
    id: 'VS-007',
    name: 'Defender Front Bumper',
    category: 'Exterior',
    productPrice: 350.00,
    laborPrice: 175.00,
    installedPrice: 525.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Aftermarket lights sold separately'
  },
  {
    id: 'VS-008B',
    name: 'Baja Front Bumper (2WD / 4WD / AWD)',
    category: 'Exterior',
    productPrice: 1700.00,
    laborPrice: 525.00,
    installedPrice: 2225.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Must confirm 2WD or 4WD'
  },
  {
    id: 'KT-BAJA-FRONT-BUMPER-AMBER',
    name: 'Baja Front Bumper Amber Light Package',
    category: 'Exterior',
    productPrice: 1100.00,
    laborPrice: 1400.00,
    installedPrice: 2500.00,
    fitment: ['MB 144', 'MB 170'],
    notes: '(2) Amber LP9 Pro lights wired to factory switch'
  },
  {
    id: 'KT-DEFENDER-BUMPER-AMBER-LIGHT-PACKAGE',
    name: 'Defender Front Bumper Amber Light Package',
    category: 'Exterior',
    productPrice: 1900.00,
    laborPrice: 875.00,
    installedPrice: 2775.00,
    fitment: ['MB 144', 'MB 170'],
    notes: '4 amber squadron lights with harness and wiring'
  },
  {
    id: 'VS-005-144',
    name: 'VS Side Steps (144)',
    category: 'Exterior',
    productPrice: 1499.99,
    laborPrice: 787.50,
    installedPrice: 2287.49,
    fitment: ['MB 144'],
    notes: 'Driver and passenger side'
  },
  {
    id: 'VS-005-170',
    name: 'VS Side Steps (144/170)',
    category: 'Exterior',
    productPrice: 1499.99,
    laborPrice: 875.00,
    installedPrice: 2374.99,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Driver and passenger side with curved support'
  },
  {
    id: 'VS-060',
    name: 'Hood Strut Kit',
    category: 'Exterior',
    productPrice: 165.00,
    laborPrice: 175.00,
    installedPrice: 340.00,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'VS-051B',
    name: 'Skid Plate Set (2023+)',
    category: 'Exterior',
    productPrice: 780.00,
    laborPrice: 525.00,
    installedPrice: 1305.00,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'VS-072',
    name: 'Defender Mini Rear Step',
    category: 'Exterior',
    productPrice: 375.00,
    laborPrice: 262.50,
    installedPrice: 637.50,
    fitment: ['MB 144', 'MB 170'],
    notes: '(1) driver or passenger side'
  },
  {
    id: 'KT-VS-TIRE-CARRIER-HI-ROOF',
    name: 'Tire Carrier with Mount and High Roof Ladder',
    category: 'Exterior',
    productPrice: 1639.97,
    laborPrice: 700.00,
    installedPrice: 2339.97,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'VS-TIRE-CARRIER-DRIVER',
    name: 'Driver Side Tire Carrier',
    category: 'Exterior',
    productPrice: 1639.97,
    laborPrice: 612.50,
    installedPrice: 2252.47,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'TP-A9073109700',
    name: 'Rear Tow Hitch',
    category: 'Exterior',
    productPrice: 400.00,
    laborPrice: 350.00,
    installedPrice: 750.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Confirm if customer has factory plastic rear step'
  },
  {
    id: 'VS-015',
    name: 'Side Ladder',
    category: 'Exterior',
    productPrice: 845.99,
    laborPrice: 350.00,
    installedPrice: 1195.99,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Roof rails required'
  },
  {
    id: 'TP-ANTI-CLIMB-PLATE',
    name: 'Anti-Climb Plate (Catalytic Guard)',
    category: 'Exterior',
    productPrice: 669.00,
    laborPrice: 175.00,
    installedPrice: 844.00,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'TP-06759A01R',
    name: 'Manual Fiamma F45S Awning 144 (10\'1")',
    category: 'Exterior',
    productPrice: 1750.00,
    laborPrice: 875.00,
    installedPrice: 2625.00,
    fitment: ['MB 144'],
    notes: 'Roof rack/rails required. Add $550 for extra brackets on roof rails only'
  },
  {
    id: 'VS-050',
    name: 'Air Compressor Kit',
    category: 'Exterior',
    productPrice: 1299.99,
    laborPrice: 1400.00,
    installedPrice: 2699.99,
    fitment: ['MB 144', 'MB 170'],
    notes: '12v on-board/on-demand with under-hood and rear outlets'
  },
  {
    id: '98655-728',
    name: 'Fiamma Common Parts Kit (98655-728)',
    category: 'Exterior',
    productPrice: 59.80,
    laborPrice: 175.00,
    installedPrice: 234.80,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },

  // --- SUSPENSION ---
  {
    id: 'TP-3037',
    name: 'Opti-Rate Replacement Leaf Spring (Sprinter 2500 4x4)',
    category: 'Suspension',
    productPrice: 1729.85,
    laborPrice: 1575.00,
    installedPrice: 3304.85,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'TP-7072-LM',
    name: 'Stage 4.3 Lift System - Van Compass (AWD/4x4, 2015+, 2500 only)',
    category: 'Suspension',
    productPrice: 3644.75,
    laborPrice: 2450.00,
    installedPrice: 6094.75,
    fitment: ['MB 144', 'MB 170'],
    notes: 'AWD/4x4 only'
  },
  {
    id: 'TP-ADSB4SBAO',
    name: 'Agile Double Shear Bracket by Agile Offroad',
    category: 'Suspension',
    productPrice: 799.98,
    laborPrice: 700.00,
    installedPrice: 1499.98,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Upper & lower bracket. Customer must choose color: Orange or Black'
  },

  // --- WHEELS & TIRES ---
  {
    id: 'TP-BFG-KO3-TIRE',
    name: 'BFGoodrich All-Terrain T/A KO3 Tire (each)',
    category: 'Wheels & Tires',
    productPrice: 475.00,
    laborPrice: 0,
    installedPrice: 475.00,
    fitment: ['MB 144', 'MB 170'],
    notes: '275 tire - AWD only. Sizes >245 require Mondo Guards'
  },
  {
    id: 'TP-NOMAD-WHEELS',
    name: 'Nomad Wheels (each)',
    category: 'Wheels & Tires',
    productPrice: 400.00,
    laborPrice: 0,
    installedPrice: 400.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Black Convoy Nomad Wheels, sold individually'
  },
  {
    id: 'KT-WHEEL-TIRE-PACKAGE',
    name: 'Complete Wheel & Tire Package (Set of 5)',
    category: 'Wheels & Tires',
    productPrice: 3930.00,
    laborPrice: 350.00,
    installedPrice: 4280.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Installed and balanced. Mondo Guards and Lugnut Kit required'
  },
  {
    id: 'TP-TWNS-025',
    name: 'Mondo Guards',
    category: 'Wheels & Tires',
    productPrice: 205.00,
    laborPrice: 612.50,
    installedPrice: 817.50,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },

  // --- ROOF RACKS & LIGHTING ---
  {
    id: 'VS-001',
    name: 'Dakar Roof Rack (144)',
    category: 'Roof Racks & Lighting',
    productPrice: 3975.00,
    laborPrice: 875.00,
    installedPrice: 4850.00,
    fitment: ['MB 144'],
    notes: 'Roof rails required. Confirm light cutout location'
  },
  {
    id: 'VS-002',
    name: 'Dakar Roof Rack (170)',
    category: 'Roof Racks & Lighting',
    productPrice: 4275.00,
    laborPrice: 700.00,
    installedPrice: 4975.00,
    fitment: ['MB 170'],
    notes: 'Confirm light cutout location'
  },
  {
    id: 'VS-003',
    name: 'Aero Roof Rack (144)',
    category: 'Roof Racks & Lighting',
    productPrice: 3975.00,
    laborPrice: 875.00,
    installedPrice: 4850.00,
    fitment: ['MB 144'],
    notes: 'Confirm light cutout location'
  },
  {
    id: 'VS-078',
    name: 'Scout Rack',
    category: 'Roof Racks & Lighting',
    productPrice: 2750.00,
    laborPrice: 1050.00,
    installedPrice: 3800.00,
    fitment: ['MB 144'],
    notes: ''
  },
  {
    id: 'KT-DAKAR-RACK-LIGHTING',
    name: 'Dakar Roof Rack Lighting System',
    category: 'Roof Racks & Lighting',
    productPrice: 1100.00,
    laborPrice: 1400.00,
    installedPrice: 2500.00,
    fitment: ['MB 144', 'MB 170'],
    notes: '(6) round clear KC Slimlites - no grills included'
  },
  {
    id: 'KT-DAKAR-RACK-LIGHTING-LP6-AMBER-CLEAR',
    name: 'Dakar Roof Rack Amber/Clear LP6 Lighting System',
    category: 'Roof Racks & Lighting',
    productPrice: 3100.00,
    laborPrice: 2100.00,
    installedPrice: 5200.00,
    fitment: ['MB 144', 'MB 170'],
    notes: '(2) LP6 Amber + (4) LP6 Clear Pro Driving'
  },
  {
    id: 'TP-SQUADRON-PRO-LED',
    name: 'Squadron Pro LED Light Pod',
    category: 'Roof Racks & Lighting',
    productPrice: 225.95,
    laborPrice: 0,
    installedPrice: 225.95,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Wiring harness sold separately (640117)'
  },
  {
    id: 'CB30-AMBER',
    name: 'Amber CB30 Sidewinder LED Pod Pair',
    category: 'Roof Racks & Lighting',
    productPrice: 300.00,
    laborPrice: 0,
    installedPrice: 300.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'GG Lighting - set of 2'
  },
  {
    id: 'CB30-CLEAR',
    name: 'Clear CB30 Sidewinder LED Pod Pair',
    category: 'Roof Racks & Lighting',
    productPrice: 300.00,
    laborPrice: 0,
    installedPrice: 300.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'GG Lighting - set of 2'
  },
  {
    id: 'KT-SPRINTER-ROOF-RAIL-SYSTEM',
    name: 'Roof Rail System',
    category: 'Roof Racks & Lighting',
    productPrice: 399.99,
    laborPrice: 0,
    installedPrice: 399.99,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'KT-VS-SURF-RACK-BUNDLE',
    name: 'Exterior Surf Rack Bundle (Ladder + Pole + Hooks)',
    category: 'Roof Racks & Lighting',
    productPrice: 1834.99,
    laborPrice: 787.50,
    installedPrice: 2622.49,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Roof rails required'
  },
  {
    id: 'VS-075',
    name: 'Cable Pass-Through Kit',
    category: 'Roof Racks & Lighting',
    productPrice: 34.99,
    laborPrice: 87.50,
    installedPrice: 122.49,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Roof rails required. 2019+ only'
  },

  // --- WINDOWS ---
  {
    id: 'TP-64138-01',
    name: 'Driver Solid Full Window',
    category: 'Windows',
    productPrice: 300.00,
    laborPrice: 700.00,
    installedPrice: 1000.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Factory OEM style solid glass'
  },
  {
    id: 'TP-75539-01',
    name: 'Passenger Sliding Door Solid Window',
    category: 'Windows',
    productPrice: 300.00,
    laborPrice: 700.00,
    installedPrice: 1000.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Factory OEM style solid glass'
  },
  {
    id: 'VS-1033L',
    name: 'VS Slider Window 10" x 33" - Driver Side',
    category: 'Windows',
    productPrice: 280.00,
    laborPrice: 525.00,
    installedPrice: 805.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Cut and installed on metal body - confirm side'
  },
  {
    id: 'VS-1033R',
    name: 'VS Slider Window 10" x 33" - Passenger Side',
    category: 'Windows',
    productPrice: 280.00,
    laborPrice: 525.00,
    installedPrice: 805.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Cut and installed on metal body - confirm side'
  },
  {
    id: 'TP-FW621L',
    name: 'CRL T-Vent Window - Driver Side Forward Panel',
    category: 'Windows',
    productPrice: 900.00,
    laborPrice: 525.00,
    installedPrice: 1425.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Behind driver seat'
  },
  {
    id: 'TP-FW625R',
    name: 'CRL T-Vent Window - Passenger Sliding Door',
    category: 'Windows',
    productPrice: 900.00,
    laborPrice: 525.00,
    installedPrice: 1425.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Behind passenger seat'
  },
  {
    id: 'TP-91843-01',
    name: 'Rear Door Windows (Driver & Passenger Set)',
    category: 'Windows',
    productPrice: 399.99,
    laborPrice: 1050.00,
    installedPrice: 1449.99,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Solid rear door window set'
  },
  {
    id: 'TP-47715-01',
    name: 'Van Tek Slider Window - Front Driver Side (144)',
    category: 'Windows',
    productPrice: 650.00,
    laborPrice: 525.00,
    installedPrice: 1175.00,
    fitment: ['MB 144'],
    notes: '2024 upgraded VTG with fly screen'
  },
  {
    id: 'TP-45247-01',
    name: 'Van Tek Slider Window - Passenger Sliding Door (144)',
    category: 'Windows',
    productPrice: 650.00,
    laborPrice: 525.00,
    installedPrice: 1175.00,
    fitment: ['MB 144'],
    notes: '2024 upgraded VTG with fly screen'
  },
  {
    id: 'TP-42613-01',
    name: 'Van Tek Slider Window - Front Driver Side (170)',
    category: 'Windows',
    productPrice: 650.00,
    laborPrice: 525.00,
    installedPrice: 1175.00,
    fitment: ['MB 170'],
    notes: '2024 upgraded VTG with fly screen'
  },
  {
    id: 'TP-99914-01',
    name: 'Van Tek Slider Window - Passenger Sliding Door (170)',
    category: 'Windows',
    productPrice: 650.00,
    laborPrice: 525.00,
    installedPrice: 1175.00,
    fitment: ['MB 170'],
    notes: '2024 upgraded VTG with fly screen'
  },
  {
    id: 'SV-OLD-WINDOW-REMOVAL',
    name: 'Removal of Old Window',
    category: 'Windows',
    productPrice: 0,
    laborPrice: 350.00,
    installedPrice: 350.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Removal of factory window to replace with new product'
  },
  {
    id: 'KT-VS-BUNK-WINDOW',
    name: 'VS Bunk Window Set',
    category: 'Windows',
    productPrice: 560.00,
    laborPrice: 0,
    installedPrice: 560.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Installed in Capsule'
  },

  // --- CAPSULES ---
  {
    id: 'VS-030',
    name: 'Capsules 170 - Windowed',
    category: 'Capsules',
    productPrice: 1799.90,
    laborPrice: 1000.00,
    installedPrice: 2799.90,
    fitment: ['MB 170'],
    notes: 'Includes 10x33 slider windows'
  },
  {
    id: 'VS-029',
    name: 'Capsules 144 - Windowed',
    category: 'Capsules',
    productPrice: 1799.90,
    laborPrice: 1000.00,
    installedPrice: 2799.90,
    fitment: ['MB 144'],
    notes: 'Includes 10x33 slider windows'
  },
  {
    id: 'VS-029B',
    name: 'Capsules 144 - Windowless',
    category: 'Capsules',
    productPrice: 1800.00,
    laborPrice: 1000.00,
    installedPrice: 2800.00,
    fitment: ['MB 144'],
    notes: 'No window cutouts'
  },
  {
    id: 'PN-CAPSULE-PAINT-MATCH',
    name: 'Capsule Paint - Color Match',
    category: 'Capsules',
    productPrice: 1000.00,
    laborPrice: 0,
    installedPrice: 1000.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Customer must provide color and paint code'
  },
  {
    id: 'PN-CAPSULE-SATIN-BLACK',
    name: 'Capsule Paint - Satin Black',
    category: 'Capsules',
    productPrice: 900.00,
    laborPrice: 0,
    installedPrice: 900.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Automotive grade satin black'
  },
  {
    id: 'PN-CAPSULE-BULLET-LINER',
    name: 'Capsule Paint - Bullet Liner (Texture)',
    category: 'Capsules',
    productPrice: 1000.00,
    laborPrice: 0,
    installedPrice: 1000.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'UV rated texture spray'
  },

  // --- AUDIO ---
  {
    id: 'KT-WEEKENDER-AUDIO',
    name: 'Weekender Sound System',
    category: 'Audio',
    productPrice: 1950.00,
    laborPrice: 525.00,
    installedPrice: 2475.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Hertz back door speakers with amp, connects to factory head unit'
  },
  {
    id: 'KT-NOMAD-AUDIO',
    name: 'Nomad Sound System',
    category: 'Audio',
    productPrice: 3299.99,
    laborPrice: 2450.00,
    installedPrice: 5749.99,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Hertz front/rear speakers, 10" sub, amp, radio on module for house battery'
  },
  {
    id: 'TP-FRONT-CAB-SPEAKER-UPGRADE',
    name: 'Front Cab Speaker Upgrade',
    category: 'Audio',
    productPrice: 700.00,
    laborPrice: 700.00,
    installedPrice: 1400.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Replaces front cab door speakers only'
  },

  // --- ELECTRICAL & POWER ---
  {
    id: 'KT-EXTRA-BATTERY-AGM',
    name: '2nd Extra Battery - AGM System',
    category: 'Electrical & Power',
    productPrice: 1350.00,
    laborPrice: 0,
    installedPrice: 1350.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Expansion battery for existing AGM system'
  },
  {
    id: 'TP-AGM-BATTERY-REPLACEMENT',
    name: 'AGM Battery Replacement (215AH Full River)',
    category: 'Electrical & Power',
    productPrice: 800.00,
    laborPrice: 175.00,
    installedPrice: 975.00,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'TP-LTA72BK',
    name: 'L-Track (per foot)',
    category: 'Electrical & Power',
    productPrice: 55.00,
    laborPrice: 0,
    installedPrice: 55.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Airline cargo track - sold per foot installed'
  },

  // --- WATER SYSTEMS ---
  {
    id: 'VS-010',
    name: '40 Gallon Fresh Water Tank (144)',
    category: 'Water Systems',
    productPrice: 1375.00,
    laborPrice: 1050.00,
    installedPrice: 2425.00,
    fitment: ['MB 144'],
    notes: 'Must remove spare tire'
  },
  {
    id: 'VS-013',
    name: '25 Gallon Interior Fresh Water Tank',
    category: 'Water Systems',
    productPrice: 589.99,
    laborPrice: 350.00,
    installedPrice: 939.99,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Interior mounted for cold weather - passenger side only'
  },
  {
    id: 'VS-GREY-TANK-25',
    name: '25 Gallon Grey Water Tank (with Level, Pump & Switch)',
    category: 'Water Systems',
    productPrice: 2200.00,
    laborPrice: 0,
    installedPrice: 2200.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Upgrade price from stock setup'
  },

  // --- CLIMATE ---
  {
    id: 'TP-ST2000',
    name: 'Webasto ST2000 Diesel Heater',
    category: 'Climate',
    productPrice: 3425.00,
    laborPrice: 0,
    installedPrice: 3425.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Elevation up to 4,000 ft'
  },
  {
    id: 'DOMETIC-RTX2000',
    name: 'Dometic RTX 2000 (A/C)',
    category: 'Climate',
    productPrice: 2399.99,
    laborPrice: 0,
    installedPrice: 2399.99,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'TP-00-07500K',
    name: 'MaxxFan 7500K Vent Fan',
    category: 'Climate',
    productPrice: 549.99,
    laborPrice: 700.00,
    installedPrice: 1249.99,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Smoke lid with remote. Customer decides location. Add $100 if wired to battery'
  },

  // --- INTERIOR ---
  {
    id: 'KT-MB144-FLOOR',
    name: 'MB 144 Floor',
    category: 'Interior',
    productPrice: 3900.00,
    laborPrice: 0,
    installedPrice: 3900.00,
    fitment: ['MB 144'],
    notes: '1/2" Baltic birch with choice of vinyl cover'
  },
  {
    id: 'KT-DURATHERM-CEILING-170',
    name: 'DuraTherm Ceiling Liner + Top Sills Kit (170)',
    category: 'Interior',
    productPrice: 750.00,
    laborPrice: 875.00,
    installedPrice: 1625.00,
    fitment: ['MB 170'],
    notes: ''
  },
  {
    id: 'KT-VENTURE-FLEX-CABINET-48',
    name: 'Venture Flex Cabinet Bundle (48")',
    category: 'Interior',
    productPrice: 399.95,
    laborPrice: 525.00,
    installedPrice: 924.95,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'ISOTHERM-85L',
    name: 'Isotherm Drawer 85L Freezer/Fridge Combo',
    category: 'Interior',
    productPrice: 2159.00,
    laborPrice: 0,
    installedPrice: 2159.00,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'VNMRT-002',
    name: 'Sprinter Footrest Storage',
    category: 'Interior',
    productPrice: 249.99,
    laborPrice: 175.00,
    installedPrice: 424.99,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Reduces leg fatigue, built-in storage compartment'
  },
  {
    id: 'TP-STEALTHSHADE-CURTAIN',
    name: 'StealthShade Privacy Curtain',
    category: 'Interior',
    productPrice: 475.00,
    laborPrice: 175.00,
    installedPrice: 650.00,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'TP-VANNON-BPILLAR',
    name: 'Vannon Sprinter Lagun B-Pillar Table Mount',
    category: 'Interior',
    productPrice: 199.00,
    laborPrice: 175.00,
    installedPrice: 374.00,
    fitment: ['MB 144', 'MB 170'],
    notes: ''
  },
  {
    id: 'KT-GRAB-HANDLE-UPGRADE',
    name: 'Grab Handle Upgrade Kit',
    category: 'Interior',
    productPrice: 190.00,
    laborPrice: 0,
    installedPrice: 190.00,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Low profile design. Roof rails required'
  },
  {
    id: 'TP-NOMADIC-AIRPLUS-FAN',
    name: 'Nomadic AirPlus Fan',
    category: 'Interior',
    productPrice: 0,
    laborPrice: 0,
    installedPrice: 0,
    fitment: ['MB 144', 'MB 170'],
    notes: 'Price on request'
  }
];
