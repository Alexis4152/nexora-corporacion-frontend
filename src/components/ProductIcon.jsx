import { BedDouble, Box, CalendarClock, CarTaxiFront, Dumbbell, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react'

const ICONS = { store: Store, 'bed-double': BedDouble, 'calendar-clock': CalendarClock, utensils: UtensilsCrossed, 'car-taxi-front': CarTaxiFront, dumbbell: Dumbbell, 'shopping-bag': ShoppingBag }
export const ICON_OPTIONS = Object.keys(ICONS).concat('box')

export default function ProductIcon({ icon, className = 'h-4 w-4' }) {
  const Icon = ICONS[icon] || Box
  return <Icon className={className} />
}

export function ProductTile({ product, size = 'h-10 w-10', iconClass = 'h-5 w-5' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-xl text-white shadow-sm ${size}`} style={{ background: `linear-gradient(135deg, ${product?.color || '#6366f1'}, ${product?.color || '#6366f1'}cc)` }}>
      <ProductIcon icon={product?.icon} className={iconClass} />
    </span>
  )
}

