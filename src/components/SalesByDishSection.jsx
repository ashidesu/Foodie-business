import React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import '../styles/home-page.css';

const SalesByDishSection = ({ dishData = [] }) => {
    return (
        <div className="section-card dish-section">
            <h3>Sales by dish</h3>
            <div className="dish-container">
                <div className="dish-list">
                    {dishData.length > 0 ? (
                        dishData.map(({ name, quantity, revenue, color }) => (
                            <div
                                key={name}
                                className="dish-item"
                                style={{ color }}
                            >
                                <span
                                    className="color-dot"
                                    style={{ backgroundColor: color }}
                                ></span>
                                {name} - {quantity} orders (${revenue.toFixed(2)})
                            </div>
                        ))
                    ) : (
                        <p>No dish data available for the selected period.</p>
                    )}
                </div>
                {dishData.length > 0 ? (
                    <PieChart width={300} height={300}>
                        <Pie
                            data={dishData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="quantity"
                            label={({ name, quantity }) => `${name} ${quantity}`}
                        >
                            {dishData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value, name) =>
                            name === 'quantity' ? [`${value}`, 'Quantity'] : [`$${value.toFixed(2)}`, 'Revenue']
                        } />
                    </PieChart>
                ) : (
                    <div className="no-data">
                        <p>No data to display</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesByDishSection;