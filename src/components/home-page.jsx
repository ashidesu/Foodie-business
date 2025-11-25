import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import '../styles/home-page.css';
import SalesByDishSection from './SalesByDishSection'; // Import the separate component

const TIME_PERIODS = [
    { label: "This week", value: "thisWeek" },
    { label: "This month", value: "thisMonth" },
    { label: "This year", value: "thisYear" }
];

const DISH_COLORS = [
    "#7c3aed", "#6366f1", "#f97316", "#ec4899", "#10b981",
    "#9333ea", "#f43f5e", "#a78bfa", "#34d399", "#60a5fa"
];

const HomePage = () => {
    const [user, setUser] = useState(null);
    const [restaurantId, setRestaurantId] = useState(null);
    const [allOrders, setAllOrders] = useState([]); // Store all orders
    const [completedOrders, setCompletedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState("thisMonth");

    // Aggregate summary card stats
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0);
    const [dishData, setDishData] = useState([]);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await fetchUserAndData(currentUser);
            } else {
                setError('User not authenticated');
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [selectedPeriod]);

    const getDateRange = (period) => {
        const now = new Date();
        let startDate;
        switch (period) {
            case "today":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "yesterday":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                const endYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                return { start: startDate, end: endYesterday };
            case "thisWeek":
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay());
                break;
            case "thisMonth":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "thisYear":
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        return { start: startDate, end: now };
    };

    const fetchUserAndData = async (currentUser) => {
        setLoading(true);
        setError(null);
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (!userDocSnap.exists()) {
                throw new Error('User document not found');
            }
            const userData = userDocSnap.data();
            const restId = userData.restaurantId;
            if (!restId) {
                throw new Error('Restaurant ID not found');
            }
            setRestaurantId(restId);

            // Fetch dishes map
            const dishesQuery = query(collection(db, 'dishes'), where('restaurantId', '==', restId));
            const dishesSnap = await getDocs(dishesQuery);
            const dishesMap = {};
            dishesSnap.docs.forEach(doc => {
                const data = doc.data();
                dishesMap[doc.id] = {
                    name: data.name,
                    category: data.category,
                    price: parseFloat(data.price) || 0,
                };
            });

            const { start: startDate, end: endDate } = getDateRange(selectedPeriod);

            // Fetch all orders (not just completed)
            const ordersQuery = query(collection(db, 'orders'), where('restaurantId', '==', restId));
            const ordersSnap = await getDocs(ordersQuery);
            const ordersRaw = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllOrders(ordersRaw); // Store all orders

            // Filter completed orders for stats and charts
            const filteredCompletedOrders = ordersRaw.filter(order => {
                if (!order.createdAt || order.status !== 'completed') return false;
                const createdAtDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
                return createdAtDate >= startDate && createdAtDate <= endDate;
            });
            setCompletedOrders(filteredCompletedOrders);

            // Calculate stats from completed orders
            const customerIds = filteredCompletedOrders
                .map(o => o.userId || o.customerId)
                .filter(id => id && typeof id === 'string' && id.trim() !== '');
            const uniqueCustomers = new Set(customerIds);
            setTotalCustomers(uniqueCustomers.size);

            const totalRevenueCalc = filteredCompletedOrders.reduce((sum, order) => sum + (parseFloat(order.totalPrice) || 0), 0);
            setTotalRevenue(totalRevenueCalc);
            setTotalOrders(filteredCompletedOrders.length);

            // Aggregate dish data from completed orders
            const dishSales = {};
            filteredCompletedOrders.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const dishId = item.id;
                        const dish = dishesMap[dishId];
                        if (dish) {
                            const qty = parseInt(item.quantity) || 1;
                            const price = parseFloat(item.price) || dish.price || 0;
                            if (!dishSales[dishId]) {
                                dishSales[dishId] = { name: dish.name, quantity: 0, revenue: 0 };
                            }
                            dishSales[dishId].quantity += qty;
                            dishSales[dishId].revenue += price * qty;
                        }
                    });
                }
            });

            const dishArray = Object.values(dishSales).sort((a, b) => b.quantity - a.quantity)
                .map((dish, idx) => ({ ...dish, color: DISH_COLORS[idx % DISH_COLORS.length] }));
            setDishData(dishArray);

        } catch (err) {
            setError(`Error fetching data: ${err.message}`);
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Accept order function
    const handleAcceptOrder = async (orderId) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { status: 'preparing' });
            // Update local state
            setAllOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: 'preparing' } : order
            ));
        } catch (error) {
            console.error('Failed to accept order:', error);
            alert('Failed to accept order. Please try again.');
        }
    };

    // Reject order function
    const handleRejectOrder = async (orderId) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
            // Update local state
            setAllOrders(prev => prev.map(order =>
                order.id === orderId ? { ...order, status: 'cancelled' } : order
            ));
        } catch (error) {
            console.error('Failed to reject order:', error);
            alert('Failed to reject order. Please try again.');
        }
    };

    // Build chart data
    const buildChartData = () => {
        if (completedOrders.length === 0) return [];
        const { start: startDate, end: endDate } = getDateRange(selectedPeriod);
        const revenueByDate = {};
        completedOrders.forEach(order => {
            if (!order.createdAt) return;
            const createdAtDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            if (createdAtDate < startDate || createdAtDate > endDate) return;
            let label;
            if (selectedPeriod === "today" || selectedPeriod === "yesterday") {
                label = createdAtDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
            } else if (selectedPeriod === "thisWeek" || selectedPeriod === "thisMonth") {
                label = createdAtDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
                label = createdAtDate.toLocaleDateString('en-US', { month: 'short' });
            }
            revenueByDate[label] = (revenueByDate[label] || 0) + (parseFloat(order.totalPrice) || 0);
        });

        const data = [];
        let current = new Date(startDate);
        while (current <= endDate) {
            let label;
            if (selectedPeriod === "today" || selectedPeriod === "yesterday") {
                label = current.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                current.setHours(current.getHours() + 1);
            } else if (selectedPeriod === "thisWeek" || selectedPeriod === "thisMonth") {
                label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                current.setDate(current.getDate() + 1);
            } else {
                label = current.toLocaleDateString('en-US', { month: 'short' });
                current.setMonth(current.getMonth() + 1);
            }
            data.push({ date: label, revenue: revenueByDate[label] || 0 });
        }
        return data;
    };

    const chartData = buildChartData();

    if (loading) return <div className="home-page">Loading dashboard...</div>;
    if (error) return <div className="home-page">Error: {error}</div>;

    // Filter uncompleted orders (pending, preparing, etc.)
    const uncompletedOrders = allOrders.filter(order => order.status !== 'completed' && order.status !== 'cancelled').slice(-5).reverse();

    return (
        <div className="home-page-container" style={{ fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: '#f9f9f9' }}>
            {/* Header */}
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0, color: '#333' }}>Dashboard</h1>
                <select
                    value={selectedPeriod}
                    onChange={e => setSelectedPeriod(e.target.value)}
                    style={{
                        padding: '10px 15px', backgroundColor: '#007bff', color: 'white',
                        border: 'none', borderRadius: '5px', cursor: 'pointer'
                    }}
                >
                    {TIME_PERIODS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>



            {/* Summary Cards */}
            <div className="summary-cards" style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div className="summary-card" aria-label="Total customers" style={cardStyle}>
                    <h3 style={cardTitleStyle}>Total customers</h3>
                    <p style={cardStatStyle}>
                        {totalCustomers.toLocaleString()}
                        <span style={{ color: 'green' }}> ↑ </span>
                    </p>
                </div>
                <div className="summary-card" aria-label="Total revenue" style={cardStyle}>
                    <h3 style={cardTitleStyle}>Total revenue</h3>
                    <p style={cardStatStyle}>
                        ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span style={{ color: 'green' }}> ↑ </span>
                    </p>
                </div>
                <div className="summary-card" aria-label="Total orders" style={cardStyle}>
                    <h3 style={cardTitleStyle}>Total orders</h3>
                    <p style={cardStatStyle}>
                        {totalOrders.toLocaleString()}
                        <span style={{ color: 'green' }}> ↑ </span>
                    </p>
                </div>
            </div>

            {/* Line Chart */}
            <div className="product-sales-section" style={sectionCardStyle}>
                <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Product sales</h2>
                <LineChart
                    width={900}
                    height={300}
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    aria-label="Product sales line chart"
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={v => v >= 1000 ? `${v / 1000}K` : v} />
                    <Tooltip formatter={value => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Revenue']} />
                    <Legend verticalAlign="top" align="right" height={36} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#f97316" strokeWidth={2} />
                </LineChart>
            </div>

            {/* Calling SalesByDishSection Component */}
            <SalesByDishSection dishData={dishData} />
            {/* Pending Orders Section - Prioritized */}
            <div className="recent-orders-section">
                <h3>Pending Orders</h3>
                <ul className="order-list">
                    {uncompletedOrders.length === 0 ? (
                        <p>No pending orders.</p>
                    ) : (
                        uncompletedOrders.map((order) => (
                            <li key={order.id} className="order-list-item">
                                <span className={`order-status-dot ${order.status || 'default'}`}></span>
                                <div className="order-details">
                                    <div className="order-id">Order {order.id}</div>
                                    <div className="order-status">{order.status || 'Unknown'}</div>
                                    <div className="order-total">${parseFloat(order.totalPrice).toFixed(2)}</div>
                                </div>
                                {order.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="accept-order-button" onClick={() => handleAcceptOrder(order.id)}>Accept</button>
                                        <button className="accept-order-button" style={{ backgroundColor: '#dc2626' }} onClick={() => handleRejectOrder(order.id)}>Reject</button>
                                    </div>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            </div>
            {/* Recent Completed Orders Section */}
            <div className="recent-orders-section">
                <h3>Recent Completed Orders</h3>
                <ul className="order-list">
                    {completedOrders.slice(-5).reverse().length === 0 ? (
                        <p>No recent completed orders.</p>
                    ) : (
                        completedOrders.slice(-5).reverse().map((order) => (
                            <li key={order.id} className="order-list-item">
                                <span className={`order-status-dot ${order.status || 'default'}`}></span>
                                <div className="order-details">
                                    <div className="order-id">Order {order.id}</div>
                                    <div className="order-status">{order.status || 'Unknown'}</div>
                                    <div className="order-total">${parseFloat(order.totalPrice).toFixed(2)}</div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};

const cardStyle = {
    flex: 1,
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const cardTitleStyle = {
    margin: '0 0 10px 0',
    color: '#555'
};

const cardStatStyle = {
    margin: 0,
    fontSize: '24px',
    fontWeight: 'bold'
};

const sectionCardStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '30px'
};

export default HomePage;
