import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase'; // Assuming Firebase is configured and exported
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // Firestore v9+ imports
import { onAuthStateChanged } from 'firebase/auth';
import supabase from '../supabase.js'; // Assuming Supabase client is configured and exported
import '../styles/settings-page.css'; // Assuming you have a CSS file for styling
import '../styles/general.css';

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

// Convert 24h time string "HH:MM" to 12h format with AM/PM
const convertTo12Hour = (time24) => {
  if (!time24) return '';
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

const SettingsPage = () => {
  const [restaurantData, setRestaurantData] = useState({
    name: '',
    location: '',
    deliveryAreas: [],
    openHours: {}, // e.g. { monday: { enabled: true, open: "09:00", close: "17:30" }, ... }
    photoUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Use auth state observer to wait for login status
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        alert('You must be logged in');
        setLoading(false);
        return;
      }

      const fetchRestaurantData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            alert('User document not found');
            setLoading(false);
            return;
          }
          const restaurantId = userDoc.data().restaurantId;
          if (!restaurantId) {
            alert('No restaurant associated with this user');
            setLoading(false);
            return;
          }

          const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
          if (restaurantDoc.exists()) {
            const data = restaurantDoc.data();

            const normalizedOpenHours = {};
            daysOfWeek.forEach(({ key }) => {
              const dayData = data.openHours?.[key] || {};
              normalizedOpenHours[key] = {
                enabled:
                  typeof dayData.enabled === 'boolean'
                    ? dayData.enabled
                    : !!(dayData.open && dayData.close),
                open: dayData.open || '09:00',
                close: dayData.close || '17:30',
              };
            });

            setRestaurantData({
              name: data.name || '',
              location: data.location || '',
              deliveryAreas: Array.isArray(data.deliveryAreas) ? data.deliveryAreas : [],
              openHours: normalizedOpenHours,
              photoUrl: data.photoUrl || '',
            });
          } else {
            alert('Restaurant not found');
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          alert('Failed to load restaurant data');
        } finally {
          setLoading(false);
        }
      };

      fetchRestaurantData();
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRestaurantData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeliveryAreasChange = (e) => {
    const areas = e.target.value.split(',').map((area) => area.trim());
    setRestaurantData((prev) => ({ ...prev, deliveryAreas: areas }));
  };

  const handleToggleOpen = (dayKey, enabled) => {
    setRestaurantData((prev) => ({
      ...prev,
      openHours: {
        ...prev.openHours,
        [dayKey]: {
          ...prev.openHours[dayKey],
          enabled,
        },
      },
    }));
  };

  const handleTimeChange = (dayKey, field, value) => {
    setRestaurantData((prev) => ({
      ...prev,
      openHours: {
        ...prev.openHours,
        [dayKey]: {
          ...prev.openHours[dayKey],
          [field]: value,
        },
      },
    }));
  };

  const handlePhotoSelection = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedPhoto(file);
    } else {
      alert('Please select a valid image file');
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handlePhotoSelection(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in');
      return;
    }

    setUpdating(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const restaurantId = userDoc.data().restaurantId;

      let photoUrl = restaurantData.photoUrl;

      if (selectedPhoto) {
        const fileExt = selectedPhoto.name.split('.').pop();
        const fileName = `${restaurantId}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('restaurants')
          .upload(fileName, selectedPhoto, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('restaurants').getPublicUrl(fileName);
        photoUrl = publicUrlData.publicUrl;
      }

      // Update restaurant document with openHours including enabled flags
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        ...restaurantData,
        photoUrl,
      });

      alert('Settings updated successfully!');
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Update failed:', error);
      alert('Update failed. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="settings-page">
      <h1>Restaurant Settings</h1>

      {/* Photo Section Moved to Top */}
      <div className="photo-section">
        {restaurantData.photoUrl && (
          <img src={restaurantData.photoUrl} alt="Current Restaurant" className="current-photo" />
        )}
        <button type="button" onClick={handleButtonClick} className="change-photo-btn">
          {/* Inline SVG Pencil Icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Change Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden-file-input"
        />
        {selectedPhoto && <p>Selected: {selectedPhoto.name}</p>}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            name="name"
            type="text"
            value={restaurantData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">Location:</label>
          <input
            id="location"
            name="location"
            type="text"
            value={restaurantData.location}
            onChange={handleInputChange}
            required
          />
        </div>

        {/* Delivery Areas */}
        <div className="form-group">
          <label htmlFor="deliveryAreas">Delivery Areas (comma-separated):</label>
          <input
            id="deliveryAreas"
            type="text"
            value={restaurantData.deliveryAreas.join(', ')}
            onChange={handleDeliveryAreasChange}
          />
        </div>

        {/* Business Hours */}
        <div className="form-group">
          <label>Business Hours:</label>
          <div className="business-hours-container">
            {daysOfWeek.map(({ key, label }) => {
              const day = restaurantData.openHours[key] || {
                enabled: false,
                open: '09:00',
                close: '17:30',
              };

              return (
                <div key={key} className="business-hour-row">
                  {/* Toggle */}
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) => handleToggleOpen(key, e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>

                  {/* Day label */}
                  <span className="day-label">{label}</span>

                  {day.enabled ? (
                    <div className="time-inputs">
                      <label className="time-label" htmlFor={`${key}-open`}>
                        From
                      </label>
                      <input
                        type="time"
                        id={`${key}-open`}
                        value={day.open}
                        onChange={(e) => handleTimeChange(key, 'open', e.target.value)}
                        required={day.enabled}
                      />
                      <span className="ampm-label">{convertTo12Hour(day.open)}</span>

                      <label className="time-label" htmlFor={`${key}-close`}>
                        To
                      </label>
                      <input
                        type="time"
                        id={`${key}-close`}
                        value={day.close}
                        onChange={(e) => handleTimeChange(key, 'close', e.target.value)}
                        required={day.enabled}
                      />
                      <span className="ampm-label">{convertTo12Hour(day.close)}</span>
                    </div>
                  ) : (
                    <div className="closed-label" title="Closed">
                      <span role="img" aria-label="closed" style={{ marginRight: 6 }}>
                        🕒
                      </span>
                      Closed
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={updating}>
          {updating ? 'Updating...' : 'Update Settings'}
        </button>
      </form>
    </div>
  );
};

export default SettingsPage;