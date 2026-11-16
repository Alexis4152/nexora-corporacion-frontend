import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '../components/ui'

export default function NotFoundPage() {
  return <div className="card"><EmptyState icon={Compass} title="No encontramos esta página" description="Revisa la dirección o vuelve al inicio." action={<Link to="/" className="btn-primary">Ir al inicio</Link>} /></div>
}

