import { useState, useEffect } from 'react';
import { useSharePoint } from './useSharePoint';

export const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingData, setPendingData] = useState([]);
  const { createListItem } = useSharePoint();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending data on mount
    const pending = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
    setPendingData(pending);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveOfflineData = (data) => {
    const timestamp = new Date().toISOString();
    const dataWithTimestamp = { 
      ...data, 
      timestamp, 
      id: Date.now(),
      status: 'pending'
    };
    
    const existing = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
    const updated = [...existing, dataWithTimestamp];
    localStorage.setItem('offline-surveys', JSON.stringify(updated));
    
    setPendingData(updated);
    return dataWithTimestamp.id;
  };

  const syncPendingData = async () => {
    if (!isOnline) return false;

    const pending = JSON.parse(localStorage.getItem('offline-surveys') || '[]');
    if (pending.length === 0) return true;

    try {
      for (const survey of pending) {
        // Convert survey data to SharePoint list item format
        const listItem = {
          Title: `Survey_${survey.id}`,
          Bairro: survey.responses.bairro || '',
          Idade: survey.responses.idade || '',
          Genero: survey.responses.genero || '',
          Ocupacao: survey.responses.ocupacao || '',
          OperadoraPrincipal: survey.responses.operadora || '',
          MultipleSIM: survey.responses.multipleSim || '',
          // Add all other survey fields
          SurveyData: JSON.stringify(survey),
          CompletedAt: survey.completedAt,
          Status: 'Synced'
        };

        // Use your SharePoint hook to save
        await createListItem(
          'https://africellcloud.sharepoint.com/sites/KnowledgeBase',
          'Huila_CustumerExp_Survey', // Your SharePoint list name
          listItem
        );
      }

      localStorage.removeItem('offline-surveys');
      setPendingData([]);
      return true;
    } catch (error) {
      console.error('SharePoint sync failed:', error);
      return false;
    }
  };

  return {
    isOnline,
    pendingData,
    saveOfflineData,
    syncPendingData
  };
};