// PharmaChain dashboard data hook
// Fetches real data from backend APIs with optional polling
import { useState, useEffect, useCallback } from 'react';
import { shipmentApi, transportBoxApi, medicineApi, trackingApi } from '../lib/api';

interface UseDashboardOptions {
  pollInterval?: number | false; // ms, false = no polling
  enabled?: boolean;
}

export function useShipments(pollInterval = 30000, enabled = true) {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await shipmentApi.list();
      setShipments(data.items || []);
    } catch (e) {
      console.error('Failed to fetch shipments:', e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchShipments();
    if (pollInterval && enabled) {
      const timer = setInterval(fetchShipments, pollInterval);
      return () => clearInterval(timer);
    }
  }, [fetchShipments, pollInterval, enabled]);

  return { shipments, loading, refresh: fetchShipments };
}

export function useTransportBoxes(pollInterval = 30000, enabled = true) {
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBoxes = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await transportBoxApi.list();
      setBoxes(data.boxes || []);
    } catch (e) {
      console.error('Failed to fetch transport boxes:', e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchBoxes();
    if (pollInterval && enabled) {
      const timer = setInterval(fetchBoxes, pollInterval);
      return () => clearInterval(timer);
    }
  }, [fetchBoxes, pollInterval, enabled]);

  return { boxes, loading, refresh: fetchBoxes };
}

export function useMedicines(pollInterval = 30000, enabled = true) {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedicines = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await medicineApi.list();
      setMedicines(data.items || []);
    } catch (e) {
      console.error('Failed to fetch medicines:', e);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchMedicines();
    if (pollInterval && enabled) {
      const timer = setInterval(fetchMedicines, pollInterval);
      return () => clearInterval(timer);
    }
  }, [fetchMedicines, pollInterval, enabled]);

  return { medicines, loading, refresh: fetchMedicines };
}
