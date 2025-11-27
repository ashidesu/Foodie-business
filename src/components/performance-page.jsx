import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/performance-page.css';
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

const PerformancePage = () => {
    const [user, setUser] = useState(null);
    const [restaurantId, setRestaurantId] = useState(null);
    const [dishes, setDishes] = useState([]);
    const [completedOrders, setCompletedOrders] = useState([]);
    const [selectedDishes, setSelectedDishes] = useState([]); // Array for multiple selected dishes
    const [selectedPeriod, setSelectedPeriod] = useState("thisMonth"); // Match HomePage
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Listen for authentication state changes and fetch data
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchData(currentUser);
            } else {
                setError('User not authenticated');
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Function to fetch dishes and completed orders
    const fetchData = async (currentUser) => {
        setLoading(true);
        setError(null);
        try {
            // Fetch user document to get restaurantId
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                setError('User document not found');
                setLoading(false);
                return;
            }

            const userData = userDocSnap.data();
            const restaurantId = userData.restaurantId;

            if (!restaurantId) {
                setError('Restaurant ID not found in user document');
                setLoading(false);
                return;
            }
            setRestaurantId(restaurantId);

            // Fetch dishes for the restaurant
            const dishesQuery = query(collection(db, 'dishes'), where('restaurantId', '==', restaurantId));
            const dishesSnap = await getDocs(dishesQuery);
            const dishesList = dishesSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDishes(dishesList);

            // Fetch completed orders for the restaurant
            const ordersQuery = query(collection(db, 'orders'), where('restaurantId', '==', restaurantId), where('status', '==', 'completed'));
            const ordersSnap = await getDocs(ordersQuery);
            const ordersList = ordersSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCompletedOrders(ordersList);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get date range - Match HomePage exactly
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

    // Filter orders by date range - Use selectedPeriod
    const { start: startDate, end: endDate } = getDateRange(selectedPeriod);
    const filteredOrders = completedOrders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
    });

    // Calculate overall performance metrics
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + parseFloat(order.totalPrice || 0), 0);
    const totalOrders = filteredOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Prepare data for revenue over time chart - Match HomePage style
    const buildOverallChartData = () => {
        const revenueByDate = {};
        filteredOrders.forEach(order => {
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
            revenueByDate[label] = (revenueByDate[label] || 0) + parseFloat(order.totalPrice || 0);
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

    const overallChartData = buildOverallChartData();

    // Prepare data for individual dish performance line chart - Match buildOverallChartData function
    const buildDishChartData = () => {
        const dishPerformanceByDate = {};
        filteredOrders.forEach(order => {
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
            if (!dishPerformanceByDate[label]) {
                dishPerformanceByDate[label] = {};
            }
            order.items.forEach(item => {
                const dishName = item.name;
                dishPerformanceByDate[label][dishName] = (dishPerformanceByDate[label][dishName] || 0) + (item.quantity || 1);
            });
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
            const entry = { date: label };
            selectedDishes.forEach(dish => {
                entry[dish] = dishPerformanceByDate[label]?.[dish] || 0;
            });
            data.push(entry);
        }
        return data;
    };

    const dishChartData = buildDishChartData();

    // Handle checkbox changes for selected dishes
    const handleDishSelection = (dishName) => {
        setSelectedDishes(prev =>
            prev.includes(dishName)
                ? prev.filter(d => d !== dishName)
                : [...prev, dishName]
        );
    };

    // Calculate top performing dishes (by revenue)
    const dishStats = {};
    filteredOrders.forEach(order => {
        order.items.forEach(item => {
            const dishName = item.name;
            if (!dishStats[dishName]) {
                dishStats[dishName] = { count: 0, revenue: 0 };
            }
            dishStats[dishName].count += item.quantity || 1;
            dishStats[dishName].revenue += (item.quantity || 1) * parseFloat(item.price);
        });
    });
    const topPerformingDishes = Object.entries(dishStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10);

    // Calculate most frequently ordered together dishes
    const pairStats = {};
    filteredOrders.forEach(order => {
        const items = order.items.map(item => item.name);
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const pair = [items[i], items[j]].sort().join(' & ');
                pairStats[pair] = (pairStats[pair] || 0) + 1;
            }
        }
    });
    const topPairs = Object.entries(pairStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Prepare dishData for pie chart (similar to HomePage)
    const dishArray = Object.entries(dishStats).map(([name, stats]) => ({ name, quantity: stats.count, revenue: stats.revenue }));
    const dishData = dishArray.sort((a, b) => b.quantity - a.quantity)
        .map((dish, idx) => ({ ...dish, color: DISH_COLORS[idx % DISH_COLORS.length] }));

    if (loading) return <div className="main-content">Loading performance data...</div>;
    if (error) return <div className="main-content">Error: {error}</div>;

    return (
        <div className="performance-page" style={{ fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: '#f9f9f9' }}>
            <h1>Restaurant Performance</h1>

            {/* Date Range Filter - Match HomePage */}
            <div className="filters" style={{ marginBottom: '20px' }}>
                <label htmlFor="date-range">Date Range:</label>
                <select id="date-range" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={{
                    padding: '10px 15px', backgroundColor: '#007bff', color: 'white',
                    border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px'
                }}>
                    {TIME_PERIODS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>

            {/* Summary cards like HomePage */}
            <div className="summary-cards">
                <div className="summary-card" aria-label="Total revenue">
                    <h3>Total Revenue</h3>
                    <p>₱{totalRevenue.toFixed(2)}</p>
                </div>
                <div className="summary-card" aria-label="Total completed orders">
                    <h3>Total Completed Orders</h3>
                    <p>{totalOrders}</p>
                </div>
                <div className="summary-card" aria-label="Average order value">
                    <h3>Average Order Value</h3>
                    <p>₱{avgOrderValue.toFixed(2)}</p>
                </div>
            </div>

            <div className="overall-performance" style={{ marginTop: '20px' }}>
                <h2>Overall Performance</h2>
                <div className="chart-container">
                    <h3>Revenue Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={overallChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis tickFormatter={v => v >= 1000 ? `${v / 1000}K` : v} />
                            // Correct tooltip formatter syntax example
                            <Tooltip formatter={value => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Revenue']} />
                            <Legend verticalAlign="top" align="right" height={36} />
                            <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="individual-performance" style={{ marginTop: '40px' }}>
                <h2>Individual Dish Performance</h2>
                <div className="dish-selector">
                    <label>Select Dishes:</label>
                    <div className="checkbox-group">
                        {dishes.map(dish => (
                            <label key={dish.id} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectedDishes.includes(dish.name)}
                                    onChange={() => handleDishSelection(dish.name)}
                                />
                                {dish.name}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="chart-container">
                    <h3>Orders Over Time for Selected Dishes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dishChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis tickFormatter={v => v >= 1000 ? `${v / 1000}K` : v} />
                            <Tooltip formatter={(value, name) => [`${value}`, `${name} Orders`]} />
                            <Legend verticalAlign="top" align="right" height={36} />
                            {selectedDishes.map((dish, index) => (
                                <Line
                                    key={dish}
                                    type="monotone"
                                    dataKey={dish}
                                    stroke={`hsl(${index * 137.5 % 360}, 70%, 50%)`} // Different colors
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Sales by Dish Pie Chart Section */}
            <SalesByDishSection dishData={dishData} />

            <div className="leaderboards" style={{ marginTop: '40px' }}>
                <div className="leaderboard">
                    <h2>Top Performing Dishes (by Revenue)</h2>
                    <ol className="leaderboard-list">
                        {topPerformingDishes.map(([name, stats], index) => (
                            <li key={name} className="leaderboard-item">
                                <span className="rank">{index + 1}.</span>
                                <span className="name">{name}</span>
                                <span className="value">₱{stats.revenue.toFixed(2)}</span>
                            </li>
                        ))}
                    </ol>
                </div>
                <div className="leaderboard">
                    <h2>Most Frequently Ordered Together</h2>
                    <ol className="leaderboard-list">
                        {topPairs.map(([pair, count], index) => (
                            <li key={pair} className="leaderboard-item">
                                <span className="rank">{index + 1}.</span>
                                <span className="name">{pair}</span>
                                <span className="value">{count} times</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default PerformancePage;
