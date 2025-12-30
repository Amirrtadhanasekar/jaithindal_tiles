import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import { ArrowLeft, TrendingUp, Users, DollarSign, Award, Package, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Theme-consistent palette
const COLORS = ['#2f6b4b', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#6366f1'];

const Review = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        topAttender: 'N/A',
        avgOrderValue: 0,
        totalProducts: 0
    });
    const [attenderData, setAttenderData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/customers');
            const data = await response.json();

            processData(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const processData = (customers) => {
        const attenderStats = {};
        let totalRev = 0;
        let totalProd = 0;

        customers.forEach(customer => {
            const attender = customer.attender || 'Unknown';
            const amount = customer.totalAmount || 0;

            // Calculate total products (boxes) for this customer
            let customerBoxes = 0;
            if (customer.rooms && Array.isArray(customer.rooms)) {
                customer.rooms.forEach(room => {
                    if (room.items && Array.isArray(room.items)) {
                        room.items.forEach(item => {
                            customerBoxes += (Number(item.boxes) || 0);
                        });
                    }
                });
            }

            if (!attenderStats[attender]) {
                attenderStats[attender] = { name: attender, revenue: 0, orders: 0, products: 0 };
            }

            attenderStats[attender].revenue += amount;
            attenderStats[attender].orders += 1;
            attenderStats[attender].products += customerBoxes;

            totalRev += amount;
            totalProd += customerBoxes;
        });

        const chartData = Object.values(attenderStats).sort((a, b) => b.revenue - a.revenue);

        // Find top attender
        const top = chartData.length > 0 ? chartData[0].name : 'N/A';

        setAttenderData(chartData);
        setStats({
            totalRevenue: totalRev,
            totalOrders: customers.length,
            topAttender: top,
            avgOrderValue: customers.length > 0 ? Math.round(totalRev / customers.length) : 0,
            totalProducts: totalProd
        });
    };

    const formatCurrency = (val) => {
        return '₹' + val.toLocaleString('en-IN');
    };

    return (
        <div className="dashboard-body">
            <header className="topbar">
                <div className="brand">
                    <div className="logo-circle">JTT</div>
                    <div className="brand-text">
                        <div className="brand-name">JAI THINDAL TILES</div>
                    </div>
                </div>

                <nav className="breadcrumbs">
                    <button className="crumb" onClick={() => navigate('/dashboard')}>Home</button>
                    <button className="crumb active">Reviews & Analytics</button>
                </nav>
            </header>

            <main className="dashboard">
                <div className="container">
                    <div className="welcome card" style={{ marginBottom: '24px', border: 'none', background: 'transparent', boxShadow: 'none', padding: 0 }}>
                        <div className="welcome-left">
                            <button className="btn-back" onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', color: '#6b7280', padding: 0 }}>
                                <ArrowLeft size={16} /> Back to Dashboard
                            </button>
                            <h2 style={{ fontSize: '28px', color: '#1f2937' }}>Performance Dashboard</h2>
                            <p className="muted" style={{ fontSize: '16px' }}>Overview of sales performance, revenue analytics, and team efficiency.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="card" style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                            <div className="loading-spinner"></div>
                            Loading analytics data...
                        </div>
                    ) : (
                        <>
                            {/* Stats Row - Enhanced with Gradients */}
                            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '32px', gap: '20px' }}>
                                <div className="stat card gradient-green">
                                    <div className="icon" style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}><DollarSign size={28} /></div>
                                    <div className="stat-number" style={{ fontSize: '24px', marginBottom: '4px' }}>{formatCurrency(stats.totalRevenue)}</div>
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Revenue</div>
                                </div>
                                <div className="stat card gradient-teal">
                                    <div className="icon" style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}><Users size={28} /></div>
                                    <div className="stat-number" style={{ fontSize: '24px', marginBottom: '4px' }}>{stats.totalOrders}</div>
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Total Orders</div>
                                </div>
                                <div className="stat card gradient-purple">
                                    <div className="icon" style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}><Award size={28} /></div>
                                    <div className="stat-number" style={{ fontSize: '24px', marginBottom: '4px' }}>{stats.topAttender}</div>
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Top Performer</div>
                                </div>
                                <div className="stat card gradient-brown">
                                    <div className="icon" style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '12px' }}><Package size={28} /></div>
                                    <div className="stat-number" style={{ fontSize: '24px', marginBottom: '4px' }}>{stats.totalProducts}</div>
                                    <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Boxes Sold</div>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="charts-row">
                                {/* Bar Chart - Revenue by Attender */}
                                <div className="card" style={{ height: '420px', padding: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                        <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <TrendingUp size={20} className="text-accent" style={{ color: '#2f6b4b' }} />
                                            Sales Revenue by Attender
                                        </h3>
                                    </div>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart
                                            data={attenderData}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2f6b4b" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#2f6b4b" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                            <Tooltip
                                                cursor={{ fill: '#f9fafb' }}
                                                formatter={(value) => [formatCurrency(value), 'Revenue']}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                            />
                                            <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} barSize={40}>
                                                {
                                                    attenderData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#2f6b4b' : '#64748b'} />
                                                    ))
                                                }
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Pie Chart - Products Share */}
                                <div className="card" style={{ height: '420px', padding: '24px' }}>
                                    <h3 style={{ margin: '0 0 24px', fontSize: '18px', textAlign: 'center' }}>Volumetric Share (Boxes)</h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <PieChart>
                                            <Pie
                                                data={attenderData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={110}
                                                paddingAngle={4}
                                                dataKey="products"
                                                nameKey="name"
                                            >
                                                {attenderData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value} Boxes`]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                            <Legend verticalAlign="bottom" iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                                <div style={{ padding: '24px', borderBottom: '1px solid #f3f4f6' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>Attender Performance Details</h3>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                                                <th style={{ padding: '16px 24px', color: '#4b5563', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attender</th>
                                                <th style={{ padding: '16px 24px', color: '#4b5563', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orders</th>
                                                <th style={{ padding: '16px 24px', color: '#4b5563', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boxes Sold</th>
                                                <th style={{ padding: '16px 24px', color: '#4b5563', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue</th>
                                                <th style={{ padding: '16px 24px', color: '#4b5563', fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {attenderData.map((attender, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }} className="table-row-hover">
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: index === 0 ? '#dcfce7' : '#f3f4f6', color: index === 0 ? '#166534' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}>
                                                                {attender.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <span style={{ fontWeight: '500', color: '#111827' }}>{attender.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px 24px', color: '#4b5563' }}>{attender.orders}</td>
                                                    <td style={{ padding: '16px 24px', color: '#4b5563' }}>{attender.products}</td>
                                                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: '#111827' }}>{formatCurrency(attender.revenue)}</td>
                                                    <td style={{ padding: '16px 24px' }}>
                                                        <span style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '999px',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            background: index === 0 ? '#dcfce7' : '#f3f4f6',
                                                            color: index === 0 ? '#166534' : '#374151'
                                                        }}>
                                                            {index === 0 ? 'Top Performer' : 'Active'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {attenderData.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                                        No sales data recorded yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Review;
