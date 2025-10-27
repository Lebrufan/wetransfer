import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from "@/components/ui/toaster"
import NovaReserva from "@/pages/NovaReserva"
import MinhasViagens from "@/pages/MinhasViagens"
import RetomarPagamento from "@/pages/RetomarPagamento"
import AdminDashboard from "@/pages/AdminDashboard"
import GerenciarCotacoes from "@/pages/GerenciarCotacoes"
import GerenciarVeiculos from "@/pages/GerenciarVeiculos"
import GestaoRotas from "@/pages/GestaoRotas"
import Configuracoes from "@/pages/Configuracoes"
import AlterarSenha from "@/pages/AlterarSenha"
import Layout from "@/pages/Layout"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/novareserva" replace />} />
        <Route element={<Layout />}>
          <Route path="/novareserva" element={<NovaReserva />} />
          <Route path="/minhasviagens" element={<MinhasViagens />} />
          <Route path="/retomarpagamento" element={<RetomarPagamento />} />
          <Route path="/admindashboard" element={<AdminDashboard />} />
          <Route path="/gerenciarcotacoes" element={<GerenciarCotacoes />} />
          <Route path="/gerenciarveiculos" element={<GerenciarVeiculos />} />
          <Route path="/gestaorotas" element={<GestaoRotas />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/alterarsenha" element={<AlterarSenha />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}

export default App 