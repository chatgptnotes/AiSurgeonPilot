import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  href?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-gray-400',
  href,
  trend,
}: StatsCardProps) {
  const cardContent = (
    <Card className={cn("hover:shadow-md transition-shadow", href && "cursor-pointer")}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-green-600 hover:underline">
                {subtitle}
              </p>
            )}
            {trend && (
              <p
                className={cn(
                  'text-sm',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg bg-gray-50', iconColor)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}
