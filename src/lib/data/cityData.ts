import type { ConfidenceLevel } from '@/types/database'

export interface CityProfile {
  name: string
  state: string
  tagline: string
  description: string
  hubStrengths: string[]
  keyIndustries: string[]
  tier: string
}

export const SUPPORTED_CITIES: CityProfile[] = [
  {
    name: 'Bengaluru',
    state: 'Karnataka',
    tagline: 'Silicon Valley of India',
    description: 'Premier tech and innovation capital. Highest concentration of tech talent, venture capital, and early adopters for B2B SaaS and consumer tech.',
    hubStrengths: ['Tech Talent Density', 'Venture Capital Inflow', 'Early Adopter Tech Base', 'DeepTech & AI Ecosystem'],
    keyIndustries: ['B2B SaaS', 'Fintech', 'DeepTech', 'D2C & Consumer Tech', 'E-commerce'],
    tier: 'Tier 1'
  },
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    tagline: 'Financial & Commercial Powerhouse',
    description: 'Commercial and financial capital of India. Massive consumer market with highest purchasing power and concentrated retail/distribution networks.',
    hubStrengths: ['Highest Purchasing Power', 'Established Retail Networks', 'Fintech & Media Access', 'Port & Supply Chain Connectivity'],
    keyIndustries: ['Fintech', 'FMCG & D2C', 'Media & Entertainment', 'Logistics', 'Enterprise B2B'],
    tier: 'Tier 1'
  },
  {
    name: 'Delhi-NCR',
    state: 'National Capital Region',
    tagline: 'Largest Metro Market & Policy Hub',
    description: 'Encompasses New Delhi, Gurugram, and Noida. Massive consumer base, e-commerce nerve center, and direct access to regulatory bodies.',
    hubStrengths: ['Massive Consumer Volume', 'Logistics & Warehousing Spine', 'Corporate Headquarters Hub', 'D2C Brand Breeding Ground'],
    keyIndustries: ['E-commerce', 'D2C', 'Logistics Tech', 'EdTech', 'Mobility'],
    tier: 'Tier 1'
  },
  {
    name: 'Hyderabad',
    state: 'Telangana',
    tagline: 'Pharma, Enterprise IT & High-Growth Hub',
    description: 'Rapidly expanding IT and life sciences destination with proactive state government policies, state-of-the-art infrastructure, and lower operational overhead.',
    hubStrengths: ['Proactive Government & T-Hub', 'Modern Infrastructure', 'Pharma & HealthTech Clout', 'Competitive Real Estate Costs'],
    keyIndustries: ['Enterprise IT', 'HealthTech & BioTech', 'Gaming & VFX', 'Electric Vehicles'],
    tier: 'Tier 1'
  },
  {
    name: 'Pune',
    state: 'Maharashtra',
    tagline: 'Automotive, Manufacturing & Education Capital',
    description: 'Major industrial and education hub. Strong engineering talent pipeline from top colleges and thriving SaaS and automotive tech sectors.',
    hubStrengths: ['Engineering Graduate Output', 'Automotive & Manufacturing Clusters', 'Proximity to Mumbai', 'Emerging SaaS Ecosystem'],
    keyIndustries: ['AutoTech', 'Manufacturing Tech', 'SaaS', 'EdTech', 'AgriTech'],
    tier: 'Tier 1'
  },
  {
    name: 'Chennai',
    state: 'Tamil Nadu',
    tagline: 'SaaS Capital & Industrial Gateway',
    description: 'Global capital for capital-efficient SaaS (Freshworks, Zoho heritage), automotive manufacturing, and deep logistics via maritime ports.',
    hubStrengths: ['SaaS Operational Excellence', 'Deep Engineering Base', 'Automotive & Hardware Corridors', 'Maritime Trade Access'],
    keyIndustries: ['B2B SaaS', 'AutoTech', 'Healthcare & MedTech', 'Supply Chain & Shipping'],
    tier: 'Tier 1'
  }
]

export interface SourcedIndicator {
  city: string
  indicator: string
  category: 'Demographics' | 'Economy' | 'Digital & Tech' | 'Retail & Distribution' | 'Ecosystem'
  value: string
  unit: string
  source_name: string
  source_url: string
  collected_at: string
  confidence: ConfidenceLevel
  notes: string
}

