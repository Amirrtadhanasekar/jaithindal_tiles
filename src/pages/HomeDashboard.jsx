import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import { Star, FileText, Layers, Award, Bot, User, Lock, ArrowRight, LayoutDashboard } from 'lucide-react';

const HomeDashboard = () => {
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [currentTime, setCurrentTime] = useState('');
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        // Timer
        const updateTime = () => {
            const now = new Date();
            let hrs = now.getHours();
            let mins = now.getMinutes();
            const ampm = hrs >= 12 ? 'pm' : 'am';
            hrs = hrs % 12;
            hrs = hrs ? hrs : 12;
            const formattedTime = `${hrs}:${String(mins).padStart(2, '0')} ${ampm}`;
            setCurrentTime(formattedTime);

            const hour = now.getHours();
            let greet = 'Good Morning';
            if (hour >= 12 && hour < 17) greet = 'Good Afternoon';
            else if (hour >= 17) greet = 'Good Evening';

            setGreeting(greet);
        };

        updateTime();
        const timer = setInterval(updateTime, 60000);

        // Load Customer
        try {
            const stored = sessionStorage.getItem('customer');
            if (stored) {
                setCustomer(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Error loading customer", e);
        }

        return () => clearInterval(timer);
    }, []);

    const getDisplayName = () => {
        if (customer && customer.fullname) {
            return `${greeting}, ${customer.fullname.split(' ')[0]}!`;
        }
        return `${greeting}, Valued Customer!`;
    };

    return (
        <div className="dashboard-body"> {/* Wrapper for specific styling context if needed */}
            <header className="topbar">
                <div className="brand">
                    <div className="logo-circle">JTT</div>
                    <div className="brand-text">
                        <div className="brand-name">JAI THINDAL TILES</div>
                    </div>
                </div>

                <nav className="breadcrumbs" aria-label="Breadcrumb">
                    <button className="crumb" onClick={() => navigate('/customer')}>Customer Details</button>
                    <button className="crumb active">Home</button>
                    <button className="crumb" onClick={() => navigate('/room-setup')}>Room Setup</button>
                    <button className="crumb">AI Generation</button>
                    <button className="crumb" onClick={() => navigate('/collection')}>Tile Selection</button>
                </nav>
            </header>

            <main className="dashboard">
                <div className="container">
                    <section className="welcome card">
                        <div className="welcome-left">
                            <h2 id="greeting">{getDisplayName()}</h2>
                            <p className="muted">Welcome to Jai Thindal Tiles</p>
                            <p className="welcome-text">Transform your space with AI-powered tile visualization and get instant cost estimates. Our advanced technology helps you make confident decisions for your home renovation projects.</p>
                            <p className="assisted muted">Assisted by: <span id="attenderName">{customer?.attender || 'Sales Representative'}</span></p>
                        </div>
                        <div className="welcome-right">
                            <div className="small-card">
                                <small className="muted">Session Date</small>
                                <div id="sessionDate">{new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                            <div className="small-card mt">
                                <small className="muted">Current Time</small>
                                <div id="currentTime">{currentTime}</div>
                            </div>
                        </div>
                    </section>

                    <section className="stats-row">
                        <div className="stat card">
                            <div className="stat-number">500+</div>
                            <div className="stat-label muted">Tile Collections</div>
                        </div>
                        <div className="stat card">
                            <div className="stat-number">50+</div>
                            <div className="stat-label muted">Room Styles</div>
                        </div>
                        <div className="stat card">
                            <div className="stat-number">1000+</div>
                            <div className="stat-label muted">Design Options</div>
                        </div>
                        <div className="stat card">
                            <div className="stat-number">10K+</div>
                            <div className="stat-label muted">Happy Customers</div>
                        </div>
                    </section>

                    <h3 className="section-title">Choose Your Service</h3>
                    <p className="section-sub muted">Select the service that best fits your needs. You can always switch between services during your session.</p>

                    <section className="services-row">
                        <article className="service card gradient-green">
                            <div className="service-icon"><Star size={24} /></div>
                            <h4>Tile Visualization</h4>
                            <p className="muted">Experience your dream space before installation. Our AI-powered 3D visualization lets you see exactly how different tiles will look in your room.</p>
                            <ul className="features muted">
                                <li>AI-generated 3D room models</li>
                                <li>Real-time tile placement</li>
                                <li>Multiple room type support</li>
                                <li>Interactive design preview</li>
                            </ul>
                            <button className="btn-primary-outline" onClick={() => navigate('/room-setup')}>Get Started <ArrowRight size={16} /></button>
                        </article>

                        <article className="service card gradient-brown">
                            <div className="service-icon"><FileText size={24} /></div>
                            <h4>Cost Estimation</h4>
                            <p className="muted">Get accurate, detailed cost estimates instantly. Our smart calculator considers all factors including materials, labor, and additional requirements.</p>
                            <ul className="features muted">
                                <li>Detailed cost breakdown</li>
                                <li>Tamil voice output</li>
                                <li>Printable estimates</li>
                                <li>Material quantity calculation</li>
                            </ul>
                            <button className="btn-primary-outline" onClick={() => navigate('/customer')}>Get Started <ArrowRight size={16} /></button>
                        </article>

                        {/* Tile Collection */}
                        <article className="service card gradient-teal">
                            <div className="service-icon"><Layers size={24} /></div>
                            <h4>Tile Collection</h4>
                            <p className="muted">Explore our entire collection of tiles including floor tiles, wall tiles, kitchen tiles, outdoor tiles, and premium designer collections.</p>
                            <ul className="features muted">
                                <li>High-quality product images</li>
                                <li>Category-wise browsing</li>
                                <li>Filter by size, color, finish</li>
                                <li>Add to favorite list</li>
                            </ul>
                            <button className="btn-primary-outline" onClick={() => navigate('/collection')}>Get Started <ArrowRight size={16} /></button>
                        </article>

                        {/* Dashboard / Review */}
                        <article className="service card gradient-purple">
                            <div className="service-icon"><LayoutDashboard size={24} /></div>
                            <h4>Dashboard</h4>
                            <p className="muted">Review your saved estimates, project details, and track your renovation progress in one place.</p>
                            <ul className="features muted">
                                <li>View saved estimates</li>
                                <li>Project tracking</li>
                                <li>Review history</li>
                                <li>Status updates</li>
                            </ul>
                            <button className="btn-primary-outline" onClick={() => navigate('/review')}>Get Started <ArrowRight size={16} /></button>
                        </article>

                        {/* AI Design Assistant */}
                        <article className="service card gradient-blue">
                            <div className="service-icon"><Bot size={24} /></div>
                            <h4>AI Design Assistant</h4>
                            <p className="muted">Let AI guide your choices. Match styles from photos, get intelligent tile pairings, and chat with our virtual design advisor.</p>
                            <ul className="features muted">
                                <li>Photo Style Matcher</li>
                                <li>Intelligent Tile Pairing</li>
                                <li>Design Chatbot</li>
                                <li>Trend Recommendations</li>
                            </ul>
                            <button className="btn-primary-outline" onClick={() => navigate('/design-assistant')}>Get Started <ArrowRight size={16} /></button>
                        </article>
                    </section>

                    <h3 className="section-title">Why Choose JAI THINDAL TILES?</h3>

                    <section className="features-row">
                        <div className="feature card">
                            <div className="icon"><Award size={24} /></div>
                            <div className="feature-title">Premium Quality</div>
                            <div className="muted small">Certified tiles with 10+ years warranty</div>
                        </div>
                        <div className="feature card">
                            <div className="icon"><Bot size={24} /></div>
                            <div className="feature-title">AI Technology</div>
                            <div className="muted small">Advanced 3D visualization & estimation</div>
                        </div>
                        <div className="feature card">
                            <div className="icon"><User size={24} /></div>
                            <div className="feature-title">Expert Support</div>
                            <div className="muted small">Professional guidance throughout</div>
                        </div>
                        <div className="feature card">
                            <div className="icon"><Lock size={24} /></div>
                            <div className="feature-title">Trusted Brand</div>
                            <div className="muted small">Serving customers since 2010</div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default HomeDashboard;
