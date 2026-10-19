'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown } from 'lucide-react'

interface CityRank {
  rank: number
  name: string
  score: number
  tier: 'high' | 'medium' | 'low'
}

const TOP_CITIES: CityRank[] = [
  { rank: 1, name: 'Bangalore', score: 82, tier: 'high' },
  { rank: 2, name: 'Delhi NCR', score: 76, tier: 'high' },
  { rank: 3, name: 'Mumbai', score: 74, tier: 'medium' },
  { rank: 4, name: 'Hyderabad', score: 71, tier: 'medium' },
  { rank: 5, name: 'Pune', score: 68, tier: 'medium' },
]

export function MarketOpportunityMap() {
  return (
    <Card className="border-[#252729] bg-[#101314] shadow-xl flex flex-col justify-between h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[#F5F5F2]">
            Market Opportunity Map
          </CardTitle>
          <div className="flex items-center gap-1 rounded-lg border border-[#252729] bg-[#151719] px-2 py-1 text-[11px] text-[#B4B5B2] cursor-pointer hover:border-[#3A3D40]">
            <span>Market Fit</span>
            <ChevronDown className="h-3 w-3 text-[#858783]" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Stylized Visual Map of India */}
        <div className="relative h-44 w-full rounded-xl bg-[#0B0D0E] border border-[#252729]/60 p-2 flex items-center justify-center overflow-hidden">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 bg-[radial-gradient(#252729_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />

          {/* Stylized SVG Map of India */}
          <svg
            viewBox="0 0 320 340"
            className="h-full w-auto max-w-full drop-shadow-[0_0_15px_rgba(245,185,76,0.08)] select-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Geometric stylized outline of India */}
            <path
              d="M130 20 L155 35 L175 40 L195 55 L210 75 L225 80 L250 85 L260 100 L245 115 L230 115 L215 130 L220 150 L200 170 L195 195 L180 230 L165 270 L155 310 L145 285 L130 250 L115 220 L105 190 L95 170 L85 155 L75 140 L90 125 L105 110 L115 85 L120 50 Z"
              fill="#151719"
              stroke="#252729"
              strokeWidth="1.5"
            />

            {/* Connecting network corridors */}
            <path
              d="M145 105 L115 185 L135 235 L165 200 L145 105"
              stroke="#9A6B22"
              strokeWidth="0.8"
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <path
              d="M115 185 L125 210 L135 235"
              stroke="#F5B94C"
              strokeWidth="1"
              opacity="0.8"
            />

            {/* Glowing Metro Hub Nodes */}
            {/* Delhi NCR */}
            <g transform="translate(145, 105)">
              <circle r="12" fill="#F5B94C" fillOpacity="0.15" />
              <circle r="5" fill="#F5B94C" />
              <circle r="2" fill="#080A0B" />
              <text x="8" y="3" fill="#B4B5B2" fontSize="9" fontWeight="600">Delhi</text>
            </g>

            {/* Mumbai */}
            <g transform="translate(115, 185)">
              <circle r="10" fill="#F5B94C" fillOpacity="0.15" />
              <circle r="4.5" fill="#F5B94C" />
              <circle r="1.5" fill="#080A0B" />
              <text x="-40" y="3" fill="#B4B5B2" fontSize="9" fontWeight="600">Mumbai</text>
            </g>

            {/* Pune */}
            <g transform="translate(125, 205)">
              <circle r="7" fill="#F5B94C" fillOpacity="0.15" />
              <circle r="3.5" fill="#FFD27A" />
            </g>

            {/* Hyderabad */}
            <g transform="translate(165, 200)">
              <circle r="9" fill="#F5B94C" fillOpacity="0.15" />
              <circle r="4" fill="#F5B94C" />
              <circle r="1.5" fill="#080A0B" />
              <text x="8" y="3" fill="#B4B5B2" fontSize="9" fontWeight="600">Hyd</text>
            </g>

            {/* Bangalore */}
            <g transform="translate(138, 245)">
              <circle r="14" fill="#F5B94C" fillOpacity="0.25" className="animate-pulse" />
              <circle r="6" fill="#FFD27A" />
              <circle r="2.5" fill="#080A0B" />
              <text x="10" y="3" fill="#FFD27A" fontSize="10" fontWeight="700">Bangalore</text>
            </g>

            {/* Ahmedabad */}
            <g transform="translate(95, 155)">
              <circle r="3" fill="#858783" />
            </g>

            {/* Kolkata */}
            <g transform="translate(225, 150)">
              <circle r="3" fill="#858783" />
            </g>

            {/* Chennai */}
            <g transform="translate(160, 260)">
              <circle r="3.5" fill="#FFD27A" />
            </g>
          </svg>

          {/* Opportunity Legend Overlay */}
          <div className="absolute top-2 right-2 rounded-lg bg-[#101314]/90 border border-[#252729] px-2.5 py-1.5 text-[9px] space-y-1 backdrop-blur">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F5B94C]" />
              <span className="text-[#F5F5F2]">High Opportunity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#FFD27A]/80" />
              <span className="text-[#B4B5B2]">Medium Opportunity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#858783]" />
              <span className="text-[#858783]">Low Opportunity</span>
            </div>
          </div>
        </div>

        {/* Top Cities Ranked List */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-[#F5F5F2]">Top Cities</span>
            <Link
              href="/city-intelligence"
              className="text-[11px] font-medium text-[#F5B94C] hover:text-[#FFD27A] flex items-center gap-0.5"
            >
              See all →
            </Link>
          </div>

          <div className="space-y-1.5">
            {TOP_CITIES.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-lg border border-[#252729]/60 bg-[#151719]/50 px-2.5 py-1.5 text-xs hover:border-[#3A3D40] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#252729] text-[10px] font-bold text-[#F5B94C]">
                    {c.rank}
                  </span>
                  <span className="font-medium text-[#F5F5F2]">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 bg-[#252729] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F5B94C] to-[#FFD27A] rounded-full"
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-[#F5F5F2] w-5 text-right">
                    {c.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