export const BENCHMARK_INDICATORS: SourcedIndicator[] = [
  // ─── Bengaluru ───
  {
    city: 'Bengaluru',
    category: 'Demographics',
    indicator: 'Metro Population',
    value: '13.6',
    unit: 'Million',
    source_name: 'MoHUA Urban Agglomerations Estimate',
    source_url: 'https://mohua.gov.in',
    collected_at: '2024-01-15',
    confidence: 'high',
    notes: 'Urban agglomeration projected based on 2011 Census and BBMP expansion statistics.'
  },
  {
    city: 'Bengaluru',
    category: 'Economy',
    indicator: 'Per Capita Income',
    value: '3,32,000',
    unit: 'INR / Year',
    source_name: 'Karnataka Economic Survey 2023-24',
    source_url: 'https://des.karnataka.gov.in',
    collected_at: '2024-03-01',
    confidence: 'high',
    notes: 'One of the highest among Tier-1 metros, driven by tech and services sector compensation.'
  },
  {
    city: 'Bengaluru',
    category: 'Digital & Tech',
    indicator: 'UPI Digital Transaction Density',
    value: '842',
    unit: 'Transactions / Capita / Yr',
    source_name: 'NPCI Semi-Annual Digital Payments Report',
    source_url: 'https://npci.org.in',
    collected_at: '2024-06-30',
    confidence: 'high',
    notes: 'Highest merchant QR scan density and peer-to-peer transaction adoption in India.'
  },
  {
    city: 'Bengaluru',
    category: 'Ecosystem',
    indicator: 'Recognized Startups',
    value: '14,800+',
    unit: 'DPIIT Entities',
    source_name: 'Startup India Portal (DPIIT)',
    source_url: 'https://startupindia.gov.in',
    collected_at: '2024-05-10',
    confidence: 'high',
    notes: 'Hosts ~29% of India’s funded technology startups and unicorns.'
  },
  {
    city: 'Bengaluru',
    category: 'Retail & Distribution',
    indicator: 'Modern Trade / Supermarket Density',
    value: '18.4',
    unit: 'Outlets per 100k Population',
    source_name: 'Retailers Association of India (RAI)',
    source_url: 'https://rai.net.in',
    collected_at: '2023-11-20',
    confidence: 'medium',
    notes: 'High concentration in Indiranagar, Koramangala, Whitefield, and Bellandur corridors.'
  },
  {
    city: 'Bengaluru',
    category: 'Economy',
    indicator: 'Commercial Office Rent Benchmark',
    value: '85 - 110',
    unit: 'INR / sq.ft / Month',
    source_name: 'JLL India Office Market Dynamics',
    source_url: 'https://jll.co.in',
    collected_at: '2024-02-15',
    confidence: 'medium',
    notes: 'Outer Ring Road (ORR) and Whitefield command higher averages; CBD is stable.'
  },

  // ─── Mumbai ───
  {
    city: 'Mumbai',
    category: 'Demographics',
    indicator: 'Metro Population',
    value: '21.3',
    unit: 'Million',
    source_name: 'MMRDA Regional Plan & MoHUA',
    source_url: 'https://mmrda.maharashtra.gov.in',
    collected_at: '2024-01-10',
    confidence: 'high',
    notes: 'Mumbai Metropolitan Region (MMR) including Thane, Navi Mumbai, and Mira-Bhayandar.'
  },
  {
    city: 'Mumbai',
    category: 'Economy',
    indicator: 'Per Capita Income',
    value: '3,85,000',
    unit: 'INR / Year',
    source_name: 'Maharashtra Directorate of Economics & Statistics',
    source_url: 'https://mahades.maharashtra.gov.in',
    collected_at: '2024-03-15',
    confidence: 'high',
    notes: 'Highest average disposable household income in India; massive premium consumer segment.'
  },
  {
    city: 'Mumbai',
    category: 'Digital & Tech',
    indicator: 'UPI Digital Transaction Density',
    value: '795',
    unit: 'Transactions / Capita / Yr',
    source_name: 'NPCI Semi-Annual Digital Payments Report',
    source_url: 'https://npci.org.in',
    collected_at: '2024-06-30',
    confidence: 'high',
    notes: 'High retail merchant penetration and transit payment integration.'
  },
  {
    city: 'Mumbai',
    category: 'Ecosystem',
    indicator: 'Recognized Startups',
    value: '10,200+',
    unit: 'DPIIT Entities',
    source_name: 'Startup India Portal (DPIIT)',
    source_url: 'https://startupindia.gov.in',
    collected_at: '2024-05-10',
    confidence: 'high',
    notes: 'Strong skew towards Fintech, FMCG D2C brands, and Entertainment Tech.'
  },
  {
    city: 'Mumbai',
    category: 'Retail & Distribution',
    indicator: 'Modern Trade / Supermarket Density',
    value: '22.1',
    unit: 'Outlets per 100k Population',
    source_name: 'Retailers Association of India (RAI)',
    source_url: 'https://rai.net.in',
    collected_at: '2023-11-20',
    confidence: 'high',
    notes: 'Dense network of organised hypermarkets, high-street retail, and premium gourmet chains.'
  },
  {
    city: 'Mumbai',
    category: 'Economy',
    indicator: 'Commercial Office Rent Benchmark',
    value: '140 - 240',
    unit: 'INR / sq.ft / Month',
    source_name: 'JLL India Office Market Dynamics',
    source_url: 'https://jll.co.in',
    collected_at: '2024-02-15',
    confidence: 'high',
    notes: 'BKC commands topmost rates nationwide; Lower Parel and Andheri offer tier-2 alternatives.'
  },

  // ─── Delhi-NCR ───
  {
    city: 'Delhi-NCR',
    category: 'Demographics',
    indicator: 'Metro Population',
    value: '32.9',
    unit: 'Million',
    source_name: 'NCR Planning Board & UN World Urbanization Prospects',
    source_url: 'https://ncrpb.nic.in',
    collected_at: '2024-01-20',
    confidence: 'high',
    notes: 'Includes NCT Delhi, Gurugram, Noida, Greater Noida, Ghaziabad, and Faridabad.'
  },
  {
    city: 'Delhi-NCR',
    category: 'Economy',
    indicator: 'Per Capita Income',
    value: '4,44,000',
    unit: 'INR / Year',
    source_name: 'Delhi Statistical Handbook 2023',
    source_url: 'https://des.delhi.gov.in',
    collected_at: '2024-03-20',
    confidence: 'high',
    notes: 'Delhi state alone records over 3x the national average per capita income.'
  },
  {
    city: 'Delhi-NCR',
    category: 'Digital & Tech',
    indicator: 'UPI Digital Transaction Density',
    value: '760',
    unit: 'Transactions / Capita / Yr',
    source_name: 'NPCI Semi-Annual Digital Payments Report',
    source_url: 'https://npci.org.in',
    collected_at: '2024-06-30',
    confidence: 'high',
    notes: 'Massive overall transaction volume due to sheer population and commerce scale.'
  },
  {
    city: 'Delhi-NCR',
    category: 'Ecosystem',
    indicator: 'Recognized Startups',
    value: '13,500+',
    unit: 'DPIIT Entities',
    source_name: 'Startup India Portal (DPIIT)',
    source_url: 'https://startupindia.gov.in',
    collected_at: '2024-05-10',
    confidence: 'high',
    notes: 'Leading cluster for consumer tech, quick-commerce, logistics, and B2B aggregators.'
  },
  {
    city: 'Delhi-NCR',
    category: 'Retail & Distribution',
    indicator: 'Modern Trade / Supermarket Density',
    value: '19.8',
    unit: 'Outlets per 100k Population',
    source_name: 'Retailers Association of India (RAI)',
    source_url: 'https://rai.net.in',
    collected_at: '2023-11-20',
    confidence: 'medium',
    notes: 'Dominant mall infrastructure in Gurugram, South Delhi, and Noida sector corridors.'
  },
  {
    city: 'Delhi-NCR',
    category: 'Economy',
    indicator: 'Commercial Office Rent Benchmark',
    value: '80 - 135',
    unit: 'INR / sq.ft / Month',
    source_name: 'Knight Frank India Real Estate Review',
    source_url: 'https://knightfrank.co.in',
    collected_at: '2024-02-28',
    confidence: 'high',
    notes: 'Cyber City Gurugram commands peak rents; Noida Expressway offers competitive rates.'
  },

  // ─── Hyderabad ───
  {
    city: 'Hyderabad',
    category: 'Demographics',
    indicator: 'Metro Population',
    value: '10.8',
    unit: 'Million',
    source_name: 'HMDA Telangana Master Plan Review',
    source_url: 'https://hmda.gov.in',
    collected_at: '2024-01-18',
    confidence: 'high',
    notes: 'Hyderabad Metropolitan Development Authority area.'
  },
  {
    city: 'Hyderabad',
    category: 'Economy',
    indicator: 'Per Capita Income',
    value: '3,12,000',
    unit: 'INR / Year',
    source_name: 'Telangana Socio Economic Outlook 2024',
    source_url: 'https://telangana.gov.in',
    collected_at: '2024-02-10',
    confidence: 'high',
    notes: 'Fastest growing per capita income among southern state capitals over last 5 years.'
  },
  {
    city: 'Hyderabad',
    category: 'Digital & Tech',
    indicator: 'UPI Digital Transaction Density',
    value: '710',
    unit: 'Transactions / Capita / Yr',
    source_name: 'NPCI Semi-Annual Digital Payments Report',
    source_url: 'https://npci.org.in',
    collected_at: '2024-06-30',
    confidence: 'high',
    notes: 'Rapid retail QR adoption spurred by proactive smart city initiatives.'
  },
  {
    city: 'Hyderabad',
    category: 'Ecosystem',
    indicator: 'Recognized Startups',
    value: '6,400+',
    unit: 'DPIIT Entities',
    source_name: 'Startup India Portal & T-Hub',
    source_url: 'https://t-hub.co',
    collected_at: '2024-05-10',
    confidence: 'high',
    notes: 'World-class state incubation via T-Hub, T-Works (hardware prototyping), and WE-Hub.'
  },
  {
    city: 'Hyderabad',
    category: 'Retail & Distribution',
    indicator: 'Modern Trade / Supermarket Density',
    value: '14.6',
    unit: 'Outlets per 100k Population',
    source_name: 'Retailers Association of India (RAI)',
    source_url: 'https://rai.net.in',
    collected_at: '2023-11-20',
    confidence: 'medium',
    notes: 'Concentrated in Hitec City, Gachibowli, Jubilee Hills, and Banjara Hills.'
  },
  {
    city: 'Hyderabad',
    category: 'Economy',
    indicator: 'Commercial Office Rent Benchmark',
    value: '65 - 85',
    unit: 'INR / sq.ft / Month',
    source_name: 'Colliers India Office Market Insights',
    source_url: 'https://colliers.com',
    collected_at: '2024-03-05',
    confidence: 'high',
    notes: 'Significantly more affordable than Mumbai and Bengaluru while maintaining grade-A quality.'
  },

  // ─── Pune ───
  {
    city: 'Pune',
    category: 'Demographics',
    indicator: 'Metro Population',
    value: '7.4',
    unit: 'Million',
    source_name: 'PMRDA Regional Master Plan',
    source_url: 'https://pmrda.gov.in',
    collected_at: '2024-01-25',
    confidence: 'high',
    notes: 'Pune Metropolitan Region including Pune Municipal Corp and Pimpri-Chinchwad.'
  },
  {
    city: 'Pune',
    category: 'Economy',
    indicator: 'Per Capita Income',
    value: '2,98,000',
    unit: 'INR / Year',
    source_name: 'Maharashtra DES District Statistics',
    source_url: 'https://mahades.maharashtra.gov.in',
    collected_at: '2024-03-15',
    confidence: 'high',
    notes: 'Strong secondary sector industrial compensation and young IT demographic.'
  },
  {
    city: 'Pune',
    category: 'Digital & Tech',
    indicator: 'UPI Digital Transaction Density',
    value: '690',
    unit: 'Transactions / Capita / Yr',
    source_name: 'NPCI Semi-Annual Digital Payments Report',
    source_url: 'https://npci.org.in',
    collected_at: '2024-06-30',
    confidence: 'high',
    notes: 'Very high student and young tech worker digital payment adoption rate.'
  },
  {
    city: 'Pune',
    category: 'Ecosystem',
    indicator: 'Recognized Startups',
    value: '4,800+',
    unit: 'DPIIT Entities',
    source_name: 'Startup India Portal (DPIIT)',
    source_url: 'https://startupindia.gov.in',
    collected_at: '2024-05-10',
    confidence: 'high',
    notes: 'Strong clusters in AutoTech, Industrial IoT, SaaS, and AgriTech.'
  },
  {
    city: 'Pune',
    category: 'Retail & Distribution',
    indicator: 'Modern Trade / Supermarket Density',
    value: '13.2',
    unit: 'Outlets per 100k Population',
    source_name: 'Retailers Association of India (RAI)',
    source_url: 'https://rai.net.in',
    collected_at: '2023-11-20',
    confidence: 'medium',
    notes: 'Prime retail corridors in Viman Nagar, Koregaon Park, Aundh, and Baner.'
  },
  {
    city: 'Pune',
    category: 'Economy',
    indicator: 'Commercial Office Rent Benchmark',
    value: '60 - 80',
    unit: 'INR / sq.ft / Month',
    source_name: 'Knight Frank India Real Estate Review',
    source_url: 'https://knightfrank.co.in',
    collected_at: '2024-02-28',
    confidence: 'high',
    notes: 'Hinjewadi and Kharadi IT parks offer cost-effective scaling for growing engineering teams.'
  },

  // ─── Chennai ───
  {
    city: 'Chennai',
    category: 'Demographics',
    indicator: 'Metro Population',
    value: '11.5',
    unit: 'Million',
    source_name: 'CMDA Master Plan 2026 Projections',
    source_url: 'https://cmdachennai.gov.in',
    collected_at: '2024-01-22',
    confidence: 'high',
    notes: 'Chennai Metropolitan Area covering Greater Chennai Corporation and contiguous zones.'
  },
  {
    city: 'Chennai',
    category: 'Economy',
    indicator: 'Per Capita Income',
    value: '2,90,000',
    unit: 'INR / Year',
    source_name: 'Tamil Nadu Economic Appraisal 2023-24',
    source_url: 'https://tn.gov.in',
    collected_at: '2024-02-28',
    confidence: 'high',
    notes: 'Balanced contribution from manufacturing, automotive, SaaS, and port-driven export trade.'
  },
  {
    city: 'Chennai',
    category: 'Digital & Tech',
    indicator: 'UPI Digital Transaction Density',
    value: '640',
    unit: 'Transactions / Capita / Yr',
    source_name: 'NPCI Semi-Annual Digital Payments Report',
    source_url: 'https://npci.org.in',
    collected_at: '2024-06-30',
    confidence: 'high',
    notes: 'Steady digital payment adoption; strong penetration in retail and dining outlets.'
  },
  {
    city: 'Chennai',
    category: 'Ecosystem',
    indicator: 'Recognized Startups',
    value: '4,200+',
    unit: 'DPIIT Entities',
    source_name: 'Startup India Portal & IIT Madras Research Park',
    source_url: 'https://respark.iitm.ac.in',
    collected_at: '2024-05-10',
    confidence: 'high',
    notes: 'Leading hub for B2B SaaS (heritage from Freshworks/Zoho) and deep tech from IIT-M.'
  },
  {
    city: 'Chennai',
    category: 'Retail & Distribution',
    indicator: 'Modern Trade / Supermarket Density',
    value: '12.8',
    unit: 'Outlets per 100k Population',
    source_name: 'Retailers Association of India (RAI)',
    source_url: 'https://rai.net.in',
    collected_at: '2023-11-20',
    confidence: 'medium',
    notes: 'Strong traditional retail dominance alongside expanding modern chains in T.Nagar & OMR.'
  },
  {
    city: 'Chennai',
    category: 'Economy',
    indicator: 'Commercial Office Rent Benchmark',
    value: '55 - 75',
    unit: 'INR / sq.ft / Month',
    source_name: 'CBRE India Office Market Figures',
    source_url: 'https://cbre.co.in',
    collected_at: '2024-03-01',
    confidence: 'high',
    notes: 'Old Mahabalipuram Road (OMR) and Guindy offer cost-effective grade-A office space.'
  }
]
