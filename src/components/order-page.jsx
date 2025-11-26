import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase'; // Assuming you have a firebase.js file exporting db
import '../styles/order-page.css';

const OrderPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // Default to 'pending' for New Orders
    const [user, setUser] = useState(null); // Track the authenticated user

    // Tab configurations (mapping to status values)
    const tabs = [
        { key: 'pending', label: 'New Orders' },
        { key: 'preparing', label: 'Preparing' },
        { key: 'ready', label: 'Ready for Pickup' },
        { key: 'out for delivery', label: 'Out for Delivery' },
        { key: 'completed', label: 'Completed' }
    ];

    // Listen for authentication state changes
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // User is signed in, fetch orders
                fetchOrders(currentUser);
            } else {
                // User is signed out
                setOrders([]);
                setError('User not authenticated');
                setLoading(false);
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    // Function to fetch orders
    const fetchOrders = async (currentUser) => {
        setLoading(true);
        setError(null);
        try {
            // Query orders where restaurantId matches the current user's UID
            const q = query(collection(db, 'orders'), where('restaurantId', '==', currentUser.uid));
            const querySnapshot = await getDocs(q);
            const fetchedOrders = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Transform items to match the expected structure (add quantity if needed)
                items: doc.data().items.map(item => ({
                    name: item.name,
                    price: `$${parseFloat(item.price).toFixed(2)}`, // Safely convert to number and format
                    quantity: item.quantity || 1 // Default to 1 if not present
                })),
                total: `$${parseFloat(doc.data().totalPrice).toFixed(2)}`, // Also safe for total
                time: formatTimeAgo(doc.data().createdAt), // Helper to format time
                status: doc.data().status || 'pending'
            }));
            setOrders(fetchedOrders);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to format time ago (simple implementation)
    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const now = new Date();
        const createdAt = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const diffInMinutes = Math.floor((now - createdAt) / (1000 * 60));
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    };

    // Filter orders based on active tab
    const filteredOrders = orders.filter(order => order.status === activeTab);

    // Handle tab click
    const handleTabClick = (tabKey) => {
        setActiveTab(tabKey);
    };

    // Handle accept order
    const handleAcceptOrder = async (orderId) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { status: 'preparing' });
            // Update local state
            setOrders(prev => prev.map(order => 
                order.id === orderId ? { ...order, status: 'preparing' } : order
            ));
        } catch (error) {
            console.error('Failed to accept order:', error);
            alert('Failed to accept order. Please try again.');
        }
    };

    // Handle reject order
    const handleRejectOrder = async (orderId) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' }); // Or delete if preferred
            // Update local state
            setOrders(prev => prev.map(order => 
                order.id === orderId ? { ...order, status: 'cancelled' } : order
            ));
        } catch (error) {
            console.error('Failed to reject order:', error);
            alert('Failed to reject order. Please try again.');
        }
    };

    // Handle mark as ready
    const handleMarkReady = async (orderId) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { status: 'ready' });
            // Update local state
            setOrders(prev => prev.map(order => 
                order.id === orderId ? { ...order, status: 'ready' } : order
            ));
        } catch (error) {
            console.error('Failed to mark order as ready:', error);
            alert('Failed to update order. Please try again.');
        }
    };

    // Handle mark as out for delivery
    const handleMarkOutForDelivery = async (orderId) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), { status: 'out for delivery' });
            // Update local state
            setOrders(prev => prev.map(order => 
                order.id === orderId ? { ...order, status: 'out for delivery' } : order
            ));
        } catch (error) {
            console.error('Failed to mark order as out for delivery:', error);
            alert('Failed to update order. Please try again.');
        }
    };

    if (loading) return <div className="main-content">Loading orders...</div>;
    if (error) return <div className="main-content">Error: {error}</div>;

    return (
        <div className="main-content">
            <div className="dashboard-header">
                <h1>Restaurant Admin Dashboard</h1>
                <div className="header-stats">
                    <div className="stat-box">
                        <div className="stat-number">{orders.filter(o => o.status === 'pending').length}</div>
                        <div className="stat-label">New Orders</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-number">{orders.filter(o => o.status === 'preparing').length}</div>
                        <div className="stat-label">Preparing</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-number">{orders.filter(o => o.status === 'ready').length}</div>
                        <div className="stat-label">Ready</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-number">{orders.filter(o => o.status === 'out for delivery').length}</div>
                        <div className="stat-label">Out for Delivery</div>
                    </div>
                </div>
            </div>

            <div className="tabs">
                {tabs.map(tab => (
                    <div
                        key={tab.key}
                        className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.key)}
                    >
                        {tab.label}
                    </div>
                ))}
            </div>

            <div className="orders-section">
                <h2 className="section-title">
                    {tabs.find(tab => tab.key === activeTab)?.label} Requests
                </h2>
                
                <div className="order-cards">
                    {filteredOrders.length === 0 ? (
                        <p>No orders in this category.</p>
                    ) : (
                        filteredOrders.map((order) => (
                            <div key={order.id} className="order-card">
                                <div className="order-header">
                                    <div className="order-id">Order {order.id}</div>
                                    <div className="order-time">{order.time}</div>
                                </div>
                                <div className="order-customer">
                                    <div className="customer-name">Customer ID: {order.userId}</div> {/* Assuming no customer name, use userId */}
                                    <div className="customer-contact">N/A</div> {/* Contact not in data, add if available */}
                                </div>
                                <div className="order-items">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="order-item">
                                            <span className="item-name">{item.name} (x{item.quantity})</span>
                                            <span className="item-price">{item.price}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="order-total">
                                    <span>Total:</span>
                                    <span>{order.total}</span>
                                </div>
                                <div className="order-actions">
                                    {activeTab === 'pending' && (
                                        <>
                                            <button className="btn btn-accept" onClick={() => handleAcceptOrder(order.id)}>Accept Order</button>
                                            <button className="btn btn-reject" onClick={() => handleRejectOrder(order.id)}>Reject</button>
                                        </>
                                    )}
                                    {activeTab === 'preparing' && (
                                        <button className="btn btn-ready" onClick={() => handleMarkReady(order.id)}>Mark as Ready</button>
                                    )}
                                    {activeTab === 'ready' && (
                                        <button className="btn btn-out for delivery" onClick={() => handleMarkOutForDelivery(order.id)}>Mark as Out for Delivery</button>
                                    )}
                                    {/* No actions for 'out for delivery' or 'completed' tabs */}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};  

export default OrderPage;
