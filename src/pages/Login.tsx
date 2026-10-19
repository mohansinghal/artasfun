import React, {useState} from 'react'
import {useNavigate, useLocation} from 'react-router-dom'
import {useAuth} from '../auth/AuthContext'
import {Container, TextField, Button, Paper, Typography, Box} from '@mui/material'

const Login = () => {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as any
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await auth.login(name, password)
    setLoading(false)
    navigate(from, { replace: true })
  }

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 3, mt: 6 }}>
        <Typography variant="h6">Login</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'grid', gap: 2 }}>
          <TextField label="Username" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="contained" disabled={loading}>
            Sign in
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

export default Login
