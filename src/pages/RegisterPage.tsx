import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      toast.error(error.message ?? 'Error al registrarse')
    } else {
      toast.success('¡Cuenta creada! Revisa tu email para confirmar.')
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-turf flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="font-display text-2xl font-bold text-pitch-400 tracking-wider">⚽ CANCHITA</span>
          <h1 className="font-display text-3xl font-bold text-chalk mt-6 mb-1">Únete</h1>
          <p className="text-white/40 text-sm">Crea tu cuenta y empieza a jugar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre completo</label>
            <input
              type="text"
              className="input"
              placeholder="Alexis Sánchez"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>
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
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-white/30 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-pitch-400 hover:text-pitch-300 transition-colors">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}
