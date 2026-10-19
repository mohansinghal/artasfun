import React from 'react'
import {Container, Paper, Typography, Button} from '@mui/material'
import {useAuth} from '../auth/AuthContext'

const Dashboard = () => {
  const { user, logout } = useAuth()
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">Dashboard</Typography>
        <Typography sx={{ mt: 1 }}>Welcome , {user?.name}</Typography>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={logout}>
          Logout
        </Button>
      </Paper>
    </Container>
  )
}

export default Dashboard
