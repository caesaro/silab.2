// Google API Configuration
// Used across multiple pages for Calendar integration

export const GOOGLE_API_CONFIG = {
  CLIENT_ID: '828476305239-7hilvfjvadt8ndn9br7n1upmdso38ou8.apps.googleusercontent.com',
  API_KEY: 'AIzaSyDMKoa430rirp8g8bBU3Xt-IE5EKZjiZWQ',
  DISCOVERY_DOCS: [
    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
  ],
  SCOPES: {
    READONLY: 'https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/drive.file',
    READWRITE: 'https://www.googleapis.com/auth/calendar.events'
  }
};

export const { CLIENT_ID, API_KEY, DISCOVERY_DOCS, SCOPES } = GOOGLE_API_CONFIG;

