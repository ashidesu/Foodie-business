import React, { useState, useEffect, useRef } from 'react';
import '../styles/add-dish-overlay.css'; // Reuse the same CSS file
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import supabase from '../supabase';

const EditDishOverlay = ({ isOpen, onClose, dish }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    restaurantId: '',
    imageUrl: '',
  });
  const [selectedImage, setSelectedImage] = useState(null); // For new file preview
  const [existingImageUrl, setExistingImageUrl] = useState(''); // For existing image display
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const imageInputRef = useRef(null);

  // Pre-populate form with dish data when overlay opens
  useEffect(() => {
    if (isOpen && dish) {
      setFormData({
        name: dish.name || '',
        category: dish.category || '',
        price: dish.price || '',
        description: dish.description || '',
        restaurantId: dish.restaurantId || '', // Assuming restaurantId is in the dish object
        imageUrl: dish.imageUrl || '', // Store the existing image path
      });
      setExistingImageUrl(dish.imageSrc || ''); // Set existing image URL for display
      setSelectedImage(null); // Reset new image selection
      setError('');
    }
  }, [isOpen, dish]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Image upload handlers (same as add overlay)
  const handleImageDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(true);
  };

  const handleImageDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);
  };

  const handleImageDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImage(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageSelection(files[0]);
    }
  };

  const handleImageSelection = (file) => {
    if (file && file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) { // Max 10MB
      setSelectedImage(file);
    } else {
      setError('Please select a valid image file (max 10MB).');
    }
  };

  const handleImageButtonClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageSelection(files[0]);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setFormData((prev) => ({ ...prev, imageUrl: '' })); // Clear new image path, but keep existing if no new one
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!dish || !dish.id) {
      setError('Dish data is missing.');
      setLoading(false);
      return;
    }

    // Basic validation
    if (!formData.name || !formData.category || !formData.price || !formData.description || !formData.restaurantId) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    try {
      const dishDocRef = doc(db, 'dishes', dish.id);
      let imageUrl = formData.imageUrl; // Start with existing imageUrl

      // Upload new image to Supabase if selected, using dishId as filename
      if (selectedImage) {
        const fileExtension = selectedImage.name.split('.').pop();
        const imageFilename = `${dish.id}.${fileExtension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dishes')
          .upload(imageFilename, selectedImage, { upsert: true }); // Use upsert to overwrite existing

        if (uploadError) {
          throw uploadError;
        }
        imageUrl = imageFilename; // Update to new image path
      }

      // Update the Firestore document
      await updateDoc(dishDocRef, {
        name: formData.name,
        category: formData.category,
        price: formData.price,
        description: formData.description,
        restaurantId: formData.restaurantId,
        imageUrl, // Updated imageUrl
      });

      alert('Dish updated successfully!');
      onClose(); // Close overlay on success
      setFormData({ name: '', category: '', price: '', description: '', restaurantId: '', imageUrl: '' });
      setSelectedImage(null);
      setExistingImageUrl('');
    } catch (err) {
      console.error('Error updating dish:', err);
      setError('Failed to update dish. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-header">
          <h2>Edit Dish</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="add-dish-form">
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <label htmlFor="name">Dish Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter dish name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select Category</option>
              <option value="appetizers">Appetizers</option>
              <option value="mains">Main Courses</option>
              <option value="desserts">Desserts</option>
              <option value="drinks">Drinks</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="price">Price</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Enter price (e.g., 16.99)"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter dish description"
              rows="4"
              required
            />
          </div>
          {/* Image Upload Section */}
          <div className="form-group">
            <label>Dish Image (Optional)</label>
            {!selectedImage && !existingImageUrl ? (
              <div
                className={`image-upload-zone ${isDraggingImage ? 'dragging' : ''}`}
                onDragEnter={handleImageDragEnter}
                onDragOver={handleImageDragOver}
                onDragLeave={handleImageDragLeave}
                onDrop={handleImageDrop}
                onClick={handleImageButtonClick}
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: isDraggingImage ? '#f0f9ff' : '#f9fafb',
                }}
              >
                <p>Drag and drop an image here, or click to select</p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageInputChange}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <img
                  src={selectedImage ? URL.createObjectURL(selectedImage) : existingImageUrl}
                  alt="Dish Preview"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'red',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="restaurantId">Restaurant ID</label>
            <input
              type="text"
              id="restaurantId"
              name="restaurantId"
              value={formData.restaurantId}
              readOnly // Fetched automatically
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Dish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDishOverlay;
