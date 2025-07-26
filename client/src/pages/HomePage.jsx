import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, HeartPulse, CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';
import Typewriter from 'typewriter-effect';
import Lottie from 'lottie-react';
import relaxAnimation from '../assets/relax.json'; // Make sure this file exists

const HomePage = () => {
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsPageLoaded(true), 300); // slight delay for smoother feel
    return () => clearTimeout(timeout);
  }, []);

  const particlesInit = async (main) => {
    await loadFull(main);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="relative min-h-screen bg-gradient-to-br from-blue-100 via-white to-purple-100 flex flex-col overflow-hidden"
    >
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: { color: { value: 'transparent' } },
          fpsLimit: 60,
          interactivity: {
            events: {
              onHover: { enable: true, mode: 'repulse' },
              resize: true,
            },
            modes: { repulse: { distance: 100, duration: 0.4 } },
          },
          particles: {
            color: { value: '#a855f7' },
            links: { color: '#a855f7', distance: 150, enable: true, opacity: 0.5, width: 1 },
            collisions: { enable: false },
            move: { enable: true, speed: 1, direction: 'none', random: false, straight: false },
            number: { density: { enable: true, area: 800 }, value: 50 },
            opacity: { value: 0.5 },
            shape: { type: 'circle' },
            size: { value: { min: 1, max: 4 } },
          },
          detectRetina: true,
        }}
        className="absolute inset-0 -z-10"
      />

      {/* Hero Section */}
      <motion.div 
        className="flex flex-col items-center justify-center text-center py-20 px-6"
        initial={{ opacity: 0, y: 50 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 1 }}
      >
        <motion.h1 
          className="text-4xl md:text-6xl font-extrabold text-gray-800 mb-4 h-24"
          whileHover={{ scale: 1.05 }}
        >
          <Typewriter
            options={{
              strings: [
                "Welcome to MoodMate 🧠💬",
                "Your Mental Wellness Companion ✨",
                "Let's build healthy habits! 💡"
              ],
              autoStart: true,
              loop: true,
              delay: 50
            }}
          />
        </motion.h1>

        <motion.p 
          className="text-lg md:text-xl text-gray-600 max-w-2xl mb-8"
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.5 }}
        >
          Your AI-powered mental wellness companion — detect stress, build habits, and talk it out.
        </motion.p>

        <Lottie animationData={relaxAnimation} className="w-52 h-52 mb-6" loop={true} />

        <Link to="/login">
          <motion.button 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg transition-all duration-300"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            Get Started
          </motion.button>
        </Link>
      </motion.div>

      {/* Features Section */}
      <div className="bg-white py-12 px-6 shadow-inner">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-8">What MoodMate Offers</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {[{
            icon: <HeartPulse className="mx-auto mb-4 h-10 w-10 text-blue-600" />, 
            title: 'Stress Detection',
            desc: 'We analyze your face, voice, and behavior to measure stress levels accurately.',
            bg: 'bg-blue-50'
          }, {
            icon: <Bot className="mx-auto mb-4 h-10 w-10 text-purple-600" />, 
            title: 'Empathetic Chatbot',
            desc: 'Get personalized support powered by AI and RAG with mental health insights.',
            bg: 'bg-purple-50'
          }, {
            icon: <CalendarCheck className="mx-auto mb-4 h-10 w-10 text-green-600" />, 
            title: 'Book Experts',
            desc: 'Instantly book appointments with certified psychologists when needed.',
            bg: 'bg-green-50'
          }].map((feature, index) => (
            <motion.div
              key={index}
              className={`p-6 ${feature.bg} rounded-2xl text-center shadow hover:shadow-md transition`}
              whileHover={{ scale: 1.03 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              {feature.icon}
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}

        </div>
      </div>

      {/* Footer CTA */}
      <motion.div 
        className="mt-auto py-10 text-center bg-gradient-to-r from-purple-200 to-blue-200"
        initial={{ opacity: 0 }} 
        whileInView={{ opacity: 1 }} 
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <h4 className="text-xl font-semibold text-gray-800 mb-2">Start your wellness journey today 🌱</h4>
        <Link to="/login">
          <motion.button 
            className="px-5 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            Login / Signup
          </motion.button>
        </Link>
      </motion.div>

    </motion.div>
  );
};

export default HomePage;
