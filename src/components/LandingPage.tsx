import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Code2, Zap, Download, Database, Shield, Users, ChevronRight, Star, Check, Sparkles, ArrowRight, Lock, Globe, Smartphone, Palette, Moon, Sun, Laptop, BarChart3, Monitor, Clock, CheckCircle, X, Menu, Mail, Phone, MapPin, Send, Facebook, Instagram, Twitter, Linkedin, Youtube, Github } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { AuthModal } from './AuthModal';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { DragDropAnimation } from './DragDropAnimation';
import logoIcon from '../assets/3783c8fc9c2bbb9005e59c39e377b8d4ab7a0e4b.png';
import aboutImage from '../assets/6ee6af225d3c66afa5aee3a1718a22ba31c70978.png';
import { getSupabaseSession } from '../supabase/auth/authService';
import { sendEmail, emailResponse } from './services/email.service';
import toast, { Toaster } from 'react-hot-toast';

interface LandingPageProps {
  onEnterEditor: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterEditor }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAuth = (type: 'login' | 'signup') => {
    setAuthType(type);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (isSignup?: boolean) => {
    if (isSignup) {
      // We can pass a flag or just let App.tsx handle it
      // For now, we just call onEnterEditor
      onEnterEditor();
    } else {
      onEnterEditor();
    }
  };

  useAuthRedirect(onEnterEditor);

  const handleStartBuilding = async () => {
    
    const { data: { session } } = await getSupabaseSession();

    if (session) {
        
        onEnterEditor(); 
    } else {
        
        handleAuth('login');
    }
};

  const services = [
    {
      icon: Code2,
      title: 'Drag & Drop Builder',
      description: 'Create websites visually with our intuitive drag-and-drop interface. No coding required.',
      delay: 0.1
    },
    {
      icon: Palette,
      title: 'Beautiful Templates',
      description: 'Start with professionally designed templates for portfolios, blogs, and business sites.',
      delay: 0.2
    },
    {
      icon: Zap,
      title: 'Real-time Preview',
      description: 'See your changes instantly with live preview and responsive design testing.',
      delay: 0.3
    },
    {
      icon: Globe,
      title: 'Export Clean Code',
      description: 'Download production-ready HTML, CSS, and JavaScript code that you own completely.',
      delay: 0.4
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work together with your team on projects with real-time collaboration features.',
      delay: 0.5
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with multi-factor authentication and role-based access.',
      delay: 0.6
    }
  ];

  const stats = [
    { icon: Users, number: '50,000+', label: 'Active Creators' },
    { icon: Globe, number: '1M+', label: 'Websites Built' },
    { icon: Star, number: '4.9/5', label: 'User Rating' },
    { icon: BarChart3, number: '99.9%', label: 'Uptime' }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'UI/UX Designer',
      company: 'TechFlow',
      content: 'BuildX Designer has revolutionized how I prototype and deliver designs. The code export feature saves me hours of development time.',
      rating: 5
    },
    {
      name: 'Mike Rodriguez',
      role: 'Small Business Owner',
      company: 'Local Cafe',
      content: 'I built my cafe\'s website in just one afternoon. The templates are beautiful and the interface is so easy to use.',
      rating: 5
    },
    {
      name: 'Alex Thompson',
      role: 'Freelance Developer',
      company: 'DevStudio',
      content: 'The clean code output is impressive. I can use BuildX Designer for rapid prototyping and then enhance the exported code.',
      rating: 5
    }
  ];

  const features = [
    {
      icon: Smartphone,
      title: 'Mobile-First Design',
      description: 'Every website is automatically optimized for mobile devices with responsive breakpoints.',
    },
    {
      icon: Monitor,
      title: 'Desktop Optimization',
      description: 'Advanced desktop layouts with sophisticated grid systems and interactive elements.',
    },
    {
      icon: Clock,
      title: 'Lightning Fast',
      description: 'Optimized code generation ensures your websites load quickly and perform efficiently.',
    }
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerChildren = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [from, setFrom] = useState('');

  async function handleSubmitEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const response = await emailResponse(subject, from, text);
      const anotherResponse = await sendEmail(email);
      toast.success("Email sent successfully!");
      setSubject('');
      setFrom('');
      setText('');
      setEmail('');
    } catch (error: any) {
      console.error("Error sending email:", error);
      const errorMessage = error?.message || "Failed to send email. Please try again.";
      toast.error(errorMessage);
    }
  }

  return (
    <div className="min-h-screen landing-theme-bg landing-dark-theme">
      <Toaster position="top-center" />
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center space-x-2"
            >
              <img src={logoIcon} alt="BuildX Designer Logo" className="w-8 h-8 rounded-lg shadow-lg" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 via-blue-700 to-gray-700 bg-clip-text text-transparent">
                BuildX Designer
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <motion.a
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                href="#services"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer font-medium"
              >
                Features
              </motion.a>
              <motion.a
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer font-medium"
              >
                About
              </motion.a>
              <motion.a
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                href="#testimonials"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer font-medium"
              >
                Reviews
              </motion.a>
              <motion.a
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer font-medium"
              >
                Contact
              </motion.a>
            </div>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => handleAuth('login')}
                  className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                >
                  Login
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button 
                  onClick={() => handleAuth('signup')}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Sign Up
                </Button>
              </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t bg-background/95 backdrop-blur-md"
            >
              <div className="px-4 py-4 space-y-4">
                <a 
                  href="#services" 
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="block text-foreground/70 hover:text-foreground transition-colors"
                >
                  Features
                </a>
                <a 
                  href="#about" 
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="block text-foreground/70 hover:text-foreground transition-colors"
                >
                  About
                </a>
                <a 
                  href="#testimonials" 
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="block text-foreground/70 hover:text-foreground transition-colors"
                >
                  Reviews
                </a>
                <a 
                  href="#contact" 
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="block text-foreground/70 hover:text-foreground transition-colors"
                >
                  Contact
                </a>
                <div className="flex space-x-4 pt-4 border-t">
                  <Button variant="ghost" onClick={() => handleAuth('login')}>
                    Login
                  </Button>
                  <Button onClick={() => handleAuth('signup')}>
                    Sign Up
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-12 md:pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1644088379091-d574269d422f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMHRlY2hub2xvZ3klMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc1ODU0MjgwOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Abstract technology background"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#070b26]/85 via-[#11163a]/80 to-[#1b2050]/85"></div>
        </div>
        
        {/* Floating Animation Elements */}
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-400/40 rounded-full theme-float z-10" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-blue-500/50 rounded-full theme-float z-10" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-4 h-4 bg-gray-300/30 rounded-full theme-float z-10" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-blue-300/40 rounded-full theme-float z-10" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/6 w-3 h-3 bg-blue-400/35 rounded-full theme-float z-10" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-1/4 right-1/6 w-2 h-2 bg-gray-400/25 rounded-full theme-float z-10" style={{ animationDelay: '5s' }}></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 text-gray-900"
          >
            Build Websites
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-gray-700 bg-clip-text text-transparent">
              Without Code
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-xl md:text-2xl text-gray-600 mb-6 md:mb-8 max-w-3xl mx-auto leading-relaxed px-4"
          >
            BuildX Designer is the ultimate drag-and-drop website builder that generates clean, 
            exportable code. Create stunning websites visually and own your code completely.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Button
              size="lg"
              onClick={handleStartBuilding}
              className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 w-full sm:w-auto"
            >
              Start Building
              <ChevronRight className="ml-2 w-4 md:w-5 h-4 md:h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleAuth('signup')}
              className="text-base md:text-lg px-6 md:px-8 py-4 md:py-6 border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 w-full sm:w-auto"
            >
              Try for Free
            </Button>
          </motion.div>

          {/* Drag and Drop Animation Video */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="max-w-5xl mx-auto"
          >
            <div className="aspect-video w-full">
              <DragDropAnimation />
            </div>
            <p className="text-center text-sm text-gray-600 mt-4">
              Watch how easy it is to build with drag-and-drop
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 md:py-16 px-4 sm:px-6 lg:px-8 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-700/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="services" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-3 md:mb-4">
              Everything You Need to Build Amazing Websites
            </h2>
            <p className="text-base md:text-xl text-foreground/70 max-w-2xl mx-auto">
              Professional tools and features to bring your ideas to life
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
          >
            {services.map((service, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ delay: service.delay }}
                className="group"
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2 border-2 border-gray-200 hover:border-blue-300 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-700/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <service.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">{service.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{service.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Additional Features */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-blue-700/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-50 via-blue-50 to-blue-100">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by Creators Worldwide
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See what our community of designers, developers, and business owners have to say
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
                  <CardContent className="p-8">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-blue-600">{testimonial.role}</div>
                      <div className="text-gray-500">{testimonial.company}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                The Future of Web Development
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                BuildX Designer bridges the gap between visual design and clean code. Our innovative 
                drag-and-drop interface generates production-ready HTML, CSS, and JavaScript 
                that follows best practices and modern web standards.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Whether you're a designer who wants to create functional websites, a developer 
                who needs to prototype quickly, or a business owner who wants full control over 
                your web presence, BuildX Designer empowers you to build without compromise.
              </p>
              
              {/* Key Benefits */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Export clean, semantic code of HTML & CSS</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-gray-700">Responsive design built-in</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-gray-700">No vendor lock-in - you own the code</span>
                </div>
              </div>
              
              <Button
                size="lg"
                onClick={onEnterEditor}
                className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Explore the Editor
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative flex justify-center"
            >
              {/* reduced image size: constrain with max-w and keep aspect ratio */}
              <div className="w-full max-w-[420px] aspect-[4/3] bg-gradient-to-br from-blue-100 via-white to-blue-200 rounded-2xl border-2 border-gray-200 shadow-2xl overflow-hidden">
                <img 
                  src={aboutImage}
                  alt="BuildX Designer - AI Assisted Design"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/10 via-transparent to-blue-900/5"></div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-20 blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-blue-300 to-blue-500 rounded-full opacity-15 blur-xl"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-gray-50 via-blue-50 to-blue-100">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-2xl font-semibold mb-6 text-gray-900">Contact Information</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Reach out to us through any of these channels. Our team is ready to help you build amazing websites.
                </p>
              </div>

              <div className="space-y-6">
                {/* Email */}
                <Card className="border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-700/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                        <p className="text-gray-600 text-sm mb-2">Send us an email anytime</p>
                        <a href="mailto:support@buildxdesigner.com" className="text-blue-600 hover:text-blue-700 transition-colors">
                          buildxdesignerteam@gmail.com
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Phone */}
                <Card className="border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-700/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Phone</h4>
                        <p className="text-gray-600 text-sm mb-2">Mon-Fri from 8am to 6pm PHIL</p>
                        <a href="tel:+15551234567" className="text-blue-600 hover:text-blue-700 transition-colors">
                          +63 (906) 153-2132
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address */}
                <Card className="border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-700/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Office</h4>
                        <p className="text-gray-600 text-sm mb-2">Visit our headquarters</p>
                        <p className="text-gray-700">
                          Sauyo, Gregorio St.<br />
                          Quezon City<br />
                          Philippines
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* CTA */}
              <div className="pt-6">
                <p className="text-gray-600 mb-4">Ready to start building?</p>
                <Button
                  size="lg"
                  onClick={onEnterEditor}
                  className="w-full group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Try BuildX Designer Now
                  <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Card className="border-2 border-gray-200 bg-white/90 backdrop-blur-sm shadow-xl">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-semibold mb-6 text-gray-900">Send us a Message</h3>
                  <form className="space-y-6" onSubmit={handleSubmitEmail}>
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={from}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="john@example.com"
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setFrom(e.target.value);
                        }}
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        id="subject"
                        value={subject}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                        placeholder="How can we help you?"
                        onChange={(e) => setSubject(e.target.value)}
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                        Message *
                      </label>
                      <textarea
                        id="message"
                        value={text}
                        required
                        rows={6}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none"
                        placeholder="Tell us more about your inquiry..."
                        onChange={(e) => setText(e.target.value)}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Send Message
                      <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      We'll get back to you within 24 hours
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-50 via-white to-blue-100 border-t border-blue-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center space-x-2 mb-4">
                <img src={logoIcon} alt="BuildX Designer Logo" className="w-8 h-8 rounded-lg shadow-lg" />
                <span className="font-bold text-gray-900">BuildX Designer</span>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                The ultimate drag-and-drop website builder that generates clean, exportable code.
              </p>
              {/* Social Media Links */}
              <div className="flex space-x-3">
                <a
                  href="https://facebook.com/buildxdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white hover:bg-blue-600 border-2 border-gray-200 hover:border-blue-600 rounded-lg flex items-center justify-center transition-all duration-300 group shadow-sm hover:shadow-md"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                </a>
                <a
                  href="https://instagram.com/buildxdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white hover:bg-pink-600 border-2 border-gray-200 hover:border-pink-600 rounded-lg flex items-center justify-center transition-all duration-300 group shadow-sm hover:shadow-md"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                </a>
                <a
                  href="https://twitter.com/buildxdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white hover:bg-blue-400 border-2 border-gray-200 hover:border-blue-400 rounded-lg flex items-center justify-center transition-all duration-300 group shadow-sm hover:shadow-md"
                  aria-label="Twitter"
                >
                  <Twitter className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                </a>
                <a
                  href="https://linkedin.com/company/buildxdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white hover:bg-blue-700 border-2 border-gray-200 hover:border-blue-700 rounded-lg flex items-center justify-center transition-all duration-300 group shadow-sm hover:shadow-md"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                </a>
                <a
                  href="https://youtube.com/@buildxdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white hover:bg-red-600 border-2 border-gray-200 hover:border-red-600 rounded-lg flex items-center justify-center transition-all duration-300 group shadow-sm hover:shadow-md"
                  aria-label="YouTube"
                >
                  <Youtube className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                </a>
                <a
                  href="https://github.com/buildxdesigner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white hover:bg-gray-800 border-2 border-gray-200 hover:border-gray-800 rounded-lg flex items-center justify-center transition-all duration-300 group shadow-sm hover:shadow-md"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                </a>
              </div>
            </motion.div>

            {/* Product Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#services"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <button
                    onClick={onEnterEditor}
                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                  >
                    Templates
                  </button>
                </li>
                <li>
                  <button
                    onClick={onEnterEditor}
                    className="text-gray-600 hover:text-blue-600 transition-colors text-left"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <a
                    href="#testimonials"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Testimonials
                  </a>
                </li>
                <li>
                  <a
                    href="https://buildxdesigner.com/updates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    What's New
                  </a>
                </li>
              </ul>
            </motion.div>

            {/* Resources & Help */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="https://docs.buildxdesigner.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://help.buildxdesigner.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="https://community.buildxdesigner.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Community
                  </a>
                </li>
                <li>
                  <a
                    href="https://tutorials.buildxdesigner.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Tutorials
                  </a>
                </li>
                <li>
                  <a
                    href="https://blog.buildxdesigner.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.buildxdesigner.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </motion.div>

            {/* Company */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="#about"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="https://careers.buildxdesigner.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="https://buildxdesigner.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://buildxdesigner.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="https://buildxdesigner.com/cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Bottom Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-8 border-t border-blue-200"
          >
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-gray-600 text-sm text-center md:text-left">
                © 2025 BuildX Designer. All rights reserved. Empowering creators worldwide.
              </p>
              <div className="flex items-center space-x-6">
                <a
                  href="https://status.buildxdesigner.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                >
                  Status
                </a>
                <a
                  href="https://buildxdesigner.com/sitemap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                >
                  Sitemap
                </a>
                <a
                  href="https://buildxdesigner.com/accessibility"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-blue-600 transition-colors text-sm"
                >
                  Accessibility
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        type={authType}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};
