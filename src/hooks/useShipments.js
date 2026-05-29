import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { firestore } from '../firebase/config';

/**
 * Hook untuk membaca Shipment Log dari Firestore secara realtime.
 * Collection: shipments
 */
export function useShipments(vehicleId = 'TRK-07', maxItems = 10) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(firestore, 'shipments'),
      orderBy('timestamp', 'desc'),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((item) => item.vehicle_id === vehicleId);
      setShipments(data);
      setLoading(false);
    }, (error) => {
      console.error('[useShipments] Error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [vehicleId, maxItems]);

  return { shipments, loading };
}
