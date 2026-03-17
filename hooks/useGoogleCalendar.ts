
import { useState, useEffect, useCallback } from 'react';
import { Role } from '../types';
import { CLIENT_ID, API_KEY, DISCOVERY_DOCS, SCOPES } from '../src/config/google';

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink: string;
}

interface GoogleAuthState {
  isAuthenticated: boolean;
  email: string;
  accessToken: string;
}

export const useGoogleCalendar = (role: Role, showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void) => {
  const [isGapiInitialized, setIsGapiInitialized] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string>('');
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  // --- Initialization & Auth Persistence ---
  useEffect(() => {
    const savedAuth = localStorage.getItem('googleAuth');
    if (savedAuth) {
      try {
        const authState: GoogleAuthState = JSON.parse(savedAuth);
        if (authState.isAuthenticated && authState.accessToken) {
          setIsAuthenticated(true);
          setGoogleUserEmail(authState.email || '');
          if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken({ access_token: authState.accessToken });
          }
        }
      } catch (e) {
        console.error("Error parsing saved auth:", e);
        localStorage.removeItem('googleAuth');
      }
    }
  }, []);

  const saveAuthState = (authenticated: boolean, email: string = '', accessToken: string = '') => {
    if (authenticated && accessToken) {
      const authState: GoogleAuthState = { isAuthenticated: true, email, accessToken };
      localStorage.setItem('googleAuth', JSON.stringify(authState));
    } else {
      localStorage.removeItem('googleAuth');
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('googleAuth');
    setIsAuthenticated(false);
    setGoogleUserEmail('');
    
    if (window.google?.accounts?.oauth2) {
      const token = localStorage.getItem('googleAuth');
      if (token) {
        try {
          const authState = JSON.parse(token);
          if (authState.accessToken) {
            window.google.accounts.oauth2.revoke(authState.accessToken, () => {});
          }
        } catch (e) {}
      }
    }
    
    if (window.gapi?.client) {
      window.gapi.client.setToken('');
    }
    
    showToast("Berhasil logout dari Google Calendar", "info");
  }, [showToast]);

  // --- Load Google Scripts ---
  useEffect(() => {
    const initializeGapiClient = async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        setIsGapiInitialized(true);
      } catch (error: any) {
        console.error("Gagal inisialisasi GAPI:", error.result || error);
        let friendlyMessage = "Gagal memuat Google API. Cek konsol untuk detail.";
        
        const gapiError = error.result?.error;
        const errorMessage = gapiError?.message || '';
        const errorStatus = gapiError?.status || '';
        
        if (errorStatus === 'PERMISSION_DENIED' || errorStatus === 'RESOURCE_PROJECT_INVALID') {
          if (errorMessage.includes('API has not been used') || errorMessage.includes('not enabled')) {
            friendlyMessage = "Google Calendar API belum diaktifkan. Hubungi admin untuk mengaktifkan Google Calendar API di Google Cloud Console.";
          } else if (errorMessage.includes('referer')) {
            friendlyMessage = "API Key dibatasi oleh HTTP Referrer. Pastikan domain Anda sudah terdaftar di Google Cloud Console.";
          } else if (errorMessage.includes('key')) {
            friendlyMessage = "API Key tidak valid atau telah kedaluwarsa. Hubungi admin untuk memperbarui Google API Key.";
          } else {
            friendlyMessage = `Akses ditolak (403). Pastikan Google Calendar API sudah diaktifkan dan API Key valid. Detail: ${errorMessage}`;
          }
        } else if (errorStatus === 'FORBIDDEN') {
          friendlyMessage = "Akses Forbidden (403). Periksa konfigurasi API Key di Google Cloud Console.";
        }
        
        showToast(friendlyMessage, "error");
        setIsGapiInitialized(false);
      }
    };

    const initializeGisClient = () => {
      const scope = (role === Role.ADMIN || role === Role.LABORAN) ? SCOPES.READWRITE : SCOPES.READONLY;
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: scope,
        callback: async (resp: any) => {
          if (resp.error !== undefined) {
            showToast("Gagal login ke Google. Pastikan Anda mengizinkan akses.", "error");
            return;
          }
          setIsAuthenticated(true);
          let userEmail = '';
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${resp.access_token}` }
            });
            if (userInfoRes.ok) {
              const userInfo = await userInfoRes.json();
              userEmail = userInfo.email || '';
              setGoogleUserEmail(userEmail);
            }
          } catch (e) {
            console.error("Error getting user info:", e);
          }
          saveAuthState(true, userEmail, resp.access_token);
          window.gapi.client.setToken({ access_token: resp.access_token });
          showToast("Berhasil terhubung ke Google Calendar!", "success");
        },
      });
      setTokenClient(client);
    };

    const loadScripts = () => {
      if (typeof window.gapi === 'undefined') {
        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.onload = () => window.gapi.load('client', initializeGapiClient);
        document.body.appendChild(script1);
      } else {
        window.gapi.load('client', initializeGapiClient);
      }

      if (typeof window.google === 'undefined') {
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.onload = () => initializeGisClient();
        document.body.appendChild(script2);
      } else {
        initializeGisClient();
      }
    };

    loadScripts();
  }, [role, showToast]);

  const login = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  }, [tokenClient]);

  // --- CRUD Operations ---
  const fetchEvents = useCallback(async (calendarId: string, timeMin: Date, timeMax: Date) => {
    if (!isGapiInitialized) return;
    setIsLoading(true);
    try {
      const request = {
        'calendarId': calendarId,
        'timeMin': timeMin.toISOString(),
        'timeMax': timeMax.toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'orderBy': 'startTime',
      };
      const response = await window.gapi.client.calendar.events.list(request);
      setEvents(response.result.items);
    } catch (err: any) {
      console.error("Error fetching events", err);
      const errorCode = err.result?.error?.code;
      if (errorCode === 401) {
        logout();
        showToast("Sesi Google Calendar expired. Silakan login ulang.", "warning");
      } else if (errorCode === 404) {
         showToast("Kalender tidak ditemukan (404). Periksa ID Kalender.", "error");
      } else if (errorCode === 403) {
         showToast("Akses ditolak (403). Pastikan API Key valid & Kalender Publik.", "error");
      } else {
         showToast(`Gagal mengambil jadwal: ${err.result?.error?.message || 'Cek Console'}`, "error");
      }
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [isGapiInitialized, logout, showToast]);

  const createEvent = async (calendarId: string, eventResource: any) => {
    setIsCreatingEvent(true);
    try {
      await window.gapi.client.calendar.events.insert({
        'calendarId': calendarId,
        'resource': eventResource,
      });
      showToast("Event berhasil ditambahkan!", "success");
      return true;
    } catch (err: any) {
      console.error("Error creating event", err);
      showToast(`Gagal membuat jadwal: ${err.result?.error?.message || err.message}`, "error");
      return false;
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const updateEvent = async (calendarId: string, eventId: string, eventResource: any) => {
    setIsCreatingEvent(true);
    try {
      await window.gapi.client.calendar.events.update({
        calendarId: calendarId,
        eventId: eventId,
        resource: eventResource,
      });
      showToast("Jadwal berhasil diperbarui!", "success");
      return true;
    } catch (err: any) {
      console.error("Error updating event", err);
      showToast(`Gagal memperbarui jadwal: ${err.result?.error?.message || err.message}`, "error");
      return false;
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const deleteEvent = async (calendarId: string, eventId: string) => {
    setIsDeletingEvent(true);
    try {
      await window.gapi.client.calendar.events.delete({
        calendarId: calendarId,
        eventId: eventId
      });
      showToast("Jadwal berhasil dihapus!", "success");
      return true;
    } catch (err: any) {
      console.error("Error deleting event", err);
      showToast(`Gagal menghapus jadwal: ${err.result?.error?.message || err.message}`, "error");
      return false;
    } finally {
      setIsDeletingEvent(false);
    }
  };

  return {
    isGapiInitialized,
    isAuthenticated,
    googleUserEmail,
    events,
    isLoading,
    isCreatingEvent,
    isDeletingEvent,
    login,
    logout,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent
  };
};
