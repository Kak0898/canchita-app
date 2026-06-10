import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      toast.error('Credenciales incorrectas')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-turf flex">
      {/* Left panel — visual */}
      <div className="hidden lg:flex flex-1 flex-col justify-end bg-grass relative overflow-hidden p-12">
        {/* Field lines decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-white" />
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white" />
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-white" />
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
        </div>

        <div className="relative z-10">
          <p className="font-display text-5xl font-bold text-pitch-400 leading-tight mb-4">
            TU EQUIPO.<br />TUS REGLAS.
          </p>
          <p className="text-white/40 text-sm max-w-xs">
            Agenda partidos, confirma jugadores y lleva las estadísticas de tu grupo.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-[420px] flex flex-col justify-center px-8 py-12 shrink-0">
        <div className="max-w-sm mx-auto w-full">
          <div className="mb-10">
            <span className="font-display text-2xl font-bold text-pitch-400 tracking-wider">⚽ CANCHITA</span>
            <h1 className="font-display text-3xl font-bold text-chalk mt-6 mb-1">Bienvenido</h1>
            <p className="text-white/40 text-sm">Ingresa a tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-white/30 text-sm mt-6">
            ¿Primera vez?{' '}
            <Link to="/register" className="text-pitch-400 hover:text-pitch-300 transition-colors">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
