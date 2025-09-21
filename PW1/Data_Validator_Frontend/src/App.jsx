import { useState } from 'react'
import Hero from './components/Hero'
import './App.css'
import About from './components/About'
import Faq from './components/Faq'
import Footer from './components/Footer'
import Login from './components/login'
import Signup from './components/Signup'
import Verify from './components/Verify'
import Dashboard from './components/Dashboard'
import PrivateRoute from './components/PrivateRoute';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<Verify />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <div
              style={{
                height: '100svh',
                overflowY: 'scroll',
                scrollSnapType: 'y mandatory',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorY: 'contain',
                scrollBehavior: 'smooth'
              }}
            >
              <section style={{ height: '85svh', scrollSnapAlign: 'start' }}>
                <Hero />
              </section>
              <section style={{ height: '100svh', scrollSnapAlign: 'start' }}>
                <About />
              </section>
              <section style={{ height: '100svh', scrollSnapAlign: 'start' }}>
                <Faq />
              </section>
              <section style={{ height: '10svh', scrollSnapAlign: 'end' }}>
                <Footer />
              </section>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
