import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) { setProfileLoading(false); return; }
    try {
      const r = await fetch('/api/profile', { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch profile');
      setProfile(await r.json());
    } catch {
      setProfile({ brand_voice: '', writing_samples: [], onboarded: false });
    } finally {
      setProfileLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = useCallback(async (updates) => {
    try {
      const r = await fetch('/api/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!r.ok) throw new Error('Failed to update profile');
      const updated = await r.json();
      setProfile(updated);
      return updated;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, profileLoading, updateProfile, refetchProfile: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
