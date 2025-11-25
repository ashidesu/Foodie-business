import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/left-sidebar.css'; // Assuming the CSS is in a separate file

const LeftSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedOption, setSelectedOption] = useState('home');
  const navigate = useNavigate();

  useEffect(() => {
    // Load saved selection from localStorage
    const savedSelection = localStorage.getItem('selectedOption') || 'home';
    setSelectedOption(savedSelection);
  }, []);

  const handleHamburgerClick = () => {
    setCollapsed(false);
  };

  const handleLabelClick = () => {
    setCollapsed(true);
  };

  const handleLinkClick = (option, pageUrl) => {
    // Save selection to localStorage
    localStorage.setItem('selectedOption', option);
    setSelectedOption(option);
    // Redirect using React Router navigate (assuming paths are adjusted to routes like '/home')
    // If keeping original paths, use window.location.href = pageUrl;
    // But since "use paths for redirection", assuming React Router paths
    navigate(pageUrl.replace('../pages/', '/').replace('.html', ''));
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button className="hamburger" id="hamburger-btn" onClick={handleHamburgerClick}>
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <h2 id="sidebar-label" onClick={handleLabelClick}>Sidebar</h2>
      <ul>
        <li>
          <a
            href="#"
            id="home-link"
            data-option="home"
            data-page="../pages/home.html"
            className={selectedOption === 'home' ? 'selected' : ''}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('home', '../pages/home.html');
            }}
          >
            <span className="icon">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </span>
            <span className="link-text">Home</span>
          </a>
        </li>
        <li>
          <a
            href="#"
            id="performance-link"
            data-option="performance"
            data-page="../pages/performance.html"
            className={selectedOption === 'performance' ? 'selected' : ''}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('performance', '../pages/performance.html');
            }}
          >
            <span className="icon">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </span>
            <span className="link-text">Performance</span>
          </a>
        </li>
        <li>
          <a
            href="#"
            id="menu-link"
            data-option="menu"
            data-page="../pages/menu.html"
            className={selectedOption === 'menu' ? 'selected' : ''}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('menu', '../pages/menu.html');
            }}
          >
            <span className="icon">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 12h1.5m-6 0h6" />
              </svg>
            </span>
            <span className="link-text">Menu</span>
          </a>
        </li>
        <li>
          <a
            href="#"
            id="orders-link"
            data-option="orders"
            data-page="../pages/orders.html"
            className={selectedOption === 'orders' ? 'selected' : ''}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('orders', '../pages/orders.html');
            }}
          >
            <span className="icon">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.25 2.25 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.801 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </span>
            <span className="link-text">Orders</span>
          </a>
        </li>
        <li>
          <a
            href="#"
            id="settings-link"
            data-option="settings"
            data-page="../pages/settings.html"
            className={selectedOption === 'settings' ? 'selected' : ''}
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('settings', '../pages/settings.html');
            }}
          >
            <span className="icon">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.1 2.16c.096.188.115.403.052.597l-.459 1.379c-.196.59-.568 1.09-.952 1.544a3.654 3.654 0 01-.349.5c-.106.143-.233.276-.363.41L14.43 15.5a2.473 2.473 0 01-1.52.902l-1.213.075c-.728.044-1.26-.34-1.449-.83l-.564-1.569c-.11-.305-.334-.56-.591-.722-.742-.582-1.24-1.068-1.73-1.558-.310-.37-.617-.82-.885-1.245-.072-.09-.143-.187-.195-.283-.096-.117-.17-.255-.219-.381l-.711-1.574a1.125 1.125 0 01.49-1.37l1.312-.522c.29-.116.65-.279.906-.52.114-.107.227-.222.325-.344.126-.163.245-.31.355-.444z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <span className="link-text">Settings</span>
          </a>
        </li>
      </ul>
    </aside>
  );
};

export default LeftSidebar;