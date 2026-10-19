'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChevronDown } from 'lucide-react'

export function ValidationProgressGauge() {
  const percentage = 68
  const strokeWidth = 10
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  // Monthly activity bars data
  const activityData = [
    { label: '1 Oct', height: 40 },
    { label: '', height: 65 },
    { label: '8 Oct', height: 30 },
    { label: '', height: 50 },
    { label: '15 Oct', height: 75 },
    { label: '', height: 45 },
    { label: '22 Oct', height: 95 },
    { label: '', height: 85 },
    { label: '31 Oct', height: 60 },
  ]

  return (
    <Card className="border-[#252729] bg-[#101314] shadow-xl h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-[#F5F5F2]">
              Market Validation Progress
            </CardTitle>
            <CardDescription className="text-xs text-[#858783] mt-0.5">
              Track your experiments and insights.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[#252729] bg-[#151719] px-2 py-1 text-[11px] text-[#B4B5B2] cursor-pointer hover:border-[#3A3D40]">
            <span>This Month</span>
            <ChevronDown className="h-3 w-3 text-[#858783]" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Circular Gauge */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width="120" height="120" className="-rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#1E2124"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="url(#goldGradientProgress)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="goldGradientProgress" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFD27A" />
                  <stop offset="100%" stopColor="#F5B94C" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold font-mono text-[#F5F5F2]">68%</span>
              <span className="text-[9px] text-[#858783]">Overall Progress</span>
            </div>
          </div>

          {/* Breakdown Legend */}
          <div className="space-y-2 text-xs w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#F5B94C]" />
              <span className="text-[#F5F5F2] font-medium">5 Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#9A6B22]" />
              <span className="text-[#B4B5B2]">2 In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#3A3D40]" />
              <span className="text-[#858783]">1 Not Started</span>
            </div>
          </div>
        </div>

        {/* Activity Bar Chart */}
        <div className="pt-2 border-t border-[#252729]/60">
          <div className="flex items-end justify-between gap-1.5 h-16 px-1">
            {activityData.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full max-w-[12px] bg-gradient-to-t from-[#9A6B22]/80 to-[#F5B94C] rounded-t-sm transition-all duration-300 hover:brightness-125"
                  style={{ height: `${bar.height}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-mono text-[#858783] pt-1 px-1">
            <span>1 Oct</span>
            <span>8 Oct</span>
            <span>15 Oct</span>
            <span>22 Oct</span>
            <span>31 Oct</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
