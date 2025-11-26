import React, { useState, useEffect } from 'react';
import '../styles/menu-page.css';
import AddDishOverlay from './add-dish-overlay';
import EditDishOverlay from './edit-dish-overlay';
import { db } from '../firebase'; // Assuming Firebase is configured
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, where } from 'firebase/firestore'; // Added where, updateDoc, and deleteDoc
import { getAuth } from 'firebase/auth'; // Added for authentication
import supabase from '../supabase'; // Assuming Supabase is configured

const MenuPage = () => {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isEditOverlayOpen, setIsEditOverlayOpen] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch dishes from Firestore on mount, filtered by the logged-in user's restaurantId
  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          setError('Please log in to view your dishes.');
          setLoading(false);
          return;
        }

        // Fetch the restaurant name once for the current user
        let restaurantName = 'Unknown Restaurant';
        try {
          const restaurantDocRef = doc(db, 'users', user.uid);
          const restaurantDocSnap = await getDoc(restaurantDocRef);
          if (restaurantDocSnap.exists()) {
            const restaurantData = restaurantDocSnap.data();
            restaurantName = restaurantData.displayname || restaurantData.name || 'Unknown Restaurant';
          }
        } catch (fetchError) {
          console.error('Error fetching restaurant:', fetchError);
        }

        // Query dishes where restaurantId matches the current user's ID
        const dishesQuery = query(
          collection(db, 'dishes'),
          where('restaurantId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const dishesSnapshot = await getDocs(dishesQuery);
        const dishesList = [];

        for (const docSnap of dishesSnapshot.docs) {
          const dishData = docSnap.data();
          const { name, category, price, description, imageUrl, createdAt, status } = dishData;
          const dishId = docSnap.id;

          // Get image URL from Supabase
          let publicImageUrl = '';
          if (imageUrl) {
            try {
              const { data: urlData } = supabase.storage.from('dishes').getPublicUrl(imageUrl);
              publicImageUrl = urlData?.publicUrl || '';
            } catch (urlError) {
              console.error('Error getting image URL:', urlError);
            }
          }

          dishesList.push({
            id: dishId,
            name,
            category,
            price,
            description,
            restaurantName, // Use the fetched restaurant name
            imageSrc: publicImageUrl,
            imageUrl, // Store the original imageUrl for deletion
            createdAt: createdAt?.toDate() ? createdAt.toDate().toLocaleDateString() : 'Unknown',
            status: status || 'available', // Default to 'available' if not set
          });
        }

        setDishes(dishesList);
      } catch (fetchError) {
        console.error('Error fetching dishes:', fetchError);
        setError('Failed to load dishes. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDishes();
  }, []);

  const handleAddDishClick = () => {
    setIsOverlayOpen(true);
  };

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false);
    window.location.reload();
  };

  const handleEditDishClick = (dish) => {
    setSelectedDish(dish);
    setIsEditOverlayOpen(true);
  };

  const handleCloseEditOverlay = () => {
    setIsEditOverlayOpen(false);
    setSelectedDish(null);
    window.location.reload();
  };

  // Handle toggle status
  const handleToggleStatus = async (dish) => {
    try {
      const newStatus = dish.status === 'available' ? 'unavailable' : 'available';
      const dishDocRef = doc(db, 'dishes', dish.id);
      await updateDoc(dishDocRef, { status: newStatus });
      alert(`Dish status updated to ${newStatus}!`);
      window.location.reload(); // Reload to reflect changes
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  // Handle delete dish
  const handleDeleteDish = async (dish) => {
    if (!window.confirm(`Are you sure you want to delete "${dish.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete image from Supabase if exists
      if (dish.imageUrl) {
        const { error: deleteError } = await supabase.storage.from('dishes').remove([dish.imageUrl]);
        if (deleteError) {
          console.error('Error deleting image:', deleteError);
          // Continue with Firestore deletion even if image delete fails
        }
      }

      // Delete from Firestore
      const dishDocRef = doc(db, 'dishes', dish.id);
      await deleteDoc(dishDocRef);
      alert('Dish deleted successfully!');
      window.location.reload(); // Reload to reflect changes
    } catch (err) {
      console.error('Error deleting dish:', err);
      alert('Failed to delete dish. Please try again.');
    }
  };

  if (loading) return <div className="main-content">Loading dishes...</div>;
  if (error) return <div className="main-content"><p className="error-message">{error}</p></div>;

  return (
    <div className="main-content">
      <div className="gallery-header">
        <h1>Dish Management</h1>
        <div className="search-bar">
          <input type="text" placeholder="Search dishes..." />
          <button><i className="fas fa-search"></i></button>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="category-filter">Category</label>
          <select id="category-filter">
            <option value="">All Categories</option>
            <option value="appetizers">Appetizers</option>
            <option value="mains">Main Courses</option>
            <option value="desserts">Desserts</option>
            <option value="drinks">Drinks</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Status</label>
          <select id="status-filter">
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>

        <button className="add-dish-btn" onClick={handleAddDishClick}>
          <i className="fas fa-plus"></i> Add New Dish
        </button>
      </div>

      <div className="dish-grid">
        {dishes.length === 0 ? (
          <p>No dishes found. Add your first dish!</p>
        ) : (
          dishes.map((dish) => (
            <div className="dish-card" key={dish.id}>
              <div className="dish-image">
                <img
                  src={dish.imageSrc || 'https://via.placeholder.com/280x200?text=No+Image'}
                  alt={dish.name}
                />
              </div>
              <div className="dish-info">
                <h3 className="dish-title">{dish.name}</h3>
                <p className="dish-description">{dish.description}</p>
                <div className="dish-meta">
                  <span className="dish-price">${dish.price}</span>
                  <span className={`dish-status ${dish.status === 'available' ? 'status-available' : 'status-unavailable'}`}>
                    {dish.status === 'available' ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="admin-actions">
                  <button className="admin-btn btn-edit" onClick={() => handleEditDishClick(dish)}>
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button className={`admin-btn btn-toggle ${dish.status === 'available' ? 'btn-disable' : 'btn-enable'}`} onClick={() => handleToggleStatus(dish)}>
                    <i className="fas fa-ban"></i> {dish.status === 'available' ? 'Disable' : 'Enable'}
                  </button>
                  <button className="admin-btn btn-delete" onClick={() => handleDeleteDish(dish)}>
                    {/* Inline SVG Trash Icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AddDishOverlay isOpen={isOverlayOpen} onClose={handleCloseOverlay} />
      <EditDishOverlay isOpen={isEditOverlayOpen} onClose={handleCloseEditOverlay} dish={selectedDish} />
    </div>
  );
};

export default MenuPage;
